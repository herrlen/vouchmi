<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Subscription;
use App\Services\AppStoreServerApiService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AppleIapController extends Controller
{
    private const PRODUCT_PLAN_MAP = [
        'com.vouchmi.app.influencer.monthly' => 'influencer',
        'com.vouchmi.app.brand.monthly'      => 'brand',
    ];

    /**
     * POST /api/v1/iap/verify-receipt
     *
     * Client sendet nach StoreKit 2 Purchase die transactionId.
     * Backend validiert via App Store Server API und legt Subscription an.
     */
    public function verifyReceipt(Request $request, AppStoreServerApiService $appleApi): JsonResponse
    {
        $data = $request->validate([
            'transaction_id'          => 'required|string',
            'original_transaction_id' => 'required|string',
            'product_id'              => 'required|string',
        ]);

        $productId = $data['product_id'];
        $planType  = self::PRODUCT_PLAN_MAP[$productId] ?? null;

        if (!$planType) {
            return response()->json(['message' => 'Unbekannte Product-ID.'], 422);
        }

        $user = $request->user();

        // Rollen-Check
        if ($planType === 'brand' && $user->role !== 'brand') {
            return response()->json(['message' => 'Rolle stimmt nicht mit Produkt überein.'], 422);
        }
        if ($planType === 'influencer' && !in_array($user->role, ['influencer', 'user'])) {
            return response()->json(['message' => 'Rolle stimmt nicht mit Produkt überein.'], 422);
        }

        // Transaction bei Apple verifizieren via Server API
        $transactionInfo = $appleApi->fetchTransactionInfo($data['transaction_id']);

        if (!$transactionInfo) {
            Log::warning('apple.iap.verify_failed', [
                'user_id'        => $user->id,
                'transaction_id' => $data['transaction_id'],
            ]);
            return response()->json([
                'message' => 'Transaction konnte bei Apple nicht verifiziert werden.',
            ], 422);
        }

        // Bundle-ID prüfen
        if (($transactionInfo['bundleId'] ?? '') !== config('services.apple.bundle_id')) {
            return response()->json(['message' => 'Bundle-ID stimmt nicht überein.'], 422);
        }

        // Product-ID prüfen
        if (($transactionInfo['productId'] ?? '') !== $productId) {
            return response()->json(['message' => 'Product-ID stimmt nicht überein.'], 422);
        }

        // Rolle setzen falls nötig
        if ($planType === 'influencer' && $user->role === 'user') {
            $user->update(['role' => 'influencer']);
        }

        $expiresAt = isset($transactionInfo['expiresDate'])
            ? Carbon::createFromTimestampMs($transactionInfo['expiresDate'])
            : now()->addMonth();

        // Subscription anlegen oder aktualisieren
        $subscription = Subscription::updateOrCreate(
            [
                'user_id'                       => $user->id,
                'apple_original_transaction_id' => $data['original_transaction_id'],
            ],
            [
                'plan_type'             => $planType,
                'payment_provider'      => 'apple_iap',
                'apple_transaction_id'  => $data['transaction_id'],
                'paypal_status'         => 'ACTIVE',
                'status'                => 'active',
                'auto_renew'            => true,
                'started_at'            => $subscription->started_at ?? now(),
                'expires_at'            => $expiresAt,
            ]
        );

        Log::info('apple.iap.verified', [
            'user_id'         => $user->id,
            'subscription_id' => $subscription->id,
            'product'         => $productId,
            'expires_at'      => $expiresAt->toIso8601String(),
        ]);

        return response()->json([
            'verified'     => true,
            'subscription' => $subscription->only('id', 'plan_type', 'status', 'expires_at'),
        ]);
    }

    /**
     * POST /api/v1/iap/server-notification
     *
     * App Store Server Notifications V2.
     * Apple sendet JWS-signierte Payloads bei Subscription-Lifecycle-Events.
     */
    public function serverNotification(Request $request, AppStoreServerApiService $appleApi): JsonResponse
    {
        $signedPayload = $request->input('signedPayload');

        if (!$signedPayload) {
            return response()->json(['ok' => false], 400);
        }

        // JWS verifizieren und decodieren
        $payload = $appleApi->verifyAndDecodeJws($signedPayload);

        if (!$payload) {
            Log::warning('apple.iap.notification.jws_invalid');
            return response()->json(['ok' => false, 'reason' => 'invalid signature'], 400);
        }

        $notificationType = $payload['notificationType'] ?? null;
        $subtype           = $payload['subtype'] ?? null;

        // Transaction-Info + Renewal-Info aus verschachtelten JWS
        $transactionInfo = null;
        $renewalInfo     = null;

        if (!empty($payload['data']['signedTransactionInfo'])) {
            $transactionInfo = $appleApi->decodeJws($payload['data']['signedTransactionInfo']);
        }
        if (!empty($payload['data']['signedRenewalInfo'])) {
            $renewalInfo = $appleApi->decodeJws($payload['data']['signedRenewalInfo']);
        }

        $originalTransactionId = $transactionInfo['originalTransactionId'] ?? null;

        // In iap_events loggen
        DB::table('iap_events')->insert([
            'notification_type'       => $notificationType ?? 'UNKNOWN',
            'subtype'                 => $subtype,
            'original_transaction_id' => $originalTransactionId,
            'payload'                 => json_encode($payload),
            'received_at'             => now(),
        ]);

        Log::info('apple.iap.notification', [
            'type'                    => $notificationType,
            'subtype'                 => $subtype,
            'original_transaction_id' => $originalTransactionId,
        ]);

        if (!$originalTransactionId || !$transactionInfo) {
            return response()->json(['ok' => true, 'reason' => 'no transaction info']);
        }

        $subscription = Subscription::where('apple_original_transaction_id', $originalTransactionId)->first();

        if (!$subscription) {
            Log::warning('apple.iap.notification.unknown_subscription', [
                'original_transaction_id' => $originalTransactionId,
            ]);
            return response()->json(['ok' => true, 'reason' => 'unknown subscription']);
        }

        $expiresAt = isset($transactionInfo['expiresDate'])
            ? Carbon::createFromTimestampMs($transactionInfo['expiresDate'])
            : null;

        switch ($notificationType) {
            case 'SUBSCRIBED':
            case 'DID_RENEW':
                $subscription->update([
                    'status'               => 'active',
                    'paypal_status'        => 'ACTIVE',
                    'apple_transaction_id' => $transactionInfo['transactionId'] ?? $subscription->apple_transaction_id,
                    'expires_at'           => $expiresAt ?? $subscription->expires_at,
                    'auto_renew'           => true,
                ]);
                break;

            case 'DID_CHANGE_RENEWAL_STATUS':
                $autoRenew = $subtype !== 'AUTO_RENEW_DISABLED';
                $subscription->update(['auto_renew' => $autoRenew]);
                break;

            case 'EXPIRED':
            case 'GRACE_PERIOD_EXPIRED':
                $subscription->update([
                    'status'        => 'expired',
                    'paypal_status' => 'CANCELLED',
                    'auto_renew'    => false,
                ]);
                break;

            case 'REVOKE':
                $subscription->update([
                    'status'        => 'revoked',
                    'paypal_status' => 'CANCELLED',
                    'auto_renew'    => false,
                ]);
                break;

            case 'REFUND':
                $subscription->update([
                    'status'        => 'refunded',
                    'paypal_status' => 'CANCELLED',
                    'auto_renew'    => false,
                ]);
                break;

            case 'DID_FAIL_TO_RENEW':
                if ($subtype === 'GRACE_PERIOD') {
                    // Grace Period — Abo bleibt vorläufig aktiv
                    $subscription->update(['status' => 'grace_period']);
                } else {
                    $subscription->update([
                        'status'        => 'billing_retry',
                        'paypal_status' => 'SUSPENDED',
                    ]);
                }
                break;
        }

        return response()->json(['ok' => true]);
    }
}

<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\WalletTransaction;
use App\Services\PayPalService;
use App\Services\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Handles PayPal webhook events relevant to the credits wallet:
 *
 *   - PAYMENT.CAPTURE.COMPLETED   — sanity check that an Order capture booked
 *   - PAYMENT.CAPTURE.DENIED      — capture failed after our optimistic credit
 *   - PAYMENT.CAPTURE.REVERSED    — PayPal pulled the funds back
 *   - PAYMENT.CAPTURE.REFUNDED    — merchant or PayPal issued a refund
 *   - CUSTOMER.DISPUTE.CREATED    — user opened a dispute; reverse + suspend
 *
 * Subscription events are still handled in BrandController until the
 * Abo-Sunset sprint clears them out.
 */
class WalletWebhookController extends Controller
{
    public function __construct(
        private readonly WalletService $wallets,
        private readonly PayPalService $paypal,
    ) {}

    public function handle(Request $request): JsonResponse
    {
        $walletWebhookId = $this->paypal->walletWebhookId();
        if ($walletWebhookId) {
            if (!$this->paypal->verifyWebhookSignature($request, $walletWebhookId)) {
                Log::warning('wallet.webhook.signature.invalid');
                return response()->json(['ok' => false, 'reason' => 'invalid signature'], 401);
            }
        } else {
            Log::warning('wallet.webhook.unverified');
        }

        $event = (string) $request->input('event_type');
        $resource = (array) $request->input('resource', []);

        Log::info('wallet.webhook.received', ['event' => $event]);

        return match ($event) {
            'PAYMENT.CAPTURE.COMPLETED' => $this->onCaptureCompleted($resource),
            'PAYMENT.CAPTURE.DENIED'    => $this->onCaptureDenied($resource),
            'PAYMENT.CAPTURE.REVERSED',
            'PAYMENT.CAPTURE.REFUNDED'  => $this->onCaptureReversed($resource),
            'CUSTOMER.DISPUTE.CREATED'  => $this->onDisputeCreated($resource),
            default => response()->json(['ok' => true, 'reason' => 'unhandled']),
        };
    }

    private function onCaptureCompleted(array $resource): JsonResponse
    {
        // We already book on capture-response (synchronous). Webhook arriving
        // afterwards is just a safety net: if the synchronous path failed but
        // PayPal sees a completed capture, we still want the credits booked.
        $captureId = $resource['id'] ?? null;
        if (!$captureId) {
            return response()->json(['ok' => false, 'reason' => 'no capture id'], 200);
        }

        $existing = WalletTransaction::where('provider_ref', $captureId)->first();
        if ($existing) {
            return response()->json(['ok' => true, 'reason' => 'already booked']);
        }

        Log::warning('wallet.webhook.capture.missing_book', ['capture_id' => $captureId]);
        // We can't safely book here without knowing the user and the package.
        // Surface in logs for manual reconciliation.
        return response()->json(['ok' => true, 'reason' => 'logged for reconcile']);
    }

    private function onCaptureDenied(array $resource): JsonResponse
    {
        $captureId = $resource['id'] ?? null;
        $existing = $captureId ? WalletTransaction::where('provider_ref', $captureId)->first() : null;
        if ($existing) {
            $this->wallets->reverse($existing, ['reason' => 'capture_denied']);
        }
        return response()->json(['ok' => true]);
    }

    private function onCaptureReversed(array $resource): JsonResponse
    {
        // For REVERSED, resource id IS the capture id.
        // For REFUNDED, the refund's parent capture id sits in `links` of type `up`.
        $captureId = $resource['id'] ?? null;
        if (!$captureId && isset($resource['links'])) {
            foreach ($resource['links'] as $link) {
                if (($link['rel'] ?? null) === 'up' && isset($link['href'])) {
                    $captureId = basename(parse_url($link['href'], PHP_URL_PATH) ?: '');
                    break;
                }
            }
        }

        $existing = $captureId ? WalletTransaction::where('provider_ref', $captureId)->first() : null;
        if ($existing && $existing->status === WalletTransaction::STATUS_COMPLETED) {
            $this->wallets->reverse($existing, ['reason' => 'paypal_reversed']);
        }
        return response()->json(['ok' => true]);
    }

    private function onDisputeCreated(array $resource): JsonResponse
    {
        // disputed_transactions[].seller_transaction_id is typically the capture id.
        $captureId = $resource['disputed_transactions'][0]['seller_transaction_id'] ?? null;
        $existing = $captureId ? WalletTransaction::where('provider_ref', $captureId)->first() : null;

        if ($existing && $existing->status === WalletTransaction::STATUS_COMPLETED) {
            $this->wallets->reverse($existing, ['reason' => 'dispute_created']);
        }

        // TODO (Sprint 10 — Anti-Fraud): flag user, prevent further topups.
        return response()->json(['ok' => true]);
    }
}

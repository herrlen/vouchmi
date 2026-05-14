<?php

namespace App\Services\AppStore;

use App\Models\AppStoreNotification;
use App\Models\Subscription;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Services\WalletService;
use Carbon\Carbon;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Handles App Store Server Notifications V2.
 *
 * Idempotency is enforced at the row level (UNIQUE notification_uuid) and
 * by checking processed_at before dispatching a side-effect.
 *
 * https://developer.apple.com/documentation/appstoreservernotifications/notificationtype
 */
class NotificationHandler
{
    public function __construct(
        private readonly JwsVerifier $verifier,
    ) {}

    public static function fromConfig(): self
    {
        return new self(JwsVerifier::fromConfig());
    }

    /**
     * Process a notification persisted by the controller.
     * The signed payload has already been written to disk; we re-decode
     * here to avoid trusting any pre-decoded data.
     */
    public function handlePersisted(AppStoreNotification $notification): void
    {
        if ($notification->processed_at !== null) {
            return; // already processed — idempotency
        }

        try {
            $payload  = $this->verifier->verifyAndDecode($notification->signed_payload);
            $tx       = $this->decodeNested($payload, 'signedTransactionInfo');
            $renewal  = $this->decodeNested($payload, 'signedRenewalInfo');

            $notification->fill([
                'notification_type'       => (string) ($payload['notificationType'] ?? 'UNKNOWN'),
                'subtype'                 => $payload['subtype'] ?? null,
                'notification_uuid'       => (string) ($payload['notificationUUID'] ?? $notification->notification_uuid),
                'transaction_id'          => $tx['transactionId'] ?? null,
                'original_transaction_id' => $tx['originalTransactionId'] ?? null,
                'environment'             => $tx['environment'] ?? ($payload['data']['environment'] ?? null),
                'decoded_payload'         => array_filter([
                    'notification'    => $payload,
                    'transactionInfo' => $tx,
                    'renewalInfo'     => $renewal,
                ]),
            ])->save();

            $this->dispatch(
                type:     (string) ($payload['notificationType'] ?? 'UNKNOWN'),
                subtype:  $payload['subtype'] ?? null,
                tx:       $tx,
                renewal:  $renewal,
                uuid:     (string) ($payload['notificationUUID'] ?? $notification->notification_uuid),
            );

            $notification->forceFill([
                'processed_at'     => now(),
                'processing_error' => null,
            ])->save();
        } catch (\Throwable $e) {
            $notification->forceFill([
                'processing_error' => substr($e->getMessage(), 0, 1000),
            ])->save();
            throw $e; // let the queue retry
        }
    }

    /**
     * @param array<string,mixed>      $tx
     * @param array<string,mixed>|null $renewal
     */
    private function dispatch(string $type, ?string $subtype, array $tx, ?array $renewal, string $uuid): void
    {
        $originalTxId = (string) ($tx['originalTransactionId'] ?? '');
        $appleTxId    = (string) ($tx['transactionId'] ?? '');
        if ($originalTxId === '' && $appleTxId === '') {
            Log::info('apple_iap.notification.no_tx_ids', ['type' => $type]);
            return;
        }

        // REFUND can apply to either a subscription OR a consumable credit
        // purchase. Reverse the matching wallet transaction first, then fall
        // through so any subscription-side state still gets updated.
        if ($type === 'REFUND' && $appleTxId !== '') {
            $this->reverseConsumableRefund($appleTxId, $uuid);
        }

        $subscription = $originalTxId !== ''
            ? Subscription::where('apple_original_transaction_id', $originalTxId)
                ->where('payment_provider', 'apple_iap')
                ->first()
            : null;

        if (!$subscription) {
            Log::info('apple_iap.notification.unknown_subscription', [
                'type' => $type,
                'tail' => substr($originalTxId ?: $appleTxId, -4),
            ]);
            return;
        }

        $expiresAt = isset($tx['expiresDate'])
            ? Carbon::createFromTimestampMs((int) $tx['expiresDate'])
            : null;

        $autoRenew = isset($renewal['autoRenewStatus'])
            ? (bool) $renewal['autoRenewStatus']
            : null;
        $expirationIntent = isset($renewal['expirationIntent'])
            ? (int) $renewal['expirationIntent']
            : null;

        DB::transaction(function () use (
            $type, $subtype, $tx, $subscription, $expiresAt,
            $autoRenew, $expirationIntent, $uuid
        ) {
            $update = [
                'last_notification_uuid' => $uuid,
            ];
            if (!empty($tx['transactionId'])) {
                $update['apple_transaction_id'] = (string) $tx['transactionId'];
            }
            if (!empty($tx['productId'])) {
                $update['apple_product_id'] = (string) $tx['productId'];
            }
            if ($expirationIntent !== null) {
                $update['expiration_intent'] = $expirationIntent;
            }
            if ($autoRenew !== null) {
                $update['auto_renew'] = $autoRenew;
            }

            switch ($type) {
                case 'SUBSCRIBED':
                case 'DID_RENEW':
                case 'OFFER_REDEEMED':
                    $update['status']        = 'active';
                    $update['paypal_status'] = 'ACTIVE';
                    if ($expiresAt) {
                        $update['expires_at'] = $expiresAt;
                    }
                    break;

                case 'DID_CHANGE_RENEWAL_STATUS':
                    if ($subtype === 'AUTO_RENEW_DISABLED') {
                        $update['auto_renew'] = false;
                    } elseif ($subtype === 'AUTO_RENEW_ENABLED') {
                        $update['auto_renew'] = true;
                    }
                    break;

                case 'DID_FAIL_TO_RENEW':
                    if ($subtype === 'GRACE_PERIOD') {
                        $update['status'] = 'grace_period';
                    } else {
                        $update['status']        = 'past_due';
                        $update['paypal_status'] = 'SUSPENDED';
                    }
                    break;

                case 'GRACE_PERIOD_EXPIRED':
                    $update['status']        = 'cancelled';
                    $update['paypal_status'] = 'CANCELLED';
                    $update['auto_renew']    = false;
                    break;

                case 'EXPIRED':
                    $update['status']        = 'expired';
                    $update['paypal_status'] = 'CANCELLED';
                    $update['auto_renew']    = false;
                    break;

                case 'REVOKE':
                    $update['status']        = 'revoked';
                    $update['paypal_status'] = 'CANCELLED';
                    $update['auto_renew']    = false;
                    break;

                case 'REFUND':
                    $update['status']        = 'refunded';
                    $update['paypal_status'] = 'CANCELLED';
                    $update['auto_renew']    = false;
                    $this->revokeRoleIfNeeded($subscription);
                    break;

                case 'PRICE_INCREASE':
                    Log::info('apple_iap.price_increase', [
                        'subscription_id' => $subscription->id,
                        'subtype'         => $subtype,
                    ]);
                    break;

                default:
                    Log::info('apple_iap.notification.unhandled_type', [
                        'type'    => $type,
                        'subtype' => $subtype,
                    ]);
            }

            $subscription->forceFill($update)->save();
        });
    }

    /**
     * Apple refunded a consumable purchase — claw back the credited credits.
     * Idempotent: WalletService::reverse() short-circuits when the tx is
     * already reversed.
     */
    private function reverseConsumableRefund(string $appleTxId, string $uuid): void
    {
        $walletTx = WalletTransaction::where('payment_provider', 'apple_iap')
            ->where('provider_ref', $appleTxId)
            ->first();

        if (!$walletTx) {
            return; // Not a consumable we know about; subscription path handles it.
        }

        try {
            App::make(WalletService::class)->reverse($walletTx, [
                'reason'            => 'apple_refund',
                'notification_uuid' => $uuid,
            ]);
            Log::info('apple_iap.consumable.refunded', [
                'wallet_tx_id'      => $walletTx->id,
                'transaction_tail'  => substr($appleTxId, -4),
                'notification_uuid' => $uuid,
            ]);
        } catch (\Throwable $e) {
            Log::error('apple_iap.consumable.refund_failed', [
                'wallet_tx_id' => $walletTx->id,
                'reason'       => $e->getMessage(),
            ]);
            // Re-throw so the queue retries — partial state is worse than retry.
            throw $e;
        }
    }

    /**
     * Family Sharing revoke / refund: if this was the user's only active sub
     * for that role, drop role back to a non-paying state.
     * Conservative — leave the user's data untouched.
     */
    private function revokeRoleIfNeeded(Subscription $subscription): void
    {
        $user = User::find($subscription->user_id);
        if (!$user) return;

        $stillHasPlan = Subscription::where('user_id', $user->id)
            ->where('plan_type', $subscription->plan_type)
            ->whereIn('status', ['active', 'grace_period'])
            ->where('id', '!=', $subscription->id)
            ->exists();

        if ($stillHasPlan) {
            return;
        }

        if ($subscription->plan_type === 'influencer' && $user->role === 'influencer') {
            $user->forceFill(['role' => 'user'])->save();
        }
    }

    /**
     * @return array<string,mixed>|null
     */
    private function decodeNested(array $payload, string $key): ?array
    {
        $signed = $payload['data'][$key] ?? null;
        if (!is_string($signed) || $signed === '') {
            return null;
        }
        try {
            return $this->verifier->verifyAndDecode($signed);
        } catch (\Throwable $e) {
            Log::warning('apple_iap.notification.nested_jws_invalid', [
                'key'    => $key,
                'reason' => $e->getMessage(),
            ]);
            return null;
        }
    }
}

<?php

namespace App\Services\AppStore;

use App\Exceptions\AppStore\InvalidBundleException;
use App\Exceptions\AppStore\InvalidProductException;
use App\Exceptions\AppStore\TransactionAlreadyClaimedException;
use App\Exceptions\AppStore\TransactionExpiredException;
use App\Models\AppStoreTransaction;
use App\Models\Subscription;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Validates an Apple IAP transaction against the App Store Server API,
 * enforces anti-replay, and persists/refreshes the matching Subscription.
 *
 * Called from the mobile app after StoreKit returns a successful purchase.
 */
class IapValidationService
{
    public function __construct(
        private readonly AppStoreServerApiClient $apiClient,
        private readonly JwsVerifier $verifier,
    ) {}

    public static function fromConfig(): self
    {
        return new self(
            apiClient: AppStoreServerApiClient::fromConfig(),
            verifier:  JwsVerifier::fromConfig(),
        );
    }

    public function validateAndSync(User $user, string $transactionId): Subscription
    {
        // 1. Pull transaction info from Apple — Apple returns a JWS that we
        //    must verify ourselves, never trust the client payload.
        $apiResponse = $this->apiClient->getTransactionInfo($transactionId);
        $signedTx = $apiResponse['signedTransactionInfo'] ?? null;
        if (!is_string($signedTx) || $signedTx === '') {
            throw new InvalidProductException('Apple returned no signedTransactionInfo');
        }

        $tx = $this->verifier->verifyAndDecode($signedTx);

        // 2. Validate bundle + product
        $expectedBundle = (string) config('services.apple_iap.bundle_id');
        if (($tx['bundleId'] ?? null) !== $expectedBundle) {
            throw new InvalidBundleException('Transaction bundleId does not match');
        }

        $productId = (string) ($tx['productId'] ?? '');
        $planType  = $this->planTypeForProduct($productId);
        if ($planType === null) {
            throw new InvalidProductException('Unknown product: ' . $productId);
        }

        // 3. Pull subscription status (auto-renew + expiration intent)
        $originalTransactionId = (string) ($tx['originalTransactionId'] ?? '');
        if ($originalTransactionId === '') {
            throw new InvalidProductException('Transaction has no originalTransactionId');
        }
        $renewalState = $this->fetchRenewalState($originalTransactionId);

        // 4. Environment + expiration sanity checks
        $environment = (string) ($tx['environment'] ?? ($apiResponse['environment'] ?? 'Sandbox'));
        $configuredEnv = (string) config('services.apple_iap.environment', 'sandbox');
        if ($configuredEnv === 'production' && $environment !== 'Production') {
            // Sandbox transaction submitted to a production-configured backend
            // is rejected — never grant entitlement on cross-env mismatch.
            Log::warning('apple_iap.environment_mismatch', [
                'transaction_environment' => $environment,
                'configured_environment'  => $configuredEnv,
                'transaction_tail'        => substr($transactionId, -4),
            ]);
            throw new InvalidProductException('Transaction environment mismatch');
        }

        $expiresAt = isset($tx['expiresDate'])
            ? Carbon::createFromTimestampMs((int) $tx['expiresDate'])
            : null;

        if ($expiresAt && $expiresAt->isPast()) {
            throw new TransactionExpiredException('Transaction is already expired');
        }

        // 5. Anti-replay: an originalTransactionId may belong to at most ONE user
        $existing = Subscription::where('apple_original_transaction_id', $originalTransactionId)
            ->where('payment_provider', 'apple_iap')
            ->first();
        if ($existing && $existing->user_id !== $user->id) {
            throw new TransactionAlreadyClaimedException(
                'originalTransactionId is already linked to a different user'
            );
        }

        // 6. Persist subscription + audit transaction inside a single tx
        return DB::transaction(function () use (
            $user, $tx, $planType, $productId, $originalTransactionId,
            $environment, $expiresAt, $renewalState, $apiResponse
        ) {
            $purchasedAt = isset($tx['purchaseDate'])
                ? Carbon::createFromTimestampMs((int) $tx['purchaseDate'])
                : now();

            $subscription = Subscription::updateOrCreate(
                [
                    'user_id'                       => $user->id,
                    'payment_provider'              => 'apple_iap',
                    'apple_original_transaction_id' => $originalTransactionId,
                ],
                [
                    'plan_type'            => $planType,
                    'apple_transaction_id' => (string) ($tx['transactionId'] ?? ''),
                    'apple_product_id'     => $productId,
                    'paypal_status'        => 'ACTIVE', // legacy field, kept active for back-compat checks
                    'status'               => 'active',
                    'auto_renew'           => $renewalState['auto_renew'] ?? true,
                    'expiration_intent'    => $renewalState['expiration_intent'] ?? null,
                    'environment'          => $environment,
                    'started_at'           => $purchasedAt,
                    'expires_at'           => $expiresAt,
                ]
            );

            // Promote 'user' → 'influencer' on first influencer purchase
            if ($planType === 'influencer' && $user->role === 'user') {
                $user->forceFill(['role' => 'influencer'])->save();
            }

            AppStoreTransaction::updateOrCreate(
                [
                    'transaction_id' => (string) ($tx['transactionId'] ?? ''),
                    'environment'    => $environment,
                ],
                [
                    'user_id'                 => $user->id,
                    'original_transaction_id' => $originalTransactionId,
                    'product_id'              => $productId,
                    'bundle_id'               => (string) ($tx['bundleId'] ?? ''),
                    'purchase_date'           => $purchasedAt,
                    'expires_date'            => $expiresAt,
                    'in_app_ownership_type'   => $tx['inAppOwnershipType'] ?? null,
                    'web_order_line_item_id'  => $tx['webOrderLineItemId'] ?? null,
                    'raw_payload'             => $tx,
                ]
            );

            Log::info('apple_iap.validated', [
                'user_id'            => $user->id,
                'subscription_id'    => $subscription->id,
                'product_id'         => $productId,
                'environment'        => $environment,
                'transaction_tail'   => substr((string) ($tx['transactionId'] ?? ''), -4),
                'expires_at'         => $expiresAt?->toIso8601String(),
            ]);

            return $subscription;
        });
    }

    /**
     * Pull the latest auto-renew + expiration intent for the originalTransactionId.
     * Best-effort — failures here should not block validation.
     *
     * @return array{auto_renew?: bool, expiration_intent?: int|null}
     */
    private function fetchRenewalState(string $originalTransactionId): array
    {
        try {
            $body = $this->apiClient->getAllSubscriptionStatuses($originalTransactionId);
        } catch (\Throwable $e) {
            Log::info('apple_iap.subscription_status_unavailable', [
                'reason' => $e->getMessage(),
            ]);
            return [];
        }

        $groups = $body['data'] ?? [];
        foreach ($groups as $group) {
            foreach (($group['lastTransactions'] ?? []) as $entry) {
                if (($entry['originalTransactionId'] ?? null) !== $originalTransactionId) {
                    continue;
                }
                $renewal = null;
                if (!empty($entry['signedRenewalInfo'])) {
                    try {
                        $renewal = $this->verifier->verifyAndDecode($entry['signedRenewalInfo']);
                    } catch (\Throwable $e) {
                        Log::warning('apple_iap.renewal_info_invalid', ['reason' => $e->getMessage()]);
                    }
                }
                return [
                    'auto_renew'        => isset($renewal['autoRenewStatus'])
                        ? (bool) $renewal['autoRenewStatus']
                        : true,
                    'expiration_intent' => isset($renewal['expirationIntent'])
                        ? (int) $renewal['expirationIntent']
                        : null,
                ];
            }
        }
        return [];
    }

    private function planTypeForProduct(string $productId): ?string
    {
        $brand      = (string) config('services.apple_iap.products.brand_monthly');
        $influencer = (string) config('services.apple_iap.products.influencer_monthly');

        return match ($productId) {
            $brand      => 'brand',
            $influencer => 'influencer',
            default     => null,
        };
    }
}

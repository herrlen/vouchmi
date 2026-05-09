<?php

namespace App\Services\AppStore;

use App\Exceptions\AppStore\AppleServiceUnavailableException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Wrapper for the App Store Server API.
 *
 * Apple ships separate hosts for Sandbox and Production. TestFlight builds
 * tied to the Production host can return 404 when the transaction is
 * Sandbox-scoped, so any 404 from Production triggers a one-shot Sandbox
 * fallback (per Apple's recommendation).
 */
class AppStoreServerApiClient
{
    private const PRODUCTION_BASE = 'https://api.storekit.itunes.apple.com';
    private const SANDBOX_BASE    = 'https://api.storekit-sandbox.itunes.apple.com';

    public function __construct(
        private readonly AppStoreJwtSigner $signer,
        private readonly string $environment, // sandbox | production
    ) {}

    public static function fromConfig(?AppStoreJwtSigner $signer = null): self
    {
        return new self(
            signer:      $signer ?? AppStoreJwtSigner::fromConfig(),
            environment: (string) config('services.apple_iap.environment', 'sandbox'),
        );
    }

    public function getTransactionInfo(string $transactionId): array
    {
        return $this->getWithFallback("/inApps/v1/transactions/{$transactionId}");
    }

    public function getAllSubscriptionStatuses(string $transactionId, ?array $status = null): array
    {
        $query = $status ? ['status' => $status] : [];
        return $this->getWithFallback("/inApps/v1/subscriptions/{$transactionId}", $query);
    }

    public function getTransactionHistory(string $originalTransactionId, array $params = []): array
    {
        return $this->getWithFallback("/inApps/v2/history/{$originalTransactionId}", $params);
    }

    /**
     * Issue the request against the configured environment. If we are
     * configured for Production but Apple returns 404, retry once against
     * Sandbox (Apple's documented behavior for cross-env transactions).
     */
    private function getWithFallback(string $path, array $query = []): array
    {
        $primary = $this->environment === 'production'
            ? self::PRODUCTION_BASE
            : self::SANDBOX_BASE;

        $response = $this->call($primary, $path, $query);

        if ($response->status() === 404 && $primary === self::PRODUCTION_BASE) {
            Log::info('apple_iap.api.sandbox_fallback', ['path' => $path]);
            $response = $this->call(self::SANDBOX_BASE, $path, $query);
        }

        if ($response->serverError() || $response->status() === 401) {
            throw new AppleServiceUnavailableException(
                'App Store API request failed: HTTP ' . $response->status()
            );
        }

        if (!$response->successful()) {
            // 4xx from Apple — wrap as service-unavailable so callers can
            // surface a generic message; raw body stays in logs.
            Log::warning('apple_iap.api.client_error', [
                'path'   => $path,
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);
            throw new AppleServiceUnavailableException(
                'App Store API rejected the request: HTTP ' . $response->status()
            );
        }

        return (array) $response->json();
    }

    private function call(string $baseUrl, string $path, array $query): Response
    {
        try {
            return Http::withToken($this->signer->generateBearerToken())
                ->acceptJson()
                ->timeout(15)
                ->get($baseUrl . $path, $query);
        } catch (ConnectionException $e) {
            throw new AppleServiceUnavailableException(
                'Could not reach App Store API: ' . $e->getMessage(),
                previous: $e,
            );
        }
    }
}

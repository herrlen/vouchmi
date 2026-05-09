<?php

namespace App\Services\AppStore;

use Firebase\JWT\JWT;
use Illuminate\Support\Facades\Cache;
use RuntimeException;

/**
 * Signs ES256 JWTs for the App Store Server API.
 *
 * Apple allows a max token lifetime of 20 minutes; cache for 18 to leave
 * a safety margin against clock skew on the worker.
 */
class AppStoreJwtSigner
{
    private const CACHE_KEY = 'apple_iap_bearer';
    private const CACHE_TTL_SECONDS = 1080; // 18 minutes
    private const TOKEN_LIFETIME_SECONDS = 1200; // 20 minutes (Apple max)

    public function __construct(
        private readonly string $bundleId,
        private readonly string $issuerId,
        private readonly string $keyId,
        private readonly string $privateKeyPath,
    ) {}

    public static function fromConfig(): self
    {
        return new self(
            bundleId:       (string) config('services.apple_iap.bundle_id'),
            issuerId:       (string) config('services.apple_iap.issuer_id'),
            keyId:          (string) config('services.apple_iap.key_id'),
            privateKeyPath: (string) config('services.apple_iap.private_key_path'),
        );
    }

    public function generateBearerToken(): string
    {
        return Cache::remember(self::CACHE_KEY, self::CACHE_TTL_SECONDS, function () {
            return $this->mint();
        });
    }

    private function mint(): string
    {
        $key = $this->loadPrivateKey();

        $now = time();
        $payload = [
            'iss' => $this->issuerId,
            'iat' => $now,
            'exp' => $now + self::TOKEN_LIFETIME_SECONDS,
            'aud' => 'appstoreconnect-v1',
            'bid' => $this->bundleId,
        ];

        return JWT::encode($payload, $key, 'ES256', $this->keyId);
    }

    private function loadPrivateKey(): string
    {
        $path = $this->privateKeyPath;
        if (!str_starts_with($path, '/')) {
            $path = base_path($path);
        }

        if (!is_file($path) || !is_readable($path)) {
            throw new RuntimeException("Apple IAP private key not found at: {$path}");
        }

        $contents = file_get_contents($path);
        if ($contents === false || $contents === '') {
            throw new RuntimeException("Apple IAP private key is empty: {$path}");
        }

        return $contents;
    }
}

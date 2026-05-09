<?php

namespace Tests\Unit\Services\AppStore;

use App\Services\AppStore\AppStoreJwtSigner;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class AppStoreJwtSignerTest extends TestCase
{
    private string $keyPath;

    protected function setUp(): void
    {
        parent::setUp();

        // Generate an ES256 (P-256) private key for the test
        $this->keyPath = tempnam(sys_get_temp_dir(), 'apple_iap_test_key_') . '.p8';
        $key = openssl_pkey_new([
            'private_key_type' => OPENSSL_KEYTYPE_EC,
            'curve_name'       => 'prime256v1',
            'private_key_bits' => 2048,
        ]);
        if (!$key) {
            $this->markTestSkipped('openssl_pkey_new failed: ' . openssl_error_string());
        }
        $pem = '';
        openssl_pkey_export($key, $pem);
        file_put_contents($this->keyPath, $pem);

        Cache::flush();
    }

    protected function tearDown(): void
    {
        if (is_file($this->keyPath)) {
            @unlink($this->keyPath);
        }
        parent::tearDown();
    }

    private function makeSigner(): AppStoreJwtSigner
    {
        return new AppStoreJwtSigner(
            bundleId:       'com.vouchmi.app',
            issuerId:       'issuer-uuid-123',
            keyId:          'KEY_ID_ABC',
            privateKeyPath: $this->keyPath,
        );
    }

    public function test_token_has_three_parts(): void
    {
        $token = $this->makeSigner()->generateBearerToken();
        $parts = explode('.', $token);
        $this->assertCount(3, $parts);
    }

    public function test_header_contains_es256_kid_and_jwt(): void
    {
        $token = $this->makeSigner()->generateBearerToken();
        [$rawHeader] = explode('.', $token);
        $header = json_decode(base64_decode(strtr($rawHeader, '-_', '+/')), true);

        $this->assertEquals('ES256', $header['alg']);
        $this->assertEquals('KEY_ID_ABC', $header['kid']);
        $this->assertEquals('JWT', $header['typ']);
    }

    public function test_payload_exp_is_within_apple_max(): void
    {
        $token = $this->makeSigner()->generateBearerToken();
        [, $rawPayload] = explode('.', $token);
        $payload = json_decode(base64_decode(strtr($rawPayload, '-_', '+/')), true);

        $this->assertEquals('issuer-uuid-123', $payload['iss']);
        $this->assertEquals('appstoreconnect-v1', $payload['aud']);
        $this->assertEquals('com.vouchmi.app', $payload['bid']);
        $this->assertLessThanOrEqual(1200, $payload['exp'] - $payload['iat']);
    }

    public function test_token_is_cached_between_calls(): void
    {
        $signer = $this->makeSigner();
        $first  = $signer->generateBearerToken();
        $second = $signer->generateBearerToken();

        $this->assertSame($first, $second);
    }
}

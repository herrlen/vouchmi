<?php

namespace Tests\Unit\Services\AppStore;

use App\Exceptions\AppStore\InvalidSignatureException;
use App\Services\AppStore\JwsVerifier;
use OpenSSLAsymmetricKey;
use OpenSSLCertificate;
use Tests\TestCase;

/**
 * Builds a Root → Intermediate → Leaf chain on the fly, signs a JWS with
 * the leaf, points JwsVerifier at the test root, and asserts both the
 * happy path and tamper-resistance.
 */
class JwsVerifierTest extends TestCase
{
    private string $rootCaPath;
    private string $leafCertB64;
    private string $intCertB64;
    private string $rootCertB64;
    private string|OpenSSLAsymmetricKey $leafKey;
    private OpenSSLCertificate $altRootCert;

    protected function setUp(): void
    {
        parent::setUp();

        [$rootCert, $rootKey] = $this->generateSelfSigned('CN=Test Root CA');
        [$intCert,  $intKey]  = $this->generateChild($rootCert, $rootKey, 'CN=Test Intermediate');
        [$leafCert, $leafKey] = $this->generateChild($intCert, $intKey, 'CN=Test Leaf');

        $this->rootCaPath = tempnam(sys_get_temp_dir(), 'jws_test_root_') . '.cer';
        file_put_contents($this->rootCaPath, $this->pemToDer($this->certPem($rootCert)));

        $this->rootCertB64 = $this->certB64($rootCert);
        $this->intCertB64  = $this->certB64($intCert);
        $this->leafCertB64 = $this->certB64($leafCert);
        $this->leafKey     = $leafKey;

        // A second, unrelated root for negative tests
        [$this->altRootCert] = $this->generateSelfSigned('CN=Alt Root CA');
    }

    protected function tearDown(): void
    {
        if (is_file($this->rootCaPath)) {
            @unlink($this->rootCaPath);
        }
        parent::tearDown();
    }

    public function test_valid_jws_is_accepted(): void
    {
        $jws = $this->makeJws(['hello' => 'world', 'n' => 42]);
        $verifier = new JwsVerifier($this->rootCaPath);

        $payload = $verifier->verifyAndDecode($jws);

        $this->assertEquals('world', $payload['hello']);
        $this->assertEquals(42, $payload['n']);
    }

    public function test_jws_with_two_cert_chain_is_accepted(): void
    {
        // Chain without explicit root in x5c — verifier should anchor to bundled root
        $jws = $this->makeJws(['ok' => true], x5c: [$this->leafCertB64, $this->intCertB64]);
        $verifier = new JwsVerifier($this->rootCaPath);

        $this->assertTrue($verifier->verifyAndDecode($jws)['ok']);
    }

    public function test_tampered_signature_is_rejected(): void
    {
        $jws = $this->makeJws(['x' => 1]);
        $parts = explode('.', $jws);
        // Flip a byte in the signature segment
        $sig = $parts[2];
        $sig[0] = $sig[0] === 'A' ? 'B' : 'A';
        $tampered = $parts[0] . '.' . $parts[1] . '.' . $sig;

        $this->expectException(InvalidSignatureException::class);
        (new JwsVerifier($this->rootCaPath))->verifyAndDecode($tampered);
    }

    public function test_jws_with_wrong_root_is_rejected(): void
    {
        // Embed an alt root in x5c[2] — must not match the pinned root
        $altRootB64 = $this->certB64($this->altRootCert);
        $jws = $this->makeJws(['x' => 1], x5c: [$this->leafCertB64, $this->intCertB64, $altRootB64]);

        $this->expectException(InvalidSignatureException::class);
        (new JwsVerifier($this->rootCaPath))->verifyAndDecode($jws);
    }

    public function test_jws_with_non_es256_alg_is_rejected(): void
    {
        // Build header with alg=HS256
        $header = ['alg' => 'HS256', 'typ' => 'JWT', 'x5c' => [$this->leafCertB64, $this->intCertB64]];
        $h = $this->b64url(json_encode($header));
        $p = $this->b64url(json_encode(['x' => 1]));
        $sig = $this->b64url(hash_hmac('sha256', "$h.$p", 'secret', true));

        $this->expectException(InvalidSignatureException::class);
        (new JwsVerifier($this->rootCaPath))->verifyAndDecode("$h.$p.$sig");
    }

    public function test_jws_with_wrong_part_count_is_rejected(): void
    {
        $this->expectException(InvalidSignatureException::class);
        (new JwsVerifier($this->rootCaPath))->verifyAndDecode('only.two');
    }

    /**
     * @param string[]|null $x5c
     */
    private function makeJws(array $payload, ?array $x5c = null): string
    {
        $header = [
            'alg' => 'ES256',
            'typ' => 'JWT',
            'x5c' => $x5c ?? [$this->leafCertB64, $this->intCertB64, $this->rootCertB64],
        ];

        $h = $this->b64url(json_encode($header));
        $p = $this->b64url(json_encode($payload));

        $derSig = '';
        if (!openssl_sign("$h.$p", $derSig, $this->leafKey, OPENSSL_ALGO_SHA256)) {
            $this->fail('openssl_sign failed');
        }
        $p1363 = $this->derToP1363($derSig);

        return "$h.$p." . $this->b64url($p1363);
    }

    /** @return array{0: OpenSSLCertificate, 1: OpenSSLAsymmetricKey} */
    private function generateSelfSigned(string $dn): array
    {
        $key = openssl_pkey_new([
            'private_key_type' => OPENSSL_KEYTYPE_EC,
            'curve_name'       => 'prime256v1',
            'private_key_bits' => 2048,
        ]);
        if (!$key) {
            $this->markTestSkipped('openssl_pkey_new failed: ' . openssl_error_string());
        }
        $csr = openssl_csr_new($this->parseDn($dn), $key, ['digest_alg' => 'sha256']);
        $cert = openssl_csr_sign($csr, null, $key, 1, ['digest_alg' => 'sha256']);
        return [$cert, $key];
    }

    /** @return array{0: OpenSSLCertificate, 1: OpenSSLAsymmetricKey} */
    private function generateChild(OpenSSLCertificate $issuerCert, OpenSSLAsymmetricKey $issuerKey, string $dn): array
    {
        $key = openssl_pkey_new([
            'private_key_type' => OPENSSL_KEYTYPE_EC,
            'curve_name'       => 'prime256v1',
            'private_key_bits' => 2048,
        ]);
        if (!$key) {
            $this->markTestSkipped('openssl_pkey_new failed: ' . openssl_error_string());
        }
        $csr  = openssl_csr_new($this->parseDn($dn), $key, ['digest_alg' => 'sha256']);
        $cert = openssl_csr_sign($csr, $issuerCert, $issuerKey, 1, ['digest_alg' => 'sha256']);
        return [$cert, $key];
    }

    /** @return array<string,string> */
    private function parseDn(string $dn): array
    {
        $out = [];
        foreach (explode(',', $dn) as $piece) {
            [$k, $v] = array_map('trim', explode('=', $piece, 2));
            $out[$k] = $v;
        }
        return $out;
    }

    private function certPem(OpenSSLCertificate $cert): string
    {
        $pem = '';
        openssl_x509_export($cert, $pem);
        return $pem;
    }

    private function certB64(OpenSSLCertificate $cert): string
    {
        return preg_replace(
            '/\s+/',
            '',
            preg_replace('/-----(BEGIN|END) CERTIFICATE-----/', '', $this->certPem($cert))
        );
    }

    private function pemToDer(string $pem): string
    {
        $b64 = preg_replace('/-----(BEGIN|END) CERTIFICATE-----/', '', $pem);
        return base64_decode(preg_replace('/\s+/', '', $b64));
    }

    private function b64url(string $s): string
    {
        return rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
    }

    private function derToP1363(string $der): string
    {
        // Minimal DER ECDSA-Sig parser → 64 bytes (r||s padded to 32 each)
        $offset = 0;
        $this->expectByte($der, $offset, 0x30);
        $this->skipDerLength($der, $offset);

        $this->expectByte($der, $offset, 0x02);
        $rLen = $this->readDerLength($der, $offset);
        $r = substr($der, $offset, $rLen); $offset += $rLen;

        $this->expectByte($der, $offset, 0x02);
        $sLen = $this->readDerLength($der, $offset);
        $s = substr($der, $offset, $sLen);

        $r = str_pad(ltrim($r, "\x00"), 32, "\x00", STR_PAD_LEFT);
        $s = str_pad(ltrim($s, "\x00"), 32, "\x00", STR_PAD_LEFT);
        return $r . $s;
    }

    private function expectByte(string $buf, int &$o, int $b): void
    {
        if (ord($buf[$o]) !== $b) {
            throw new \RuntimeException('Bad DER: expected ' . dechex($b));
        }
        $o++;
    }

    private function skipDerLength(string $buf, int &$o): void
    {
        $this->readDerLength($buf, $o);
    }

    private function readDerLength(string $buf, int &$o): int
    {
        $first = ord($buf[$o++]);
        if ($first < 0x80) return $first;
        $n = $first & 0x7f;
        $len = 0;
        for ($i = 0; $i < $n; $i++) {
            $len = ($len << 8) | ord($buf[$o++]);
        }
        return $len;
    }
}

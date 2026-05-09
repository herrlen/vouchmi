<?php

namespace App\Services\AppStore;

use App\Exceptions\AppStore\InvalidSignatureException;
use OpenSSLCertificate;

/**
 * Verifies Apple's JWS payloads end-to-end:
 *   1. Parses the x5c cert chain from the JWS header.
 *   2. Pins the chain root to the bundled Apple Root CA G3.
 *   3. Validates leaf <- intermediate <- root signatures.
 *   4. Verifies the JWS body signature with the leaf's public key.
 *
 * Throws InvalidSignatureException on any failure. NEVER skip — even in
 * sandbox — or attackers can forge transactions/notifications.
 */
class JwsVerifier
{
    public function __construct(
        private readonly string $rootCaPath,
    ) {}

    public static function fromConfig(): self
    {
        $path = (string) config('services.apple_iap.root_ca_path');
        if (!str_starts_with($path, '/')) {
            $path = base_path($path);
        }
        return new self($path);
    }

    /** @return array<string,mixed> */
    public function verifyAndDecode(string $signedJws): array
    {
        $parts = explode('.', $signedJws);
        if (count($parts) !== 3) {
            throw new InvalidSignatureException('JWS must have 3 parts');
        }
        [$rawHeader, $rawPayload, $rawSig] = $parts;

        $header = $this->jsonDecode($this->b64urlDecode($rawHeader), 'header');
        if (($header['alg'] ?? null) !== 'ES256') {
            throw new InvalidSignatureException('JWS alg must be ES256');
        }

        $x5c = $header['x5c'] ?? [];
        if (!is_array($x5c) || count($x5c) < 2) {
            throw new InvalidSignatureException('JWS x5c chain missing or too short');
        }

        $leaf         = $this->certFromB64($x5c[0]);
        $intermediate = $this->certFromB64($x5c[1]);
        $rootFromJws  = isset($x5c[2]) ? $this->certFromB64($x5c[2]) : null;
        $appleRoot    = $this->loadAppleRootCa();

        // Pin root: chain MUST anchor to Apple Root CA G3
        if ($rootFromJws !== null && !$this->certsEqual($rootFromJws, $appleRoot)) {
            throw new InvalidSignatureException('JWS root does not match Apple Root CA G3');
        }
        $root = $rootFromJws ?? $appleRoot;

        // Validate chain signatures
        if (openssl_x509_verify($leaf, $this->certToPem($intermediate)) !== 1) {
            throw new InvalidSignatureException('Leaf cert not signed by intermediate');
        }
        if (openssl_x509_verify($intermediate, $this->certToPem($root)) !== 1) {
            throw new InvalidSignatureException('Intermediate cert not signed by Apple root');
        }

        // Verify JWS signature with leaf public key
        $signingInput = $rawHeader . '.' . $rawPayload;
        $signature    = $this->b64urlDecode($rawSig);

        $pubKey = openssl_pkey_get_public($this->certToPem($leaf));
        if (!$pubKey) {
            throw new InvalidSignatureException('Could not extract public key from leaf cert');
        }

        $derSig = $this->p1363ToDer($signature);
        $verified = openssl_verify($signingInput, $derSig, $pubKey, OPENSSL_ALGO_SHA256);
        if ($verified !== 1) {
            throw new InvalidSignatureException('JWS signature verification failed');
        }

        return $this->jsonDecode($this->b64urlDecode($rawPayload), 'payload');
    }

    private function b64urlDecode(string $s): string
    {
        $padded = $s . str_repeat('=', (4 - strlen($s) % 4) % 4);
        $decoded = base64_decode(strtr($padded, '-_', '+/'), true);
        if ($decoded === false) {
            throw new InvalidSignatureException('Invalid base64url segment');
        }
        return $decoded;
    }

    /** @return array<string,mixed> */
    private function jsonDecode(string $json, string $what): array
    {
        $value = json_decode($json, true);
        if (!is_array($value)) {
            throw new InvalidSignatureException("JWS {$what} is not a JSON object");
        }
        return $value;
    }

    private function certFromB64(string $b64): OpenSSLCertificate
    {
        $pem = "-----BEGIN CERTIFICATE-----\n"
             . chunk_split($b64, 64, "\n")
             . "-----END CERTIFICATE-----\n";
        $cert = openssl_x509_read($pem);
        if (!$cert) {
            throw new InvalidSignatureException('Could not parse cert from x5c chain');
        }
        return $cert;
    }

    private function certToPem(OpenSSLCertificate $cert): string
    {
        $pem = '';
        if (!openssl_x509_export($cert, $pem)) {
            throw new InvalidSignatureException('Could not export cert to PEM');
        }
        return $pem;
    }

    private function loadAppleRootCa(): OpenSSLCertificate
    {
        if (!is_file($this->rootCaPath)) {
            throw new InvalidSignatureException("Apple Root CA G3 not found at: {$this->rootCaPath}");
        }
        $der = file_get_contents($this->rootCaPath);
        if ($der === false || $der === '') {
            throw new InvalidSignatureException('Apple Root CA G3 file is empty');
        }
        // .cer files are DER-encoded; wrap as PEM for openssl_x509_read
        $pem = "-----BEGIN CERTIFICATE-----\n"
             . chunk_split(base64_encode($der), 64, "\n")
             . "-----END CERTIFICATE-----\n";
        $cert = openssl_x509_read($pem);
        if (!$cert) {
            throw new InvalidSignatureException('Could not parse bundled Apple Root CA G3');
        }
        return $cert;
    }

    private function certsEqual(OpenSSLCertificate $a, OpenSSLCertificate $b): bool
    {
        return openssl_x509_fingerprint($a, 'sha256')
            === openssl_x509_fingerprint($b, 'sha256');
    }

    /**
     * JWS ES256 signatures are raw 64-byte P1363 (r || s).
     * openssl_verify expects DER-encoded ECDSA signature.
     */
    private function p1363ToDer(string $sig): string
    {
        if (strlen($sig) !== 64) {
            throw new InvalidSignatureException(
                'Invalid ES256 signature length: expected 64 bytes, got ' . strlen($sig)
            );
        }
        $r = $this->derInteger(substr($sig, 0, 32));
        $s = $this->derInteger(substr($sig, 32, 32));
        $body = $r . $s;
        return "\x30" . $this->derLength(strlen($body)) . $body;
    }

    private function derInteger(string $bytes): string
    {
        $bytes = ltrim($bytes, "\x00");
        if ($bytes === '') {
            $bytes = "\x00";
        }
        // If high bit is set, prepend 0x00 to keep it a positive INTEGER
        if (ord($bytes[0]) & 0x80) {
            $bytes = "\x00" . $bytes;
        }
        return "\x02" . $this->derLength(strlen($bytes)) . $bytes;
    }

    private function derLength(int $len): string
    {
        if ($len < 128) {
            return chr($len);
        }
        $out = '';
        while ($len > 0) {
            $out = chr($len & 0xff) . $out;
            $len >>= 8;
        }
        return chr(0x80 | strlen($out)) . $out;
    }
}

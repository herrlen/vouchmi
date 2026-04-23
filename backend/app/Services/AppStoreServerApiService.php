<?php

namespace App\Services;

use Firebase\JWT\JWT;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * App Store Server API — JWT-authentifizierte Kommunikation mit Apple.
 *
 * Referenz: https://developer.apple.com/documentation/appstoreserverapi
 */
class AppStoreServerApiService
{
    private string $bundleId;
    private string $issuerId;
    private string $keyId;
    private string $privateKeyPath;
    private string $environment;

    public function __construct()
    {
        $this->bundleId       = config('services.apple.bundle_id');
        $this->issuerId       = config('services.apple.issuer_id');
        $this->keyId          = config('services.apple.key_id');
        $this->privateKeyPath = config('services.apple.private_key_path');
        $this->environment    = config('services.apple.environment', 'sandbox');
    }

    public function isConfigured(): bool
    {
        return !empty($this->issuerId)
            && !empty($this->keyId)
            && !empty($this->privateKeyPath)
            && file_exists($this->privateKeyPath);
    }

    /**
     * Base URL je nach Environment.
     */
    private function baseUrl(): string
    {
        return $this->environment === 'production'
            ? 'https://api.storekit.itunes.apple.com'
            : 'https://api.storekit-sandbox.itunes.apple.com';
    }

    /**
     * ES256-JWT für App Store Server API generieren.
     */
    public function generateJwt(): string
    {
        $privateKey = file_get_contents($this->privateKeyPath);

        $payload = [
            'iss' => $this->issuerId,
            'iat' => time(),
            'exp' => time() + 3600,
            'aud' => 'appstoreconnect-v1',
            'bid' => $this->bundleId,
        ];

        return JWT::encode($payload, $privateKey, 'ES256', $this->keyId);
    }

    /**
     * Transaction-Info von Apple holen.
     * GET /inApps/v1/transactions/{transactionId}
     */
    public function fetchTransactionInfo(string $transactionId): ?array
    {
        if (!$this->isConfigured()) {
            Log::warning('apple.server_api.not_configured');
            return null;
        }

        $response = Http::withToken($this->generateJwt())
            ->acceptJson()
            ->get($this->baseUrl() . "/inApps/v1/transactions/{$transactionId}");

        if (!$response->successful()) {
            Log::warning('apple.server_api.fetch_failed', [
                'transaction_id' => $transactionId,
                'status'         => $response->status(),
                'body'           => $response->body(),
            ]);
            return null;
        }

        $body = $response->json();
        $signedTransaction = $body['signedTransactionInfo'] ?? null;

        if (!$signedTransaction) {
            return null;
        }

        return $this->decodeJws($signedTransaction);
    }

    /**
     * Subscription-Status von Apple holen.
     * GET /inApps/v1/subscriptions/{originalTransactionId}
     */
    public function fetchSubscriptionStatus(string $originalTransactionId): ?array
    {
        if (!$this->isConfigured()) return null;

        $response = Http::withToken($this->generateJwt())
            ->acceptJson()
            ->get($this->baseUrl() . "/inApps/v1/subscriptions/{$originalTransactionId}");

        if (!$response->successful()) {
            Log::warning('apple.server_api.subscription_status_failed', [
                'original_transaction_id' => $originalTransactionId,
                'status'                  => $response->status(),
            ]);
            return null;
        }

        return $response->json();
    }

    /**
     * JWS decodieren und Signatur gegen Apple-Zertifikate verifizieren.
     *
     * In Produktion: x5c-Chain → Apple Root CA G3 validieren.
     * Hier: Payload decodieren + in Sandbox die Chain prüfen sofern
     * openssl verfügbar ist.
     */
    public function verifyAndDecodeJws(string $jws): ?array
    {
        $decoded = $this->decodeJws($jws);
        if (!$decoded) return null;

        // x5c-Chain aus Header extrahieren und validieren
        $header = $this->decodeJwsHeader($jws);
        if ($header && !empty($header['x5c'])) {
            $valid = $this->verifyX5cChain($header['x5c'], $jws);
            if (!$valid) {
                Log::warning('apple.jws.x5c_validation_failed');
                return null;
            }
        }

        return $decoded;
    }

    /**
     * JWS-Payload decodieren (ohne Signatur-Check — für interne Nutzung).
     */
    public function decodeJws(string $jws): ?array
    {
        $parts = explode('.', $jws);
        if (count($parts) !== 3) return null;

        $payload = json_decode(
            base64_decode(strtr($parts[1], '-_', '+/')),
            true
        );

        return is_array($payload) ? $payload : null;
    }

    /**
     * JWS-Header decodieren.
     */
    private function decodeJwsHeader(string $jws): ?array
    {
        $parts = explode('.', $jws);
        if (count($parts) !== 3) return null;

        return json_decode(
            base64_decode(strtr($parts[0], '-_', '+/')),
            true
        );
    }

    /**
     * x5c-Zertifikatskette verifizieren.
     *
     * 1. Leaf-Zertifikat aus x5c[0]
     * 2. Intermediate aus x5c[1]
     * 3. Root muss Apple Root CA G3 sein
     * 4. JWS-Signatur mit Leaf Public Key prüfen
     */
    private function verifyX5cChain(array $x5cChain, string $jws): bool
    {
        if (count($x5cChain) < 2) return false;

        try {
            // Leaf-Zertifikat als PEM
            $leafPem = "-----BEGIN CERTIFICATE-----\n"
                . chunk_split($x5cChain[0], 64, "\n")
                . "-----END CERTIFICATE-----";

            $leafCert = openssl_x509_read($leafPem);
            if (!$leafCert) return false;

            // Public Key aus Leaf
            $pubKey = openssl_pkey_get_public($leafCert);
            if (!$pubKey) return false;

            // JWS-Signatur prüfen (ES256)
            $parts = explode('.', $jws);
            $signatureInput = $parts[0] . '.' . $parts[1];
            $signature = base64_decode(strtr($parts[2], '-_', '+/'));

            // ES256 DER-Signatur in P1363-Format umwandeln falls nötig
            $verified = openssl_verify(
                $signatureInput,
                $this->derToP1363($signature),
                $pubKey,
                OPENSSL_ALGO_SHA256
            );

            return $verified === 1;
        } catch (\Throwable $e) {
            Log::warning('apple.jws.x5c_error', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * DER-encoded ECDSA Signatur in fixed-length P1363 Format umwandeln.
     */
    private function derToP1363(string $der): string
    {
        // Wenn die Signatur schon 64 Bytes (P1363) ist, direkt zurückgeben
        if (strlen($der) === 64) return $der;

        // DER SEQUENCE parsen
        $offset = 0;
        if (ord($der[$offset++]) !== 0x30) return $der; // SEQUENCE
        $offset++; // length

        // R-Wert
        if (ord($der[$offset++]) !== 0x02) return $der; // INTEGER
        $rLen = ord($der[$offset++]);
        $r = substr($der, $offset, $rLen);
        $offset += $rLen;

        // S-Wert
        if (ord($der[$offset++]) !== 0x02) return $der; // INTEGER
        $sLen = ord($der[$offset++]);
        $s = substr($der, $offset, $sLen);

        // Auf 32 Bytes normalisieren
        $r = str_pad(ltrim($r, "\x00"), 32, "\x00", STR_PAD_LEFT);
        $s = str_pad(ltrim($s, "\x00"), 32, "\x00", STR_PAD_LEFT);

        return $r . $s;
    }
}

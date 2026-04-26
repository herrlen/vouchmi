<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Wrapper um die Twilio Verify v2 API.
 * Wir nutzen den Verify-Service (server-managed Code-Lifecycle: Generation,
 * Versand, Validierung, Rate-Limiting). Eigener Code-Speicher entfällt.
 */
class TwilioVerifyService
{
    private string $base = 'https://verify.twilio.com/v2';

    public function __construct(
        private string $accountSid,
        private string $authToken,
        private string $serviceSid,
    ) {}

    /**
     * Schickt eine 6-stellige PIN per SMS an die Nummer.
     * @param string $phone E.164-Format, z.B. "+491711234567"
     * @return array ['status' => 'pending'|'failed', 'message' => string]
     */
    public function sendCode(string $phone): array
    {
        $response = Http::withBasicAuth($this->accountSid, $this->authToken)
            ->asForm()
            ->post("{$this->base}/Services/{$this->serviceSid}/Verifications", [
                'To'      => $phone,
                'Channel' => 'sms',
            ]);

        if (!$response->successful()) {
            Log::warning('twilio.verify.send_failed', [
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);
            return ['status' => 'failed', 'message' => 'SMS konnte nicht versendet werden.'];
        }

        return ['status' => 'pending', 'message' => 'Code gesendet.'];
    }

    /**
     * Prüft den eingegebenen Code gegen Twilio.
     * @return bool true wenn approved, false sonst.
     */
    public function checkCode(string $phone, string $code): bool
    {
        $response = Http::withBasicAuth($this->accountSid, $this->authToken)
            ->asForm()
            ->post("{$this->base}/Services/{$this->serviceSid}/VerificationCheck", [
                'To'   => $phone,
                'Code' => $code,
            ]);

        if (!$response->successful()) {
            Log::warning('twilio.verify.check_failed', [
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);
            return false;
        }

        return ($response->json('status') ?? '') === 'approved';
    }
}

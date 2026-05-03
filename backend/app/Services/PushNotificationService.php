<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PushNotificationService
{
    private string $teamId;
    private string $keyId;
    private string $keyPath;
    private string $bundleId;
    private bool $production;

    public function __construct()
    {
        $this->teamId = config('services.apns.team_id', '');
        $this->keyId = config('services.apns.key_id', '');
        $this->keyPath = config('services.apns.key_path', '');
        $this->bundleId = 'com.vouchmi.app';
        $this->production = app()->isProduction();
    }

    /**
     * Send an alert push to all of a user's registered devices.
     *
     * $data is an arbitrary key-value map merged into the APNs payload outside
     * of `aps`. The app reads it on tap to deep-link (e.g. type=follow → user
     * profile, type=dm → conversation thread).
     */
    public function sendToUser(string $userId, string $title, string $body, array $data = []): void
    {
        $rows = DB::table('push_tokens')
            ->where('user_id', $userId)
            ->where('platform', 'ios')
            ->get(['token']);

        if ($rows->isEmpty()) return;

        $payload = [
            'aps' => [
                'alert' => ['title' => $title, 'body' => $body],
                'sound' => 'default',
                'mutable-content' => 1,
            ],
        ];
        if (!empty($data)) $payload['data'] = $data;

        foreach ($rows as $row) {
            $this->sendOne($row->token, $payload);
        }
    }

    private function sendOne(string $token, array $payload): void
    {
        if (empty($this->teamId) || empty($this->keyId) || empty($this->keyPath)) {
            Log::warning('[Push] Missing APNs configuration, skipping');
            return;
        }
        if (!is_file($this->keyPath)) {
            Log::warning("[Push] APNs key not found at {$this->keyPath}");
            return;
        }

        try {
            $host = $this->production
                ? 'https://api.push.apple.com'
                : 'https://api.sandbox.push.apple.com';

            $jwt = $this->generateJwt();

            $resp = Http::withHeaders([
                'authorization'   => "bearer {$jwt}",
                'apns-topic'      => $this->bundleId,
                'apns-push-type'  => 'alert',
                'apns-priority'   => '10',
            ])->withOptions(['version' => 2.0])
              ->post("{$host}/3/device/{$token}", $payload);

            // 410 Gone = token no longer valid → delete so we stop hitting it.
            if ($resp->status() === 410) {
                DB::table('push_tokens')->where('token', $token)->delete();
            } elseif (!$resp->successful()) {
                Log::warning("[Push] APNs {$resp->status()}: " . $resp->body());
            }
        } catch (\Throwable $e) {
            Log::warning("[Push] failed: {$e->getMessage()}");
        }
    }

    private function generateJwt(): string
    {
        $header = self::b64url(json_encode(['alg' => 'ES256', 'kid' => $this->keyId]));
        $claims = self::b64url(json_encode(['iss' => $this->teamId, 'iat' => time()]));

        $key = openssl_pkey_get_private(file_get_contents($this->keyPath));
        openssl_sign("{$header}.{$claims}", $signature, $key, OPENSSL_ALGO_SHA256);

        return "{$header}.{$claims}." . self::b64url($signature);
    }

    private static function b64url(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}

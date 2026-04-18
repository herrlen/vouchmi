<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Sends APNs pushes to update/end Live Activities for Brand Drops.
 * Uses token-based APNs auth (JWT with p8 key).
 */
class LiveActivityPushService
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
     * Push an update to all Live Activity tokens for a drop.
     */
    public function pushUpdate(string $dropId, array $contentState, bool $isEnd = false): void
    {
        $tokens = DB::table('live_activity_tokens')
            ->where('drop_id', $dropId)
            ->pluck('push_token');

        if ($tokens->isEmpty()) return;

        $payload = [
            'aps' => [
                'timestamp' => time(),
                'event' => $isEnd ? 'end' : 'update',
                'content-state' => $contentState,
                'alert' => $isEnd ? [
                    'title' => 'Drop beendet',
                    'body' => 'Der Drop ist abgelaufen.',
                ] : null,
            ],
        ];

        if ($isEnd) {
            $payload['aps']['dismissal-date'] = time() + (4 * 3600); // 4h dismissible
        }

        foreach ($tokens as $token) {
            $this->sendPush($token, $payload);
        }

        if ($isEnd) {
            DB::table('live_activity_tokens')->where('drop_id', $dropId)->delete();
        }
    }

    /**
     * Push a single update content state.
     */
    public function buildContentState(
        int $participantCount,
        int $stockClaimed,
        ?int $stockLimit,
        string $status
    ): array {
        return [
            'participantCount' => $participantCount,
            'stockClaimed' => $stockClaimed,
            'stockRemaining' => $stockLimit ? max(0, $stockLimit - $stockClaimed) : null,
            'status' => $status, // active, ending_soon, sold_out, ended
        ];
    }

    private function sendPush(string $token, array $payload): void
    {
        if (empty($this->teamId) || empty($this->keyId) || empty($this->keyPath)) {
            Log::warning('[APNs] Missing APNs configuration, skipping push');
            return;
        }

        try {
            $host = $this->production
                ? 'https://api.push.apple.com'
                : 'https://api.sandbox.push.apple.com';

            $jwt = $this->generateJwt();

            Http::withHeaders([
                'authorization' => "bearer {$jwt}",
                'apns-topic' => "{$this->bundleId}.push-type.liveactivity",
                'apns-push-type' => 'liveactivity',
                'apns-priority' => '10',
            ])->withOptions([
                'version' => 2.0,
            ])->post("{$host}/3/device/{$token}", $payload);
        } catch (\Exception $e) {
            Log::warning("[APNs] Push failed: {$e->getMessage()}");
        }
    }

    private function generateJwt(): string
    {
        $header = base64url_encode(json_encode([
            'alg' => 'ES256',
            'kid' => $this->keyId,
        ]));

        $claims = base64url_encode(json_encode([
            'iss' => $this->teamId,
            'iat' => time(),
        ]));

        $key = openssl_pkey_get_private(file_get_contents($this->keyPath));
        openssl_sign("{$header}.{$claims}", $signature, $key, OPENSSL_ALGO_SHA256);

        return "{$header}.{$claims}." . base64url_encode($signature);
    }
}

if (!function_exists('base64url_encode')) {
    function base64url_encode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}

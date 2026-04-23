<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Minimaler PayPal-Subscriptions-Client.
 *
 * Erwartet in config/services.php einen `paypal`-Block mit Credentials.
 * Solange die Credentials fehlen, läuft der Service im "Stub-Modus" und
 * gibt Platzhalter-Daten zurück — so kann das Frontend den Flow testen,
 * bevor PayPal verdrahtet ist.
 */
class PayPalService
{
    public function __construct(
        private ?string $clientId,
        private ?string $clientSecret,
        private ?string $planId,
        private string $mode = 'live',
        private ?string $brandPlanId = null,
        private ?string $influencerPlanId = null,
    ) {}

    public function isConfigured(): bool
    {
        return !empty($this->clientId) && !empty($this->clientSecret)
            && (!empty($this->planId) || !empty($this->brandPlanId) || !empty($this->influencerPlanId));
    }

    private function resolvePlanId(string $planType = 'brand'): ?string
    {
        if ($planType === 'influencer' && !empty($this->influencerPlanId)) {
            return $this->influencerPlanId;
        }
        if ($planType === 'brand' && !empty($this->brandPlanId)) {
            return $this->brandPlanId;
        }
        // Fallback auf alten einzelnen plan_id (für Bestandskunden)
        return $this->planId;
    }

    private function baseUrl(): string
    {
        return $this->mode === 'sandbox'
            ? 'https://api-m.sandbox.paypal.com'
            : 'https://api-m.paypal.com';
    }

    private function checkoutUrl(): string
    {
        return $this->mode === 'sandbox'
            ? 'https://www.sandbox.paypal.com/webapps/billing/subscriptions'
            : 'https://www.paypal.com/webapps/billing/subscriptions';
    }

    /**
     * OAuth-2.0 Access-Token holen. Cached wäre schöner, aber für ein
     * paar Subscribe-Calls pro Tag reicht live-Abruf.
     */
    private function accessToken(): ?string
    {
        if (!$this->isConfigured()) return null;

        $res = Http::asForm()
            ->withBasicAuth($this->clientId, $this->clientSecret)
            ->acceptJson()
            ->post($this->baseUrl() . '/v1/oauth2/token', [
                'grant_type' => 'client_credentials',
            ]);

        if (!$res->successful()) {
            Log::warning('paypal.oauth.failed', ['status' => $res->status(), 'body' => $res->body()]);
            return null;
        }

        return $res->json('access_token');
    }

    /**
     * Erstellt eine neue Subscription und gibt
     * { subscription_id, approval_url, status } zurück.
     *
     * @param array{email:string,brand_name:string,plan_type?:string,return_url?:string,cancel_url?:string} $context
     */
    public function createSubscription(array $context): array
    {
        $planType = $context['plan_type'] ?? 'brand';

        if (!$this->isConfigured()) {
            return [
                'subscription_id' => 'STUB-' . bin2hex(random_bytes(6)),
                'approval_url'    => $this->checkoutUrl() . '?stub=1',
                'status'          => 'STUB_PENDING',
                'configured'      => false,
            ];
        }

        $token = $this->accessToken();
        if (!$token) {
            return [
                'subscription_id' => null,
                'approval_url'    => null,
                'status'          => 'OAUTH_FAILED',
                'configured'      => true,
            ];
        }

        $res = Http::withToken($token)
            ->acceptJson()
            ->post($this->baseUrl() . '/v1/billing/subscriptions', [
                'plan_id'    => $this->resolvePlanId($planType),
                'subscriber' => [
                    'email_address' => $context['email'],
                    'name' => [
                        'given_name' => $context['brand_name'],
                        'surname'    => 'Vouchmi',
                    ],
                ],
                'application_context' => [
                    'brand_name'  => 'Vouchmi',
                    'locale'      => 'de-DE',
                    'user_action' => 'SUBSCRIBE_NOW',
                    'return_url'  => $context['return_url'] ?? 'https://app.vouchmi.com/brand/return',
                    'cancel_url'  => $context['cancel_url'] ?? 'https://app.vouchmi.com/brand/cancel',
                ],
            ]);

        if (!$res->successful()) {
            Log::warning('paypal.subscription.failed', ['status' => $res->status(), 'body' => $res->body()]);
            return [
                'subscription_id' => null,
                'approval_url'    => null,
                'status'          => 'CREATE_FAILED',
                'configured'      => true,
            ];
        }

        $body = $res->json();
        $approval = collect($body['links'] ?? [])->firstWhere('rel', 'approve')['href'] ?? null;

        return [
            'subscription_id' => $body['id'] ?? null,
            'approval_url'    => $approval,
            'status'          => $body['status'] ?? 'APPROVAL_PENDING',
            'configured'      => true,
        ];
    }

    public function getSubscription(string $subscriptionId): ?array
    {
        if (!$this->isConfigured()) return null;
        $token = $this->accessToken();
        if (!$token) return null;

        $res = Http::withToken($token)
            ->acceptJson()
            ->get($this->baseUrl() . "/v1/billing/subscriptions/{$subscriptionId}");

        return $res->successful() ? $res->json() : null;
    }

    public function cancelSubscription(string $subscriptionId, string $reason = 'User requested'): bool
    {
        if (!$this->isConfigured()) return false;
        $token = $this->accessToken();
        if (!$token) return false;

        $res = Http::withToken($token)
            ->acceptJson()
            ->post($this->baseUrl() . "/v1/billing/subscriptions/{$subscriptionId}/cancel", [
                'reason' => $reason,
            ]);

        return $res->successful();
    }
}

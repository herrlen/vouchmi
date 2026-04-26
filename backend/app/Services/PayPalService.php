<?php

namespace App\Services;

use Illuminate\Http\Request;
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
        private ?string $webhookId = null,
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

    /**
     * Prüft die Authentizität eines Webhook-Requests über PayPals
     * verify-webhook-signature-Endpoint. Erwartet einen eingehenden Request
     * inkl. PAYPAL-TRANSMISSION-* Headern. Gibt `false` zurück wenn die
     * WEBHOOK_ID nicht konfiguriert ist (Aufrufer entscheidet dann, ob
     * trotzdem akzeptiert wird — z. B. im Stub-Modus).
     */
    public function verifyWebhookSignature(Request $request): bool
    {
        if (!$this->isConfigured() || !$this->webhookId) {
            return false;
        }

        $token = $this->accessToken();
        if (!$token) return false;

        // WICHTIG: webhook_event muss die EXAKT empfangene Payload sein
        // (json_decode des raw body), nicht $request->all() — Laravel dekodiert
        // zwar identisch, aber wir wollen auf der sicheren Seite sein falls
        // Middleware den input-Bag manipuliert hat.
        $rawBody = $request->getContent();
        $webhookEvent = json_decode($rawBody, true);

        $payload = [
            'auth_algo'         => $request->header('paypal-auth-algo', ''),
            'cert_url'          => $request->header('paypal-cert-url', ''),
            'transmission_id'   => $request->header('paypal-transmission-id', ''),
            'transmission_sig'  => $request->header('paypal-transmission-sig', ''),
            'transmission_time' => $request->header('paypal-transmission-time', ''),
            'webhook_id'        => $this->webhookId,
            'webhook_event'     => $webhookEvent,
        ];

        $res = Http::withToken($token)
            ->acceptJson()
            ->post($this->baseUrl() . '/v1/notifications/verify-webhook-signature', $payload);

        $verificationStatus = $res->json('verification_status');
        $ok = $res->successful() && $verificationStatus === 'SUCCESS';

        if (!$ok) {
            // Tiefer Debug-Log — welche Header fehlen, welchen Event-Typ, was hat PayPal geantwortet.
            Log::warning('paypal.webhook.verify.details', [
                'http_status'         => $res->status(),
                'verification_status' => $verificationStatus,
                'paypal_error'        => $res->json(),
                'event_type'          => $webhookEvent['event_type'] ?? null,
                'resource_type'       => $webhookEvent['resource_type'] ?? null,
                'resource_version'    => $webhookEvent['resource_version'] ?? null,
                'has_auth_algo'       => (bool) $request->header('paypal-auth-algo'),
                'has_cert_url'        => (bool) $request->header('paypal-cert-url'),
                'has_transmission_id' => (bool) $request->header('paypal-transmission-id'),
                'has_transmission_sig'=> (bool) $request->header('paypal-transmission-sig'),
                'transmission_time'   => $request->header('paypal-transmission-time'),
            ]);
        }

        return $ok;
    }

    public function hasWebhookId(): bool
    {
        return !empty($this->webhookId);
    }

    /**
     * Ganzheitlicher Status-Report — Credentials, OAuth, Plans, Webhook.
     * Wird vom vouchmi:paypal:health Artisan-Command genutzt.
     *
     * @return array{mode:string, configured:bool, oauth:bool, plans:array, webhook:array|null, errors:string[]}
     */
    public function healthCheck(): array
    {
        $report = [
            'mode'       => $this->mode,
            'configured' => $this->isConfigured(),
            'oauth'      => false,
            'plans'      => [],
            'webhook'    => null,
            'errors'     => [],
        ];

        if (!$report['configured']) {
            $report['errors'][] = 'Credentials fehlen (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET / mind. ein PLAN_ID).';
            return $report;
        }

        $token = $this->accessToken();
        $report['oauth'] = (bool) $token;
        if (!$token) {
            $report['errors'][] = 'OAuth fehlgeschlagen — prüfe Client-ID/Secret und MODE.';
            return $report;
        }

        foreach ([
            'brand'      => $this->brandPlanId,
            'influencer' => $this->influencerPlanId,
            'legacy'     => $this->planId,
        ] as $label => $planId) {
            if (!$planId) {
                $report['plans'][$label] = ['set' => false];
                continue;
            }
            $res = Http::withToken($token)
                ->acceptJson()
                ->get($this->baseUrl() . "/v1/billing/plans/{$planId}");
            if ($res->successful()) {
                $body = $res->json();
                $report['plans'][$label] = [
                    'set'    => true,
                    'id'     => $planId,
                    'name'   => $body['name'] ?? null,
                    'status' => $body['status'] ?? null,
                    'valid'  => true,
                ];
            } else {
                $report['plans'][$label] = ['set' => true, 'id' => $planId, 'valid' => false, 'http' => $res->status()];
                $report['errors'][] = "Plan {$label} ({$planId}) nicht gefunden (HTTP {$res->status()}).";
            }
        }

        if ($this->webhookId) {
            $res = Http::withToken($token)
                ->acceptJson()
                ->get($this->baseUrl() . "/v1/notifications/webhooks/{$this->webhookId}");
            if ($res->successful()) {
                $body = $res->json();
                $report['webhook'] = [
                    'id'     => $this->webhookId,
                    'url'    => $body['url'] ?? null,
                    'events' => array_column($body['event_types'] ?? [], 'name'),
                    'valid'  => true,
                ];
            } else {
                $report['webhook'] = ['id' => $this->webhookId, 'valid' => false, 'http' => $res->status()];
                $report['errors'][] = "Webhook {$this->webhookId} nicht gefunden (HTTP {$res->status()}).";
            }
        } else {
            $report['errors'][] = 'PAYPAL_WEBHOOK_ID nicht gesetzt — Signature-Verifikation ist deaktiviert.';
        }

        return $report;
    }
}

<?php

// app/Services/MatomoService.php
namespace App\Services;

use Illuminate\Support\Facades\Http;

class MatomoService
{
    private string $baseUrl;
    private int $siteId;
    private string $authToken;

    public function __construct()
    {
        $this->baseUrl = config('services.matomo.url');
        $this->siteId = (int) config('services.matomo.site_id');
        $this->authToken = config('services.matomo.auth_token');
    }

    public function trackEvent(string $userId, string $category, string $action, ?string $name = null, ?float $value = null): void
    {
        Http::async()->get("{$this->baseUrl}/matomo.php", [
            'idsite' => $this->siteId,
            'rec' => 1,
            'uid' => $userId,
            'e_c' => $category,   // z.B. "commerce", "community", "deal"
            'e_a' => $action,     // z.B. "purchase", "post_created", "deal_joined"
            'e_n' => $name,
            'e_v' => $value,
            'token_auth' => $this->authToken,
        ]);
    }

    public function trackEcommerceOrder(string $userId, string $orderId, float $revenue, array $items = []): void
    {
        Http::async()->get("{$this->baseUrl}/matomo.php", [
            'idsite' => $this->siteId,
            'rec' => 1,
            'uid' => $userId,
            'idgoal' => 0,
            'ec_id' => $orderId,
            'revenue' => $revenue,
            'ec_items' => json_encode($items),
            'token_auth' => $this->authToken,
        ]);
    }

    public function getVisitsSummary(string $period = 'day', string $date = 'today'): array
    {
        $response = Http::get("{$this->baseUrl}/index.php", [
            'module' => 'API',
            'method' => 'VisitsSummary.get',
            'idSite' => $this->siteId,
            'period' => $period,
            'date' => $date,
            'format' => 'JSON',
            'token_auth' => $this->authToken,
        ]);

        return $response->json() ?? [];
    }
}

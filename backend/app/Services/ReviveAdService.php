<?php

// app/Services/ReviveAdService.php
// Sponsored Drops via Revive Adserver

namespace App\Services;

use Illuminate\Support\Facades\Http;

class ReviveAdService
{
    private ?string $baseUrl;
    private ?string $apiKey;

    public function __construct()
    {
        $this->baseUrl = config('services.revive.url');
        $this->apiKey = config('services.revive.api_key');
    }

    private function request()
    {
        return Http::withHeaders([
            'Authorization' => "Bearer {$this->apiKey}",
        ])->timeout(10);
    }

    /**
     * Erstellt eine Kampagne für einen Sponsored Drop
     */
    public function createCampaign(array $drop): ?int
    {
        $response = $this->request()->post("{$this->baseUrl}/api/campaign", [
            'advertiser_id' => $drop['advertiser_id'],
            'campaign_name' => "TrusCart Drop: {$drop['title']}",
            'start_date' => $drop['starts_at'],
            'end_date' => $drop['expires_at'],
            'priority' => 5,
            'weight' => 1,
            'revenue_type' => $drop['revenue_type'] ?? 'CPM', // CPM oder CPA
            'revenue' => $drop['revenue'] ?? 5.00,
        ]);

        return $response->json('campaign_id');
    }

    /**
     * Erstellt ein Banner/Ad für eine Community
     */
    public function createBanner(int $campaignId, array $drop): ?int
    {
        $response = $this->request()->post("{$this->baseUrl}/api/banner", [
            'campaign_id' => $campaignId,
            'banner_name' => $drop['title'],
            'storage_type' => 'html',
            'html_template' => $this->buildDropHtml($drop),
            'width' => 320,
            'height' => 250,
        ]);

        return $response->json('banner_id');
    }

    /**
     * Trackt eine Impression (Drop wurde gesehen)
     */
    public function trackImpression(int $bannerId, string $communityId, string $userId): void
    {
        $this->request()->post("{$this->baseUrl}/api/track/impression", [
            'banner_id' => $bannerId,
            'zone_id' => "community_{$communityId}",
            'user_id' => $userId,
        ]);
    }

    /**
     * Trackt einen Click (User hat auf Drop geklickt)
     */
    public function trackClick(int $bannerId, string $communityId, string $userId): void
    {
        $this->request()->post("{$this->baseUrl}/api/track/click", [
            'banner_id' => $bannerId,
            'zone_id' => "community_{$communityId}",
            'user_id' => $userId,
        ]);
    }

    /**
     * Holt Statistiken für eine Kampagne
     */
    public function getCampaignStats(int $campaignId): array
    {
        $response = $this->request()->get("{$this->baseUrl}/api/campaign/{$campaignId}/stats");
        return $response->json() ?? [];
    }

    /**
     * Generiert das HTML-Template für einen Drop
     */
    private function buildDropHtml(array $drop): string
    {
        $discount = $drop['discount_percent'] ?? 0;
        return <<<HTML
        <div class="truscart-drop" data-drop-id="{$drop['id']}">
            <img src="{$drop['image_url']}" alt="{$drop['title']}" />
            <h3>{$drop['title']}</h3>
            <p>{$drop['description']}</p>
            <span class="discount">-{$discount}%</span>
            <span class="brand">{$drop['brand_name']}</span>
        </div>
        HTML;
    }
}

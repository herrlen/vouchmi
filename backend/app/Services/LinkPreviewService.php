<?php

// app/Services/LinkPreviewService.php
// Zieht Bild, Titel, Preis aus jeder URL – wie WhatsApp, nur mit Affiliate-Tag

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;

class LinkPreviewService
{
    private array $affiliateTags = [];

    /**
     * Generiert eine Link-Preview mit OG-Tags + Affiliate-Link
     */
    public function getPreview(string $url): ?array
    {
        $cacheKey = 'link_preview_' . md5($url);

        return Cache::remember($cacheKey, 3600, function () use ($url) {
            try {
                $response = Http::timeout(8)
                    ->withHeaders(['User-Agent' => 'Vouchmi Bot/1.0'])
                    ->get($url);

                if (!$response->successful()) return null;

                $html = $response->body();
                $data = $this->extractMetaTags($html, $url);
                $data['original_url'] = $url;
                $data['affiliate_url'] = $this->addAffiliateTag($url);
                $data['domain'] = parse_url($url, PHP_URL_HOST);

                return $data;
            } catch (\Exception $e) {
                return null;
            }
        });
    }

    /**
     * Extrahiert Open Graph & Schema.org Daten aus HTML
     */
    private function extractMetaTags(string $html, string $url): array
    {
        $data = [
            'title' => null,
            'description' => null,
            'image' => null,
            'image_width' => null,
            'image_height' => null,
            'price' => null,
            'currency' => 'EUR',
            'site_name' => null,
        ];

        // Open Graph Tags
        $ogPatterns = [
            'title'       => '/<meta\s+property=["\']og:title["\']\s+content=["\']([^"\']+)["\']/i',
            'description' => '/<meta\s+property=["\']og:description["\']\s+content=["\']([^"\']+)["\']/i',
            'image'       => '/<meta\s+property=["\']og:image["\']\s+content=["\']([^"\']+)["\']/i',
            'site_name'   => '/<meta\s+property=["\']og:site_name["\']\s+content=["\']([^"\']+)["\']/i',
        ];

        foreach ($ogPatterns as $key => $pattern) {
            if (preg_match($pattern, $html, $match)) {
                $data[$key] = html_entity_decode($match[1], ENT_QUOTES, 'UTF-8');
            }
        }

        // Auch umgekehrte Reihenfolge (content vor property)
        $ogPatternsAlt = [
            'title'       => '/<meta\s+content=["\']([^"\']+)["\']\s+property=["\']og:title["\']/i',
            'description' => '/<meta\s+content=["\']([^"\']+)["\']\s+property=["\']og:description["\']/i',
            'image'       => '/<meta\s+content=["\']([^"\']+)["\']\s+property=["\']og:image["\']/i',
        ];

        foreach ($ogPatternsAlt as $key => $pattern) {
            if (!$data[$key] && preg_match($pattern, $html, $match)) {
                $data[$key] = html_entity_decode($match[1], ENT_QUOTES, 'UTF-8');
            }
        }

        // OG image dimensions (for aspect-ratio placeholders, prevents layout shift)
        $dimPatterns = [
            'image_width'  => ['/<meta\s+property=["\']og:image:width["\']\s+content=["\'](\d+)["\']/i', '/<meta\s+content=["\'](\d+)["\']\s+property=["\']og:image:width["\']/i'],
            'image_height' => ['/<meta\s+property=["\']og:image:height["\']\s+content=["\'](\d+)["\']/i', '/<meta\s+content=["\'](\d+)["\']\s+property=["\']og:image:height["\']/i'],
        ];
        foreach ($dimPatterns as $key => $patterns) {
            foreach ($patterns as $pattern) {
                if (preg_match($pattern, $html, $match)) {
                    $data[$key] = (int) $match[1];
                    break;
                }
            }
        }

        // Preis aus product:price oder Schema.org
        $pricePatterns = [
            '/<meta\s+property=["\']product:price:amount["\']\s+content=["\']([^"\']+)["\']/i',
            '/<meta\s+content=["\']([^"\']+)["\']\s+property=["\']product:price:amount["\']/i',
            '/"price"\s*:\s*"?([\d.,]+)"?/i',
            '/itemprop=["\']price["\']\s+content=["\']([^"\']+)["\']/i',
        ];

        foreach ($pricePatterns as $pattern) {
            if (preg_match($pattern, $html, $match)) {
                $price = str_replace(',', '.', $match[1]);
                $data['price'] = (float) $price;
                break;
            }
        }

        // Fallback: <title> Tag
        if (!$data['title'] && preg_match('/<title>([^<]+)<\/title>/i', $html, $match)) {
            $data['title'] = trim(html_entity_decode($match[1], ENT_QUOTES, 'UTF-8'));
        }

        // Relative Bild-URLs zu absoluten machen
        if ($data['image'] && !str_starts_with($data['image'], 'http')) {
            $parsed = parse_url($url);
            $base = $parsed['scheme'] . '://' . $parsed['host'];
            $data['image'] = $base . '/' . ltrim($data['image'], '/');
        }

        return $data;
    }

    /**
     * Hängt den Promoter-Username als ?ref=<username> an die URL an.
     * Kernmechanik: Marken erkennen so in ihren Analytics,
     * welcher Vouchmi-User die Klicks/Käufe geliefert hat.
     */
    public function addRefTag(string $url, string $username): string
    {
        $separator = str_contains($url, '?') ? '&' : '?';
        return $url . $separator . 'ref=' . rawurlencode($username);
    }

    /**
     * Amazon-Links müssen auf die reine Produkt-Detail-Seite reduziert werden:
     * - Kurzlinks (amzn.to, amzn.eu, ...) werden abgelehnt — User soll den
     *   vollständigen Link einfügen.
     * - Affiliate-Parameter (tag, linkCode, ascsubtag, ref_, …) werden
     *   entfernt. Der ASIN wird aus dem Pfad extrahiert und die URL neu
     *   gebaut als https://amazon.<tld>/dp/<ASIN>.
     * - Gibt null zurück, wenn der Link kein gültiger Amazon-PDP-Link ist.
     */
    public function canonicalizeAmazon(string $url): ?string
    {
        $parts = parse_url($url);
        if (!$parts || empty($parts['host'])) return null;
        $host = strtolower($parts['host']);

        if (preg_match('/^amzn\./', preg_replace('/^www\./', '', $host))) {
            return null;
        }

        if (!preg_match('/(?:^|\.)amazon\.([a-z.]+)$/', $host, $m)) {
            return null;
        }
        $tld = $m[1];

        $path = $parts['path'] ?? '';
        if (preg_match('#/(?:dp|gp/product|gp/aw/d)/([A-Z0-9]{10})(?:/|$)#', $path, $am)) {
            $asin = $am[1];
            return "https://www.amazon.{$tld}/dp/{$asin}";
        }

        return null;
    }

    /**
     * Fügt Affiliate-Tag zur URL hinzu
     */
    public function addAffiliateTag(string $url): string
    {
        $host = strtolower(parse_url($url, PHP_URL_HOST) ?? '');
        $host = preg_replace('/^www\./', '', $host);

        foreach ($this->affiliateTags as $domain => $config) {
            if (str_contains($host, $domain)) {
                if (isset($config['network']) && $config['network'] === 'awin') {
                    // Awin Deep Link
                    $encodedUrl = urlencode($url);
                    return "https://www.awin1.com/cread.php?awinmid=0&awinaffid={$config['publisher_id']}&ued={$encodedUrl}";
                }

                if (isset($config['param'])) {
                    // Direkter Tag (Amazon)
                    $separator = str_contains($url, '?') ? '&' : '?';
                    return $url . $separator . $config['param'] . '=' . $config['tag'];
                }
            }
        }

        // Kein Affiliate-Programm bekannt — originale URL
        return $url;
    }

    /**
     * Prüft ob eine URL von einem bekannten Shop stammt
     */
    public function isShopLink(string $url): bool
    {
        $shopDomains = [
            'amazon.', 'ebay.', 'zalando.', 'otto.', 'aboutyou.',
            'mediamarkt.', 'saturn.', 'idealo.', 'kaufland.',
            'etsy.com', 'aliexpress.', 'shopify.com', 'myshopify.com',
            'asos.', 'hm.com', 'ikea.', 'douglas.',
        ];

        $host = strtolower(parse_url($url, PHP_URL_HOST) ?? '');
        foreach ($shopDomains as $domain) {
            if (str_contains($host, $domain)) return true;
        }
        return false;
    }
}

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
     * Extrahiert Open Graph & Schema.org Daten aus HTML.
     *
     * JSON-LD wird zuerst geparst (verlässlichste Quelle für Shopify & Co.):
     * dort steht der Preis als Dezimalzahl + das echte Produktbild.
     * OG-Tags werden nur als Fallback genutzt — Shopify schreibt z.B.
     * `"price":1699` (Cents) als JS-Variable VOR der JSON-LD ins HTML, was
     * eine naive Regex-Suche reinfällt.
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

        // 1) JSON-LD (Schema.org Product) zuerst — höchste Priorität.
        $ld = $this->extractFromJsonLd($html);
        if ($ld) {
            foreach (['title', 'description', 'image', 'price', 'currency'] as $k) {
                if (!empty($ld[$k])) $data[$k] = $ld[$k];
            }
        }

        // 2) Open Graph Tags als Fallback / Ergänzung.
        $ogPatterns = [
            'title'       => '/<meta\s+property=["\']og:title["\']\s+content=["\']([^"\']+)["\']/i',
            'description' => '/<meta\s+property=["\']og:description["\']\s+content=["\']([^"\']+)["\']/i',
            'image'       => '/<meta\s+property=["\']og:image["\']\s+content=["\']([^"\']+)["\']/i',
            'site_name'   => '/<meta\s+property=["\']og:site_name["\']\s+content=["\']([^"\']+)["\']/i',
        ];

        foreach ($ogPatterns as $key => $pattern) {
            if (empty($data[$key]) && preg_match($pattern, $html, $match)) {
                $data[$key] = html_entity_decode($match[1], ENT_QUOTES, 'UTF-8');
            }
        }

        // Umgekehrte Reihenfolge (content vor property)
        $ogPatternsAlt = [
            'title'       => '/<meta\s+content=["\']([^"\']+)["\']\s+property=["\']og:title["\']/i',
            'description' => '/<meta\s+content=["\']([^"\']+)["\']\s+property=["\']og:description["\']/i',
            'image'       => '/<meta\s+content=["\']([^"\']+)["\']\s+property=["\']og:image["\']/i',
        ];

        foreach ($ogPatternsAlt as $key => $pattern) {
            if (empty($data[$key]) && preg_match($pattern, $html, $match)) {
                $data[$key] = html_entity_decode($match[1], ENT_QUOTES, 'UTF-8');
            }
        }

        // OG image dimensions (für Aspect-Ratio-Placeholder, verhindert Layout-Shift)
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

        // 3) Preis-Fallback nur wenn JSON-LD nichts geliefert hat: dann
        // ZUERST product:price:amount (sicher) und erst zuletzt die generische
        // "price"-Regex (riskant wegen Cents-Variablen).
        if ($data['price'] === null) {
            $pricePatterns = [
                '/<meta\s+property=["\']product:price:amount["\']\s+content=["\']([^"\']+)["\']/i',
                '/<meta\s+content=["\']([^"\']+)["\']\s+property=["\']product:price:amount["\']/i',
                '/itemprop=["\']price["\']\s+content=["\']([^"\']+)["\']/i',
            ];
            foreach ($pricePatterns as $pattern) {
                if (preg_match($pattern, $html, $match)) {
                    $data['price'] = (float) str_replace(',', '.', $match[1]);
                    break;
                }
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

        // iOS App Transport Security blockt http:// — Shopify-CDN & die meisten
        // Shops liefern auch über https aus. Upgrade jeden http-Bild-Link.
        if ($data['image'] && str_starts_with($data['image'], 'http://')) {
            $data['image'] = 'https://' . substr($data['image'], 7);
        }

        return $data;
    }

    /**
     * Parst alle <script type="application/ld+json">-Blöcke und extrahiert
     * Produkt-Felder. Liefert null, wenn kein Product gefunden wird.
     */
    private function extractFromJsonLd(string $html): ?array
    {
        if (!preg_match_all('/<script[^>]*type=["\']application\/ld\+json["\'][^>]*>(.*?)<\/script>/is', $html, $matches)) {
            return null;
        }

        foreach ($matches[1] as $raw) {
            $json = trim(html_entity_decode($raw, ENT_QUOTES, 'UTF-8'));
            $decoded = json_decode($json, true);
            if (!is_array($decoded)) continue;

            // JSON-LD kann eine Liste oder ein Graph sein — alle Knoten durchsuchen.
            $candidates = isset($decoded['@graph']) && is_array($decoded['@graph']) ? $decoded['@graph'] : [$decoded];
            if (isset($candidates[0]) && !is_array($candidates[0])) $candidates = [$decoded];

            foreach ($candidates as $node) {
                if (!is_array($node)) continue;
                $type = $node['@type'] ?? null;
                if (is_array($type)) $type = $type[0] ?? null;
                if ($type !== 'Product') continue;

                $result = [];
                if (!empty($node['name'])) $result['title'] = (string) $node['name'];
                if (!empty($node['description'])) $result['description'] = (string) $node['description'];

                // Bild: kann String, Array oder Objekt mit "url" sein.
                $img = $node['image'] ?? null;
                if (is_array($img)) {
                    $first = $img[0] ?? null;
                    if (is_array($first)) $img = $first['url'] ?? null;
                    else $img = $first;
                } elseif (is_array($node['image'] ?? null)) {
                    $img = $node['image']['url'] ?? null;
                }
                if (is_string($img) && $img !== '') $result['image'] = $img;

                // Preis: erstes Offer mit Preis nehmen. Offer kann Liste oder Objekt sein.
                $offers = $node['offers'] ?? null;
                $offerList = [];
                if (is_array($offers)) {
                    if (isset($offers['@type'])) $offerList = [$offers];
                    else $offerList = $offers;
                }
                foreach ($offerList as $offer) {
                    if (!is_array($offer)) continue;
                    $p = $offer['price'] ?? ($offer['priceSpecification']['price'] ?? null);
                    if ($p !== null && $p !== '') {
                        $result['price'] = (float) str_replace(',', '.', (string) $p);
                        if (!empty($offer['priceCurrency'])) $result['currency'] = (string) $offer['priceCurrency'];
                        break;
                    }
                }

                if (!empty($result)) return $result;
            }
        }

        return null;
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

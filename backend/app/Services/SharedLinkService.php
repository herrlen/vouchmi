<?php

namespace App\Services;

use App\Models\Community;
use App\Models\LinkClick;
use App\Models\SharedLink;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Verantwortlich für das Erstellen von Short-Links, Anreichern mit UTM-Parametern,
 * Resolve + Click-Tracking. Hängt an den bestehenden LinkPreviewService für OG-Tags.
 */
class SharedLinkService
{
    public function __construct(
        private LinkPreviewService $preview,
    ) {}

    /**
     * @throws \InvalidArgumentException
     */
    public function createSharedLink(User $user, string $originalUrl, ?Community $community = null): SharedLink
    {
        $parts = parse_url($originalUrl);
        if (!$parts || empty($parts['host']) || !in_array($parts['scheme'] ?? '', ['http', 'https'], true)) {
            throw new \InvalidArgumentException('Ungültige URL.');
        }

        $host = strtolower(preg_replace('/^www\./', '', $parts['host']));

        if (preg_match('/(^|\.)(amazon|amzn)\./i', $host)) {
            throw new \InvalidArgumentException('Amazon-Links sind auf Vouchmi nicht erlaubt.');
        }

        $targetUrl = $this->appendUtm($originalUrl, $user, $community);
        $shortcode = $this->generateShortcode();
        $og = $this->preview->getPreview($originalUrl) ?? [];

        return SharedLink::create([
            'shortcode'       => $shortcode,
            'user_id'         => $user->id,
            'community_id'    => $community?->id,
            'original_url'    => $originalUrl,
            'target_url'      => $targetUrl,
            'domain'          => $host,
            'og_title'        => $og['title']       ?? null,
            'og_description'  => isset($og['description']) ? mb_substr($og['description'], 0, 512) : null,
            'og_image'        => $og['image']       ?? null,
            'click_count'     => 0,
        ]);
    }

    /**
     * Shortcode lookup + Click-Tracking.
     * Gibt target_url zurück oder null, wenn Code nicht existiert.
     */
    public function resolveAndTrack(string $shortcode, Request $request): ?string
    {
        $link = SharedLink::where('shortcode', $shortcode)->first();
        if (!$link) return null;

        $link->increment('click_count');

        LinkClick::create([
            'post_id'        => null,
            'user_id'        => $request->user()?->id,
            'community_id'   => $link->community_id,
            'shared_link_id' => $link->id,
            'original_url'   => $link->original_url,
            'affiliate_url'  => $link->target_url,
            'domain'         => $link->domain,
            'ip_hash'        => $this->hashIp((string) $request->ip()),
            'user_agent'     => mb_substr((string) $request->userAgent(), 0, 512),
            'referer'        => mb_substr((string) $request->headers->get('referer', ''), 0, 512) ?: null,
            'country'        => null,
            'clicked_at'     => now(),
        ]);

        return $link->target_url;
    }

    public function buildShortUrl(SharedLink $link): string
    {
        $domain = rtrim((string) config('services.shortlinks.domain', 'app.vouchmi.com'), '/');
        $scheme = config('services.shortlinks.scheme', 'https');
        return "{$scheme}://{$domain}/r/{$link->shortcode}";
    }

    private function appendUtm(string $url, User $user, ?Community $community): string
    {
        $medium = match ($user->role) {
            'brand'      => 'brand',
            'influencer' => 'influencer',
            default      => 'community',
        };

        $params = [
            'utm_source'   => 'vouchmi',
            'utm_medium'   => $medium,
            'utm_campaign' => $community ? $this->slugify($community->name) : 'direct',
            'utm_content'  => $this->slugify($user->username),
        ];

        $sep = str_contains($url, '?') ? '&' : '?';
        return $url . $sep . http_build_query($params);
    }

    /**
     * Deutsche Umlaute korrekt, lowercase, Leerzeichen → _, Rest auf [a-z0-9_-].
     */
    public function slugify(string $input): string
    {
        $map = ['ä' => 'ae', 'ö' => 'oe', 'ü' => 'ue', 'ß' => 'ss', 'Ä' => 'ae', 'Ö' => 'oe', 'Ü' => 'ue'];
        $s = strtr($input, $map);
        $s = mb_strtolower($s);
        $s = preg_replace('/[^a-z0-9]+/u', '_', $s);
        return trim($s, '_');
    }

    private function generateShortcode(int $length = 7): string
    {
        do {
            // Ausreichend Entropie und nur [a-z0-9]
            $code = substr(
                strtolower(preg_replace('/[^a-z0-9]/i', '', bin2hex(random_bytes($length)))),
                0, $length
            );
        } while (strlen($code) < $length || SharedLink::where('shortcode', $code)->exists());

        return $code;
    }

    /**
     * Täglich rotierender Salt — macht IP-Hash datenschutzfreundlicher (DSGVO).
     * Nach 24 h lässt sich der Hash nicht mehr mit neuen Klicks korrelieren.
     */
    private function hashIp(string $ip): string
    {
        if ($ip === '') return '';
        $salt = config('app.key') . now()->format('Y-m-d');
        return hash('sha256', $salt . '|' . $ip);
    }
}

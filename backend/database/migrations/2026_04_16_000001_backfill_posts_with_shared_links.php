<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Backfill: Bestehende Posts, die noch alte link_affiliate_url haben (z. B. ?ref=username),
 * bekommen einen SharedLink mit UTM-Parametern und einen Vouchmi-Kurzlink.
 */
return new class extends Migration
{
    public function up(): void
    {
        $shortDomain = rtrim((string) config('services.shortlinks.domain', 'app.vouchmi.com'), '/');

        $posts = DB::table('posts')
            ->whereNotNull('link_affiliate_url')
            ->where('link_affiliate_url', '!=', '')
            ->where('link_affiliate_url', 'not like', "%{$shortDomain}/r/%")
            ->get(['id', 'author_id', 'community_id', 'link_url', 'link_affiliate_url']);

        foreach ($posts as $post) {
            $originalUrl = $post->link_url ?? $post->link_affiliate_url;
            if (!$originalUrl) continue;

            // Strip existing ?ref= parameter from the original URL
            $cleanUrl = preg_replace('/([?&])ref=[^&]*(&|$)/', '$1', $originalUrl);
            $cleanUrl = rtrim($cleanUrl, '?&');

            $user = DB::table('users')->where('id', $post->author_id)->first(['id', 'username', 'role']);
            if (!$user) continue;

            $community = $post->community_id
                ? DB::table('communities')->where('id', $post->community_id)->first(['id', 'name'])
                : null;

            // UTM-Parameter aufbauen (gleiche Logik wie SharedLinkService::appendUtm)
            $medium = match ($user->role ?? 'user') {
                'brand'      => 'brand',
                'influencer' => 'influencer',
                default      => 'community',
            };

            $params = http_build_query([
                'utm_source'   => 'vouchmi',
                'utm_medium'   => $medium,
                'utm_campaign' => $community ? $this->slugify($community->name) : 'direct',
                'utm_content'  => $this->slugify($user->username),
            ]);

            $sep = str_contains($cleanUrl, '?') ? '&' : '?';
            $targetUrl = $cleanUrl . $sep . $params;

            // Shortcode generieren
            do {
                $code = substr(strtolower(preg_replace('/[^a-z0-9]/i', '', bin2hex(random_bytes(7)))), 0, 7);
            } while (DB::table('shared_links')->where('shortcode', $code)->exists());

            $now = now();
            $linkId = Str::uuid()->toString();

            DB::table('shared_links')->insert([
                'id'            => $linkId,
                'shortcode'     => $code,
                'user_id'       => $user->id,
                'community_id'  => $post->community_id,
                'original_url'  => $cleanUrl,
                'target_url'    => $targetUrl,
                'domain'        => strtolower(preg_replace('/^www\./', '', parse_url($cleanUrl, PHP_URL_HOST) ?? '')),
                'click_count'   => 0,
                'created_at'    => $now,
                'updated_at'    => $now,
            ]);

            $scheme = config('services.shortlinks.scheme', 'https');
            $shortUrl = "{$scheme}://{$shortDomain}/r/{$code}";

            DB::table('posts')->where('id', $post->id)->update([
                'link_affiliate_url' => $shortUrl,
            ]);
        }
    }

    public function down(): void
    {
        // Nicht reversibel — alte ?ref=-URLs sind nicht wiederherstellbar.
    }

    private function slugify(string $input): string
    {
        $map = ['ä' => 'ae', 'ö' => 'oe', 'ü' => 'ue', 'ß' => 'ss', 'Ä' => 'ae', 'Ö' => 'oe', 'Ü' => 'ue'];
        $s = strtr($input, $map);
        $s = mb_strtolower($s);
        $s = preg_replace('/[^a-z0-9]+/u', '_', $s);
        return trim($s, '_');
    }
};

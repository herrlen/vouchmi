<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Post;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class WidgetController extends Controller
{
    public function daily(Request $request): JsonResponse
    {
        $user = $request->user();

        // 1. User's communities
        $communityIds = DB::table('community_members')
            ->where('user_id', $user->id)
            ->pluck('community_id');

        if ($communityIds->isEmpty()) {
            return $this->fallbackTrending();
        }

        // 2. Posts from last 7 days, exclude already shown in last 24h
        $recentlyShown = DB::table('widget_history')
            ->where('user_id', $user->id)
            ->where('shown_at', '>=', now()->subDay())
            ->pluck('post_id');

        $posts = Post::whereIn('community_id', $communityIds)
            ->where('is_hidden', false)
            ->where('created_at', '>=', now()->subDays(7))
            ->whereNotNull('link_image')
            ->whereNotIn('id', $recentlyShown)
            ->with('author:id,username,display_name,avatar_url')
            ->with('community:id,name,slug')
            ->get();

        if ($posts->isEmpty()) {
            return $this->fallbackTrending();
        }

        // 3. Score and rank
        $scored = $posts->map(function ($post) {
            $hoursSince = now()->diffInHours($post->created_at);
            $freshnessBonus = max(0, 48 - $hoursSince);
            $score = ($post->like_count * 2) + ($post->comment_count * 1) + $freshnessBonus;
            $post->_score = $score;
            return $post;
        })->sortByDesc('_score');

        $top = $scored->first();

        // 4. Record in widget_history
        DB::table('widget_history')->insert([
            'id' => Str::uuid()->toString(),
            'user_id' => $user->id,
            'post_id' => $top->id,
            'shown_at' => now(),
        ]);

        return response()->json($this->formatPost($top))
            ->header('Cache-Control', 'private, max-age=3600');
    }

    private function fallbackTrending(): JsonResponse
    {
        $post = Post::whereNotNull('link_image')
            ->where('created_at', '>=', now()->subDays(14))
            ->with('author:id,username,display_name,avatar_url')
            ->with('community:id,name,slug')
            ->orderByDesc('like_count')
            ->first();

        if (!$post) {
            return response()->json(['message' => 'Keine Empfehlungen verfügbar.'], 404);
        }

        return response()->json($this->formatPost($post))
            ->header('Cache-Control', 'private, max-age=3600');
    }

    private function formatPost(Post $post): array
    {
        $communityEmoji = $this->getCommunityEmoji($post->community?->name ?? '');

        return [
            'uuid' => $post->id,
            'communityUuid' => $post->community_id,
            'communityName' => $post->community?->name ?? 'Community',
            'communityEmoji' => $communityEmoji,
            'communityAccentColor' => $this->getCommunityColor($post->community?->name ?? ''),
            'productTitle' => $post->link_title ?? $post->content ?? 'Empfehlung',
            'productImageUrl' => $post->link_image,
            'domain' => $post->link_domain ?? '',
            'voucherName' => $post->author?->display_name ?? $post->author?->username ?? 'Anonym',
            'voucherAvatarUrl' => $post->author?->avatar_url,
            'voucherCount' => $post->like_count,
            'deepLinkUrl' => "vouchmi://post/{$post->id}",
        ];
    }

    private function getCommunityEmoji(string $name): string
    {
        $map = ['fashion' => '👗', 'mode' => '👗', 'tech' => '💻', 'food' => '🍝',
            'beauty' => '💄', 'fitness' => '🏋', 'books' => '📚', 'sustainability' => '🌱',
            'nachhaltigkeit' => '🌱', 'audio' => '🎧', 'reisen' => '✈️', 'gaming' => '🎮'];
        $lower = strtolower($name);
        foreach ($map as $key => $emoji) {
            if (str_contains($lower, $key)) return $emoji;
        }
        return '💬';
    }

    private function getCommunityColor(string $name): string
    {
        $map = ['fashion' => '#F472B6', 'mode' => '#F472B6', 'beauty' => '#F472B6',
            'tech' => '#4F46E5', 'food' => '#F59E0B', 'fitness' => '#10B981',
            'sustainability' => '#10B981', 'nachhaltigkeit' => '#10B981',
            'books' => '#4F46E5', 'audio' => '#F59E0B'];
        $lower = strtolower($name);
        foreach ($map as $key => $color) {
            if (str_contains($lower, $key)) return $color;
        }
        return '#F59E0B';
    }
}

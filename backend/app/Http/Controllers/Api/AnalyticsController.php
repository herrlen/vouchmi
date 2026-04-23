<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    /**
     * GET /api/v1/analytics/overview
     * Übersicht: Profil-Views, Link-Klicks, Top-Posts
     */
    public function overview(Request $request): JsonResponse
    {
        $user = $request->user();

        // Klicks auf Posts des Influencers
        $clickStats = DB::table('link_clicks')
            ->join('posts', 'link_clicks.post_id', '=', 'posts.id')
            ->where('posts.author_id', $user->id)
            ->selectRaw("
                COUNT(*) as total_clicks,
                COUNT(CASE WHEN link_clicks.clicked_at >= ? THEN 1 END) as clicks_7d,
                COUNT(CASE WHEN link_clicks.clicked_at >= ? THEN 1 END) as clicks_30d
            ", [now()->subDays(7), now()->subDays(30)])
            ->first();

        // Follower-Count
        $followerCount = DB::table('follows')
            ->where('following_id', $user->id)
            ->count();

        // Anzahl Posts
        $postCount = DB::table('posts')
            ->where('author_id', $user->id)
            ->count();

        // Engagement: Likes + Kommentare auf eigene Posts
        $engagement = DB::table('posts')
            ->where('author_id', $user->id)
            ->selectRaw('COALESCE(SUM(like_count), 0) as total_likes, COALESCE(SUM(comment_count), 0) as total_comments')
            ->first();

        return response()->json([
            'clicks' => [
                'total' => (int) $clickStats->total_clicks,
                '7d'    => (int) $clickStats->clicks_7d,
                '30d'   => (int) $clickStats->clicks_30d,
            ],
            'followers'  => $followerCount,
            'posts'      => $postCount,
            'engagement' => [
                'likes'    => (int) $engagement->total_likes,
                'comments' => (int) $engagement->total_comments,
            ],
        ]);
    }

    /**
     * GET /api/v1/analytics/links
     * Performance einzelner Links/Posts
     */
    public function linkPerformance(Request $request): JsonResponse
    {
        $user = $request->user();

        $posts = DB::table('posts')
            ->where('author_id', $user->id)
            ->whereNotNull('link_url')
            ->select('id', 'content', 'link_url', 'link_title', 'link_domain', 'click_count', 'like_count', 'comment_count', 'created_at')
            ->orderByDesc('click_count')
            ->limit(50)
            ->get();

        return response()->json(['posts' => $posts]);
    }

    /**
     * GET /api/v1/analytics/audience
     * Aus welchen Communities kommt der Traffic
     */
    public function audience(Request $request): JsonResponse
    {
        $user = $request->user();

        $communities = DB::table('link_clicks')
            ->join('posts', 'link_clicks.post_id', '=', 'posts.id')
            ->join('communities', 'link_clicks.community_id', '=', 'communities.id')
            ->where('posts.author_id', $user->id)
            ->whereNotNull('link_clicks.community_id')
            ->selectRaw('communities.id, communities.name, communities.member_count, COUNT(*) as clicks')
            ->groupBy('communities.id', 'communities.name', 'communities.member_count')
            ->orderByDesc('clicks')
            ->limit(20)
            ->get();

        return response()->json(['communities' => $communities]);
    }
}

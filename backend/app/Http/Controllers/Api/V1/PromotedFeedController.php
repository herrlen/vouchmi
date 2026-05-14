<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\BoostFeedService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PromotedFeedController extends Controller
{
    public function __construct(
        private readonly BoostFeedService $feed,
    ) {}

    /**
     * GET /api/v1/feed/promoted
     *
     * Boosted posts targeted at the current user (own communities + follows).
     * Designed to be called alongside /api/feed/all by the mobile client and
     * stitched into the UI as "Promoted" rows.
     */
    public function forViewer(Request $request): JsonResponse
    {
        $user = $request->user();

        $blockedIds = DB::table('user_blocks')
            ->where('blocker_id', $user->id)
            ->pluck('blocked_id')
            ->toArray();

        $memberCommunityIds = DB::table('community_members')
            ->where('user_id', $user->id)
            ->pluck('community_id')
            ->toArray();

        $followedUserIds = DB::table('follows')
            ->where('follower_id', $user->id)
            ->pluck('following_id')
            ->toArray();

        $posts = $this->feed->promotedForViewer(
            viewerId: $user->id,
            memberCommunityIds: $memberCommunityIds,
            followedUserIds: $followedUserIds,
            blockedAuthorIds: $blockedIds,
            limit: (int) $request->query('limit', 5),
        );

        $this->feed->decoratePosts($posts);

        foreach ($posts as $post) {
            $this->feed->recordImpression($post->id);
        }

        return response()->json([
            'posts' => $posts,
        ]);
    }

    /**
     * GET /api/v1/discover/boosted
     *
     * Platform-wide list of currently boosted posts ("Beworben"-Section in
     * Discover). The is_promoted/boost_* flags are required by §6 TMG /
     * Digital Services Act labelling rules — clients MUST surface them.
     */
    public function discover(Request $request): JsonResponse
    {
        $user = $request->user();
        $blockedIds = DB::table('user_blocks')
            ->where('blocker_id', $user->id)
            ->pluck('blocked_id')
            ->toArray();

        $posts = $this->feed->discoverBoosted(
            blockedAuthorIds: $blockedIds,
            limit: (int) $request->query('limit', 20),
        );

        $this->feed->decoratePosts($posts);

        foreach ($posts as $post) {
            $this->feed->recordImpression($post->id);
        }

        return response()->json([
            'posts' => $posts,
        ]);
    }
}

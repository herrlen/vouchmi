<?php

namespace App\Services;

use App\Models\Boost;
use App\Models\Post;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Builder;

/**
 * Glue between the boost system and the feed/discover surfaces.
 *
 * Two main jobs:
 *   - Select boosted posts that should appear as "Promoted" slots above /
 *     between organic posts for a given audience.
 *   - Record impressions when boosted posts are served (1:10 sampling).
 *
 * Anti-coupling note: the existing FeedController stays chronological. This
 * service exposes a SEPARATE list of boosted posts the client can stitch into
 * the feed. That avoids reshaping the paginated response and keeps boost
 * concerns isolated.
 */
class BoostFeedService
{
    public function __construct(
        private readonly BoostService $boosts,
    ) {}

    /**
     * Posts currently being boosted that are relevant to a specific viewer.
     * Relevance heuristic: same communities as the viewer, OR authored by
     * someone the viewer follows. Sorted by multiplier desc (premium tiers
     * outrank cheaper ones).
     *
     * @return Collection<int, Post>
     */
    public function promotedForViewer(
        string $viewerId,
        array $memberCommunityIds,
        array $followedUserIds,
        array $blockedAuthorIds = [],
        int $limit = 5,
    ): Collection {
        $boosts = Boost::active()
            ->orderByDesc('multiplier')
            ->orderByDesc('starts_at')
            ->get(['post_id', 'multiplier']);

        if ($boosts->isEmpty()) {
            return new Collection();
        }

        $orderedPostIds = $boosts->pluck('post_id');

        $posts = Post::query()
            ->whereIn('id', $orderedPostIds)
            ->where('is_hidden', false)
            ->whereNotIn('author_id', $blockedAuthorIds)
            ->where('author_id', '!=', $viewerId)
            ->where(function (Builder $q) use ($memberCommunityIds, $followedUserIds) {
                $q->whereIn('community_id', $memberCommunityIds)
                  ->orWhereIn('author_id', $followedUserIds);
            })
            ->with('author:id,username,display_name,avatar_url,role,tier,tier_badge_opacity')
            ->with('community:id,name,slug')
            ->get();

        return $this->orderByList($posts, $orderedPostIds->all())->take($limit)->values();
    }

    /**
     * Platform-wide boosted posts for the public "Discover" surface. Strict
     * filters apply: not hidden, not blocked, premium-tier first.
     *
     * @return Collection<int, Post>
     */
    public function discoverBoosted(array $blockedAuthorIds = [], int $limit = 20): Collection
    {
        $orderedPostIds = Boost::active()
            ->orderByDesc('multiplier')
            ->orderByDesc('starts_at')
            ->pluck('post_id');

        if ($orderedPostIds->isEmpty()) {
            return new Collection();
        }

        $posts = Post::query()
            ->whereIn('id', $orderedPostIds)
            ->where('is_hidden', false)
            ->whereNotIn('author_id', $blockedAuthorIds)
            ->with('author:id,username,display_name,avatar_url,role,tier,tier_badge_opacity')
            ->with('community:id,name,slug')
            ->get();

        return $this->orderByList($posts, $orderedPostIds->all())->take($limit)->values();
    }

    /**
     * Reorder a collection of Eloquent models to match a given list of IDs.
     * Used because `whereIn(...)->get()` doesn't preserve input order across
     * SQLite / MySQL, and we need boost-order (multiplier desc) to stick.
     */
    private function orderByList(Collection $posts, array $orderedIds): Collection
    {
        $byId = $posts->keyBy('id');
        $ordered = new Collection();
        foreach ($orderedIds as $id) {
            if ($byId->has($id)) {
                $ordered->push($byId->get($id));
            }
        }
        return $ordered;
    }

    /**
     * Record an impression for a boosted post, sampled 1:10 to keep load low
     * on busy feeds. Pass `force=true` for tests or precise tracking.
     */
    public function recordImpression(string $postId, bool $force = false): void
    {
        if (!$force && random_int(1, 10) !== 1) {
            return;
        }
        // Multiply by 10 when sampled so reported impressions reflect reality.
        $this->boosts->recordImpression($postId, $force ? 1 : 10);
    }

    /**
     * Decorate a collection of posts with `is_promoted` and `boost_multiplier`
     * flags for the given post-ids that are currently boosted. Mutates the
     * collection in-place AND returns it.
     */
    public function decoratePosts(Collection $posts): Collection
    {
        $ids = $posts->pluck('id')->all();
        if (empty($ids)) {
            return $posts;
        }

        $activeBoosts = Boost::active()
            ->whereIn('post_id', $ids)
            ->get()
            ->keyBy('post_id');

        foreach ($posts as $post) {
            $boost = $activeBoosts->get($post->id);
            $post->is_promoted = (bool) $boost;
            $post->boost_multiplier = $boost?->multiplier ?? 1;
            $post->boost_tier = $boost?->tier;
        }

        return $posts;
    }
}

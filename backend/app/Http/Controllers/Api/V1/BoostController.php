<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\InsufficientCreditsException;
use App\Http\Controllers\Controller;
use App\Models\Boost;
use App\Models\Post;
use App\Services\BoostService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;
use RuntimeException;

class BoostController extends Controller
{
    public function __construct(
        private readonly BoostService $boosts,
    ) {}

    /**
     * POST /api/v1/posts/{post}/boost
     * Body: { tier, idempotency_key? }
     */
    public function store(Request $request, string $postId): JsonResponse
    {
        $user = $request->user();
        $post = Post::findOrFail($postId);

        if ($post->author_id !== $user->id) {
            return response()->json(['error' => 'forbidden'], 403);
        }

        $tier = (string) $request->input('tier', '');
        $idempotencyKey = $request->input('idempotency_key');

        try {
            $boost = $this->boosts->boost($user, $post, $tier, $idempotencyKey);
        } catch (InvalidArgumentException $e) {
            return response()->json(['error' => 'invalid_tier', 'message' => $e->getMessage()], 422);
        } catch (InsufficientCreditsException $e) {
            return response()->json([
                'error'    => 'insufficient_credits',
                'required' => $e->requested,
                'available' => $e->available,
            ], 402);
        } catch (RuntimeException $e) {
            return response()->json(['error' => 'boost_conflict', 'message' => $e->getMessage()], 409);
        }

        return response()->json([
            'boost' => $this->present($boost),
        ], 201);
    }

    /**
     * GET /api/v1/boosts/mine
     * Returns the current user's boosts (active + recent past), newest first.
     * Used by the Brand/Influencer Portal to render a performance overview.
     */
    public function mine(Request $request): JsonResponse
    {
        $user = $request->user();
        $boosts = Boost::where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();

        $postIds = $boosts->pluck('post_id')->all();
        $posts = $postIds
            ? Post::whereIn('id', $postIds)->get(['id', 'content', 'link_title'])->keyBy('id')
            : collect();

        return response()->json([
            'boosts' => $boosts->map(fn (Boost $b) => array_merge($this->present($b), [
                'post_preview' => optional($posts->get($b->post_id))->only(['content', 'link_title']),
            ])),
        ]);
    }

    /**
     * GET /api/v1/posts/{post}/boost
     * Returns the active boost for a post (or null).
     */
    public function show(Request $request, string $postId): JsonResponse
    {
        $post = Post::findOrFail($postId);

        $boost = Boost::where('post_id', $post->id)
            ->whereIn('status', [Boost::STATUS_ACTIVE, Boost::STATUS_EXPIRED])
            ->orderByDesc('starts_at')
            ->first();

        return response()->json([
            'boost' => $boost ? $this->present($boost) : null,
        ]);
    }

    /**
     * DELETE /api/v1/posts/{post}/boost
     * Cancels the active boost. Refund only when within cancel-window and no
     * impressions have been recorded yet.
     */
    public function destroy(Request $request, string $postId): JsonResponse
    {
        $user = $request->user();
        $post = Post::findOrFail($postId);

        if ($post->author_id !== $user->id) {
            return response()->json(['error' => 'forbidden'], 403);
        }

        $boost = Boost::where('post_id', $post->id)
            ->where('status', Boost::STATUS_ACTIVE)
            ->first();

        if (!$boost) {
            return response()->json(['error' => 'no_active_boost'], 404);
        }

        $boost = $this->boosts->cancel($boost);

        return response()->json([
            'boost'    => $this->present($boost),
            'refunded' => $boost->status === Boost::STATUS_REFUNDED,
        ]);
    }

    private function present(Boost $b): array
    {
        return [
            'id'            => $b->id,
            'post_id'       => $b->post_id,
            'tier'          => $b->tier,
            'multiplier'    => $b->multiplier,
            'credits_spent' => $b->credits_spent,
            'status'        => $b->status,
            'starts_at'     => $b->starts_at?->toIso8601String(),
            'ends_at'       => $b->ends_at?->toIso8601String(),
            'impressions'   => $b->stats_impressions,
            'clicks'        => $b->stats_clicks,
        ];
    }
}

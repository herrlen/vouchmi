<?php

namespace App\Services;

use App\Exceptions\InsufficientCreditsException;
use App\Jobs\SendBoostPushJob;
use App\Models\Boost;
use App\Models\Post;
use App\Models\User;
use App\Models\WalletTransaction;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use RuntimeException;

class BoostService
{
    public function __construct(
        private readonly WalletService $wallets,
    ) {}

    /**
     * Create a new boost: debits credits, creates a Boost row, returns it.
     *
     * Idempotent on $idempotencyKey — if the same key is reused, the existing
     * boost is returned and credits are NOT debited again.
     *
     * @throws InvalidArgumentException        Unknown tier.
     * @throws InsufficientCreditsException    Not enough credits.
     * @throws RuntimeException                Post already has an active boost.
     */
    public function boost(
        User $user,
        Post $post,
        string $tier,
        ?string $idempotencyKey = null,
    ): Boost {
        $config = config("credits.boosts.$tier");
        if (!$config) {
            throw new InvalidArgumentException("Unknown boost tier '{$tier}'.");
        }

        // Idempotency: identical key → return existing.
        if ($idempotencyKey !== null) {
            $existingTx = WalletTransaction::where('idempotency_key', $idempotencyKey)->first();
            if ($existingTx) {
                $existing = Boost::where('spend_transaction_id', $existingTx->id)->first();
                if ($existing) {
                    return $existing;
                }
            }
        }

        // One active boost per post — preempt overlap.
        $active = Boost::where('post_id', $post->id)
            ->where('status', Boost::STATUS_ACTIVE)
            ->where('ends_at', '>', now())
            ->first();
        if ($active) {
            throw new RuntimeException('Post already has an active boost.');
        }

        $credits = (int) $config['credits'];
        $multiplier = (int) $config['multiplier'];
        $durationMinutes = (int) $config['duration_minutes'];

        $boost = DB::transaction(function () use ($user, $post, $tier, $credits, $multiplier, $durationMinutes, $idempotencyKey) {
            $wallet = $this->wallets->getOrCreateWallet($user);

            $tx = $this->wallets->debit(
                walletOrId: $wallet,
                credits: $credits,
                idempotencyKey: $idempotencyKey,
                meta: [
                    'type'     => WalletTransaction::TYPE_BOOST_SPEND,
                    'metadata' => [
                        'post_id' => $post->id,
                        'tier'    => $tier,
                    ],
                ],
            );

            $now = now();

            return Boost::create([
                'user_id'              => $user->id,
                'post_id'              => $post->id,
                'tier'                 => $tier,
                'credits_spent'        => $credits,
                'multiplier'           => $multiplier,
                'starts_at'            => $now,
                'ends_at'              => $now->copy()->addMinutes($durationMinutes),
                'status'               => Boost::STATUS_ACTIVE,
                'spend_transaction_id' => $tx->id,
            ]);
        });

        if (!empty($config['push'])) {
            SendBoostPushJob::dispatch($boost->id);
        }

        return $boost;
    }

    /**
     * Cancel an active boost. Refunds credits only if within the configured
     * cancel-window AND the boost has not yet generated impressions.
     */
    public function cancel(Boost $boost): Boost
    {
        if ($boost->status !== Boost::STATUS_ACTIVE) {
            return $boost;
        }

        $windowMinutes = (int) config('credits.boost_cancel_window_minutes', 5);
        $eligibleForRefund = $boost->starts_at?->greaterThanOrEqualTo(now()->subMinutes($windowMinutes))
            && $boost->stats_impressions === 0;

        return DB::transaction(function () use ($boost, $eligibleForRefund) {
            $boost->refresh();

            if ($eligibleForRefund && $boost->spend_transaction_id) {
                $tx = WalletTransaction::find($boost->spend_transaction_id);
                if ($tx) {
                    $this->wallets->reverse($tx, ['reason' => 'boost_cancelled']);
                }
                $boost->status = Boost::STATUS_REFUNDED;
            } else {
                $boost->status = Boost::STATUS_CANCELLED;
            }

            $boost->ends_at = now();
            $boost->save();
            $this->forgetMultiplierCache($boost->post_id);

            return $boost;
        });
    }

    /**
     * Mark all boosts whose ends_at is in the past as expired. Returns the
     * count of rows changed. Designed to be called from a scheduler.
     */
    public function expireDueBoosts(): int
    {
        $expired = Boost::where('status', Boost::STATUS_ACTIVE)
            ->where('ends_at', '<=', now())
            ->get();

        foreach ($expired as $boost) {
            $this->forgetMultiplierCache($boost->post_id);
        }

        return Boost::whereIn('id', $expired->pluck('id'))
            ->update(['status' => Boost::STATUS_EXPIRED]);
    }

    /**
     * Returns the multiplier currently applied to a post's reach, or 1 if no
     * active boost exists. Cached until the boost's ends_at to avoid hitting
     * the DB on every feed-rank call.
     */
    public function getActiveMultiplier(string $postId): int
    {
        $cacheKey = "boost.multiplier.$postId";
        $hit = Cache::get($cacheKey);
        if ($hit !== null) {
            return (int) $hit;
        }

        $boost = Boost::where('post_id', $postId)
            ->where('status', Boost::STATUS_ACTIVE)
            ->where('starts_at', '<=', now())
            ->where('ends_at', '>', now())
            ->orderByDesc('multiplier')
            ->first();

        $multiplier = $boost ? (int) $boost->multiplier : 1;
        $ttl = $boost ? max(60, $boost->ends_at->diffInSeconds(now())) : 300;
        Cache::put($cacheKey, $multiplier, $ttl);

        return $multiplier;
    }

    /**
     * Bump impressions on the active boost for a post (if any). Cheap,
     * called from the feed-service. Cached multiplier doesn't need to be
     * invalidated — only the stats column changes.
     */
    public function recordImpression(string $postId, int $count = 1): void
    {
        Boost::where('post_id', $postId)
            ->where('status', Boost::STATUS_ACTIVE)
            ->where('starts_at', '<=', now())
            ->where('ends_at', '>', now())
            ->increment('stats_impressions', $count);
    }

    public function recordClick(string $postId, int $count = 1): void
    {
        Boost::where('post_id', $postId)
            ->where('status', Boost::STATUS_ACTIVE)
            ->where('starts_at', '<=', now())
            ->where('ends_at', '>', now())
            ->increment('stats_clicks', $count);
    }

    private function forgetMultiplierCache(string $postId): void
    {
        Cache::forget("boost.multiplier.$postId");
    }
}

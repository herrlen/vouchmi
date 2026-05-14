<?php

namespace App\Jobs;

use App\Models\Boost;
use App\Models\Follow;
use App\Services\PushNotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Sends a push notification to the followers of a brand_push-boosted post.
 *
 * Targeting v0: every follower of the boost-author. Future versions can layer
 * on interest-tag, tier, or follower-count filters (see Sprint plan 5.3).
 */
class SendBoostPushJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    /** @return int[] */
    public function backoff(): array
    {
        return [60, 300, 900];
    }

    public function __construct(
        public string $boostId,
    ) {
        $this->onQueue('boost_push');
    }

    public function handle(PushNotificationService $push): void
    {
        $boost = Boost::with('post.author')->find($this->boostId);
        if (!$boost) {
            Log::warning('boost.push.missing_boost', ['id' => $this->boostId]);
            return;
        }

        $post = $boost->post;
        $author = $post?->author;
        if (!$post || !$author) {
            Log::warning('boost.push.missing_post_or_author', ['boost_id' => $this->boostId]);
            return;
        }

        $followerIds = Follow::where('following_id', $author->id)
            ->pluck('follower_id');

        if ($followerIds->isEmpty()) {
            Log::info('boost.push.no_followers', ['boost_id' => $this->boostId]);
            return;
        }

        $title = sprintf('%s empfiehlt', $author->display_name ?: ('@' . $author->username));
        $body  = mb_strimwidth((string) $post->content, 0, 120, '…');
        $data  = [
            'type'     => 'boost',
            'post_id'  => $post->id,
            'boost_id' => $boost->id,
        ];

        foreach ($followerIds as $followerId) {
            $push->sendToUser($followerId, $title, $body, $data);
        }

        Log::info('boost.push.dispatched', [
            'boost_id'       => $this->boostId,
            'follower_count' => $followerIds->count(),
        ]);
    }
}

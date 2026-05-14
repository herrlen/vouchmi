<?php

namespace Tests\Feature;

use App\Jobs\SendBoostPushJob;
use App\Models\Boost;
use App\Models\Community;
use App\Models\Follow;
use App\Models\Post;
use App\Models\User;
use App\Services\BoostService;
use App\Services\WalletService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class PromotedFeedTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'credits.boosts' => [
                'mini'       => ['credits' => 50,  'multiplier' => 2, 'duration_minutes' => 60],
                'pro'        => ['credits' => 400, 'multiplier' => 5, 'duration_minutes' => 240],
                'brand_push' => ['credits' => 1000, 'multiplier' => 8, 'duration_minutes' => 1440, 'push' => true],
            ],
        ]);
    }

    private function makeUser(string $role = 'influencer'): User
    {
        return User::create([
            'email'    => 'feed-' . uniqid() . '@test.local',
            'username' => 'feed_' . uniqid(),
            'password' => bcrypt('secret'),
            'role'     => $role,
        ]);
    }

    private function makeCommunity(User $owner): Community
    {
        return Community::create([
            'name'         => 'C-' . uniqid(),
            'slug'         => 'c-' . uniqid(),
            'owner_id'     => $owner->id,
            'member_count' => 1,
        ]);
    }

    private function makePost(User $author, Community $community): Post
    {
        return Post::create([
            'community_id' => $community->id,
            'author_id'    => $author->id,
            'content'      => 'reco',
            'post_type'    => 'recommendation',
        ]);
    }

    private function joinCommunity(User $user, Community $community): void
    {
        DB::table('community_members')->insert([
            'user_id'      => $user->id,
            'community_id' => $community->id,
            'role'         => 'member',
            'joined_at'    => now(),
        ]);
    }

    private function fundAndBoost(User $author, Post $post, string $tier = 'mini'): Boost
    {
        $wallets = app(WalletService::class);
        $wallet = $wallets->getOrCreateWallet($author);
        $wallets->credit($wallet, 2_000, idempotencyKey: 'seed-' . $author->id);

        return app(BoostService::class)->boost($author, $post, $tier, 'k-' . $post->id);
    }

    public function test_promoted_endpoint_returns_boosts_targeted_at_viewer(): void
    {
        $viewer = $this->makeUser();
        $author = $this->makeUser();
        $community = $this->makeCommunity($author);
        $this->joinCommunity($viewer, $community);

        $post = $this->makePost($author, $community);
        $this->fundAndBoost($author, $post);

        $res = $this->actingAs($viewer)->getJson('/api/v1/feed/promoted');

        $res->assertOk()
            ->assertJsonPath('posts.0.id', $post->id)
            ->assertJsonPath('posts.0.is_promoted', true)
            ->assertJsonPath('posts.0.boost_multiplier', 2);
    }

    public function test_promoted_endpoint_excludes_own_boosts(): void
    {
        $user = $this->makeUser();
        $community = $this->makeCommunity($user);
        $this->joinCommunity($user, $community);
        $post = $this->makePost($user, $community);
        $this->fundAndBoost($user, $post);

        $res = $this->actingAs($user)->getJson('/api/v1/feed/promoted');

        $res->assertOk()->assertJsonPath('posts', []);
    }

    public function test_promoted_endpoint_excludes_unrelated_boosts(): void
    {
        $viewer = $this->makeUser();
        $stranger = $this->makeUser();
        $strangerCommunity = $this->makeCommunity($stranger);
        $strangerPost = $this->makePost($stranger, $strangerCommunity);
        $this->fundAndBoost($stranger, $strangerPost);

        // viewer is in no community of stranger and doesn't follow them
        $res = $this->actingAs($viewer)->getJson('/api/v1/feed/promoted');

        $res->assertOk()->assertJsonPath('posts', []);
    }

    public function test_promoted_endpoint_includes_followed_authors(): void
    {
        $viewer = $this->makeUser();
        $followed = $this->makeUser();
        $community = $this->makeCommunity($followed); // viewer NOT in this community
        $post = $this->makePost($followed, $community);
        $this->fundAndBoost($followed, $post);

        Follow::create([
            'follower_id'  => $viewer->id,
            'following_id' => $followed->id,
        ]);

        $res = $this->actingAs($viewer)->getJson('/api/v1/feed/promoted');

        $res->assertOk()->assertJsonPath('posts.0.id', $post->id);
    }

    public function test_discover_returns_platform_wide_boosts_sorted_by_multiplier(): void
    {
        $viewer = $this->makeUser();

        $authorMini = $this->makeUser();
        $communityMini = $this->makeCommunity($authorMini);
        $postMini = $this->makePost($authorMini, $communityMini);
        $this->fundAndBoost($authorMini, $postMini, 'mini');

        $authorPro = $this->makeUser();
        $communityPro = $this->makeCommunity($authorPro);
        $postPro = $this->makePost($authorPro, $communityPro);
        $this->fundAndBoost($authorPro, $postPro, 'pro');

        $res = $this->actingAs($viewer)->getJson('/api/v1/discover/boosted');

        $res->assertOk()
            ->assertJsonPath('posts.0.id', $postPro->id)      // higher multiplier first
            ->assertJsonPath('posts.0.boost_multiplier', 5)
            ->assertJsonPath('posts.1.id', $postMini->id);
    }

    public function test_discover_excludes_hidden_posts(): void
    {
        $viewer = $this->makeUser();
        $author = $this->makeUser();
        $community = $this->makeCommunity($author);
        $post = $this->makePost($author, $community);
        $this->fundAndBoost($author, $post);

        $post->is_hidden = true;
        $post->save();

        $res = $this->actingAs($viewer)->getJson('/api/v1/discover/boosted');
        $res->assertOk()->assertJsonPath('posts', []);
    }

    public function test_brand_push_tier_dispatches_push_job(): void
    {
        Queue::fake();

        $author = $this->makeUser();
        $community = $this->makeCommunity($author);
        $post = $this->makePost($author, $community);
        $this->fundAndBoost($author, $post, 'brand_push');

        Queue::assertPushed(SendBoostPushJob::class, function ($job) use ($post) {
            $boost = \App\Models\Boost::find($job->boostId);
            return $boost && $boost->post_id === $post->id;
        });
    }

    public function test_non_push_tier_does_not_dispatch_push(): void
    {
        Queue::fake();

        $author = $this->makeUser();
        $community = $this->makeCommunity($author);
        $post = $this->makePost($author, $community);
        $this->fundAndBoost($author, $post, 'mini');

        Queue::assertNotPushed(SendBoostPushJob::class);
    }
}

<?php

namespace Tests\Feature;

use App\Models\Boost;
use App\Models\Community;
use App\Models\Post;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Services\BoostService;
use App\Services\WalletService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class BoostTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Compact tier config so tests don't depend on the global defaults.
        config([
            'credits.boosts' => [
                'mini'     => ['credits' => 50,  'multiplier' => 2, 'duration_minutes' => 60],
                'standard' => ['credits' => 150, 'multiplier' => 3, 'duration_minutes' => 240],
            ],
            'credits.boost_cancel_window_minutes' => 5,
        ]);
    }

    private function makeUser(): User
    {
        return User::create([
            'email'    => 'boost-' . uniqid() . '@test.local',
            'username' => 'boost_' . uniqid(),
            'password' => bcrypt('secret'),
            'role'     => 'influencer',
        ]);
    }

    private function makePost(User $author): Post
    {
        $community = Community::create([
            'name'         => 'Test Community ' . uniqid(),
            'slug'         => 'tc-' . uniqid(),
            'owner_id'     => $author->id,
            'member_count' => 1,
        ]);

        return Post::create([
            'community_id' => $community->id,
            'author_id'    => $author->id,
            'content'      => 'a recommendation',
            'post_type'    => 'recommendation',
        ]);
    }

    private function fundUser(User $user, int $credits): Wallet
    {
        $wallets = app(WalletService::class);
        $wallet = $wallets->getOrCreateWallet($user);
        $wallets->credit($wallet, $credits, idempotencyKey: 'seed-' . $user->id);
        return $wallet->fresh();
    }

    public function test_owner_can_boost_own_post_and_debits_credits(): void
    {
        $user = $this->makeUser();
        $post = $this->makePost($user);
        $this->fundUser($user, 500);

        $res = $this->actingAs($user)->postJson("/api/v1/posts/{$post->id}/boost", [
            'tier'            => 'mini',
            'idempotency_key' => 'boost-key-1',
        ]);

        $res->assertStatus(201)
            ->assertJsonPath('boost.tier', 'mini')
            ->assertJsonPath('boost.multiplier', 2)
            ->assertJsonPath('boost.credits_spent', 50)
            ->assertJsonPath('boost.status', Boost::STATUS_ACTIVE);

        $this->assertSame(450, $user->wallet->fresh()->balance_credits);
    }

    public function test_boost_is_idempotent_on_idempotency_key(): void
    {
        $user = $this->makeUser();
        $post = $this->makePost($user);
        $this->fundUser($user, 500);

        $a = $this->actingAs($user)->postJson("/api/v1/posts/{$post->id}/boost", [
            'tier' => 'mini', 'idempotency_key' => 'dupe-key',
        ])->assertStatus(201);

        $b = $this->actingAs($user)->postJson("/api/v1/posts/{$post->id}/boost", [
            'tier' => 'mini', 'idempotency_key' => 'dupe-key',
        ])->assertStatus(201);

        $this->assertSame($a->json('boost.id'), $b->json('boost.id'));
        $this->assertSame(450, $user->wallet->fresh()->balance_credits);
        $this->assertSame(1, Boost::where('post_id', $post->id)->count());
    }

    public function test_non_owner_cannot_boost(): void
    {
        $owner = $this->makeUser();
        $other = $this->makeUser();
        $post = $this->makePost($owner);
        $this->fundUser($other, 500);

        $res = $this->actingAs($other)->postJson("/api/v1/posts/{$post->id}/boost", [
            'tier' => 'mini',
        ]);

        $res->assertStatus(403);
    }

    public function test_insufficient_credits_returns_402(): void
    {
        $user = $this->makeUser();
        $post = $this->makePost($user);
        $this->fundUser($user, 10); // not enough for mini=50

        $res = $this->actingAs($user)->postJson("/api/v1/posts/{$post->id}/boost", [
            'tier' => 'mini',
        ]);

        $res->assertStatus(402)
            ->assertJsonPath('error', 'insufficient_credits')
            ->assertJsonPath('required', 50)
            ->assertJsonPath('available', 10);
    }

    public function test_invalid_tier_returns_422(): void
    {
        $user = $this->makeUser();
        $post = $this->makePost($user);
        $this->fundUser($user, 500);

        $res = $this->actingAs($user)->postJson("/api/v1/posts/{$post->id}/boost", [
            'tier' => 'enterprise-platinum',
        ]);

        $res->assertStatus(422)->assertJsonPath('error', 'invalid_tier');
    }

    public function test_cannot_have_two_active_boosts_on_same_post(): void
    {
        $user = $this->makeUser();
        $post = $this->makePost($user);
        $this->fundUser($user, 500);

        $this->actingAs($user)->postJson("/api/v1/posts/{$post->id}/boost", [
            'tier' => 'mini', 'idempotency_key' => 'first',
        ])->assertStatus(201);

        $this->actingAs($user)->postJson("/api/v1/posts/{$post->id}/boost", [
            'tier' => 'mini', 'idempotency_key' => 'second',
        ])->assertStatus(409)->assertJsonPath('error', 'boost_conflict');
    }

    public function test_cancel_within_window_refunds_credits(): void
    {
        $user = $this->makeUser();
        $post = $this->makePost($user);
        $this->fundUser($user, 500);

        $this->actingAs($user)->postJson("/api/v1/posts/{$post->id}/boost", [
            'tier' => 'mini', 'idempotency_key' => 'k1',
        ])->assertStatus(201);

        $this->assertSame(450, $user->wallet->fresh()->balance_credits);

        $res = $this->actingAs($user)->deleteJson("/api/v1/posts/{$post->id}/boost");
        $res->assertOk()->assertJsonPath('refunded', true);

        $this->assertSame(500, $user->wallet->fresh()->balance_credits);
        $this->assertSame(Boost::STATUS_REFUNDED, Boost::where('post_id', $post->id)->first()->status);
    }

    public function test_cancel_after_impressions_does_not_refund(): void
    {
        $user = $this->makeUser();
        $post = $this->makePost($user);
        $this->fundUser($user, 500);
        $service = app(BoostService::class);
        $boost = $service->boost($user, $post, 'mini', 'i1');

        // Simulate the feed serving the boosted post.
        $service->recordImpression($post->id);

        $res = $this->actingAs($user)->deleteJson("/api/v1/posts/{$post->id}/boost");
        $res->assertOk()->assertJsonPath('refunded', false);

        $this->assertSame(450, $user->wallet->fresh()->balance_credits);
        $this->assertSame(Boost::STATUS_CANCELLED, Boost::find($boost->id)->status);
    }

    public function test_get_active_multiplier_returns_1_without_boost(): void
    {
        $user = $this->makeUser();
        $post = $this->makePost($user);
        $service = app(BoostService::class);

        $this->assertSame(1, $service->getActiveMultiplier($post->id));
    }

    public function test_get_active_multiplier_returns_boost_tier(): void
    {
        $user = $this->makeUser();
        $post = $this->makePost($user);
        $this->fundUser($user, 500);
        $service = app(BoostService::class);

        $service->boost($user, $post, 'standard', 'm1');

        $this->assertSame(3, $service->getActiveMultiplier($post->id));
    }

    public function test_expire_due_boosts_marks_expired_and_returns_count(): void
    {
        $user = $this->makeUser();
        $post = $this->makePost($user);
        $this->fundUser($user, 500);
        $service = app(BoostService::class);

        $boost = $service->boost($user, $post, 'mini', 'expire-1');

        // Force expiry.
        Boost::where('id', $boost->id)->update(['ends_at' => Carbon::now()->subMinute()]);

        $count = $service->expireDueBoosts();
        $this->assertSame(1, $count);
        $this->assertSame(Boost::STATUS_EXPIRED, Boost::find($boost->id)->status);
    }
}

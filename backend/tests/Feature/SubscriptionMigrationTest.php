<?php

namespace Tests\Feature;

use App\Models\Subscription;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubscriptionMigrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['credits.migration_bonus_percent' => 20]);
    }

    private function makeUser(): User
    {
        return User::create([
            'email'    => 'mig-' . uniqid() . '@test.local',
            'username' => 'mig_' . uniqid(),
            'password' => bcrypt('secret'),
            'role'     => 'influencer',
        ]);
    }

    private function makeActiveSub(User $user, string $plan = 'influencer', int $daysLeft = 30): Subscription
    {
        return Subscription::create([
            'user_id'          => $user->id,
            'plan_type'        => $plan,
            'payment_provider' => 'paypal',
            'status'           => 'active',
            'paypal_status'    => 'ACTIVE',
            'auto_renew'       => true,
            'started_at'       => now()->subDays(5),
            'expires_at'       => now()->addDays($daysLeft),
        ]);
    }

    public function test_dry_run_writes_nothing(): void
    {
        $user = $this->makeUser();
        $this->makeActiveSub($user);

        $this->artisan('subscriptions:migrate-to-credits')
            ->assertSuccessful();

        $this->assertSame(0, Wallet::count());
        $this->assertSame(0, WalletTransaction::count());
    }

    public function test_confirm_credits_user_with_prorata_plus_bonus(): void
    {
        $user = $this->makeUser();
        // 30 Tage × 1 €/Tag × 100 Credits = 3000, +20 % Bonus = 600 → total 3600
        $this->makeActiveSub($user, 'influencer', 30);

        $this->artisan('subscriptions:migrate-to-credits', [
            '--confirm' => true,
            '--rate'    => 1,
        ])->assertSuccessful();

        $this->assertSame(3600, $user->wallet->balance_credits);

        $tx = WalletTransaction::where('type', WalletTransaction::TYPE_MIGRATION_BONUS)->first();
        $this->assertNotNull($tx);
        $this->assertSame(3600, $tx->credits_delta);
        $this->assertSame('migration_bonus', $tx->type);
        $this->assertSame(3000, $tx->metadata['base_credits']);
        $this->assertSame(600, $tx->metadata['bonus_credits']);
    }

    public function test_brand_rate_2_doubles_credits(): void
    {
        $user = $this->makeUser();
        $this->makeActiveSub($user, 'brand', 10);

        $this->artisan('subscriptions:migrate-to-credits', [
            '--confirm' => true,
            '--rate'    => 2,
        ])->assertSuccessful();

        // 10 × 2 € × 100 = 2000, + 20% Bonus = 400 → 2400
        $this->assertSame(2400, $user->wallet->balance_credits);
    }

    public function test_idempotent_on_double_run(): void
    {
        $user = $this->makeUser();
        $this->makeActiveSub($user, 'influencer', 30);

        $this->artisan('subscriptions:migrate-to-credits', ['--confirm' => true, '--rate' => 1])
            ->assertSuccessful();
        $first = $user->wallet->balance_credits;

        $this->artisan('subscriptions:migrate-to-credits', ['--confirm' => true, '--rate' => 1])
            ->assertSuccessful();

        $this->assertSame($first, $user->wallet->fresh()->balance_credits);
        $this->assertSame(1, WalletTransaction::where('type', 'migration_bonus')->count());
    }

    public function test_skips_subscriptions_without_expires_at(): void
    {
        $user = $this->makeUser();
        Subscription::create([
            'user_id'          => $user->id,
            'plan_type'        => 'influencer',
            'payment_provider' => 'paypal',
            'status'           => 'active',
            'paypal_status'    => 'ACTIVE',
            'auto_renew'       => true,
            'started_at'       => now()->subDays(5),
            'expires_at'       => null,
        ]);

        $this->artisan('subscriptions:migrate-to-credits', ['--confirm' => true])
            ->assertSuccessful();

        $this->assertSame(0, WalletTransaction::count());
    }

    public function test_skips_expired_subscriptions(): void
    {
        $user = $this->makeUser();
        $this->makeActiveSub($user, 'influencer', -5); // expired 5 days ago

        $this->artisan('subscriptions:migrate-to-credits', ['--confirm' => true])
            ->assertSuccessful();

        $this->assertSame(0, WalletTransaction::count());
    }

    public function test_sunset_flag_disables_subscription_middleware(): void
    {
        $user = $this->makeUser(); // role=influencer, NO active subscription

        // Without sunset → 403
        config(['credits.subscriptions_sunset' => false]);
        $this->actingAs($user)->getJson('/api/v1/analytics/overview')
            ->assertStatus(403);

        // With sunset → middleware passes through (downstream may still 4xx
        // for other reasons but NOT subscription).
        config(['credits.subscriptions_sunset' => true]);
        $res = $this->actingAs($user)->getJson('/api/v1/analytics/overview');
        $this->assertNotSame(403, $res->status(), 'sunset flag should bypass subscription gate');
    }
}

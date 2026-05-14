<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\WalletTransaction;
use App\Services\WalletService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CreditsAdminTest extends TestCase
{
    use RefreshDatabase;

    private const TOKEN = 'admin-test-token';

    protected function setUp(): void
    {
        parent::setUp();
        config(['credits.admin_token' => self::TOKEN]);
    }

    private function makeUser(): User
    {
        return User::create([
            'email'    => 'a-' . uniqid() . '@test.local',
            'username' => 'a_' . uniqid(),
            'password' => bcrypt('secret'),
            'role'     => 'user',
        ]);
    }

    private function authHeaders(string $agent = 'support-len'): array
    {
        return [
            'Authorization' => 'Bearer ' . self::TOKEN,
            'X-Agent'       => $agent,
        ];
    }

    public function test_endpoint_disabled_without_token_config(): void
    {
        config(['credits.admin_token' => '']);
        $this->getJson('/api/internal/credits/admin/wallets/anything')
            ->assertStatus(503);
    }

    public function test_endpoint_rejects_bad_bearer(): void
    {
        $this->getJson('/api/internal/credits/admin/wallets/anything', [
            'Authorization' => 'Bearer wrong',
        ])->assertStatus(401);
    }

    public function test_show_wallet_returns_404_for_unknown_user(): void
    {
        $this->getJson('/api/internal/credits/admin/wallets/00000000-0000-0000-0000-000000000000', $this->authHeaders())
            ->assertStatus(404);
    }

    public function test_show_wallet_returns_balance_and_transactions(): void
    {
        $user = $this->makeUser();
        $wallets = app(WalletService::class);
        $wallet = $wallets->getOrCreateWallet($user);
        $wallets->credit($wallet, 200, idempotencyKey: 'seed', meta: ['payment_provider' => 'paypal']);

        $res = $this->getJson("/api/internal/credits/admin/wallets/{$user->id}", $this->authHeaders());

        $res->assertOk()
            ->assertJsonPath('user.id', $user->id)
            ->assertJsonPath('wallet.balance_credits', 200)
            ->assertJsonPath('transactions.0.credits_delta', 200);
    }

    public function test_adjust_credits_user_positive_with_audit(): void
    {
        $user = $this->makeUser();

        $res = $this->postJson('/api/internal/credits/admin/adjust', [
            'user_id'         => $user->id,
            'credits'         => 1000,
            'reason'          => 'goodwill: refund stuck',
            'idempotency_key' => 'support-1',
        ], $this->authHeaders('support-len'));

        $res->assertOk()->assertJsonPath('balance', 1000);

        $tx = WalletTransaction::where('idempotency_key', 'support-1')->first();
        $this->assertSame('admin_adjust', $tx->type);
        $this->assertSame('admin', $tx->payment_provider);
        $this->assertSame('goodwill: refund stuck', $tx->metadata['reason']);
        $this->assertSame('support-len', $tx->metadata['agent']);
    }

    public function test_adjust_credits_user_negative_clawback(): void
    {
        $user = $this->makeUser();
        $wallets = app(WalletService::class);
        $wallet = $wallets->getOrCreateWallet($user);
        $wallets->credit($wallet, 500, idempotencyKey: 'seed-2');

        $res = $this->postJson('/api/internal/credits/admin/adjust', [
            'user_id'         => $user->id,
            'credits'         => -200,
            'reason'          => 'fraud clawback',
            'idempotency_key' => 'clawback-1',
        ], $this->authHeaders());

        $res->assertOk()->assertJsonPath('balance', 300);
    }

    public function test_adjust_returns_402_on_insufficient(): void
    {
        $user = $this->makeUser();

        $res = $this->postJson('/api/internal/credits/admin/adjust', [
            'user_id' => $user->id,
            'credits' => -500,
            'reason'  => 'attempt clawback empty wallet',
        ], $this->authHeaders());

        $res->assertStatus(402)->assertJsonPath('error', 'insufficient_credits');
    }

    public function test_adjust_is_idempotent_on_idempotency_key(): void
    {
        $user = $this->makeUser();

        $this->postJson('/api/internal/credits/admin/adjust', [
            'user_id'         => $user->id,
            'credits'         => 100,
            'reason'          => 'dup test',
            'idempotency_key' => 'dup-key',
        ], $this->authHeaders())->assertOk();

        $this->postJson('/api/internal/credits/admin/adjust', [
            'user_id'         => $user->id,
            'credits'         => 100,
            'reason'          => 'dup test',
            'idempotency_key' => 'dup-key',
        ], $this->authHeaders())->assertOk();

        $this->assertSame(100, $user->wallet->fresh()->balance_credits);
    }

    public function test_reverse_creates_compensating_transaction(): void
    {
        $user = $this->makeUser();
        $wallets = app(WalletService::class);
        $wallet = $wallets->getOrCreateWallet($user);
        $tx = $wallets->credit($wallet, 500, idempotencyKey: 'rev-target');

        $res = $this->postJson('/api/internal/credits/admin/reverse', [
            'transaction_id' => $tx->id,
            'reason'         => 'support reversed by request',
        ], $this->authHeaders());

        $res->assertOk()
            ->assertJsonPath('credits_delta', -500);
        $this->assertSame(0, $user->wallet->fresh()->balance_credits);
    }
}

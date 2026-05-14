<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\WalletService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CreditsHealthTest extends TestCase
{
    use RefreshDatabase;

    public function test_endpoint_is_disabled_without_token(): void
    {
        config(['credits.monitoring_token' => '']);

        $this->getJson('/api/internal/credits/health')->assertStatus(503);
    }

    public function test_endpoint_rejects_wrong_bearer_token(): void
    {
        config(['credits.monitoring_token' => 'secret-grafana']);

        $this->getJson('/api/internal/credits/health', ['Authorization' => 'Bearer nope'])
            ->assertStatus(401);
    }

    public function test_endpoint_returns_aggregated_snapshot(): void
    {
        config(['credits.monitoring_token' => 'secret-grafana']);

        $user = User::create([
            'email'    => 'h-' . uniqid() . '@test.local',
            'username' => 'h_' . uniqid(),
            'password' => bcrypt('secret'),
            'role'     => 'user',
        ]);

        $wallets = app(WalletService::class);
        $wallet = $wallets->getOrCreateWallet($user);
        $wallets->credit($wallet, 500, idempotencyKey: 'health-topup', meta: [
            'payment_provider'      => 'paypal',
            'currency_amount_cents' => 499,
            'currency_code'         => 'EUR',
        ]);

        $res = $this->getJson('/api/internal/credits/health', [
            'Authorization' => 'Bearer secret-grafana',
        ]);

        $res->assertOk()
            ->assertJsonPath('wallets.total_count', 1)
            ->assertJsonPath('wallets.total_balance_credits', 500)
            ->assertJsonPath('windows.15m.topups_by_provider.paypal.cents_sum', 499)
            ->assertJsonPath('windows.15m.topups_by_provider.paypal.credits_sum', 500);
    }
}

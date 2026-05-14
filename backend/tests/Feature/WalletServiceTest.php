<?php

namespace Tests\Feature;

use App\Exceptions\InsufficientCreditsException;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Services\WalletService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use InvalidArgumentException;
use Tests\TestCase;

class WalletServiceTest extends TestCase
{
    use RefreshDatabase;

    private WalletService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new WalletService();
    }

    private function makeUser(): User
    {
        return User::create([
            'email'    => 'wallet-' . uniqid() . '@test.local',
            'username' => 'wallet_' . uniqid(),
            'password' => bcrypt('secret'),
            'role'     => 'influencer',
        ]);
    }

    public function test_get_or_create_wallet_is_idempotent(): void
    {
        $user = $this->makeUser();

        $a = $this->service->getOrCreateWallet($user);
        $b = $this->service->getOrCreateWallet($user);

        $this->assertSame($a->id, $b->id);
        $this->assertSame(0, $a->balance_credits);
        $this->assertSame(1, Wallet::where('user_id', $user->id)->count());
    }

    public function test_credit_increases_balance_and_writes_transaction(): void
    {
        $user = $this->makeUser();
        $wallet = $this->service->getOrCreateWallet($user);

        $tx = $this->service->credit($wallet, 500, idempotencyKey: 'topup-1', meta: [
            'payment_provider'      => 'paypal',
            'provider_ref'          => 'PAYPAL-CAPTURE-1',
            'currency_amount_cents' => 499,
            'currency_code'         => 'EUR',
        ]);

        $this->assertSame(500, $wallet->fresh()->balance_credits);
        $this->assertSame(500, $tx->credits_delta);
        $this->assertSame(WalletTransaction::TYPE_TOPUP, $tx->type);
        $this->assertSame(WalletTransaction::STATUS_COMPLETED, $tx->status);
        $this->assertSame('PAYPAL-CAPTURE-1', $tx->provider_ref);
    }

    public function test_credit_is_idempotent_on_idempotency_key(): void
    {
        $user = $this->makeUser();
        $wallet = $this->service->getOrCreateWallet($user);

        $tx1 = $this->service->credit($wallet, 500, idempotencyKey: 'dup-key');
        $tx2 = $this->service->credit($wallet, 500, idempotencyKey: 'dup-key');

        $this->assertSame($tx1->id, $tx2->id);
        $this->assertSame(500, $wallet->fresh()->balance_credits, 'second call must not double-credit');
    }

    public function test_debit_decreases_balance(): void
    {
        $user = $this->makeUser();
        $wallet = $this->service->getOrCreateWallet($user);
        $this->service->credit($wallet, 1_000, idempotencyKey: 'fund');

        $tx = $this->service->debit($wallet, 300, idempotencyKey: 'boost-1', meta: [
            'metadata' => ['boost_id' => 'abc'],
        ]);

        $this->assertSame(700, $wallet->fresh()->balance_credits);
        $this->assertSame(-300, $tx->credits_delta);
        $this->assertSame(WalletTransaction::TYPE_BOOST_SPEND, $tx->type);
        $this->assertSame(['boost_id' => 'abc'], $tx->metadata);
    }

    public function test_debit_throws_when_balance_insufficient(): void
    {
        $user = $this->makeUser();
        $wallet = $this->service->getOrCreateWallet($user);
        $this->service->credit($wallet, 100, idempotencyKey: 'small-fund');

        $this->expectException(InsufficientCreditsException::class);
        $this->service->debit($wallet, 500, idempotencyKey: 'too-much');
    }

    public function test_debit_failure_does_not_mutate_balance(): void
    {
        $user = $this->makeUser();
        $wallet = $this->service->getOrCreateWallet($user);
        $this->service->credit($wallet, 100, idempotencyKey: 'fund-2');

        try {
            $this->service->debit($wallet, 500, idempotencyKey: 'fail-key');
            $this->fail('expected exception');
        } catch (InsufficientCreditsException) {
            // expected
        }

        $this->assertSame(100, $wallet->fresh()->balance_credits);
        $this->assertNull(WalletTransaction::where('idempotency_key', 'fail-key')->first());
    }

    public function test_credit_rejects_non_positive_amount(): void
    {
        $user = $this->makeUser();
        $wallet = $this->service->getOrCreateWallet($user);

        $this->expectException(InvalidArgumentException::class);
        $this->service->credit($wallet, 0);
    }

    public function test_debit_rejects_non_positive_amount(): void
    {
        $user = $this->makeUser();
        $wallet = $this->service->getOrCreateWallet($user);

        $this->expectException(InvalidArgumentException::class);
        $this->service->debit($wallet, -10);
    }

    public function test_reverse_creates_compensating_transaction(): void
    {
        $user = $this->makeUser();
        $wallet = $this->service->getOrCreateWallet($user);

        $topup = $this->service->credit($wallet, 500, idempotencyKey: 'topup-rev');
        $this->assertSame(500, $wallet->fresh()->balance_credits);

        $reversal = $this->service->reverse($topup, ['reason' => 'chargeback']);

        $this->assertSame(0, $wallet->fresh()->balance_credits);
        $this->assertSame(-500, $reversal->credits_delta);
        $this->assertSame($topup->id, $reversal->reverses_transaction_id);
        $this->assertSame(WalletTransaction::STATUS_REVERSED, $topup->fresh()->status);
    }

    public function test_reverse_is_idempotent(): void
    {
        $user = $this->makeUser();
        $wallet = $this->service->getOrCreateWallet($user);
        $topup = $this->service->credit($wallet, 500, idempotencyKey: 'rev-idem');

        $a = $this->service->reverse($topup);
        $b = $this->service->reverse($topup);

        $this->assertSame($a->id, $b->id);
        $this->assertSame(0, $wallet->fresh()->balance_credits);
    }

    public function test_reverse_with_clawback_shortfall_clamps_to_zero(): void
    {
        $user = $this->makeUser();
        $wallet = $this->service->getOrCreateWallet($user);

        $topup = $this->service->credit($wallet, 500, idempotencyKey: 'topup-cb');
        $this->service->debit($wallet, 300, idempotencyKey: 'spend-cb');
        $this->assertSame(200, $wallet->fresh()->balance_credits);

        $reversal = $this->service->reverse($topup);

        $this->assertSame(0, $wallet->fresh()->balance_credits);
        $this->assertSame(300, $reversal->metadata['clawback_shortfall'] ?? null);
    }
}

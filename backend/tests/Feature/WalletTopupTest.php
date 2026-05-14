<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Services\PayPalService;
use App\Services\WalletService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Mockery\MockInterface;
use Tests\TestCase;

class WalletTopupTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'credits.enabled'  => true,
            'credits.packages' => [
                [
                    'id'            => 'pkg_test',
                    'credits'       => 500,
                    'price_cents'   => 499,
                    'currency'      => 'EUR',
                    'apple_product' => 'com.vouchmi.credits.500',
                    'label_key'     => 'wallet.packages.test',
                ],
            ],
        ]);
    }

    private function makeUser(): User
    {
        return User::create([
            'email'    => 'topup-' . uniqid() . '@test.local',
            'username' => 'topup_' . uniqid(),
            'password' => bcrypt('secret'),
            'role'     => 'influencer',
        ]);
    }

    private function mockPaypal(callable $configure): void
    {
        $this->mock(PayPalService::class, $configure);
    }

    public function test_packages_endpoint_lists_configured_packages(): void
    {
        $res = $this->getJson('/api/v1/wallet/packages');

        $res->assertOk()
            ->assertJsonPath('packages.0.id', 'pkg_test')
            ->assertJsonPath('packages.0.credits', 500);
    }

    public function test_show_endpoint_creates_empty_wallet_on_first_call(): void
    {
        $user = $this->makeUser();

        $res = $this->actingAs($user)->getJson('/api/v1/wallet');

        $res->assertOk()
            ->assertJsonPath('wallet.balance_credits', 0)
            ->assertJsonPath('transactions', []);
    }

    public function test_create_order_returns_paypal_approval_url(): void
    {
        $user = $this->makeUser();

        $this->mockPaypal(function (MockInterface $m) use ($user) {
            $m->shouldReceive('createTopupOrder')
                ->once()
                ->andReturnUsing(function (array $context) use ($user) {
                    $this->assertSame(499, $context['amount_cents']);
                    $this->assertSame('EUR', $context['currency']);
                    $this->assertStringStartsWith('wallet-' . $user->id, $context['reference_id']);
                    return [
                        'order_id'     => 'ORDER-123',
                        'approval_url' => 'https://paypal.test/approve/ORDER-123',
                        'status'       => 'CREATED',
                        'configured'   => true,
                    ];
                });
        });

        $res = $this->actingAs($user)->postJson('/api/v1/wallet/topup/paypal/create-order', [
            'package_id'      => 'pkg_test',
            'waiver_accepted' => true,
        ]);

        $res->assertOk()
            ->assertJsonPath('order_id', 'ORDER-123')
            ->assertJsonPath('approval_url', 'https://paypal.test/approve/ORDER-123');
    }

    public function test_create_order_rejects_unknown_package(): void
    {
        $user = $this->makeUser();

        $this->mockPaypal(fn (MockInterface $m) => $m->shouldNotReceive('createTopupOrder'));

        $res = $this->actingAs($user)->postJson('/api/v1/wallet/topup/paypal/create-order', [
            'package_id'      => 'does-not-exist',
            'waiver_accepted' => true,
        ]);

        $res->assertStatus(422)->assertJsonPath('error', 'unknown_package');
    }

    public function test_create_order_rejects_without_waiver(): void
    {
        $user = $this->makeUser();

        $this->mockPaypal(fn (MockInterface $m) => $m->shouldNotReceive('createTopupOrder'));

        $res = $this->actingAs($user)->postJson('/api/v1/wallet/topup/paypal/create-order', [
            'package_id' => 'pkg_test',
        ]);

        $res->assertStatus(422)->assertJsonPath('error', 'waiver_required');
    }

    public function test_create_order_rejected_when_new_user_cap_exceeded(): void
    {
        config([
            'credits.new_user_topup_cap_cents' => 1000, // 10 €
            'credits.new_user_window_days'     => 30,
        ]);

        $user = $this->makeUser();
        // Seed an existing topup that already used most of the cap.
        $wallets = app(\App\Services\WalletService::class);
        $wallet = $wallets->getOrCreateWallet($user);
        $wallets->credit($wallet, 700, idempotencyKey: 'seed-cap', meta: [
            'payment_provider'      => 'paypal',
            'currency_amount_cents' => 600, // 6 € already spent
            'currency_code'         => 'EUR',
        ]);

        $this->mockPaypal(fn (MockInterface $m) => $m->shouldNotReceive('createTopupOrder'));

        // New attempt would push spend to 11 € → blocked.
        $res = $this->actingAs($user)->postJson('/api/v1/wallet/topup/paypal/create-order', [
            'package_id'      => 'pkg_test',
            'waiver_accepted' => true,
        ]);

        $res->assertStatus(422)
            ->assertJsonPath('error', \App\Services\TopupGuard::REJECT_NEW_USER_CAP)
            ->assertJsonPath('remaining_cap_cents', 400);
    }

    public function test_capture_credits_wallet_idempotently(): void
    {
        $user = $this->makeUser();

        $captureResponse = [
            'id'     => 'ORDER-9',
            'status' => 'COMPLETED',
            'purchase_units' => [[
                'reference_id' => 'wallet-' . $user->id . '-abc',
                'custom_id'    => $user->id . '|pkg_test',
                'payments' => [
                    'captures' => [[
                        'id'     => 'CAPTURE-XYZ',
                        'status' => 'COMPLETED',
                        'amount' => ['value' => '4.99', 'currency_code' => 'EUR'],
                    ]],
                ],
            ]],
        ];

        $this->mockPaypal(function (MockInterface $m) use ($captureResponse) {
            $m->shouldReceive('captureOrder')
                ->twice()
                ->with('ORDER-9')
                ->andReturn($captureResponse);
        });

        // First call: credits wallet
        $res1 = $this->actingAs($user)->postJson('/api/v1/wallet/topup/paypal/capture', [
            'order_id'   => 'ORDER-9',
            'package_id' => 'pkg_test',
        ]);
        $res1->assertOk()->assertJsonPath('balance', 500);

        // Second call: idempotent — balance must not double
        $res2 = $this->actingAs($user)->postJson('/api/v1/wallet/topup/paypal/capture', [
            'order_id'   => 'ORDER-9',
            'package_id' => 'pkg_test',
        ]);
        $res2->assertOk()->assertJsonPath('balance', 500);

        $this->assertSame(1, WalletTransaction::where('provider_ref', 'CAPTURE-XYZ')->count());
    }

    public function test_capture_rejects_ownership_mismatch(): void
    {
        $user = $this->makeUser();
        $other = $this->makeUser();

        $captureResponse = [
            'id'     => 'ORDER-bad',
            'status' => 'COMPLETED',
            'purchase_units' => [[
                'custom_id' => $other->id . '|pkg_test',  // Belongs to someone else!
                'payments' => [
                    'captures' => [[
                        'id'     => 'CAPTURE-NOPE',
                        'status' => 'COMPLETED',
                        'amount' => ['value' => '4.99', 'currency_code' => 'EUR'],
                    ]],
                ],
            ]],
        ];

        $this->mockPaypal(fn (MockInterface $m) => $m->shouldReceive('captureOrder')->andReturn($captureResponse));

        $res = $this->actingAs($user)->postJson('/api/v1/wallet/topup/paypal/capture', [
            'order_id'   => 'ORDER-bad',
            'package_id' => 'pkg_test',
        ]);

        $res->assertStatus(403)->assertJsonPath('error', 'ownership_mismatch');
        $this->assertSame(0, $user->wallet?->balance_credits ?? 0);
    }

    public function test_capture_rejects_amount_mismatch(): void
    {
        $user = $this->makeUser();

        $captureResponse = [
            'id'     => 'ORDER-amt',
            'status' => 'COMPLETED',
            'purchase_units' => [[
                'custom_id' => $user->id . '|pkg_test',
                'payments' => [
                    'captures' => [[
                        'id'     => 'CAPTURE-AMT',
                        'status' => 'COMPLETED',
                        // 1.00 € instead of expected 4.99 — possible client tamper.
                        'amount' => ['value' => '1.00', 'currency_code' => 'EUR'],
                    ]],
                ],
            ]],
        ];

        $this->mockPaypal(fn (MockInterface $m) => $m->shouldReceive('captureOrder')->andReturn($captureResponse));

        $res = $this->actingAs($user)->postJson('/api/v1/wallet/topup/paypal/capture', [
            'order_id'   => 'ORDER-amt',
            'package_id' => 'pkg_test',
        ]);

        $res->assertStatus(422)->assertJsonPath('error', 'amount_mismatch');
    }

    public function test_webhook_reverses_credit_on_capture_reversed(): void
    {
        $user = $this->makeUser();
        $wallets = app(WalletService::class);
        $wallet = $wallets->getOrCreateWallet($user);

        $tx = $wallets->credit($wallet, 500, idempotencyKey: 'paypal-capture:CAPTURE-REV', meta: [
            'payment_provider' => 'paypal',
            'provider_ref'     => 'CAPTURE-REV',
        ]);
        $this->assertSame(500, $wallet->fresh()->balance_credits);

        // Webhooks aren't signature-checked when neither WEBHOOK_ID is set (test env).
        $this->mockPaypal(function (MockInterface $m) {
            $m->shouldReceive('hasWebhookId')->andReturn(false);
            $m->shouldReceive('walletWebhookId')->andReturn(null);
        });

        $res = $this->postJson('/api/v1/webhooks/paypal/wallet', [
            'event_type' => 'PAYMENT.CAPTURE.REVERSED',
            'resource'   => ['id' => 'CAPTURE-REV'],
        ]);

        $res->assertOk();
        $this->assertSame(0, $wallet->fresh()->balance_credits);
        $this->assertSame(WalletTransaction::STATUS_REVERSED, $tx->fresh()->status);
    }
}

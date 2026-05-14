<?php

namespace Tests\Feature\Iap;

use App\Models\User;
use App\Models\WalletTransaction;
use App\Services\AppStore\AppStoreServerApiClient;
use App\Services\AppStore\JwsVerifier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Mockery\MockInterface;
use Tests\TestCase;

class AppleConsumableTopupTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'services.apple_iap.bundle_id'   => 'com.vouchmi.app',
            'services.apple_iap.environment' => 'sandbox',
            'services.apple_iap.consumable_products' => [
                'com.vouchmi.credits.500' => 'pkg_500',
            ],
            'credits.packages' => [
                [
                    'id'          => 'pkg_500',
                    'credits'     => 500,
                    'price_cents' => 499,
                    'currency'    => 'EUR',
                ],
            ],
        ]);
    }

    private function makeUser(): User
    {
        return User::create([
            'email'    => 'iap-cons-' . uniqid() . '@test.local',
            'username' => 'iapcons_' . uniqid(),
            'password' => bcrypt('secret'),
            'role'     => 'user',
        ]);
    }

    private function mockApi(callable $configure): void
    {
        $this->mock(AppStoreServerApiClient::class, $configure);
    }

    private function mockVerifier(callable $configure): void
    {
        $this->mock(JwsVerifier::class, $configure);
    }

    private function happyPathMocks(string $appleTxId = 'CONS_TX_AAA'): void
    {
        $this->mockApi(function (MockInterface $mock) use ($appleTxId) {
            $mock->shouldReceive('getTransactionInfo')
                ->with($appleTxId)
                ->andReturn([
                    'signedTransactionInfo' => 'header.signed.sig',
                    'environment'           => 'Sandbox',
                ]);
        });
        $this->mockVerifier(function (MockInterface $mock) use ($appleTxId) {
            $mock->shouldReceive('verifyAndDecode')
                ->with('header.signed.sig')
                ->andReturn([
                    'transactionId'         => $appleTxId,
                    'originalTransactionId' => $appleTxId,
                    'productId'             => 'com.vouchmi.credits.500',
                    'bundleId'              => 'com.vouchmi.app',
                    'environment'           => 'Sandbox',
                    'purchaseDate'          => now()->getTimestampMs(),
                    'inAppOwnershipType'    => 'PURCHASED',
                ]);
        });
    }

    public function test_validate_credits_wallet_for_consumable_product(): void
    {
        $user = $this->makeUser();
        $this->happyPathMocks();

        $res = $this->actingAs($user)->postJson('/api/v1/wallet/topup/apple/validate', [
            'transaction_id' => 'CONS_TX_AAA',
        ]);

        $res->assertOk()
            ->assertJsonPath('credits', 500)
            ->assertJsonPath('balance', 500);

        $this->assertDatabaseHas('wallet_transactions', [
            'payment_provider' => 'apple_iap',
            'provider_ref'     => 'CONS_TX_AAA',
            'credits_delta'    => 500,
        ]);

        $this->assertDatabaseHas('app_store_transactions', [
            'user_id'        => $user->id,
            'transaction_id' => 'CONS_TX_AAA',
            'product_id'     => 'com.vouchmi.credits.500',
        ]);
    }

    public function test_validate_is_idempotent_for_same_transaction(): void
    {
        $user = $this->makeUser();

        $this->mockApi(function (MockInterface $mock) {
            $mock->shouldReceive('getTransactionInfo')
                ->twice()
                ->with('CONS_DUP')
                ->andReturn([
                    'signedTransactionInfo' => 'h.s.s',
                    'environment'           => 'Sandbox',
                ]);
        });
        $this->mockVerifier(function (MockInterface $mock) {
            $mock->shouldReceive('verifyAndDecode')
                ->twice()
                ->andReturn([
                    'transactionId'         => 'CONS_DUP',
                    'originalTransactionId' => 'CONS_DUP',
                    'productId'             => 'com.vouchmi.credits.500',
                    'bundleId'              => 'com.vouchmi.app',
                    'environment'           => 'Sandbox',
                ]);
        });

        $this->actingAs($user)->postJson('/api/v1/wallet/topup/apple/validate', [
            'transaction_id' => 'CONS_DUP',
        ])->assertOk();

        $this->actingAs($user)->postJson('/api/v1/wallet/topup/apple/validate', [
            'transaction_id' => 'CONS_DUP',
        ])->assertOk();

        $this->assertSame(500, $user->wallet->fresh()->balance_credits);
        $this->assertSame(1, WalletTransaction::where('provider_ref', 'CONS_DUP')->count());
    }

    public function test_validate_rejects_unknown_product_id(): void
    {
        $user = $this->makeUser();

        $this->mockApi(function (MockInterface $mock) {
            $mock->shouldReceive('getTransactionInfo')->andReturn([
                'signedTransactionInfo' => 'h.s.s',
                'environment'           => 'Sandbox',
            ]);
        });
        $this->mockVerifier(function (MockInterface $mock) {
            $mock->shouldReceive('verifyAndDecode')->andReturn([
                'transactionId'         => 'CONS_BAD',
                'originalTransactionId' => 'CONS_BAD',
                'productId'             => 'com.vouchmi.credits.UNKNOWN',
                'bundleId'              => 'com.vouchmi.app',
                'environment'           => 'Sandbox',
            ]);
        });

        $this->actingAs($user)->postJson('/api/v1/wallet/topup/apple/validate', [
            'transaction_id' => 'CONS_BAD',
        ])->assertStatus(422);
    }

    public function test_validate_rejects_transaction_owned_by_another_user(): void
    {
        $first = $this->makeUser();
        $second = $this->makeUser();

        // First user claims the transaction.
        $this->mockApi(function (MockInterface $mock) {
            $mock->shouldReceive('getTransactionInfo')->andReturn([
                'signedTransactionInfo' => 'h.s.s',
                'environment'           => 'Sandbox',
            ]);
        });
        $this->mockVerifier(function (MockInterface $mock) {
            $mock->shouldReceive('verifyAndDecode')->andReturn([
                'transactionId'         => 'CONS_SHARE',
                'originalTransactionId' => 'CONS_SHARE',
                'productId'             => 'com.vouchmi.credits.500',
                'bundleId'              => 'com.vouchmi.app',
                'environment'           => 'Sandbox',
            ]);
        });

        $this->actingAs($first)->postJson('/api/v1/wallet/topup/apple/validate', [
            'transaction_id' => 'CONS_SHARE',
        ])->assertOk();

        // Second user replays the same transaction → rejected.
        $this->actingAs($second)->postJson('/api/v1/wallet/topup/apple/validate', [
            'transaction_id' => 'CONS_SHARE',
        ])->assertStatus(403);
    }

    public function test_refund_notification_reverses_wallet_credit(): void
    {
        // Drive sync queue so the notification job runs inline.
        config(['queue.default' => 'sync']);

        $user = $this->makeUser();

        // Stage 1: validate & credit.
        $this->happyPathMocks('CONS_REFUND');
        $this->actingAs($user)->postJson('/api/v1/wallet/topup/apple/validate', [
            'transaction_id' => 'CONS_REFUND',
        ])->assertOk();
        $this->assertSame(500, $user->wallet->fresh()->balance_credits);

        // Stage 2: S2S REFUND for the same Apple transaction.
        // Reset the JwsVerifier mock so it returns the notification & nested tx.
        $this->app->forgetInstance(JwsVerifier::class);
        $uuid = (string) Str::uuid();
        $signedPayload = 'header.' . base64_encode($uuid) . '.sig';

        $this->mock(JwsVerifier::class, function (MockInterface $mock) use ($signedPayload, $uuid) {
            $mock->shouldReceive('verifyAndDecode')
                ->with($signedPayload)
                ->andReturn([
                    'notificationType' => 'REFUND',
                    'notificationUUID' => $uuid,
                    'subtype'          => null,
                    'data' => [
                        'environment'           => 'Sandbox',
                        'signedTransactionInfo' => 'REFUND_TX_JWS',
                    ],
                ]);
            $mock->shouldReceive('verifyAndDecode')
                ->with('REFUND_TX_JWS')
                ->andReturn([
                    'transactionId'         => 'CONS_REFUND',
                    'originalTransactionId' => 'CONS_REFUND',
                    'environment'           => 'Sandbox',
                ]);
        });

        $this->postJson('/api/v1/iap/notifications', ['signedPayload' => $signedPayload])
            ->assertOk()
            ->assertJson(['ok' => true]);

        $this->assertSame(0, $user->wallet->fresh()->balance_credits);
        $this->assertSame(
            WalletTransaction::STATUS_REVERSED,
            WalletTransaction::where('provider_ref', 'CONS_REFUND')->first()->status,
        );
    }
}

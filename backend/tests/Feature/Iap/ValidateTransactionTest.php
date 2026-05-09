<?php

namespace Tests\Feature\Iap;

use App\Models\Subscription;
use App\Models\User;
use App\Services\AppStore\AppStoreServerApiClient;
use App\Services\AppStore\JwsVerifier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ValidateTransactionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'services.apple_iap.bundle_id'                  => 'com.vouchmi.app',
            'services.apple_iap.environment'                => 'sandbox',
            'services.apple_iap.products.brand_monthly'     => 'com.vouchmi.app.brand.monthly',
            'services.apple_iap.products.influencer_monthly' => 'com.vouchmi.app.influencer.monthly',
        ]);
    }

    private function makeUser(string $role = 'user'): User
    {
        return User::create([
            'email'    => 'iap-' . uniqid() . '@test.local',
            'username' => 'iapuser_' . uniqid(),
            'password' => bcrypt('secret'),
            'role'     => $role,
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

    public function test_validate_creates_active_subscription_for_brand(): void
    {
        $user = $this->makeUser('brand');

        $this->mockApi(function ($mock) {
            $mock->shouldReceive('getTransactionInfo')
                ->with('TXN_AAA')
                ->andReturn([
                    'signedTransactionInfo' => 'header.signedTx.sig',
                    'environment'           => 'Sandbox',
                ]);
            $mock->shouldReceive('getAllSubscriptionStatuses')
                ->andReturn(['data' => []]);
        });

        $this->mockVerifier(function ($mock) {
            $mock->shouldReceive('verifyAndDecode')
                ->with('header.signedTx.sig')
                ->andReturn([
                    'transactionId'         => 'TXN_AAA',
                    'originalTransactionId' => 'ORIG_AAA',
                    'productId'             => 'com.vouchmi.app.brand.monthly',
                    'bundleId'              => 'com.vouchmi.app',
                    'environment'           => 'Sandbox',
                    'purchaseDate'          => now()->getTimestampMs(),
                    'expiresDate'           => now()->addMonth()->getTimestampMs(),
                ]);
        });

        $response = $this->actingAs($user)->postJson('/api/v1/iap/validate', [
            'transaction_id' => 'TXN_AAA',
        ]);

        $response->assertOk()
            ->assertJsonPath('subscription.provider', 'apple_iap')
            ->assertJsonPath('subscription.status', 'active')
            ->assertJsonPath('subscription.product_id', 'com.vouchmi.app.brand.monthly');

        $this->assertDatabaseHas('subscriptions', [
            'user_id'                       => $user->id,
            'plan_type'                     => 'brand',
            'payment_provider'              => 'apple_iap',
            'apple_original_transaction_id' => 'ORIG_AAA',
            'environment'                   => 'Sandbox',
            'status'                        => 'active',
        ]);

        $this->assertDatabaseHas('app_store_transactions', [
            'user_id'        => $user->id,
            'transaction_id' => 'TXN_AAA',
            'environment'    => 'Sandbox',
        ]);
    }

    public function test_validate_promotes_user_to_influencer_on_first_purchase(): void
    {
        $user = $this->makeUser('user');

        $this->mockApi(function ($mock) {
            $mock->shouldReceive('getTransactionInfo')->andReturn([
                'signedTransactionInfo' => 'tx.jws',
                'environment'           => 'Sandbox',
            ]);
            $mock->shouldReceive('getAllSubscriptionStatuses')->andReturn(['data' => []]);
        });
        $this->mockVerifier(function ($mock) {
            $mock->shouldReceive('verifyAndDecode')->andReturn([
                'transactionId'         => 'TXN_INF',
                'originalTransactionId' => 'ORIG_INF',
                'productId'             => 'com.vouchmi.app.influencer.monthly',
                'bundleId'              => 'com.vouchmi.app',
                'environment'           => 'Sandbox',
                'purchaseDate'          => now()->getTimestampMs(),
                'expiresDate'           => now()->addMonth()->getTimestampMs(),
            ]);
        });

        $this->actingAs($user)->postJson('/api/v1/iap/validate', [
            'transaction_id' => 'TXN_INF',
        ])->assertOk();

        $this->assertEquals('influencer', $user->fresh()->role);
    }

    public function test_validate_rejects_transaction_owned_by_other_user(): void
    {
        $owner = $this->makeUser('brand');
        Subscription::factory()->create([
            'user_id'                       => $owner->id,
            'payment_provider'              => 'apple_iap',
            'apple_original_transaction_id' => 'ORIG_SHARED',
            'plan_type'                     => 'brand',
        ]);

        $attacker = $this->makeUser('brand');

        $this->mockApi(function ($mock) {
            $mock->shouldReceive('getTransactionInfo')->andReturn([
                'signedTransactionInfo' => 'tx.jws',
                'environment'           => 'Sandbox',
            ]);
            $mock->shouldReceive('getAllSubscriptionStatuses')->andReturn(['data' => []]);
        });
        $this->mockVerifier(function ($mock) {
            $mock->shouldReceive('verifyAndDecode')->andReturn([
                'transactionId'         => 'TXN_HACK',
                'originalTransactionId' => 'ORIG_SHARED',
                'productId'             => 'com.vouchmi.app.brand.monthly',
                'bundleId'              => 'com.vouchmi.app',
                'environment'           => 'Sandbox',
                'purchaseDate'          => now()->getTimestampMs(),
                'expiresDate'           => now()->addMonth()->getTimestampMs(),
            ]);
        });

        $this->actingAs($attacker)->postJson('/api/v1/iap/validate', [
            'transaction_id' => 'TXN_HACK',
        ])->assertStatus(403)
          ->assertJson(['message' => 'Diese Transaktion gehört zu einem anderen Konto.']);

        $this->assertEquals(1, Subscription::where('apple_original_transaction_id', 'ORIG_SHARED')->count());
    }

    public function test_validate_rejects_expired_transaction(): void
    {
        $user = $this->makeUser('brand');

        $this->mockApi(function ($mock) {
            $mock->shouldReceive('getTransactionInfo')->andReturn([
                'signedTransactionInfo' => 'tx.jws',
                'environment'           => 'Sandbox',
            ]);
            $mock->shouldReceive('getAllSubscriptionStatuses')->andReturn(['data' => []]);
        });
        $this->mockVerifier(function ($mock) {
            $mock->shouldReceive('verifyAndDecode')->andReturn([
                'transactionId'         => 'TXN_OLD',
                'originalTransactionId' => 'ORIG_OLD',
                'productId'             => 'com.vouchmi.app.brand.monthly',
                'bundleId'              => 'com.vouchmi.app',
                'environment'           => 'Sandbox',
                'purchaseDate'          => now()->subYear()->getTimestampMs(),
                'expiresDate'           => now()->subDay()->getTimestampMs(),
            ]);
        });

        $this->actingAs($user)->postJson('/api/v1/iap/validate', [
            'transaction_id' => 'TXN_OLD',
        ])->assertStatus(422);
    }

    public function test_validate_rejects_wrong_bundle_id(): void
    {
        $user = $this->makeUser('brand');

        $this->mockApi(function ($mock) {
            $mock->shouldReceive('getTransactionInfo')->andReturn([
                'signedTransactionInfo' => 'tx.jws',
                'environment'           => 'Sandbox',
            ]);
            $mock->shouldReceive('getAllSubscriptionStatuses')->andReturn(['data' => []]);
        });
        $this->mockVerifier(function ($mock) {
            $mock->shouldReceive('verifyAndDecode')->andReturn([
                'transactionId'         => 'TXN_X',
                'originalTransactionId' => 'ORIG_X',
                'productId'             => 'com.vouchmi.app.brand.monthly',
                'bundleId'              => 'com.attacker.app',
                'environment'           => 'Sandbox',
                'purchaseDate'          => now()->getTimestampMs(),
                'expiresDate'           => now()->addMonth()->getTimestampMs(),
            ]);
        });

        $this->actingAs($user)->postJson('/api/v1/iap/validate', [
            'transaction_id' => 'TXN_X',
        ])->assertStatus(422);
    }

    public function test_validate_rejects_unknown_product(): void
    {
        $user = $this->makeUser('user');

        $this->mockApi(function ($mock) {
            $mock->shouldReceive('getTransactionInfo')->andReturn([
                'signedTransactionInfo' => 'tx.jws',
                'environment'           => 'Sandbox',
            ]);
            $mock->shouldReceive('getAllSubscriptionStatuses')->andReturn(['data' => []]);
        });
        $this->mockVerifier(function ($mock) {
            $mock->shouldReceive('verifyAndDecode')->andReturn([
                'transactionId'         => 'TXN_U',
                'originalTransactionId' => 'ORIG_U',
                'productId'             => 'com.vouchmi.app.unknown',
                'bundleId'              => 'com.vouchmi.app',
                'environment'           => 'Sandbox',
                'purchaseDate'          => now()->getTimestampMs(),
                'expiresDate'           => now()->addMonth()->getTimestampMs(),
            ]);
        });

        $this->actingAs($user)->postJson('/api/v1/iap/validate', [
            'transaction_id' => 'TXN_U',
        ])->assertStatus(422);
    }

    public function test_validate_requires_authentication(): void
    {
        $this->postJson('/api/v1/iap/validate', ['transaction_id' => 'TXN'])
            ->assertStatus(401);
    }
}

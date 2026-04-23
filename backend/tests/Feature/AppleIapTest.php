<?php

namespace Tests\Feature;

use App\Models\Subscription;
use App\Models\User;
use App\Services\AppStoreServerApiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AppleIapTest extends TestCase
{
    use RefreshDatabase;

    private function createUser(string $role = 'user'): User
    {
        return User::factory()->create(['role' => $role]);
    }

    /**
     * verifyReceipt erstellt eine IAP-Subscription bei erfolgreicher Validierung.
     */
    public function test_verify_receipt_creates_subscription(): void
    {
        $user = $this->createUser('influencer');

        // Mock: Apple Server API gibt gueltige Transaction zurueck
        $this->mock(AppStoreServerApiService::class, function ($mock) {
            $mock->shouldReceive('fetchTransactionInfo')
                ->once()
                ->andReturn([
                    'transactionId'         => 'TXN_001',
                    'originalTransactionId' => 'ORIG_001',
                    'productId'             => 'com.vouchmi.app.influencer.monthly',
                    'bundleId'              => 'com.vouchmi.app',
                    'expiresDate'           => now()->addMonth()->getTimestampMs(),
                ]);
        });

        $response = $this->actingAs($user)->postJson('/api/v1/iap/verify-receipt', [
            'transaction_id'          => 'TXN_001',
            'original_transaction_id' => 'ORIG_001',
            'product_id'              => 'com.vouchmi.app.influencer.monthly',
        ]);

        $response->assertOk()
            ->assertJson(['verified' => true]);

        $this->assertDatabaseHas('subscriptions', [
            'user_id'                       => $user->id,
            'plan_type'                     => 'influencer',
            'payment_provider'              => 'apple_iap',
            'apple_original_transaction_id' => 'ORIG_001',
            'status'                        => 'active',
        ]);
    }

    /**
     * verifyReceipt lehnt unbekannte Product-IDs ab.
     */
    public function test_verify_receipt_rejects_unknown_product(): void
    {
        $user = $this->createUser('user');

        $response = $this->actingAs($user)->postJson('/api/v1/iap/verify-receipt', [
            'transaction_id'          => 'TXN_002',
            'original_transaction_id' => 'ORIG_002',
            'product_id'              => 'com.vouchmi.app.unknown',
        ]);

        $response->assertStatus(422)
            ->assertJson(['message' => 'Unbekannte Product-ID.']);
    }

    /**
     * serverNotification DID_RENEW aktualisiert die Subscription.
     */
    public function test_server_notification_did_renew(): void
    {
        $user = $this->createUser('influencer');
        $sub = Subscription::factory()->create([
            'user_id'                       => $user->id,
            'plan_type'                     => 'influencer',
            'payment_provider'              => 'apple_iap',
            'apple_original_transaction_id' => 'ORIG_100',
            'apple_transaction_id'          => 'TXN_100',
            'status'                        => 'active',
            'paypal_status'                 => 'ACTIVE',
        ]);

        $newExpiresMs = now()->addMonth()->getTimestampMs();

        // JWS-Payload als Base64 kodieren (Mock — ohne echte Signatur)
        $transactionInfo = base64_encode(json_encode([
            'transactionId'         => 'TXN_101',
            'originalTransactionId' => 'ORIG_100',
            'productId'             => 'com.vouchmi.app.influencer.monthly',
            'expiresDate'           => $newExpiresMs,
        ]));

        $payload = base64_encode(json_encode([
            'notificationType' => 'DID_RENEW',
            'subtype'          => null,
            'data'             => [
                'signedTransactionInfo' => "header.{$transactionInfo}.signature",
                'signedRenewalInfo'     => null,
            ],
        ]));

        // Mock: JWS-Verification gibt decodierten Payload zurueck
        $this->mock(AppStoreServerApiService::class, function ($mock) use ($payload, $transactionInfo) {
            $mock->shouldReceive('verifyAndDecodeJws')
                ->once()
                ->andReturn(json_decode(base64_decode($payload), true));

            $mock->shouldReceive('decodeJws')
                ->andReturnUsing(function ($jws) {
                    $parts = explode('.', $jws);
                    if (count($parts) !== 3) return null;
                    return json_decode(base64_decode($parts[1]), true);
                });
        });

        $response = $this->postJson('/api/v1/iap/server-notification', [
            'signedPayload' => "header.{$payload}.signature",
        ]);

        $response->assertOk()->assertJson(['ok' => true]);

        $sub->refresh();
        $this->assertEquals('active', $sub->status);
        $this->assertEquals('TXN_101', $sub->apple_transaction_id);

        $this->assertDatabaseHas('iap_events', [
            'notification_type'       => 'DID_RENEW',
            'original_transaction_id' => 'ORIG_100',
        ]);
    }

    /**
     * serverNotification EXPIRED setzt Subscription auf expired.
     */
    public function test_server_notification_expired(): void
    {
        $user = $this->createUser('influencer');
        Subscription::factory()->create([
            'user_id'                       => $user->id,
            'plan_type'                     => 'influencer',
            'payment_provider'              => 'apple_iap',
            'apple_original_transaction_id' => 'ORIG_200',
            'status'                        => 'active',
            'paypal_status'                 => 'ACTIVE',
        ]);

        $transactionInfo = base64_encode(json_encode([
            'transactionId'         => 'TXN_200',
            'originalTransactionId' => 'ORIG_200',
            'productId'             => 'com.vouchmi.app.influencer.monthly',
        ]));

        $payload = base64_encode(json_encode([
            'notificationType' => 'EXPIRED',
            'subtype'          => null,
            'data'             => [
                'signedTransactionInfo' => "header.{$transactionInfo}.signature",
            ],
        ]));

        $this->mock(AppStoreServerApiService::class, function ($mock) use ($payload) {
            $mock->shouldReceive('verifyAndDecodeJws')
                ->andReturn(json_decode(base64_decode($payload), true));
            $mock->shouldReceive('decodeJws')
                ->andReturnUsing(function ($jws) {
                    $parts = explode('.', $jws);
                    return count($parts) === 3 ? json_decode(base64_decode($parts[1]), true) : null;
                });
        });

        $this->postJson('/api/v1/iap/server-notification', [
            'signedPayload' => "header.{$payload}.signature",
        ])->assertOk();

        $this->assertDatabaseHas('subscriptions', [
            'apple_original_transaction_id' => 'ORIG_200',
            'status'                        => 'expired',
        ]);
    }

    /**
     * serverNotification REFUND setzt Subscription auf refunded.
     */
    public function test_server_notification_refund(): void
    {
        $user = $this->createUser('brand');
        Subscription::factory()->create([
            'user_id'                       => $user->id,
            'plan_type'                     => 'brand',
            'payment_provider'              => 'apple_iap',
            'apple_original_transaction_id' => 'ORIG_300',
            'status'                        => 'active',
            'paypal_status'                 => 'ACTIVE',
        ]);

        $transactionInfo = base64_encode(json_encode([
            'transactionId'         => 'TXN_300',
            'originalTransactionId' => 'ORIG_300',
            'productId'             => 'com.vouchmi.app.brand.monthly',
        ]));

        $payload = base64_encode(json_encode([
            'notificationType' => 'REFUND',
            'subtype'          => null,
            'data'             => [
                'signedTransactionInfo' => "header.{$transactionInfo}.signature",
            ],
        ]));

        $this->mock(AppStoreServerApiService::class, function ($mock) use ($payload) {
            $mock->shouldReceive('verifyAndDecodeJws')
                ->andReturn(json_decode(base64_decode($payload), true));
            $mock->shouldReceive('decodeJws')
                ->andReturnUsing(function ($jws) {
                    $parts = explode('.', $jws);
                    return count($parts) === 3 ? json_decode(base64_decode($parts[1]), true) : null;
                });
        });

        $this->postJson('/api/v1/iap/server-notification', [
            'signedPayload' => "header.{$payload}.signature",
        ])->assertOk();

        $this->assertDatabaseHas('subscriptions', [
            'apple_original_transaction_id' => 'ORIG_300',
            'status'                        => 'refunded',
        ]);
    }

    /**
     * hasActiveSubscription funktioniert identisch fuer IAP und PayPal.
     */
    public function test_has_active_subscription_works_for_both_providers(): void
    {
        $iapUser = $this->createUser('influencer');
        Subscription::factory()->create([
            'user_id'          => $iapUser->id,
            'plan_type'        => 'influencer',
            'payment_provider' => 'apple_iap',
            'status'           => 'active',
            'paypal_status'    => 'ACTIVE',
        ]);

        $paypalUser = $this->createUser('influencer');
        Subscription::factory()->create([
            'user_id'          => $paypalUser->id,
            'plan_type'        => 'influencer',
            'payment_provider' => 'paypal',
            'status'           => 'active',
            'paypal_status'    => 'ACTIVE',
        ]);

        $noSubUser = $this->createUser('influencer');

        $this->assertTrue($iapUser->hasActiveSubscription('influencer'));
        $this->assertTrue($paypalUser->hasActiveSubscription('influencer'));
        $this->assertFalse($noSubUser->hasActiveSubscription('influencer'));

        // Messaging-Gate sollte fuer beide Provider gleich funktionieren
        $this->assertTrue($iapUser->isCreator());
        $this->assertTrue($paypalUser->isCreator());
        $this->assertFalse($noSubUser->isCreator());
    }
}

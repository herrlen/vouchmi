<?php

namespace Tests\Feature\Iap;

use App\Models\AppStoreNotification;
use App\Models\Subscription;
use App\Models\User;
use App\Services\AppStore\JwsVerifier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class NotificationsTest extends TestCase
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
            'queue.default'                                  => 'sync',
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

    /**
     * Mock the verifier so the controller's pre-verify and the handler's
     * verify both decode the same canned payload chain.
     */
    private function stubVerifier(string $signedPayload, array $notificationPayload, array $txInfo, ?array $renewalInfo = null): void
    {
        $signedTx      = 'tx.' . md5(json_encode($txInfo)) . '.sig';
        $signedRenewal = $renewalInfo ? 'rn.' . md5(json_encode($renewalInfo)) . '.sig' : null;

        $notificationPayload['data'] = array_filter([
            'signedTransactionInfo' => $signedTx,
            'signedRenewalInfo'     => $signedRenewal,
            'environment'           => 'Sandbox',
        ]);

        $this->mock(JwsVerifier::class, function ($mock) use ($signedPayload, $notificationPayload, $signedTx, $signedRenewal, $txInfo, $renewalInfo) {
            $mock->shouldReceive('verifyAndDecode')->with($signedPayload)->andReturn($notificationPayload);
            $mock->shouldReceive('verifyAndDecode')->with($signedTx)->andReturn($txInfo);
            if ($signedRenewal) {
                $mock->shouldReceive('verifyAndDecode')->with($signedRenewal)->andReturn($renewalInfo);
            }
        });
    }

    public function test_subscribed_notification_creates_handler_state(): void
    {
        $user = $this->makeUser('brand');
        $sub = Subscription::factory()->create([
            'user_id'                       => $user->id,
            'plan_type'                     => 'brand',
            'payment_provider'              => 'apple_iap',
            'apple_original_transaction_id' => 'ORIG_S',
            'status'                        => 'active',
        ]);

        $uuid = (string) Str::uuid();
        $signedPayload = 'header.' . base64_encode($uuid) . '.sig';

        $this->stubVerifier(
            $signedPayload,
            ['notificationType' => 'DID_RENEW', 'notificationUUID' => $uuid, 'subtype' => null],
            [
                'transactionId'         => 'TXN_NEW',
                'originalTransactionId' => 'ORIG_S',
                'productId'             => 'com.vouchmi.app.brand.monthly',
                'environment'           => 'Sandbox',
                'expiresDate'           => now()->addMonths(2)->getTimestampMs(),
            ],
            ['autoRenewStatus' => 1, 'expirationIntent' => null]
        );

        $this->postJson('/api/v1/iap/notifications', ['signedPayload' => $signedPayload])
            ->assertOk()
            ->assertJson(['ok' => true]);

        $this->assertDatabaseHas('app_store_notifications', [
            'notification_uuid' => $uuid,
            'notification_type' => 'DID_RENEW',
        ]);

        $sub->refresh();
        $this->assertEquals('active', $sub->status);
        $this->assertEquals('TXN_NEW', $sub->apple_transaction_id);
        $this->assertNotNull($sub->expires_at);
    }

    public function test_notification_is_idempotent_on_duplicate_uuid(): void
    {
        $user = $this->makeUser('brand');
        Subscription::factory()->create([
            'user_id'                       => $user->id,
            'plan_type'                     => 'brand',
            'payment_provider'              => 'apple_iap',
            'apple_original_transaction_id' => 'ORIG_DUP',
            'status'                        => 'active',
        ]);

        $uuid = (string) Str::uuid();
        $signedPayload = 'header.' . base64_encode($uuid) . '.sig';

        $this->stubVerifier(
            $signedPayload,
            ['notificationType' => 'DID_RENEW', 'notificationUUID' => $uuid, 'subtype' => null],
            [
                'transactionId'         => 'TXN_DUP',
                'originalTransactionId' => 'ORIG_DUP',
                'productId'             => 'com.vouchmi.app.brand.monthly',
                'environment'           => 'Sandbox',
                'expiresDate'           => now()->addMonth()->getTimestampMs(),
            ]
        );

        $this->postJson('/api/v1/iap/notifications', ['signedPayload' => $signedPayload])->assertOk();
        $this->postJson('/api/v1/iap/notifications', ['signedPayload' => $signedPayload])
            ->assertOk()
            ->assertJson(['ok' => true, 'duplicate' => true]);

        $this->assertEquals(1, AppStoreNotification::where('notification_uuid', $uuid)->count());
    }

    public function test_refund_marks_subscription_as_refunded_and_revokes_role(): void
    {
        $user = $this->makeUser('influencer');
        $sub = Subscription::factory()->create([
            'user_id'                       => $user->id,
            'plan_type'                     => 'influencer',
            'payment_provider'              => 'apple_iap',
            'apple_original_transaction_id' => 'ORIG_REF',
            'status'                        => 'active',
        ]);

        $uuid = (string) Str::uuid();
        $signedPayload = 'header.' . base64_encode($uuid) . '.sig';

        $this->stubVerifier(
            $signedPayload,
            ['notificationType' => 'REFUND', 'notificationUUID' => $uuid, 'subtype' => null],
            [
                'transactionId'         => 'TXN_REF',
                'originalTransactionId' => 'ORIG_REF',
                'productId'             => 'com.vouchmi.app.influencer.monthly',
                'environment'           => 'Sandbox',
            ]
        );

        $this->postJson('/api/v1/iap/notifications', ['signedPayload' => $signedPayload])->assertOk();

        $sub->refresh();
        $this->assertEquals('refunded', $sub->status);
        $this->assertFalse($sub->isActive());
        $this->assertEquals('user', $user->fresh()->role);
    }

    public function test_invalid_signature_returns_401_and_writes_no_db_row(): void
    {
        $signedPayload = 'header.bogus.sig';

        $this->mock(JwsVerifier::class, function ($mock) use ($signedPayload) {
            $mock->shouldReceive('verifyAndDecode')
                ->with($signedPayload)
                ->andThrow(new \App\Exceptions\AppStore\InvalidSignatureException('bad sig'));
        });

        $this->postJson('/api/v1/iap/notifications', ['signedPayload' => $signedPayload])
            ->assertStatus(401);

        $this->assertEquals(0, AppStoreNotification::count());
    }

    public function test_expired_notification_marks_subscription_expired(): void
    {
        $user = $this->makeUser('influencer');
        $sub = Subscription::factory()->create([
            'user_id'                       => $user->id,
            'plan_type'                     => 'influencer',
            'payment_provider'              => 'apple_iap',
            'apple_original_transaction_id' => 'ORIG_EXP',
            'status'                        => 'active',
        ]);

        $uuid = (string) Str::uuid();
        $signedPayload = 'header.' . base64_encode($uuid) . '.sig';

        $this->stubVerifier(
            $signedPayload,
            ['notificationType' => 'EXPIRED', 'notificationUUID' => $uuid, 'subtype' => null],
            [
                'transactionId'         => 'TXN_EXP',
                'originalTransactionId' => 'ORIG_EXP',
                'productId'             => 'com.vouchmi.app.influencer.monthly',
                'environment'           => 'Sandbox',
            ]
        );

        $this->postJson('/api/v1/iap/notifications', ['signedPayload' => $signedPayload])->assertOk();

        $sub->refresh();
        $this->assertEquals('expired', $sub->status);
        $this->assertFalse($sub->auto_renew);
    }
}

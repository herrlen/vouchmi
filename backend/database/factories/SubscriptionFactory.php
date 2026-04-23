<?php

namespace Database\Factories;

use App\Models\Subscription;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class SubscriptionFactory extends Factory
{
    protected $model = Subscription::class;

    public function definition(): array
    {
        return [
            'user_id'          => User::factory(),
            'plan_type'        => $this->faker->randomElement(['influencer', 'brand']),
            'payment_provider' => 'paypal',
            'paypal_status'    => 'ACTIVE',
            'status'           => 'active',
            'auto_renew'       => true,
            'started_at'       => now(),
            'expires_at'       => now()->addMonth(),
        ];
    }
}

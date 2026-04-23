<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id')->index();
            $table->string('plan_type'); // 'brand' | 'influencer'
            $table->string('paypal_subscription_id')->nullable()->index();
            $table->string('paypal_status')->default('PENDING'); // PENDING, ACTIVE, CANCELLED, SUSPENDED
            $table->timestamp('started_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->index('plan_type');
            $table->index(['user_id', 'plan_type', 'paypal_status']);
        });

        // Backfill: bestehende Brand-Subscriptions migrieren
        $brands = DB::table('brand_profiles')
            ->whereNotNull('paypal_subscription_id')
            ->get();

        foreach ($brands as $brand) {
            DB::table('subscriptions')->insert([
                'id'                     => (string) \Illuminate\Support\Str::uuid(),
                'user_id'                => $brand->user_id,
                'plan_type'              => 'brand',
                'paypal_subscription_id' => $brand->paypal_subscription_id,
                'paypal_status'          => $brand->paypal_status ?? 'PENDING',
                'started_at'             => $brand->subscription_started_at,
                'expires_at'             => $brand->subscription_expires_at ?? null,
                'created_at'             => $brand->created_at,
                'updated_at'             => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
    }
};

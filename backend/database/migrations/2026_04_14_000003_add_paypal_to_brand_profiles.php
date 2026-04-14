<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('brand_profiles', function (Blueprint $table) {
            $table->string('company_email')->nullable()->after('brand_slug');
            $table->string('paypal_subscription_id')->nullable()->index()->after('stripe_customer_id');
            $table->string('paypal_status')->nullable()->after('paypal_subscription_id');
            $table->timestamp('subscription_started_at')->nullable()->after('paypal_status');
        });
    }

    public function down(): void
    {
        Schema::table('brand_profiles', function (Blueprint $table) {
            $table->dropColumn([
                'company_email',
                'paypal_subscription_id',
                'paypal_status',
                'subscription_started_at',
            ]);
        });
    }
};

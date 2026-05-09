<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->string('apple_product_id')->nullable()->after('apple_original_transaction_id');
            $table->integer('expiration_intent')->nullable()->after('auto_renew');
            $table->string('last_notification_uuid')->nullable()->after('expiration_intent');
            $table->string('environment')->nullable()->after('last_notification_uuid'); // Sandbox | Production
        });

        DB::table('subscriptions')
            ->whereNull('payment_provider')
            ->update(['payment_provider' => 'paypal']);
    }

    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropColumn([
                'apple_product_id',
                'expiration_intent',
                'last_notification_uuid',
                'environment',
            ]);
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->string('payment_provider')->default('paypal')->after('plan_type');
            $table->string('apple_transaction_id')->nullable()->after('payment_provider');
            $table->string('apple_original_transaction_id')->nullable()->after('apple_transaction_id');
            $table->string('status')->default('active')->after('paypal_status');
            $table->boolean('auto_renew')->default(true)->after('status');
            $table->index('apple_original_transaction_id');
            $table->index('status');
        });

        // Bestehende Zeilen: status aus paypal_status ableiten
        \DB::table('subscriptions')
            ->where('paypal_status', 'ACTIVE')
            ->update(['status' => 'active']);
        \DB::table('subscriptions')
            ->whereIn('paypal_status', ['CANCELLED', 'EXPIRED'])
            ->update(['status' => 'expired']);
        \DB::table('subscriptions')
            ->where('paypal_status', 'SUSPENDED')
            ->update(['status' => 'suspended']);

        // iap_events für Notification-Debugging
        Schema::create('iap_events', function (Blueprint $table) {
            $table->id();
            $table->string('notification_type');
            $table->string('subtype')->nullable();
            $table->string('original_transaction_id')->nullable()->index();
            $table->json('payload');
            $table->timestamp('received_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('iap_events');

        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropIndex(['apple_original_transaction_id']);
            $table->dropIndex(['status']);
            $table->dropColumn([
                'payment_provider', 'apple_transaction_id',
                'apple_original_transaction_id', 'status', 'auto_renew',
            ]);
        });
    }
};

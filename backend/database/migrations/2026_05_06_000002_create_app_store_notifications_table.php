<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('app_store_notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('notification_uuid')->unique(); // Idempotency
            $table->string('notification_type')->index();
            $table->string('subtype')->nullable();
            $table->string('transaction_id')->nullable()->index();
            $table->string('original_transaction_id')->nullable()->index();
            $table->string('environment')->nullable(); // Sandbox | Production
            $table->text('signed_payload');
            $table->json('decoded_payload')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->text('processing_error')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('app_store_notifications');
    }
};

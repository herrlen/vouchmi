<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('app_store_transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id')->index();
            $table->string('transaction_id')->index();
            $table->string('original_transaction_id')->index();
            $table->string('product_id');
            $table->string('bundle_id');
            $table->string('environment'); // Sandbox | Production
            $table->timestamp('purchase_date');
            $table->timestamp('expires_date')->nullable();
            $table->string('in_app_ownership_type')->nullable();
            $table->string('web_order_line_item_id')->nullable();
            $table->json('raw_payload');
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->unique(['transaction_id', 'environment']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('app_store_transactions');
    }
};

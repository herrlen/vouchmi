<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wallet_transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('wallet_id');

            // topup | boost_spend | refund | admin_adjust | migration_bonus | reversal
            $table->string('type', 32);

            // signed delta — positive for credit, negative for debit
            $table->bigInteger('credits_delta');

            // optional fiat record (in cents). For topups we record the actual € paid.
            $table->unsignedBigInteger('currency_amount_cents')->nullable();
            $table->char('currency_code', 3)->nullable();

            // paypal | apple_iap | admin | system
            $table->string('payment_provider', 32)->nullable();

            // provider reference (e.g. PayPal capture id, Apple transaction id). Unique
            // so the same provider event cannot be booked twice.
            $table->string('provider_ref')->nullable();

            // idempotency key supplied by the caller / client to dedupe retries
            $table->string('idempotency_key')->nullable();

            // pending | completed | failed | reversed
            $table->string('status', 16)->default('completed');

            // free-form metadata (order info, boost-id, admin reason, …)
            $table->json('metadata')->nullable();

            // for reversal chains: points back to the original transaction
            $table->uuid('reverses_transaction_id')->nullable();

            $table->timestamps();

            $table->index(['wallet_id', 'created_at']);
            $table->index(['wallet_id', 'type']);
            $table->unique('provider_ref');
            $table->unique('idempotency_key');

            $table->foreign('wallet_id')->references('id')->on('wallets')->cascadeOnDelete();
            $table->foreign('reverses_transaction_id')
                ->references('id')->on('wallet_transactions')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallet_transactions');
    }
};

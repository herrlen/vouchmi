<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('boosts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');

            // The thing being boosted. In this codebase recommendations are stored
            // as Posts (see App\Models\Post). We name the column generically so
            // future content types can be boosted too.
            $table->uuid('post_id');

            // mini | standard | pro | brand_push  (final tiers defined in Sprint 0)
            $table->string('tier', 32);

            $table->unsignedBigInteger('credits_spent');
            $table->unsignedSmallInteger('multiplier'); // e.g. 2, 3, 5, 8

            $table->timestamp('starts_at');
            $table->timestamp('ends_at');

            // active | expired | refunded | cancelled
            $table->string('status', 16)->default('active');

            $table->unsignedBigInteger('stats_impressions')->default(0);
            $table->unsignedBigInteger('stats_clicks')->default(0);

            // links to the wallet_transaction that debited the credits — needed
            // for refund/reversal flows.
            $table->uuid('spend_transaction_id')->nullable();

            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['post_id', 'status']);
            $table->index(['status', 'ends_at']);

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('post_id')->references('id')->on('posts')->cascadeOnDelete();
            $table->foreign('spend_transaction_id')
                ->references('id')->on('wallet_transactions')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('boosts');
    }
};

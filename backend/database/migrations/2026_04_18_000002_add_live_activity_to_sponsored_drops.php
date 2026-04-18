<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sponsored_drops', function (Blueprint $table) {
            if (!Schema::hasColumn('sponsored_drops', 'original_price')) {
                $table->decimal('original_price', 10, 2)->nullable()->after('discount_percent');
            }
            if (!Schema::hasColumn('sponsored_drops', 'drop_price')) {
                $table->decimal('drop_price', 10, 2)->nullable()->after('original_price');
            }
            if (!Schema::hasColumn('sponsored_drops', 'stock_limit')) {
                $table->integer('stock_limit')->nullable()->after('drop_price');
            }
            if (!Schema::hasColumn('sponsored_drops', 'stock_claimed')) {
                $table->integer('stock_claimed')->default(0)->after('stock_limit');
            }
            if (!Schema::hasColumn('sponsored_drops', 'participant_count')) {
                $table->integer('participant_count')->default(0)->after('stock_claimed');
            }
        });

        Schema::create('live_activity_tokens', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->uuid('drop_id');
            $table->string('push_token', 512);
            $table->timestamp('created_at')->useCurrent();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('drop_id')->references('id')->on('sponsored_drops')->cascadeOnDelete();
            $table->unique(['user_id', 'drop_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('live_activity_tokens');
        Schema::table('sponsored_drops', function (Blueprint $table) {
            $table->dropColumn(['original_price', 'drop_price', 'stock_limit', 'stock_claimed', 'participant_count']);
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('tier', 10)->default('none')->after('profile_layout_updated_at');
            $table->timestamp('tier_achieved_at')->nullable()->after('tier');
            $table->decimal('tier_badge_opacity', 3, 2)->default(1.00)->after('tier_achieved_at');
            $table->timestamp('tier_below_threshold_since')->nullable()->after('tier_badge_opacity');
        });

        Schema::create('tier_history', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->string('from_tier', 10);
            $table->string('to_tier', 10);
            $table->string('change_type', 10); // promotion | demotion
            $table->integer('follower_count_at_change');
            $table->integer('recommendation_count_at_change');
            $table->timestamps();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tier_history');
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['tier', 'tier_achieved_at', 'tier_badge_opacity', 'tier_below_threshold_since']);
        });
    }
};

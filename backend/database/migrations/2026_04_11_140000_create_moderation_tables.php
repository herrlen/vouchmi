<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('reports', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('reporter_id');
            $table->string('target_type'); // post, comment, user, community
            $table->uuid('target_id');
            $table->string('reason'); // spam, abuse, illegal, sexual, other
            $table->text('details')->nullable();
            $table->string('status')->default('open'); // open, reviewed, dismissed, action_taken
            $table->timestamps();
            $table->index(['target_type', 'target_id']);
            $table->index('status');
        });

        Schema::create('user_blocks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('blocker_id');
            $table->uuid('blocked_id');
            $table->timestamps();
            $table->unique(['blocker_id', 'blocked_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_blocks');
        Schema::dropIfExists('reports');
    }
};

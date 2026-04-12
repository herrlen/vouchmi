<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('reposts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id')->index();
            $table->uuid('original_post_id')->index();
            $table->text('comment')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'original_post_id']);
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('original_post_id')->references('id')->on('posts')->cascadeOnDelete();
        });

        Schema::table('posts', function (Blueprint $table) {
            $table->unsignedInteger('repost_count')->default(0)->after('comment_count');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reposts');
        Schema::table('posts', function (Blueprint $table) {
            $table->dropColumn('repost_count');
        });
    }
};

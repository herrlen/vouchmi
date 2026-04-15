<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shared_links', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('shortcode', 12)->unique();
            $table->uuid('user_id');
            $table->uuid('community_id')->nullable();
            $table->text('original_url');
            $table->text('target_url');
            $table->string('domain')->index();
            $table->string('og_title')->nullable();
            $table->string('og_description', 512)->nullable();
            $table->string('og_image')->nullable();
            $table->unsignedBigInteger('click_count')->default(0);
            $table->timestamps();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('community_id')->references('id')->on('communities')->nullOnDelete();
            $table->index(['user_id', 'created_at']);
        });

        Schema::table('link_clicks', function (Blueprint $table) {
            $table->uuid('shared_link_id')->nullable()->after('community_id')->index();
            $table->string('ip_hash', 64)->nullable()->after('domain');
            $table->string('user_agent', 512)->nullable()->after('ip_hash');
            $table->string('referer', 512)->nullable()->after('user_agent');
            $table->string('country', 2)->nullable()->after('referer');
        });
    }

    public function down(): void
    {
        Schema::table('link_clicks', function (Blueprint $table) {
            $table->dropColumn(['shared_link_id', 'ip_hash', 'user_agent', 'referer', 'country']);
        });
        Schema::dropIfExists('shared_links');
    }
};

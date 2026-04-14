<?php

// database/migrations/2026_04_09_000001_create_vouchmi_tables.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Users ──
        Schema::create('users', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('email')->unique();
            $table->string('username')->unique();
            $table->string('password');
            $table->string('display_name')->nullable();
            $table->string('avatar_url')->nullable();
            $table->text('bio')->nullable();
            $table->unsignedInteger('humhub_user_id')->nullable()->index();
            $table->string('role')->default('user'); // user, brand
            $table->timestamp('email_verified_at')->nullable();
            $table->rememberToken();
            $table->timestamps();
        });

        // ── Communities (jeder kann erstellen) ──
        Schema::create('communities', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('image_url')->nullable();
            $table->string('category')->nullable()->index();
            $table->boolean('is_private')->default(false);
            $table->uuid('owner_id')->index();
            $table->unsignedInteger('humhub_space_id')->nullable();
            $table->unsignedInteger('member_count')->default(1);
            $table->timestamps();
            $table->foreign('owner_id')->references('id')->on('users');
        });

        // ── Community Members ──
        Schema::create('community_members', function (Blueprint $table) {
            $table->uuid('community_id');
            $table->uuid('user_id');
            $table->string('role')->default('member'); // owner, admin, member
            $table->timestamp('joined_at')->useCurrent();
            $table->primary(['community_id', 'user_id']);
            $table->foreign('community_id')->references('id')->on('communities')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });

        // ── Posts (mit Link-Previews) ──
        Schema::create('posts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('community_id')->index();
            $table->uuid('author_id');
            $table->text('content')->nullable();
            $table->string('post_type')->default('text'); // text, image, link, deal
            $table->json('media_urls')->nullable();
            // Link-Preview Daten (gecached vom LinkPreviewService)
            $table->string('link_url')->nullable();
            $table->string('link_affiliate_url')->nullable();
            $table->string('link_title')->nullable();
            $table->string('link_image')->nullable();
            $table->decimal('link_price', 10, 2)->nullable();
            $table->string('link_domain')->nullable();
            // Engagement
            $table->unsignedInteger('like_count')->default(0);
            $table->unsignedInteger('comment_count')->default(0);
            $table->unsignedInteger('click_count')->default(0);
            $table->timestamps();
            $table->foreign('community_id')->references('id')->on('communities')->cascadeOnDelete();
            $table->foreign('author_id')->references('id')->on('users');
        });

        // ── Comments ──
        Schema::create('comments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('post_id');
            $table->uuid('author_id');
            $table->text('content');
            $table->timestamps();
            $table->foreign('post_id')->references('id')->on('posts')->cascadeOnDelete();
            $table->foreign('author_id')->references('id')->on('users');
        });

        // ── Likes ──
        Schema::create('likes', function (Blueprint $table) {
            $table->uuid('post_id');
            $table->uuid('user_id');
            $table->timestamp('created_at')->useCurrent();
            $table->primary(['post_id', 'user_id']);
            $table->foreign('post_id')->references('id')->on('posts')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });

        // ── Chat Messages ──
        Schema::create('messages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('community_id')->index();
            $table->uuid('sender_id');
            $table->text('content');
            // Optionaler Link-Embed
            $table->string('link_url')->nullable();
            $table->string('link_title')->nullable();
            $table->string('link_image')->nullable();
            $table->decimal('link_price', 10, 2)->nullable();
            $table->timestamps();
            $table->foreign('community_id')->references('id')->on('communities')->cascadeOnDelete();
            $table->foreign('sender_id')->references('id')->on('users');
            $table->index(['community_id', 'created_at']);
        });

        // ── Invite Links ──
        Schema::create('invites', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('community_id');
            $table->uuid('invited_by');
            $table->string('code', 12)->unique();
            $table->unsignedInteger('uses')->default(0);
            $table->unsignedInteger('max_uses')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
            $table->foreign('community_id')->references('id')->on('communities')->cascadeOnDelete();
            $table->foreign('invited_by')->references('id')->on('users');
        });

        // ── Click Tracking (für Affiliate-Revenue) ──
        Schema::create('link_clicks', function (Blueprint $table) {
            $table->id();
            $table->uuid('post_id')->nullable();
            $table->uuid('user_id')->nullable();
            $table->uuid('community_id')->nullable();
            $table->string('original_url');
            $table->string('affiliate_url');
            $table->string('domain');
            $table->timestamp('clicked_at')->useCurrent();
            $table->index(['domain', 'clicked_at']);
            $table->index(['community_id', 'clicked_at']);
        });

        // ═══════════════════════════════════════════
        // BRAND BEREICH (nur für zahlende Marken)
        // ═══════════════════════════════════════════

        // ── Brand Profiles (Brandseite) ──
        Schema::create('brand_profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id')->unique(); // 1:1 mit users
            $table->string('brand_name');
            $table->string('brand_slug')->unique();
            $table->text('description')->nullable();
            $table->string('logo_url')->nullable();
            $table->string('cover_url')->nullable();
            $table->string('website_url')->nullable();
            $table->string('industry')->nullable();
            $table->boolean('is_verified')->default(false);
            // Abo
            $table->string('subscription_plan')->default('starter'); // starter, pro, enterprise
            $table->timestamp('subscription_expires_at')->nullable();
            $table->string('stripe_customer_id')->nullable();
            $table->timestamps();
            $table->foreign('user_id')->references('id')->on('users');
        });

        // ── Sponsored Drops ──
        Schema::create('sponsored_drops', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('brand_id'); // → brand_profiles
            $table->uuid('community_id')->nullable();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('product_url')->nullable();
            $table->string('discount_code')->nullable();
            $table->unsignedInteger('discount_percent')->nullable();
            $table->string('image_url')->nullable();
            // Revive Adserver
            $table->unsignedInteger('revive_campaign_id')->nullable();
            // Community Voting
            $table->unsignedInteger('votes_yes')->default(0);
            $table->unsignedInteger('votes_no')->default(0);
            $table->string('status')->default('pending'); // pending, approved, rejected, active, expired
            // Billing
            $table->string('revenue_type')->default('CPM');
            $table->decimal('revenue_rate', 8, 2)->default(5.00);
            $table->timestamps();
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->foreign('brand_id')->references('id')->on('brand_profiles');
            $table->foreign('community_id')->references('id')->on('communities')->nullOnDelete();
        });

        // ── Drop Votes ──
        Schema::create('drop_votes', function (Blueprint $table) {
            $table->uuid('drop_id');
            $table->uuid('user_id');
            $table->boolean('vote');
            $table->timestamp('voted_at')->useCurrent();
            $table->primary(['drop_id', 'user_id']);
            $table->foreign('drop_id')->references('id')->on('sponsored_drops')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users');
        });

        // ── Product Seeding Campaigns ──
        Schema::create('seeding_campaigns', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('brand_id');
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('product_url');
            $table->string('product_name');
            $table->unsignedInteger('units_available')->default(10);
            $table->unsignedInteger('units_claimed')->default(0);
            $table->string('status')->default('active');
            $table->timestamps();
            $table->foreign('brand_id')->references('id')->on('brand_profiles');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seeding_campaigns');
        Schema::dropIfExists('drop_votes');
        Schema::dropIfExists('sponsored_drops');
        Schema::dropIfExists('brand_profiles');
        Schema::dropIfExists('link_clicks');
        Schema::dropIfExists('invites');
        Schema::dropIfExists('messages');
        Schema::dropIfExists('likes');
        Schema::dropIfExists('comments');
        Schema::dropIfExists('posts');
        Schema::dropIfExists('community_members');
        Schema::dropIfExists('communities');
        Schema::dropIfExists('users');
    }
};

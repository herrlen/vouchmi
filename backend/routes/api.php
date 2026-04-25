<?php

// routes/api.php
// Vouchmi API – Community Commerce Platform
// Kein eigener Shop. Nutzer teilen Links. Marken zahlen.

use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AppleIapController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CommunityController;
use App\Http\Controllers\Api\FeedController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\DirectMessageController;
use App\Http\Controllers\Api\BrandProfileController;
use App\Http\Controllers\Api\InfluencerController;
use App\Http\Controllers\Api\LegalController;
use App\Http\Controllers\Api\SharedLinkController;
use App\Http\Controllers\Api\LinkPreviewController;
use App\Http\Controllers\Api\BrandController;
use App\Http\Controllers\Api\SponsoredDropController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\ModerationController;
use App\Http\Controllers\Api\TierController;
use App\Http\Controllers\Api\WidgetController;
use Illuminate\Support\Facades\Route;

// ── Public ──
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);
Route::post('/auth/verify-email', [AuthController::class, 'verifyEmail']);

// ── Legal (öffentlich) ──
Route::get('/legal/privacy', [LegalController::class, 'privacy']);
Route::get('/legal/terms',   [LegalController::class, 'terms']);
Route::get('/legal/imprint', [LegalController::class, 'imprint']);

// ── PayPal Webhook (öffentlich, von PayPal aufgerufen) ──
Route::post('/webhooks/paypal', [BrandController::class, 'webhook']);

// ── Apple App Store Server Notifications V2 (öffentlich, von Apple aufgerufen) ──
Route::post('/v1/iap/server-notification', [AppleIapController::class, 'serverNotification']);

// ── Link Preview (öffentlich, gecached) ──
Route::get('/link-preview', [LinkPreviewController::class, 'preview']);

// ── Authenticated (Nutzer – komplett kostenlos) ──
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/send-verification', [AuthController::class, 'sendVerification']);

    // Profil
    Route::get('/user/profile', [UserController::class, 'profile']);
    Route::put('/user/profile', [UserController::class, 'updateProfile']);
    Route::post('/user/avatar', [UserController::class, 'uploadAvatar']);
    Route::put('/user/profile/layout', [UserController::class, 'updateLayout']);
    Route::get('/users/{userId}/profile', [UserController::class, 'publicProfile']);
    Route::post('/users/{userId}/follow', [UserController::class, 'follow']);
    Route::delete('/users/{userId}/follow', [UserController::class, 'unfollow']);

    // Communities (jeder kann erstellen!)
    Route::get('/communities', [CommunityController::class, 'index']);
    Route::get('/communities/discover', [CommunityController::class, 'discover']);
    Route::post('/communities', [CommunityController::class, 'store']);
    Route::get('/communities/{id}', [CommunityController::class, 'show']);
    Route::put('/communities/{id}', [CommunityController::class, 'update']);
    Route::post('/communities/{id}/image', [CommunityController::class, 'uploadImage']);
    Route::delete('/communities/{id}', [CommunityController::class, 'destroy']);
    Route::post('/communities/{id}/join', [CommunityController::class, 'join']);
    Route::post('/communities/{id}/leave', [CommunityController::class, 'leave']);
    Route::post('/communities/{id}/follow', [CommunityController::class, 'follow']);
    Route::post('/communities/{id}/unfollow', [CommunityController::class, 'unfollow']);
    Route::get('/communities/{id}/members', [CommunityController::class, 'members']);
    Route::post('/communities/{id}/invite', [CommunityController::class, 'invite']);
    Route::post('/communities/join-by-code/{code}', [CommunityController::class, 'joinByCode']);

    // Community Moderation
    Route::put('/communities/{id}/members/{userId}/role', [CommunityController::class, 'setRole']);
    Route::post('/communities/{id}/members/{userId}/mute', [CommunityController::class, 'muteUser']);
    Route::delete('/communities/{id}/members/{userId}/mute', [CommunityController::class, 'unmuteUser']);
    Route::delete('/communities/{id}/members/{userId}', [CommunityController::class, 'kickUser']);
    Route::post('/communities/{id}/posts/{postId}/hide', [CommunityController::class, 'hidePost']);
    Route::delete('/communities/{id}/posts/{postId}', [CommunityController::class, 'deletePost']);
    Route::get('/communities/{id}/mute-status', [CommunityController::class, 'myMuteStatus']);

    // Feed (Posts mit Produkt-Links)
    Route::get('/feed', [FeedController::class, 'allMyFeed']);
    Route::get('/feed/top', [FeedController::class, 'top']);
    Route::get('/user/posts', [FeedController::class, 'myPosts']);
    Route::get('/communities/{id}/feed', [FeedController::class, 'index']);
    Route::post('/communities/{id}/feed', [FeedController::class, 'store']);
    Route::post('/feed/{postId}/like', [FeedController::class, 'like']);
    Route::post('/feed/{postId}/comment', [FeedController::class, 'comment']);
    Route::get('/feed/{postId}/comments', [FeedController::class, 'comments']);
    Route::delete('/feed/{postId}', [FeedController::class, 'destroy']);
    Route::post('/feed/{postId}/repost', [FeedController::class, 'repost']);
    Route::delete('/feed/{postId}/repost', [FeedController::class, 'unrepost']);
    Route::get('/feed/{postId}/reposters', [FeedController::class, 'reposters']);
    Route::post('/feed/{postId}/bookmark', [FeedController::class, 'bookmark']);
    Route::get('/user/bookmarks', [FeedController::class, 'bookmarks']);
    Route::get('/user/reposts', [FeedController::class, 'myReposts']);

    // Chat (Community)
    Route::get('/communities/{id}/messages', [ChatController::class, 'index']);
    Route::post('/communities/{id}/messages', [ChatController::class, 'store']);

    // Direktnachrichten (1:1)
    Route::post('/dm/send', [DirectMessageController::class, 'send']);
    Route::get('/dm/conversations', [DirectMessageController::class, 'conversations']);
    Route::get('/dm/conversations/{userId}', [DirectMessageController::class, 'thread']);
    Route::patch('/dm/read/{userId}', [DirectMessageController::class, 'markRead']);

    // Sponsored Drops (Nutzer-Seite: sehen & voten)
    Route::get('/communities/{id}/drops', [SponsoredDropController::class, 'index']);
    Route::post('/drops/{dropId}/vote', [SponsoredDropController::class, 'vote']);

    // Tier-System
    Route::get('/user/tier', [TierController::class, 'status']);
    Route::post('/user/upgrade-to-influencer', [TierController::class, 'upgradeToInfluencer']);
    Route::post('/user/dismiss-upgrade', [TierController::class, 'dismissUpgradePrompt']);

    // Widget
    Route::get('/widget/daily', [WidgetController::class, 'daily']);

    // Live Activity tokens
    Route::post('/drops/{id}/activity-token', [SponsoredDropController::class, 'registerActivityToken']);

    // Tracking
    Route::post('/track/event', [UserController::class, 'trackEvent']);
    Route::post('/track/click', [LinkPreviewController::class, 'trackClick']);

    // Shared Links (Vouchmi Short-Links + UTM-Tracking)
    Route::get('/links', [SharedLinkController::class, 'index']);
    Route::post('/links', [SharedLinkController::class, 'store']);
    Route::get('/links/{id}/stats', [SharedLinkController::class, 'stats']);
    Route::delete('/links/{id}', [SharedLinkController::class, 'destroy']);

    // Brand-Profil — Registrierung & Abo-Verwaltung für den eingeloggten User
    Route::get('/brand/me', [BrandController::class, 'profile']);
    Route::get('/brand/status', [BrandController::class, 'status']);
    Route::post('/brand/register', [BrandController::class, 'register']);
    Route::post('/brand/subscribe', [BrandController::class, 'subscribe']);
    Route::post('/brand/cancel', [BrandController::class, 'cancel']);
    Route::get('/brands/{slug}', [BrandController::class, 'publicProfile']);

    // Brand-Profilseite (öffentlich sichtbar, UUID oder Slug)
    Route::get('/brands/{id}/profile',      [BrandProfileController::class, 'show']);
    Route::get('/brands/{id}/posts',        [BrandProfileController::class, 'posts']);
    Route::get('/brands/{id}/products',     [BrandProfileController::class, 'products']);
    Route::get('/brands/{id}/photos',       [BrandProfileController::class, 'photos']);
    Route::post('/brands/{id}/follow',      [BrandProfileController::class, 'follow']);
    Route::delete('/brands/{id}/follow',    [BrandProfileController::class, 'unfollow']);
    Route::put('/brands/{id}',              [BrandProfileController::class, 'update']);
    Route::post('/brands/{id}/header-image', [BrandProfileController::class, 'uploadHeader']);

    // Moderation (Apple-Pflicht: Melden, Blockieren, Account-Löschung)
    Route::post('/reports', [ModerationController::class, 'report']);
    Route::post('/users/{userId}/block', [ModerationController::class, 'block']);
    Route::delete('/users/{userId}/block', [ModerationController::class, 'unblock']);
    Route::get('/users/blocked', [ModerationController::class, 'blockedUsers']);
    Route::delete('/account', [ModerationController::class, 'deleteAccount']);

    // Influencer — Registrierung & Abo-Verwaltung
    Route::post('/influencer/register', [InfluencerController::class, 'register']);
    Route::post('/influencer/subscribe', [InfluencerController::class, 'subscribe']);
    Route::post('/influencer/cancel', [InfluencerController::class, 'cancel']);
    Route::get('/influencer/status', [InfluencerController::class, 'status']);

    // Apple IAP — Receipt-Validierung (authentifiziert)
    Route::post('/v1/iap/verify-receipt', [AppleIapController::class, 'verifyReceipt']);

    // Subscription-Status (generisch für beide Plan-Typen)
    Route::get('/subscription/status', function (\Illuminate\Http\Request $request) {
        $user = $request->user();
        $sub = $user->subscriptions()->latest()->first();
        return response()->json([
            'role'             => $user->role,
            'has_active'       => $user->hasActiveSubscription(),
            'plan_type'        => $sub?->plan_type,
            'payment_provider' => $sub?->payment_provider,
            'status'           => $sub?->status,
            'auto_renew'       => $sub?->auto_renew,
            'expires_at'       => $sub?->expires_at?->toIso8601String(),
            'paypal_status'    => $sub?->paypal_status,
        ]);
    });
});

// ── Influencer Analytics (aktives Influencer-Abo erforderlich) ──
Route::middleware(['auth:sanctum', 'subscription.active:influencer'])->prefix('v1/analytics')->group(function () {
    Route::get('/overview', [AnalyticsController::class, 'overview']);
    Route::get('/links', [AnalyticsController::class, 'linkPerformance']);
    Route::get('/audience', [AnalyticsController::class, 'audience']);
});

// ── Brand API (nur für zahlende Marken) ──
Route::middleware(['auth:sanctum', 'brand'])->prefix('brand')->group(function () {

    // Brand Profil / Brandseite
    Route::get('/profile', [BrandController::class, 'profile']);
    Route::put('/profile', [BrandController::class, 'updateProfile']);
    Route::post('/profile/logo', [BrandController::class, 'uploadLogo']);

    // Abo-Status
    Route::get('/subscription', [BrandController::class, 'subscription']);

    // Sponsored Drops erstellen & managen
    Route::post('/drops', [SponsoredDropController::class, 'store']);
    Route::get('/drops', [SponsoredDropController::class, 'brandDrops']);
    Route::get('/drops/{id}/stats', [SponsoredDropController::class, 'stats']);
    Route::post('/drops/{id}/start', [SponsoredDropController::class, 'startDrop']);
    Route::post('/drops/{id}/end', [SponsoredDropController::class, 'endDrop']);

    // Product Seeding
    Route::post('/seeding', [BrandController::class, 'createSeeding']);
    Route::get('/seeding', [BrandController::class, 'seedingCampaigns']);

    // Analytics (was passiert mit meiner Marke auf Vouchmi)
    Route::get('/analytics/mentions', [BrandController::class, 'mentions']);
    Route::get('/analytics/clicks', [BrandController::class, 'clickStats']);
    Route::get('/analytics/communities', [BrandController::class, 'topCommunities']);
});

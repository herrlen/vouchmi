<?php

// routes/api.php
// TrusCart API – Community Commerce Platform
// Kein eigener Shop. Nutzer teilen Links. Marken zahlen.

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CommunityController;
use App\Http\Controllers\Api\FeedController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\LinkPreviewController;
use App\Http\Controllers\Api\BrandController;
use App\Http\Controllers\Api\SponsoredDropController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

// ── Public ──
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

// ── Link Preview (öffentlich, gecached) ──
Route::get('/link-preview', [LinkPreviewController::class, 'preview']);

// ── Authenticated (Nutzer – komplett kostenlos) ──
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    // Profil
    Route::get('/user/profile', [UserController::class, 'profile']);
    Route::put('/user/profile', [UserController::class, 'updateProfile']);
    Route::post('/user/avatar', [UserController::class, 'uploadAvatar']);

    // Communities (jeder kann erstellen!)
    Route::get('/communities', [CommunityController::class, 'index']);
    Route::get('/communities/discover', [CommunityController::class, 'discover']);
    Route::post('/communities', [CommunityController::class, 'store']);
    Route::get('/communities/{id}', [CommunityController::class, 'show']);
    Route::put('/communities/{id}', [CommunityController::class, 'update']);
    Route::post('/communities/{id}/join', [CommunityController::class, 'join']);
    Route::post('/communities/{id}/leave', [CommunityController::class, 'leave']);
    Route::get('/communities/{id}/members', [CommunityController::class, 'members']);
    Route::post('/communities/{id}/invite', [CommunityController::class, 'invite']);
    Route::post('/communities/join-by-code/{code}', [CommunityController::class, 'joinByCode']);

    // Feed (Posts mit Produkt-Links)
    Route::get('/communities/{id}/feed', [FeedController::class, 'index']);
    Route::post('/communities/{id}/feed', [FeedController::class, 'store']);
    Route::post('/feed/{postId}/like', [FeedController::class, 'like']);
    Route::post('/feed/{postId}/comment', [FeedController::class, 'comment']);
    Route::get('/feed/{postId}/comments', [FeedController::class, 'comments']);
    Route::delete('/feed/{postId}', [FeedController::class, 'destroy']);

    // Chat
    Route::get('/communities/{id}/messages', [ChatController::class, 'index']);
    Route::post('/communities/{id}/messages', [ChatController::class, 'store']);

    // Sponsored Drops (Nutzer-Seite: sehen & voten)
    Route::get('/communities/{id}/drops', [SponsoredDropController::class, 'index']);
    Route::post('/drops/{dropId}/vote', [SponsoredDropController::class, 'vote']);

    // Tracking
    Route::post('/track/event', [UserController::class, 'trackEvent']);
    Route::post('/track/click', [LinkPreviewController::class, 'trackClick']);
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

    // Product Seeding
    Route::post('/seeding', [BrandController::class, 'createSeeding']);
    Route::get('/seeding', [BrandController::class, 'seedingCampaigns']);

    // Analytics (was passiert mit meiner Marke auf TrusCart)
    Route::get('/analytics/mentions', [BrandController::class, 'mentions']);
    Route::get('/analytics/clicks', [BrandController::class, 'clickStats']);
    Route::get('/analytics/communities', [BrandController::class, 'topCommunities']);
});

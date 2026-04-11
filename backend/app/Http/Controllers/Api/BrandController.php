<?php

// app/Http/Controllers/Api/BrandController.php
// Nur für Marken mit aktivem Abo

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BrandProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BrandController extends Controller
{
    public function profile(Request $request): JsonResponse
    {
        $brand = BrandProfile::where('user_id', $request->user()->id)->firstOrFail();
        return response()->json(['brand' => $brand]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $data = $request->validate([
            'brand_name' => 'nullable|string|max:100',
            'description' => 'nullable|string|max:1000',
            'website_url' => 'nullable|url',
            'industry' => 'nullable|string|max:50',
        ]);

        $brand = BrandProfile::where('user_id', $request->user()->id)->firstOrFail();
        $brand->update($data);

        return response()->json(['brand' => $brand->fresh()]);
    }

    public function subscription(Request $request): JsonResponse
    {
        $brand = BrandProfile::where('user_id', $request->user()->id)->firstOrFail();

        return response()->json([
            'plan' => $brand->subscription_plan,
            'expires_at' => $brand->subscription_expires_at,
            'is_active' => $brand->subscription_expires_at && $brand->subscription_expires_at->isFuture(),
            'plans' => [
                'starter' => ['price' => 99, 'drops_per_month' => 5, 'analytics' => 'basic'],
                'pro' => ['price' => 299, 'drops_per_month' => 20, 'analytics' => 'advanced', 'seeding' => true],
                'enterprise' => ['price' => 799, 'drops_per_month' => 'unlimited', 'analytics' => 'full', 'seeding' => true, 'api' => true],
            ],
        ]);
    }

    public function mentions(Request $request): JsonResponse
    {
        $brand = BrandProfile::where('user_id', $request->user()->id)->firstOrFail();
        $domain = parse_url($brand->website_url, PHP_URL_HOST) ?? '';

        // Finde alle Posts die Links zur Brand-Domain teilen
        $mentions = DB::table('posts')
            ->where('link_domain', 'LIKE', "%{$domain}%")
            ->join('communities', 'posts.community_id', '=', 'communities.id')
            ->select('posts.id', 'posts.content', 'posts.link_title', 'posts.click_count', 'posts.like_count', 'communities.name as community_name', 'posts.created_at')
            ->orderByDesc('posts.created_at')
            ->limit(50)
            ->get();

        return response()->json(['mentions' => $mentions]);
    }

    public function clickStats(Request $request): JsonResponse
    {
        $brand = BrandProfile::where('user_id', $request->user()->id)->firstOrFail();
        $domain = parse_url($brand->website_url, PHP_URL_HOST) ?? '';

        $stats = DB::table('link_clicks')
            ->where('domain', 'LIKE', "%{$domain}%")
            ->selectRaw('DATE(clicked_at) as date, COUNT(*) as clicks')
            ->groupBy('date')
            ->orderByDesc('date')
            ->limit(30)
            ->get();

        $total = DB::table('link_clicks')
            ->where('domain', 'LIKE', "%{$domain}%")
            ->count();

        return response()->json(['daily' => $stats, 'total_clicks' => $total]);
    }

    public function topCommunities(Request $request): JsonResponse
    {
        $brand = BrandProfile::where('user_id', $request->user()->id)->firstOrFail();
        $domain = parse_url($brand->website_url, PHP_URL_HOST) ?? '';

        $communities = DB::table('posts')
            ->where('link_domain', 'LIKE', "%{$domain}%")
            ->join('communities', 'posts.community_id', '=', 'communities.id')
            ->selectRaw('communities.id, communities.name, communities.member_count, COUNT(posts.id) as mentions, SUM(posts.click_count) as total_clicks')
            ->groupBy('communities.id', 'communities.name', 'communities.member_count')
            ->orderByDesc('total_clicks')
            ->limit(20)
            ->get();

        return response()->json(['communities' => $communities]);
    }

    public function createSeeding(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => 'required|string|max:200',
            'description' => 'nullable|string',
            'product_url' => 'required|url',
            'product_name' => 'required|string',
            'units_available' => 'required|integer|min:1|max:1000',
        ]);

        $brand = BrandProfile::where('user_id', $request->user()->id)->firstOrFail();

        $campaign = $brand->seedingCampaigns()->create($data);

        return response()->json(['campaign' => $campaign], 201);
    }

    public function seedingCampaigns(Request $request): JsonResponse
    {
        $brand = BrandProfile::where('user_id', $request->user()->id)->firstOrFail();
        return response()->json(['campaigns' => $brand->seedingCampaigns()->latest()->get()]);
    }
}

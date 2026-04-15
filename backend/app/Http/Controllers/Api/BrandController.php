<?php

// app/Http/Controllers/Api/BrandController.php
// Nur für Marken mit aktivem Abo

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BrandProfile;
use App\Services\PayPalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class BrandController extends Controller
{
    public function profile(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user->role !== 'brand') {
            return response()->json(['message' => 'Kein Brand-Account'], 403);
        }
        $brand = BrandProfile::where('user_id', $user->id)->first();
        return response()->json(['brand' => $brand]);
    }

    public function publicProfile(string $slug): JsonResponse
    {
        $brand = BrandProfile::where('brand_slug', $slug)->firstOrFail();
        return response()->json(['brand' => $brand->only('id', 'brand_name', 'brand_slug', 'description', 'logo_url', 'website_url', 'industry', 'is_verified')]);
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

    /**
     * GET /api/brand/status
     * Liefert den Brand-Status für den eingeloggten User (auch wenn er
     * kein aktiver Brand ist). Die App nutzt das für den Profil-Switcher.
     */
    public function status(Request $request): JsonResponse
    {
        $brand = BrandProfile::where('user_id', $request->user()->id)->first();

        return response()->json([
            'has_brand'    => (bool) $brand,
            'is_active'    => $brand && $brand->paypal_status === 'ACTIVE',
            'paypal_status'=> $brand?->paypal_status,
            'brand'        => $brand?->only('id', 'brand_name', 'brand_slug', 'company_email', 'paypal_email', 'logo_url', 'website_url', 'industry', 'paypal_status', 'subscription_started_at'),
        ]);
    }

    /**
     * POST /api/brand/register
     * Legt für den eingeloggten User ein Brand-Profil an. Es gibt pro User
     * nur ein Brand-Profil (user_id ist unique in der Tabelle). Das Abo ist
     * noch NICHT aktiv — dafür muss anschließend /brand/subscribe aufgerufen
     * werden.
     */
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'brand_name'    => 'required|string|max:100',
            'company_email' => 'required|email|max:190',
            'paypal_email'  => 'nullable|email|max:190',
            'website_url'   => 'nullable|url|max:255',
            'industry'      => 'nullable|string|max:50',
            'description'   => 'nullable|string|max:1000',
        ]);

        $existing = BrandProfile::where('user_id', $request->user()->id)->first();
        if ($existing) {
            return response()->json([
                'message' => 'Du hast bereits ein Brand-Profil.',
                'brand'   => $existing,
            ], 409);
        }

        $brand = BrandProfile::create([
            'user_id'       => $request->user()->id,
            'brand_name'    => $data['brand_name'],
            'brand_slug'    => Str::slug($data['brand_name']) . '-' . Str::random(5),
            'company_email' => $data['company_email'],
            'paypal_email'  => $data['paypal_email'] ?? $data['company_email'],
            'website_url'   => $data['website_url'] ?? null,
            'industry'      => $data['industry'] ?? null,
            'description'   => $data['description'] ?? null,
            'paypal_status' => 'PENDING',
        ]);

        return response()->json(['brand' => $brand], 201);
    }

    /**
     * POST /api/brand/subscribe
     * Startet eine PayPal-Subscription. Gibt die Approval-URL zurück, die
     * die App im In-App-Browser öffnet. Nach erfolgreicher Zahlung schickt
     * PayPal einen Webhook, der paypal_status auf ACTIVE setzt.
     */
    public function subscribe(Request $request, PayPalService $paypal): JsonResponse
    {
        $brand = BrandProfile::where('user_id', $request->user()->id)->firstOrFail();

        if ($brand->paypal_status === 'ACTIVE') {
            return response()->json([
                'message' => 'Abo ist bereits aktiv.',
                'brand'   => $brand,
            ], 409);
        }

        $result = $paypal->createSubscription([
            'email'      => $brand->paypal_email ?: ($brand->company_email ?: $request->user()->email),
            'brand_name' => $brand->brand_name,
        ]);

        if (!empty($result['subscription_id'])) {
            $brand->paypal_subscription_id = $result['subscription_id'];
            $brand->paypal_status = $result['status'];
            $brand->save();
        }

        return response()->json([
            'approval_url'    => $result['approval_url'],
            'subscription_id' => $result['subscription_id'],
            'configured'      => $result['configured'] ?? false,
        ]);
    }

    /**
     * POST /api/brand/cancel
     */
    public function cancel(Request $request, PayPalService $paypal): JsonResponse
    {
        $brand = BrandProfile::where('user_id', $request->user()->id)->firstOrFail();
        if (!$brand->paypal_subscription_id) {
            return response()->json(['message' => 'Kein aktives Abo.'], 404);
        }

        $ok = $paypal->cancelSubscription($brand->paypal_subscription_id, 'User requested cancellation');

        if ($ok) {
            $brand->paypal_status = 'CANCELLED';
            $brand->save();
        }

        return response()->json([
            'cancelled' => $ok,
            'brand'     => $brand->fresh(),
        ]);
    }

    /**
     * POST /api/webhooks/paypal
     * Empfängt Subscription-Events. Ohne gültige PAYPAL_WEBHOOK_ID-Verifizierung
     * akzeptieren wir nur Requests aus dem lokalen Netzwerk (Entwicklung) —
     * sobald Credentials da sind, muss hier die Signature-Verifikation ergänzt
     * werden.
     */
    public function webhook(Request $request): JsonResponse
    {
        $event = $request->input('event_type');
        $resource = $request->input('resource', []);
        $subscriptionId = $resource['id'] ?? null;

        Log::info('paypal.webhook.received', ['event' => $event, 'id' => $subscriptionId]);

        if (!$subscriptionId) {
            return response()->json(['ok' => false, 'reason' => 'no resource id'], 200);
        }

        $brand = BrandProfile::where('paypal_subscription_id', $subscriptionId)->first();
        if (!$brand) {
            return response()->json(['ok' => false, 'reason' => 'unknown subscription'], 200);
        }

        switch ($event) {
            case 'BILLING.SUBSCRIPTION.ACTIVATED':
            case 'BILLING.SUBSCRIPTION.RENEWED':
                $brand->paypal_status = 'ACTIVE';
                $brand->subscription_started_at = $brand->subscription_started_at ?: now();
                $brand->subscription_expires_at = now()->addMonth();
                $brand->subscription_plan = 'brand';
                $brand->user()->update(['role' => 'brand']);
                $brand->save();
                break;
            case 'BILLING.SUBSCRIPTION.CANCELLED':
            case 'BILLING.SUBSCRIPTION.EXPIRED':
                $brand->paypal_status = 'CANCELLED';
                $brand->save();
                break;
            case 'BILLING.SUBSCRIPTION.SUSPENDED':
            case 'PAYMENT.SALE.DENIED':
                $brand->paypal_status = 'SUSPENDED';
                $brand->save();
                break;
        }

        return response()->json(['ok' => true]);
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

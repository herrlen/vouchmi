<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Subscription;
use App\Services\PayPalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InfluencerController extends Controller
{
    /**
     * POST /api/influencer/register
     * Setzt die Rolle auf 'influencer'. Das Abo ist noch nicht aktiv —
     * dafür muss /influencer/subscribe aufgerufen werden.
     */
    public function register(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->role === 'influencer') {
            return response()->json(['message' => 'Du bist bereits Influencer.'], 409);
        }

        if ($user->role === 'brand') {
            return response()->json(['message' => 'Brands können nicht gleichzeitig Influencer sein.'], 422);
        }

        $user->update(['role' => 'influencer']);

        return response()->json(['message' => 'Rolle auf Influencer gesetzt.', 'user' => $user->fresh()], 200);
    }

    /**
     * POST /api/influencer/subscribe
     * Startet eine PayPal-Subscription für den Influencer-Plan.
     */
    public function subscribe(Request $request, PayPalService $paypal): JsonResponse
    {
        $user = $request->user();

        if ($user->role !== 'influencer') {
            return response()->json(['message' => 'Nur Influencer können dieses Abo abschließen.'], 403);
        }

        if ($user->hasActiveSubscription('influencer')) {
            return response()->json(['message' => 'Abo ist bereits aktiv.'], 409);
        }

        $result = $paypal->createSubscription([
            'email'      => $user->email,
            'brand_name' => $user->display_name ?? $user->username,
            'plan_type'  => 'influencer',
        ]);

        if (!empty($result['subscription_id'])) {
            Subscription::create([
                'user_id'                => $user->id,
                'plan_type'              => 'influencer',
                'paypal_subscription_id' => $result['subscription_id'],
                'paypal_status'          => $result['status'],
            ]);
        }

        return response()->json([
            'approval_url'    => $result['approval_url'],
            'subscription_id' => $result['subscription_id'],
            'configured'      => $result['configured'] ?? false,
        ]);
    }

    /**
     * POST /api/influencer/cancel
     */
    public function cancel(Request $request, PayPalService $paypal): JsonResponse
    {
        $user = $request->user();

        $subscription = $user->subscriptions()
            ->where('plan_type', 'influencer')
            ->where('paypal_status', 'ACTIVE')
            ->first();

        if (!$subscription) {
            return response()->json(['message' => 'Kein aktives Influencer-Abo.'], 404);
        }

        $ok = $paypal->cancelSubscription($subscription->paypal_subscription_id, 'User requested cancellation');

        if ($ok) {
            $subscription->update(['paypal_status' => 'CANCELLED']);
        }

        return response()->json([
            'cancelled'    => $ok,
            'subscription' => $subscription->fresh(),
        ]);
    }

    /**
     * GET /api/influencer/status
     */
    public function status(Request $request): JsonResponse
    {
        $user = $request->user();

        $subscription = $user->subscriptions()
            ->where('plan_type', 'influencer')
            ->latest()
            ->first();

        return response()->json([
            'is_influencer' => $user->role === 'influencer',
            'is_active'     => $subscription && $subscription->paypal_status === 'ACTIVE',
            'paypal_status' => $subscription?->paypal_status,
            'started_at'    => $subscription?->started_at,
        ]);
    }
}

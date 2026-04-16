<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\TierProgressionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TierController extends Controller
{
    public function __construct(private TierProgressionService $tiers) {}

    public function status(Request $request): JsonResponse
    {
        $status = $this->tiers->getUserTierStatus($request->user());
        return response()->json($status);
    }

    public function upgradeToInfluencer(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->role !== 'user') {
            return response()->json(['message' => 'Du bist bereits Influencer oder Brand.'], 422);
        }

        $status = $this->tiers->getUserTierStatus($user);
        if (!$status['eligible_for_upgrade']) {
            return response()->json(['message' => 'Du erfüllst die Voraussetzungen noch nicht.'], 422);
        }

        $this->tiers->promoteUser(
            $user,
            'bronze',
            $status['follower_count'],
            $status['recommendation_count']
        );

        return response()->json([
            'message' => 'Herzlichen Glückwunsch! Du bist jetzt Bronze-Creator.',
            'tier' => 'bronze',
            'role' => 'influencer',
        ]);
    }

    public function dismissUpgradePrompt(Request $request): JsonResponse
    {
        // Speichere Dismiss-Zeitpunkt um Reminder-Logik zu steuern
        $user = $request->user();
        $user->update(['tier_below_threshold_since' => now()]); // Reuse Feld als dismiss tracker für "none" tier
        return response()->json(['dismissed' => true]);
    }
}

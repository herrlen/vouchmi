<?php

namespace App\Services;

use App\Models\TierHistory;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class TierProgressionService
{
    private const TIERS = [
        'none'   => ['followers' => 0,       'recommendations' => 0],
        'bronze' => ['followers' => 1000,     'recommendations' => 25],
        'silver' => ['followers' => 10000,    'recommendations' => 200],
        'gold'   => ['followers' => 100000,   'recommendations' => 1000],
    ];

    private const TIER_ORDER = ['none', 'bronze', 'silver', 'gold'];

    public function checkUser(User $user): void
    {
        $followers = DB::table('follows')->where('following_id', $user->id)->count();
        $recommendations = DB::table('posts')->where('author_id', $user->id)->count();

        $qualifiedTier = $this->getQualifiedTier($followers, $recommendations);
        $currentTier = $user->tier ?? 'none';

        $currentIdx = array_search($currentTier, self::TIER_ORDER);
        $qualifiedIdx = array_search($qualifiedTier, self::TIER_ORDER);

        if ($qualifiedIdx > $currentIdx) {
            // Aufstieg
            $this->promoteUser($user, $qualifiedTier, $followers, $recommendations);
        } elseif ($qualifiedIdx < $currentIdx) {
            // Möglicher Abstieg — Verblassungslogik
            $this->handlePotentialDemotion($user, $qualifiedTier, $followers, $recommendations);
        } else {
            // Gleicher Tier — Opazität aktualisieren und threshold reset
            $user->update([
                'tier_badge_opacity' => $this->calculateOpacity($user, $followers),
                'tier_below_threshold_since' => null,
            ]);
        }
    }

    public function calculateOpacity(User $user, int $currentFollowers): float
    {
        $tier = $user->tier ?? 'none';
        if ($tier === 'none') return 1.0;

        $threshold = self::TIERS[$tier]['followers'];
        if ($currentFollowers >= $threshold) return 1.0;

        $ratio = $currentFollowers / $threshold;
        if ($ratio >= 0.8) return 0.70;
        if ($ratio >= 0.5) return 0.40;

        return 0.40;
    }

    public function promoteUser(User $user, string $newTier, int $followers, int $recommendations): void
    {
        $oldTier = $user->tier ?? 'none';

        TierHistory::create([
            'user_id' => $user->id,
            'from_tier' => $oldTier,
            'to_tier' => $newTier,
            'change_type' => 'promotion',
            'follower_count_at_change' => $followers,
            'recommendation_count_at_change' => $recommendations,
        ]);

        $updateData = [
            'tier' => $newTier,
            'tier_achieved_at' => now(),
            'tier_badge_opacity' => 1.00,
            'tier_below_threshold_since' => null,
        ];

        // Bei Bronze-Aufstieg von User → Influencer upgraden
        if ($oldTier === 'none' && $newTier === 'bronze' && $user->role === 'user') {
            $updateData['role'] = 'influencer';
        }

        $user->update($updateData);
    }

    public function demoteUser(User $user, string $newTier, int $followers, int $recommendations): void
    {
        $oldTier = $user->tier ?? 'none';

        TierHistory::create([
            'user_id' => $user->id,
            'from_tier' => $oldTier,
            'to_tier' => $newTier,
            'change_type' => 'demotion',
            'follower_count_at_change' => $followers,
            'recommendation_count_at_change' => $recommendations,
        ]);

        $user->update([
            'tier' => $newTier,
            'tier_achieved_at' => $newTier === 'none' ? null : now(),
            'tier_badge_opacity' => $newTier === 'none' ? 1.00 : $this->calculateOpacity($user, $followers),
            'tier_below_threshold_since' => null,
        ]);
    }

    public function getUserTierStatus(User $user): array
    {
        $followers = DB::table('follows')->where('following_id', $user->id)->count();
        $recommendations = DB::table('posts')->where('author_id', $user->id)->count();
        $currentTier = $user->tier ?? 'none';
        $currentIdx = array_search($currentTier, self::TIER_ORDER);

        $nextTier = $currentIdx < count(self::TIER_ORDER) - 1 ? self::TIER_ORDER[$currentIdx + 1] : null;
        $progress = null;

        if ($nextTier) {
            $req = self::TIERS[$nextTier];
            $progress = [
                'followers' => [
                    'current' => $followers,
                    'required' => $req['followers'],
                    'percent' => min(100, round($followers / max(1, $req['followers']) * 100, 1)),
                ],
                'recommendations' => [
                    'current' => $recommendations,
                    'required' => $req['recommendations'],
                    'percent' => min(100, round($recommendations / max(1, $req['recommendations']) * 100, 1)),
                ],
            ];
        }

        // Check if user qualifies for upgrade prompt (user → influencer/bronze)
        $eligible = $currentTier === 'none'
            && $user->role === 'user'
            && $followers >= self::TIERS['bronze']['followers']
            && $recommendations >= self::TIERS['bronze']['recommendations'];

        return [
            'tier' => $currentTier,
            'badge_opacity' => (float) ($user->tier_badge_opacity ?? 1.0),
            'follower_count' => $followers,
            'recommendation_count' => $recommendations,
            'next_tier' => $nextTier,
            'progress_to_next' => $progress,
            'eligible_for_upgrade' => $eligible,
        ];
    }

    private function getQualifiedTier(int $followers, int $recommendations): string
    {
        $qualified = 'none';
        foreach (self::TIERS as $tier => $req) {
            if ($tier === 'none') continue;
            if ($followers >= $req['followers'] && $recommendations >= $req['recommendations']) {
                $qualified = $tier;
            }
        }
        return $qualified;
    }

    private function handlePotentialDemotion(User $user, string $qualifiedTier, int $followers, int $recommendations): void
    {
        $tier = $user->tier ?? 'none';
        $threshold = self::TIERS[$tier]['followers'];
        $ratio = $threshold > 0 ? $followers / $threshold : 1;

        // Unter 50% der Schwelle?
        if ($ratio < 0.5) {
            if (!$user->tier_below_threshold_since) {
                // Timer starten
                $user->update([
                    'tier_below_threshold_since' => now(),
                    'tier_badge_opacity' => 0.40,
                ]);
            } elseif ($user->tier_below_threshold_since->diffInDays(now()) >= 30) {
                // 30 Tage abgelaufen → Abstieg
                $this->demoteUser($user, $qualifiedTier, $followers, $recommendations);
            }
        } else {
            // Über 50% — Opazität anpassen, kein Abstieg
            $user->update([
                'tier_badge_opacity' => $this->calculateOpacity($user, $followers),
                'tier_below_threshold_since' => null,
            ]);
        }
    }
}

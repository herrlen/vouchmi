<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Boost;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Services\TopupGuard;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Internal monitoring endpoint for the credits/boost system.
 *
 * Authenticated via a static bearer token (CREDITS_MONITORING_TOKEN).
 * Designed to be scraped by Grafana/Datadog every minute. Returns
 * aggregated counters for three time windows so dashboards can render
 * short- and long-term trends from a single call.
 *
 * Keep the payload small and DB-cheap — this endpoint runs often.
 */
class CreditsHealthController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $expected = (string) config('credits.monitoring_token', '');
        if ($expected === '') {
            return response()->json(['error' => 'disabled'], 503);
        }
        if (!hash_equals($expected, (string) $request->bearerToken())) {
            return response()->json(['error' => 'unauthorized'], 401);
        }

        $now = now();

        return response()->json([
            'generated_at' => $now->toIso8601String(),
            'enabled'      => (bool) config('credits.enabled'),
            'windows' => [
                '15m' => $this->snapshot($now->copy()->subMinutes(15)),
                '24h' => $this->snapshot($now->copy()->subHours(24)),
                '7d'  => $this->snapshot($now->copy()->subDays(7)),
            ],
            'wallets' => [
                'total_count'           => (int) Wallet::count(),
                'total_balance_credits' => (int) Wallet::sum('balance_credits'),
            ],
            'boosts' => [
                'active_now' => (int) Boost::where('status', Boost::STATUS_ACTIVE)
                    ->where('ends_at', '>', $now)->count(),
            ],
            'guard' => [
                'new_user_cap_rejections_24h' => array_sum(TopupGuard::recentRejections(24)),
                'new_user_cap_rejections_per_hour' => TopupGuard::recentRejections(24),
            ],
        ]);
    }

    /**
     * One time-window snapshot. Returns counts + sums grouped by transaction
     * type and provider — enough for Grafana's panels.
     */
    private function snapshot(Carbon $since): array
    {
        $byType = WalletTransaction::query()
            ->where('created_at', '>=', $since)
            ->select('type', 'status', DB::raw('COUNT(*) as cnt'), DB::raw('COALESCE(SUM(credits_delta), 0) as credits_sum'), DB::raw('COALESCE(SUM(currency_amount_cents), 0) as cents_sum'))
            ->groupBy('type', 'status')
            ->get();

        $topupsByProvider = WalletTransaction::query()
            ->where('created_at', '>=', $since)
            ->where('type', WalletTransaction::TYPE_TOPUP)
            ->where('status', WalletTransaction::STATUS_COMPLETED)
            ->select('payment_provider', DB::raw('COUNT(*) as cnt'), DB::raw('COALESCE(SUM(credits_delta), 0) as credits_sum'), DB::raw('COALESCE(SUM(currency_amount_cents), 0) as cents_sum'))
            ->groupBy('payment_provider')
            ->get();

        $boostCount = Boost::where('created_at', '>=', $since)->count();
        $boostSpendCents = (int) WalletTransaction::where('created_at', '>=', $since)
            ->where('type', WalletTransaction::TYPE_BOOST_SPEND)
            ->where('status', WalletTransaction::STATUS_COMPLETED)
            ->sum('credits_delta'); // negative

        $reversalCents = (int) WalletTransaction::where('created_at', '>=', $since)
            ->where('type', WalletTransaction::TYPE_REVERSAL)
            ->sum('credits_delta');

        return [
            'since'             => $since->toIso8601String(),
            'transactions'      => $byType->groupBy('type')->map(function ($rows) {
                return $rows->mapWithKeys(fn ($r) => [
                    $r->status => [
                        'count'         => (int) $r->cnt,
                        'credits_sum'   => (int) $r->credits_sum,
                        'cents_sum'     => (int) $r->cents_sum,
                    ],
                ]);
            }),
            'topups_by_provider' => $topupsByProvider->mapWithKeys(fn ($r) => [
                (string) ($r->payment_provider ?? 'unknown') => [
                    'count'       => (int) $r->cnt,
                    'credits_sum' => (int) $r->credits_sum,
                    'cents_sum'   => (int) $r->cents_sum,
                ],
            ]),
            'boost_count'         => $boostCount,
            'boost_credits_spent' => abs($boostSpendCents),
            'reversal_credits'    => $reversalCents,
        ];
    }
}

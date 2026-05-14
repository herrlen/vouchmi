<?php

namespace App\Services;

use App\Models\User;
use App\Models\WalletTransaction;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

/**
 * Anti-fraud gate that sits in front of every topup path (PayPal + Apple).
 *
 * Currently enforces a single rule: in the first N days after registration,
 * a user may topup at most X € (sum of all completed topups). The rule is
 * configurable via config/credits.php and is intended to slow down
 * "register → topup → refund → repeat" abuse patterns.
 *
 * Reversed/refunded transactions still count toward the cap — the point is
 * to make rapid-fire abuse unattractive, not to fairly track net spending.
 */
class TopupGuard
{
    public const REJECT_NEW_USER_CAP = 'new_user_cap';

    /**
     * Returns null if the topup is allowed, or a string reason if rejected.
     */
    public function check(User $user, int $amountCents): ?string
    {
        $capCents = (int) config('credits.new_user_topup_cap_cents', 0);
        $windowDays = (int) config('credits.new_user_window_days', 0);

        if ($capCents <= 0 || $windowDays <= 0) {
            return null;
        }

        // User is past the new-user window — no cap applies.
        $createdAt = $user->created_at instanceof Carbon ? $user->created_at : null;
        if (!$createdAt || $createdAt->lessThan(now()->subDays($windowDays))) {
            return null;
        }

        $alreadyToppedUp = (int) WalletTransaction::query()
            ->whereHas('wallet', fn ($q) => $q->where('user_id', $user->id))
            ->where('type', WalletTransaction::TYPE_TOPUP)
            ->whereNotNull('currency_amount_cents')
            ->sum('currency_amount_cents');

        if ($alreadyToppedUp + $amountCents > $capCents) {
            $this->bumpRejectionCounter(self::REJECT_NEW_USER_CAP);
            return self::REJECT_NEW_USER_CAP;
        }

        return null;
    }

    /**
     * Atomic per-hour counter so Grafana can plot rejection rates without
     * trawling the application log. Each bucket TTLs after 72h.
     */
    private function bumpRejectionCounter(string $reason): void
    {
        $key = sprintf('topup_guard:reject:%s:%s', $reason, now()->format('Y-m-d-H'));
        Cache::increment($key);
        Cache::put($key, Cache::get($key, 1), now()->addHours(72));
    }

    /**
     * Read recent rejection counts for the monitoring endpoint.
     * Returns counts bucketed by hour for the last $hours hours.
     *
     * @return array<string, int>
     */
    public static function recentRejections(int $hours = 24, string $reason = self::REJECT_NEW_USER_CAP): array
    {
        $out = [];
        for ($i = $hours - 1; $i >= 0; $i--) {
            $bucket = now()->subHours($i)->format('Y-m-d-H');
            $key = sprintf('topup_guard:reject:%s:%s', $reason, $bucket);
            $out[$bucket] = (int) Cache::get($key, 0);
        }
        return $out;
    }

    public function remainingCapCents(User $user): ?int
    {
        $capCents = (int) config('credits.new_user_topup_cap_cents', 0);
        $windowDays = (int) config('credits.new_user_window_days', 0);
        if ($capCents <= 0 || $windowDays <= 0) {
            return null;
        }
        $createdAt = $user->created_at instanceof Carbon ? $user->created_at : null;
        if (!$createdAt || $createdAt->lessThan(now()->subDays($windowDays))) {
            return null;
        }

        $alreadyToppedUp = (int) WalletTransaction::query()
            ->whereHas('wallet', fn ($q) => $q->where('user_id', $user->id))
            ->where('type', WalletTransaction::TYPE_TOPUP)
            ->whereNotNull('currency_amount_cents')
            ->sum('currency_amount_cents');

        return max(0, $capCents - $alreadyToppedUp);
    }
}

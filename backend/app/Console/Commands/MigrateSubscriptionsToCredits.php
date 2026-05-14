<?php

namespace App\Console\Commands;

use App\Models\Subscription;
use App\Models\WalletTransaction;
use App\Services\WalletService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * One-shot migration: convert remaining time on every active subscription
 * into wallet credits + a goodwill bonus.
 *
 * SAFETY: Defaults to --dry-run. Production run requires --confirm.
 * Re-runs are idempotent: each subscription gets a single
 * `migration_bonus` wallet_transaction keyed by `migrate:<subscription-id>`.
 */
class MigrateSubscriptionsToCredits extends Command
{
    protected $signature = 'subscriptions:migrate-to-credits
        {--confirm : Tatsächlich ausführen (sonst Dry-Run)}
        {--rate=2 : € pro verbleibendem Tag (Influencer=1, Brand=2 typisch)}
        {--credits-per-euro=100 : Wie viele Credits = 1 €}
        {--bonus-percent= : Override für migration_bonus_percent aus credits.php}
        {--limit=0 : Nur die ersten N Subscriptions verarbeiten (0 = alle)}';

    protected $description = 'Konvertiert aktive Abos in Vouchmi-Credits (Pro-rata-Restlaufzeit + Goodwill-Bonus).';

    public function handle(WalletService $wallets): int
    {
        $dryRun = !$this->option('confirm');
        $rateEurPerDay = (float) $this->option('rate');
        $creditsPerEur = (int) $this->option('credits-per-euro');
        $bonusPercentOpt = $this->option('bonus-percent');
        $bonusPercent = $bonusPercentOpt !== null
            ? (float) $bonusPercentOpt
            : (float) config('credits.migration_bonus_percent', 20);
        $limit = (int) $this->option('limit');

        if ($dryRun) {
            $this->warn('DRY-RUN — nichts wird geschrieben. Mit --confirm tatsächlich ausführen.');
        } else {
            $this->info('PRODUCTION RUN — schreibe Buchungen in die DB.');
        }
        $this->newLine();
        $this->info(sprintf(
            'Rate: %s €/Tag · 1 € = %d Credits · Bonus: %s %%',
            number_format($rateEurPerDay, 2, ',', '.'),
            $creditsPerEur,
            number_format($bonusPercent, 1, ',', '.'),
        ));
        $this->newLine();

        $now = now();
        $query = Subscription::query()
            ->whereIn('status', ['active', 'grace_period'])
            ->where(function ($q) use ($now) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', $now);
            })
            ->orderBy('user_id');
        if ($limit > 0) {
            $query->limit($limit);
        }

        $stats = [
            'considered' => 0,
            'skipped_no_expires_at' => 0,
            'skipped_already_migrated' => 0,
            'migrated' => 0,
            'total_credits' => 0,
            'errors' => 0,
        ];

        foreach ($query->cursor() as $subscription) {
            $stats['considered']++;
            try {
                $result = $this->migrateOne(
                    $subscription,
                    $now,
                    $rateEurPerDay,
                    $creditsPerEur,
                    $bonusPercent,
                    $dryRun,
                    $wallets,
                );
                if ($result['skipped'] ?? false) {
                    $stats['skipped_' . $result['reason']]++;
                    continue;
                }
                $stats['migrated']++;
                $stats['total_credits'] += $result['credits'];
            } catch (\Throwable $e) {
                $stats['errors']++;
                $this->error(sprintf(
                    '  ! Sub %s (%s): %s',
                    substr($subscription->id, 0, 8),
                    $subscription->plan_type,
                    $e->getMessage(),
                ));
                Log::error('migration.subscription_failed', [
                    'subscription_id' => $subscription->id,
                    'reason'          => $e->getMessage(),
                ]);
            }
        }

        $this->newLine();
        $this->info('Zusammenfassung:');
        foreach ($stats as $k => $v) {
            $this->line("  $k: $v");
        }

        if ($dryRun) {
            $this->newLine();
            $this->warn('DRY-RUN abgeschlossen. Mit --confirm in Production.');
        }

        return self::SUCCESS;
    }

    /**
     * @return array{skipped?:bool,reason?:string,credits?:int}
     */
    private function migrateOne(
        Subscription $subscription,
        Carbon $now,
        float $rateEurPerDay,
        int $creditsPerEur,
        float $bonusPercent,
        bool $dryRun,
        WalletService $wallets,
    ): array {
        $idempotencyKey = 'migrate:' . $subscription->id;
        $alreadyMigrated = WalletTransaction::where('idempotency_key', $idempotencyKey)->first();
        if ($alreadyMigrated) {
            return ['skipped' => true, 'reason' => 'already_migrated'];
        }

        // Pro-rata: Tage zwischen now() und expires_at. Fehlt expires_at, kann
        // keine faire Konvertierung berechnet werden — überspringen und
        // separat im Log markieren.
        $expiresAt = $subscription->expires_at;
        if (!$expiresAt) {
            return ['skipped' => true, 'reason' => 'no_expires_at'];
        }

        $daysLeft = max(0, $now->diffInDays($expiresAt, false));
        if ($daysLeft <= 0) {
            return ['skipped' => true, 'reason' => 'no_expires_at'];
        }

        $baseEuros = $daysLeft * $rateEurPerDay;
        $baseCredits = (int) round($baseEuros * $creditsPerEur);
        $bonusCredits = (int) round($baseCredits * ($bonusPercent / 100));
        $totalCredits = $baseCredits + $bonusCredits;

        if ($totalCredits <= 0) {
            return ['skipped' => true, 'reason' => 'no_expires_at'];
        }

        $this->line(sprintf(
            '  %s %s: %d Tage × %s €/Tag × %d Credits = %d (+ %s%% Bonus = %d total)',
            substr($subscription->id, 0, 8),
            str_pad($subscription->plan_type, 10),
            $daysLeft,
            number_format($rateEurPerDay, 2, ',', '.'),
            $creditsPerEur,
            $baseCredits,
            number_format($bonusPercent, 0, ',', '.'),
            $totalCredits,
        ));

        if ($dryRun) {
            return ['credits' => $totalCredits];
        }

        DB::transaction(function () use ($subscription, $totalCredits, $baseCredits, $bonusCredits, $daysLeft, $idempotencyKey, $wallets) {
            $user = $subscription->user;
            if (!$user) {
                throw new \RuntimeException('Subscription has no user');
            }
            $wallet = $wallets->getOrCreateWallet($user);
            $wallets->credit(
                walletOrId: $wallet,
                credits: $totalCredits,
                idempotencyKey: $idempotencyKey,
                meta: [
                    'type'             => WalletTransaction::TYPE_MIGRATION_BONUS,
                    'payment_provider' => 'system',
                    'metadata' => [
                        'subscription_id' => $subscription->id,
                        'plan_type'       => $subscription->plan_type,
                        'days_left'       => $daysLeft,
                        'base_credits'    => $baseCredits,
                        'bonus_credits'   => $bonusCredits,
                    ],
                ],
            );
        });

        return ['credits' => $totalCredits];
    }
}

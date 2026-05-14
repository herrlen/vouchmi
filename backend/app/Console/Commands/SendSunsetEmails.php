<?php

namespace App\Console\Commands;

use App\Models\Subscription;
use App\Models\User;
use App\Models\WalletTransaction;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Sends the sunset campaign emails to all users with an active legacy
 * subscription. Two modes:
 *
 *   --mode=preview  →  "Dein Abo läuft am X aus, du bekommst Y Credits"
 *                      (zwei Wochen vor Sunset)
 *
 *   --mode=done     →  "Deine Credits sind jetzt aktiv"
 *                      (am Sunset-Tag, nachdem Migration-Command durchgelaufen ist)
 *
 * SAFETY: Defaults to --dry-run. Production run requires --confirm.
 */
class SendSunsetEmails extends Command
{
    protected $signature = 'subscriptions:sunset-emails
        {--mode=preview : preview | done}
        {--confirm : Tatsächlich versenden (sonst nur Vorschau)}
        {--sunset-date= : Datum fürs preview-Template (z.B. 2026-06-01)}
        {--bonus-percent= : Override für migration_bonus_percent}
        {--limit=0 : Nur die ersten N E-Mails senden}';

    protected $description = 'Versendet Sunset-Mails an Bestandskunden (Modi: preview / done).';

    public function handle(): int
    {
        $mode = (string) $this->option('mode');
        if (!in_array($mode, ['preview', 'done'], true)) {
            $this->error('Unbekannter Modus. Erlaubt: preview, done.');
            return self::FAILURE;
        }

        $dryRun = !$this->option('confirm');
        $sunsetDate = $this->option('sunset-date') ?: now()->addDays(14)->format('d.m.Y');
        $bonusPercentOpt = $this->option('bonus-percent');
        $bonusPercent = $bonusPercentOpt !== null
            ? (float) $bonusPercentOpt
            : (float) config('credits.migration_bonus_percent', 20);
        $limit = (int) $this->option('limit');

        if ($dryRun) {
            $this->warn('DRY-RUN — keine E-Mails versendet. Mit --confirm tatsächlich senden.');
        } else {
            $this->info('PRODUCTION RUN — E-Mails werden versendet.');
        }
        $this->info("Modus: $mode · Sunset-Datum: $sunsetDate · Bonus: $bonusPercent %");
        $this->newLine();

        $query = Subscription::query()
            ->with('user')
            ->whereIn('status', ['active', 'grace_period', 'cancelled', 'expired'])
            ->orderBy('user_id');

        if ($mode === 'preview') {
            // Preview geht nur an Abos, die noch aktiv sind.
            $query->whereIn('status', ['active', 'grace_period']);
        }

        if ($limit > 0) {
            $query->limit($limit);
        }

        $sent = 0;
        $skipped = 0;
        $errors = 0;
        $alreadySeen = [];

        foreach ($query->cursor() as $subscription) {
            $user = $subscription->user;
            if (!$user || !$user->email) {
                $skipped++;
                continue;
            }
            // Pro User nur eine E-Mail je Modus.
            if (isset($alreadySeen[$user->id])) {
                $skipped++;
                continue;
            }
            $alreadySeen[$user->id] = true;

            $credits = $this->expectedCreditsForUser($user, $subscription, $mode);
            if ($credits === null) {
                $skipped++;
                continue;
            }

            $this->line(sprintf(
                '  %s %s → %d Credits',
                str_pad($user->email, 32),
                str_pad($subscription->plan_type, 10),
                $credits,
            ));

            if ($dryRun) {
                continue;
            }

            try {
                $this->dispatchMail($mode, $user, $subscription, $credits, $sunsetDate, $bonusPercent);
                $sent++;
            } catch (\Throwable $e) {
                $errors++;
                $this->error('    ! ' . $e->getMessage());
                Log::error('migration.sunset_mail_failed', [
                    'user_id' => $user->id,
                    'mode'    => $mode,
                    'reason'  => $e->getMessage(),
                ]);
            }
        }

        $this->newLine();
        $this->info("Gesendet: $sent · Übersprungen: $skipped · Fehler: $errors");

        return self::SUCCESS;
    }

    /**
     * Im "done"-Modus lesen wir die tatsächlich gebuchten Credits aus den
     * Migration-Wallet-Transactions. Im "preview"-Modus schätzen wir sie
     * aus der Restlaufzeit — die echte Buchung passiert ja erst später.
     */
    private function expectedCreditsForUser(User $user, Subscription $subscription, string $mode): ?int
    {
        if ($mode === 'done') {
            $tx = WalletTransaction::where('idempotency_key', 'migrate:' . $subscription->id)
                ->where('type', WalletTransaction::TYPE_MIGRATION_BONUS)
                ->first();
            return $tx ? abs((int) $tx->credits_delta) : null;
        }

        // preview: gleiche Rechnung wie im Migrations-Command (Standard-Werte)
        $rateEurPerDay = $subscription->plan_type === 'brand' ? 2.0 : 1.0;
        $creditsPerEur = 100;
        $bonusPercent = (float) config('credits.migration_bonus_percent', 20);

        if (!$subscription->expires_at) return null;
        $daysLeft = max(0, now()->diffInDays($subscription->expires_at, false));
        if ($daysLeft <= 0) return null;

        $base = (int) round($daysLeft * $rateEurPerDay * $creditsPerEur);
        return $base + (int) round($base * ($bonusPercent / 100));
    }

    private function dispatchMail(string $mode, User $user, Subscription $subscription, int $credits, string $sunsetDate, float $bonusPercent): void
    {
        $view = $mode === 'preview' ? 'emails.sunset-preview' : 'emails.sunset-done';
        $subject = $mode === 'preview'
            ? 'Wichtige Änderung: Vouchmi wechselt zu Credits'
            : 'Deine Vouchmi-Credits sind aktiv';

        $data = [
            'displayName'     => $user->display_name ?: $user->username ?: 'dort',
            'planLabel'       => $subscription->plan_type === 'brand' ? 'Brand' : 'Influencer',
            'credits'         => $credits,
            'sunsetDate'      => $sunsetDate,
            'bonusPercent'    => (int) $bonusPercent,
            'paymentProvider' => $subscription->payment_provider,
            'walletUrl'       => 'https://app.vouchmi.com/wallet',
        ];

        Mail::send($view, $data, function ($message) use ($user, $subject) {
            $message->to($user->email, $user->display_name ?: $user->username)
                ->subject($subject);
        });
    }
}

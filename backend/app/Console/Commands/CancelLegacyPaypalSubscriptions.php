<?php

namespace App\Console\Commands;

use App\Models\Subscription;
use App\Services\PayPalService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Cancels all active PayPal-Subscriptions via the PayPal-Subscriptions-API.
 *
 * SAFETY: Defaults to --dry-run. Production run requires --confirm.
 * Apple subscriptions cannot be cancelled by us — only the user can disable
 * auto-renew in iOS Settings. The in-app banner takes care of that.
 *
 * Run order recommendation:
 *   1. subscriptions:migrate-to-credits --confirm   (credits buchen)
 *   2. subscriptions:paypal-cancel --confirm       (Abos kündigen)
 *   3. Email-Kampagne raus
 *   4. credits.subscriptions_sunset = true
 */
class CancelLegacyPaypalSubscriptions extends Command
{
    protected $signature = 'subscriptions:paypal-cancel
        {--confirm : Tatsächlich Kündigen (sonst Dry-Run)}
        {--reason=Vouchmi wechselt zu Credits-Modell. Dein Restguthaben wurde dir gutgeschrieben.}
        {--limit=0 : Nur die ersten N Subscriptions verarbeiten}
        {--sleep=200 : Millisekunden Pause zwischen API-Calls (Rate-Limiting)}';

    protected $description = 'Kündigt alle aktiven PayPal-Subscriptions bei PayPal (kein Apple — siehe Banner in App).';

    public function handle(PayPalService $paypal): int
    {
        $dryRun = !$this->option('confirm');
        $reason = (string) $this->option('reason');
        $limit = (int) $this->option('limit');
        $sleepMs = max(0, (int) $this->option('sleep'));

        if ($dryRun) {
            $this->warn('DRY-RUN — keine Cancel-Calls. Mit --confirm tatsächlich kündigen.');
        } else {
            $this->info('PRODUCTION RUN — sende Cancel-Requests an PayPal.');
            if (!$paypal->isConfigured()) {
                $this->error('PayPal-Service ist nicht konfiguriert (siehe config/services.php).');
                return self::FAILURE;
            }
        }
        $this->newLine();

        $query = Subscription::query()
            ->where('payment_provider', 'paypal')
            ->whereNotNull('paypal_subscription_id')
            ->whereIn('paypal_status', ['ACTIVE', 'SUSPENDED'])
            ->orderBy('user_id');
        if ($limit > 0) {
            $query->limit($limit);
        }

        $stats = [
            'considered' => 0,
            'cancelled'  => 0,
            'failed'     => 0,
            'skipped'    => 0,
        ];

        foreach ($query->cursor() as $subscription) {
            $stats['considered']++;
            $subId = (string) $subscription->paypal_subscription_id;
            $this->line(sprintf(
                '  %s %s %s',
                substr($subscription->id, 0, 8),
                str_pad($subscription->plan_type, 10),
                $subId,
            ));

            if ($dryRun) {
                $stats['skipped']++;
                continue;
            }

            try {
                $ok = $paypal->cancelSubscription($subId, $reason);
                if ($ok) {
                    $stats['cancelled']++;
                    $subscription->forceFill([
                        'paypal_status' => 'CANCELLED',
                        'status'        => 'cancelled',
                        'auto_renew'    => false,
                    ])->save();
                } else {
                    $stats['failed']++;
                    $this->error("    ! cancel returned false");
                    Log::warning('migration.paypal_cancel_failed', [
                        'subscription_id'      => $subscription->id,
                        'paypal_subscription'  => $subId,
                    ]);
                }
            } catch (\Throwable $e) {
                $stats['failed']++;
                $this->error("    ! " . $e->getMessage());
                Log::error('migration.paypal_cancel_exception', [
                    'subscription_id' => $subscription->id,
                    'reason'          => $e->getMessage(),
                ]);
            }

            if ($sleepMs > 0) {
                usleep($sleepMs * 1000);
            }
        }

        $this->newLine();
        $this->info('Zusammenfassung:');
        foreach ($stats as $k => $v) {
            $this->line("  $k: $v");
        }

        return self::SUCCESS;
    }
}

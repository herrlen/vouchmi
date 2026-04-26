<?php

namespace App\Console\Commands;

use App\Services\PayPalService;
use Illuminate\Console\Command;

class PayPalHealthCheck extends Command
{
    protected $signature = 'vouchmi:paypal:health';

    protected $description = 'Verifies PayPal credentials, plans, and webhook are wired up (sandbox oder live).';

    public function handle(PayPalService $paypal): int
    {
        $report = $paypal->healthCheck();

        $this->newLine();
        $this->line("<fg=cyan>PayPal Health Check</> — mode=<fg=yellow>{$report['mode']}</>");
        $this->newLine();

        $this->status($report['configured'], 'Credentials gesetzt', 'PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET fehlen');
        if (!$report['configured']) return $this->finish($report);

        $this->status($report['oauth'], 'OAuth Access-Token bezogen', 'OAuth fehlgeschlagen — Credentials falsch oder MODE passt nicht zum Account');
        if (!$report['oauth']) return $this->finish($report);

        foreach (['brand', 'influencer', 'legacy'] as $label) {
            $plan = $report['plans'][$label] ?? ['set' => false];
            if (!$plan['set']) {
                $envKey = match ($label) {
                    'brand'      => 'PAYPAL_PLAN_ID_BRAND',
                    'influencer' => 'PAYPAL_PLAN_ID_INFLUENCER',
                    'legacy'     => 'PAYPAL_PLAN_ID',
                };
                if ($label === 'legacy') {
                    $this->line("  <fg=gray>○</> {$envKey} nicht gesetzt (optional, nur Bestandskunden)");
                } else {
                    $this->line("  <fg=red>✗</> {$envKey} nicht gesetzt");
                }
                continue;
            }
            if ($plan['valid'] ?? false) {
                $status = $plan['status'] ?? '?';
                $this->line("  <fg=green>✓</> Plan <fg=yellow>{$label}</>: {$plan['name']} ({$status}) — {$plan['id']}");
            } else {
                $http = $plan['http'] ?? '?';
                $this->line("  <fg=red>✗</> Plan {$label} ({$plan['id']}) nicht gefunden (HTTP {$http})");
            }
        }

        $this->newLine();

        if ($report['webhook'] === null) {
            $this->line('  <fg=red>✗</> PAYPAL_WEBHOOK_ID nicht gesetzt — Signatur-Verifikation deaktiviert');
        } elseif ($report['webhook']['valid'] ?? false) {
            $eventCount = count($report['webhook']['events'] ?? []);
            $this->line("  <fg=green>✓</> Webhook registriert: {$report['webhook']['url']} ({$eventCount} Events)");
        } else {
            $http = $report['webhook']['http'] ?? '?';
            $this->line("  <fg=red>✗</> Webhook {$report['webhook']['id']} nicht gefunden (HTTP {$http})");
        }

        return $this->finish($report);
    }

    private function status(bool $ok, string $okMsg, string $failMsg): void
    {
        if ($ok) {
            $this->line("  <fg=green>✓</> {$okMsg}");
        } else {
            $this->line("  <fg=red>✗</> {$failMsg}");
        }
    }

    private function finish(array $report): int
    {
        $this->newLine();
        if (empty($report['errors'])) {
            $this->info('Alles grün — PayPal ist einsatzbereit.');
            return self::SUCCESS;
        }
        $this->warn('Zu beheben:');
        foreach ($report['errors'] as $err) {
            $this->line("  • {$err}");
        }
        $this->newLine();
        return self::FAILURE;
    }
}

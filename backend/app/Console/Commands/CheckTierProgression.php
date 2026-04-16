<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\TierProgressionService;
use Illuminate\Console\Command;

class CheckTierProgression extends Command
{
    protected $signature = 'tiers:check-progression';
    protected $description = 'Prüft Tier-Fortschritt für alle User und Influencer';

    public function handle(TierProgressionService $service): int
    {
        $users = User::whereIn('role', ['user', 'influencer'])
            ->whereIn('tier', ['none', 'bronze', 'silver', 'gold'])
            ->cursor();

        $checked = 0;
        foreach ($users as $user) {
            $service->checkUser($user);
            $checked++;
        }

        $this->info("Tier-Check abgeschlossen: {$checked} User geprüft.");
        return self::SUCCESS;
    }
}

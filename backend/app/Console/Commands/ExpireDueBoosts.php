<?php

namespace App\Console\Commands;

use App\Services\BoostService;
use Illuminate\Console\Command;

class ExpireDueBoosts extends Command
{
    protected $signature = 'boosts:expire';
    protected $description = 'Markiert abgelaufene Boosts als expired und invalidiert deren Multiplier-Cache';

    public function handle(BoostService $service): int
    {
        $count = $service->expireDueBoosts();
        $this->info("Boosts expired: {$count}.");
        return self::SUCCESS;
    }
}

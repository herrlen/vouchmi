<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class VouchmiSeedCommand extends Command
{
    protected $signature = 'vouchmi:seed {--fresh}';
    protected $description = 'Seed Vouchmi with realistic demo data';

    public function handle(): int
    {
        if (app()->environment('production')) {
            $this->error('Refusing to run against production.');
            return 1;
        }

        if ($this->option('fresh')) {
            $this->call('migrate:fresh');
        }

        $this->call('db:seed', ['--class' => 'Database\\Seeders\\VouchmiSeedSeeder']);
        $this->info('✓ Vouchmi seed data loaded.');
        $this->line('');
        $this->line('Demo accounts:');
        $this->line('  User:       review@vouchmi.com / VouchmiReview2026!');
        $this->line('  Influencer: influencer-demo@vouchmi.com / VouchmiReview2026!');
        $this->line('  Brand:      brand-demo@vouchmi.com / VouchmiReview2026!');

        return 0;
    }
}

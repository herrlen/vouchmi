<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->environment('production')) {
            $this->command->error('Seeding is disabled in production.');
            return;
        }

        $this->call(VouchmiSeedSeeder::class);
    }
}

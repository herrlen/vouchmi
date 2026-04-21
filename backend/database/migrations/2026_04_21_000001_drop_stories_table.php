<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('stories');
    }

    public function down(): void
    {
        // Intentionally empty — stories feature has been removed.
        // Original migration: 2026_04_12_120000_create_stories_table.php
    }
};

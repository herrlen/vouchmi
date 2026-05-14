<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('boosts', function (Blueprint $table) {
            // Optional list of community-ids the boost should be limited to.
            // NULL = no community filter (= ad reaches everyone in the author's
            // natural network — same as before this column existed).
            $table->json('target_community_ids')->nullable()->after('multiplier');
        });
    }

    public function down(): void
    {
        Schema::table('boosts', function (Blueprint $table) {
            $table->dropColumn('target_community_ids');
        });
    }
};

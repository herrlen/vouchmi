<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('community_members', function (Blueprint $table) {
            $table->timestamp('muted_until')->nullable()->after('joined_at');
            $table->string('muted_by')->nullable()->after('muted_until');
        });

        Schema::table('posts', function (Blueprint $table) {
            $table->boolean('is_hidden')->default(false)->after('click_count');
            $table->string('hidden_by')->nullable()->after('is_hidden');
        });
    }

    public function down(): void
    {
        Schema::table('community_members', function (Blueprint $table) {
            $table->dropColumn(['muted_until', 'muted_by']);
        });
        Schema::table('posts', function (Blueprint $table) {
            $table->dropColumn(['is_hidden', 'hidden_by']);
        });
    }
};

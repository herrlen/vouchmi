<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('community_members', function (Blueprint $table) {
            if (!Schema::hasColumn('community_members', 'last_read_chat_at')) {
                $table->timestamp('last_read_chat_at')->nullable()->after('joined_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('community_members', function (Blueprint $table) {
            if (Schema::hasColumn('community_members', 'last_read_chat_at')) {
                $table->dropColumn('last_read_chat_at');
            }
        });
    }
};

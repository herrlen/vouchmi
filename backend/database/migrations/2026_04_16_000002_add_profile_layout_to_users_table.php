<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('profile_layout', 20)->default('masonry')->after('role');
            $table->timestamp('profile_layout_updated_at')->nullable()->after('profile_layout');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['profile_layout', 'profile_layout_updated_at']);
        });
    }
};

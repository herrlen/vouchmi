<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('push_tokens', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('token', 200);
            $table->string('platform', 16);
            $table->string('app_version', 32)->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();

            $table->unique('token');
            $table->index(['user_id', 'platform']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('push_tokens');
    }
};

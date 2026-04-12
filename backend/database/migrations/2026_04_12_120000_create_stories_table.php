<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('stories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('community_id')->index();
            $table->uuid('author_id')->index();
            $table->string('media_url');
            $table->string('media_type'); // image, video
            $table->unsignedInteger('duration')->nullable();
            $table->text('caption')->nullable();
            $table->unsignedInteger('view_count')->default(0);
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
            $table->foreign('community_id')->references('id')->on('communities')->cascadeOnDelete();
            $table->foreign('author_id')->references('id')->on('users')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stories');
    }
};

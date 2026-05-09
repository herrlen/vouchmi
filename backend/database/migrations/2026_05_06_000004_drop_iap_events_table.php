<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('iap_events');
    }

    public function down(): void
    {
        Schema::create('iap_events', function (Blueprint $table) {
            $table->id();
            $table->string('notification_type');
            $table->string('subtype')->nullable();
            $table->string('original_transaction_id')->nullable()->index();
            $table->json('payload');
            $table->timestamp('received_at')->useCurrent();
        });
    }
};

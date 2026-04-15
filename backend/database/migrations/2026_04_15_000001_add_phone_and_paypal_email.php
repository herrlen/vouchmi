<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone', 32)->nullable()->after('bio');
        });

        Schema::table('brand_profiles', function (Blueprint $table) {
            $table->string('paypal_email')->nullable()->after('company_email');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('phone');
        });
        Schema::table('brand_profiles', function (Blueprint $table) {
            $table->dropColumn('paypal_email');
        });
    }
};

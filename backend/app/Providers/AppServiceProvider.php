<?php

namespace App\Providers;

use App\Services\PayPalService;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(PayPalService::class, function () {
            return new PayPalService(
                config('services.paypal.client_id'),
                config('services.paypal.client_secret'),
                config('services.paypal.plan_id'),
                config('services.paypal.mode', 'live'),
            );
        });
    }

    public function boot(): void
    {
        //
    }
}

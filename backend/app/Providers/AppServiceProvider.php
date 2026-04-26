<?php

namespace App\Providers;

use App\Services\PayPalService;
use App\Services\TwilioVerifyService;
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
                config('services.paypal.brand_plan_id'),
                config('services.paypal.influencer_plan_id'),
                config('services.paypal.webhook_id'),
            );
        });

        $this->app->singleton(TwilioVerifyService::class, function () {
            return new TwilioVerifyService(
                (string) config('services.twilio.account_sid'),
                (string) config('services.twilio.auth_token'),
                (string) config('services.twilio.verify_service_sid'),
            );
        });
    }

    public function boot(): void
    {
        //
    }
}

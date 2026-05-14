<?php

namespace App\Providers;

use App\Services\AppStore\AppStoreJwtSigner;
use App\Services\AppStore\AppStoreServerApiClient;
use App\Services\AppStore\IapValidationService;
use App\Services\AppStore\JwsVerifier;
use App\Services\AppStore\NotificationHandler;
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
                config('services.paypal.wallet_webhook_id'),
            );
        });

        $this->app->singleton(TwilioVerifyService::class, function () {
            return new TwilioVerifyService(
                (string) config('services.twilio.account_sid'),
                (string) config('services.twilio.auth_token'),
                (string) config('services.twilio.verify_service_sid'),
            );
        });

        // Apple IAP (App Store Server API + Notifications V2)
        $this->app->singleton(AppStoreJwtSigner::class, fn () => AppStoreJwtSigner::fromConfig());

        $this->app->singleton(AppStoreServerApiClient::class, function ($app) {
            return AppStoreServerApiClient::fromConfig(
                $app->make(AppStoreJwtSigner::class)
            );
        });

        $this->app->singleton(JwsVerifier::class, fn () => JwsVerifier::fromConfig());

        $this->app->singleton(IapValidationService::class, function ($app) {
            return new IapValidationService(
                $app->make(AppStoreServerApiClient::class),
                $app->make(JwsVerifier::class),
            );
        });

        $this->app->singleton(NotificationHandler::class, function ($app) {
            return new NotificationHandler($app->make(JwsVerifier::class));
        });
    }

    public function boot(): void
    {
        //
    }
}

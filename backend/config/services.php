<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'humhub' => [
        'url' => env('HUMHUB_URL'),
        'admin_token' => env('HUMHUB_ADMIN_TOKEN'),
    ],

    'revive' => [
        'url' => env('REVIVE_URL'),
        'api_key' => env('REVIVE_API_KEY'),
    ],

    'matomo' => [
        'url' => env('MATOMO_URL'),
        'site_id' => env('MATOMO_SITE_ID', 1),
        'auth_token' => env('MATOMO_AUTH_TOKEN'),
    ],

    'affiliate' => [
        'amazon_tag' => env('AMAZON_AFFILIATE_TAG', 'vouchmi-21'),
        'awin_id' => env('AWIN_PUBLISHER_ID'),
    ],

    'shortlinks' => [
        'domain' => env('SHORT_LINK_DOMAIN', 'app.vouchmi.com'),
        'scheme' => env('SHORT_LINK_SCHEME', 'https'),
    ],

    'paypal' => [
        'mode'               => env('PAYPAL_MODE', 'live'), // 'sandbox' | 'live'
        'client_id'          => env('PAYPAL_CLIENT_ID'),
        'client_secret'      => env('PAYPAL_CLIENT_SECRET'),
        'plan_id'            => env('PAYPAL_PLAN_ID'),               // Legacy 0,99 € (Bestandskunden)
        'brand_plan_id'      => env('PAYPAL_PLAN_ID_BRAND'),         // 1,99 €/Monat
        'influencer_plan_id' => env('PAYPAL_PLAN_ID_INFLUENCER'),    // 0,99 €/Monat
        'webhook_id'         => env('PAYPAL_WEBHOOK_ID'),
    ],

    'apple' => [
        'bundle_id'        => env('APPLE_BUNDLE_ID', 'com.vouchmi.app'),
        'issuer_id'        => env('APPLE_ISSUER_ID'),
        'key_id'           => env('APPLE_KEY_ID'),
        'private_key_path' => env('APPLE_PRIVATE_KEY_PATH'),
        'environment'      => env('APPLE_ENVIRONMENT', 'sandbox'),
    ],

    'apns' => [
        'team_id'  => env('APNS_TEAM_ID', ''),
        'key_id'   => env('APNS_KEY_ID', ''),
        'key_path' => env('APNS_KEY_PATH', ''),
    ],

];

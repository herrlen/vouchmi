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
        'amazon_tag' => env('AMAZON_AFFILIATE_TAG', 'truscart-21'),
        'awin_id' => env('AWIN_PUBLISHER_ID'),
    ],

];

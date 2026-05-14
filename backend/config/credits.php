<?php

/*
|--------------------------------------------------------------------------
| Vouchmi Credits & Boost-Konfiguration
|--------------------------------------------------------------------------
|
| Diese Werte sind Platzhalter und müssen in Sprint 0 (Discovery) final
| festgelegt werden. Ziel-Verhältnis: 1 € ≈ X Credits.
| Apple-IAP-Pakete müssen 1:1 mit den hier definierten Paket-IDs gespiegelt
| in App Store Connect existieren.
|
*/

return [
    /*
     * Master-Switch: solange false, sind alle Wallet-/Boost-Routes
     * verfügbar aber im Frontend versteckt. Migration & QA laufen
     * mit `false` in Production, `true` in Staging.
     */
    'enabled' => env('CREDITS_ENABLED', false),

    /*
     * Sunset-Switch: wenn true, sind alle bisherigen Premium-Gates
     * (subscription.active-Middleware, Cold-Outreach-Gate, etc.) deaktiviert.
     * Erst aktivieren NACHDEM die Migration-Commands gelaufen sind und
     * Bestandskunden ihre Credits gutgeschrieben bekommen haben.
     */
    'subscriptions_sunset' => env('CREDITS_SUBSCRIPTIONS_SUNSET', false),

    /*
     * Topup-Pakete, die App und Portal anbieten. Reihenfolge = Anzeige-
     * Reihenfolge.
     */
    'packages' => [
        [
            'id'             => 'pkg_500',
            'credits'        => 500,
            'price_cents'    => 499,   // 4,99 €
            'currency'       => 'EUR',
            'apple_product'  => 'com.vouchmi.credits.500',
            'label_key'      => 'wallet.packages.starter',
        ],
        [
            'id'             => 'pkg_1500',
            'credits'        => 1_500,
            'price_cents'    => 1299,  // 12,99 € (Apple Pricing Tier — kein 13,99 in EUR-Storefront)
            'currency'       => 'EUR',
            'apple_product'  => 'com.vouchmi.credits.1500.v2',  // .v2 — gelöschte ID 90-Tage-gesperrt
            'label_key'      => 'wallet.packages.standard',
        ],
        [
            'id'             => 'pkg_5000',
            'credits'        => 5_000,
            'price_cents'    => 3999,  // 39,99 €  (-20%)
            'currency'       => 'EUR',
            'apple_product'  => 'com.vouchmi.credits.5000',
            'label_key'      => 'wallet.packages.creator',
        ],
        [
            'id'             => 'pkg_15000',
            'credits'        => 15_000,
            'price_cents'    => 9999,  // 99,99 €  (-33%)
            'currency'       => 'EUR',
            'apple_product'  => 'com.vouchmi.credits.15000',
            'label_key'      => 'wallet.packages.brand',
        ],
    ],

    /*
     * Boost-Tarife. duration_minutes wird genutzt, um ends_at zu berechnen.
     */
    'boosts' => [
        'mini' => [
            'credits'           => 50,
            'multiplier'        => 2,
            'duration_minutes'  => 6 * 60,        // 6h
            'discover_slot'     => false,
            'push'              => false,
        ],
        'standard' => [
            'credits'           => 150,
            'multiplier'        => 3,
            'duration_minutes'  => 24 * 60,       // 24h
            'discover_slot'     => false,
            'push'              => false,
        ],
        'pro' => [
            'credits'           => 400,
            'multiplier'        => 5,
            'duration_minutes'  => 72 * 60,       // 72h
            'discover_slot'     => true,
            'push'              => false,
        ],
        'brand_push' => [
            'credits'           => 1_000,
            'multiplier'        => 8,
            'duration_minutes'  => 7 * 24 * 60,   // 7 Tage
            'discover_slot'     => true,
            'push'              => true,
        ],
    ],

    /*
     * Refund-Fenster für Boost: Innerhalb dieser Spanne nach Boost-Start
     * kann der User den Boost stornieren und die Credits zurückbekommen
     * — vorausgesetzt, der Post hat noch keine durch den Boost generierten
     * Impressions gesammelt.
     */
    'boost_cancel_window_minutes' => 5,

    /*
     * Migration: Bestandskunden mit aktivem Abo bekommen anteilige Credits
     * für die Restlaufzeit + diesen Bonus-Prozentsatz on top.
     */
    'migration_bonus_percent' => 20,

    /*
     * Anti-Fraud: Max. Topup-Betrag (€-Cent) pro User in den ersten 30 Tagen
     * nach Registrierung.
     */
    'new_user_topup_cap_cents' => 50_000, // 500 €
    'new_user_window_days'     => 30,

    /*
     * Internes Monitoring: Bearer-Token, das Grafana/Datadog im
     * GET /api/internal/credits/health Endpoint mitschicken muss.
     * Leer = Endpoint ist deaktiviert (gibt 503 zurück).
     */
    'monitoring_token' => env('CREDITS_MONITORING_TOKEN', ''),

    /*
     * Admin-Backoffice-Token (getrennt vom Monitoring-Token, weil dieser
     * Schreibrechte hat). Wird in den X-Agent-Header gepaart, der den
     * Audit-Trail in wallet_transactions.metadata.agent füllt.
     */
    'admin_token' => env('CREDITS_ADMIN_TOKEN', ''),
];

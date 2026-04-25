<?php

use App\Http\Controllers\RedirectController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Short-Link Redirect — öffentlich, trackt Klick und leitet weiter.
Route::get('/r/{shortcode}', [RedirectController::class, 'redirect'])
    ->where('shortcode', '[a-z0-9]{4,12}');

// Apple App Site Association — ermöglicht iOS Universal Links.
// Primärpfad /.well-known/apple-app-site-association (iOS 9+) — wird bei
// Mittwald serverseitig blockiert, solange nicht per Support freigeschaltet.
// Root-Fallback /apple-app-site-association (iOS 9–13) wird direkt bedient.
$aasaPayload = fn () => response()->json([
    'applinks' => [
        'details' => [[
            'appIDs' => ['83SX5BC88Q.com.vouchmi.app'],
            'components' => [
                [
                    '/' => '/reset-password',
                    'comment' => 'Passwort-Reset Deep-Link',
                ],
                [
                    '/' => '/verify-email',
                    'comment' => 'E-Mail-Verifizierungs Deep-Link',
                ],
            ],
        ]],
    ],
])->header('Content-Type', 'application/json');

Route::get('/.well-known/apple-app-site-association', $aasaPayload);
Route::get('/apple-app-site-association', $aasaPayload);

// Web-Fallback für Passwort-Reset — fängt Klicks ab, falls der Universal Link
// nicht direkt die App öffnet (Desktop, App nicht installiert, etc.).
Route::get('/reset-password', function (\Illuminate\Http\Request $request) {
    return view('reset-password-fallback', [
        'token' => (string) $request->query('token', ''),
        'email' => (string) $request->query('email', ''),
    ]);
});

// Web-Fallback für E-Mail-Verifizierung — analog zu reset-password.
Route::get('/verify-email', function (\Illuminate\Http\Request $request) {
    return view('verify-email-fallback', [
        'token' => (string) $request->query('token', ''),
        'email' => (string) $request->query('email', ''),
    ]);
});

// PayPal-Redirect-Landings — nach Approval bzw. Abbruch schickt PayPal den
// Browser hierher. Die App nutzt WebBrowser.openAuthSessionAsync und schließt
// den Browser automatisch bei Redirect; für Safari/Desktop-Flows oder wenn der
// Auto-Close nicht greift, triggert die Seite einen vouchmi:// Deep-Link und
// bietet einen manuellen Button.
Route::get('/brand/return',        fn () => view('paypal-return', ['role' => 'brand',      'state' => 'success']));
Route::get('/brand/cancel',        fn () => view('paypal-return', ['role' => 'brand',      'state' => 'cancel']));
Route::get('/influencer/return',   fn () => view('paypal-return', ['role' => 'influencer', 'state' => 'success']));
Route::get('/influencer/cancel',   fn () => view('paypal-return', ['role' => 'influencer', 'state' => 'cancel']));

<?php

use App\Http\Controllers\RedirectController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Short-Link Redirect — öffentlich, trackt Klick und leitet weiter.
Route::get('/r/{shortcode}', [RedirectController::class, 'redirect'])
    ->where('shortcode', '[a-z0-9]{4,12}');

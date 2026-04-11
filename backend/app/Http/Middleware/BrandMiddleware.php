<?php

// app/Http/Middleware/BrandMiddleware.php
namespace App\Http\Middleware;

use App\Models\BrandProfile;
use Closure;
use Illuminate\Http\Request;

class BrandMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        if (!$user || $user->role !== 'brand') {
            return response()->json(['message' => 'Nur für Marken mit aktivem Abo'], 403);
        }

        $brand = BrandProfile::where('user_id', $user->id)->first();
        if (!$brand || !$brand->subscription_expires_at || $brand->subscription_expires_at->isPast()) {
            return response()->json(['message' => 'Dein Abo ist abgelaufen. Bitte verlängere es unter truscart.com/brand/billing'], 402);
        }

        return $next($request);
    }
}

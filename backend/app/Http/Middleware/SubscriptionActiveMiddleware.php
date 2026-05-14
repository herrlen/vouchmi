<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SubscriptionActiveMiddleware
{
    public function handle(Request $request, Closure $next, ?string $planType = null): Response
    {
        // Sunset: nach Abo-Sunset sind alle Routen frei zugänglich. Die
        // Middleware bleibt im Routes-File aktiv, damit Bestandsverhalten
        // einfach durch Flag-Toggle wiederhergestellt werden kann.
        if (config('credits.subscriptions_sunset')) {
            return $next($request);
        }

        $user = $request->user();

        if (!$user || !$user->hasActiveSubscription($planType)) {
            return response()->json([
                'message' => 'Ein aktives Abo wird benötigt.',
                'required_plan' => $planType,
            ], 403);
        }

        return $next($request);
    }
}

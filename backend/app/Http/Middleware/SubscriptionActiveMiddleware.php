<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SubscriptionActiveMiddleware
{
    public function handle(Request $request, Closure $next, ?string $planType = null): Response
    {
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

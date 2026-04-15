<?php

namespace App\Http\Controllers;

use App\Services\SharedLinkService;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RedirectController extends Controller
{
    public function redirect(string $shortcode, Request $request, SharedLinkService $links): Response
    {
        $target = $links->resolveAndTrack($shortcode, $request);

        if (!$target) {
            return response()->view('errors.short-link-missing', [], 404);
        }

        return redirect()->away($target, 302);
    }
}

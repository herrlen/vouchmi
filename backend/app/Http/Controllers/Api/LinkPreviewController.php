<?php

// app/Http/Controllers/Api/LinkPreviewController.php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\LinkPreviewService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LinkPreviewController extends Controller
{
    public function __construct(private LinkPreviewService $links) {}

    /**
     * Generiert eine Link-Preview für jede URL
     * GET /api/link-preview?url=https://amazon.de/dp/B08N5WRWNW
     */
    public function preview(Request $request): JsonResponse
    {
        $url = $request->validate(['url' => 'required|url'])['url'];

        $host = strtolower(parse_url($url, PHP_URL_HOST) ?? '');
        if (preg_match('/(^|\.)(amazon|amzn)\./i', $host)) {
            return response()->json([
                'message' => 'Amazon-Links sind auf TrusCart nicht erlaubt.',
            ], 422);
        }

        $preview = $this->links->getPreview($url);

        if (!$preview) {
            return response()->json(['message' => 'Konnte keine Preview generieren. Probiere einen anderen Link.'], 422);
        }

        return response()->json(['preview' => $preview]);
    }

    /**
     * Trackt einen Klick auf einen Affiliate-Link
     * POST /api/track/click
     */
    public function trackClick(Request $request): JsonResponse
    {
        $data = $request->validate([
            'post_id' => 'nullable|uuid',
            'community_id' => 'nullable|uuid',
            'original_url' => 'required|url',
            'affiliate_url' => 'required|string',
        ]);

        DB::table('link_clicks')->insert([
            'post_id' => $data['post_id'] ?? null,
            'user_id' => $request->user()->id,
            'community_id' => $data['community_id'] ?? null,
            'original_url' => $data['original_url'],
            'affiliate_url' => $data['affiliate_url'],
            'domain' => parse_url($data['original_url'], PHP_URL_HOST),
            'clicked_at' => now(),
        ]);

        // Post click_count erhöhen
        if (!empty($data['post_id'])) {
            DB::table('posts')->where('id', $data['post_id'])->increment('click_count');
        }

        return response()->json(['tracked' => true]);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Community;
use App\Models\LinkClick;
use App\Models\SharedLink;
use App\Services\SharedLinkService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SharedLinkController extends Controller
{
    public function __construct(private SharedLinkService $service) {}

    /**
     * POST /api/links — erzeugt einen Vouchmi-Shortlink für die übergebene URL.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'url'          => 'required|url|max:2048',
            'community_id' => 'nullable|uuid|exists:communities,id',
        ]);

        $community = isset($data['community_id']) ? Community::find($data['community_id']) : null;

        try {
            $link = $this->service->createSharedLink($request->user(), $data['url'], $community);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($this->present($link), 201);
    }

    /**
     * GET /api/links — paginierte Liste der eigenen Links.
     */
    public function index(Request $request): JsonResponse
    {
        $links = SharedLink::where('user_id', $request->user()->id)
            ->latest()
            ->paginate(20);

        $links->getCollection()->transform(fn ($l) => $this->present($l));

        return response()->json($links);
    }

    /**
     * GET /api/links/{id}/stats — Klick-Statistiken für einen Link.
     */
    public function stats(string $id, Request $request): JsonResponse
    {
        $link = SharedLink::where('id', $id)
            ->orWhere('shortcode', $id)
            ->firstOrFail();

        if ($link->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Kein Zugriff.'], 403);
        }

        $now = now();
        $perDay = LinkClick::where('shared_link_id', $link->id)
            ->where('clicked_at', '>=', $now->copy()->subDays(30))
            ->selectRaw('DATE(clicked_at) as day, COUNT(*) as c')
            ->groupBy('day')
            ->orderBy('day')
            ->pluck('c', 'day');

        $days = [];
        for ($i = 29; $i >= 0; $i--) {
            $d = $now->copy()->subDays($i)->format('Y-m-d');
            $days[] = ['date' => $d, 'clicks' => (int) ($perDay[$d] ?? 0)];
        }

        return response()->json([
            'link'          => $this->present($link),
            'click_count'   => $link->click_count,
            'clicks_today'        => LinkClick::where('shared_link_id', $link->id)->whereDate('clicked_at', today())->count(),
            'clicks_last_7_days'  => LinkClick::where('shared_link_id', $link->id)->where('clicked_at', '>=', $now->copy()->subDays(7))->count(),
            'clicks_last_30_days' => LinkClick::where('shared_link_id', $link->id)->where('clicked_at', '>=', $now->copy()->subDays(30))->count(),
            'top_countries'       => [], // Country-Lookup kommt später, siehe TODO_PRE_LAUNCH.md
            'clicks_per_day'      => $days,
        ]);
    }

    public function destroy(string $id, Request $request): JsonResponse
    {
        $link = SharedLink::findOrFail($id);
        if ($link->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Kein Zugriff.'], 403);
        }
        $link->delete();
        return response()->json(['deleted' => true]);
    }

    private function present(SharedLink $link): array
    {
        return [
            'id'             => $link->id,
            'shortcode'      => $link->shortcode,
            'short_url'      => $this->service->buildShortUrl($link),
            'original_url'   => $link->original_url,
            'target_url'     => $link->target_url,
            'domain'         => $link->domain,
            'community_id'   => $link->community_id,
            'og_title'       => $link->og_title,
            'og_description' => $link->og_description,
            'og_image'       => $link->og_image,
            'click_count'    => $link->click_count,
            'created_at'     => $link->created_at,
        ];
    }
}

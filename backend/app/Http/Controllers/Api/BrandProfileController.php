<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BrandProfile;
use App\Models\Post;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class BrandProfileController extends Controller
{
    /**
     * GET /api/brands/{id} — öffentliches Brand-Profil.
     * Akzeptiert UUID *oder* Brand-Slug.
     */
    public function show(string $id, Request $request): JsonResponse
    {
        $brand = $this->findBrand($id);
        $me = $request->user();

        $postsQuery = Post::where('author_id', $brand->user_id)->where('is_hidden', 0);

        $recommendationCount = (clone $postsQuery)->count();

        $followerCount = DB::table('follows')
            ->where('following_id', $brand->user_id)
            ->count();

        $isFollowed = $me
            ? DB::table('follows')
                ->where('follower_id', $me->id)
                ->where('following_id', $brand->user_id)
                ->exists()
            : false;

        $isOwner = $me && $me->id === $brand->user_id;
        $hasActiveSubscription = $brand->paypal_status === 'ACTIVE';

        return response()->json([
            'brand' => [
                'id'               => $brand->id,
                'user_id'          => $brand->user_id,
                'brand_name'       => $brand->brand_name,
                'brand_slug'       => $brand->brand_slug,
                'description'      => $brand->description,
                'logo_url'         => $brand->logo_url,
                'cover_url'        => $brand->cover_url,
                'website_url'      => $brand->website_url,
                'industry'         => $brand->industry,
                'company_email'    => $isOwner ? $brand->company_email : null,
                'is_verified'      => (bool) $brand->is_verified,
                'is_active'        => $hasActiveSubscription,
                'paypal_status'    => $isOwner ? $brand->paypal_status : null,
                'follower_count'   => $followerCount,
                'recommendation_count' => $recommendationCount,
                'is_followed'      => $isFollowed,
                'is_owner'         => $isOwner,
                'can_edit'         => $isOwner && $hasActiveSubscription,
            ],
        ]);
    }

    /**
     * GET /api/brands/{id}/posts — Empfehlungen (paginated).
     */
    public function posts(string $id, Request $request): JsonResponse
    {
        $brand = $this->findBrand($id);

        $posts = Post::where('author_id', $brand->user_id)
            ->where('is_hidden', 0)
            ->with('author:id,username,display_name,avatar_url')
            ->with('community:id,name,slug')
            ->latest()
            ->paginate($request->integer('per_page', 20));

        return response()->json($posts);
    }

    /**
     * GET /api/brands/{id}/products — aggregierte Produkt-Links aus den
     * Posts der Brand. Gruppiert nach link_url, liefert Anzahl Empfehlungen
     * + neuestes Vorschaubild/Preis.
     */
    public function products(string $id, Request $request): JsonResponse
    {
        $brand = $this->findBrand($id);

        $rows = DB::table('posts')
            ->where('author_id', $brand->user_id)
            ->where('is_hidden', 0)
            ->whereNotNull('link_url')
            ->selectRaw('
                link_url,
                MAX(link_title) as link_title,
                MAX(link_image) as link_image,
                MAX(link_price) as link_price,
                MAX(link_domain) as link_domain,
                COUNT(*) as recommendation_count,
                MAX(created_at) as last_posted_at
            ')
            ->groupBy('link_url')
            ->orderByDesc('recommendation_count')
            ->orderByDesc('last_posted_at')
            ->limit($request->integer('limit', 50))
            ->get();

        return response()->json(['products' => $rows]);
    }

    /**
     * GET /api/brands/{id}/photos — alle Bild-URLs aus den Brand-Posts.
     */
    public function photos(string $id, Request $request): JsonResponse
    {
        $brand = $this->findBrand($id);

        $posts = Post::where('author_id', $brand->user_id)
            ->where('is_hidden', 0)
            ->where(function ($q) {
                $q->whereNotNull('link_image')
                    ->orWhereNotNull('media_urls');
            })
            ->latest()
            ->limit($request->integer('limit', 60))
            ->get(['id', 'link_image', 'media_urls', 'created_at']);

        $photos = [];
        foreach ($posts as $post) {
            if ($post->link_image) {
                $photos[] = ['post_id' => $post->id, 'url' => $post->link_image, 'created_at' => $post->created_at];
            }
            foreach ((array) ($post->media_urls ?? []) as $url) {
                if ($url) {
                    $photos[] = ['post_id' => $post->id, 'url' => $url, 'created_at' => $post->created_at];
                }
            }
        }

        return response()->json(['photos' => $photos]);
    }

    /**
     * POST /api/brands/{id}/follow — auth required.
     * Nutzt die bestehende follows-Tabelle (folgt dem Owner-User der Brand).
     */
    public function follow(string $id, Request $request): JsonResponse
    {
        $brand = $this->findBrand($id);
        $meId = $request->user()->id;

        if ($meId === $brand->user_id) {
            return response()->json(['message' => 'Du kannst dir nicht selbst folgen.'], 422);
        }

        DB::table('follows')->updateOrInsert(
            ['follower_id' => $meId, 'following_id' => $brand->user_id],
            ['id' => (string) \Illuminate\Support\Str::uuid(), 'created_at' => now(), 'updated_at' => now()],
        );

        $count = DB::table('follows')->where('following_id', $brand->user_id)->count();

        return response()->json(['is_followed' => true, 'follower_count' => $count]);
    }

    public function unfollow(string $id, Request $request): JsonResponse
    {
        $brand = $this->findBrand($id);
        $meId = $request->user()->id;

        DB::table('follows')
            ->where('follower_id', $meId)
            ->where('following_id', $brand->user_id)
            ->delete();

        $count = DB::table('follows')->where('following_id', $brand->user_id)->count();

        return response()->json(['is_followed' => false, 'follower_count' => $count]);
    }

    /**
     * PUT /api/brands/{id} — nur für Owner mit aktivem Abo.
     */
    public function update(string $id, Request $request): JsonResponse
    {
        $brand = $this->findBrand($id);
        $me = $request->user();

        if ($me->id !== $brand->user_id) {
            return response()->json(['message' => 'Kein Zugriff.'], 403);
        }
        if ($brand->paypal_status !== 'ACTIVE') {
            return response()->json(['message' => 'Brand-Abo nicht aktiv.'], 402);
        }

        $data = $request->validate([
            'brand_name'  => 'nullable|string|max:100',
            'description' => 'nullable|string|max:500',
            'website_url' => 'nullable|url|max:255',
            'industry'    => 'nullable|string|max:50',
        ]);

        $brand->update($data);

        return response()->json(['brand' => $brand->fresh()]);
    }

    /**
     * POST /api/brands/{id}/header-image — nur für Owner mit aktivem Abo.
     */
    public function uploadHeader(string $id, Request $request): JsonResponse
    {
        $brand = $this->findBrand($id);
        $me = $request->user();

        if ($me->id !== $brand->user_id) {
            return response()->json(['message' => 'Kein Zugriff.'], 403);
        }
        if ($brand->paypal_status !== 'ACTIVE') {
            return response()->json(['message' => 'Brand-Abo nicht aktiv.'], 402);
        }

        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,webp|max:5120',
        ]);

        $path = $request->file('image')->store('brand-covers', 'public');
        $url  = Storage::disk('public')->url($path);

        $brand->cover_url = $url;
        $brand->save();

        return response()->json(['cover_url' => $url]);
    }

    private function findBrand(string $id): BrandProfile
    {
        $brand = BrandProfile::where('id', $id)
            ->orWhere('brand_slug', $id)
            ->first();

        if (!$brand) {
            abort(404, 'Brand nicht gefunden.');
        }

        return $brand;
    }
}

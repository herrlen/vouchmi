<?php

// app/Http/Controllers/Api/FeedController.php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Models\Comment;
use App\Services\LinkPreviewService;
use App\Services\MatomoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FeedController extends Controller
{
    public function __construct(
        private LinkPreviewService $links,
        private MatomoService $matomo,
    ) {}

    public function index(string $communityId, Request $request): JsonResponse
    {
        $blockedIds = DB::table('user_blocks')
            ->where('blocker_id', $request->user()->id)
            ->pluck('blocked_id');

        $posts = Post::where('community_id', $communityId)
            ->where('is_hidden', false)
            ->whereNotIn('author_id', $blockedIds)
            ->with('author:id,username,display_name,avatar_url')
            ->latest()
            ->paginate(20);

        return response()->json($posts);
    }

    public function allMyFeed(Request $request): JsonResponse
    {
        $user = $request->user();
        $blockedIds = DB::table('user_blocks')
            ->where('blocker_id', $user->id)
            ->pluck('blocked_id');

        $communityIds = DB::table('community_members')
            ->where('user_id', $user->id)
            ->pluck('community_id');

        $posts = Post::whereIn('community_id', $communityIds)
            ->where('is_hidden', false)
            ->whereNotIn('author_id', $blockedIds)
            ->with('author:id,username,display_name,avatar_url')
            ->with('community:id,name,slug')
            ->latest()
            ->paginate(30);

        $myReposts = DB::table('reposts')
            ->where('user_id', $user->id)
            ->pluck('original_post_id')
            ->toArray();

        $myLikes = DB::table('likes')
            ->where('user_id', $user->id)
            ->pluck('post_id')
            ->toArray();

        $posts->getCollection()->transform(function ($post) use ($myReposts, $myLikes) {
            $post->is_reposted = in_array($post->id, $myReposts);
            $post->is_liked = in_array($post->id, $myLikes);
            return $post;
        });

        return response()->json($posts);
    }

    public function myPosts(Request $request): JsonResponse
    {
        $posts = Post::where('author_id', $request->user()->id)
            ->with('author:id,username,display_name,avatar_url')
            ->with('community:id,name,slug')
            ->latest()
            ->paginate(50);

        return response()->json($posts);
    }

    public function store(string $communityId, Request $request): JsonResponse
    {
        $member = DB::table('community_members')
            ->where('community_id', $communityId)
            ->where('user_id', $request->user()->id)
            ->first();

        if ($member && $member->muted_until && now()->lt($member->muted_until)) {
            return response()->json([
                'message' => 'Du bist stumm geschaltet bis ' . \Carbon\Carbon::parse($member->muted_until)->format('d.m.Y H:i') . '.',
            ], 403);
        }

        $data = $request->validate([
            'content' => 'nullable|string|max:500',
            'link_url' => 'required|url',
            'link_title' => 'nullable|string|max:200',
            'link_image' => 'nullable|url',
            'link_price' => 'nullable|numeric',
            'media_urls' => 'nullable|array',
        ]);

        $host = strtolower(parse_url($data['link_url'], PHP_URL_HOST) ?? '');
        if (preg_match('/(^|\.)(amazon|amzn)\./i', $host)) {
            return response()->json([
                'message' => 'Amazon-Links sind auf Vouchmi nicht erlaubt.',
            ], 422);
        }

        $username = $request->user()->username;
        $finalUrl = $this->links->addRefTag($data['link_url'], $username);

        $linkData = [
            'link_url' => $data['link_url'],
            'link_affiliate_url' => $finalUrl,
            'link_domain' => $host,
            'post_type' => 'link',
            'link_title' => $data['link_title'] ?? null,
            'link_image' => $data['link_image'] ?? null,
            'link_price' => $data['link_price'] ?? null,
        ];

        if (empty($data['link_title']) || empty($data['link_image'])) {
            $preview = $this->links->getPreview($data['link_url']);
            if ($preview) {
                $linkData['link_title'] = $linkData['link_title'] ?? $preview['title'] ?? null;
                $linkData['link_image'] = $linkData['link_image'] ?? $preview['image'] ?? null;
                $linkData['link_price'] = $linkData['link_price'] ?? $preview['price'] ?? null;
            }
        }

        $data['content'] = $data['content'] ?? '';

        $post = Post::create([
            'community_id' => $communityId,
            'author_id' => $request->user()->id,
            'content' => $data['content'],
            'media_urls' => $data['media_urls'] ?? [],
            ...$linkData,
        ]);

        $post->load('author:id,username,display_name,avatar_url');

        $this->matomo->trackEvent($request->user()->id, 'community', 'post_created', $communityId);

        return response()->json(['post' => $post], 201);
    }

    public function like(string $postId, Request $request): JsonResponse
    {
        $post = Post::findOrFail($postId);
        $userId = $request->user()->id;

        $exists = DB::table('likes')
            ->where('post_id', $postId)
            ->where('user_id', $userId)
            ->exists();

        if ($exists) {
            DB::table('likes')->where('post_id', $postId)->where('user_id', $userId)->delete();
            $post->decrement('like_count');
        } else {
            DB::table('likes')->insert(['post_id' => $postId, 'user_id' => $userId]);
            $post->increment('like_count');
        }

        return response()->json([
            'like_count' => $post->fresh()->like_count,
            'liked' => !$exists,
        ]);
    }

    public function comment(string $postId, Request $request): JsonResponse
    {
        $data = $request->validate(['content' => 'required|string|max:2000']);
        $post = Post::findOrFail($postId);

        $comment = Comment::create([
            'post_id' => $postId,
            'author_id' => $request->user()->id,
            'content' => $data['content'],
        ]);

        $post->increment('comment_count');
        $comment->load('author:id,username,display_name,avatar_url');

        return response()->json(['comment' => $comment], 201);
    }

    public function comments(string $postId): JsonResponse
    {
        $comments = Comment::where('post_id', $postId)
            ->with('author:id,username,display_name,avatar_url')
            ->oldest()
            ->get();

        return response()->json(['comments' => $comments]);
    }

    public function destroy(string $postId, Request $request): JsonResponse
    {
        $post = Post::findOrFail($postId);
        if ($post->author_id !== $request->user()->id) {
            return response()->json(['message' => 'Nicht berechtigt'], 403);
        }
        $post->delete();
        return response()->json(['message' => 'Gelöscht']);
    }

    public function repost(string $postId, Request $request): JsonResponse
    {
        $user = $request->user();
        $post = Post::findOrFail($postId);

        if ($post->author_id === $user->id) {
            return response()->json(['message' => 'Du kannst deine eigenen Beiträge nicht reposten.'], 400);
        }

        $exists = DB::table('reposts')->where('user_id', $user->id)->where('original_post_id', $postId)->exists();
        if ($exists) {
            return response()->json(['message' => 'Du hast diesen Beitrag bereits geteilt.'], 409);
        }

        $data = $request->validate(['comment' => 'nullable|string|max:280']);

        DB::table('reposts')->insert([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'user_id' => $user->id,
            'original_post_id' => $postId,
            'comment' => $data['comment'] ?? null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $post->increment('repost_count');

        return response()->json([
            'reposted' => true,
            'repost_count' => $post->fresh()->repost_count,
        ], 201);
    }

    public function unrepost(string $postId, Request $request): JsonResponse
    {
        $user = $request->user();
        $deleted = DB::table('reposts')->where('user_id', $user->id)->where('original_post_id', $postId)->delete();
        if ($deleted) {
            Post::where('id', $postId)->decrement('repost_count');
        }
        $post = Post::find($postId);
        return response()->json([
            'reposted' => false,
            'repost_count' => $post ? $post->repost_count : 0,
        ]);
    }

    public function reposters(string $postId): JsonResponse
    {
        $users = DB::table('reposts')
            ->where('original_post_id', $postId)
            ->join('users', 'reposts.user_id', '=', 'users.id')
            ->select('users.id', 'users.username', 'users.display_name', 'users.avatar_url')
            ->latest('reposts.created_at')
            ->limit(50)
            ->get();

        return response()->json(['reposters' => $users]);
    }
}

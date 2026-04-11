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
        $posts = Post::where('community_id', $communityId)
            ->with('author:id,username,display_name,avatar_url')
            ->latest()
            ->paginate(20);

        return response()->json($posts);
    }

    public function store(string $communityId, Request $request): JsonResponse
    {
        $data = $request->validate([
            'content' => 'required|string|max:5000',
            'link_url' => 'nullable|url',
            'media_urls' => 'nullable|array',
        ]);

        $linkData = [];
        if (!empty($data['link_url'])) {
            $preview = $this->links->getPreview($data['link_url']);
            if ($preview) {
                $linkData = [
                    'link_url' => $preview['original_url'],
                    'link_affiliate_url' => $preview['affiliate_url'],
                    'link_title' => $preview['title'],
                    'link_image' => $preview['image'],
                    'link_price' => $preview['price'],
                    'link_domain' => $preview['domain'],
                    'post_type' => 'link',
                ];
            }
        }

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
}

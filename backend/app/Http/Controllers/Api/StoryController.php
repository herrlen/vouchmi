<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Story;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StoryController extends Controller
{
    public function index(string $communityId, Request $request): JsonResponse
    {
        $stories = Story::where('community_id', $communityId)
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->with('author:id,username,display_name,avatar_url')
            ->latest()
            ->paginate(30);

        return response()->json($stories);
    }

    public function feed(Request $request): JsonResponse
    {
        $communityIds = DB::table('community_members')
            ->where('user_id', $request->user()->id)
            ->pluck('community_id');

        $stories = Story::whereIn('community_id', $communityIds)
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->with('author:id,username,display_name,avatar_url')
            ->latest()
            ->limit(50)
            ->get();

        return response()->json(['stories' => $stories]);
    }

    public function mine(Request $request): JsonResponse
    {
        $stories = Story::where('author_id', $request->user()->id)
            ->with('community:id,name')
            ->latest()
            ->paginate(50);

        return response()->json($stories);
    }

    public function store(string $communityId, Request $request): JsonResponse
    {
        $member = DB::table('community_members')
            ->where('community_id', $communityId)
            ->where('user_id', $request->user()->id)
            ->first();

        if ($member && $member->muted_until && now()->lt($member->muted_until)) {
            return response()->json([
                'message' => 'Du bist stumm geschaltet.',
            ], 403);
        }

        $request->validate([
            'media' => 'required|file|mimes:jpeg,png,jpg,webp,mp4,mov|max:51200',
            'caption' => 'nullable|string|max:500',
        ]);

        $file = $request->file('media');
        $isVideo = in_array($file->getClientOriginalExtension(), ['mp4', 'mov']);

        $path = $file->store('stories', 'public');
        $url = asset('storage/' . $path);

        $story = Story::create([
            'community_id' => $communityId,
            'author_id' => $request->user()->id,
            'media_url' => $url,
            'media_type' => $isVideo ? 'video' : 'image',
            'duration' => $isVideo ? $request->input('duration') : null,
            'caption' => $request->input('caption'),
            'expires_at' => now()->addHours(24),
        ]);

        $story->load('author:id,username,display_name,avatar_url');

        return response()->json(['story' => $story], 201);
    }

    public function destroy(string $storyId, Request $request): JsonResponse
    {
        $story = Story::findOrFail($storyId);

        if ($story->author_id !== $request->user()->id) {
            return response()->json(['message' => 'Nicht berechtigt'], 403);
        }

        $story->delete();
        return response()->json(['message' => 'Story gelöscht']);
    }
}

<?php
// app/Http/Controllers/Api/UserController.php
namespace App\Http\Controllers\Api;

use App\Enums\ProfileLayout;
use App\Http\Controllers\Controller;
use App\Services\MatomoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Enum;

class UserController extends Controller
{
    public function __construct(private MatomoService $matomo) {}

    public function profile(Request $request): JsonResponse
    {
        $user = $request->user();
        $postCount = \DB::table('posts')->where('author_id', $user->id)->count();

        $followerCount = \DB::table('follows')->where('following_id', $user->id)->count();
        $followingCount = \DB::table('follows')->where('follower_id', $user->id)->count();

        return response()->json([
            'profile' => $user->only('id', 'email', 'username', 'display_name', 'avatar_url', 'bio', 'link', 'role', 'profile_layout'),
            'stats' => [
                'communities_count' => $user->communities()->count(),
                'posts_count' => $postCount,
                'followers_count' => $followerCount,
                'following_count' => $followingCount,
            ],
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $data = $request->validate([
            'display_name' => 'nullable|string|max:50',
            'bio' => 'nullable|string|max:250',
            'link' => 'nullable|url|max:255',
        ]);

        $request->user()->update($data);
        return response()->json(['profile' => $request->user()->fresh()]);
    }

    public function uploadAvatar(Request $request): JsonResponse
    {
        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,jpg,webp|max:4096',
        ]);

        $user = $request->user();
        $path = $request->file('avatar')->store('avatars', 'public');
        $url = asset('storage/' . $path);

        $user->update(['avatar_url' => $url]);

        return response()->json(['avatar_url' => $url]);
    }

    public function updateLayout(Request $request): JsonResponse
    {
        $data = $request->validate([
            'layout' => ['required', new Enum(ProfileLayout::class)],
        ]);

        $request->user()->update([
            'profile_layout' => $data['layout'],
            'profile_layout_updated_at' => now(),
        ]);

        return response()->json([
            'layout' => $data['layout'],
            'updated_at' => now()->toIso8601String(),
        ]);
    }

    public function trackEvent(Request $request): JsonResponse
    {
        $data = $request->validate([
            'category' => 'required|string',
            'action' => 'required|string',
            'name' => 'nullable|string',
            'value' => 'nullable|numeric',
        ]);

        $this->matomo->trackEvent(
            $request->user()->id,
            $data['category'],
            $data['action'],
            $data['name'] ?? null,
            $data['value'] ?? null,
        );

        return response()->json(['tracked' => true]);
    }

    public function follow(string $userId, Request $request): JsonResponse
    {
        $me = $request->user();
        if ($me->id === $userId) {
            return response()->json(['message' => 'Du kannst dir nicht selbst folgen.'], 400);
        }

        \App\Models\User::findOrFail($userId);

        $exists = \DB::table('follows')->where('follower_id', $me->id)->where('following_id', $userId)->exists();
        if ($exists) {
            return response()->json(['message' => 'Du folgst diesem Nutzer bereits.'], 409);
        }

        \DB::table('follows')->insert([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'follower_id' => $me->id,
            'following_id' => $userId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $count = \DB::table('follows')->where('following_id', $userId)->count();
        return response()->json(['following' => true, 'followers_count' => $count]);
    }

    public function unfollow(string $userId, Request $request): JsonResponse
    {
        \DB::table('follows')->where('follower_id', $request->user()->id)->where('following_id', $userId)->delete();
        $count = \DB::table('follows')->where('following_id', $userId)->count();
        return response()->json(['following' => false, 'followers_count' => $count]);
    }

    public function publicProfile(string $userId, Request $request): JsonResponse
    {
        $user = \App\Models\User::findOrFail($userId);
        $postCount = \DB::table('posts')->where('author_id', $user->id)->count();
        $followerCount = \DB::table('follows')->where('following_id', $user->id)->count();
        $followingCount = \DB::table('follows')->where('follower_id', $user->id)->count();
        $isFollowing = \DB::table('follows')->where('follower_id', $request->user()->id)->where('following_id', $userId)->exists();

        return response()->json([
            'profile' => $user->only('id', 'username', 'display_name', 'avatar_url', 'bio', 'link', 'profile_layout'),
            'stats' => [
                'posts_count' => $postCount,
                'followers_count' => $followerCount,
                'following_count' => $followingCount,
            ],
            'is_following' => $isFollowing,
        ]);
    }
}

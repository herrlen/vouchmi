<?php
// app/Http/Controllers/Api/UserController.php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\MatomoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function __construct(private MatomoService $matomo) {}

    public function profile(Request $request): JsonResponse
    {
        $user = $request->user();
        $postCount = \DB::table('posts')->where('author_id', $user->id)->count();

        return response()->json([
            'profile' => $user->only('id', 'email', 'username', 'display_name', 'avatar_url', 'bio', 'link', 'role'),
            'stats' => [
                'communities_count' => $user->communities()->count(),
                'posts_count' => $postCount,
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
}

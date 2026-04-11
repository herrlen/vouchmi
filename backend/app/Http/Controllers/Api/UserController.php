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
        return response()->json([
            'profile' => $user->only('id', 'email', 'username', 'display_name', 'avatar_url', 'bio', 'role'),
            'stats' => [
                'communities_count' => $user->communities()->count(),
                'posts_count' => $user->ownedCommunities()->count(), // TODO: posts relation
            ],
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $data = $request->validate([
            'display_name' => 'nullable|string|max:50',
            'bio' => 'nullable|string|max:500',
        ]);

        $request->user()->update($data);
        return response()->json(['profile' => $request->user()->fresh()]);
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

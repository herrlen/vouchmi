<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PushTokenController extends Controller
{
    /**
     * POST /api/user/push-tokens
     * Body: { token: string, platform: "ios" | "android", app_version?: string }
     *
     * Idempotent: same token → updated row (re-binds to current user).
     */
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token'       => 'required|string|max:200',
            'platform'    => 'required|in:ios,android',
            'app_version' => 'nullable|string|max:32',
        ]);

        $userId = $request->user()->id;
        $now = now();

        $existing = DB::table('push_tokens')->where('token', $data['token'])->first();
        if ($existing) {
            DB::table('push_tokens')->where('id', $existing->id)->update([
                'user_id'      => $userId,
                'platform'     => $data['platform'],
                'app_version'  => $data['app_version'] ?? null,
                'last_used_at' => $now,
                'updated_at'   => $now,
            ]);
        } else {
            DB::table('push_tokens')->insert([
                'id'           => (string) Str::uuid(),
                'user_id'      => $userId,
                'token'        => $data['token'],
                'platform'     => $data['platform'],
                'app_version'  => $data['app_version'] ?? null,
                'last_used_at' => $now,
                'created_at'   => $now,
                'updated_at'   => $now,
            ]);
        }

        return response()->json(['registered' => true]);
    }

    /**
     * DELETE /api/user/push-tokens
     * Body: { token: string }
     *
     * Called on logout so the device stops getting pushes for the previous user.
     */
    public function unregister(Request $request): JsonResponse
    {
        $data = $request->validate(['token' => 'required|string|max:200']);
        DB::table('push_tokens')
            ->where('token', $data['token'])
            ->where('user_id', $request->user()->id)
            ->delete();

        return response()->json(['unregistered' => true]);
    }
}

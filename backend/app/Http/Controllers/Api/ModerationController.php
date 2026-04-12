<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ModerationController extends Controller
{
    public function report(Request $request): JsonResponse
    {
        $data = $request->validate([
            'target_type' => 'required|in:post,comment,user,community',
            'target_id' => 'required|uuid',
            'reason' => 'required|in:spam,abuse,illegal,sexual,other',
            'details' => 'nullable|string|max:1000',
        ]);

        DB::table('reports')->insert([
            'id' => (string) Str::uuid(),
            'reporter_id' => $request->user()->id,
            'target_type' => $data['target_type'],
            'target_id' => $data['target_id'],
            'reason' => $data['reason'],
            'details' => $data['details'] ?? null,
            'status' => 'open',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['message' => 'Meldung eingegangen. Wir prüfen innerhalb von 24 Stunden.'], 201);
    }

    public function block(string $userId, Request $request): JsonResponse
    {
        $me = $request->user();

        if ($me->id === $userId) {
            return response()->json(['message' => 'Du kannst dich nicht selbst blockieren.'], 400);
        }

        User::findOrFail($userId);

        DB::table('user_blocks')->updateOrInsert(
            ['blocker_id' => $me->id, 'blocked_id' => $userId],
            ['id' => (string) Str::uuid(), 'created_at' => now(), 'updated_at' => now()]
        );

        return response()->json(['message' => 'Nutzer blockiert']);
    }

    public function unblock(string $userId, Request $request): JsonResponse
    {
        DB::table('user_blocks')
            ->where('blocker_id', $request->user()->id)
            ->where('blocked_id', $userId)
            ->delete();

        return response()->json(['message' => 'Blockierung aufgehoben']);
    }

    public function blockedUsers(Request $request): JsonResponse
    {
        $ids = DB::table('user_blocks')
            ->where('blocker_id', $request->user()->id)
            ->pluck('blocked_id');

        $users = User::whereIn('id', $ids)->get(['id', 'username', 'display_name', 'avatar_url']);

        return response()->json(['users' => $users]);
    }

    public function deleteAccount(Request $request): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'confirm' => 'required|in:DELETE',
        ]);

        DB::transaction(function () use ($user) {
            DB::table('likes')->where('user_id', $user->id)->delete();
            DB::table('comments')->where('author_id', $user->id)->delete();
            DB::table('posts')->where('author_id', $user->id)->delete();
            DB::table('messages')->where('sender_id', $user->id)->delete();
            DB::table('community_members')->where('user_id', $user->id)->delete();
            DB::table('user_blocks')->where('blocker_id', $user->id)->orWhere('blocked_id', $user->id)->delete();
            DB::table('reports')->where('reporter_id', $user->id)->delete();
            $user->tokens()->delete();
            $user->delete();
        });

        return response()->json(['message' => 'Account gelöscht']);
    }
}

<?php

// app/Http/Controllers/Api/CommunityController.php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Community;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CommunityController extends Controller
{

    public function index(Request $request): JsonResponse
    {
        $communities = $request->user()
            ->communities()
            ->withCount('members')
            ->latest('community_members.joined_at')
            ->get()
            ->map(fn($c) => [
                ...$c->only('id', 'name', 'slug', 'description', 'image_url', 'category', 'member_count'),
                'role' => $c->pivot->role,
            ]);

        return response()->json(['communities' => $communities]);
    }

    public function discover(Request $request): JsonResponse
    {
        $meId = $request->user()->id;

        $myIds = DB::table('community_members')
            ->where('user_id', $meId)
            ->pluck('community_id');
        $followedIds = DB::table('community_followers')
            ->where('user_id', $meId)
            ->pluck('community_id');

        $communities = Community::where('is_private', false)
            ->orderByDesc('member_count')
            ->limit(50)
            ->get(['id', 'name', 'slug', 'description', 'image_url', 'category', 'member_count'])
            ->map(fn ($c) => [
                ...$c->only('id', 'name', 'slug', 'description', 'image_url', 'category', 'member_count'),
                'is_member' => $myIds->contains($c->id),
                'is_followed' => $followedIds->contains($c->id),
            ]);

        return response()->json(['communities' => $communities]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:100',
            'description' => 'nullable|string|max:500',
            'category' => 'nullable|string|max:50',
            'is_private' => 'boolean',
        ]);

        $normalizedName = trim($data['name']);
        $data['name'] = $normalizedName;

        $exists = Community::where('owner_id', $request->user()->id)
            ->whereRaw('LOWER(name) = ?', [mb_strtolower($normalizedName)])
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'Du hast bereits eine Community mit diesem Namen.',
            ], 409);
        }

        $slug = Str::slug($normalizedName) . '-' . Str::random(6);

        $community = Community::create([
            ...$data,
            'slug' => $slug,
            'owner_id' => $request->user()->id,
        ]);

        $community->members()->attach($request->user()->id, ['role' => 'owner']);

        return response()->json(['community' => $community], 201);
    }

    public function show(string $id, Request $request): JsonResponse
    {
        $community = Community::with(['owner:id,username,display_name,avatar_url'])
            ->findOrFail($id);

        $userId = $request->user()->id;
        $membership = $community->members()->where('user_id', $userId)->first();
        $isFollowed = DB::table('community_followers')
            ->where('community_id', $id)
            ->where('user_id', $userId)
            ->exists();

        // Unread Chat: Anzahl Messages in dieser Community, die NACH dem
        // last_read_chat_at des Users entstanden sind (nicht eigene Messages).
        $unreadChat = 0;
        if ($membership) {
            $lastRead = $membership->pivot->last_read_chat_at;
            $q = DB::table('messages')
                ->where('community_id', $id)
                ->where('sender_id', '!=', $userId);
            if ($lastRead) {
                $q->where('created_at', '>', $lastRead);
            }
            $unreadChat = $q->count();
        }

        // Unread Mail: für Member = unread DMs vom Owner, für Owner = Summe
        // unreader DMs aller Member dieser Community.
        $unreadMail = 0;
        try {
            if ($community->owner_id === $userId) {
                $memberIds = $community->members()->pluck('users.id');
                $unreadMail = DB::table('direct_messages')
                    ->where('receiver_id', $userId)
                    ->whereIn('sender_id', $memberIds)
                    ->whereNull('read_at')
                    ->count();
            } elseif ($membership) {
                $unreadMail = DB::table('direct_messages')
                    ->where('sender_id', $community->owner_id)
                    ->where('receiver_id', $userId)
                    ->whereNull('read_at')
                    ->count();
            }
        } catch (\Throwable $e) {
            report($e);
        }

        return response()->json([
            'community' => [
                ...$community->toArray(),
                'is_member' => !!$membership,
                'my_role' => $membership?->pivot->role,
                'is_followed' => $isFollowed,
                'unread_chat_count' => $unreadChat,
                'unread_mail_count' => $unreadMail,
            ],
        ]);
    }

    /**
     * PATCH /api/communities/{id}/chat/read
     * Setzt last_read_chat_at = now() für den User.
     */
    public function markChatRead(string $id, Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $updated = DB::table('community_members')
            ->where('community_id', $id)
            ->where('user_id', $userId)
            ->update(['last_read_chat_at' => now()]);

        if (!$updated) {
            return response()->json(['message' => 'Nicht Mitglied'], 403);
        }

        return response()->json(['message' => 'Markiert.']);
    }

    public function join(string $id, Request $request): JsonResponse
    {
        $community = Community::findOrFail($id);
        $user = $request->user();

        if ($community->members()->where('user_id', $user->id)->exists()) {
            return response()->json(['message' => 'Bereits Mitglied'], 409);
        }

        if ($community->is_private) {
            return response()->json(['message' => 'Diese Community ist privat. Du brauchst eine Einladung.'], 403);
        }

        $community->members()->attach($user->id, ['role' => 'member']);
        $community->increment('member_count');

        return response()->json(['message' => 'Willkommen in der Community!']);
    }

    public function leave(string $id, Request $request): JsonResponse
    {
        $community = Community::findOrFail($id);
        $user = $request->user();

        if ($community->owner_id === $user->id) {
            return response()->json(['message' => 'Der Owner kann die Community nicht verlassen'], 403);
        }

        $community->members()->detach($user->id);
        $community->decrement('member_count');

        return response()->json(['message' => 'Community verlassen']);
    }

    /**
     * Folgen — passiver Status. User sieht Community-Posts im Feed,
     * darf aber nicht selbst posten. Getrennt von Mitgliedschaft (join/leave).
     */
    public function follow(string $id, Request $request): JsonResponse
    {
        Community::findOrFail($id);
        $userId = $request->user()->id;

        DB::table('community_followers')->updateOrInsert(
            ['community_id' => $id, 'user_id' => $userId],
            ['followed_at' => now()],
        );

        return response()->json(['message' => 'Du folgst der Community.']);
    }

    public function unfollow(string $id, Request $request): JsonResponse
    {
        Community::findOrFail($id);
        DB::table('community_followers')
            ->where('community_id', $id)
            ->where('user_id', $request->user()->id)
            ->delete();

        return response()->json(['message' => 'Entfolgt.']);
    }

    public function members(string $id): JsonResponse
    {
        $community = Community::findOrFail($id);
        $members = $community->members()
            ->select('users.id', 'username', 'display_name', 'avatar_url')
            ->get()
            ->map(fn($m) => [...$m->only('id', 'username', 'display_name', 'avatar_url'), 'role' => $m->pivot->role, 'muted_until' => $m->pivot->muted_until]);

        return response()->json(['members' => $members]);
    }

    public function invite(string $id, Request $request): JsonResponse
    {
        $community = Community::findOrFail($id);

        // Nur Owner/Admin dürfen einladen
        $member = $community->members()->where('user_id', $request->user()->id)->first();
        if (!$member || !in_array($member->pivot->role, ['owner', 'admin'])) {
            return response()->json(['message' => 'Keine Berechtigung'], 403);
        }

        $invite = \App\Models\Invite::create([
            'community_id' => $community->id,
            'invited_by' => $request->user()->id,
            'code' => Str::upper(Str::random(8)),
            'max_uses' => $request->input('max_uses', 50),
            'expires_at' => now()->addDays(7),
        ]);

        return response()->json([
            'invite_code' => $invite->code,
            'invite_link' => config('app.frontend_url') . '/join/' . $invite->code,
        ]);
    }

    private function isModOrOwner(Community $community, string $userId): bool
    {
        if ($community->owner_id === $userId) return true;
        $member = $community->members()->where('user_id', $userId)->first();
        return $member && in_array($member->pivot->role, ['owner', 'moderator']);
    }

    public function update(string $id, Request $request): JsonResponse
    {
        $community = Community::findOrFail($id);

        if (!$this->isModOrOwner($community, $request->user()->id)) {
            return response()->json(['message' => 'Nur Ersteller und Moderatoren können die Community bearbeiten.'], 403);
        }

        $data = $request->validate([
            'description' => 'nullable|string|max:500',
            'category' => 'nullable|string|max:50',
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:30',
        ]);

        $community->update($data);

        return response()->json(['community' => $community->fresh()]);
    }

    public function uploadImage(string $id, Request $request): JsonResponse
    {
        $community = Community::findOrFail($id);

        if (!$this->isModOrOwner($community, $request->user()->id)) {
            return response()->json(['message' => 'Keine Berechtigung'], 403);
        }

        $request->validate(['image' => 'required|image|mimes:jpeg,png,jpg,webp|max:4096']);

        $path = $request->file('image')->store('communities', 'public');
        $url = asset('storage/' . $path);
        $community->update(['image_url' => $url]);

        return response()->json(['image_url' => $url]);
    }

    public function destroy(string $id, Request $request): JsonResponse
    {
        $community = Community::findOrFail($id);

        if ($community->owner_id !== $request->user()->id) {
            return response()->json(['message' => 'Nur der Ersteller kann die Community löschen.'], 403);
        }

        \DB::transaction(function () use ($community) {
            \DB::table('posts')->where('community_id', $community->id)->delete();
            \DB::table('messages')->where('community_id', $community->id)->delete();
            \DB::table('community_members')->where('community_id', $community->id)->delete();
            $community->delete();
        });

        return response()->json(['message' => 'Community gelöscht']);
    }

    public function setRole(string $id, string $userId, Request $request): JsonResponse
    {
        $community = Community::findOrFail($id);

        if ($community->owner_id !== $request->user()->id) {
            return response()->json(['message' => 'Nur der Ersteller kann Rollen vergeben.'], 403);
        }

        if ($userId === $community->owner_id) {
            return response()->json(['message' => 'Der Ersteller-Status kann nicht geändert werden.'], 400);
        }

        $data = $request->validate(['role' => 'required|in:member,moderator']);

        $member = $community->members()->where('user_id', $userId)->first();
        if (!$member) {
            return response()->json(['message' => 'Nutzer ist kein Mitglied.'], 404);
        }

        $community->members()->updateExistingPivot($userId, ['role' => $data['role']]);

        return response()->json(['message' => $data['role'] === 'moderator' ? 'Zum Moderator ernannt.' : 'Rolle auf Mitglied gesetzt.']);
    }

    public function muteUser(string $id, string $userId, Request $request): JsonResponse
    {
        $community = Community::findOrFail($id);

        if (!$this->isModOrOwner($community, $request->user()->id)) {
            return response()->json(['message' => 'Keine Berechtigung'], 403);
        }

        if ($userId === $community->owner_id) {
            return response()->json(['message' => 'Der Ersteller kann nicht stumm geschaltet werden.'], 400);
        }

        $data = $request->validate(['duration' => 'required|in:24h,7d,permanent']);

        $until = match ($data['duration']) {
            '24h' => now()->addHours(24),
            '7d' => now()->addDays(7),
            'permanent' => now()->addYears(100),
        };

        $community->members()->updateExistingPivot($userId, [
            'muted_until' => $until,
            'muted_by' => $request->user()->id,
        ]);

        return response()->json(['message' => 'Nutzer stumm geschaltet.', 'muted_until' => $until->toISOString()]);
    }

    public function unmuteUser(string $id, string $userId, Request $request): JsonResponse
    {
        $community = Community::findOrFail($id);

        if (!$this->isModOrOwner($community, $request->user()->id)) {
            return response()->json(['message' => 'Keine Berechtigung'], 403);
        }

        $community->members()->updateExistingPivot($userId, ['muted_until' => null, 'muted_by' => null]);

        return response()->json(['message' => 'Stummschaltung aufgehoben.']);
    }

    public function kickUser(string $id, string $userId, Request $request): JsonResponse
    {
        $community = Community::findOrFail($id);

        if (!$this->isModOrOwner($community, $request->user()->id)) {
            return response()->json(['message' => 'Keine Berechtigung'], 403);
        }

        if ($userId === $community->owner_id) {
            return response()->json(['message' => 'Der Ersteller kann nicht entfernt werden.'], 400);
        }

        $targetMember = $community->members()->where('user_id', $userId)->first();
        if (!$targetMember) {
            return response()->json(['message' => 'Nutzer ist kein Mitglied.'], 404);
        }

        if ($targetMember->pivot->role === 'moderator' && $community->owner_id !== $request->user()->id) {
            return response()->json(['message' => 'Nur der Ersteller kann Moderatoren entfernen.'], 403);
        }

        $community->members()->detach($userId);
        $community->decrement('member_count');

        return response()->json(['message' => 'Nutzer aus Community entfernt.']);
    }

    public function hidePost(string $id, string $postId, Request $request): JsonResponse
    {
        $community = Community::findOrFail($id);

        if (!$this->isModOrOwner($community, $request->user()->id)) {
            return response()->json(['message' => 'Keine Berechtigung'], 403);
        }

        $post = \App\Models\Post::where('id', $postId)->where('community_id', $id)->firstOrFail();
        $post->update(['is_hidden' => true, 'hidden_by' => $request->user()->id]);

        return response()->json(['message' => 'Beitrag ausgeblendet.']);
    }

    public function deletePost(string $id, string $postId, Request $request): JsonResponse
    {
        $community = Community::findOrFail($id);

        if (!$this->isModOrOwner($community, $request->user()->id)) {
            return response()->json(['message' => 'Keine Berechtigung'], 403);
        }

        $post = \App\Models\Post::where('id', $postId)->where('community_id', $id)->firstOrFail();
        \DB::table('comments')->where('post_id', $post->id)->delete();
        \DB::table('likes')->where('post_id', $post->id)->delete();
        $post->delete();

        return response()->json(['message' => 'Beitrag gelöscht.']);
    }

    public function myMuteStatus(string $id, Request $request): JsonResponse
    {
        $community = Community::findOrFail($id);
        $member = $community->members()->where('user_id', $request->user()->id)->first();

        if (!$member) {
            return response()->json(['muted' => false]);
        }

        $mutedUntil = $member->pivot->muted_until;
        $isMuted = $mutedUntil && now()->lt($mutedUntil);

        return response()->json([
            'muted' => $isMuted,
            'muted_until' => $isMuted ? $mutedUntil : null,
        ]);
    }
}

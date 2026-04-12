<?php

// app/Http/Controllers/Api/CommunityController.php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Community;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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
        $communities = Community::where('is_private', false)
            ->whereDoesntHave('members', fn($q) => $q->where('user_id', $request->user()->id))
            ->orderByDesc('member_count')
            ->limit(50)
            ->get(['id', 'name', 'slug', 'description', 'image_url', 'category', 'member_count']);

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

        $membership = $community->members()->where('user_id', $request->user()->id)->first();

        return response()->json([
            'community' => [
                ...$community->toArray(),
                'is_member' => !!$membership,
                'my_role' => $membership?->pivot->role,
            ],
        ]);
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

    public function members(string $id): JsonResponse
    {
        $community = Community::findOrFail($id);
        $members = $community->members()
            ->select('users.id', 'username', 'display_name', 'avatar_url')
            ->get()
            ->map(fn($m) => [...$m->only('id', 'username', 'display_name', 'avatar_url'), 'role' => $m->pivot->role]);

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
}

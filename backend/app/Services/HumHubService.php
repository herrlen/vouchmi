<?php

// app/Services/HumHubService.php
// Bridge zwischen HIVE Laravel API und HumHub REST API

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;

class HumHubService
{
    private ?string $baseUrl;
    private ?string $adminToken;

    public function __construct()
    {
        $this->baseUrl = config('services.humhub.url') ? config('services.humhub.url') . '/api/v1' : null;
        $this->adminToken = config('services.humhub.admin_token');
    }

    private function request(?string $userToken = null)
    {
        $token = $userToken ?? $this->adminToken;
        return Http::withHeaders([
            'Authorization' => "Bearer {$token}",
        ])->timeout(15);
    }

    // ── Users ──

    public function createUser(array $data): array
    {
        $response = $this->request()->post("{$this->baseUrl}/user", [
            'account' => [
                'username' => $data['username'],
                'email' => $data['email'],
            ],
            'profile' => [
                'firstname' => $data['display_name'] ?? $data['username'],
                'lastname' => '',
            ],
            'password' => [
                'newPassword' => $data['password'],
            ],
        ]);

        return $response->json();
    }

    public function getUser(int $humhubUserId): ?array
    {
        $response = $this->request()->get("{$this->baseUrl}/user/{$humhubUserId}");
        return $response->successful() ? $response->json() : null;
    }

    public function getUserToken(int $humhubUserId): ?string
    {
        // HumHub JWT Module muss installiert sein
        $response = $this->request()->post("{$this->baseUrl}/auth/impersonate", [
            'userId' => $humhubUserId,
        ]);

        return $response->json('token');
    }

    // ── Spaces (= Communities) ──

    public function createSpace(array $data, ?string $userToken = null): array
    {
        $response = $this->request($userToken)->post("{$this->baseUrl}/space", [
            'name' => $data['name'],
            'description' => $data['description'] ?? '',
            'visibility' => $data['is_private'] ? 0 : 1, // 0=private, 1=public, 2=registered only
            'join_policy' => $data['is_private'] ? 2 : 1, // 1=open, 2=invite only
            'tags' => $data['category'] ? [$data['category']] : [],
        ]);

        return $response->json();
    }

    public function getSpace(int $spaceId): ?array
    {
        $cacheKey = "humhub_space_{$spaceId}";
        return Cache::remember($cacheKey, 120, function () use ($spaceId) {
            $response = $this->request()->get("{$this->baseUrl}/space/{$spaceId}");
            return $response->successful() ? $response->json() : null;
        });
    }

    public function getUserSpaces(int $humhubUserId): array
    {
        $response = $this->request()->get("{$this->baseUrl}/space", [
            'filters' => ['member' => $humhubUserId],
        ]);

        return $response->json('results') ?? [];
    }

    public function addSpaceMember(int $spaceId, int $humhubUserId): bool
    {
        $response = $this->request()->post(
            "{$this->baseUrl}/space/{$spaceId}/membership/{$humhubUserId}"
        );
        Cache::forget("humhub_space_{$spaceId}");
        return $response->successful();
    }

    public function removeSpaceMember(int $spaceId, int $humhubUserId): bool
    {
        $response = $this->request()->delete(
            "{$this->baseUrl}/space/{$spaceId}/membership/{$humhubUserId}"
        );
        Cache::forget("humhub_space_{$spaceId}");
        return $response->successful();
    }

    public function getSpaceMembers(int $spaceId): array
    {
        $response = $this->request()->get(
            "{$this->baseUrl}/space/{$spaceId}/membership"
        );
        return $response->json('results') ?? [];
    }

    // ── Posts (Content) ──

    public function createPost(int $spaceId, array $data, ?string $userToken = null): array
    {
        $response = $this->request($userToken)->post("{$this->baseUrl}/post/container/{$spaceId}", [
            'data' => [
                'message' => $data['content'],
            ],
        ]);

        return $response->json();
    }

    public function getSpacePosts(int $spaceId, int $page = 1, int $limit = 20): array
    {
        $response = $this->request()->get("{$this->baseUrl}/post/container/{$spaceId}", [
            'page' => $page,
            'limit' => $limit,
        ]);

        return $response->json('results') ?? [];
    }

    public function likeContent(int $contentId, ?string $userToken = null): bool
    {
        $response = $this->request($userToken)->post(
            "{$this->baseUrl}/like/{$contentId}"
        );
        return $response->successful();
    }

    public function commentOnContent(int $contentId, string $message, ?string $userToken = null): array
    {
        $response = $this->request($userToken)->post(
            "{$this->baseUrl}/comment/content/{$contentId}",
            ['data' => ['message' => $message]]
        );
        return $response->json();
    }

    // ── Activity Stream ──

    public function getSpaceActivity(int $spaceId, int $limit = 50): array
    {
        $response = $this->request()->get(
            "{$this->baseUrl}/activity/container/{$spaceId}",
            ['limit' => $limit]
        );
        return $response->json('results') ?? [];
    }

    // ── Notifications ──

    public function sendNotification(int $humhubUserId, string $message): bool
    {
        // Custom notification via HumHub notification module
        $response = $this->request()->post("{$this->baseUrl}/notification", [
            'userId' => $humhubUserId,
            'message' => $message,
            'source' => 'hive-commerce',
        ]);
        return $response->successful();
    }
}

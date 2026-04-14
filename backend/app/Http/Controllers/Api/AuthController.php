<?php

// app/Http/Controllers/Api/AuthController.php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => 'required|email|unique:users',
            'username' => 'required|string|min:3|max:30|unique:users|alpha_dash',
            'password' => 'required|string|min:8',
            'display_name' => 'nullable|string|max:50',
            'accept_terms' => 'required|accepted',
        ]);

        $user = User::create([
            'email' => $data['email'],
            'username' => $data['username'],
            'password' => Hash::make($data['password']),
            'display_name' => $data['display_name'] ?? $data['username'],
            'terms_accepted_at' => now(),
            'terms_version' => '1.0',
        ]);

        $token = $user->createToken('vouchmi')->plainTextToken;

        return response()->json([
            'user' => $this->userResponse($user),
            'token' => $token,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $data['email'])->first();

        if (!$user || !Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Die Anmeldedaten sind nicht korrekt.'],
            ]);
        }

        $token = $user->createToken('vouchmi')->plainTextToken;

        return response()->json([
            'user' => $this->userResponse($user),
            'token' => $token,
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $this->userResponse($request->user()),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Ausgeloggt']);
    }

    private function userResponse(User $user): array
    {
        return [
            'id' => $user->id,
            'email' => $user->email,
            'username' => $user->username,
            'display_name' => $user->display_name,
            'avatar_url' => $user->avatar_url,
            'role' => $user->role,
        ];
    }
}

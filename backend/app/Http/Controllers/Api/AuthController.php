<?php

// app/Http/Controllers/Api/AuthController.php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
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
            'role'  => 'nullable|in:user,influencer,brand',
            'phone' => 'nullable|string|max:32',
        ]);

        // Brand-Rolle wird erst durch den Webhook (/brand/subscribe) vergeben;
        // im Onboarding darf der User "brand" als Ziel wählen, Account startet
        // aber als 'user' bis die Subscription aktiv ist.
        $initialRole = in_array($data['role'] ?? null, ['influencer'], true)
            ? $data['role']
            : 'user';

        $user = User::create([
            'email' => $data['email'],
            'username' => $data['username'],
            'password' => Hash::make($data['password']),
            'display_name' => $data['display_name'] ?? $data['username'],
            'role' => $initialRole,
            'phone' => $data['phone'] ?? null,
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

    /**
     * POST /api/auth/forgot-password
     * Erzeugt einen langen Token, speichert ihn gehasht in
     * password_reset_tokens und schickt einen Deep-Link per E-Mail.
     * Antwortet immer mit 200, um Account-Enumeration zu verhindern.
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => 'required|email']);
        $user = User::where('email', $data['email'])->first();

        if ($user) {
            $plainToken = bin2hex(random_bytes(32));

            DB::table('password_reset_tokens')->updateOrInsert(
                ['email' => $data['email']],
                ['token' => Hash::make($plainToken), 'created_at' => now()],
            );

            $resetUrl = 'vouchmi://reset-password'
                . '?token=' . urlencode($plainToken)
                . '&email=' . urlencode($data['email']);

            try {
                Mail::send(
                    'emails.reset-password',
                    [
                        'displayName' => $user->display_name ?: $user->username,
                        'resetUrl'    => $resetUrl,
                    ],
                    function ($m) use ($data) {
                        $m->to($data['email'])->subject('Vouchmi — Passwort zurücksetzen');
                    }
                );
            } catch (\Throwable $e) {
                report($e);
            }
        }

        return response()->json([
            'message' => 'Falls ein Konto existiert, wurde eine E-Mail mit Reset-Link gesendet.',
        ]);
    }

    /**
     * POST /api/auth/reset-password
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email'    => 'required|email',
            'token'    => 'required|string|min:32',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $row = DB::table('password_reset_tokens')->where('email', $data['email'])->first();

        if (!$row || !Hash::check($data['token'], $row->token)) {
            throw ValidationException::withMessages(['token' => ['Ungültiger oder abgelaufener Reset-Link.']]);
        }

        if (now()->diffInMinutes($row->created_at) > 60) {
            DB::table('password_reset_tokens')->where('email', $data['email'])->delete();
            throw ValidationException::withMessages(['token' => ['Link abgelaufen. Bitte erneut anfordern.']]);
        }

        $user = User::where('email', $data['email'])->first();
        if (!$user) {
            throw ValidationException::withMessages(['email' => ['Konto nicht gefunden.']]);
        }

        $user->password = Hash::make($data['password']);
        $user->save();

        DB::table('password_reset_tokens')->where('email', $data['email'])->delete();
        $user->tokens()->delete();

        return response()->json(['message' => 'Passwort erfolgreich zurückgesetzt.']);
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

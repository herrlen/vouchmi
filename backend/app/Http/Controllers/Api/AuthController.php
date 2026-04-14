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

    /**
     * POST /api/auth/forgot-password
     * Erzeugt einen 6-stelligen Code, speichert ihn gehasht in
     * password_reset_tokens und schickt ihn per E-Mail.
     * Antwortet immer mit 200, um Account-Enumeration zu verhindern.
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => 'required|email']);
        $user = User::where('email', $data['email'])->first();

        if ($user) {
            $code = (string) random_int(100000, 999999);

            DB::table('password_reset_tokens')->updateOrInsert(
                ['email' => $data['email']],
                ['token' => Hash::make($code), 'created_at' => now()],
            );

            try {
                Mail::raw(
                    "Hi {$user->username},\n\n" .
                    "dein Vouchmi-Reset-Code lautet: {$code}\n\n" .
                    "Der Code ist 60 Minuten gültig. Falls du den Reset nicht angefordert hast, ignoriere diese E-Mail.\n\n" .
                    "Vouchmi",
                    function ($m) use ($data) {
                        $m->to($data['email'])->subject('Vouchmi: Passwort zurücksetzen');
                    }
                );
            } catch (\Throwable $e) {
                report($e);
            }
        }

        return response()->json([
            'message' => 'Falls ein Konto existiert, wurde ein Reset-Code gesendet.',
        ]);
    }

    /**
     * POST /api/auth/reset-password
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email'    => 'required|email',
            'token'    => 'required|string|size:6',
            'password' => 'required|string|min:8',
        ]);

        $row = DB::table('password_reset_tokens')->where('email', $data['email'])->first();

        if (!$row || !Hash::check($data['token'], $row->token)) {
            throw ValidationException::withMessages(['token' => ['Ungültiger Code.']]);
        }

        if (now()->diffInMinutes($row->created_at) > 60) {
            DB::table('password_reset_tokens')->where('email', $data['email'])->delete();
            throw ValidationException::withMessages(['token' => ['Code abgelaufen. Bitte erneut anfordern.']]);
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

<?php

// app/Http/Controllers/Api/AuthController.php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\TwilioVerifyService;
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
            'username' => 'required|string|min:3|max:20|unique:users|alpha_dash',
            'password' => 'required|string|min:8',
            'display_name' => 'nullable|string|max:25',
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

        $this->sendVerificationMail($user);

        return response()->json([
            'user' => $this->userResponse($user),
            'token' => $token,
        ], 201);
    }

    /**
     * POST /api/auth/send-verification
     * Erneut einen Verify-Link per E-Mail senden (für eingeloggte User).
     */
    public function sendVerification(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user->email_verified_at) {
            return response()->json(['message' => 'E-Mail ist bereits bestätigt.']);
        }
        $this->sendVerificationMail($user);
        return response()->json(['message' => 'Bestätigungs-Link wurde gesendet.']);
    }

    /**
     * POST /api/auth/verify-email
     * Validiert Token aus Deep-Link, setzt email_verified_at.
     * Akzeptiert optional ein Bearer-Token (falls schon eingeloggt) oder läuft
     * public: der Token selbst reicht zur Identifikation.
     */
    public function verifyEmail(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => 'required|email',
            'token' => 'required|string|min:32',
        ]);

        $row = DB::table('email_verification_tokens')->where('email', $data['email'])->first();

        if (!$row || !Hash::check($data['token'], $row->token)) {
            throw ValidationException::withMessages(['token' => ['Ungültiger oder abgelaufener Bestätigungs-Link.']]);
        }

        if (now()->diffInHours($row->created_at) > 24) {
            DB::table('email_verification_tokens')->where('email', $data['email'])->delete();
            throw ValidationException::withMessages(['token' => ['Link abgelaufen. Bitte neuen anfordern.']]);
        }

        $user = User::where('email', $data['email'])->first();
        if (!$user) {
            throw ValidationException::withMessages(['email' => ['Konto nicht gefunden.']]);
        }

        if (!$user->email_verified_at) {
            $user->email_verified_at = now();
            $user->save();
        }

        DB::table('email_verification_tokens')->where('email', $data['email'])->delete();

        return response()->json([
            'message' => 'E-Mail erfolgreich bestätigt.',
            'user' => $this->userResponse($user),
        ]);
    }

    private function sendVerificationMail(User $user): void
    {
        $plainToken = bin2hex(random_bytes(32));

        DB::table('email_verification_tokens')->updateOrInsert(
            ['email' => $user->email],
            ['token' => Hash::make($plainToken), 'created_at' => now()],
        );

        $verifyUrl = rtrim(config('app.url'), '/') . '/verify-email'
            . '?token=' . urlencode($plainToken)
            . '&email=' . urlencode($user->email);

        try {
            Mail::send(
                'emails.verify-email',
                [
                    'displayName' => $user->display_name ?: $user->username,
                    'verifyUrl'   => $verifyUrl,
                ],
                function ($m) use ($user) {
                    $m->to($user->email)->subject('Vouchmi — E-Mail bestätigen');
                }
            );
        } catch (\Throwable $e) {
            report($e);
        }
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

            $resetUrl = rtrim(config('app.url'), '/') . '/reset-password'
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
            'email_verified_at' => $user->email_verified_at,
            'phone_verified_at' => $user->phone_verified_at,
        ];
    }

    /**
     * POST /api/auth/phone/send-code
     * Body: { phone: "+491711234567" }
     * Schickt 6-stelligen Code per SMS via Twilio Verify.
     */
    public function sendPhoneCode(Request $request, TwilioVerifyService $twilio): JsonResponse
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'regex:/^\+[1-9]\d{6,15}$/'],
        ]);

        // Phone-Nummer am User speichern (überschreibt evtl. eine alte unverified Nummer)
        $user = $request->user();
        $user->phone = $data['phone'];
        $user->phone_verified_at = null;
        $user->save();

        $result = $twilio->sendCode($data['phone']);
        if ($result['status'] !== 'pending') {
            return response()->json(['message' => $result['message']], 502);
        }

        return response()->json(['message' => 'Code gesendet.']);
    }

    /**
     * POST /api/auth/phone/verify
     * Body: { code: "123456" }
     * Prüft Code für die am User gespeicherte Phone-Nummer.
     */
    public function verifyPhoneCode(Request $request, TwilioVerifyService $twilio): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'regex:/^\d{4,8}$/'],
        ]);

        $user = $request->user();
        if (!$user->phone) {
            return response()->json(['message' => 'Keine Telefonnummer hinterlegt.'], 422);
        }

        $approved = $twilio->checkCode($user->phone, $data['code']);
        if (!$approved) {
            return response()->json(['message' => 'Code ungültig oder abgelaufen.'], 422);
        }

        $user->phone_verified_at = now();
        $user->save();

        return response()->json([
            'message' => 'Telefonnummer bestätigt.',
            'phone_verified_at' => $user->phone_verified_at,
        ]);
    }
}

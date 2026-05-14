<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\InsufficientCreditsException;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Services\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Internal admin endpoints for credit adjustments. Bearer-Token-gated with a
 * separate secret from the monitoring endpoint (`CREDITS_ADMIN_TOKEN`).
 *
 * Use case: support agent has to manually credit/debit a user after a fraud
 * case, refund-stuck issue, or goodwill compensation. Today this is done via
 * tinker (see RUNBOOK_CREDITS.md) — these endpoints make it scriptable and
 * leave a clean audit trail in wallet_transactions.metadata.agent.
 */
class CreditsAdminController extends Controller
{
    public function __construct(
        private readonly WalletService $wallets,
    ) {}

    /**
     * Common gate: require admin bearer token + structured body.
     * Returns the authenticated agent label (from token-meta or fallback).
     */
    private function guard(Request $request): string|JsonResponse
    {
        $expected = (string) config('credits.admin_token', '');
        if ($expected === '') {
            return response()->json(['error' => 'disabled'], 503);
        }
        if (!hash_equals($expected, (string) $request->bearerToken())) {
            return response()->json(['error' => 'unauthorized'], 401);
        }
        // Agent label for audit: header X-Agent or fallback to "admin".
        return (string) ($request->header('X-Agent') ?: 'admin');
    }

    /**
     * GET /api/internal/credits/admin/wallets/{userId}
     * Returns wallet + last 50 transactions for any user (read-only).
     */
    public function showWallet(Request $request, string $userId): JsonResponse
    {
        $agentOrResponse = $this->guard($request);
        if ($agentOrResponse instanceof JsonResponse) return $agentOrResponse;

        $user = User::find($userId);
        if (!$user) return response()->json(['error' => 'user_not_found'], 404);

        $wallet = Wallet::where('user_id', $user->id)->first();
        $transactions = $wallet
            ? $wallet->transactions()->orderByDesc('created_at')->limit(50)->get()->map(fn ($t) => [
                'id'             => $t->id,
                'type'           => $t->type,
                'credits_delta'  => $t->credits_delta,
                'amount_cents'   => $t->currency_amount_cents,
                'provider'       => $t->payment_provider,
                'provider_ref'   => $t->provider_ref,
                'status'         => $t->status,
                'metadata'       => $t->metadata,
                'created_at'     => $t->created_at?->toIso8601String(),
            ])
            : collect();

        return response()->json([
            'user'   => ['id' => $user->id, 'email' => $user->email, 'username' => $user->username],
            'wallet' => $wallet ? [
                'id'              => $wallet->id,
                'balance_credits' => $wallet->balance_credits,
                'currency'        => $wallet->currency_cached,
            ] : null,
            'transactions' => $transactions,
        ]);
    }

    /**
     * POST /api/internal/credits/admin/adjust
     * Body: { user_id, credits (signed), reason, idempotency_key? }
     *
     * Positive credits → credit() · negative → debit().
     * Idempotency-Key default: "admin-adjust:<random>" — pass explicitly when
     * you want to safely retry a failing call without double-booking.
     */
    public function adjust(Request $request): JsonResponse
    {
        $agentOrResponse = $this->guard($request);
        if ($agentOrResponse instanceof JsonResponse) return $agentOrResponse;
        $agent = $agentOrResponse;

        $data = $request->validate([
            'user_id'         => ['required', 'string'],
            'credits'         => ['required', 'integer', 'not_in:0'],
            'reason'          => ['required', 'string', 'max:255'],
            'idempotency_key' => ['nullable', 'string', 'max:128'],
        ]);

        $user = User::find($data['user_id']);
        if (!$user) return response()->json(['error' => 'user_not_found'], 404);

        $wallet = $this->wallets->getOrCreateWallet($user);
        $idempotencyKey = $data['idempotency_key'] ?? ('admin-adjust:' . (string) Str::ulid());
        $credits = (int) $data['credits'];

        Log::info('admin.credits.adjust', [
            'agent'           => $agent,
            'user_id'         => $user->id,
            'credits'         => $credits,
            'reason'          => $data['reason'],
            'idempotency_key' => $idempotencyKey,
        ]);

        try {
            $tx = $credits > 0
                ? $this->wallets->credit($wallet, $credits, $idempotencyKey, [
                    'type'             => WalletTransaction::TYPE_ADMIN_ADJUST,
                    'payment_provider' => 'admin',
                    'metadata'         => ['reason' => $data['reason'], 'agent' => $agent],
                ])
                : $this->wallets->debit($wallet, abs($credits), $idempotencyKey, [
                    'type'             => WalletTransaction::TYPE_ADMIN_ADJUST,
                    'payment_provider' => 'admin',
                    'metadata'         => ['reason' => $data['reason'], 'agent' => $agent],
                ]);
        } catch (InsufficientCreditsException $e) {
            return response()->json([
                'error'     => 'insufficient_credits',
                'required'  => $e->requested,
                'available' => $e->available,
            ], 402);
        }

        return response()->json([
            'ok'             => true,
            'transaction_id' => $tx->id,
            'balance'        => $wallet->fresh()->balance_credits,
        ]);
    }

    /**
     * POST /api/internal/credits/admin/reverse
     * Body: { transaction_id, reason }
     *
     * Reverses a specific wallet_transaction. Useful for support cases where
     * a topup needs to be rolled back manually before the provider chargeback
     * arrives.
     */
    public function reverse(Request $request): JsonResponse
    {
        $agentOrResponse = $this->guard($request);
        if ($agentOrResponse instanceof JsonResponse) return $agentOrResponse;
        $agent = $agentOrResponse;

        $data = $request->validate([
            'transaction_id' => ['required', 'string'],
            'reason'         => ['required', 'string', 'max:255'],
        ]);

        $tx = WalletTransaction::find($data['transaction_id']);
        if (!$tx) return response()->json(['error' => 'transaction_not_found'], 404);

        Log::warning('admin.credits.reverse', [
            'agent'          => $agent,
            'transaction_id' => $tx->id,
            'wallet_id'      => $tx->wallet_id,
            'reason'         => $data['reason'],
        ]);

        $reversal = $this->wallets->reverse($tx, [
            'reason' => $data['reason'],
            'agent'  => $agent,
        ]);

        return response()->json([
            'ok'            => true,
            'reversal_id'   => $reversal->id,
            'wallet_id'     => $reversal->wallet_id,
            'credits_delta' => $reversal->credits_delta,
        ]);
    }
}

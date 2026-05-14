<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\AppStore\AppleServiceUnavailableException;
use App\Exceptions\AppStore\InvalidBundleException;
use App\Exceptions\AppStore\InvalidProductException;
use App\Exceptions\AppStore\InvalidSignatureException;
use App\Exceptions\AppStore\TransactionAlreadyClaimedException;
use App\Http\Controllers\Controller;
use App\Models\WalletTransaction;
use App\Services\AppStore\IapValidationService;
use App\Services\PayPalService;
use App\Services\TopupGuard;
use App\Services\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class WalletController extends Controller
{
    public function __construct(
        private readonly WalletService $wallets,
        private readonly PayPalService $paypal,
        private readonly TopupGuard $guard,
    ) {}

    /**
     * GET /api/v1/wallet
     * Returns the user's balance + the latest 50 transactions.
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $wallet = $this->wallets->getOrCreateWallet($user);

        $transactions = $wallet->transactions()
            ->orderByDesc('created_at')
            ->limit(50)
            ->get()
            ->map(fn (WalletTransaction $tx) => [
                'id'             => $tx->id,
                'type'           => $tx->type,
                'credits_delta'  => $tx->credits_delta,
                'amount_cents'   => $tx->currency_amount_cents,
                'currency'       => $tx->currency_code,
                'provider'       => $tx->payment_provider,
                'status'         => $tx->status,
                'created_at'     => $tx->created_at?->toIso8601String(),
            ]);

        return response()->json([
            'wallet' => [
                'id'              => $wallet->id,
                'balance_credits' => $wallet->balance_credits,
                'currency'        => $wallet->currency_cached,
            ],
            'transactions' => $transactions,
        ]);
    }

    /**
     * GET /api/v1/wallet/packages
     * Public list of topup packages — clients render the topup grid from this.
     */
    public function packages(): JsonResponse
    {
        return response()->json([
            'enabled'  => (bool) config('credits.enabled'),
            'packages' => config('credits.packages', []),
        ]);
    }

    /**
     * POST /api/v1/wallet/topup/paypal/create-order
     * Body: { package_id }
     *
     * Creates a PayPal order for the requested package. Frontend then
     * redirects the user to `approval_url`; PayPal calls back to the
     * client which calls `capture` (see below).
     */
    public function createPaypalOrder(Request $request): JsonResponse
    {
        $user = $request->user();
        $packageId = (string) $request->input('package_id', '');
        $package = $this->resolvePackage($packageId);

        if (!$package) {
            return response()->json(['error' => 'unknown_package'], 422);
        }

        // Widerruf-Bestätigung (§ 356 Abs. 5 BGB) — der Client muss vor jedem
        // Topup das Erlöschen des Widerrufsrechts aktiv bestätigen. Siehe AGB §10.
        if (!$request->boolean('waiver_accepted')) {
            return response()->json([
                'error'   => 'waiver_required',
                'message' => 'Bitte bestätige, dass du mit der sofortigen Bereitstellung der Credits einverstanden bist und damit dein Widerrufsrecht erlischt.',
            ], 422);
        }

        if ($reason = $this->guard->check($user, (int) $package['price_cents'])) {
            $remaining = $this->guard->remainingCapCents($user);
            return response()->json([
                'error'      => $reason,
                'message'    => 'Für neue Konten gilt in den ersten 30 Tagen eine Aufladegrenze. Bitte versuche es später erneut oder kontaktiere den Support.',
                'remaining_cap_cents' => $remaining,
            ], 422);
        }

        $referenceId = 'wallet-' . $user->id . '-' . (string) Str::ulid();

        $order = $this->paypal->createTopupOrder([
            'reference_id' => $referenceId,
            'amount_cents' => (int) $package['price_cents'],
            'currency'     => $package['currency'],
            'description'  => sprintf('Vouchmi %d Credits', $package['credits']),
            'custom_id'    => $user->id . '|' . $package['id'],
        ]);

        if (!$order['order_id']) {
            return response()->json([
                'error'  => 'paypal_create_failed',
                'status' => $order['status'] ?? 'unknown',
            ], 502);
        }

        return response()->json([
            'order_id'     => $order['order_id'],
            'approval_url' => $order['approval_url'],
            'status'       => $order['status'],
            'package'      => $package,
            'reference_id' => $referenceId,
        ]);
    }

    /**
     * POST /api/v1/wallet/topup/paypal/capture
     * Body: { order_id, package_id }
     *
     * Captures a PayPal order whose approval the user just completed.
     * On success, credits the wallet idempotently (capture id = idempotency key).
     */
    public function capturePaypalOrder(Request $request): JsonResponse
    {
        $user = $request->user();
        $orderId = (string) $request->input('order_id', '');
        $packageId = (string) $request->input('package_id', '');
        $package = $this->resolvePackage($packageId);

        if (!$orderId || !$package) {
            return response()->json(['error' => 'invalid_request'], 422);
        }

        $captureResp = $this->paypal->captureOrder($orderId);
        if (!$captureResp) {
            return response()->json(['error' => 'paypal_capture_failed'], 502);
        }

        // Verify ownership: the order's custom_id contains our user-id|package-id pair.
        $pu = $captureResp['purchase_units'][0] ?? [];
        $cap = $pu['payments']['captures'][0] ?? [];
        $captureId = $cap['id'] ?? null;
        $captureStatus = $cap['status'] ?? null;
        $customId = $pu['custom_id'] ?? null;
        $amountValue = $cap['amount']['value'] ?? null;
        $amountCurrency = $cap['amount']['currency_code'] ?? null;

        if ($customId !== ($user->id . '|' . $package['id'])) {
            Log::warning('wallet.topup.ownership_mismatch', [
                'user_id'   => $user->id,
                'order_id'  => $orderId,
                'custom_id' => $customId,
            ]);
            return response()->json(['error' => 'ownership_mismatch'], 403);
        }

        if ($captureStatus !== 'COMPLETED' || !$captureId) {
            return response()->json([
                'error'  => 'capture_not_completed',
                'status' => $captureStatus,
            ], 422);
        }

        // Cross-check amount — never trust the client-supplied package alone.
        $expectedValue = number_format($package['price_cents'] / 100, 2, '.', '');
        if ($amountValue !== $expectedValue || $amountCurrency !== $package['currency']) {
            Log::warning('wallet.topup.amount_mismatch', [
                'user_id'  => $user->id,
                'expected' => $expectedValue . ' ' . $package['currency'],
                'got'      => $amountValue . ' ' . $amountCurrency,
            ]);
            return response()->json(['error' => 'amount_mismatch'], 422);
        }

        $wallet = $this->wallets->getOrCreateWallet($user);
        $tx = $this->wallets->credit(
            walletOrId: $wallet,
            credits: (int) $package['credits'],
            idempotencyKey: 'paypal-capture:' . $captureId,
            meta: [
                'payment_provider'      => 'paypal',
                'provider_ref'          => $captureId,
                'currency_amount_cents' => (int) $package['price_cents'],
                'currency_code'         => $package['currency'],
                'metadata' => [
                    'package_id' => $package['id'],
                    'order_id'   => $orderId,
                ],
            ],
        );

        return response()->json([
            'ok'             => true,
            'transaction_id' => $tx->id,
            'balance'        => $wallet->fresh()->balance_credits,
        ]);
    }

    /**
     * POST /api/v1/wallet/topup/apple/validate
     * Body: { transaction_id }
     *
     * Validates an Apple IAP Consumable transaction and credits the user's
     * wallet. Idempotent: replaying with the same transaction_id returns the
     * existing wallet transaction without crediting twice.
     */
    public function validateAppleTopup(Request $request, IapValidationService $iap): JsonResponse
    {
        $data = $request->validate([
            'transaction_id' => ['required', 'string', 'max:255'],
        ]);

        // Anti-fraud: enforce new-user topup cap. We can't pre-check the exact
        // amount here (only Apple knows after JWS verification), but we can at
        // least block users whose remaining cap is already exhausted.
        $remaining = $this->guard->remainingCapCents($request->user());
        if ($remaining !== null && $remaining <= 0) {
            return response()->json([
                'error'   => TopupGuard::REJECT_NEW_USER_CAP,
                'message' => 'Für neue Konten gilt in den ersten 30 Tagen eine Aufladegrenze. Bitte versuche es später erneut oder kontaktiere den Support.',
            ], 422);
        }

        try {
            $tx = $iap->validateAndCredit($request->user(), $data['transaction_id']);
        } catch (TransactionAlreadyClaimedException) {
            return response()->json([
                'message' => 'Diese Transaktion gehört zu einem anderen Konto.',
            ], 403);
        } catch (InvalidBundleException | InvalidProductException | InvalidSignatureException $e) {
            Log::info('apple_iap.consumable.rejected', [
                'reason'           => $e->getMessage(),
                'transaction_tail' => substr($data['transaction_id'], -4),
            ]);
            return response()->json([
                'message' => 'Transaktion ungültig.',
            ], 422);
        } catch (AppleServiceUnavailableException $e) {
            Log::warning('apple_iap.consumable.upstream_unavailable', [
                'reason' => $e->getMessage(),
            ]);
            return response()->json([
                'message' => 'Apple-Service vorübergehend nicht erreichbar.',
            ], 503);
        }

        $wallet = $tx->wallet;

        return response()->json([
            'ok'             => true,
            'transaction_id' => $tx->id,
            'credits'        => $tx->credits_delta,
            'balance'        => $wallet?->balance_credits,
        ]);
    }

    private function resolvePackage(string $id): ?array
    {
        foreach ((array) config('credits.packages', []) as $package) {
            if (($package['id'] ?? null) === $id) {
                return $package;
            }
        }
        return null;
    }
}

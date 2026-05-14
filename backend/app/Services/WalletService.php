<?php

namespace App\Services;

use App\Exceptions\InsufficientCreditsException;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Single source of truth for credit balances.
 *
 * All mutations go through credit() / debit() / reverse(). Every mutation
 * is atomic (DB transaction + row lock on the wallet) and idempotent when
 * an idempotency_key is provided.
 */
class WalletService
{
    /**
     * Ensure a wallet exists for the user and return it. Safe to call concurrently.
     */
    public function getOrCreateWallet(User|string $userOrId): Wallet
    {
        $userId = $userOrId instanceof User ? $userOrId->id : $userOrId;

        $wallet = Wallet::where('user_id', $userId)->first();
        if ($wallet) {
            return $wallet;
        }

        try {
            return Wallet::create([
                'user_id'         => $userId,
                'balance_credits' => 0,
                'currency_cached' => 'EUR',
            ]);
        } catch (UniqueConstraintViolationException) {
            // Lost the race — another request created it first.
            return Wallet::where('user_id', $userId)->firstOrFail();
        }
    }

    /**
     * Add credits to a wallet. Idempotent on $idempotencyKey.
     *
     * @param int $credits   Must be > 0.
     * @param array{
     *     type?: string,
     *     payment_provider?: ?string,
     *     provider_ref?: ?string,
     *     currency_amount_cents?: ?int,
     *     currency_code?: ?string,
     *     metadata?: ?array,
     * } $meta
     */
    public function credit(
        Wallet|string $walletOrId,
        int $credits,
        ?string $idempotencyKey = null,
        array $meta = [],
    ): WalletTransaction {
        if ($credits <= 0) {
            throw new InvalidArgumentException('credit() requires a positive amount.');
        }

        return $this->mutate(
            walletOrId: $walletOrId,
            delta: $credits,
            defaultType: WalletTransaction::TYPE_TOPUP,
            idempotencyKey: $idempotencyKey,
            meta: $meta,
        );
    }

    /**
     * Subtract credits from a wallet. Idempotent on $idempotencyKey.
     * Throws InsufficientCreditsException if the balance would go negative.
     *
     * @param int $credits   Must be > 0.
     */
    public function debit(
        Wallet|string $walletOrId,
        int $credits,
        ?string $idempotencyKey = null,
        array $meta = [],
    ): WalletTransaction {
        if ($credits <= 0) {
            throw new InvalidArgumentException('debit() requires a positive amount.');
        }

        return $this->mutate(
            walletOrId: $walletOrId,
            delta: -$credits,
            defaultType: WalletTransaction::TYPE_BOOST_SPEND,
            idempotencyKey: $idempotencyKey,
            meta: $meta,
        );
    }

    /**
     * Reverse a completed transaction (e.g. PayPal chargeback, refund window).
     * Creates a compensating transaction with the inverse delta and marks the
     * original as 'reversed'. Idempotent: calling twice on the same tx is a no-op.
     */
    public function reverse(WalletTransaction|string $transactionOrId, array $meta = []): WalletTransaction
    {
        $originalId = $transactionOrId instanceof WalletTransaction
            ? $transactionOrId->id
            : $transactionOrId;

        return DB::transaction(function () use ($originalId, $meta) {
            /** @var WalletTransaction $original */
            $original = WalletTransaction::query()
                ->lockForUpdate()
                ->findOrFail($originalId);

            // Already reversed → return the existing reversal (idempotent).
            if ($original->status === WalletTransaction::STATUS_REVERSED) {
                $existing = WalletTransaction::where('reverses_transaction_id', $original->id)->first();
                if ($existing) {
                    return $existing;
                }
            }

            if ($original->status !== WalletTransaction::STATUS_COMPLETED
                && $original->status !== WalletTransaction::STATUS_REVERSED
            ) {
                throw new InvalidArgumentException(
                    "Cannot reverse transaction in status '{$original->status}'."
                );
            }

            $wallet = Wallet::query()->lockForUpdate()->findOrFail($original->wallet_id);

            $compensatingDelta = -$original->credits_delta;
            $newBalance = $wallet->balance_credits + $compensatingDelta;

            if ($newBalance < 0) {
                // The user already spent the credits we now need to claw back.
                // We still record the reversal but go negative is not allowed by
                // the column type. Force balance to 0 and flag in metadata so
                // support / fraud can chase the user.
                $meta['clawback_shortfall'] = abs($newBalance);
                $newBalance = 0;
            }

            $wallet->balance_credits = $newBalance;
            $wallet->save();

            $original->status = WalletTransaction::STATUS_REVERSED;
            $original->save();

            return WalletTransaction::create([
                'wallet_id'               => $wallet->id,
                'type'                    => WalletTransaction::TYPE_REVERSAL,
                'credits_delta'           => $compensatingDelta,
                'currency_amount_cents'   => $original->currency_amount_cents,
                'currency_code'           => $original->currency_code,
                'payment_provider'        => $original->payment_provider,
                'provider_ref'            => null,
                'idempotency_key'         => null,
                'status'                  => WalletTransaction::STATUS_COMPLETED,
                'metadata'                => array_merge(['reason' => 'reversal'], $meta),
                'reverses_transaction_id' => $original->id,
            ]);
        });
    }

    /**
     * Shared mutation core. Locks the wallet row, applies the delta, writes a
     * transaction record. Returns the existing transaction if the idempotency
     * key has already been used.
     */
    protected function mutate(
        Wallet|string $walletOrId,
        int $delta,
        string $defaultType,
        ?string $idempotencyKey,
        array $meta,
    ): WalletTransaction {
        $walletId = $walletOrId instanceof Wallet ? $walletOrId->id : $walletOrId;

        // Idempotency: if a transaction with this key already succeeded,
        // return it instead of double-booking. Done outside the DB tx so we
        // don't take a row-lock for a no-op.
        if ($idempotencyKey !== null) {
            $existing = WalletTransaction::where('idempotency_key', $idempotencyKey)->first();
            if ($existing) {
                return $existing;
            }
        }

        try {
            return DB::transaction(function () use ($walletId, $delta, $defaultType, $idempotencyKey, $meta) {
                /** @var Wallet $wallet */
                $wallet = Wallet::query()->lockForUpdate()->findOrFail($walletId);

                $newBalance = $wallet->balance_credits + $delta;

                if ($newBalance < 0) {
                    throw new InsufficientCreditsException(
                        walletId: $wallet->id,
                        requested: abs($delta),
                        available: $wallet->balance_credits,
                    );
                }

                $wallet->balance_credits = $newBalance;
                $wallet->save();

                return WalletTransaction::create([
                    'wallet_id'             => $wallet->id,
                    'type'                  => $meta['type'] ?? $defaultType,
                    'credits_delta'         => $delta,
                    'currency_amount_cents' => $meta['currency_amount_cents'] ?? null,
                    'currency_code'         => $meta['currency_code'] ?? null,
                    'payment_provider'      => $meta['payment_provider'] ?? null,
                    'provider_ref'          => $meta['provider_ref'] ?? null,
                    'idempotency_key'       => $idempotencyKey,
                    'status'                => WalletTransaction::STATUS_COMPLETED,
                    'metadata'              => $meta['metadata'] ?? null,
                ]);
            });
        } catch (UniqueConstraintViolationException $e) {
            // Concurrent caller booked the same idempotency_key or provider_ref
            // between our pre-check and insert. The transaction rolled back, so
            // return the row that actually won the race.
            if ($idempotencyKey !== null) {
                $existing = WalletTransaction::where('idempotency_key', $idempotencyKey)->first();
                if ($existing) {
                    return $existing;
                }
            }
            $providerRef = $meta['provider_ref'] ?? null;
            if ($providerRef !== null) {
                $existing = WalletTransaction::where('provider_ref', $providerRef)->first();
                if ($existing) {
                    return $existing;
                }
            }
            throw $e;
        }
    }
}

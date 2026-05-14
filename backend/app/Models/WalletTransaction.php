<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WalletTransaction extends Model
{
    use HasFactory, HasUuids;

    public const TYPE_TOPUP = 'topup';
    public const TYPE_BOOST_SPEND = 'boost_spend';
    public const TYPE_REFUND = 'refund';
    public const TYPE_ADMIN_ADJUST = 'admin_adjust';
    public const TYPE_MIGRATION_BONUS = 'migration_bonus';
    public const TYPE_REVERSAL = 'reversal';

    public const STATUS_PENDING = 'pending';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_FAILED = 'failed';
    public const STATUS_REVERSED = 'reversed';

    protected $fillable = [
        'wallet_id',
        'type',
        'credits_delta',
        'currency_amount_cents',
        'currency_code',
        'payment_provider',
        'provider_ref',
        'idempotency_key',
        'status',
        'metadata',
        'reverses_transaction_id',
    ];

    protected $casts = [
        'credits_delta'         => 'integer',
        'currency_amount_cents' => 'integer',
        'metadata'              => 'array',
    ];

    public function wallet()
    {
        return $this->belongsTo(Wallet::class);
    }

    public function reverses()
    {
        return $this->belongsTo(self::class, 'reverses_transaction_id');
    }

    public function reversal()
    {
        return $this->hasOne(self::class, 'reverses_transaction_id');
    }
}

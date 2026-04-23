<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Subscription extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'user_id', 'plan_type', 'payment_provider',
        'paypal_subscription_id', 'paypal_status',
        'apple_transaction_id', 'apple_original_transaction_id',
        'status', 'auto_renew',
        'started_at', 'expires_at',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'expires_at' => 'datetime',
        'auto_renew' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Provider-agnostischer Status-Check.
     * Prüft sowohl das neue status-Feld als auch paypal_status für
     * Rückwärtskompatibilität mit bestehenden PayPal-Subscriptions.
     */
    public function isActive(): bool
    {
        if ($this->status === 'active' || $this->status === 'grace_period') {
            return true;
        }
        return $this->paypal_status === 'ACTIVE';
    }

    public function isApple(): bool
    {
        return $this->payment_provider === 'apple_iap';
    }

    public function isPaypal(): bool
    {
        return $this->payment_provider === 'paypal';
    }
}

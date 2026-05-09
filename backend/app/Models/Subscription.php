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
        'apple_product_id', 'expiration_intent', 'last_notification_uuid',
        'environment',
        'status', 'auto_renew',
        'started_at', 'expires_at',
    ];

    protected $casts = [
        'started_at'        => 'datetime',
        'expires_at'        => 'datetime',
        'auto_renew'        => 'boolean',
        'expiration_intent' => 'integer',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Subscription is active if status='active'/'grace_period' AND expires_at
     * is either NULL or still in the future (with a 5min skew tolerance).
     * Legacy paypal_status='ACTIVE' rows without expires_at also count.
     */
    public function scopeActive($query)
    {
        $cutoff = now()->subMinutes(5);
        return $query->where(function ($q) use ($cutoff) {
            $q->where(function ($qq) use ($cutoff) {
                $qq->whereIn('status', ['active', 'grace_period'])
                   ->where(function ($qqq) use ($cutoff) {
                       $qqq->whereNull('expires_at')
                           ->orWhere('expires_at', '>', $cutoff);
                   });
            })->orWhere(function ($qq) use ($cutoff) {
                $qq->where('paypal_status', 'ACTIVE')
                   ->where(function ($qqq) use ($cutoff) {
                       $qqq->whereNull('expires_at')
                           ->orWhere('expires_at', '>', $cutoff);
                   });
            });
        });
    }

    public function isActive(): bool
    {
        $cutoff = now()->subMinutes(5);
        $notExpired = $this->expires_at === null || $this->expires_at->greaterThan($cutoff);
        if (in_array($this->status, ['active', 'grace_period'], true) && $notExpired) {
            return true;
        }
        return $this->paypal_status === 'ACTIVE' && $notExpired;
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

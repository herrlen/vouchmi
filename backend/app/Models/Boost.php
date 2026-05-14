<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Boost extends Model
{
    use HasFactory, HasUuids;

    public const TIER_MINI = 'mini';
    public const TIER_STANDARD = 'standard';
    public const TIER_PRO = 'pro';
    public const TIER_BRAND_PUSH = 'brand_push';

    public const STATUS_ACTIVE = 'active';
    public const STATUS_EXPIRED = 'expired';
    public const STATUS_REFUNDED = 'refunded';
    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'user_id',
        'post_id',
        'tier',
        'credits_spent',
        'multiplier',
        'target_community_ids',
        'starts_at',
        'ends_at',
        'status',
        'stats_impressions',
        'stats_clicks',
        'spend_transaction_id',
    ];

    protected $casts = [
        'credits_spent'        => 'integer',
        'multiplier'           => 'integer',
        'target_community_ids' => 'array',
        'starts_at'            => 'datetime',
        'ends_at'              => 'datetime',
        'stats_impressions'    => 'integer',
        'stats_clicks'         => 'integer',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function post()
    {
        return $this->belongsTo(Post::class);
    }

    public function spendTransaction()
    {
        return $this->belongsTo(WalletTransaction::class, 'spend_transaction_id');
    }

    public function scopeActive($query)
    {
        return $query->where('status', self::STATUS_ACTIVE)
            ->where('starts_at', '<=', now())
            ->where('ends_at', '>', now());
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE
            && $this->starts_at?->lessThanOrEqualTo(now())
            && $this->ends_at?->greaterThan(now());
    }
}

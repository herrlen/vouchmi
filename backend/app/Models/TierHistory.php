<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class TierHistory extends Model
{
    use HasUuids;

    protected $table = 'tier_history';

    protected $fillable = [
        'user_id',
        'from_tier',
        'to_tier',
        'change_type',
        'follower_count_at_change',
        'recommendation_count_at_change',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}

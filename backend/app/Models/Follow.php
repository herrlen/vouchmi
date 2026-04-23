<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Follow extends Model
{
    use HasUuids;

    protected $fillable = ['follower_id', 'following_id'];

    public function follower()
    {
        return $this->belongsTo(User::class, 'follower_id');
    }

    public function following()
    {
        return $this->belongsTo(User::class, 'following_id');
    }

    public static function isMutual(string $userA, string $userB): bool
    {
        return self::where('follower_id', $userA)->where('following_id', $userB)->exists()
            && self::where('follower_id', $userB)->where('following_id', $userA)->exists();
    }
}

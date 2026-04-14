<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Conversation extends Model
{
    use HasUuids;

    protected $fillable = ['user_one_id', 'user_two_id', 'last_message_at'];
    protected $casts = ['last_message_at' => 'datetime'];

    public function userOne() { return $this->belongsTo(User::class, 'user_one_id'); }
    public function userTwo() { return $this->belongsTo(User::class, 'user_two_id'); }
    public function messages() { return $this->hasMany(DirectMessage::class)->orderBy('created_at'); }

    /**
     * Canonical ordering: kleinere UUID als user_one_id.
     * Stellt sicher, dass zwischen zwei Usern nur EINE Konversation existiert.
     */
    public static function between(string $userA, string $userB): self
    {
        [$one, $two] = $userA < $userB ? [$userA, $userB] : [$userB, $userA];

        return self::firstOrCreate(
            ['user_one_id' => $one, 'user_two_id' => $two],
            ['last_message_at' => now()]
        );
    }

    public function otherUserId(string $currentUserId): string
    {
        return $this->user_one_id === $currentUserId ? $this->user_two_id : $this->user_one_id;
    }
}

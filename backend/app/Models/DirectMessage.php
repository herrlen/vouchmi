<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class DirectMessage extends Model
{
    use HasUuids;

    protected $fillable = [
        'conversation_id', 'sender_id', 'receiver_id', 'content', 'post_id', 'read_at',
    ];

    protected $casts = ['read_at' => 'datetime'];

    public function conversation() { return $this->belongsTo(Conversation::class); }
    public function sender() { return $this->belongsTo(User::class, 'sender_id'); }
    public function receiver() { return $this->belongsTo(User::class, 'receiver_id'); }
    public function post() { return $this->belongsTo(Post::class, 'post_id'); }
}

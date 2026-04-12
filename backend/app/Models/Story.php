<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Story extends Model
{
    use HasUuids;

    protected $fillable = ['community_id', 'author_id', 'media_url', 'media_type', 'duration', 'caption', 'view_count', 'expires_at'];
    protected $casts = ['duration' => 'integer', 'expires_at' => 'datetime'];

    public function author()
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function community()
    {
        return $this->belongsTo(Community::class);
    }
}

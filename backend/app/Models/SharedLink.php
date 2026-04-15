<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class SharedLink extends Model
{
    use HasUuids;

    protected $fillable = [
        'shortcode', 'user_id', 'community_id',
        'original_url', 'target_url', 'domain',
        'og_title', 'og_description', 'og_image',
        'click_count',
    ];

    public function user() { return $this->belongsTo(User::class); }
    public function community() { return $this->belongsTo(Community::class); }
    public function clicks() { return $this->hasMany(LinkClick::class, 'shared_link_id'); }
}

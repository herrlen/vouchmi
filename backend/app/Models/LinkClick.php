<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LinkClick extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'post_id', 'user_id', 'community_id', 'shared_link_id',
        'original_url', 'affiliate_url', 'domain',
        'ip_hash', 'user_agent', 'referer', 'country', 'clicked_at',
    ];

    protected $casts = ['clicked_at' => 'datetime'];

    public function sharedLink() { return $this->belongsTo(SharedLink::class, 'shared_link_id'); }
}

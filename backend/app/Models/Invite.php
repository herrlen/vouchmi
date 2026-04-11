<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
class Invite extends Model {
    use HasUuids;
    protected $fillable = ['community_id','invited_by','code','max_uses','expires_at'];
    protected $casts = ['expires_at'=>'datetime'];
    public function community() { return $this->belongsTo(Community::class); }
}

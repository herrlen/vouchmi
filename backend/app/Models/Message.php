<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
class Message extends Model {
    use HasUuids;
    protected $fillable = ['community_id','sender_id','content','link_url','link_title','link_image','link_price'];
    protected $casts = ['link_price'=>'float'];
    public function sender() { return $this->belongsTo(User::class, 'sender_id'); }
}

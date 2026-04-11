<?php
// app/Models/Post.php
namespace App\Models;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
class Post extends Model {
    use HasUuids;
    protected $fillable = ['community_id','author_id','content','post_type','media_urls','link_url','link_affiliate_url','link_title','link_image','link_price','link_domain','like_count','comment_count','click_count'];
    protected $casts = ['media_urls'=>'array','link_price'=>'float'];
    public function author() { return $this->belongsTo(User::class, 'author_id'); }
    public function community() { return $this->belongsTo(Community::class); }
    public function comments() { return $this->hasMany(Comment::class)->oldest(); }
}

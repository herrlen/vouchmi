<?php
// app/Models/Community.php
namespace App\Models;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Community extends Model {
    use HasUuids;
    protected $fillable = ['name','slug','description','image_url','category','is_private','owner_id','humhub_space_id','member_count','tags'];
    protected $casts = ['is_private' => 'boolean', 'tags' => 'array'];
    public function owner() { return $this->belongsTo(User::class, 'owner_id'); }
    public function members() { return $this->belongsToMany(User::class, 'community_members', 'community_id', 'user_id')->withPivot('role','joined_at','muted_until','muted_by'); }
    public function posts() { return $this->hasMany(Post::class)->latest(); }
    public function messages() { return $this->hasMany(Message::class); }
}

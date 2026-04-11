<?php
// app/Models/User.php
namespace App\Models;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable {
    use HasApiTokens, HasUuids;
    protected $fillable = ['email','username','password','display_name','avatar_url','bio','humhub_user_id','role'];
    protected $hidden = ['password','remember_token'];
    public function communities() {
        return $this->belongsToMany(Community::class, 'community_members', 'user_id', 'community_id')->withPivot('role','joined_at');
    }
}

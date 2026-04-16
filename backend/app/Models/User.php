<?php
// app/Models/User.php
namespace App\Models;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable {
    use HasApiTokens, HasUuids;
    protected $fillable = ['email','phone','username','password','display_name','avatar_url','bio','link','role','profile_layout','profile_layout_updated_at','terms_accepted_at','terms_version'];
    protected $hidden = ['password','remember_token'];
    protected function casts(): array
    {
        return [
            'profile_layout' => \App\Enums\ProfileLayout::class,
            'profile_layout_updated_at' => 'datetime',
        ];
    }
    public function communities() {
        return $this->belongsToMany(Community::class, 'community_members', 'user_id', 'community_id')->withPivot('role','joined_at');
    }
}

<?php
// app/Models/User.php
namespace App\Models;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable {
    use HasApiTokens, HasUuids;
    protected $fillable = ['email','phone','username','password','display_name','avatar_url','bio','link','role','profile_layout','profile_layout_updated_at','tier','tier_achieved_at','tier_badge_opacity','tier_below_threshold_since','terms_accepted_at','terms_version','is_seed'];
    protected $hidden = ['password','remember_token'];
    protected function casts(): array
    {
        return [
            'profile_layout' => \App\Enums\ProfileLayout::class,
            'profile_layout_updated_at' => 'datetime',
            'tier_achieved_at' => 'datetime',
            'tier_badge_opacity' => 'float',
            'tier_below_threshold_since' => 'datetime',
        ];
    }
    public function communities() {
        return $this->belongsToMany(Community::class, 'community_members', 'user_id', 'community_id')->withPivot('role','joined_at');
    }

    public function subscriptions() {
        return $this->hasMany(Subscription::class);
    }

    public function brandProfile() {
        return $this->hasOne(BrandProfile::class);
    }

    public function followers() {
        return $this->hasMany(Follow::class, 'following_id');
    }

    public function following() {
        return $this->hasMany(Follow::class, 'follower_id');
    }

    public function hasActiveSubscription(?string $planType = null): bool
    {
        $query = $this->subscriptions()->where(function ($q) {
            // Provider-agnostisch: status='active'/'grace_period' ODER legacy paypal_status='ACTIVE'
            $q->whereIn('status', ['active', 'grace_period'])
              ->orWhere('paypal_status', 'ACTIVE');
        });
        if ($planType) {
            $query->where('plan_type', $planType);
        }
        return $query->exists();
    }

    public function isCreator(): bool
    {
        return $this->role === 'influencer' && $this->hasActiveSubscription('influencer');
    }

    public function isBrand(): bool
    {
        return $this->role === 'brand' && $this->hasActiveSubscription('brand');
    }

    public function isMutualFollow(string $otherUserId): bool
    {
        return Follow::isMutual($this->id, $otherUserId);
    }

    public function canInitiateMessage(User $recipient): bool
    {
        // Brand mit aktivem Abo → kann Influencer anschreiben
        if ($this->role === 'brand' && $this->hasActiveSubscription('brand')) {
            return $recipient->role === 'influencer';
        }

        // Influencer mit aktivem Abo → kann Brands anschreiben
        if ($this->role === 'influencer' && $this->hasActiveSubscription('influencer')) {
            return $recipient->role === 'brand';
        }

        // Alle anderen: nur bei gegenseitigem Follow
        return $this->isMutualFollow($recipient->id);
    }
}

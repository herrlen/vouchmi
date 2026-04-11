<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
class BrandProfile extends Model {
    use HasUuids;
    protected $fillable = ['user_id','brand_name','brand_slug','description','logo_url','cover_url','website_url','industry','is_verified','subscription_plan','subscription_expires_at','stripe_customer_id'];
    protected $casts = ['is_verified'=>'boolean','subscription_expires_at'=>'datetime'];
    public function user() { return $this->belongsTo(User::class); }
    public function seedingCampaigns() { return $this->hasMany(SeedingCampaign::class, 'brand_id'); }
    public function sponsoredDrops() { return $this->hasMany(SponsoredDrop::class, 'brand_id'); }
}

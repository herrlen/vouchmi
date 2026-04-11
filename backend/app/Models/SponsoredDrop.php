<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
class SponsoredDrop extends Model {
    use HasUuids;
    protected $fillable = ['brand_id','community_id','title','description','product_url','discount_code','discount_percent','image_url','revive_campaign_id','votes_yes','votes_no','status','revenue_type','revenue_rate','starts_at','expires_at'];
    protected $casts = ['starts_at'=>'datetime','expires_at'=>'datetime','revenue_rate'=>'float'];
    public function brand() { return $this->belongsTo(BrandProfile::class, 'brand_id'); }
    public function community() { return $this->belongsTo(Community::class); }
}

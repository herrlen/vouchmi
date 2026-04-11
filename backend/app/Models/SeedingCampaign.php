<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
class SeedingCampaign extends Model {
    use HasUuids;
    protected $fillable = ['brand_id','title','description','product_url','product_name','units_available','units_claimed','status'];
    public function brand() { return $this->belongsTo(BrandProfile::class, 'brand_id'); }
}

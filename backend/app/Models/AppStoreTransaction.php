<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class AppStoreTransaction extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id',
        'transaction_id',
        'original_transaction_id',
        'product_id',
        'bundle_id',
        'environment',
        'purchase_date',
        'expires_date',
        'in_app_ownership_type',
        'web_order_line_item_id',
        'raw_payload',
    ];

    protected $casts = [
        'purchase_date' => 'datetime',
        'expires_date'  => 'datetime',
        'raw_payload'   => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}

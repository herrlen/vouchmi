<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class AppStoreNotification extends Model
{
    use HasUuids;

    protected $fillable = [
        'notification_uuid',
        'notification_type',
        'subtype',
        'transaction_id',
        'original_transaction_id',
        'environment',
        'signed_payload',
        'decoded_payload',
        'processed_at',
        'processing_error',
    ];

    protected $casts = [
        'decoded_payload' => 'array',
        'processed_at'    => 'datetime',
    ];
}

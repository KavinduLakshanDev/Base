<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdminBarcodeHistory extends Model
{
    protected $table = 'admin_barcode_history';

    protected $fillable = [
        'user_id',
        'admin_barcode',
        'admin_barcode_token',
        'barcode_month',
        'company_code',
        'is_revoked',
        'revoked_at',
    ];

    protected $hidden = [
        'admin_barcode_token',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

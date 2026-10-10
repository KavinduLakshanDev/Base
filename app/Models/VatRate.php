<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VatRate extends Model
{
    protected $fillable = [
        'company_id',
        'vat_rate',
        'vat_no',
        'effective_date',
        'end_date',
        'is_active',
    ];

    protected $casts = [
        'effective_date' => 'date',
        'end_date' => 'date',
        'is_active' => 'boolean',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}

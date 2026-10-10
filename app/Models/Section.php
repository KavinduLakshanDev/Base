<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Section extends Model
{
    use HasFactory;    protected $fillable = [
        'uuid',
        'company_code',
        'section_code',
        'name',
        'section_type',
        'is_main_stock',
        'is_active',
        'settings_json',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_main_stock' => 'boolean',
        'settings_json' => 'array',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_code', 'company_code');
    }
}

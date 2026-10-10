<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ServiceCharge extends Model
{
    use HasFactory;

    protected $fillable = [
        'charge_code',
        'charge_name',
        'description',
        'amount',
        'charge_type',
        'is_active',
        'company_code',
        'section_code',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
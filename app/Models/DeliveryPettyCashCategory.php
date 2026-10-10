<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DeliveryPettyCashCategory extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'status',
        'company_code',
        'section_code',
        'created_by_id',
    ];

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(DeliveryPettyCashTransaction::class, 'delivery_petty_cash_category_id');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PettyCashCategory extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'status',
        'company_code',
        'section_code',
    ];

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(PettyCashTransaction::class, 'category_id');
    }
}

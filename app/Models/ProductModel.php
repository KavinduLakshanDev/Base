<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class ProductModel extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'models';

    protected $fillable = [
        'uuid',
        'code',
        'name',
        'description',
        'brand_id',
        'company_code',
        'section_code',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
        });
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeByCompany($query, $companyCode)
    {
        return $query->where('company_code', $companyCode);
    }

    public function scopeBySection($query, $sectionCode)
    {
        return $query->where('section_code', $sectionCode);
    }

    public function brand()
    {
        return $this->belongsTo(Brand::class);
    }
}

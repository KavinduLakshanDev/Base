<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Brand extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'brands';

    protected $fillable = [
        'uuid',
        'code',
        'name',
        'description',
        'category_id',
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

    public function category()
    {
        return $this->belongsTo(CodeMaster::class, 'category_id');
    }

    public function products()
    {
        return $this->hasMany(ItemMaster::class, 'brand_id');
    }

    public function models()
    {
        return $this->hasMany(ProductModel::class, 'brand_id');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class CodeMaster extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'uuid',
        'conkey',
        'concode',
        'catkey',
        'cname',
        'description',
        'company_code',
        'section_code',
        'is_active',
        'is_printer_category',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_printer_category' => 'boolean',
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

    public function controlMaster()
    {
        return $this->belongsTo(ControlMaster::class, 'conkey', 'conkey');
    }

    public function scopeByControl($query, $conkey)
    {
        return $query->where('conkey', $conkey);
    }

    public function brands()
    {
        return $this->hasMany(Brand::class, 'category_id');
    }
}
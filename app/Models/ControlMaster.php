<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ControlMaster extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'uuid',
        'concode',
        'conkey',
        'conname',
        'company_code',
        'section_code',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function codeMasters()
    {
        return $this->hasMany(CodeMaster::class, 'conkey', 'conkey');
    }
}
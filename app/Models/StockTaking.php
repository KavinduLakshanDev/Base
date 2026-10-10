<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StockTaking extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_code',
        'taking_number',
        'section_id',
        'taking_date',
        'notes',
        'status',
        'recorded_by',
    ];

    protected $casts = [
        'taking_date' => 'date',
    ];

    public function items()
    {
        return $this->hasMany(StockTakingItem::class, 'taking_id');
    }

    public function section()
    {
        return $this->belongsTo(Section::class, 'section_id');
    }

    public function recorder()
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}

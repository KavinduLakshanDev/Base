<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Quotation extends Model
{
    use HasFactory;

    protected $fillable = [
        'service_job_id',
        'total_amount',
        'notes',
        'items',
        'created_by',
    ];

    protected $casts = [
        'items' => 'json',
        'total_amount' => 'decimal:2',
    ];

    public function serviceJob()
    {
        return $this->belongsTo(ServiceJob::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

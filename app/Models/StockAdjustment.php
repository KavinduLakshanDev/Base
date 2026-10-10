<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StockAdjustment extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_code',
        'adjustment_number',
        'batch_no',
        'section_id',
        'adjustment_date',
        'notes',
        'status',
        'recorded_by',
        'approved_by',
        'total_amount',
        'vehicle_id',
    ];

    protected $casts = [
        'adjustment_date' => 'date',
    ];

    /**
     * Get the items for this adjustment.
     */
    public function items()
    {
        return $this->hasMany(StockAdjustmentItem::class, 'adjustment_id');
    }

    /**
     * Get the section associated with the adjustment.
     */
    public function section()
    {
        return $this->belongsTo(Section::class, 'section_id');
    }

    /**
     * Get the vehicle associated with the adjustment.
     */
    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class, 'vehicle_id');
    }

    /**
     * Get the user who recorded the adjustment.
     */
    public function recorder()
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    /**
     * Get the user who approved the adjustment.
     */
    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}

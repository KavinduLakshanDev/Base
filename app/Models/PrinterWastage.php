<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PrinterWastage extends Model
{
    protected $table = 'printer_wastages';

    protected $fillable = [
        'purchase_det_key',
        'quantity',
        'reason',
        'wastage_date',
        'notes',
        'status',
        'recorded_by',
        'section_id',
    ];

    protected $casts = [
        'wastage_date' => 'date',
        'quantity' => 'decimal:2',
    ];

    /**
     * Get the purchase detail (printer) associated with this wastage.
     */
    public function purchaseDet(): BelongsTo
    {
        return $this->belongsTo(PurchaseDet::class, 'purchase_det_key', 'PerchaseDetKy');
    }

    /**
     * Get the user who recorded this wastage.
     */
    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    /**
     * Get the section where this wastage occurred.
     */
    public function section(): BelongsTo
    {
        return $this->belongsTo(Section::class, 'section_id');
    }
}

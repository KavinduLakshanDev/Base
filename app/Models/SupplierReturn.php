<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupplierReturn extends Model
{
    protected $fillable = [
        'item_type',
        'supplier_invoice_no',
        'item_key',
        'item_master_key',
        'purchase_det_key',
        'supplier_code',
        'quantity',
        'return_value',
        'reason',
        'return_date',
        'notes',
        'status',
        'recorded_by',
        'section_id',
        'company_code',
        'section_code',
        'serial_number',
        'batch_no',
    ];

    protected $casts = [
        'return_date' => 'date',
        'quantity' => 'decimal:2',
        'return_value' => 'decimal:2',
    ];

    /**
     * Get the user who recorded this return.
     */
    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    /**
     * Get the section.
     */
    public function section(): BelongsTo
    {
        return $this->belongsTo(Section::class, 'section_id');
    }

    /**
     * Get the supplier.
     */
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Address::class, 'supplier_code', 'AdrCd');
    }

    /**
     * Get the item (for item returns).
     */
    public function item(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'item_master_key', 'ItmKy');
    }

    /**
     * Get the item price detail (for item returns).
     */
    public function itemPriceDet(): BelongsTo
    {
        return $this->belongsTo(ItemPriceDet::class, 'item_key', 'ItemPriceKey');
    }

    /**
     * Get the purchase detail (for printer returns).
     */
    public function purchaseDet(): BelongsTo
    {
        return $this->belongsTo(PurchaseDet::class, 'purchase_det_key', 'PerchaseDetKy');
    }
}

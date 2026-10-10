<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Wastage extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'category',
        'quantity',
        'unit',
        'cost_price',
        'serial_number',
        'batch_no',
        'warranty',
        'purchase_det_id',
        'stock_in_hand_id',
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
     * Get the product associated with this wastage.
     */
    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id', 'ItmKy');
    }

    /**
     * Get the user who recorded this wastage.
     */
    public function recordedBy()
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    /**
     * Get the purchase detail associated with this wastage (for serialized items).
     */
    public function purchaseDet()
    {
        return $this->belongsTo(PurchaseDet::class, 'purchase_det_id', 'PerchaseDetKy');
    }

    /**
     * Get the stock in hand record associated with this wastage.
     */
    public function stockInHand()
    {
        return $this->belongsTo(StockInHand::class, 'stock_in_hand_id', 'TableKy');
    }

    /**
     * Get the section where this wastage occurred.
     */
    public function section()
    {
        return $this->belongsTo(Section::class, 'section_id');
    }
}

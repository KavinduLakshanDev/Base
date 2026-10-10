<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StockAdjustmentItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'adjustment_id',
        'product_id',
        'adjustment_type',
        'quantity',
        'serial_number',
        'batch_no',
        'cost_price',
        'sale_price',
        'vehicle_sale_price',
        'reason',
        'line_total',
        'current_stock',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'cost_price' => 'decimal:4',
        'sale_price' => 'decimal:4',
        'vehicle_sale_price' => 'decimal:4',
        'line_total' => 'decimal:2',
        'current_stock' => 'decimal:2',
    ];

    /**
     * Get the adjustment header.
     */
    public function adjustment()
    {
        return $this->belongsTo(StockAdjustment::class, 'adjustment_id');
    }

    /**
     * Get the product associated with this item.
     */
    public function product()
    {
        return $this->belongsTo(ItemMaster::class, 'product_id', 'ItmKy');
    }
}

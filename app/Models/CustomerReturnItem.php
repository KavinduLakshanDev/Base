<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerReturnItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_return_id',
        'item_direction',
        'item_code',
        'item_ky',
        'quantity',
        'unit_price',
        'discount_amount',
        'tax_amount',
        'total_amount',
        'batch_no',
        'serial_number',
        'item_type',
        'condition',
        'damage_notes',
        'add_to_stock',
        'stock_location_code',
        'original_sale_item_id',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'unit_price' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'add_to_stock' => 'boolean',
    ];

    /**
     * Get the customer return that owns the item.
     */
    public function customerReturn(): BelongsTo
    {
        return $this->belongsTo(CustomerReturn::class);
    }

    /**
     * Get the original sale item if applicable.
     */
    public function originalSaleItem(): BelongsTo
    {
        return $this->belongsTo(SalesTransactionItem::class, 'original_sale_item_id');
    }

    /**
     * Get the item master record.
     */
    public function itemMaster(): BelongsTo
    {
        // itemmaster primary key is ItmKy, not ItemKy
        return $this->belongsTo(ItemMaster::class, 'item_ky', 'ItmKy');
    }
}

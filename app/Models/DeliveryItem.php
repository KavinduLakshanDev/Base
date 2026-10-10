<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeliveryItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'delivery_id',
        'ItmKy',
        'batch_no',
        'serial_number',
        'brand',
        'model',
        'warranty',
        'section_code',
        'ItemCode',
        'ItemName',
        'Unit',
        'quantity',
        'returned_quantity',
        'unit_price',
        'discount_amount',
        'total_amount',
    ];

    protected $casts = [
        'quantity'          => 'decimal:4',
        'returned_quantity' => 'decimal:4',
        'unit_price'        => 'decimal:4',
        'discount_amount'   => 'decimal:4',
        'total_amount'      => 'decimal:4',
    ];

    public function delivery(): BelongsTo
    {
        return $this->belongsTo(Delivery::class);
    }

    public function itemMaster(): BelongsTo
    {
        return $this->belongsTo(ItemMaster::class, 'ItmKy', 'ItmKy')->where('batch_no', $this->batch_no);
    }

    public function getItemMasterAttribute()
    {
        return ItemMaster::where('ItmKy', $this->ItmKy)
            ->where('batch_no', $this->batch_no)
            ->first();
    }
}

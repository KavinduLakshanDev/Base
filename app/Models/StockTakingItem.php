<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StockTakingItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'taking_id',
        'product_id',
        'batch_no',
        'system_stock',
        'actual_stock',
        'variance',
        'cost_price',
        'notes',
    ];

    protected $casts = [
        'system_stock' => 'decimal:2',
        'actual_stock' => 'decimal:2',
        'variance' => 'decimal:2',
        'cost_price' => 'decimal:4',
    ];

    public function taking()
    {
        return $this->belongsTo(StockTaking::class, 'taking_id');
    }

    public function product()
    {
        return $this->belongsTo(ItemMaster::class, 'product_id', 'ItmKy');
    }
}

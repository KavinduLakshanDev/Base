<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ShopReturnItem extends Model
{
    use HasFactory;

    public function shopReturn(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(ShopReturn::class);
    }

    protected $fillable = [
        'shop_return_id',
        'item_ky',
        'batch_no',
        'quantity',
        'unit_price',
    ];
}

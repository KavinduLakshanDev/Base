<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ShopReturn extends Model
{
    use HasFactory;

    protected $fillable = [
        'shop_id',
        'section_code',
        'delivery_id',
        'recorded_by',
        'company_code',
        'return_date',
        'notes',
        'status',
        'total_return_amount',
        'refund_amount',
        'refund_method',
    ];

    protected $casts = [
        'return_date' => 'date',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(ShopReturnItem::class);
    }

    public function shop()
    {
        return $this->belongsTo(Shop::class);
    }

    public function section()
    {
        return $this->belongsTo(Section::class, 'section_code', 'section_code');
    }

    public function delivery()
    {
        return $this->belongsTo(Delivery::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}

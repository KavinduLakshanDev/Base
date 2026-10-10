<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VehicleStock extends Model
{
    use HasFactory;

    protected $fillable = [
        'vehicle_id',
        'item_ky',
        'batch_no',
        'serial_number',
        'quantity',
        'loaded_quantity',
        'delivered_quantity',
        'reserved_quantity',
        'company_code',
        'last_date',
    ];

    protected $casts = [
        'quantity' => 'decimal:3',
        'reserved_quantity' => 'decimal:3',
        'last_date' => 'date',
    ];

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'item_ky', 'ItmKy');
    }
}

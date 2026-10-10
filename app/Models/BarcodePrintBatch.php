<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BarcodePrintBatch extends Model
{
    use HasFactory;

    protected $table = 'barcode_print_batches';

    protected $fillable = [
        'batch_number',
        'product_id',
        'quantity',
        'status',
        'company_code',
        'section_code',
        'created_by',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(BarcodePrintItem::class, 'batch_id');
    }

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id', 'ItmKy');
    }
}
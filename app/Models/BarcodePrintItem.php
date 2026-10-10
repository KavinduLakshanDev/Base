<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BarcodePrintItem extends Model
{
    use HasFactory;

    protected $table = 'barcode_print_items';

    protected $fillable = [
        'batch_id',
        'barcode',
        'product_id',
        'printed_at',
        'status',
    ];

    protected $casts = [
        'printed_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function batch(): BelongsTo
    {
        return $this->belongsTo(BarcodePrintBatch::class, 'batch_id');
    }

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id', 'ItmKy');
    }
}
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class SalesTransactionItem extends Model
{
    use HasFactory;
    
    protected $appends = ['item_name', 'barcode', 'brand', 'model', 'warranty'];

    protected $fillable = [
        'uuid',
        'sales_transaction_id',
        'invoice_no',
        'item_code',
        'category',
        'unit',
        'batch_no',
        'product_id',
        'company_code',
        'section_code',
        'unit_price',
        'original_price',
        'our_price',
        'cost_price',
        'quantity',
        'free_quantity',
        'discount_amount',
        'discount_percentage',
        'discount_type',
        'retail_tier',
        'retail_tier_qty',
        'retail_tier_discount',
        'tax_amount',
        'tax_percentage',
        'is_tax_inclusive',
        'line_total',
        'line_subtotal',
        'is_free_item',
        'is_return',
        'original_item_id',
        'line_number',
        'notes',
        'price_type',
        'serial_number',
        'vat_inclusive',
        'cus_discount_rate',
        'additional_data',
    ];

    protected $casts = [
        'unit_price' => 'decimal:2',
        'original_price' => 'decimal:2',
        'our_price' => 'decimal:2',
        'cost_price' => 'decimal:2',
        'quantity' => 'decimal:2',
        'free_quantity' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'discount_percentage' => 'decimal:2',
        'cus_discount_rate' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'tax_percentage' => 'decimal:2',
        'line_total' => 'decimal:2',
        'line_subtotal' => 'decimal:2',
        'is_tax_inclusive' => 'boolean',
        'is_free_item' => 'boolean',
        'is_return' => 'boolean',
        'vat_inclusive' => 'boolean',
        'additional_data' => 'array',
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
        });
    }

    /**
     * Get the sales transaction that owns the item.
     */
    public function transaction(): BelongsTo
    {
        return $this->belongsTo(SalesTransaction::class, 'sales_transaction_id');
    }

    /**
     * Get the item master record for the sales item.
     */
    public function item(): BelongsTo
    {
        return $this->belongsTo(ItemMaster::class, 'product_id', 'ItmKy');
    }

    /**
     * Get the item name, falling back to the related product name or item code.
     */
    public function getItemNameAttribute($value)
    {
        // Check if we already have a value (e.g. from a join alias or database column)
        $name = $value ?? $this->attributes['item_name'] ?? null;
        
        if (!empty($name)) {
            return $name;
        }

        if ($this->relationLoaded('item')) {
            return $this->item->ItmNm ?? 'Item ' . $this->item_code;
        }

        return 'Item ' . $this->item_code;
    }

    /**
     * Get the barcode, falling back to the related product's barcode.
     */
    public function getBarcodeAttribute()
    {
        if ($this->relationLoaded('item')) {
            return $this->item->BarCode ?? null;
        }
        return null;
    }

    /**
     * Get the brand, falling back to the related product's brand.
     */
    public function getBrandAttribute()
    {
        if ($this->relationLoaded('item') && $this->item->relationLoaded('brand')) {
            return $this->item->brand->name ?? null;
        }
        return null;
    }

    /**
     * Get the model, falling back to the related product's model.
     */
    public function getModelAttribute()
    {
        if ($this->relationLoaded('item') && $this->item->relationLoaded('model')) {
            return $this->item->model->name ?? null;
        }
        return null;
    }

    /**
     * Get the warranty, falling back to the related product's warranty.
     */
    public function getWarrantyAttribute()
    {
        if ($this->relationLoaded('item')) {
            return $this->item->warranty ?? null;
        }
        return null;
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ServiceJobItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'service_job_id',
        'item_type',
        'ItmKy',
        'item_code',
        'item_name',
        'batch_no',
        'serial_number',
        'brand',
        'model',
        'barcode',
        'quantity',
        'unit_price',
        'discount_amount',
        'cost_price',
        'vat_inclusive',
        'vat_rate',
        'price_before_vat',
        'vat_amount',
        'total_price',
        'description',
        'company_code',
        'section_code',
    ];

    protected $casts = [
        'quantity' => 'decimal:4',
        'unit_price' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'cost_price' => 'decimal:2',
        'vat_inclusive' => 'boolean',
        'vat_rate' => 'decimal:2',
        'price_before_vat' => 'decimal:2',
        'vat_amount' => 'decimal:2',
        'total_price' => 'decimal:2',
        'batch_no' => 'string',
    ];

    public function serviceJob()
    {
        return $this->belongsTo(ServiceJob::class);
    }

    public function itemMaster()
    {
        return $this->belongsTo(ItemMaster::class, 'ItmKy', 'ItmKy');
    }

    protected static function boot()
    {
        parent::boot();

        static::saving(function ($model) {
            // Calculate VAT amounts if item is VAT inclusive
            if ($model->vat_inclusive && $model->vat_rate > 0) {
                $priceWithVat = $model->quantity * $model->unit_price;
                // Calculate price before VAT: Price / (1 + VAT_RATE/100)
                $priceBeforeVat = $priceWithVat / (1 + ($model->vat_rate / 100));
                $vatAmount = $priceWithVat - $priceBeforeVat;
                
                $model->price_before_vat = round($priceBeforeVat, 2);
                $model->vat_amount = round($vatAmount, 2);
                $model->total_price = $priceWithVat;
            } else {
                // No VAT
                $model->price_before_vat = $model->quantity * $model->unit_price;
                $model->vat_amount = 0;
                $model->total_price = $model->quantity * $model->unit_price;
            }
        });

        static::saved(function ($model) {
            $model->serviceJob->updateTotals();
        });

        static::deleted(function ($model) {
            $model->serviceJob->updateTotals();
        });
    }
}
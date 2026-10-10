<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class PurchaseOrderDetail extends Model
{
    use HasFactory;

    protected $table = 'purchase_order_det';
    protected $primaryKey = 'PurchaseOrderDetKy';
    public $incrementing = false;

    protected $fillable = [
        'company_code',
        'section_code',
        'PurchaseOrderDetKy',
        'flnAct',
        'Status',
        'PurchaseOrderKey',
        'iTimKy',
        'Qty',
        'iTimDiscount',
        'CostPrice',
        'SalePrice',
        'DiscountRate',
        'Free',
        'AmountF',
        'NormalCost',
        'WholePrice',
        'VehicleSalePrice',
        'NewCostPrice',
        'CusDiscountRate',
        'remark',
        'discount_type',
    ];

    protected $casts = [
        'flnAct' => 'boolean',
        'Qty' => 'float',
        'DiscountRate' => 'float',
        'CusDiscountRate' => 'float',
        'iTimDiscount' => 'decimal:0',
        'Free' => 'decimal:0',
        'CostPrice' => 'decimal:4',
        'SalePrice' => 'decimal:4',
        'AmountF' => 'decimal:4',
        'NormalCost' => 'decimal:4',
        'WholePrice' => 'decimal:4',
        'VehicleSalePrice' => 'decimal:4',
        'NewCostPrice' => 'decimal:4',
    ];

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class, 'PurchaseOrderKey', 'PurchaseOrderKey');
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_code', 'company_code');
    }

    public function section(): BelongsTo
    {
        return $this->belongsTo(Section::class, 'section_code', 'section_code');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'iTimKy', 'ItmKy');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where(function($q) {
            $q->where('flnAct', false)->orWhereNull('flnAct');
        });
    }

    public function scopeForPurchaseOrder(Builder $query, int $purchaseOrderKey): Builder
    {
        return $query->where('PurchaseOrderKey', $purchaseOrderKey);
    }

    public function scopeForCompany(Builder $query, string $companyCode): Builder
    {
        return $query->where('company_code', $companyCode);
    }
}

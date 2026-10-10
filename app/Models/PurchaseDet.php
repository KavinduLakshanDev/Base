<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class PurchaseDet extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     */
    protected $table = 'purchase_det';

    /**
     * The primary key for the model.
     */
    protected $primaryKey = 'PerchaseDetKy';

    /**
     * Indicates if the IDs are auto-incrementing.
     */
    public $incrementing = false;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'company_code',
        'section_code',
        'PerchaseDetKy',
        'flnAct',
        'Status',
        'PurchaseKey',
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
        'batch_no',
        'serial_number',
        'CusDiscountRate',
        'remark',
        'discount_type',
    ];

    /**
     * The attributes that should be cast.
     */
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

    /**
     * Get the purchase master record that owns this detail.
     */
    public function purchase(): BelongsTo
    {
        return $this->belongsTo(Purchase::class, 'PurchaseKey', 'PurchaseKey');
    }

    /**
     * Get the company for this purchase detail.
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_code', 'company_code');
    }

    /**
     * Get the section for this purchase detail.
     */
    public function section(): BelongsTo
    {
        return $this->belongsTo(Section::class, 'section_code', 'section_code');
    }

    /**
     * Get the item/product for this purchase detail.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'iTimKy', 'ItmKy');
    }

    /**
     * Scope a query to only include active purchase details.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('Status', 'A')
            ->where(function($q) {
                $q->where('flnAct', false)
                  ->orWhereNull('flnAct');
            });
    }

    /**
     * Scope a query to filter by purchase key.
     */
    public function scopeForPurchase(Builder $query, int $purchaseKey): Builder
    {
        return $query->where('PurchaseKey', $purchaseKey);
    }

    /**
     * Scope a query to filter by company.
     */
    public function scopeForCompany(Builder $query, string $companyCode): Builder
    {
        return $query->where('company_code', $companyCode);
    }

    /**
     * Get the net amount (after discounts, before tax).
     */
    public function getNetAmountAttribute(): float
    {
        return $this->TotalVal - $this->TotDiscount - $this->LowDiscount;
    }

    /**
     * Get the grand total (including tax).
     */
    public function getGrandTotalAttribute(): float
    {
        return $this->net_amount + $this->TaxAmount;
    }
}
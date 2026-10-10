<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;

class PurchaseOrder extends Model
{
    use HasFactory;

    protected $table = 'purchase_orders';
    protected $primaryKey = 'PurchaseOrderKey';
    public $incrementing = false;

    protected $fillable = [
        'company_code',
        'section_code',
        'PurchaseOrderKey',
        'flnact',
        'Status',
        'PurchaseOrderNo',
        'PODate',
        'SuppCode',
        'CostTotal',
        'TotalVal',
        'ToIDscount',
        'flused',
        'AddUser',
        'AccKy',
        'Des',
        'TaxAmount',
        'type',
        'item_type',
    ];

    protected $casts = [
        'flnact' => 'boolean',
        'flused' => 'boolean',
        'PODate' => 'datetime',
        'CostTotal' => 'decimal:4',
        'TotalVal' => 'decimal:4',
        'ToIDscount' => 'decimal:4',
        'TaxAmount' => 'decimal:4',
        'type' => 'string',
    ];

    public function details(): HasMany
    {
        return $this->hasMany(PurchaseOrderDetail::class, 'PurchaseOrderKey', 'PurchaseOrderKey');
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_code', 'company_code');
    }

    public function section(): BelongsTo
    {
        return $this->belongsTo(Section::class, 'section_code', 'section_code');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Section::class, 'section_code', 'section_code');
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Address::class, 'SuppCode', 'AdrCd');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(AccMas::class, 'AccKy', 'AccKy');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('flnact', false);
    }

    public function scopeForCompany(Builder $query, string $companyCode): Builder
    {
        return $query->where('company_code', $companyCode);
    }

    public function scopeDateRange(Builder $query, $startDate, $endDate): Builder
    {
        return $query->whereBetween('PODate', [$startDate, $endDate]);
    }

    public function canEdit(): bool
    {
        return $this->Status === 'Pending' && !$this->flused;
    }

    public function canDelete(): bool
    {
        return $this->Status === 'Pending' && !$this->flused;
    }

    public function getFormattedPurchaseOrderNoAttribute(): string
    {
        return sprintf('PO-%06d', $this->PurchaseOrderNo);
    }

    public function getNetAmountAttribute(): float
    {
        return $this->CostTotal - $this->ToIDscount;
    }

    public function getGrandTotalAttribute(): float
    {
        return $this->net_amount + $this->TaxAmount;
    }
}

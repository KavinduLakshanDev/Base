<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;

class Purchase extends Model
{
    use HasFactory;

    protected $table = 'purchase';
    protected $primaryKey = 'PurchaseKey';
    public $incrementing = false;

    protected $fillable = [
        'company_code',
        'section_code',
        'PurchaseKey',
        'flnact',
        'Status',
        'PurchaseNo',
        'GRNDate',
        'SuppCode',
        'CostTotal',
        'TotalVal',
        'ToIDscount',
        'flused',
        'AddUser',
        'OrdTypKy',
        'AccKy',
        'Des',
        'ExtOrdKy',
        'CounterID',
        'PayTrmKy',
        'TaxAmount',
        'CusOrdNo',
        'SuppInvNo',
        'batch_no',
        'barcode',
        'type',
        'balance_amount',
    ];

    protected $casts = [
        'flnact' => 'boolean',
        'flused' => 'boolean',
        'GRNDate' => 'datetime',
        'CostTotal' => 'decimal:4',
        'TotalVal' => 'decimal:4',
        'ToIDscount' => 'decimal:4',
        'TaxAmount' => 'decimal:4',
        'type' => 'string',
    ];

    public function details(): HasMany
    {
        return $this->hasMany(PurchaseDet::class, 'PurchaseKey', 'PurchaseKey');
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
        return $query->where('Status', 'A')->where('flnact', false);
    }

    public function scopeForCompany(Builder $query, string $companyCode): Builder
    {
        return $query->where('company_code', $companyCode);
    }

    public function scopeDateRange(Builder $query, $startDate, $endDate): Builder
    {
        return $query->whereBetween('GRNDate', [$startDate, $endDate]);
    }

    public function canEdit(): bool
    {
        return !$this->flused;
    }

    public function canDelete(): bool
    {
        return !$this->flused;
    }

    public function getFormattedPurchaseNoAttribute(): string
    {
        return sprintf('GRN-%06d', $this->PurchaseNo);
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
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class ItemPriceDet extends Model
{
    use HasFactory;

    protected $table = 'item_price_det';
    protected $primaryKey = 'ItemPriceKey';
    public $incrementing = true;
    public $timestamps = false; 

    protected $fillable = [
        'fInAct',
        'Status',
        'InUse',
        
        'ItmKy',
        'batch_no',
        'serial_number',
        'warranty',
        'company_code',
        'section_code',
        'EffectiveDate',
        'PriceDate',
        'PriceType',
        'CosPri',
        'NCostPrice',
        'SlsPri',
        'RtQty1',
        'RtDis1',
        'RtQty2',
        'RtDis2',
        'CredQty1',
        'CredDis1',
        'CredQty2',
        'CredDis2',
        'RtDisType1',
        'VehicleSalePrice',
        'ChangedDate',
        'uuid',
    ];

    protected $casts = [
        'fInAct' => 'boolean',
        'CosPri' => 'decimal:4',
        'NCostPrice' => 'decimal:4',
        'SlsPri' => 'decimal:4',
        'RtDis1' => 'decimal:4',
        'RtDis2' => 'decimal:4',
        'CredDis1' => 'decimal:4',
        'CredDis2' => 'decimal:4',
        'WSDis1' => 'decimal:4',
        'WSDis2' => 'decimal:4',
        'WSDis3' => 'decimal:4',
        'WSDis4' => 'decimal:4',
        
        'VehicleSalePrice' => 'decimal:4',
        'ChangedDate' => 'datetime',
    ];

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) \Illuminate\Support\Str::uuid();
            }

            // Set company_code and section_code from authenticated user
            if (Auth::check()) {
                $user = Auth::user();
                if (!$model->company_code && $user->company_code) {
                    $model->company_code = $user->company_code;
                }
                if (!$model->section_code && $user->section_code) {
                    $model->section_code = $user->section_code;
                } elseif (!$model->section_code && $user->branch_code) {
                    // Fallback to branch_code if section_code not available
                    $sectionCode = $user->branch_code;
                    if (strpos($sectionCode, '-') !== false) {
                        $parts = explode('-', $sectionCode);
                        $sectionCode = end($parts);
                    }
                    $model->section_code = $sectionCode;
                }
            }
            
            // Set default batch_no if not provided
            if (empty($model->batch_no)) {
                $model->batch_no = 'DEFAULT';
            }
        });
    }

    // Relationship with Product
    public function product()
    {
        return $this->belongsTo(Product::class, function($query) {
            $query->where('ItmKy', $this->ItmKy)
                  ->where('batch_no', $this->batch_no);
        });
    }

    /**
     * Relationship with Company
     */
    public function company()
    {
        return $this->belongsTo(Company::class, 'company_code', 'company_code');
    }

    /**
     * Relationship with Section
     */
    public function section()
    {
        return $this->belongsTo(Section::class, 'section_code', 'section_code');
    }

    /**
     * Scope to filter by company
     */
    public function scopeForCompany($query, $companyCode)
    {
        return $query->where('company_code', $companyCode);
    }

    /**
     * Scope to filter by section
     */
    public function scopeForSection($query, $sectionCode)
    {
        return $query->where('section_code', $sectionCode);
    }

    /**
     * Scope to filter by company and section
     */
    public function scopeForCompanyAndSection($query, $companyCode, $sectionCode)
    {
        return $query->where('company_code', $companyCode)
                    ->where('section_code', $sectionCode);
    }
    
    /**
     * Scope to filter by batch number
     */
    public function scopeForBatch($query, $batchNo)
    {
        return $query->where('batch_no', $batchNo);
    }

    /**
     * Scope to filter by item and batch
     */
    public function scopeForItemAndBatch($query, $itmKy, $batchNo)
    {
        return $query->where('ItmKy', $itmKy)
                    ->where('batch_no', $batchNo);
    }
    
    /**
     * Scope to get latest price for an item and batch
     */
    public function scopeLatestPriceForItemAndBatch($query, $itmKy, $batchNo)
    {
        return $query->where('ItmKy', $itmKy)
                    ->where('batch_no', $batchNo)
                    ->orderBy('ChangedDate', 'desc')
                    ->first();
    }
}

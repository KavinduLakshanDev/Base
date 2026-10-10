<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ItemMaster extends Model
{
    use HasFactory;

    protected $table = 'itemmaster';

    protected $primaryKey = 'ItmKy';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'ItmKy',
        'ItemCode',
        'ItmNm',
        'EnglishName',
        'PartNo',
        'ItmGrp',
        'Unit',
        'PackQty',
        'CosPri',
        'SlsPri',
        'BatchNo',
        'MfgDate',
        'ExpDate',
        'BalQty',
        'company_code',
        'section_code',
        'Status',
        'InUse',
        'fInAct',
        'item_type',
        'RtDis2',
        'RtDisType1',
        'DiscountQty',
        'QuntityDiscount',
        'WithDates',
        'VATItem',
        'DoProcess',
        'DoRound',
        'ProcessRatio',
        'OrderNo',
        'uuid',
        'BarCode',
        'catkey',
        'brand_id',
        'models_id',
        'UnitKy',
        'NCostPrice',
        'VehicleSalePrice',
        'WholePrice',
        'ReOrdlLvl',
        'available_sections',
        'available_business_units',
        'transfer_unit_id',
        'receiving_unit_id',
        'transfer_conversion_factor',
        'SupKey',
        'warranty',
        'is_service',
    ];

    protected $casts = [
        'CosPri' => 'decimal:4',
        'SlsPri' => 'decimal:4',
        'BalQty' => 'decimal:4',
        'NCostPrice' => 'decimal:4',
        'VehicleSalePrice' => 'decimal:4',
        'WholePrice' => 'decimal:4',
        'RtDis1' => 'decimal:4',
        'RtDis2' => 'decimal:4',
        'QuntityDiscount' => 'decimal:4',
        'ProcessRatio' => 'decimal:4',
        'PackQty' => 'decimal:4',
        'transfer_conversion_factor' => 'decimal:4',
        'MfgDate' => 'date',
        'ExpDate' => 'date',
        'fInAct' => 'boolean',
        'WithDates' => 'boolean',
        'VATItem' => 'boolean',
        'DoProcess' => 'boolean',
        'DoRound' => 'boolean',
        'is_service' => 'boolean',
        'available_sections' => 'array',
        'available_business_units' => 'array',
        'brand_id' => 'integer',
        'models_id' => 'integer',
        'UnitKy' => 'integer',
        'SupKey' => 'integer',
    ];

    public function category()
    {
        return $this->belongsTo(CodeMaster::class, 'catkey', 'catkey');
    }

    public function brand()
    {
        return $this->belongsTo(Brand::class, 'brand_id');
    }

    public function model()
    {
        return $this->belongsTo(ProductModel::class, 'models_id');
    }

    public function supplier()
    {
        return $this->belongsTo(AccMas::class, 'SupKey', 'AccKy');
    }

    public function unit()
    {
        return $this->belongsTo(CodeMaster::class, 'UnitKy', 'id');
    }

    public function company()
    {
        return $this->belongsTo(Company::class, 'company_code', 'company_code');
    }

    public function section()
    {
        return $this->belongsTo(Section::class, 'section_code', 'section_code');
    }

    public function priceDetails()
    {
        return $this->hasMany(ItemPriceDet::class, 'ItmKy', 'ItmKy');
    }

    public function stockInHand()
    {
        return $this->hasMany(StockInHand::class, 'ItemKy', 'ItmKy');
    }

    /**
     * Alias for priceDetails so consumers can use more intuitive naming.
     */
    public function prices()
    {
        return $this->priceDetails();
    }

    /**
     * Scope for active items
     */
    public function scopeActive($query)
    {
        return $query->where('Status', 'A');
    }

    /**
     * Scope for items in use
     */
    public function scopeInUse($query)
    {
        return $query->where('InUse', 'Y');
    }

    /**
     * Scope for company
     */
    public function scopeForCompany($query, $companyCode)
    {
        return $query->where('company_code', $companyCode);
    }

    /**
     * Scope for section
     */
    public function scopeForSection($query, $sectionCode)
    {
        return $query->where('section_code', $sectionCode);
    }
}
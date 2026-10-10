<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Product extends Model
{
    use HasFactory;

    protected $table = 'itemmaster';

    protected $primaryKey = 'ItmKy';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'ItmKy',
        'fInAct',
        'Status',
        'item_type',
        'company_code',
        'section_code',
        'ItemCode',
        'BarCode',
        'brand_id',
        'models_id',
        'warranty',
        'ItmNm',
        'EnglishName',
        'catkey',
        'UnitKy',
        'Unit',
        'PackQty',
        'CosPri',
        'NCostPrice',
        'VehicleSalePrice',
        'ReOrdlLvl',
        'SupKey',
        'RtQty1',
        'RtDis1',
        'RtQty2',
        'RtDis2',
        'CredQty1',
        'CredDis1',
        'CredQty2',
        'CredDis2',
        'RtDisType1',
        'SlsPri',
        'VATItem',
        'uuid',
        'available_sections',
        'available_business_units',

        'transfer_unit_id',
        'receiving_unit_id',
        'transfer_conversion_factor',
        'is_service',
    ];

    protected $casts = [
        'fInAct' => 'boolean',
        'VATItem' => 'boolean',
        'is_service' => 'boolean',
        'CosPri' => 'decimal:4',
        'NCostPrice' => 'decimal:4',
        'VehicleSalePrice' => 'decimal:4',
        'SlsPri' => 'decimal:4',
        'RtDis1' => 'decimal:4',
        'RtDis2' => 'decimal:4',
        'CredDis1' => 'decimal:4',
        'CredDis2' => 'decimal:4',
        'PackQty' => 'decimal:4',
        'transfer_conversion_factor' => 'decimal:4',
        'available_sections' => 'array',
        'available_business_units' => 'array',

        'transfer_unit_id' => 'integer',
        'receiving_unit_id' => 'integer',
        'item_type' => 'string',
        'ReOrdlLvl' => 'integer',
        'brand_id' => 'integer',
        'models_id' => 'integer',
        'UnitKy' => 'integer',
        'SupKey' => 'integer',
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
            
            // Auto-generate ItmKy if not provided
            // Must use CAST to avoid lexicographic MAX (e.g. '9' > '10' as string)
            if (empty($model->ItmKy)) {
                $maxItmKy = (int) \Illuminate\Support\Facades\DB::table('itemmaster')
                    ->selectRaw('MAX(CAST(ItmKy AS UNSIGNED)) as max_id')
                    ->value('max_id');
                $model->ItmKy = $maxItmKy + 1;
            }
        });
    }

    public function controllerMaster()
    {
        return $this->belongsTo(ControlMaster::class, 'controller_master_id');
    }
    
    public function category()
    {
        return $this->belongsTo(CodeMaster::class, 'catkey', 'catkey')
            ->where('conkey', 'CAT');
    }

    public function brand()
    {
        return $this->belongsTo(Brand::class, 'brand_id');
    }

    public function model()
    {
        return $this->belongsTo(\App\Models\ProductModel::class, 'models_id');
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

    /**
     * Get price details for this specific product and batch combination
     */
    public function itemPriceDet()
    {
        return $this->hasMany(ItemPriceDet::class, 'ItmKy', 'ItmKy')
            ->latest('ChangedDate');
    }

    /**
     * Get stock in hand records for this product
     */
    public function stockInHand()
    {
        return $this->hasMany(StockInHand::class, 'ItemKy', 'ItmKy');
    }

    /**
     * Get all price details for this product across all batches
     */
    public function allPriceDetails()
    {
        return $this->hasMany(ItemPriceDet::class, 'ItmKy', 'ItmKy')
            ->latest('ChangedDate');
    }

    /**
     * Get all purchase history for this product
     */
    public function purchaseDetails()
    {
        return $this->hasMany(PurchaseDet::class, 'iTimKy', 'ItmKy')
            ->with('purchase')
            ->latest('created_at');
    }
    
    /**
     * Get price details for a specific batch
     */
    public function priceDetailsForBatch($batchNo)
    {
        return $this->hasMany(ItemPriceDet::class, 'ItmKy', 'ItmKy')
            ->latest('ChangedDate');
    }

    /**
     * Override getKey to handle composite primary key
     */
    public function getKey()
    {
        $keys = [];
        foreach ((array) $this->getKeyName() as $key) {
            $keys[$key] = $this->getAttribute($key);
        }
        return count($keys) === 1 ? reset($keys) : $keys;
    }

    /**
     * Override getKeyName to handle composite primary key
     */
    public function getKeyName()
    {
        return $this->primaryKey;
    }
    
    /**
     * Override setKeysForSaveQuery to handle composite primary key
     */
    protected function setKeysForSaveQuery($query)
    {
        $keys = $this->getKeyName();
        if (!is_array($keys)) {
            return parent::setKeysForSaveQuery($query);
        }

        foreach ($keys as $keyName) {
            $query->where($keyName, '=', $this->getKeyForSaveQuery($keyName));
        }

        return $query;
    }

    /**
     * Get the primary key value for a save query for composite keys
     */
    protected function getKeyForSaveQuery($keyName = null)
    {
        if (is_null($keyName)) {
            $keyName = $this->getKeyName();
        }

        if (isset($this->original[$keyName])) {
            return $this->original[$keyName];
        }

        return $this->getAttribute($keyName);
    }

    /**
     * Scope to filter products available in a specific section
     */
    public function scopeAvailableInSection($query, $sectionCode)
    {
        return $query->whereJsonContains('available_sections', $sectionCode);
    }

    /**
     * Scope to filter products available in a specific business unit
     */
    public function scopeAvailableInBusinessUnit($query, $businessUnit)
    {
        return $query->whereJsonContains('available_business_units', $businessUnit);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Address extends Model
{
    use HasFactory;

    protected $table = 'address';

    protected $primaryKey = 'AdrKy';

    public $incrementing = true;

    protected $keyType = 'int';

    protected $fillable = [
        'Status',
        'AdrCd',
        'CtPerson',     // Database column is 'CtPerson'
        'FstNm',
        'IDNo',
        'Title',
        'Address',
        'Country',
        'AdrTypKy',     // Correct: database has 'AdrTypKy'
        'TP1',
        'Fax',
        'Email',
        'Website',
        'AccKy',
        'company_code',
        'section_code',
        'uuid',
        'fVATRegistered',
        'VATNo',
    ];

    protected $casts = [
        'Email' => 'string',
        'company_code' => 'string',
        'section_code' => 'string',
        'fVATRegistered' => 'boolean',
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
        });
    }

    /**
     * Get the account master record associated with this address.
     */
    public function accMas(): BelongsTo
    {
        return $this->belongsTo(AccMas::class, 'AccKy', 'AccKy');
    }

    /**
     * Get the company that owns this address.
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Company::class);
    }

    /**
     * Get the branch that owns this address.
     */
    public function section(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Section::class, 'section_code', 'section_code');
    }

    /**
     * Get the full name of the person.
     */
    public function getFullNameAttribute(): string
    {
        $nameParts = array_filter([
            $this->Title,
            $this->FstNm
        ]);

        return implode(' ', $nameParts);
    }

    /**
     * Get the complete address as a formatted string.
     */
    public function getFormattedAddressAttribute(): string
    {
        $addressParts = array_filter([
            $this->Address,
            $this->Country
        ]);

        return implode(', ', $addressParts);
    }

    /**
     * Scope to get active addresses only (based on Status field).
     */
    public function scopeActive($query)
    {
        return $query->where('Status', 'A'); // Assuming 'A' means Active
    }

    /**
     * Get the address type from code master.
     */
    public function addressType(): BelongsTo
    {
        return $this->belongsTo(CodeMaster::class, 'AdrTypKy', 'id');
    }

    /**
     * Scope to filter by address type.
     */
    public function scopeByType($query, $typeId)
    {
        return $query->where('AdrTypKy', $typeId);
    }

    /**
     * Get the route key for the model.
     */
    public function getRouteKeyName()
    {
        return 'AdrKy';
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(\App\Models\AccMas::class, 'AccKy', 'AccKy');
    }
}

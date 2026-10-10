<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

class AccMas extends Model
{
    use HasFactory;

    protected $table = 'acc_mas';

    protected $primaryKey = 'AccKy';

    public $incrementing = true;

    protected $keyType = 'int';

    protected $fillable = [
        'Status',
        'AccCd',
        'AccNm',
        'AccTyp',
        'company_code',
        'section_code',
        'CurBal',
        'CrLmt',
        'fVATRegistered', // Corrected spelling to match database
        'VATNo',
        'AriaKy',
        'BnkAccNo',
        'BnkAccNm',
        'EnDtm',  // Corrected to match database column name
        'opening_balance',
        'uuid',
    ];

    protected $casts = [
        'CurBal' => 'decimal:2',
        'CrLmt' => 'decimal:2',
        'opening_balance' => 'decimal:2',
        'fVATRegistered' => 'boolean', // Corrected spelling to match database
        'EnDtm' => 'datetime',  // Corrected to match database column name
    ];

    /**
     * Relationship with Company
     */
    public function company()
    {
        return $this->belongsTo(Company::class, 'company_code', 'company_code');
    }

    /**
     * Relationship with Branch
     */
    public function section()
    {
        return $this->belongsTo(Section::class, 'section_code', 'section_code');
    }

    /**
     * Relationship with Address records
     */
    public function addresses()
    {
        return $this->hasMany(Address::class, 'AccKy', 'AccKy');
    }

    /**
     * Scope to filter by company
     */
    public function scopeForCompany($query, $companyCode)
    {
        return $query->where('company_code', $companyCode);
    }

    /**
     * Scope to filter by branch
     */
    public function scopeForBranch($query, $branchCode)
    {
        return $query->where('section_code', $branchCode);
    }

    /**
     * Scope to filter by company and branch
     */
    public function scopeForCompanyAndBranch($query, $companyCode, $branchCode)
    {
        return $query->where('company_code', $companyCode)
                    ->where('section_code', $branchCode);
    }

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

            // Set company_code and branch_code from authenticated user
            if (Auth::check()) {
                $user = Auth::user();
                if (!$model->company_code && $user->company_code) {
                    $model->company_code = $user->company_code;
                }
                if (!$model->section_code && $user->section_code) {
                    // Use the section_code as-is (it's already in the correct format like C1-BR001)
                    $model->section_code = $user->section_code;
                }
            }
        });
    }
}
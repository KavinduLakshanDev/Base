<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TempPrivilagePoint extends Model
{
    use HasFactory;

    protected $table = 'temp_PrivilagePoint';

    protected $fillable = [
        'company_code',
        'section_code',
        'finAct',
        'customer_code',
        'status',
        'pointKey',
        'pointDate',
        'ordNo',
        'cardNo',
        'claimed',
        'entuser',
        'counterID',
        'TrnNo',
        'pointAmount',
        'uuid',
    ];

    protected $casts = [
        'pointDate' => 'date',
        'finAct' => 'boolean',
        'claimed' => 'boolean',
        'pointAmount' => 'decimal:2',
    ];

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
     * Get the company that owns the privilege point.
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_code', 'company_code');
    }

    /**
     * Get the section that owns the privilege point.
     */
    public function section(): BelongsTo
    {
        return $this->belongsTo(Section::class, 'section_code', 'id');
    }

    /**
     * Get the privilege user associated with this point.
     */
    public function privilegeUser(): BelongsTo
    {
        return $this->belongsTo(PrivilegeUser::class, 'customer_code', 'customer_code');
    }

    /**
     * Get the claimed status display name.
     */
    public function getClaimedDisplayAttribute(): string
    {
        return $this->claimed ? 'Claimed' : 'Not Claimed';
    }

    /**
     * Scope to filter claimed points.
     */
    public function scopeClaimed($query)
    {
        return $query->where('claimed', true);
    }

    /**
     * Scope to filter unclaimed points.
     */
    public function scopeUnclaimed($query)
    {
        return $query->where('claimed', false);
    }

    /**
     * Scope to filter by status.
     */
    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Generate unique transaction number using NumberGeneratorService (thread-safe)
     */
    public static function generateTransactionNumber($companyId, $branchId): string
    {
        $numberGenerator = app(\App\Services\NumberGeneratorService::class);
        return $numberGenerator->generate('privilege_transaction', $companyId, $branchId);
    }

    /**
     * Validate if a transaction number is unique
     */
    public static function isTransactionNumberUnique(string $transactionNumber): bool
    {
        return !self::where('TrnNo', $transactionNumber)->exists();
    }

    /**
     * Get transaction number format description
     */
    public static function getTransactionNumberFormat(): string
    {
        return 'TRN + CompanyCode(3) + BranchCode(3) + Sequence(4)';
    }
}

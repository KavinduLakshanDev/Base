<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PrivilagePoint extends Model
{
    use HasFactory;

    protected $table = 'PrivilagePoint';

    protected $fillable = [
        'company_code',
        'section_code',
        'finAct',
        'status',
        'tabelKey',
        'customer_code',
        'pointDate',
        'pointAmount',
        'ordNo',
        'cardNo',
        'claimed',
        'entuser',
        'pointType',
        'uuid',
    ];

    protected $casts = [
        'pointDate' => 'date',
        'finAct' => 'boolean',
        'claimed' => 'boolean',
        'pointAmount' => 'decimal:2',
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
     * Scope to filter by point type.
     */
    public function scopeByPointType($query, string $pointType)
    {
        return $query->where('pointType', $pointType);
    }

    /**
     * Scope to filter by table key.
     */
    public function scopeByTableKey($query, string $tableKey)
    {
        return $query->where('tabelKey', $tableKey);
    }
}

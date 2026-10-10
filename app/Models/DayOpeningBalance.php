<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DayOpeningBalance extends Model
{
    protected $fillable = [
        'user_id',
        'balance_date',
        'opening_balance',
        'currency',
        'status',
        'company_code',
        'section_code',
        'created_by',
        'approved_by',
        'approved_at',
        'notes',
    ];

    protected $casts = [
        'balance_date' => 'date',
        'opening_balance' => 'decimal:2',
        'approved_at' => 'datetime',
    ];

    /**
     * Get the user that owns the day opening balance.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the user who created this balance.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the admin who approved this balance.
     */
    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Get the company this balance belongs to.
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_code', 'company_code');
    }

    /**
     * Get the section this balance belongs to.
     */
    public function section(): BelongsTo
    {
        return $this->belongsTo(Section::class, 'section_code', 'section_code');
    }

    /**
     * Scope to filter by date.
     */
    public function scopeForDate($query, $date)
    {
        return $query->where('balance_date', $date);
    }

    /**
     * Scope to filter by status.
     */
    public function scopeWithStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope to filter by company and section.
     */
    public function scopeForCompanySection($query, $companyCode, $sectionCode)
    {
        return $query->where('company_code', $companyCode)
                    ->where('section_code', $sectionCode);
    }
}

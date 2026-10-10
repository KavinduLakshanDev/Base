<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CashReconciliation extends Model
{
    use HasFactory;

    protected $table = 'cash_reconciliations';

    protected $fillable = [
        'company_code',
        'section_code',
        'user_id',
        'username',
        'reconciliation_date',
        'notes_5000',
        'notes_2000',
        'notes_1000',
        'notes_500',
        'notes_100',
        'notes_50',
        'notes_20',
        'coins',
        'actual_cash',
        'opening_balance',
        'cash_sales',
        'sales_cash',
        'sales_card',
        'sales_bank',
        'sales_cheque',
        'sales_credit',
        'sales_credit_applied',
        'sales_returns',
        'credit_payments',
        'collections_cash',
        'collections_card',
        'collections_bank',
        'collections_cheque',
        'collections_credit_applied',
        'expenses',
        'bank_transfer_payments',
        'cheque_payments',
        'card_payments',
        'transfers',
        'bbf',
        'actual_cheques',
        'actual_cheques_amount',
        'expected_cheques',
        'cheque_variance',
        'expected_closing',
        'variance',
        'notes',
        'status',
    ];

    protected $casts = [
        'reconciliation_date' => 'date',
        'notes_5000' => 'integer',
        'notes_2000' => 'integer',
        'notes_1000' => 'integer',
        'notes_500' => 'integer',
        'notes_100' => 'integer',
        'notes_50' => 'integer',
        'notes_20' => 'integer',
        'coins' => 'decimal:2',
        'actual_cash' => 'decimal:2',
        'opening_balance' => 'decimal:2',
        'cash_sales' => 'decimal:2',
        'sales_cash' => 'decimal:2',
        'sales_card' => 'decimal:2',
        'sales_bank' => 'decimal:2',
        'sales_cheque' => 'decimal:2',
        'sales_credit' => 'decimal:2',
        'sales_returns' => 'decimal:2',
        'credit_payments' => 'decimal:2',
        'collections_cash' => 'decimal:2',
        'collections_card' => 'decimal:2',
        'collections_bank' => 'decimal:2',
        'collections_cheque' => 'decimal:2',
        'expenses' => 'decimal:2',
        'bank_transfer_payments' => 'decimal:2',
        'cheque_payments' => 'decimal:2',
        'card_payments' => 'decimal:2',
        'transfers' => 'decimal:2',
        'bbf' => 'decimal:2',
        'actual_cheques' => 'integer',
        'actual_cheques_amount' => 'decimal:2',
        'expected_cheques' => 'decimal:2',
        'cheque_variance' => 'decimal:2',
        'expected_closing' => 'decimal:2',
        'variance' => 'decimal:2',
    ];

    /**
     * Get the user that owns the reconciliation
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Get the section for this reconciliation
     */
    public function section(): BelongsTo
    {
        return $this->belongsTo(Section::class, 'section_code', 'section_code');
    }

    /**
     * Get the company for this reconciliation
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_code', 'company_code');
    }

    /**
     * Scope to filter by company code
     */
    public function scopeForCompany($query, string $companyCode)
    {
        return $query->where('company_code', $companyCode);
    }

    /**
     * Scope to filter by section code
     */
    public function scopeForSection($query, string $sectionCode)
    {
        return $query->where('section_code', $sectionCode);
    }

    /**
     * Scope to filter by user
     */
    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope to filter by date range
     */
    public function scopeDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('reconciliation_date', [$startDate, $endDate]);
    }

    /**
     * Scope to filter by status
     */
    public function scopeWithStatus($query, string $status)
    {
        return $query->where('status', $status);
    }
}

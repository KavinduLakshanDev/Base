<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class Customer extends Model
{
    use HasFactory;

    protected $table = 'address';

    protected $primaryKey = 'AdrKy';

    protected $fillable = [
        'company_code',
        'section_code',
        'AdrCd',
        'CtPerson',
        'FstNm',
        'LstNm',
        'IDNo',
        'Title',
        'Address',
        'AddressLine2',
        'Locality',
        'Country',
        'Town',
        'City',
        'PostalCode',
        'AdrTypKy',
        'TP1',
        'TP2',
        'Fax',
        'Email',
        'Website',
        'AccKy',
        'uuid',
        'Status',
        'fVATRegistered',
        'VATNo',
        'BRNo',
        'TINNo',
        'is_privilege_user',
        'privilege_card_no',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'fVATRegistered' => 'boolean',
        'is_privilege_user' => 'boolean',
    ];

    /**
     * The "booted" method of the model.
     */
    protected static function booted(): void
    {
        // static::addGlobalScope('customer', function (Builder $builder) {
        //     $builder->where('AdrTypKy', 1);
        // });
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(AccMas::class, 'AccKy', 'AccKy');
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_code', 'company_code');
    }

    public function section(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Section::class, 'section_code', 'section_code');
    }

    public function getCustomerTypeAttribute()
    {
        return $this->account?->AccTyp;
    }

    /**
     * Calculate the actual outstanding balance for this customer.
     * Formula: (Total Billed Jobs + Total Billed Invoices - Advances - Total Payments)
     * Positive = customer owes; Negative = customer has credit (overpaid)
     */
    public function calculateOutstandingBalance(): float
    {
        $accKy = $this->AccKy;
        $adrKy = $this->AdrKy;

        if (!$accKy) {
            return 0;
        }

        // Total billed from service jobs (only finalized/delivered jobs count towards balance)
        $totalBilledJobs = (float) ServiceJob::where('AccKy', $accKy)
            ->where('status', 'delivered')
            ->sum('total_amount');

        // Advance payments already collected (deposits)
        $totalAdvanced = (float) ServiceJob::where('AccKy', $accKy)
            ->where('status', '!=', 'cancelled')
            ->sum('advanced_payment');

        // Total billed from invoices
        $totalBilledInvoices = (float) SalesTransaction::where('customer_id', $adrKy)
            ->sum('total_amount');

        // Total returns (value of goods returned by customer)
        $totalReturns = (float) \App\Models\CustomerReturn::where('customer_id', $adrKy)
            ->where('status', '!=', 'cancelled')
            ->sum('return_value');

        // Total exchanges (value of goods taken by customer in exchange)
        $totalExchanges = (float) \App\Models\CustomerReturn::where('customer_id', $adrKy)
            ->where('status', '!=', 'cancelled')
            ->sum('exchange_amount');

        // Total payments received (exclude service job advance deposits, exchange balance dues, and applied credit)
        $totalPaid = (float) CustomerPayment::withoutServiceAdvancePayments()
            ->where('customer_id', $adrKy)
            ->where('method', '!=', 'exchange_balance_due')
            ->where('method', '!=', 'applied_credit')
            ->where('method', '!=', 'credit_applied')
            ->sum('amount');

        // Total financial debits (Returned cheques, Service charges, manual debits)
        $totalDebits = (float) AccTrn::where('AccKy', $accKy)
            ->where('FInAct', true)
            ->where('Status', 'A')
            ->where('Amt', '>', 0)
            ->sum('Amt');

        // Outstanding = opening_balance + billed - returns + exchanges - advances - paid + debits
        // Positive = owes; Negative = credit
        $openingBalance = (float) ($this->account?->opening_balance ?? 0);
        return (float) ($openingBalance + $totalBilledJobs + $totalBilledInvoices - $totalReturns + $totalExchanges - $totalAdvanced - $totalPaid + $totalDebits);
    }
}
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class CustomerPayment extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_id',
        'customer_code',
        'collected_by',
        'service_job_id',
        'sales_transaction_id',
        'invoice_allocations',
        'amount',
        'date',
        'method',
        'cheque_no',
        'bank_name',
        'branch',
        'card_last_4',
        'card_auth_code',
        'reference',
        'cheque_date',
        'transfer_date',
        'notes',
        'status',
        'is_deposited',
        'deposited_at',
        'deposit_bank_id',
        'selected_bank_id',
        'invoice_allocations',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'date' => 'date',
        'cheque_date' => 'date',
        'transfer_date' => 'date',
        'invoice_allocations' => 'array',
        'is_deposited' => 'boolean',
        'deposited_at' => 'datetime',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'customer_id', 'AdrKy');
    }

    public function serviceJob(): BelongsTo
    {
        return $this->belongsTo(ServiceJob::class);
    }

    public function salesTransaction(): BelongsTo
    {
        return $this->belongsTo(SalesTransaction::class);
    }

    public function scopeWithoutServiceAdvancePayments($query)
    {
        return $query->where(function ($query) {
            $query->whereNull('customer_payments.notes')
                  ->orWhere('customer_payments.notes', 'not like', 'Service advance payment%');
        });
    }

    public function scopeServiceAdvancePayments($query)
    {
        return $query->where('customer_payments.notes', 'like', 'Service advance payment%');
    }

    public function collectedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'collected_by');
    }

    public function depositBank(): BelongsTo
    {
        return $this->belongsTo(BankAccount::class, 'deposit_bank_id');
    }

    public function bankAccount(): BelongsTo
    {
        return $this->belongsTo(\App\Models\BankAccount::class, 'selected_bank_id', 'id');
    }

    /**
     * Get the accounting transaction record for this payment.
     */
    public function accTrn()
    {
        return $this->hasOne(AccTrn::class, 'original_payment_id');
    }
}

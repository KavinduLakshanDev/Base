<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinanceVoucher extends Model
{
    use HasFactory;

    protected $fillable = [
        'finance_voucher_no',
        'date',
        'type',
        'finance_account_id',
        'bank_account_id',
        'expense_account_id',
        'petty_cash_category_id',
        'to_finance_account_id',
        'to_bank_account_id',
        'to_expense_account_id',
        'to_petty_cash_category_id',
        'delivery_petty_cash_category_id',
        'to_delivery_petty_cash_category_id',
        'payer_account',
        'description',
        'amount',
        'slip_path',
        'payment_method',
        'cheque_number',
        'cheque_date',
        'reference_number',
        'section_code',
        'company_code',
        'created_by_id',
    ];

    protected $casts = [
        'date' => 'date',
        'amount' => 'decimal:2',
    ];

    public function financeAccount(): BelongsTo
    {
        return $this->belongsTo(FinanceAccount::class);
    }

    public function bankAccount(): BelongsTo
    {
        return $this->belongsTo(BankAccount::class);
    }

    public function toFinanceAccount(): BelongsTo
    {
        return $this->belongsTo(FinanceAccount::class, 'to_finance_account_id');
    }

    public function toBankAccount(): BelongsTo
    {
        return $this->belongsTo(BankAccount::class, 'to_bank_account_id');
    }

    public function expenseAccount(): BelongsTo
    {
        return $this->belongsTo(ExpenseAccount::class);
    }

    public function pettyCashCategory(): BelongsTo
    {
        return $this->belongsTo(PettyCashCategory::class);
    }

    public function toExpenseAccount(): BelongsTo
    {
        return $this->belongsTo(ExpenseAccount::class, 'to_expense_account_id');
    }

    public function toPettyCashCategory(): BelongsTo
    {
        return $this->belongsTo(PettyCashCategory::class, 'to_petty_cash_category_id');
    }

    public function deliveryPettyCashCategory(): BelongsTo
    {
        return $this->belongsTo(DeliveryPettyCashCategory::class);
    }

    public function toDeliveryPettyCashCategory(): BelongsTo
    {
        return $this->belongsTo(DeliveryPettyCashCategory::class, 'to_delivery_petty_cash_category_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }
}

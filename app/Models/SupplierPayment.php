<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\DB;

class SupplierPayment extends Model
{
    use HasFactory;

    protected $fillable = [
        'payment_no',
        'supplier_id',
        'supplier_code',
        'supplier_name',
        'supplier_address',
        'supplier_tel',
        'payment_method',
        'paid_amount',
        'payment_date',
        'selected_bank_id',
        'cheque_no',
        'cheque_date',
        'cheque_account_no',
        'cheque_bank_name',
        'branch',
        'bank_name',
        'bank_reference_no',
        'bank_deposit_date',
        'bank_account_no',
        'transfer_bank_name',
        'transfer_transaction_id',
        'transfer_date',
        'transfer_reference_no',
        'notes',
        'status',
        'invoice_allocations',
        'company_code',
        'section_code',
        'created_by',
        'created_by_id',
    ];

    protected $casts = [
        'paid_amount' => 'decimal:2',
        'payment_date' => 'date',
        'cheque_date' => 'date',
        'bank_deposit_date' => 'date',
        'transfer_date' => 'date',
        'invoice_allocations' => 'array',
    ];

    /**
     * Relationship with supplier (Address table)
     */
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Address::class, 'supplier_id', 'AdrKy');
    }

    /**
     * Relationship with bank account (for payments made from bank accounts)
     */
    public function bankAccount(): BelongsTo
    {
        return $this->belongsTo(\App\Models\BankAccount::class, 'selected_bank_id', 'id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    /**
     * Generate a unique, sequential payment number.
     *
     * We query the most recent record under a lock and increment its numeric
     * suffix.  This avoids gaps and keeps the sequence easy to follow.  The
     * format is `SPY-000001`, `SPY-000002`, etc.  The table lock prevents
     * concurrent processes from generating the same number.
     */
    public static function generatePaymentNo(): string
    {
        $prefix = 'SPY-';

        // Use a transaction so the FOR UPDATE lock is effective. The caller
        // (usually the store() method) already wraps its work in a transaction,
        // but we defensively start one here if none is active.
        return DB::transaction(function () use ($prefix) {
            // Grab the latest payment_no while locking the table rows
            $last = DB::table('supplier_payments')
                ->select('payment_no')
                ->where('payment_no', 'like', $prefix . '%')
                ->orderBy('id', 'desc')
                ->lockForUpdate()
                ->value('payment_no');

            if ($last) {
                $number = intval(substr($last, strlen($prefix))) + 1;
            } else {
                $number = 1;
            }

            if ($number > 999999) {
                // wrap or throw – for now just wrap around to 1
                $number = 1;
            }

            return $prefix . str_pad($number, 6, '0', STR_PAD_LEFT);
        });
    }
}

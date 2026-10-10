<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class SalesTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid',
        'invoice_no',
        'transaction_date',
        'customer_code',
        'customer_name',
        'price_type',
        'section_code',
        'cashier_id',
        'customer_id',
        'subtotal',
        'discount_amount',
        'discount_percentage',
        'manual_discount_fixed',
        'tax_amount',
        'total_amount',
        'balance_amount',
        'vat_rate',
        'is_vat_invoice',
        'payment_details',
        'status',
        'notes',
        'completed_at',
        'vehicle_id',
        'shop_id',
    ];

    protected $casts = [
        'transaction_date' => 'date',
        'payment_details' => 'array',
        'completed_at' => 'timestamp',
        'subtotal' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'discount_percentage' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'balance_amount' => 'decimal:2',
        'vat_rate' => 'decimal:2',
        'is_vat_invoice' => 'boolean',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class, 'customer_id', 'AdrKy');
    }

    public function cashier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cashier_id');
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class);
    }

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
        });
    }

    public function items(): HasMany
    {
        return $this->hasMany(SalesTransactionItem::class, 'sales_transaction_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(CustomerPayment::class, 'sales_transaction_id');
    }

    /**
     * Recompute and persist the correct balance_amount for a SalesTransaction
     * by reading actual payment data from the customer_payments table.
     *
     * This is the single source of truth. It calculates:
     *   balance_amount = total_amount - (direct payments) - (invoice_allocations targeting this invoice)
     *
     * Calling this after any payment change ensures balance_amount is always accurate.
     */
    public static function recalculateBalance(int $invoiceId): void
    {
        /** @var SalesTransaction|null $invoice */
        $invoice = self::find($invoiceId);
        if (!$invoice) {
            return;
        }

        $totalAmount = (float)$invoice->total_amount;

        // 1. POS Payments (Upfront payments made at the time of sale)
        $posPayments = 0;
        if (is_array($invoice->payment_details)) {
            $details = $invoice->payment_details;
            // Cash, card, cheque, bank_transfer, and points are explicitly saved as CustomerPayment 
            // records linked via sales_transaction_id. We only need to add applied_credit 
            // since it is not saved in CustomerPayment.
            $posPayments = (float)($details['applied_credit'] ?? 0);
        }

        // 2. Payments directly linked via sales_transaction_id
        $directPayments = CustomerPayment::where('sales_transaction_id', $invoiceId)->sum('amount');

        // 3. Payments allocated via invoice_allocations JSON
        //    We must scan all payments for this customer and sum those targeting this invoice_id
        $allocatedPayments = 0;
        $allPaymentsWithAllocations = CustomerPayment::where('customer_id', $invoice->customer_id)
            ->whereNotNull('invoice_allocations')
            ->whereNull('sales_transaction_id') // avoid double-counting direct payments
            ->get(['invoice_allocations']);

        foreach ($allPaymentsWithAllocations as $payment) {
            $allocations = $payment->invoice_allocations;
            if (!is_array($allocations)) continue;
            foreach ($allocations as $alloc) {
                if ((int)($alloc['invoice_id'] ?? 0) === $invoiceId) {
                    $allocatedPayments += (float)($alloc['amount'] ?? 0);
                }
            }
        }

        $totalPaid = $posPayments + $directPayments + $allocatedPayments;
        $newBalance = round(max(0, $totalAmount - $totalPaid), 2);
        $newStatus = $newBalance <= 0 ? 'completed' : ($totalPaid > 0 ? 'partially_paid' : $invoice->status);

        // Only write to DB if something actually changed (avoids observer re-triggering loop)
        if ((float)$invoice->balance_amount !== $newBalance || $invoice->status !== $newStatus) {
            self::withoutEvents(function () use ($invoice, $newBalance, $newStatus) {
                $invoice->balance_amount = $newBalance;
                $invoice->status = $newStatus;
                $invoice->save();
            });
        }
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class CustomerReturn extends Model
{
    use HasFactory;

    protected $fillable = [
        'return_no',
        'return_date',
        'customer_id',
        'customer_code',
        'customer_name',
        'sales_transaction_id',
        'original_invoice_no',
        'section_code',
        'company_code',
        'return_type',
        'total_return_amount',
        'return_value',
        'refund_amount',
        'exchange_amount',
        'refund_method',
        'refund_details',
        'status',
        'notes',
        'reason',
        'processed_by',
        'processed_at',
    ];

    protected $casts = [
        'return_date' => 'date',
        'total_return_amount' => 'decimal:2',
        'return_value' => 'decimal:2',
        'refund_amount' => 'decimal:2',
        'exchange_amount' => 'decimal:2',
        'refund_details' => 'array',
        'processed_at' => 'datetime',
    ];

    /**
     * Get the customer that owns the return.
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'customer_id', 'AdrKy');
    }

    /**
     * Get the original sale transaction if applicable.
     */
    public function salesTransaction(): BelongsTo
    {
        return $this->belongsTo(SalesTransaction::class);
    }

    /**
     * Get the user who processed the return.
     */
    public function processedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }

    /**
     * Get the items for the return.
     */
    public function items(): HasMany
    {
        return $this->hasMany(CustomerReturnItem::class);
    }

    /**
     * Get the section for this return.
     */
    public function section(): BelongsTo
    {
        return $this->belongsTo(Section::class, 'section_code', 'section_code');
    }

    /**
     * Get the company for this return.
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_code', 'company_code');
    }

    /**
     * Generate the next return number.
     *
     * The old format included the full date and was quite long.  New numbers
     * are shorter (`R-{section}-{seq}`) and are generated inside a database
     * transaction with a ``FOR UPDATE`` lock so two concurrent requests will
     * never receive the same value.  The method is safe to call both from a
     * transaction (e.g. in the store() method) or standalone (used by the
     * create() form preview).
     *
     * Example results:
     *   R-SEC1-0001
     *   R-SEC1-0002
     *
     * @param string $sectionCode
     * @return string
     */
    public static function generateReturnNo(string $sectionCode): string
    {
        // wrap in a transaction to ensure the FOR UPDATE lock is applied even
        // when this helper is called from a context that is not already
        // transact-ed (create view).  If we are already inside a transaction the
        // nested call will use a savepoint and behave correctly.
        return DB::transaction(function () use ($sectionCode) {
            $prefix = "R-{$sectionCode}-";

            // lock the rows matching the prefix to prevent two callers from
            // reading the same last number simultaneously.  MySQL will lock the
            // index range; Postgres will do the same.
            $lastReturn = self::where('return_no', 'like', $prefix . '%')
                ->lockForUpdate()
                ->orderBy('return_no', 'desc')
                ->first();

            if ($lastReturn) {
                $lastNumber = (int) substr($lastReturn->return_no, strlen($prefix));
                $newNumber = $lastNumber + 1;
            } else {
                $newNumber = 1;
            }

            return $prefix . str_pad($newNumber, 4, '0', STR_PAD_LEFT);
        });
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class DeliveryPayment extends Model
{
    use HasFactory, SoftDeletes;

    protected static function booted()
    {
        static::saved(function ($payment) {
            if ($payment->delivery && $payment->delivery->shop_id) {
                $shop = Shop::find($payment->delivery->shop_id);
                if ($shop) $shop->updateCurrentBalance();
            }
        });

        static::deleted(function ($payment) {
            if ($payment->delivery && $payment->delivery->shop_id) {
                $shop = Shop::find($payment->delivery->shop_id);
                if ($shop) $shop->updateCurrentBalance();
            }
        });
    }

    protected $fillable = [
        'delivery_id',
        'amount',
        'method',
        'cheque_no',
        'status',
        'service_charge',
        'related_payment_id',
        'bounced_at',
        'reference_no',
        'bank_account_id',
        'bank_name',
        'branch',
        'payment_date',
        'notes',
        'recorded_by',
        'company_code',
        'is_deposited',
        'deposited_at',
        'deposit_bank_id',
    ];

    protected $casts = [
        'amount'         => 'decimal:4',
        'service_charge' => 'decimal:4',
        'payment_date'   => 'date',
        'bounced_at'     => 'datetime',
        'is_deposited'   => 'boolean',
        'deposited_at'   => 'date',
    ];

    public function delivery(): BelongsTo
    {
        return $this->belongsTo(Delivery::class);
    }

    public function bankAccount(): BelongsTo
    {
        return $this->belongsTo(BankAccount::class);
    }

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function relatedPayment(): BelongsTo
    {
        return $this->belongsTo(DeliveryPayment::class, 'related_payment_id');
    }

    public function depositBank(): BelongsTo
    {
        return $this->belongsTo(BankAccount::class, 'deposit_bank_id');
    }
}

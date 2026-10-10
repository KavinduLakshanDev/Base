<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeliveryPettyCashTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'finance_account_id',
        'transaction_no',
        'type',
        'delivery_petty_cash_category_id',
        'amount',
        'transaction_date',
        'notes',
        'slip_path',
        'company_code',
        'section_code',
        'created_by_id',
    ];

    protected $casts = [
        'transaction_date' => 'date',
        'amount' => 'decimal:2',
    ];

    public function scopeReceived($query)
    {
        return $query->where('type', 'received');
    }

    public function scopeUsage($query)
    {
        return $query->where('type', 'usage');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(DeliveryPettyCashCategory::class, 'delivery_petty_cash_category_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }
}

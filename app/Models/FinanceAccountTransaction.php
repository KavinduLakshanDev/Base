<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class FinanceAccountTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'finance_account_id',
        'bank_account_id',
        'date',
        'source_type',
        'source_id',
        'description',
        'method',
        'type',
        'amount',
        'reference',
    ];

    protected $casts = [
        'date' => 'datetime',
        'amount' => 'decimal:2',
    ];

    public function financeAccount(): BelongsTo
    {
        return $this->belongsTo(FinanceAccount::class);
    }

    public function source(): MorphTo
    {
        return $this->morphTo();
    }
}

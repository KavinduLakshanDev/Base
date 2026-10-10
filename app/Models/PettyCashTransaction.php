<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PettyCashTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'finance_account_id',
        'transaction_no',
        'type',
        'category_id',
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
        return $this->belongsTo(PettyCashCategory::class, 'category_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }
}

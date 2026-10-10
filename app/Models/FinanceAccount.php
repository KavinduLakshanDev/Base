<?php

namespace App\Models;

use App\Enums\FinanceAccountType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinanceAccount extends Model
{
    use HasFactory;

    protected $fillable = [
        'account_name',
        'main_category',
        'account_type',
        'opening_balance',
        'cut_off_date',
        'current_balance',
        'company_code',
        'section_code',
        'status',
        'created_by',
    ];

    protected $casts = [
        'main_category' => \App\Enums\FinanceAccountCategory::class,
        'account_type' => FinanceAccountType::class,
        'opening_balance' => 'decimal:2',
        'cut_off_date' => 'datetime',
        'current_balance' => 'decimal:2',
        'status' => 'boolean',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_code', 'company_code');
    }

    public function section(): BelongsTo
    {
        return $this->belongsTo(Section::class, 'section_code', 'section_code');
    }
}

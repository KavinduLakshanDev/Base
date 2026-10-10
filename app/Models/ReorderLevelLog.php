<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReorderLevelLog extends Model
{
    protected $fillable = [
        'reorder_level_id',
        'company_code',
        'section_code',
        'item_code',
        'old_level',
        'new_level',
        'action',
        'changed_by',
    ];

    protected $casts = [
        'old_level' => 'decimal:4',
        'new_level' => 'decimal:4',
    ];

    public function reorderLevel(): BelongsTo
    {
        return $this->belongsTo(ReorderLevel::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}

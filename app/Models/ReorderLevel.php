<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReorderLevel extends Model
{
    protected $fillable = [
        'item_code',
        'company_code',
        'section_code',
        'reorder_level',
    ];

    protected $casts = [
        'reorder_level' => 'decimal:4',
    ];

    /**
     * Get the product associated with this reorder level.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(ItemMaster::class, 'item_code', 'ItemCode');
    }

    /**
     * Get the company associated with this reorder level.
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_code', 'company_code');
    }

    /**
     * Get the section associated with this reorder level.
     */
    public function section(): BelongsTo
    {
        return $this->belongsTo(Section::class, 'section_code', 'section_code');
    }

    /**
     * Reorder level change history for audit/logging purposes.
     */
    public function logs()
    {
        return $this->hasMany(ReorderLevelLog::class);
    }
}

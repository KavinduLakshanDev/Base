<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PrivilegeUser extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid',
        'company_code',
        'section_code',
        'customer_code',
        'privCusName',
        'NIC',
        'address',
        'town',
        'city',
        'country',
        'phone',
        'gender',
        'card_no',
        'regdate',
        'ent_user',
        'finAct',
        'is_active',
        'notes',
    ];

    protected $casts = [
        'regdate' => 'date',
        'finAct' => 'boolean',
        'is_active' => 'boolean',
    ];

    /**
     * Get the company that owns the privilege user.
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_code', 'company_code');
    }

    /**
     * Get the section that owns the privilege user.
     */
    public function section(): BelongsTo
    {
        return $this->belongsTo(Section::class, 'section_code', 'section_code');
    }
}
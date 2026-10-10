<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeliveryRoute extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'areas',
        'company_code',
        'is_active',
    ];

    protected $casts = [
        'areas' => 'array',
        'is_active' => 'boolean',
    ];

    public function deliveries(): HasMany
    {
        return $this->hasMany(Delivery::class);
    }

    public function shops()
    {
        return $this->belongsToMany(Shop::class, 'delivery_route_shop', 'delivery_route_id', 'shop_id')
            ->withPivot('sort_order')
            ->withTimestamps();
    }

    public function users()
    {
        return $this->belongsToMany(User::class, 'delivery_route_user', 'delivery_route_id', 'user_id')
            ->withTimestamps();
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_code', 'company_code');
    }
}
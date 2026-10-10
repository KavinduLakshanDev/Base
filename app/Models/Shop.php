<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Shop extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'address',
        'contact_phone',
        'external_customer_id',
        'delivery_route_id',
        'company_code',
        'is_active',
        'first_name',
        'last_name',
        'br_number',
        'tin_number',
        'address_line_1',
        'address_line_2',
        'locality',
        'city',
        'phone_2',
        'email',
        'current_balance',
        'credit_limit',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function externalCustomer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'external_customer_id', 'AdrKy');
    }

    public function deliveryRoute(): BelongsTo
    {
        return $this->belongsTo(DeliveryRoute::class, 'delivery_route_id');
    }

    public function updateCurrentBalance()
    {
        $deliveries = Delivery::where('shop_id', $this->id)
            ->whereIn('status', ['delivered', 'delivering', 'assigned'])
            ->get();
            
        $this->current_balance = $deliveries->sum('outstanding_balance');
        $this->saveQuietly();
    }
}

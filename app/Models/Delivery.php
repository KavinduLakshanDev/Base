<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Casts\Attribute;

class Delivery extends Model
{
    use HasFactory;

    protected static function booted()
    {
        static::saved(function ($delivery) {
            if ($delivery->shop_id) {
                $shop = Shop::find($delivery->shop_id);
                if ($shop) $shop->updateCurrentBalance();
            }
        });

        static::deleted(function ($delivery) {
            if ($delivery->shop_id) {
                $shop = Shop::find($delivery->shop_id);
                if ($shop) $shop->updateCurrentBalance();
            }
        });
    }

    protected $fillable = [
        'delivery_number',
        'delivery_route_id',
        'assigned_user_id',
        'vehicle_id',
        'section_code',
        'shop_id',
        'status',
        'company_code',
        'customer_name',
        'customer_address',
        'customer_phone',
        'delivery_date',
        'delivery_time',
        'priority',
        'notes',
        'discount_type',
        'discount_value',
    ];

    protected $casts = [
        'status' => 'string',
    ];

    protected $appends = [
        'total_amount',
        'paid_amount',
        'returned_amount',
        'outstanding_balance',
        'payment_status',
    ];

    public function deliveryRoute(): BelongsTo
    {
        return $this->belongsTo(DeliveryRoute::class);
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }

    /**
     * Vehicle the delivery will be taken from (nullable)
     */
    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class, 'vehicle_id');
    }

    /**
     * Section the delivery inventory is sourced from (nullable)
     */
    public function section(): BelongsTo
    {
        return $this->belongsTo(Section::class, 'section_code', 'section_code');
    }

    /**
     * Shop (destination) for this delivery (nullable)
     */
    public function shop(): BelongsTo
    {
        return $this->belongsTo(Shop::class, 'shop_id');
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_code', 'company_code');
    }

    public function items(): HasMany
    {
        return $this->hasMany(DeliveryItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(DeliveryPayment::class);
    }

    public function shopReturns(): HasMany
    {
        return $this->hasMany(ShopReturn::class, 'delivery_id');
    }

    // ── Payment accessors ──────────────────────────────────────────────────────

    public function getTotalAmountAttribute(): float
    {
        $itemTotal = (float) $this->items->sum(
            fn ($item) => (float) ($item->total_amount ?? 0)
        );

        // Add service charges (stored as negative amounts in the payments table)
        $serviceCharges = (float) $this->payments
            ->where('amount', '<', 0)
            ->sum(fn ($p) => abs((float)($p->amount ?? 0)));

        $subtotal = $itemTotal + $serviceCharges;
        
        $discountAmount = 0;
        if ($this->discount_type === 'percentage') {
            $discountAmount = ($subtotal * ($this->discount_value ?? 0)) / 100;
        } else {
            $discountAmount = (float) ($this->discount_value ?? 0);
        }

        return max(0, $subtotal - $discountAmount);
    }

    public function getPaidAmountAttribute(): float
    {
        return (float) $this->payments
            ->where('status', '!=', 'bounced')
            ->where('method', '!=', 'credit_note')
            ->sum(fn ($p) => (float) ($p->amount ?? 0));
    }

    public function getReturnedAmountAttribute(): float
    {
        return (float) $this->items->sum(
            fn ($item) => (float) (($item->returned_quantity ?? 0) * ($item->unit_price ?? 0))
        );
    }

    public function getOutstandingBalanceAttribute(): float
    {
        return $this->total_amount - $this->paid_amount - $this->returned_amount;
    }

    public function getPaymentStatusAttribute(): string
    {
        $total = $this->total_amount;
        $paid  = $this->paid_amount;
        $returned = $this->returned_amount;
        
        $net_total = $total - $returned;

        // Zero-charge deliveries are considered paid immediately
        if ($net_total <= 0) {
            return 'paid';
        }

        // Allow ±0.005 rounding tolerance for full payment
        if (abs($paid - $net_total) < 0.005 || $paid >= $net_total) {
            return 'paid';
        }

        if ($paid > 0) {
            return 'partial';
        }

        return 'unpaid';
    }
}
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Facades\Auth;

class ServiceJob extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'uuid',
        'job_number',
        'invoice_number',
        'invoice_date',
        'AccKy',
        'customer_name',
        'customer_phone',
        'customer_email',
        'customer_address',
        'customer_vat_no',
        'device_name',
        'device_model',
        'device_brand',
        'device_serial',
        'device_barcode',
        'device_warranty',
        'problem_description',
        'received_date',
        'estimated_completion_date',
        'actual_completion_date',
        'delivered_date',
        'assigned_technician_id',
        'technician_name',
        'status',
        'total_service_charge',
        'total_parts_cost',
        'total_amount',
        'is_vat_invoice',
        'vat_rate',
        'subtotal_before_vat',
        'vat_amount',
        'paid_amount',
        'balance_amount',
        'advanced_payment',
        'technician_notes',
        'admin_notes',
        'company_code',
        'company_vat_no',
        'section_code',
        'created_by',
    ];

    protected $casts = [
        'received_date' => 'date',
        'estimated_completion_date' => 'date',
        'actual_completion_date' => 'date',
        'delivered_date' => 'date',
        'invoice_date' => 'datetime',
        'total_service_charge' => 'decimal:2',
        'total_parts_cost' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'is_vat_invoice' => 'boolean',
        'vat_rate' => 'decimal:2',
        'subtotal_before_vat' => 'decimal:2',
        'vat_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'balance_amount' => 'decimal:2',
        'advanced_payment' => 'decimal:2',
    ];

    public function items()
    {
        return $this->hasMany(ServiceJobItem::class);
    }

    public function statusHistory()
    {
        return $this->hasMany(ServiceJobStatus::class);
    }

    public function customer()
    {
        return $this->belongsTo(AccMas::class, 'AccKy', 'AccKy');
    }

    public function technician()
    {
        return $this->belongsTo(User::class, 'assigned_technician_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function parts()
    {
        return $this->items()->where('item_type', 'part');
    }

    public function serviceCharges()
    {
        return $this->items()->where('item_type', 'service_charge');
    }

    public function payments()
    {
        return $this->hasMany(CustomerPayment::class);
    }

    public function quotations()
    {
        return $this->hasMany(Quotation::class, 'service_job_id');
    }

    public function photos()
    {
        return $this->hasMany(ServiceJobPhoto::class);
    }

    public function messages()
    {
        return $this->hasMany(ServiceJobMessage::class);
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->job_number)) {
                $model->job_number = 'SJ-' . date('Ymd') . '-' . str_pad((string) random_int(1, 9999), 4, '0', STR_PAD_LEFT);
            }
            if (empty($model->uuid)) {
                $model->uuid = (string) \Illuminate\Support\Str::uuid();
            }
            // Set technician name when creating
            $model->syncTechnicianName();
        });

        static::updating(function ($model) {
            // Set technician name when updating assigned_technician_id
            if ($model->isDirty('assigned_technician_id')) {
                $model->syncTechnicianName();
            }
        });

        static::created(function ($model) {
            $model->statusHistory()->create([
                'status' => $model->status,
                'notes' => 'Job created',
                'changed_by' => Auth::id() ?? null,
            ]);
        });

        static::updated(function ($model) {
            if ($model->isDirty('status')) {
                $model->statusHistory()->create([
                    'status' => $model->status,
                    'notes' => 'Status updated',
                    'changed_by' => Auth::id() ?? null,
                ]);
            }
        });
    }

    public function updateTotals()
    {
        $partsTotal = $this->parts()->sum('total_price');
        $serviceTotal = $this->serviceCharges()->sum('total_price');
        
        $this->total_parts_cost = $partsTotal;
        $this->total_service_charge = $serviceTotal;
        
        // Calculate VAT if this is a VAT invoice
        if ($this->is_vat_invoice) {
            // Use price_before_vat for subtotal and vat_amount for VAT
            $subtotalBeforeVat = $this->items()->sum('price_before_vat');
            $itemsVatTotal = $this->items()->sum('vat_amount');
            
            $this->subtotal_before_vat = $subtotalBeforeVat;
            $this->vat_amount = $itemsVatTotal;
            $this->total_amount = $partsTotal + $serviceTotal;
        } else {
            $this->subtotal_before_vat = 0;
            $this->vat_amount = 0;
            $this->total_amount = $partsTotal + $serviceTotal;
        }
        
        $this->balance_amount = ($this->total_amount - $this->advanced_payment) - $this->paid_amount;
        $this->save();
    }

    public function syncTechnicianName()
    {
        if ($this->assigned_technician_id) {
            $technician = User::find($this->assigned_technician_id);
            if ($technician) {
                $this->technician_name = trim($technician->first_name . ' ' . $technician->last_name);
            } else {
                $this->technician_name = null;
            }
        } else {
            $this->technician_name = null;
        }
    }

    public function getTechnicianNameAttribute($value)
    {
        // If we have a technician assigned, always return the current name
        if ($this->assigned_technician_id && $this->technician) {
            return trim($this->technician->first_name . ' ' . $this->technician->last_name);
        }
        
        // Otherwise return the stored value
        return $value;
    }

    public static function syncAllTechnicianNames()
    {
        $jobs = self::whereNotNull('assigned_technician_id')->get();
        
        foreach ($jobs as $job) {
            $job->syncTechnicianName();
            $job->save();
        }
        
        return $jobs->count();
    }
}
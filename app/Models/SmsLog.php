<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class SmsLog extends Model
{
    use HasFactory;

    protected $table = 'sms_logs';

    protected $fillable = [
        'company_code',
        'section_code',
        'phone_number',
        'message',
        'reference_id',
        'reference_type',
        'status',
        'provider',
        'provider_message_id',
        'cost',
        'error_message',
        'response_data',
        'retry_count',
        'sent_at',
        'delivered_at'
    ];

    protected $casts = [
        'cost' => 'decimal:4',
        'response_data' => 'array',
        'retry_count' => 'integer',
        'sent_at' => 'datetime',
        'delivered_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Scope for filtering by company and section
     */
    public function scopeForCompanySection($query, string $companyCode, string $sectionCode)
    {
        return $query->where('company_code', $companyCode)
                    ->where('section_code', $sectionCode);
    }

    /**
     * Scope for filtering by phone number
     */
    public function scopeByPhoneNumber($query, string $phoneNumber)
    {
        return $query->where('phone_number', $phoneNumber);
    }

    /**
     * Scope for filtering by reference
     */
    public function scopeByReference($query, string $referenceId, ?string $referenceType = null)
    {
        $query = $query->where('reference_id', $referenceId);
        
        if ($referenceType) {
            $query->where('reference_type', $referenceType);
        }
        
        return $query;
    }

    /**
     * Scope for filtering by status
     */
    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope for filtering by provider
     */
    public function scopeByProvider($query, string $provider)
    {
        return $query->where('provider', $provider);
    }

    /**
     * Check if SMS was delivered successfully
     */
    public function isDelivered(): bool
    {
        return $this->status === 'delivered';
    }

    /**
     * Check if SMS failed
     */
    public function isFailed(): bool
    {
        return $this->status === 'failed';
    }

    /**
     * Check if SMS is pending
     */
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    /**
     * Get formatted phone number for display
     */
    public function getFormattedPhoneNumberAttribute(): string
    {
        $phone = $this->phone_number;
        
        // If starts with 94, format as +94 XX XXX XXXX
        if (str_starts_with($phone, '94')) {
            $phone = '+' . substr($phone, 0, 2) . ' ' . substr($phone, 2, 2) . ' ' . substr($phone, 4, 3) . ' ' . substr($phone, 7);
        }
        
        return $phone;
    }

    /**
     * Get message preview (truncated)
     */
    public function getMessagePreviewAttribute(): string
    {
        return strlen($this->message) > 50 ? substr($this->message, 0, 50) . '...' : $this->message;
    }
}
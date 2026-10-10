<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Carbon\Carbon;

class OtpCode extends Model
{
    use HasFactory;

    protected $table = 'otp_codes';

    protected $fillable = [
        'company_code',
        'section_code',
        'phone_number',
        'code',
        'type',
        'expires_at',
        'verified_at',
        'is_used',
        'attempts',
        'reference_id',
        'reference_type'
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'verified_at' => 'datetime',
        'is_used' => 'boolean',
        'attempts' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Scope for filtering by company and section
     */
    public function scopeForCompanyBranch($query, string $companyCode, string $sectionCode)
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
     * Scope for filtering by type
     */
    public function scopeByType($query, string $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Scope for unused OTPs
     */
    public function scopeUnused($query)
    {
        return $query->where('is_used', false);
    }

    /**
     * Scope for non-expired OTPs
     */
    public function scopeNotExpired($query)
    {
        return $query->where('expires_at', '>', Carbon::now());
    }

    /**
     * Scope for valid OTPs (not used and not expired)
     */
    public function scopeValid($query)
    {
        return $query->unused()->notExpired();
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
     * Check if OTP is expired
     */
    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    /**
     * Check if OTP is valid (not used and not expired)
     */
    public function isValid(): bool
    {
        return !$this->is_used && !$this->isExpired();
    }

    /**
     * Check if OTP has exceeded maximum attempts
     */
    public function hasExceededMaxAttempts(): bool
    {
        return $this->attempts >= config('sms.otp.max_attempts', 3);
    }

    /**
     * Get remaining time until expiry in minutes
     */
    public function getRemainingMinutesAttribute(): int
    {
        if ($this->isExpired()) {
            return 0;
        }
        
        return Carbon::now()->diffInMinutes($this->expires_at);
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
     * Relationship to SMS logs
     */
    public function smsLogs()
    {
        return $this->hasMany(SmsLog::class, 'reference_id', 'id')
                    ->where('reference_type', 'otp');
    }

    /**
     * Get the most recent SMS log for this OTP
     */
    public function latestSmsLog()
    {
        return $this->hasOne(SmsLog::class, 'reference_id', 'id')
                    ->where('reference_type', 'otp')
                    ->latest();
    }
}
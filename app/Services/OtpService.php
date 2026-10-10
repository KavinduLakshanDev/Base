<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use App\Models\OtpCode;
use App\Services\SmsService;
use Carbon\Carbon;
use Exception;

class OtpService
{
    private SmsService $smsService;

    public function __construct(SmsService $smsService)
    {
        $this->smsService = $smsService;
    }

    /**
     * Generate and send OTP code
     *
     * @param string $phoneNumber
     * @param string $type
     * @param string|null $referenceId
     * @param string|null $referenceType
     * @return array
     */
    public function generateAndSendOtp(
        string $phoneNumber, 
        string $type = 'verification',
        ?string $referenceId = null,
        ?string $referenceType = null
    ): array {
        try {
            // Check rate limiting
            $rateLimitResult = $this->checkRateLimit($phoneNumber);
            if (!$rateLimitResult['allowed']) {
                return [
                    'success' => false,
                    'message' => $rateLimitResult['message'],
                    'retry_after' => $rateLimitResult['retry_after'] ?? null
                ];
            }

            // Invalidate any existing OTP codes for this phone number
            $this->invalidateExistingOtps($phoneNumber, $type);

            // Generate new OTP
            $otpCode = $this->generateOtpCode();
            $expiresAt = Carbon::now()->addMinutes(config('sms.otp.expire_minutes', 5));

            /** @var \App\Models\User $user */
            $user = Auth::user();
            $companyCode = $user ? $user->company_code : session('company_code', 'DEFAULT');
            $sectionCode = $user ? $user->section_code : session('section_code', 'DEFAULT');

            // Store OTP in database
            $otpRecord = OtpCode::create([
                'company_code' => $companyCode,
                'section_code' => $sectionCode,
                'phone_number' => $this->formatPhoneNumber($phoneNumber),
                'code' => $otpCode,
                'type' => $type,
                'expires_at' => $expiresAt,
                'reference_id' => $referenceId,
                'reference_type' => $referenceType
            ]);

            // Prepare SMS message
            $message = $this->buildOtpSmsMessage($otpCode, $type);

            // Send SMS
            $smsResult = $this->smsService->sendSms(
                $phoneNumber, 
                $message, 
                $otpRecord->id, 
                'otp'
            );

            if ($smsResult['success']) {
                // Update rate limiting cache
                $this->updateRateLimit($phoneNumber);

                Log::info('OTP generated and sent successfully', [
                    'otp_id' => $otpRecord->id,
                    'phone_number' => $phoneNumber,
                    'type' => $type,
                    'sms_log_id' => $smsResult['sms_log_id']
                ]);

                return [
                    'success' => true,
                    'message' => 'OTP sent successfully',
                    'otp_id' => $otpRecord->id,
                    'expires_at' => $expiresAt->toISOString(),
                    'sms_log_id' => $smsResult['sms_log_id']
                ];
            } else {
                // SMS failed, mark OTP as failed but keep record for debugging
                Log::error('OTP SMS failed to send', [
                    'otp_id' => $otpRecord->id,
                    'phone_number' => $phoneNumber,
                    'sms_error' => $smsResult['message']
                ]);

                return [
                    'success' => false,
                    'message' => 'Failed to send OTP: ' . $smsResult['message'],
                    'otp_id' => $otpRecord->id,
                    'sms_error' => $smsResult['message']
                ];
            }
        } catch (Exception $e) {
            Log::error('OTP generation failed', [
                'phone_number' => $phoneNumber,
                'type' => $type,
                'exception' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return [
                'success' => false,
                'message' => 'OTP generation failed: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Verify OTP code
     *
     * @param string $phoneNumber
     * @param string $code
     * @param string $type
     * @return array
     */
    public function verifyOtp(string $phoneNumber, string $code, string $type = 'verification'): array
    {
        try {
            /** @var \App\Models\User $user */
            $user = Auth::user();
            $companyCode = $user ? $user->company_code : session('company_code', 'DEFAULT');
            $sectionCode = $user ? $user->section_code : session('section_code', 'DEFAULT');
            $formattedPhone = $this->formatPhoneNumber($phoneNumber);

            // Find the OTP record
            $otpRecord = OtpCode::where('company_code', $companyCode)
                ->where('section_code', $sectionCode)
                ->where('phone_number', $formattedPhone)
                ->where('code', $code)
                ->where('type', $type)
                ->where('is_used', false)
                ->where('expires_at', '>', Carbon::now())
                ->first();

            if (!$otpRecord) {
                // Increment failed attempts for rate limiting
                $this->incrementFailedAttempts($phoneNumber);

                Log::warning('Invalid OTP verification attempt', [
                    'phone_number' => $phoneNumber,
                    'code' => $code,
                    'type' => $type
                ]);

                return [
                    'success' => false,
                    'message' => 'Invalid or expired OTP code'
                ];
            }

            // Check attempt limit
            if ($otpRecord->attempts >= config('sms.otp.max_attempts', 3)) {
                Log::warning('OTP max attempts exceeded', [
                    'otp_id' => $otpRecord->id,
                    'phone_number' => $phoneNumber,
                    'attempts' => $otpRecord->attempts
                ]);

                return [
                    'success' => false,
                    'message' => 'Maximum verification attempts exceeded'
                ];
            }

            // Increment attempt count
            $otpRecord->increment('attempts');

            // Mark OTP as used and verified
            $otpRecord->update([
                'is_used' => true,
                'verified_at' => Carbon::now()
            ]);

            // Clear rate limiting cache for successful verification
            $this->clearRateLimit($phoneNumber);

            Log::info('OTP verified successfully', [
                'otp_id' => $otpRecord->id,
                'phone_number' => $phoneNumber,
                'type' => $type
            ]);

            return [
                'success' => true,
                'message' => 'OTP verified successfully',
                'otp_id' => $otpRecord->id,
                'verified_at' => $otpRecord->verified_at->toISOString()
            ];
        } catch (Exception $e) {
            Log::error('OTP verification failed', [
                'phone_number' => $phoneNumber,
                'code' => $code,
                'type' => $type,
                'exception' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'OTP verification failed: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Check if phone number is rate limited
     *
     * @param string $phoneNumber
     * @return array
     */
    private function checkRateLimit(string $phoneNumber): array
    {
        $cacheKey = "otp_rate_limit:{$phoneNumber}";
        $rateLimitData = Cache::get($cacheKey, ['count' => 0, 'last_sent' => null]);

        $maxRequests = config('sms.rate_limiting.max_requests_per_hour', 5);
        $windowMinutes = config('sms.rate_limiting.window_minutes', 60);

        // If last request was more than window minutes ago, reset counter
        if ($rateLimitData['last_sent'] && 
            Carbon::parse($rateLimitData['last_sent'])->addMinutes($windowMinutes)->isPast()) {
            $rateLimitData = ['count' => 0, 'last_sent' => null];
        }

        if ($rateLimitData['count'] >= $maxRequests) {
            $retryAfter = $rateLimitData['last_sent'] ? 
                Carbon::parse($rateLimitData['last_sent'])->addMinutes($windowMinutes)->diffInMinutes(Carbon::now()) : 
                $windowMinutes;

            return [
                'allowed' => false,
                'message' => "Too many OTP requests. Please try again in {$retryAfter} minutes.",
                'retry_after' => $retryAfter
            ];
        }

        return ['allowed' => true];
    }

    /**
     * Update rate limiting cache
     *
     * @param string $phoneNumber
     * @return void
     */
    private function updateRateLimit(string $phoneNumber): void
    {
        $cacheKey = "otp_rate_limit:{$phoneNumber}";
        $rateLimitData = Cache::get($cacheKey, ['count' => 0, 'last_sent' => null]);

        $rateLimitData['count']++;
        $rateLimitData['last_sent'] = Carbon::now()->toISOString();

        $windowMinutes = config('sms.rate_limiting.window_minutes', 60);
        Cache::put($cacheKey, $rateLimitData, Carbon::now()->addMinutes($windowMinutes));
    }

    /**
     * Clear rate limiting for successful verification
     *
     * @param string $phoneNumber
     * @return void
     */
    private function clearRateLimit(string $phoneNumber): void
    {
        $cacheKey = "otp_rate_limit:{$phoneNumber}";
        Cache::forget($cacheKey);
    }

    /**
     * Increment failed verification attempts
     *
     * @param string $phoneNumber
     * @return void
     */
    private function incrementFailedAttempts(string $phoneNumber): void
    {
        $cacheKey = "otp_failed_attempts:{$phoneNumber}";
        $attempts = Cache::get($cacheKey, 0) + 1;
        Cache::put($cacheKey, $attempts, Carbon::now()->addMinutes(30));
    }

    /**
     * Invalidate existing OTP codes for phone number
     *
     * @param string $phoneNumber
     * @param string $type
     * @return void
     */
    private function invalidateExistingOtps(string $phoneNumber, string $type): void
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        $companyCode = $user ? $user->company_code : session('company_code', 'DEFAULT');
        $sectionCode = $user ? $user->section_code : session('section_code', 'DEFAULT');

        OtpCode::where('company_code', $companyCode)
            ->where('section_code', $sectionCode)
            ->where('phone_number', $this->formatPhoneNumber($phoneNumber))
            ->where('type', $type)
            ->where('is_used', false)
            ->update(['is_used' => true]);
    }

    /**
     * Generate random OTP code
     *
     * @return string
     */
    private function generateOtpCode(): string
    {
        $length = config('sms.otp.length', 6);
        return str_pad(random_int(0, pow(10, $length) - 1), $length, '0', STR_PAD_LEFT);
    }

    /**
     * Build SMS message for OTP
     *
     * @param string $code
     * @param string $type
     * @return string
     */
    private function buildOtpSmsMessage(string $code, string $type): string
    {
        // Get company name from database
        /** @var \App\Models\User $user */
        $user = Auth::user();
        $companyCode = $user ? $user->company_code : session('company_code', 'DEFAULT');
        $company = \App\Models\Company::where('company_code', $companyCode)->first();
        
        // If no company found with session code, get the first company
        if (!$company) {
            $company = \App\Models\Company::first();
        }
        
        $companyName = $company ? $company->name : config('app.name', 'POS System');
        
        $expireMinutes = config('sms.otp.expire_minutes', 5);

        switch ($type) {
            case 'privilege_user':
                return "{$companyName} Your OTP code is: {$code} to confirm adding points to your account. Please share this code with the cashier.";
            case 'point_redeem':
                return "{$companyName} Your OTP code is: {$code} to confirm redeeming points from your account. Please share this code with the cashier.";
            case 'privilege_card':
                return "Your {$companyName} privilege card verification code is: {$code}. Valid for {$expireMinutes} minutes. Do not share this code.";
            case 'privilege_user_registration':
                return "Congratulations! You have been successfully registered as a Privilege User in {$companyName}. Welcome to our loyalty program!";
            case 'points_earned_confirmation':
                return "Dear customer, you earned {$code} points today, and you now have {$expireMinutes} points total. {$companyName}";
            case 'password_reset':
                return "Your {$companyName} password reset code is: {$code}. Valid for {$expireMinutes} minutes. Do not share this code.";
            default:
                return "Your {$companyName} verification code is: {$code}. Valid for {$expireMinutes} minutes. Do not share this code.";
        }
    }

    /**
     * Format phone number to international format
     *
     * @param string $phoneNumber
     * @return string
     */
    private function formatPhoneNumber(string $phoneNumber): string
    {
        // Remove any non-numeric characters
        $cleaned = preg_replace('/[^0-9]/', '', $phoneNumber);
        
        // If it starts with 0, replace with 94 (Sri Lanka country code)
        if (str_starts_with($cleaned, '0')) {
            $cleaned = '94' . substr($cleaned, 1);
        }
        
        // If it doesn't start with 94, assume it's local and add 94
        if (!str_starts_with($cleaned, '94')) {
            $cleaned = '94' . $cleaned;
        }
        
        return $cleaned;
    }

    /**
     * Send registration confirmation SMS (no OTP required)
     *
     * @param string $phoneNumber
     * @param string $type
     * @param string|null $customerName
     * @return array
     */
    public function sendRegistrationConfirmation(
        string $phoneNumber, 
        string $type = 'privilege_user_registration',
        ?string $customerName = null
    ): array {
        try {
            // Get company name for message
            /** @var \App\Models\User $user */
            $user = Auth::user();
            $companyCode = $user ? $user->company_code : session('company_code', 'DEFAULT');
            $company = \App\Models\Company::where('company_code', $companyCode)->first();
            
            if (!$company) {
                $company = \App\Models\Company::first();
            }
            
            $companyName = $company ? $company->name : config('app.name', 'POS System');

            // Build confirmation message
            $message = $this->buildRegistrationMessage($companyName, $type, $customerName);

            // Send SMS directly without OTP storage
            $smsResult = $this->smsService->sendSms(
                $phoneNumber, 
                $message, 
                null, // No OTP record ID needed
                'registration_confirmation'
            );

            if ($smsResult['success']) {
                Log::info('Registration confirmation SMS sent successfully', [
                    'phone_number' => $phoneNumber,
                    'type' => $type,
                    'customer_name' => $customerName,
                    'sms_log_id' => $smsResult['sms_log_id']
                ]);

                return [
                    'success' => true,
                    'message' => 'Registration confirmation sent successfully',
                    'sms_log_id' => $smsResult['sms_log_id']
                ];
            } else {
                Log::error('Registration confirmation SMS failed to send', [
                    'phone_number' => $phoneNumber,
                    'sms_error' => $smsResult['message']
                ]);

                return [
                    'success' => false,
                    'message' => 'Failed to send registration confirmation: ' . $smsResult['message'],
                    'sms_error' => $smsResult['message']
                ];
            }
        } catch (Exception $e) {
            Log::error('Registration confirmation failed', [
                'phone_number' => $phoneNumber,
                'type' => $type,
                'exception' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return [
                'success' => false,
                'message' => 'Registration confirmation failed: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Send points earned confirmation SMS (no OTP required)
     *
     * @param string $phoneNumber
     * @param string|null $customerName
     * @param int $pointsEarned
     * @param int $totalPoints
     * @return array
     */
    public function sendPointsEarnedConfirmation(
        string $phoneNumber,
        ?string $customerName,
        int $pointsEarned,
        int $totalPoints
    ): array {
        try {
            // Get company name for message
            /** @var \App\Models\User $user */
            $user = Auth::user();
            $companyCode = $user ? $user->company_code : session('company_code', 'DEFAULT');
            $company = \App\Models\Company::where('company_code', $companyCode)->first();
            
            if (!$company) {
                $company = \App\Models\Company::first();
            }
            
            $companyName = $company ? $company->name : config('app.name', 'POS System');

            // Build points earned message
            $message = $this->buildPointsEarnedMessage($companyName, $customerName, $pointsEarned, $totalPoints);

            // Send SMS directly without OTP storage
            $smsResult = $this->smsService->sendSms(
                $phoneNumber, 
                $message, 
                null, // No OTP record ID needed
                'points_earned_confirmation'
            );

            if ($smsResult['success']) {
                Log::info('Points earned confirmation SMS sent successfully', [
                    'phone_number' => $phoneNumber,
                    'customer_name' => $customerName,
                    'points_earned' => $pointsEarned,
                    'total_points' => $totalPoints,
                    'sms_log_id' => $smsResult['sms_log_id']
                ]);

                return [
                    'success' => true,
                    'message' => 'Points earned confirmation sent successfully',
                    'sms_log_id' => $smsResult['sms_log_id']
                ];
            } else {
                Log::error('Points earned confirmation SMS failed to send', [
                    'phone_number' => $phoneNumber,
                    'sms_error' => $smsResult['message']
                ]);

                return [
                    'success' => false,
                    'message' => 'Failed to send points earned confirmation: ' . $smsResult['message'],
                    'sms_error' => $smsResult['message']
                ];
            }
        } catch (Exception $e) {
            Log::error('Points earned confirmation failed', [
                'phone_number' => $phoneNumber,
                'customer_name' => $customerName,
                'points_earned' => $pointsEarned,
                'total_points' => $totalPoints,
                'exception' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return [
                'success' => false,
                'message' => 'Points earned confirmation failed: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Build registration confirmation message
     *
     * @param string $companyName
     * @param string $type
     * @param string|null $customerName
     * @return string
     */
    private function buildRegistrationMessage(string $companyName, string $type, ?string $customerName = null): string
    {
        $greeting = $customerName ? "Dear {$customerName}, " : "";
        
        switch ($type) {
            case 'privilege_user_registration':
                return "{$greeting}Congratulations! You have been successfully registered as a Privilege User in {$companyName}. Welcome to our loyalty program!";
            default:
                return "{$greeting}You have been successfully registered in {$companyName}. Thank you for joining us!";
        }
    }

    /**
     * Build points earned confirmation message
     *
     * @param string $companyName
     * @param string|null $customerName
     * @param int $pointsEarned
     * @param int $totalPoints
     * @return string
     */
    private function buildPointsEarnedMessage(string $companyName, ?string $customerName, int $pointsEarned, int $totalPoints): string
    {
        $greeting = "Dear customer, ";
        return "{$greeting}you earned {$pointsEarned} points today, and you now have {$totalPoints} points total. Thank you for choosing {$companyName}!";
    }

    /**
     * Clean up expired OTP codes (can be called by scheduled job)
     *
     * @return int Number of cleaned records
     */
    public function cleanupExpiredOtps(): int
    {
        try {
            $deleted = OtpCode::where('expires_at', '<', Carbon::now())
                ->where('created_at', '<', Carbon::now()->subDays(7)) // Keep records for 7 days for debugging
                ->delete();

            Log::info('Expired OTP cleanup completed', ['deleted_count' => $deleted]);
            
            return $deleted;
        } catch (Exception $e) {
            Log::error('OTP cleanup failed', [
                'exception' => $e->getMessage()
            ]);
            
            return 0;
        }
    }
}
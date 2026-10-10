<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\OtpService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

class OtpController extends Controller
{
    private OtpService $otpService;

    public function __construct(OtpService $otpService)
    {
        $this->otpService = $otpService;
    }

    /**
     * Send OTP to phone number
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function sendOtp(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'phone_number' => [
                    'required',
                    'string',
                    'regex:/^(\+94|94|0)?[1-9][0-9]{8}$/',
                    'max:15'
                ],
                'type' => [
                    'sometimes',
                    'string',
                    'in:verification,privilege_card,privilege_user,point_redeem,password_reset'
                ],
                'reference_id' => 'sometimes|string|max:255',
                'reference_type' => 'sometimes|string|max:100'
            ], [
                'phone_number.required' => 'Phone number is required',
                'phone_number.regex' => 'Invalid phone number format. Please use a valid Sri Lankan phone number',
                'type.in' => 'Invalid OTP type. Must be one of: verification, privilege_card, privilege_user, point_redeem, password_reset'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $phoneNumber = $request->input('phone_number');
            $type = $request->input('type', 'verification');
            $referenceId = $request->input('reference_id');
            $referenceType = $request->input('reference_type');

            Log::info('OTP send request initiated', [
                'phone_number' => $phoneNumber,
                'type' => $type,
                'reference_id' => $referenceId,
                'user_agent' => $request->userAgent(),
                'ip' => $request->ip()
            ]);

            $result = $this->otpService->generateAndSendOtp($phoneNumber, $type, $referenceId, $referenceType);

            if ($result['success']) {
                return response()->json([
                    'success' => true,
                    'message' => $result['message'],
                    'data' => [
                        'otp_id' => $result['otp_id'],
                        'expires_at' => $result['expires_at'],
                        'phone_number' => $this->maskPhoneNumber($phoneNumber)
                    ]
                ], 200);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => $result['message'],
                    'retry_after' => $result['retry_after'] ?? null
                ], 400);
            }
        } catch (\Exception $e) {
            Log::error('OTP send request failed', [
                'phone_number' => $request->input('phone_number'),
                'exception' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An error occurred while sending OTP. Please try again.'
            ], 500);
        }
    }

    /**
     * Verify OTP code
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function verifyOtp(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'phone_number' => [
                    'required',
                    'string',
                    'regex:/^(\+94|94|0)?[1-9][0-9]{8}$/',
                    'max:15'
                ],
                'code' => [
                    'required',
                    'string',
                    'digits:6'
                ],
                'type' => [
                    'sometimes',
                    'string',
                    'in:verification,privilege_card,privilege_user,point_redeem,password_reset'
                ]
            ], [
                'phone_number.required' => 'Phone number is required',
                'phone_number.regex' => 'Invalid phone number format',
                'code.required' => 'OTP code is required',
                'code.digits' => 'OTP code must be exactly 6 digits',
                'type.in' => 'Invalid OTP type. Must be one of: verification, privilege_card, privilege_user, point_redeem, password_reset'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $phoneNumber = $request->input('phone_number');
            $code = $request->input('code');
            $type = $request->input('type', 'verification');

            Log::info('OTP verification request initiated', [
                'phone_number' => $phoneNumber,
                'type' => $type,
                'user_agent' => $request->userAgent(),
                'ip' => $request->ip()
            ]);

            $result = $this->otpService->verifyOtp($phoneNumber, $code, $type);

            if ($result['success']) {
                return response()->json([
                    'success' => true,
                    'message' => $result['message'],
                    'data' => [
                        'otp_id' => $result['otp_id'],
                        'verified_at' => $result['verified_at'],
                        'phone_number' => $this->maskPhoneNumber($phoneNumber)
                    ]
                ], 200);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => $result['message']
                ], 400);
            }
        } catch (\Exception $e) {
            Log::error('OTP verification failed', [
                'phone_number' => $request->input('phone_number'),
                'exception' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An error occurred while verifying OTP. Please try again.'
            ], 500);
        }
    }

    /**
     * Resend OTP (essentially generate new OTP)
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function resendOtp(Request $request): JsonResponse
    {
        // Resend is essentially the same as sending a new OTP
        return $this->sendOtp($request);
    }

    /**
     * Send points earned confirmation SMS to privilege customers
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function sendPointsEarnedConfirmation(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'phone_number' => [
                    'required',
                    'string',
                    'regex:/^(\+94|94|0)?[1-9][0-9]{8}$/',
                    'max:15'
                ],
                'customer_name' => 'sometimes|string|max:255',
                'points_earned' => 'required|integer|min:0',
                'total_points' => 'required|integer|min:0'
            ], [
                'phone_number.required' => 'Phone number is required',
                'phone_number.regex' => 'Invalid phone number format. Please use a valid Sri Lankan phone number',
                'points_earned.required' => 'Points earned is required',
                'points_earned.integer' => 'Points earned must be a number',
                'total_points.required' => 'Total points is required',
                'total_points.integer' => 'Total points must be a number'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $phoneNumber = $request->input('phone_number');
            $customerName = $request->input('customer_name');
            $pointsEarned = (int) $request->input('points_earned');
            $totalPoints = (int) $request->input('total_points');

            Log::info('Points earned confirmation SMS request initiated', [
                'phone_number' => $phoneNumber,
                'customer_name' => $customerName,
                'points_earned' => $pointsEarned,
                'total_points' => $totalPoints,
                'user_agent' => $request->userAgent(),
                'ip' => $request->ip()
            ]);

            $result = $this->otpService->sendPointsEarnedConfirmation($phoneNumber, $customerName, $pointsEarned, $totalPoints);

            if ($result['success']) {
                return response()->json([
                    'success' => true,
                    'message' => $result['message'],
                    'data' => [
                        'phone_number' => $this->maskPhoneNumber($phoneNumber),
                        'points_earned' => $pointsEarned,
                        'total_points' => $totalPoints,
                        'sms_log_id' => $result['sms_log_id']
                    ]
                ], 200);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => $result['message']
                ], 400);
            }
        } catch (\Exception $e) {
            Log::error('Points earned confirmation SMS failed', [
                'phone_number' => $request->input('phone_number'),
                'customer_name' => $customerName ?? null,
                'points_earned' => $request->input('points_earned'),
                'total_points' => $request->input('total_points'),
                'exception' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An error occurred while sending points earned confirmation SMS. Please try again.'
            ], 500);
        }
    }

    /**
     * Get OTP status (for debugging purposes - admin only)
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function getOtpStatus(Request $request): JsonResponse
    {
        try {
            // This should be protected by admin middleware in routes
            $validator = Validator::make($request->all(), [
                'phone_number' => [
                    'required',
                    'string',
                    'regex:/^(\+94|94|0)?[1-9][0-9]{8}$/',
                    'max:15'
                ],
                'type' => [
                    'sometimes',
                    'string',
                    'in:verification,privilege_card,privilege_user,point_redeem,password_reset'
                ]
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $phoneNumber = $request->input('phone_number');
            $type = $request->input('type', 'verification');

            // Get recent OTP records for this phone number
            /** @var \App\Models\User $user */
            $user = Auth::user();
            $companyCode = $user ? $user->company_code : session('company_code', 'DEFAULT');
            $sectionCode = $user ? $user->section_code : session('section_code', 'DEFAULT');

            $otpRecords = \App\Models\OtpCode::forCompanyBranch($companyCode, $sectionCode)
                ->byPhoneNumber($this->formatPhoneNumber($phoneNumber))
                ->byType($type)
                ->with('latestSmsLog')
                ->latest()
                ->take(5)
                ->get()
                ->map(function ($otp) {
                    return [
                        'id' => $otp->id,
                        'code' => substr($otp->code, 0, 2) . '****', // Partially mask for security
                        'expires_at' => $otp->expires_at->toISOString(),
                        'is_used' => $otp->is_used,
                        'is_expired' => $otp->isExpired(),
                        'attempts' => $otp->attempts,
                        'created_at' => $otp->created_at->toISOString(),
                        'sms_status' => $otp->latestSmsLog?->status
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => [
                    'phone_number' => $this->maskPhoneNumber($phoneNumber),
                    'recent_otps' => $otpRecords
                ]
            ], 200);
        } catch (\Exception $e) {
            Log::error('OTP status check failed', [
                'phone_number' => $request->input('phone_number'),
                'exception' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve OTP status'
            ], 500);
        }
    }

    /**
     * Mask phone number for security
     *
     * @param string $phoneNumber
     * @return string
     */
    private function maskPhoneNumber(string $phoneNumber): string
    {
        $formatted = $this->formatPhoneNumber($phoneNumber);
        
        if (strlen($formatted) > 6) {
            return substr($formatted, 0, 4) . str_repeat('*', strlen($formatted) - 6) . substr($formatted, -2);
        }
        
        return $formatted;
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
}
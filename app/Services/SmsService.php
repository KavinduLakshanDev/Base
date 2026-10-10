<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use App\Models\SmsLog;
use Exception;

class SmsService
{
    protected $config;

    public function __construct()
    {
        $this->config = config('sms');
    }

    /**
     * Send OTP SMS with predefined message format
     */
    public function sendOtp(string $phoneNumber, string $otp, ?string $referenceId = null, ?string $referenceType = null): array
    {
        $companyName = config('app.name', 'UNITEC POS');
        $expireMinutes = config('sms.otp.expire_minutes', 5);
        
        $message = "Your {$companyName} OTP is: {$otp}. Valid for {$expireMinutes} minutes. Do not share with anyone.";
        
        return $this->sendSms($phoneNumber, $message, $referenceId, $referenceType ?: 'otp');
    }

    /**
     * Send Job Creation Notification
     */
    public function sendJobCreationNotification(string $phoneNumber, string $jobNumber): array
    {
        $message = "Job ID ({$jobNumber}) you will be notified upon job completion Thank you";
        
        return $this->sendSms($phoneNumber, $message, $jobNumber, 'job_creation');
    }

    /**
     * Send Job Completion Notification
     */
    public function sendJobCompletionNotification(string $phoneNumber, string $jobNumber, float $totalAmount): array
    {
        $formattedAmount = number_format($totalAmount, 2);
        $message = "JOB ID ({$jobNumber}) Completed total amount Rs.({$formattedAmount}) Call 0332239606";
        
        return $this->sendSms($phoneNumber, $message, $jobNumber, 'job_completion');
    }

    /**
     * Send SMS
     */
    public function sendSms(
        string $phoneNumber, 
        string $message, 
        ?string $referenceId = null, 
        ?string $referenceType = 'general'
    ): array {
        $user = Auth::user();
        // default to empty string rather than null to satisfy non-nullable DB columns
        $companyCode = $user->company_code ?? session('company_code', '');
        $sectionCode = $user->section_code ?? session('section_code', '');

        $formattedPhone = $this->formatPhoneNumber($phoneNumber);

        // Basic validation for Sri Lanka phone numbers (expect: 94XXXXXXXXX)
        if (! $this->isValidSriLankaPhone($formattedPhone)) {
            Log::warning('SMS blocked: invalid recipient phone format', ['raw' => $phoneNumber, 'formatted' => $formattedPhone]);

            return [
                'success' => false,
                'message' => 'Invalid phone number format',
                'error' => 'invalid_phone'
            ];
        }

        // Create SMS log entry
        $smsLog = SmsLog::updateOrCreate(
            ['phone_number' => $formattedPhone, 'message' => $message, 'status' => 'pending'],
            [
                'company_code' => $companyCode,
                'section_code' => $sectionCode,
                'reference_id' => $referenceId,
                'reference_type' => $referenceType,
                'provider' => $this->config['default_provider'] ?? 'mysql_http'
            ]
        );

        try {
            $result = $this->sendViaApi($formattedPhone, $message);

            if ($result['success']) {
                $smsLog->update([
                    'status' => 'sent',
                    'sent_at' => now(),
                    'provider_message_id' => $result['provider_message_id'] ?? null,
                    'response_data' => $result['response'] ?? null
                ]);

                return [
                    'success' => true,
                    'message' => 'SMS sent successfully',
                    'sms_log_id' => $smsLog->id,
                    'response' => $result['response'] ?? null
                ];
            } else {
                $smsLog->update([
                    'status' => 'failed',
                    'error_message' => $result['error'] ?? 'API error',
                    'response_data' => $result['response'] ?? null
                ]);

                return [
                    'success' => false,
                    'message' => 'Failed to send SMS: ' . ($result['error'] ?? 'Unknown error'),
                    'sms_log_id' => $smsLog->id
                ];
            }
        } catch (Exception $e) {
            Log::error('SMS service exception', [
                'phone_number' => $phoneNumber,
                'exception' => $e->getMessage()
            ]);

            $smsLog->update([
                'status' => 'failed',
                'error_message' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'SMS service error: ' . $e->getMessage(),
                'sms_log_id' => $smsLog->id
            ];
        }
    }

    /**
     * Send via API based on default provider
     */
    private function sendViaApi(string $phone, string $message): array
    {
        $provider = $this->config['default_provider'] ?? 'mysql_http';
        
        if ($provider === 'simulated') {
            return [
                'success' => true,
                'message' => 'Simulated',
                'provider_message_id' => 'sim_' . time()
            ];
        }

        if ($provider === 'notify') {
            return $this->sendViaNotifyApi($phone, $message);
        }

        return $this->sendViaBeesLkApi($phone, $message);
    }

    /**
     * Send SMS via bees.lk HTTP API
     */
    private function sendViaBeesLkApi(string $phoneNumber, string $message): array
    {
        try {
            $provider = $this->config['default_provider'] ?? 'mysql_http';
            $providerConfig = $this->config['providers'][$provider] ?? ($this->config['providers']['bees'] ?? []);
            
            if (empty($providerConfig)) {
                return ['success' => false, 'error' => 'Provider configuration not found'];
            }

            $apiUrl = $providerConfig['api_url'] ?? ($providerConfig['api_endpoint'] ?? null);
            $token = $providerConfig['bearer_token'] ?? ($providerConfig['api_token'] ?? null);
            $senderId = $providerConfig['sender_id'] ?? 'UNITECPOS';

            if (!$token || !$apiUrl) {
                return ['success' => false, 'error' => 'SMS API Token or URL not configured'];
            }

            $requestBody = [
                'To' => $phoneNumber,
                'Text' => $message,
                'From' => $senderId,
            ];

            /** @var \Illuminate\Http\Client\Response $response */
            $response = Http::withOptions([
                    'verify' => false,
                    'connect_timeout' => 5,
                ])
                ->retry(2, 100)
                ->timeout(10)
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $token,
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json',
                ])
                ->post($apiUrl, $requestBody);

            $responseData = $response->json();
            Log::info('Bees.lk API Response', [
                'status' => $response->status(),
                'body' => $responseData,
                'url' => $apiUrl,
                'attempt' => 'string_to'
            ]);

            // If provider reports a client error specifically complaining about recipients,
            // retry once with the 'To' field as an array (some endpoints accept arrays).
            if (! $response->successful()) {
                $errorMsg = $responseData['message'] ?? ($responseData['error'] ?? null);

                if ($response->status() === 400 && $errorMsg && stripos($errorMsg, 'no recipient') !== false) {
                    Log::warning('Bees.lk replied "No recipients" — retrying with array payload', ['to' => $phoneNumber]);
                    $requestBody['To'] = [$phoneNumber];

                    $response = Http::withOptions(['verify' => false, 'connect_timeout' => 5])
                        ->retry(1, 100)
                        ->timeout(10)
                        ->withHeaders([
                            'Authorization' => 'Bearer ' . $token,
                            'Content-Type' => 'application/json',
                            'Accept' => 'application/json',
                        ])
                        ->post($apiUrl, $requestBody);

                    $responseData = $response->json();
                    Log::info('Bees.lk API Response (retry-array)', ['status' => $response->status(), 'body' => $responseData]);

                    if ($response->successful()) {
                        return [
                            'success' => true,
                            'provider_message_id' => $responseData['messageId'] ?? ($responseData['id'] ?? ($responseData['data']['id'] ?? null)),
                            'response' => $responseData
                        ];
                    }

                    return [
                        'success' => false,
                        'error' => $responseData['message'] ?? ($responseData['error'] ?? 'HTTP ' . $response->status()),
                        'response' => $responseData
                    ];
                }
            }

            // Handle normal successful response path or non-recipient errors
            if ($response->successful()) {
                if (isset($responseData['status']) && ($responseData['status'] === 'error' || $responseData['status'] === false)) {
                    return [
                        'success' => false,
                        'error' => $responseData['message'] ?? ($responseData['error'] ?? 'API reported error'),
                        'response' => $responseData
                    ];
                }

                return [
                    'success' => true,
                    'provider_message_id' => $responseData['messageId'] ?? ($responseData['id'] ?? ($responseData['data']['id'] ?? null)),
                    'response' => $responseData
                ];
            }

            return [
                'success' => false,
                'error' => $responseData['message'] ?? ($responseData['error'] ?? 'HTTP ' . $response->status()),
                'response' => $responseData
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'HTTP request failed: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Send SMS via notify.lk API
     */
    private function sendViaNotifyApi(string $phoneNumber, string $message): array
    {
        try {
            $providerConfig = $this->config['providers']['notify'] ?? [];
            
            if (empty($providerConfig)) {
                return ['success' => false, 'error' => 'Notify provider configuration not found'];
            }

            $apiUrl = $providerConfig['api_endpoint'] ?? 'https://app.notify.lk/api/v1/send';
            $userId = $providerConfig['user_id'];
            $apiKey = $providerConfig['api_token'];
            $senderId = $providerConfig['sender_id'] ?? 'VISMASS';

            if (!$userId || !$apiKey) {
                return ['success' => false, 'error' => 'Notify User ID or API Key not configured'];
            }

            $requestBody = [
                'user_id' => $userId,
                'api_key' => $apiKey,
                'sender_id' => $senderId,
                'to' => $phoneNumber,
                'message' => $message,
            ];

            /** @var \Illuminate\Http\Client\Response $response */
            $response = Http::withOptions([
                    'verify' => false,
                    'connect_timeout' => 5,
                ])
                ->retry(2, 100)
                ->timeout(10)
                ->post($apiUrl, $requestBody);

            $responseData = $response->json();
            Log::info('Notify.lk API Response', [
                'status' => $response->status(),
                'body' => $responseData,
                'url' => $apiUrl,
            ]);

            if ($response->successful()) {
                if (isset($responseData['status']) && $responseData['status'] === 'error') {
                    return [
                        'success' => false,
                        'error' => $responseData['message'] ?? 'API reported error',
                        'response' => $responseData
                    ];
                }

                return [
                    'success' => true,
                    'provider_message_id' => $responseData['message_id'] ?? ($responseData['id'] ?? null),
                    'response' => $responseData
                ];
            }

            return [
                'success' => false,
                'error' => $responseData['message'] ?? ($responseData['errors'] ? implode(', ', $responseData['errors']) : 'HTTP ' . $response->status()),
                'response' => $responseData
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'HTTP request failed: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Format phone number to international format
     */
    private function formatPhoneNumber(string $phoneNumber): string
    {
        $cleaned = preg_replace('/[^0-9]/', '', $phoneNumber);
        if (str_starts_with($cleaned, '0')) {
            $cleaned = '94' . substr($cleaned, 1);
        }
        if (!str_starts_with($cleaned, '94')) {
            $cleaned = '94' . $cleaned;
        }
        return $cleaned;
    }

    /**
     * Basic Sri Lanka phone validation (expects 94 + 9 digits)
     */
    private function isValidSriLankaPhone(string $phone): bool
    {
        return (bool) preg_match('/^94\d{9}$/', $phone);
    }

    /**
     * Retry failed SMS
     */
    public function retrySms(int $smsLogId): array
    {
        $smsLog = SmsLog::find($smsLogId);
        if (!$smsLog || $smsLog->status === 'sent') {
            return ['success' => false, 'message' => 'Invalid retry'];
        }

        /** @var SmsLog $smsLog */
        $smsLog->increment('retry_count');
        return $this->sendSms($smsLog->phone_number, $smsLog->message, $smsLog->reference_id, $smsLog->reference_type);
    }
}
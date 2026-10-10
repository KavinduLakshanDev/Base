<?php

return [
    /*
    |--------------------------------------------------------------------------
    | SMS Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration for SMS services including OTP settings, providers, and
    | rate limiting options.
    |
    */

    'default_provider' => env('SMS_PROVIDER', 'notify'),

    'providers' => [
        'mysql_http' => [
            'bearer_token' => env('SMS_BEARER_TOKEN',),
            'api_url' => env('SMS_API_URL',),
            'sender_id' => env('SMS_SENDER_ID',),
            'timeout' => 30, // seconds
        ],

        'sql_server' => [
            'connection' => env('SMS_DB_CONNECTION', 'sqlsrv'),
            'bearer_token' => env('SMS_BEARER_TOKEN', ),
            'api_url' => env('SMS_API_URL', ),
            'sender_id' => env('SMS_SENDER_ID', ),
        ],

        

        'notify' => [
            'api_endpoint' => env('NOTIFY_ENDPOINT', ''),
            'api_token' => env('NOTIFY_API_KEY', ''),
            'sender_id' => env('NOTIFY_SENDER_ID', ''),
            'user_id' => env('NOTIFY_USER_ID', ''),
        ],

        'simulated' => [
            'driver' => 'simulated',
            'enabled' => true,
        ],

        'twilio' => [
            'driver' => 'twilio',
            'enabled' => env('TWILIO_ENABLED', false),
            'sid' => env('TWILIO_SID'),
            'token' => env('TWILIO_TOKEN'),
            'from' => env('TWILIO_FROM'),
        ],

        'aws' => [
            'driver' => 'aws',
            'enabled' => env('AWS_SMS_ENABLED', false),
            'region' => env('AWS_REGION', 'us-east-1'),
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
        ],
    ],

    'otp' => [
        'length' => env('SMS_OTP_LENGTH', 6),
        'expire_minutes' => env('SMS_OTP_EXPIRE_MINUTES', 5),
        'max_attempts' => env('SMS_OTP_MAX_ATTEMPTS', 3),
        'resend_delay_minutes' => env('SMS_OTP_RESEND_DELAY_MINUTES', 1),
    ],

    'rate_limiting' => [
        'max_requests_per_hour' => env('SMS_RATE_LIMIT_PER_HOUR', 5),
        'window_minutes' => env('SMS_RATE_LIMIT_WINDOW_MINUTES', 60),
    ],

    'templates' => [
        'verification' => 'Your {company} verification code is: {code}. Valid for {minutes} minutes. Do not share this code.',
        'password_reset' => 'Your {company} password reset code is: {code}. Valid for {minutes} minutes. Do not share this code.',
        'privilege_card' => 'Your {company} privilege card verification code is: {code}. Valid for {minutes} minutes. Do not share this code.',
        'privilege_user' => '{company} Your OTP code is: {code} to confirm adding points to your account. Please share this code with the cashier.',
        'point_redeem' => '{company} Your OTP code is: {code} to confirm redeeming points from your account. Please share this code with the cashier.',
        'privilege_user_registration' => 'Congratulations! You have been successfully registered as a Privilege User in {company}. Welcome to our loyalty program!',
        'points_earned_confirmation' => 'Dear customer, you earned {points} points today, and you now have {total} points total. Thank you for choosing {company}!',
    ],
];
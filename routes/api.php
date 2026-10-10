<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ServiceJobController;
use App\Http\Controllers\Api\OtpController;
use App\Http\Controllers\Api\PrivilegeUserController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// OTP Routes
Route::prefix('otp')->group(function () {
    Route::post('/send', [OtpController::class, 'sendOtp']);
    Route::post('/verify', [OtpController::class, 'verifyOtp']);
    Route::post('/resend', [OtpController::class, 'resendOtp']);
    Route::post('/points-confirmation', [OtpController::class, 'sendPointsEarnedConfirmation']);
    // Removed auth:sanctum middleware to avoid config errors
    // Route::get('/status', [OtpController::class, 'getOtpStatus'])->middleware('auth:sanctum');
    Route::get('/status', [OtpController::class, 'getOtpStatus']);
});
// Privilege Points API - Moved to web.php for session auth
// Route::middleware('auth:sanctum')->group(function () { ... });


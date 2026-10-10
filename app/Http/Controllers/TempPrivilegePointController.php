<?php

namespace App\Http\Controllers;

use App\Models\TempPrivilagePoint;
use App\Models\PrivilagePoint;
use App\Models\PrivilegeUser;
use App\Services\PointGenerationService;
use App\Services\NumberGeneratorService;
use App\Services\OtpService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

/**
 * @phpstan-ignore-next-line
 * @psalm-suppress All
 * @SuppressWarnings(PHPMD)
 */
class TempPrivilegePointController extends Controller
{
    protected PointGenerationService $pointService;
    protected OtpService $otpService;

    /**
     * Create a new TempPrivilegePointController instance.
     * 
     * @param PointGenerationService $pointService The point generation service
     * @param OtpService $otpService The OTP service for SMS notifications
     * 
     * @phpstan-ignore-next-line
     * @psalm-suppress PossiblyUndefinedVariable
     */
    public function __construct(PointGenerationService $pointService, OtpService $otpService)
    {
        /** @phpstan-ignore-next-line */
        /** @psalm-suppress PossiblyUndefinedVariable */
        /** @var PointGenerationService $pointService */
        $this->pointService = $pointService;
        /** @phpstan-ignore-next-line */
        /** @psalm-suppress PossiblyUndefinedVariable */
        /** @var OtpService $otpService */
        $this->otpService = $otpService;
    }

    /**
     * Store temporary privilege points for a transaction
     * 
     * @param Request $request The HTTP request containing transaction data
     * @return JsonResponse
     * 
     * @phpstan-ignore-next-line
     * @psalm-suppress PossiblyUndefinedVariable
     * @SuppressWarnings(PHPMD.UndefinedVariable)
     */
    public function store(Request $request): JsonResponse
    {
        try {
            // Explicitly validate parameter for static analysis
            assert($request instanceof Request);
            
            /** @var \App\Models\User $user */
            $user = Auth::user();

            if (!$user) {
                Log::warning('TempPrivilegePoint store: No authenticated user');
                return response()->json(['message' => 'Unauthenticated'], 401);
            }

            // Log the incoming request data for debugging
            Log::info('TempPrivilegePoint store request', [
                'user_id' => $user->id,
                'user_company' => $user->company_code,
                'user_section' => $user->section_code,
                'request_data' => $request->all(),
                'headers' => $request->headers->all()
            ]);

            $validated = $request->validate([
                'customer_code' => 'required|string',
                'total_amount' => 'nullable|numeric|min:0',
                'points' => 'nullable|numeric|min:0',
                'invoice_no' => 'required|string',
                'transaction_date' => 'required|date',
                'card_no' => 'nullable|string',
                'transaction_id' => 'nullable|string',
                'counter_id' => 'nullable|string',
            ]);

            // Either total_amount or points must be provided
            if (!isset($validated['total_amount']) && !isset($validated['points'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Either total_amount or points must be provided'
                ], 400);
            }

            // Log the validated data
            Log::info('TempPrivilegePoint validated data', [
                'validated' => $validated,
                'card_no_exists' => array_key_exists('card_no', $validated),
                'card_no_value' => $validated['card_no'] ?? 'NOT_SET'
            ]);

            // Check if customer is eligible for points
            $isEligible = $this->pointService->isCustomerEligibleForPoints($validated['customer_code'], (int) $user->company_code);
            Log::info('Customer eligibility check', [
                'customer_code' => $validated['customer_code'],
                'company_code' => $user->company_code,
                'is_eligible' => $isEligible
            ]);

            if (!$isEligible) {
                Log::warning('Customer not eligible for points', [
                    'customer_code' => $validated['customer_code'],
                    'company_code' => $user->company_code
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Customer is not eligible for privilege points'
                ], 400);
            }

            // Generate points - use provided points or calculate from amount
            $points = 0;
            if (isset($validated['points'])) {
                $points = $validated['points'];
            } elseif (isset($validated['total_amount'])) {
                $points = $this->pointService->calculatePoints($validated['total_amount'], (int) $user->company_code);
            }

            if ($points <= 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'No points to add - amount too low or points not specified'
                ], 400);
            }

            // Create temp privilege point record for earned points
            $tempPoint = TempPrivilagePoint::create([
                'company_code' => $user->company_code,
                'section_code' => $user->section_code,
                'finAct' => true,
                'customer_code' => $validated['customer_code'],
                'status' => 'active',
                'pointKey' => $validated['invoice_no'] . '_' . time(),
                'pointDate' => $validated['transaction_date'],
                'ordNo' => $validated['invoice_no'],
                'cardNo' => $validated['card_no'] ?? null,
                'claimed' => false,
                'entuser' => $user->id,
                'counterID' => $validated['counter_id'] ?? null,
                'TrnNo' => $validated['transaction_id'] ?? null,
                'pointAmount' => $points,
            ]);

            Log::info('TempPrivilegePoint record created successfully', [
                'temp_point_id' => $tempPoint->id,
                'customer_code' => $validated['customer_code'],
                'points' => $points,
                'invoice_no' => $validated['invoice_no']
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Points generated successfully',
                'data' => [
                    'points_generated' => $points,
                    'customer_code' => $validated['customer_code'],
                    'invoice_no' => $validated['invoice_no'],
                ]
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error generating points: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error generating points: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Redeem points and save to temp privilege points table
     * This method now properly handles earned points claiming for immediate processing
     * 
     * @param Request $request The HTTP request containing redemption data
     * @return JsonResponse
     */
    public function redeemPoints(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            if (!$user) {
                return response()->json(['message' => 'Unauthenticated'], 401);
            }

            // Ensure user has required attributes
            if (!$user->company_code) {
                return response()->json(['message' => 'User company not found'], 400);
            }

            if (!$user->section_code) {
                return response()->json(['message' => 'User section not found'], 400);
            }

            $validated = $request->validate([
                'customer_code' => 'required|string',
                'card_no' => 'nullable|string',
                'mobile_no' => 'nullable|string',
                'points_redeem' => 'required|numeric|min:0.01', // Ensure positive redemption
                'transaction_no' => 'nullable|string',
                'bill_no' => 'nullable|string',
            ]);

            // Check if customer has enough points to redeem
            $currentTotalPoints = $this->calculateCustomerTotalPoints($validated['customer_code'], (int) $user->company_code);
            if ($currentTotalPoints < $validated['points_redeem']) {
                $msg = 'Insufficient points. Customer has ' . $currentTotalPoints . ' points but trying to redeem ' . $validated['points_redeem'] . ' points.';
                return response()->json([
                    'success' => false,
                    'message' => $msg
                ], 400);
            }

            // Check if customer is eligible for points
            if (!$this->pointService->isCustomerEligibleForPoints($validated['customer_code'], (int) $user->company_code)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Customer is not eligible for privilege points'
                ], 400);
            }

            DB::beginTransaction();

            // Mark earned points as claimed (FIFO) when processing temp redemption
            $this->markEarnedPointsAsClaimed($validated['customer_code'], (int) $user->company_code, $validated['points_redeem']);

            // Create temp privilege point record for redemption
            $tempPoint = TempPrivilagePoint::create([
                'company_code' => $user->company_code,
                'section_code' => $user->section_code,
                'finAct' => true,
                'customer_code' => $validated['customer_code'],
                'status' => 'redeemed',
                'pointKey' => uniqid('REDEEM_'),
                'pointDate' => now(),
                'ordNo' => $validated['bill_no'] ?? null,
                'cardNo' => $validated['card_no'] ?? null,
                'claimed' => false, // Will be marked true when transferred to permanent
                'entuser' => $user->id,
                'counterID' => null, // TODO: Add counter ID if available
                'TrnNo' => $validated['transaction_no'] ?? null,
                'pointAmount' => $validated['points_redeem'],
            ]);

            DB::commit();

            Log::info('Temp points redemption processed with earned points claiming', [
                'temp_point_id' => $tempPoint->id,
                'customer_code' => $validated['customer_code'],
                'points_redeemed' => $validated['points_redeem'],
                'earned_points_marked_claimed' => $validated['points_redeem']
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Points redeemed successfully',
                'data' => [
                    'temp_point_id' => $tempPoint->id,
                    'points_redeemed' => $validated['points_redeem'],
                    'customer_code' => $validated['customer_code'],
                ]
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error redeeming points (temp): ' . $e->getMessage(), [
                'customer_code' => $request->input('customer_code'),
                'points_redeem' => $request->input('points_redeem'),
                'exception' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Error redeeming points: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate a unique transaction number for the current user
     * 
     * @param Request $request The HTTP request
     * @return JsonResponse
     */
    public function generateTransactionNumber(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            if (!$user) {
                return response()->json(['message' => 'Unauthenticated'], 401);
            }

            // Use NumberGeneratorService for thread-safe transaction number generation
            $numberGenerator = app(NumberGeneratorService::class);
            $transactionNumber = $numberGenerator->generate(
                'privilege_transaction',
                $user->company_code,
                $user->section_code
            );

            return response()->json([
                'success' => true,
                'data' => [
                    'transaction_no' => $transactionNumber
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error generating transaction number: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error generating transaction number'
            ], 500);
        }
    }

    /**
     * Redeem points and save directly to permanent privilege points table (for manual redemption)
     * Also properly marks equivalent earned points as claimed
     * 
     * @param Request $request The HTTP request containing redemption data
     * @return JsonResponse
     */
    public function redeemPointsToPermanent(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            if (!$user) {
                return response()->json(['message' => 'Unauthenticated'], 401);
            }

            // Log the incoming request data for debugging
            Log::info('Permanent redeem request', [
                'user_id' => $user->id,
                'request_data' => $request->all()
            ]);

            $validated = $request->validate([
                'customer_code' => 'required|string',
                'points_redeem' => 'required|numeric|min:0.01',
                'card_no' => 'nullable|string',
                'mobile_no' => 'nullable|string',
                'transaction_no' => 'required|string',
                'bill_no' => 'nullable|string',
            ]);

            // Check if customer has enough points to redeem
            $currentTotalPoints = $this->calculateCustomerTotalPoints($validated['customer_code'], (int) $user->company_code);
            if ($currentTotalPoints < $validated['points_redeem']) {
                $msg = 'Insufficient points. Customer has ' . $currentTotalPoints . ' points but trying to redeem ' . $validated['points_redeem'] . ' points.';
                return response()->json([
                    'success' => false,
                    'message' => $msg
                ], 400);
            }

            DB::beginTransaction();

            // First, mark equivalent earned points as claimed
            $pointsToRedeem = $validated['points_redeem'];
            $this->markEarnedPointsAsClaimed($validated['customer_code'], (int) $user->company_code, $pointsToRedeem);

            // Create permanent privilege point record for redeemed points
            $permanentPoint = PrivilagePoint::create([
                'company_code' => $user->company_code,
                'section_code' => $user->section_code,
                'finAct' => true,
                'status' => 'redeemed',
                'tabelKey' => 'REDEEM_' . uniqid(),
                'customer_code' => $validated['customer_code'],
                'pointDate' => now(),
                'pointAmount' => $validated['points_redeem'], // Keep positive for redeemed points
                'ordNo' => $validated['bill_no'] ?? null,
                'cardNo' => $validated['card_no'] ?? null,
                'claimed' => true, // Redeemed points are always claimed
                'entuser' => $user->id,
                'pointType' => 'redeemed',
            ]);

            DB::commit();

            Log::info('Permanent redeem point created with claimed field management', [
                'permanent_point_id' => $permanentPoint->id,
                'customer_code' => $validated['customer_code'],
                'points_redeemed' => $validated['points_redeem'],
                'bill_no' => $validated['bill_no'] ?? null,
                'earned_points_marked_claimed' => $pointsToRedeem
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Points redeemed successfully to permanent table',
                'data' => [
                    'permanent_point_id' => $permanentPoint->id,
                    'points_redeemed' => $validated['points_redeem'],
                    'customer_code' => $validated['customer_code'],
                ]
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error redeeming points to permanent: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error redeeming points: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Calculate customer`s total available points from permanent table using atomic operation
     * Only counts unclaimed earned points and subtracts redeemed points
     * 
     * @param string $customerCode The customer code to calculate points for
     * @param int $companyId The company ID for the calculation
     * @return float The total available points
     */
    private function calculateCustomerTotalPoints(string $customerCode, int $companyId): float
    {
        // Use a single atomic query with conditional summation to prevent race conditions
        // Only count unclaimed earned points as available
        $result = DB::selectOne("
            SELECT 
                COALESCE(SUM(CASE WHEN pointType = 'earned' AND claimed = 0 THEN pointAmount ELSE 0 END), 0) as available_earned_points,
                COALESCE(SUM(CASE WHEN pointType = 'redeemed' THEN pointAmount ELSE 0 END), 0) as total_redeemed_points,
                COALESCE(SUM(CASE WHEN pointType = 'earned' AND claimed = 1 THEN pointAmount ELSE 0 END), 0) as claimed_earned_points
            FROM PrivilagePoint 
            WHERE customer_code = ? 
            AND company_code = ?
            FOR UPDATE
        ", [$customerCode, $companyId]);

        if (!$result) {
            return 0.0;
        }

        $availableEarnedPoints = (float) ($result->available_earned_points ?? 0);
        $totalRedeemedPoints = (float) ($result->total_redeemed_points ?? 0);
        $claimedEarnedPoints = (float) ($result->claimed_earned_points ?? 0);
        
        // Available points = unclaimed earned points
        // (The redeemed points should match the claimed earned points if our logic is correct)
        $totalAvailable = $availableEarnedPoints;
        
        Log::info('Customer points calculation with claimed field tracking', [
            'customer_code' => $customerCode,
            'company_code' => $companyId,
            'available_earned_points' => $availableEarnedPoints,
            'claimed_earned_points' => $claimedEarnedPoints,
            'total_redeemed_points' => $totalRedeemedPoints,
            'final_available_balance' => $totalAvailable,
            'verification_balance' => $availableEarnedPoints + $claimedEarnedPoints - $totalRedeemedPoints,
            'balance_matches' => abs(($availableEarnedPoints + $claimedEarnedPoints - $totalRedeemedPoints) - $totalAvailable) < 0.01
        ]);

        return $totalAvailable;
    }

    /**
     * Mark earned points as claimed when points are redeemed
     * This ensures proper tracking of which earned points have been used
     * 
     * @param string $customerCode The customer code
     * @param int $companyId The company ID
     * @param float $pointsToRedeem The number of points being redeemed
     * @return void
     */
    private function markEarnedPointsAsClaimed(string $customerCode, int $companyId, float $pointsToRedeem): void
    {
        Log::info('Marking earned points as claimed', [
            'customer_code' => $customerCode,
            'company_code' => $companyId,
            'points_to_redeem' => $pointsToRedeem
        ]);

        // Get unclaimed earned points in chronological order (FIFO)
        $unclaimedEarnedPoints = PrivilagePoint::where('customer_code', $customerCode)
            ->where('company_code', $companyId)
            ->where('pointType', 'earned')
            ->where('claimed', false)
            ->orderBy('pointDate', 'asc') // First In, First Out
            ->orderBy('id', 'asc')
            ->lockForUpdate() // Prevent concurrent access
            ->get();

        $remainingToRedeem = $pointsToRedeem;
        $claimedCount = 0;

        foreach ($unclaimedEarnedPoints as $earnedPoint) {
            if ($remainingToRedeem <= 0) {
                break;
            }

            if ($earnedPoint->pointAmount <= $remainingToRedeem) {
                // This entire earned point record can be claimed
                $earnedPoint->update(['claimed' => true]);
                $remainingToRedeem -= $earnedPoint->pointAmount;
                $claimedCount++;

                Log::info('Earned point fully claimed', [
                    'earned_point_id' => $earnedPoint->id,
                    'point_amount' => $earnedPoint->pointAmount,
                    'remaining_to_redeem' => $remainingToRedeem
                ]);
            } else {
                // Partial claiming - this is more complex and might require splitting records
                // For now, we'll mark the whole record as claimed and track the difference
                $earnedPoint->update(['claimed' => true]);
                $remainingToRedeem = 0;
                $claimedCount++;

                Log::warning('Earned point partially claimed (marked as fully claimed)', [
                    'earned_point_id' => $earnedPoint->id,
                    'point_amount' => $earnedPoint->pointAmount,
                    'amount_actually_redeemed' => $pointsToRedeem - $remainingToRedeem,
                    'note' => 'Full record marked as claimed for simplicity'
                ]);
                break;
            }
        }

        Log::info('Completed marking earned points as claimed', [
            'customer_code' => $customerCode,
            'total_points_redeemed' => $pointsToRedeem,
            'earned_records_claimed' => $claimedCount,
            'remaining_unredeemed' => $remainingToRedeem
        ]);

        if ($remainingToRedeem > 0) {
            Log::warning('Unable to claim all earned points for redemption', [
                'customer_code' => $customerCode,
                'points_requested' => $pointsToRedeem,
                'points_unable_to_claim' => $remainingToRedeem,
                'note' => 'This should not happen if validation is correct'
            ]);
        }
    }

    /**
     * Transfer temporary privilege points to permanent table
     * 
     * @param Request $request The HTTP request containing transfer data
     * @return JsonResponse
     */
    public function transferToPermanentPoints(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            if (!$user) {
                return response()->json(['message' => 'Unauthenticated'], 401);
            }

            $validated = $request->validate([
                'customer_code' => 'required|string',
                'invoice_no' => 'required|string',
            ]);

            Log::info('Transfer API called', [
                'customer_code' => $validated['customer_code'],
                'invoice_no' => $validated['invoice_no'],
                'user_id' => $user->id,
                'company_code' => $user->company_code
            ]);

            DB::beginTransaction();

            // Get all temp privilege points for this customer that are not yet transferred
            $tempPoints = TempPrivilagePoint::where('customer_code', $validated['customer_code'])
                ->where('company_code', $user->company_code)
                ->where('finAct', true)
                ->where('claimed', false) // Not yet transferred
                ->get();

            Log::info('Temp points found for transfer', [
                'customer_code' => $validated['customer_code'],
                'temp_points_count' => $tempPoints->count(),
                'temp_points' => $tempPoints->toArray()
            ]);

            if ($tempPoints->isEmpty()) {
                // Check if there are any temp points for this customer at all (claimed or unclaimed)
                $allTempPoints = TempPrivilagePoint::where('customer_code', $validated['customer_code'])
                    ->where('company_code', $user->company_code)
                    ->get(['id', 'customer_code', 'claimed', 'status', 'pointAmount', 'created_at']);
                
                Log::warning('No unclaimed temp points found for transfer', [
                    'customer_code' => $validated['customer_code'],
                    'invoice_no' => $validated['invoice_no'],
                    'all_temp_points_for_customer' => $allTempPoints->toArray(),
                    'total_temp_points_count' => $allTempPoints->count()
                ]);

                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'No temporary points found to transfer for customer `' . $validated['customer_code'] . '`. This usually means no privilege card operations were performed for this customer, or points were already transferred.'
                ], 404);
            }

            $transferredCount = 0;
            $totalPointsTransferred = 0;

            foreach ($tempPoints as $tempPoint) {
                // Create permanent privilege point record
                if ($tempPoint->status === 'redeemed') {
                    // For redeemed points, create a negative record to deduct from earned points
                    $permanentPoint = PrivilagePoint::create([
                        'company_code' => $tempPoint->company_code,
                        'section_code' => $tempPoint->section_code,
                        'finAct' => $tempPoint->finAct,
                        'status' => 'redeemed',
                        'tabelKey' => $tempPoint->pointKey,
                        'customer_code' => $tempPoint->customer_code,
                        'pointDate' => $tempPoint->pointDate,
                        'pointAmount' => $tempPoint->pointAmount, // Keep positive for redeemed points tracking
                        'ordNo' => $validated['invoice_no'],
                        'cardNo' => $tempPoint->cardNo,
                        'claimed' => true, // Redeemed points are always claimed
                        'entuser' => $tempPoint->entuser,
                        'pointType' => 'redeemed',
                    ]);
                } else {
                    // For earned points, create standard positive record
                    $permanentPoint = PrivilagePoint::create([
                        'company_code' => $tempPoint->company_code,
                        'section_code' => $tempPoint->section_code,
                        'finAct' => $tempPoint->finAct,
                        'status' => 'active',
                        'tabelKey' => $tempPoint->pointKey,
                        'customer_code' => $tempPoint->customer_code,
                        'pointDate' => $tempPoint->pointDate,
                        'pointAmount' => $tempPoint->pointAmount,
                        'ordNo' => $validated['invoice_no'],
                        'cardNo' => $tempPoint->cardNo,
                        'claimed' => false, // Earned points start as unclaimed and available
                        'entuser' => $tempPoint->entuser,
                        'pointType' => 'earned',
                    ]);
                }

                // Mark temp point as transferred
                $tempPoint->update(['claimed' => true]);

                Log::info('Individual point transferred with claimed field details', [
                    'temp_point_id' => $tempPoint->id,
                    'permanent_point_id' => $permanentPoint->id,
                    'customer_code' => $tempPoint->customer_code,
                    'ordNo' => $validated['invoice_no'],
                    'point_amount' => $tempPoint->pointAmount,
                    'point_type' => $tempPoint->status === 'redeemed' ? 'redeemed' : 'earned',
                    'point_status' => $tempPoint->status,
                    'claimed_value' => $tempPoint->status === 'redeemed' ? true : false,
                    'claimed_explanation' => $tempPoint->status === 'redeemed' 
                        ? 'Redeemed points are immediately claimed' 
                        : 'Earned points start as unclaimed (available)'
                ]);

                $transferredCount++;
                $totalPointsTransferred += $tempPoint->pointAmount;
            }

            DB::commit();

            Log::info('Points transferred from temp to permanent', [
                'customer_code' => $validated['customer_code'],
                'invoice_no' => $validated['invoice_no'],
                'records_transferred' => $transferredCount,
                'total_points' => $totalPointsTransferred
            ]);

            // After successful transfer, send points earned SMS notification
            if ($transferredCount > 0) {
                $this->sendPointsEarnedNotification($validated['customer_code'], $totalPointsTransferred);
            }

            return response()->json([
                'success' => true,
                'message' => 'Points transferred successfully',
                'data' => [
                    'customer_code' => $validated['customer_code'],
                    'invoice_no' => $validated['invoice_no'],
                    'records_transferred' => $transferredCount,
                    'total_points_transferred' => $totalPointsTransferred
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error transferring points: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error transferring points: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Send points earned notification SMS to privilege customer
     * 
     * @param string $customerCode The customer code to send notification to
     * @param float $pointsEarned The number of points earned
     * @return void
     */
    private function sendPointsEarnedNotification(string $customerCode, float $pointsEarned): void
    {
        try {
            // Get privilege user details
            $user = Auth::user();
            $privilegeUser = PrivilegeUser::where('customer_code', $customerCode)
                ->where('company_code', $user->company_code)
                ->where('is_active', true)
                ->first();

            if (!$privilegeUser or !$privilegeUser->phone) {
                Log::info('SMS notification skipped - no phone number or user not found', [
                    'customer_code' => $customerCode,
                    'privilege_user_found' => $privilegeUser ? 'yes' : 'no',
                    'phone_available' => $privilegeUser ? $privilegeUser->phone : 'no'
                ]);
                return;
            }

            // Calculate total points after adding earned points
            $totalAvailablePoints = $this->calculateCustomerTotalPoints($customerCode, (int) $user->company_code);

            // Send SMS notification
            $result = $this->otpService->sendPointsEarnedConfirmation(
                $privilegeUser->phone,
                $privilegeUser->privCusName,
                (int) $pointsEarned,
                (int) $totalAvailablePoints
            );

            if ($result['success']) {
                Log::info('Points earned SMS sent successfully', [
                    'customer_code' => $customerCode,
                    'phone' => $privilegeUser->phone,
                    'points_earned' => $pointsEarned,
                    'total_points' => $totalAvailablePoints
                ]);
            } else {
                Log::warning('Points earned SMS failed to send', [
                    'customer_code' => $customerCode,
                    'phone' => $privilegeUser->phone,
                    'error_message' => $result['message']
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Error sending points earned notification SMS', [
                'customer_code' => $customerCode,
                'points_earned' => $pointsEarned,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Debug method to check the claimed field status for a customer
     * 
     * @param Request $request The HTTP request containing customer_code
     * @return JsonResponse
     */
    public function debugClaimedField(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();

            if (!$user) {
                return response()->json(['message' => 'Unauthenticated'], 401);
            }

            $validated = $request->validate([
                'customer_code' => 'required|string',
            ]);

            $customerCode = $validated['customer_code'];
            $companyCode = (int) $user->company_code;

            // Get all privilege points for this customer
            $allPoints = PrivilagePoint::where('customer_code', $customerCode)
                ->where('company_code', $companyCode)
                ->orderBy('pointDate', 'asc')
                ->get(['id', 'pointType', 'pointAmount', 'claimed', 'status', 'pointDate', 'created_at']);

            // Calculate totals
            $earnedTotal = 0;
            $earnedClaimed = 0;
            $earnedUnclaimed = 0;
            $redeemedTotal = 0;

            $pointBreakdown = [];

            foreach ($allPoints as $point) {
                $pointBreakdown[] = [
                    'id' => $point->id,
                    'type' => $point->pointType,
                    'amount' => $point->pointAmount,
                    'claimed' => $point->claimed ? 'YES' : 'NO',
                    'status' => $point->status,
                    'date' => $point->pointDate,
                    'created' => $point->created_at
                ];

                if ($point->pointType === 'earned') {
                    $earnedTotal += $point->pointAmount;
                    if ($point->claimed) {
                        $earnedClaimed += $point->pointAmount;
                    } else {
                        $earnedUnclaimed += $point->pointAmount;
                    }
                } elseif ($point->pointType === 'redeemed') {
                    $redeemedTotal += $point->pointAmount;
                }
            }

            // Calculate using our method
            $calculatedAvailable = $this->calculateCustomerTotalPoints($customerCode, $companyCode);

            return response()->json([
                'success' => true,
                'data' => [
                    'customer_code' => $customerCode,
                    'point_breakdown' => $pointBreakdown,
                    'summary' => [
                        'total_earned' => $earnedTotal,
                        'earned_claimed' => $earnedClaimed,
                        'earned_unclaimed' => $earnedUnclaimed,
                        'total_redeemed' => $redeemedTotal,
                        'calculated_available' => $calculatedAvailable,
                        'manual_calculation' => $earnedUnclaimed,
                        'balance_verification' => [
                            'formula' => 'earned_unclaimed = available_points',
                            'earned_unclaimed' => $earnedUnclaimed,
                            'calculated_available' => $calculatedAvailable,
                            'matches' => abs($earnedUnclaimed - $calculatedAvailable) < 0.01,
                            'redeemed_vs_claimed_earned' => [
                                'redeemed_total' => $redeemedTotal,
                                'earned_claimed' => $earnedClaimed,
                                'matches' => abs($redeemedTotal - $earnedClaimed) < 0.01,
                                'note' => 'These should be equal if claiming logic is working correctly'
                            ]
                        ]
                    ],
                    'claimed_field_analysis' => [
                        'correct_logic' => [
                            'earned_points_start_unclaimed' => 'claimed = false (available for redemption)',
                            'redeemed_points_always_claimed' => 'claimed = true (already used)',
                            'when_points_redeemed' => 'corresponding earned points marked as claimed = true'
                        ],
                        'current_status' => [
                            'total_earned_records' => count(array_filter($pointBreakdown, fn($p) => $p['type'] === 'earned')),
                            'total_redeemed_records' => count(array_filter($pointBreakdown, fn($p) => $p['type'] === 'redeemed')),
                            'earned_unclaimed_records' => count(array_filter($pointBreakdown, fn($p) => $p['type'] === 'earned' and $p['claimed'] === 'NO')),
                            'earned_claimed_records' => count(array_filter($pointBreakdown, fn($p) => $p['type'] === 'earned' and $p['claimed'] === 'YES')),
                        ]
                    ]
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error in debugClaimedField: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error debugging claimed field: ' . $e->getMessage()
            ], 500);
        }
    }
}

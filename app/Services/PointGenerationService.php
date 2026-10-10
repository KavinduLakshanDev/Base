<?php

namespace App\Services;

use App\Models\PrivilegeUser;
use App\Models\PrivilagePoint;
use App\Models\TempPrivilagePoint;
use App\Models\PointsRule;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PointGenerationService
{
    /**
     * Calculate points for a given amount using company-specific rules
     */
    public function calculatePoints(float $amount, $companyId = null): float
    {
        // Get the points rule for the company, or use default if none exists
        $pointsRule = null;
        if ($companyId) {
            $pointsRule = PointsRule::where('company_code', $companyId)->first();
        }

        // Use company-specific rule or default to Rs. 100 = 1 point
        $currencyAmount = $pointsRule ? $pointsRule->currency_amount : 100;
        $pointsEarned = $pointsRule ? $pointsRule->points_earned : 1;

        return ($amount / $currencyAmount) * $pointsEarned;
    }

    /**
     * Check if a customer is eligible for privilege points
     */
    public function isCustomerEligibleForPoints(string $customerCode, int $companyId): bool
    {
        return PrivilegeUser::where('customer_code', $customerCode)
            ->where('company_code', $companyId)
            ->where('is_active', true)
            ->exists();
    }

    /**
     * Generate points for a sales transaction
     */
    public function generatePoints(array $data): bool
    {
        try {
            DB::beginTransaction();

            // Calculate points based on total amount using company-specific rules
            $points = $this->calculatePoints($data['total_amount'], $data['company_code']);

            if ($points <= 0) {
                Log::info('No points generated - amount too low', [
                    'customer_code' => $data['customer_code'],
                    'total_amount' => $data['total_amount']
                ]);
                DB::rollBack();
                return true; // Not an error, just no points to generate
            }

            // Create temp privilege point record
            TempPrivilagePoint::create([
                'company_code' => $data['company_code'],
                'section_code' => $data['section_code'],
                'finAct' => true,
                'customer_code' => $data['customer_code'],
                'status' => 'active',
                'pointKey' => $data['invoice_no'] . '_' . time(),
                'pointDate' => $data['transaction_date'],
                'ordNo' => $data['invoice_no'],
                'cardNo' => $data['card_no'] ?? null,
                'claimed' => false,
                'entuser' => $data['entuser'],
                'counterID' => $data['counter_id'] ?? null,
                'TrnNo' => $data['transaction_id'] ?? null,
                'pointAmount' => $points,
            ]);

            // Also create a record in the main PrivilagePoint table
            PrivilagePoint::create([
                'company_code' => $data['company_code'],
                'section_code' => $data['section_code'],
                'finAct' => true,
                'status' => 'active',
                'tabelKey' => $data['invoice_no'],
                'customer_code' => $data['customer_code'],
                'pointDate' => $data['transaction_date'],
                'pointAmount' => $points,
                'ordNo' => $data['invoice_no'],
                'cardNo' => $data['card_no'] ?? null,
                'claimed' => false,
                'entuser' => $data['entuser'],
                'pointType' => 'earned',
            ]);

            DB::commit();

            Log::info('Points generated successfully', [
                'customer_code' => $data['customer_code'],
                'invoice_no' => $data['invoice_no'],
                'points' => $points,
                'total_amount' => $data['total_amount']
            ]);

            return true;
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to generate points', [
                'customer_code' => $data['customer_code'],
                'invoice_no' => $data['invoice_no'],
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Get customer`s total point balance (earned - claimed)
     */
    public function getCustomerPointBalance(string $customerCode, int $companyId): int
    {
        try {
            // Get total earned points
            $earnedPoints = PrivilagePoint::where('customer_code', $customerCode)
                ->where('company_code', $companyId)
                ->where('finAct', true)
                ->where('pointType', 'earned')
                ->sum('pointAmount');

            // Get total claimed points
            $claimedPoints = PrivilagePoint::where('customer_code', $customerCode)
                ->where('company_code', $companyId)
                ->where('finAct', true)
                ->where('claimed', true)
                ->sum('pointAmount');

            $balance = $earnedPoints - $claimedPoints;

            Log::info('Point balance calculated', [
                'customer_code' => $customerCode,
                'earned' => $earnedPoints,
                'claimed' => $claimedPoints,
                'balance' => $balance
            ]);

            return max(0, $balance); // Ensure balance is never negative

        } catch (\Exception $e) {
            Log::error('Failed to calculate point balance', [
                'customer_code' => $customerCode,
                'error' => $e->getMessage()
            ]);
            return 0;
        }
    }

    /**
     * Get customer`s privilege card information
     */
    public function getCustomerPrivilegeInfo(string $customerCode, int $companyId): ?array
    {
        $privilegeUser = PrivilegeUser::where('customer_code', $customerCode)
            ->where('company_code', $companyId)
            ->where('is_active', true)
            ->first();

        if (!$privilegeUser) {
            return null;
        }

        $totalPoints = $this->getCustomerPointBalance($customerCode, $companyId);

        return [
            'code' => $privilegeUser->customer_code,
            'name' => $privilegeUser->privCusName,
            'nic_no' => $privilegeUser->NIC,
            'gender' => $privilegeUser->gender,
            'card_no' => $privilegeUser->card_no,
            'phone' => $privilegeUser->phone,
            'total_points' => $totalPoints,
        ];
    }
}

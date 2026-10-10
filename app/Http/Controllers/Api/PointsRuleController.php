<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PointsRule;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class PointsRuleController extends Controller
{
    /**
     * Get the points rule for the authenticated user's company
     */
    public function getCurrentUserPointsRule(): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json([
                'error' => 'User not authenticated'
            ], 401);
        }

        $pointsRule = PointsRule::where('company_code', $user->company_code)->first();
        
        return response()->json([
            'pointsRule' => $pointsRule,
            'company_code' => $user->company_code
        ]);
    }
}
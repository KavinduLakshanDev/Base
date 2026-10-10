<?php

namespace App\Http\Controllers;

use App\Models\PrivilagePoint;
use App\Models\PrivilegeUser;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;

class PrivilegePointsController extends Controller
{
    /**
     * Display a listing of privilege points summary.
     */
    public function index()
    {
        $user = Auth::user();
        $pointsSummary = PrivilagePoint::select(
            'company_code',
            'section_code',
            'customer_code',
            DB::raw('SUM(pointAmount) as total_points')
        )
            ->with(['privilegeUser:id,customer_code,privCusName'])
            ->where('finAct', true)
            ->where('company_code', $user->company_code)
            ->groupBy('company_code', 'section_code', 'customer_code')
            ->orderBy('company_code')
            ->orderBy('section_code')
            ->orderBy('customer_code')
            ->get()
            ->map(function ($point) {
                return [
                    'company_code' => $point->company_code,
                    'section_code' => $point->section_code,
                    'customer_code' => $point->customer_code,
                    'customer_name' => $point->privilegeUser?->privCusName ?? 'Unknown',
                    'total_points' => $point->total_points,
                ];
            });

        return Inertia::render('PrivilegePoints/Index', [
            'pointsSummary' => $pointsSummary,
        ]);
    }

    /**
     * Display the point history for a specific customer.
     */
    public function show($companyCode, $sectionCode, $customerCode)
    {
        $customer = PrivilegeUser::where('company_code', $companyCode)
            ->where('customer_code', $customerCode)
            ->first();

        if (! $customer) {
            abort(404, 'Customer not found');
        }

        $pointHistory = PrivilagePoint::where('company_code', $companyCode)
            ->where('section_code', $sectionCode)
            ->where('customer_code', $customerCode)
            ->where('finAct', true)
            ->with(['company', 'section'])
            ->orderBy('pointDate', 'desc')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($point) {
                return [
                    'id' => $point->id,
                    'pointDate' => $point->pointDate,
                    'pointAmount' => $point->pointAmount,
                    'pointType' => $point->pointType,
                    'ordNo' => $point->ordNo,
                    'claimed' => $point->claimed,
                    'status' => $point->status,
                    'tabelKey' => $point->tabelKey,
                    'entuser' => $point->entuser,
                ];
            });

        $totalPoints = $pointHistory->sum('pointAmount');
        $claimedPoints = $pointHistory->where('claimed', true)->sum('pointAmount');
        $availablePoints = $totalPoints - $claimedPoints;

        return Inertia::render('PrivilegePoints/Show', [
            'customer' => $customer,
            'pointHistory' => $pointHistory,
            'summary' => [
                'total_points' => $totalPoints,
                'claimed_points' => $claimedPoints,
                'available_points' => $availablePoints,
            ],
        ]);
    }
}

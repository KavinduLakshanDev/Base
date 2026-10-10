<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PrivilegeUser;
use App\Models\PrivilagePoint;
use App\Services\PointGenerationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PrivilegeUserController extends Controller
{
    public function search(Request $request)
    {
        $user = $request->user();

        if (!$user->hasPermission('privilege_users.manage') && !$user->hasPermission('sale.access')) {
             return response()->json(['error' => 'Unauthorized'], 403);
        }

        $query = $request->input('value');
        $type = $request->input('type', 'all'); // 'card', 'mobile', 'name'
        
        // Assuming company code is required or inferred from auth user
        $companyCode = $user->company_code ?? null;
        
        if (!$companyCode) {
            // Fallback for testing if user doesn't have company_code directly on model
            // or if we are using sanctum token that has company relation
             if ($user->company) {
                 $companyCode = $user->company->company_code;
             } else {
                 return response()->json(['error' => 'Company code not determined'], 400);
             }
        }

        $dbQuery = \App\Models\Customer::where('company_code', $companyCode)->where('is_privilege_user', true);

        if ($type === 'card') {
            $dbQuery->where('privilege_card_no', $query);
        } elseif ($type === 'phone' || $type === 'mobile') {
            $dbQuery->where('TP1', $query);
        } else {
             $dbQuery->where(function($q) use ($query) {
                $q->where('privilege_card_no', $query)
                  ->orWhere('TP1', $query)
                  ->orWhere('FstNm', 'LIKE', "%{$query}%")
                  ->orWhere('AdrCd', $query);
            });
        }

        $customer = $dbQuery->first();

        if (!$customer) {
            return response()->json(['found' => false, 'message' => 'Customer not found']);
        }

        return response()->json([
            'found' => true,
            'customer' => [
                'id' => $customer->AdrKy,
                'customer_code' => $customer->AdrCd,
                'name' => $customer->FstNm,
                'phone' => $customer->TP1,
                'card_no' => $customer->privilege_card_no,
                'address' => $customer->Address,
                'nic' => $customer->IDNo,
                'gender' => null,
                'is_privilege_user' => true,
            ]
        ]);
    }
}

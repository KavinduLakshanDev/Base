<?php

namespace App\Http\Controllers\Api;

use App\Models\Company;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class CompanyController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user('web');
        $company = $request->user('company');
        
        if ($user && $user->user_type === 'super_admin') {
            return response()->json(Company::all());
        }

        $companyCode = $company ? $company->company_code : ($user ? $user->company_code : null);
        
        if (!$companyCode) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // Other users can only see their own company
        return response()->json(Company::where('company_code', $companyCode)->get());
    }
}
<?php

namespace App\Http\Controllers;

use App\Models\Company;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SuperAdminController extends Controller
{
    /**
     * Show the company-picker page for super admins.
     */
    public function chooseCompany()
    {
        $companies = Company::select('company_code', 'name', 'is_active')
            ->orderBy('name')
            ->get();

        return Inertia::render('superadmin/choose-company', [
            'companies' => $companies,
            'selected'  => session('selected_company'),
        ]);
    }

    /**
     * Store the super admin's chosen company in the session.
     */
    public function storeCompany(Request $request)
    {
        $request->validate([
            'company_code' => 'required|string|exists:companies,company_code',
        ]);

        session(['selected_company' => $request->company_code]);

        return redirect()->route('dashboard');
    }

    /**
     * Clear the company choice so super admin can switch companies.
     */
    public function clearCompany()
    {
        session()->forget('selected_company');

        return redirect()->route('superadmin.choose-company');
    }

    /**
     * Toggle the active status of a company.
     */
    public function toggleCompanyStatus(Request $request)
    {
        $request->validate([
            'company_code' => 'required|string|exists:companies,company_code',
        ]);

        $company = Company::where('company_code', $request->company_code)->firstOrFail();
        $company->is_active = !$company->is_active;
        $company->save();

        return redirect()->back()->with('success', "Company '{$company->name}' status updated.");
    }
}

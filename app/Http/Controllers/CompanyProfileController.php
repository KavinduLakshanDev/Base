<?php

namespace App\Http\Controllers;

use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;

class CompanyProfileController extends Controller
{
    public function show()
    {
        // Get the authenticated user
        $user = auth()->user();

        // Get company based on user's company_code
        $company = Company::where('company_code', $user->company_code)->first();

        // If company not found, we shouldn't show a random one
        if (!$company) {
            abort(404, 'Company profile not found.');
        }

        return Inertia::render('Company/Profile', [
            'company' => $company,
        ]);
    }

    public function update(Request $request)
    {
        // Get the authenticated user
        $user = auth()->user();

        if (!$user) {
            return redirect()->route('login');
        }

        // Get company based on user's company_code
        $company = Company::where('company_code', $user->company_code)->first();

        if (!$company) {
             return redirect()->back()->withErrors(['general' => 'Company profile not found.']);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'contact_person_name' => 'required|string|max:255',
            'contact_person_number' => 'required|string|max:20',
            'email' => 'required|email|unique:companies,email,' . $company->id,
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'postal_code' => 'nullable|string|max:20',
            'tax_id' => 'nullable|string|max:50',
            'privilege_users_discount' => 'nullable|numeric|min:0|max:100',
            'privilege_card_discount' => 'nullable|numeric|min:0|max:100',
            'vat_no' => 'nullable|string|max:50',
            'vat_rate' => 'nullable|numeric|min:0|max:100',
            'vat_effective_date' => 'nullable|date',
            'password' => 'nullable|string|min:8|confirmed',
        ]);

        // Remove password if not provided
        if (empty($validated['password'])) {
            unset($validated['password']);
        } else {
            $validated['password'] = Hash::make($validated['password']);
        }

        $company->fill($validated);

        // Check if we need to create a new VAT rate history record
        $shouldCreateVatRate = false;

        // Condition 1: VAT fields have changed
        if ($company->isDirty(['vat_rate', 'vat_no', 'vat_effective_date'])) {
            $shouldCreateVatRate = true;
        } 
        // Condition 2: No active VAT rate exists (migration/sync scenario) for this company
        else if ($company->vat_rate !== null && !$company->vatRates()->where('is_active', true)->exists()) {
            $shouldCreateVatRate = true;
        }

        $company->save();

        if ($shouldCreateVatRate) {
            $effectiveDate = $company->vat_effective_date ? \Carbon\Carbon::parse($company->vat_effective_date) : now();

            // Deactivate existing active rates and set end_date to the day before new rate starts
            $company->vatRates()->where('is_active', true)->update([
                'is_active' => false,
                'end_date' => $effectiveDate->copy()->subDay()
            ]);
            
            // Create new rate
            $company->vatRates()->create([
                'vat_rate' => $company->vat_rate,
                'vat_no' => $company->vat_no,
                'effective_date' => $effectiveDate,
                'is_active' => true,
            ]);
        }

        return redirect()->back()->with('success', 'Profile updated successfully.');
    }
}

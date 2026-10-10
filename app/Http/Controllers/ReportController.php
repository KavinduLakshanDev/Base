<?php

namespace App\Http\Controllers;

use App\Models\Address;
use App\Models\Company;
use App\Models\Customer;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ReportController extends Controller
{
    public function customerDetails(Request $request)
    {
        if (!auth()->user()->hasPermission('reports.customer_history')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view customer history reports.');
        }

        // Get authenticated user's company
        $company = null;
        if (auth('company')->check()) {
            $company = auth('company')->user();
        } else {
            $user = auth('web')->user();
            $company = $user ? $user->company : Company::first();
        }

        // Ensure company is not null
        if (!$company) {
            $company = Company::first();
        }

        $customers = Customer::with(['company', 'section'])
            ->where('company_code', $company->company_code)
            ->get()
            ->map(function ($customer) {
            $customerTypeMap = [
                1 => 'Individual',
                2 => 'Business',
                3 => 'Corporate',
            ];
            $customer->customer_type = $customerTypeMap[$customer->AdrTypKy] ?? 'Unknown';
            return $customer;
        });

        return Inertia::render('Reports/CustomerDetails', [
            'customers' => $customers,
            'company' => $company,
        ]);
    }

    public function supplierDetails(Request $request)
    {
        if (!auth()->user()->hasPermission('reports.supplier_history')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view supplier history reports.');
        }

        // Get authenticated user's company
        $company = null;
        if (auth('company')->check()) {
            $company = auth('company')->user();
        } else {
            $user = auth('web')->user();
            $company = $user ? $user->company : Company::first();
        }

        // Ensure company is not null
        if (!$company) {
            $company = Company::first();
        }

        $suppliers = Address::with(['company', 'section'])
            ->where('AdrTypKy', 4)
            ->where('company_code', $company->company_code)
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('Reports/SupplierDetails', [
            'suppliers' => $suppliers,
            'company' => $company,
        ]);
    }

    public function collectionReport(Request $request)
    {
        if (!auth()->user()->hasPermission('reports.collection')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view collection reports.');
        }

        // Get authenticated user's company
        $company = null;
        if (auth('company')->check()) {
            $company = auth('company')->user();
        } else {
            $user = auth('web')->user();
            $company = $user ? $user->company : \App\Models\Company::first();
        }

        // Ensure company is not null
        if (!$company) {
            $company = (object) [
                'company_code' => 'C01',
                'name' => 'VISION COPIER',
                'primary_color' => '#00aeef',
                'secondary_color' => '#737578'
            ];
        }

        // Get payments data - you'll need to implement the actual query
        $payments = []; // Placeholder - implement based on your CustomerPayment model

        return Inertia::render('Reports/CollectionReport', [
            'payments' => $payments,
            'company' => $company,
        ]);
    }
}

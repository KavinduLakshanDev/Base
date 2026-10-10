<?php

namespace App\Http\Controllers;

use App\Models\Address;
use App\Models\Section;
use App\Models\AccMas;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Str;

class SupplierController extends Controller
{
    public function index(Request $request)
    {
        if (!$request->user()->hasPermission('suppliers.view')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view suppliers.');
        }

        $query = Address::with(['company', 'section'])
            ->where('AdrTypKy', 4)
            ->where('company_code', $request->user()->company_code);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('FstNm', 'like', "%{$search}%")
                  ->orWhere('Email', 'like', "%{$search}%")
                  ->orWhere('TP1', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('Status', $request->status);
        }

        $perPage = $request->input('per_page', 10);
        if (!in_array($perPage, [10, 25, 50, 100])) {
            $perPage = 10;
        }

        $suppliers = $query->orderBy('created_at', 'desc')
            ->paginate($perPage)
            ->withQueryString();

        // Calculate stats for all suppliers (not just current page)
        $statsQuery = Address::where('AdrTypKy', 4)
            ->where('company_code', $request->user()->company_code);
        
        $stats = [
            'active_suppliers' => (clone $statsQuery)->where('Status', '1')->count(),
            'vat_registered' => (clone $statsQuery)->where('fVATRegistered', 1)->count(),
        ];

        return Inertia::render('supplier/index', [
            'suppliers' => $suppliers,
            'filters' => $request->only(['search', 'status', 'per_page']),
            'stats' => $stats,
            'canDelete' => $this->userIsSuperAdmin($request->user()),
        ]);
    }

    public function create()
    {
        if (!auth()->user()->hasPermission('suppliers.create')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to create suppliers.');
        }

        return Inertia::render('supplier/create');
    }

    public function store(Request $request)
    {
        if (!auth()->user()->hasPermission('suppliers.create')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to create suppliers.');
        }

        $validated = $request->validate([
            'FstNm' => 'required|string|max:60',
            'Address' => 'nullable|string|max:250',
            'Country' => 'nullable|string|max:60',
            'CtPerson' => 'nullable|string|max:100',
            'TP1' => 'nullable|string|max:30',
            'Fax' => 'nullable|string|max:30',
            'Email' => 'nullable|email|max:100',
            'Website' => 'nullable|url|max:100',
            'fVATRegistered' => 'boolean',
            'VATNo' => 'nullable|required_if:fVATRegistered,1|string|max:50',
        ]);

        $user = auth()->user();
        $section = Section::where('section_code', $user->section_code)->firstOrFail();

        // Generate unique supplier code (sequential like SUP001, SUP002, etc.) using thread-safe Sequence
        $nextVal = \App\Models\Sequence::incrementSequence('supplier_code', function() {
            // Initializer: Find the max number from existing suppliers with format SUPxxx
            // Check AccMas for SUP prefix as primary source
            $maxCode = AccMas::where('AccCd', 'LIKE', 'SUP%')->max('AccCd');
            if ($maxCode) {
                // Extract number part: SUP005 -> 5
                $numPart = substr($maxCode, 3);
                return is_numeric($numPart) ? (int)$numPart : 0;
            }
            return 0;
        });
        
        $accCd = 'SUP' . str_pad($nextVal, 3, '0', STR_PAD_LEFT);

        $account = AccMas::create([
            'AccCd' => $accCd,
            'AccNm' => $validated['FstNm'],
            'AccTyp' => 'SUPPLIER',
            'company_code' => $section->company_code,
            'section_code' => $section->section_code,
            'Status' => 'A',
        ]);

        Address::create([
            'AccKy' => $account->AccKy,
            'AdrCd' => $accCd, // Also using generated code for AdrCd
            'company_code' => $section->company_code,
            'section_code' => $section->section_code,
            'FstNm' => $validated['FstNm'],
            'Address' => $validated['Address'],
            'Country' => $validated['Country'],
            'CtPerson' => $validated['CtPerson'],
            'TP1' => $validated['TP1'],
            'Fax' => $validated['Fax'],
            'Email' => $validated['Email'],
            'Website' => $validated['Website'],
            'fVATRegistered' => $validated['fVATRegistered'],
            'VATNo' => $validated['VATNo'],
            'uuid' => Str::uuid(),
            'Status' => '1', // Active by default?
            'AdrTypKy' => 4, // 4 for Supplier
        ]);

        return redirect()->route('suppliers.create')->with('success', 'Supplier registered successfully.');
    }

    public function edit($id)
    {
        if (!auth()->user()->hasPermission('suppliers.edit')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to edit suppliers.');
        }

        $supplier = Address::where('company_code', auth()->user()->company_code)->findOrFail($id);

        return Inertia::render('supplier/edit', [
            'supplier' => $supplier,
            'canDelete' => $this->userIsSuperAdmin(auth()->user()),
        ]);
    }

    public function update(Request $request, $id)
    {
        if (!auth()->user()->hasPermission('suppliers.edit')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to edit suppliers.');
        }

        $supplier = Address::where('company_code', auth()->user()->company_code)->findOrFail($id);

        $validated = $request->validate([
            'FstNm' => 'required|string|max:60',
            'Address' => 'nullable|string|max:250',
            'Country' => 'nullable|string|max:60',
            'CtPerson' => 'nullable|string|max:100',
            'TP1' => 'nullable|string|max:30',
            'Fax' => 'nullable|string|max:30',
            'Email' => 'nullable|email|max:100',
            'Website' => 'nullable|url|max:100',
            'fVATRegistered' => 'boolean',
            'VATNo' => 'nullable|required_if:fVATRegistered,1|string|max:50',
        ]);

        $user = auth()->user();
        $section = Section::where('section_code', $user->section_code)->firstOrFail();

        $supplier->update([
            'company_code' => $section->company_code,
            'section_code' => $section->section_code,
            'FstNm' => $validated['FstNm'],
            'Address' => $validated['Address'],
            'Country' => $validated['Country'],
            'CtPerson' => $validated['CtPerson'],
            'TP1' => $validated['TP1'],
            'Fax' => $validated['Fax'],
            'Email' => $validated['Email'],
            'Website' => $validated['Website'],
            'fVATRegistered' => $validated['fVATRegistered'],
            'VATNo' => $validated['VATNo'],
        ]);

        return redirect()->route('suppliers.index')->with('success', 'Supplier updated successfully.');
    }

    public function show($id)
    {
        if (!auth()->user()->hasPermission('suppliers.view')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view suppliers.');
        }

        $supplier = Address::with(['company', 'section'])
            ->where('company_code', auth()->user()->company_code)
            ->findOrFail($id);

        return Inertia::render('supplier/show', [
            'supplier' => $supplier,
            'canDelete' => $this->userIsSuperAdmin(auth()->user()),
        ]);
    }

    public function toggleStatus($id)
    {
        if (!auth()->user()->hasPermission('suppliers.toggle_status')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to edit suppliers.');
        }

        $supplier = Address::where('company_code', auth()->user()->company_code)->findOrFail($id);

        // Toggle status between '1' (active) and '0' (inactive)
        $supplier->Status = $supplier->Status === '1' ? '0' : '1';
        $supplier->save();

        $statusText = $supplier->Status === '1' ? 'activated' : 'deactivated';

        return redirect()->back()->with('success', "Supplier {$statusText} successfully.");
    }

    public function destroy($id)
    {
        $user = $this->getAuthenticatedUser();
        if (!$user) abort(401, 'User not authenticated.');

        if (!$this->userIsSuperAdmin($user)) {
            return redirect()->back()->with('error', 'Unauthorized. Only Super Admins can delete suppliers.');
        }

        $supplier = Address::where('company_code', $user->company_code)->findOrFail($id);

        // Check for dependencies
        // 1. Check for purchase history
        $purchaseCount = \App\Models\Purchase::where('SuppCode', $supplier->AdrCd)->count();
        if ($purchaseCount > 0) {
            return redirect()->back()->with('error', 'Cannot delete supplier with purchase history. Please deactivate them instead.');
        }

        // 2. Check for payments
        $paymentCount = \App\Models\SupplierPayment::where('supplier_id', $supplier->AdrKy)->count();
        if ($paymentCount > 0) {
            return redirect()->back()->with('error', 'Cannot delete supplier with payment history. Please deactivate them instead.');
        }

        // 3. Check for returns
        $returnCount = \App\Models\SupplierReturn::where('supplier_code', $supplier->AdrCd)->count();
        if ($returnCount > 0) {
            return redirect()->back()->with('error', 'Cannot delete supplier with return history. Please deactivate them instead.');
        }

        try {
            \Illuminate\Support\Facades\DB::beginTransaction();
            
            // Delete associated AccMas record
            if ($supplier->AccKy) {
                \App\Models\AccMas::where('AccKy', $supplier->AccKy)->delete();
            }

            // Delete the supplier record
            $supplier->delete();

            \Illuminate\Support\Facades\DB::commit();
            
            \Illuminate\Support\Facades\Log::info("Supplier deleted: {$supplier->AdrCd} by user {$user->id}");
            
            return redirect()->route('suppliers.index')->with('success', 'Supplier deleted successfully.');
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\DB::rollBack();
            \Illuminate\Support\Facades\Log::error('Supplier deletion error: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Error occurred while deleting supplier: ' . $e->getMessage());
        }
    }

    /**
     * Get the authenticated user from available guards
     */
    private function getAuthenticatedUser()
    {
        if (auth()->guard('web')->check()) {
            return auth()->guard('web')->user();
        }
        if (auth()->guard('company')->check()) {
            return auth()->guard('company')->user();
        }
        return auth()->user();
    }

    /**
     * Helper: detect super admin
     */
    private function userIsSuperAdmin($user): bool
    {
        if (!$user) return false;
        
        if (method_exists($user, 'isSuperAdmin')) {
            return (bool) $user->isSuperAdmin();
        }

        return ($user->user_type === 'super_admin' || ($user->role && $user->role->level === 'super_admin'));
    }
}

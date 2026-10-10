<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\Address;
use App\Models\Company;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SupplierDetailsController extends Controller
{
    public function index(Request $request)
    {
        $company = $this->getCompany();

        $suppliers = Address::where('company_code', $company->company_code ?? 'C01')
            ->whereHas('accMas', function ($q) {
                $q->where('AccTyp', 'SUPPLIER');
            })
            ->when($request->from_date, function ($query) use ($request) {
                return $query->whereDate('created_at', '>=', $request->from_date);
            })
            ->when($request->to_date, function ($query) use ($request) {
                return $query->whereDate('created_at', '<=', $request->to_date);
            })
            ->when($request->search, function ($query) use ($request) {
                $search = $request->search;
                return $query->where(function ($q) use ($search) {
                    $q->where('AdrCd', 'LIKE', "%{$search}%")
                      ->orWhere('FstNm', 'LIKE', "%{$search}%");
                });
            })
            ->orderBy('AdrCd')
            ->get();

        return Inertia::render('Reports/SupplierDetails', [
            'suppliers' => $suppliers,
            'company' => $company,
            'filters' => $request->only(['from_date', 'to_date', 'search']),
        ]);
    }

    private function getCompany()
    {
        $company = null;
        if (auth('company')->check()) {
            $company = auth('company')->user();
        } else {
            $user = auth('web')->user();
            $company = $user ? $user->company : Company::first();
        }

        if (!$company) {
            $company = (object) [
                'company_code' => 'C01',
                'name' => 'VISION COPIER',
                'primary_color' => '#00aeef',
                'secondary_color' => '#737578'
            ];
        }

        return $company;
    }
}

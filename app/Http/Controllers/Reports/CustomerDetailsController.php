<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\Address;
use App\Models\Company;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CustomerDetailsController extends Controller
{
    public function index(Request $request)
    {
        $company = $this->getCompany();

        $customers = Address::where('company_code', $company->company_code ?? 'C01')
            ->whereHas('accMas', function ($q) {
                $q->where('AccTyp', 'CUSTOMER');
            })
            ->when($request->from_date, function ($query) use ($request) {
                return $query->whereDate('created_at', '>=', $request->from_date);
            })
            ->when($request->to_date, function ($query) use ($request) {
                return $query->whereDate('created_at', '<=', $request->to_date);
            })
            ->when($request->customer_type && $request->customer_type !== 'all', function ($query) use ($request) {
                $typeMap = [
                    'individual' => 1,
                    'business' => 2,
                    'corporate' => 3,
                ];
                $typeId = $typeMap[$request->customer_type] ?? null;
                if ($typeId) {
                    return $query->where('AdrTypKy', $typeId);
                }
                return $query;
            })
            ->orderBy('AdrCd')
            ->get();

        return Inertia::render('Reports/CustomerDetails', [
            'customers' => $customers,
            'company' => $company,
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

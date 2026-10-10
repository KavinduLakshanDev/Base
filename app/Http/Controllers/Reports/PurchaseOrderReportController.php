<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Purchase;
use App\Models\Section;
use App\Models\Address;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;
use Barryvdh\DomPDF\Facade\Pdf;

class PurchaseOrderReportController extends Controller
{
    public function index(Request $request)
    {
        // authorization check
        if (! request()->user() || ! request()->user()->hasPermission('reports.purchase_orders')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view purchase order reports.');
        }

        $company = $this->getCompany();
        $companyCode = $company->company_code ?? 'C01';
        
        $fromDate = $request->get('from_date', Carbon::now()->subMonths(1)->format('Y-m-d'));
        $toDate = $request->get('to_date', Carbon::now()->format('Y-m-d'));
        $supplierId = $request->get('supplier_id', 'all');
        $status = $request->get('status', 'all');
        $section = $request->get('section', 'all');
        
        $filters = [
            'from_date' => $fromDate,
            'to_date' => $toDate,
            'supplier_id' => $supplierId,
            'status' => $status,
            'section' => $section,
        ];
        
        // Fetch Sections for dropdown
        $sectionsQuery = Section::where('company_code', $companyCode)
            ->where('is_active', true)
            ->select('section_code', 'name')
            ->orderBy('name');
        $sections = $sectionsQuery->get()->map(function ($sec) {
            return [
                'value' => $sec->section_code,
                'label' => $sec->name,
            ];
        });
        $sections->prepend(['value' => 'all', 'label' => 'All Sections']);
        
        // Fetch Suppliers for dropdown
        $suppliers = Address::where('company_code', $companyCode)
            ->whereHas('accMas', function ($q) {
                $q->where('AccTyp', 'SUPPLIER');
            })
            ->select('AdrKy', 'AdrCd', 'FstNm', 'LstNm')
            ->orderBy('FstNm')
            ->get()
            ->map(function ($supplier) {
                return [
                    'value' => $supplier->AdrCd,
                    'label' => $supplier->FstNm . ' ' . $supplier->LstNm,
                ];
            });
            
        $data = null;
        $totals = null;
        
        if ($fromDate && $toDate) {
            $result = $this->getPurchaseData($fromDate, $toDate, $supplierId, $status, $section);
            $data = $result['data'];
            $totals = $result['totals'];
        }
        
        return Inertia::render('Reports/PurchaseOrderReport', [
            'company' => [
                'name' => $company->company_name ?? 'VISMASS',
                'code' => $company->company_code ?? 'VIS001',
                'company_code' => $company->company_code ?? 'VIS001',
            ],
            'filters' => $filters,
            'suppliers' => $suppliers,
            'sections' => $sections,
            'reportData' => $data,
            'totals' => $totals,
        ]);
    }
    
    public function pdf(Request $request)
    {
        if (! request()->user() || ! request()->user()->hasPermission('reports.purchase_orders')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view purchase order reports.');
        }
        $company = $this->getCompany();
        $fromDate = $request->get('from_date');
        $toDate = $request->get('to_date');
        $supplierId = $request->get('supplier_id', 'all');
        $status = $request->get('status', 'all');
        $section = $request->get('section', 'all');
        
        if (!$fromDate || !$toDate) {
            return back()->with('error', 'Please select valid date range');
        }
        
        $result = $this->getPurchaseData($fromDate, $toDate, $supplierId, $status, $section);
        
        $pdf = Pdf::loadView('reports.purchase-orders-pdf', [
            'company' => [
                'name' => $company->company_name ?? 'VISMASS',
            ],
            'filters' => [
                'from_date' => $fromDate,
                'to_date' => $toDate,
                'supplier_id' => $supplierId,
                'status' => $status,
                'section' => $section,
            ],
            'reportData' => $result['data'],
            'totals' => $result['totals'],
            'fromDate' => $fromDate,
            'toDate' => $toDate,
        ]);
        
        $filename = "purchase-order-report-" . date('Y-m-d') . ".pdf";
        
        return $pdf->download($filename);
    }
    
    private function getPurchaseData($fromDate, $toDate, $supplierId, $status, $section = 'all')
    {
        $from = Carbon::parse($fromDate)->startOfDay();
        $to = Carbon::parse($toDate)->endOfDay();
        
        $query = Purchase::with(['supplier', 'section', 'details'])
            ->whereBetween('GRNDate', [$from, $to]);
            
        // limit to current company as well
        if ($company = $this->getCompany()) {
            $query->where('company_code', $company->company_code);
        }

        // treat '' or 'all' as no filter
        if ($supplierId !== 'all' && $supplierId !== '') {
            $query->where('SuppCode', $supplierId);
        }
        
        if ($status !== 'all' && $status !== '') {
            $query->where('Status', $status);
        }
        
        if ($section !== 'all' && $section !== '') {
            $query->where('section_code', $section);
        }
        
        $purchases = $query->orderBy('GRNDate', 'desc')->orderBy('PurchaseNo', 'desc')->get();
        
        $data = $purchases->map(function ($purchase) {
            $totalItems = $purchase->details->count();
            $totalQty = $purchase->details->sum(function($detail) {
                return $detail->Qty + ($detail->Free ?? 0);
            });
            
            $sectionName = $purchase->section ? $purchase->section->name : 'Main Branch';
            
            return [
                'id' => $purchase->PurchaseKey,
                'order_number' => $purchase->formatted_purchase_no ?? 'GRN-' . $purchase->PurchaseNo,
                'order_date' => $purchase->GRNDate->format('Y-m-d'),
                'supplier_name' => $purchase->supplier ? ($purchase->supplier->FstNm . ' ' . $purchase->supplier->LstNm) : 'N/A',
                'branch_name' => $sectionName,
                'total_items' => $totalItems,
                'total_quantity' => $totalQty,
                'total_value' => $purchase->TotalVal,
                'received_value' => $purchase->TotalVal,
                'status' => $purchase->Status == 'A' ? 'Completed' : 'Pending',
            ];
        });
        
        $totals = [
            'orders_count' => $data->count(),
            'total_value' => $data->sum('total_value'),
            'received_value' => $data->sum('received_value'),
            'total_items' => $data->sum('total_quantity'),
        ];
        
        return [
            'data' => $data,
            'totals' => $totals
        ];
    }
    
    private function getCompany()
    {
        if (auth('company')->check()) {
            return auth('company')->user();
        }
        
        $user = auth('web')->user();
        return $user ? $user->company : Company::first();
    }
}

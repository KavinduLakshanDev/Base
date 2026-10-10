<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Models\Company;
use App\Models\Section;
use Barryvdh\DomPDF\Facade\Pdf;

class PrinterStockReportController extends Controller
{
    public function index(Request $request)
    {
        try {
            $authUser = Auth::user();
            if (!$authUser || !$authUser->hasPermission('reports.printing.stock')) {
                return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view printer stock.');
            }

        $user = Auth::user();
        $company = $user->company ?? Company::first();
        $section = $user->section ?? Section::first();

        $companyCode = $company ? ($company->company_code ?? 'C01') : 'C01';
        $sectionCode = $section ? ($section->section_code ?? 'BR01') : 'BR01';

        if ($request->has('section') && !empty($request->section)) {
            $requestedSection = Section::find($request->section);
            if ($requestedSection) {
                $sectionCode = $requestedSection->section_code;
                $companyCode = $requestedSection->company_code;
                $section = $requestedSection;
            }
        }

        $companyInfo = [
            'name' => $company ? ($company->name ?? 'Company') : 'Company',
            'section' => $section ? ($section->name ?? 'Main') : 'Main',
            'code' => $companyCode,
            'section_code' => $sectionCode,
        ];

        $sections = Section::where('company_code', $companyCode)
            ->where('is_active', true)
            ->select('id', 'name', 'section_code')
            ->orderBy('name')
            ->get();

        // Base query for printer stock (using stock_in_hand as the primary source)
        $query = DB::table('stock_in_hand as sh')
            ->leftJoin('itemmaster as im', 'im.ItmKy', '=', 'sh.ItemKy')
            ->leftJoin('brands as b', 'im.brand_id', '=', 'b.id')
            ->leftJoin('models as m', 'im.models_id', '=', 'm.id')
            ->leftJoin('sections as s', 'sh.section_code', '=', 's.section_code')
            ->select(
                'b.name as brand',
                'm.name as model',
                'sh.serial_number',
                'sh.batch_no',
                'sh.warranty',
                'sh.section_code',
                's.name as section_name',
                'im.ItemCode',
                DB::raw('COALESCE(im.ItmNm, \'\') as item_name'),
                DB::raw('COALESCE(sh.Qty, 0) + COALESCE(sh.FreeQty, 0) as balance')
            )
            ->where('sh.section_code', $sectionCode)
            ->where('im.item_type', 'printer')
            ->whereRaw("(COALESCE(sh.Qty, 0) + COALESCE(sh.FreeQty, 0)) > 0");

        // Filters
        if ($request->section && $request->section !== 'all') {
            $requestedSection = Section::find($request->section);
            if ($requestedSection) {
                $query->where('sh.section_code', $requestedSection->section_code);
            }
        }

        if ($request->search) {
            $search = '%' . $request->search . '%';
            $query->where(function($q) use ($search) {
                $q->where('sh.serial_number', 'like', $search)
                  ->orWhere('m.name', 'like', $search)
                  ->orWhere('b.name', 'like', $search)
                  ->orWhere('sh.batch_no', 'like', $search)
                  ->orWhere('im.ItmNm', 'like', $search)
                  ->orWhere('im.ItemCode', 'like', $search);
            });
        }

        $perPage = $request->input('per_page', 10);

        \Log::debug('PrinterStock query', ['sql' => $query->toSql(), 'bindings' => $query->getBindings()]);

        $stockData = $query->paginate($perPage)->withQueryString();

        \Log::debug('PrinterStock result count', ['total' => $stockData->total(), 'count' => $stockData->count()]);

        return Inertia::render('Reports/PrinterStock', [
            'stockData' => $stockData,
            'sections' => $sections,
            'filters' => array_merge($request->all(['section', 'search']), ['per_page' => $perPage]),
            'companyInfo' => $companyInfo,
        ]);
        } catch (\Exception $e) {
            \Log::error('PrinterStockReportController index error: ' . $e->getMessage());
            return response()->json(['error' => 'Internal Server Error'], 500);
        }
    }

    public function generateReport(Request $request)
    {
        $authUser = Auth::user();
        if (!$authUser || !$authUser->hasPermission('printing.stock.view')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view printer stock.');
        }

        $user = Auth::user();
        $company = $user->company ?? Company::first();
        $section = $user->section ?? Section::first();

        $companyCode = $company ? ($company->company_code ?? 'C01') : 'C01';
        $sectionCode = $section ? ($section->section_code ?? 'BR01') : 'BR01';

        if ($request->has('section') && !empty($request->section)) {
            $requestedSection = Section::find($request->section);
            if ($requestedSection) {
                $sectionCode = $requestedSection->section_code;
                $companyCode = $requestedSection->company_code;
                $section = $requestedSection;
            }
        }
        
        $query = DB::table('stock_in_hand as sh')
            ->leftJoin('itemmaster as im', 'im.ItmKy', '=', 'sh.ItemKy')
            ->leftJoin('brands as b', 'im.brand_id', '=', 'b.id')
            ->leftJoin('models as m', 'im.models_id', '=', 'm.id')
            ->leftJoin('sections as s', 'sh.section_code', '=', 's.section_code')
            ->select(
                'b.name as brand',
                'm.name as model',
                'sh.serial_number',
                'sh.batch_no',
                DB::raw('COALESCE(sh.warranty, im.warranty) as warranty'),
                'sh.section_code',
                's.name as section_name',
                'im.ItemCode',
                DB::raw('COALESCE(im.ItmNm, \'\') as item_name'),
                DB::raw('COALESCE(sh.Qty, 0) + COALESCE(sh.FreeQty, 0) as balance')
            )
            ->where('sh.section_code', $sectionCode)
            ->where('im.item_type', 'printer')
            ->whereRaw("(COALESCE(sh.Qty, 0) + COALESCE(sh.FreeQty, 0)) > 0")
            ->orderBy('b.name')
            ->orderBy('m.name');

        if ($request->section && $request->section !== 'all') {
            $requestedSection = Section::find($request->section);
            if ($requestedSection) {
                $query->where('sh.section_code', $requestedSection->section_code);
            }
        }

        if ($request->search) {
            $search = '%' . $request->search . '%';
            $query->where(function($q) use ($search) {
                $q->where('sh.serial_number', 'like', $search)
                  ->orWhere('m.name', 'like', $search)
                  ->orWhere('b.name', 'like', $search)
                  ->orWhere('sh.batch_no', 'like', $search);
            });
        }

        $stockData = $query->get();

        $data = [
            'title' => 'Printer Stock In Hand Report',
            'date' => date('Y-m-d H:i:s'),
            'stockData' => $stockData,
            'company' => $company,
        ];

        $pdf = Pdf::loadView('reports.printer_stock', $data);
        $pdf->setPaper('A4', 'portrait');

        return $pdf->download('printer-stock-report.pdf');
    }
}

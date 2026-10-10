<?php

namespace App\Http\Controllers;

use App\Models\StockTaking;
use App\Models\StockTakingItem;
use App\Models\Section;
use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Barryvdh\DomPDF\Facade\Pdf;

class StockTakingController extends Controller
{
    private function authUser()
    {
        return Auth::user() ?? Auth::guard('company')->user();
    }

    public function index(Request $request)
    {
        $user = $this->authUser();
        if (!$user || !$user->hasPermission('stock_adjustments.view')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $companyCode = $user->company_code;

        $query = StockTaking::with(['section', 'recorder', 'items.product'])
            ->where('company_code', $companyCode);

        // Filters
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where('taking_number', 'like', "%{$search}%");
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $takings = $query->orderBy('taking_date', 'desc')
            ->orderBy('id', 'desc')
            ->paginate($request->get('per_page', 15));

        // Stats
        $baseQuery = StockTaking::where('company_code', $companyCode);
        $stats = [
            'total' => (clone $baseQuery)->count(),
            'draft' => (clone $baseQuery)->where('status', 'draft')->count(),
            'completed' => (clone $baseQuery)->where('status', 'completed')->count(),
            'cancelled' => (clone $baseQuery)->where('status', 'cancelled')->count(),
        ];

        return Inertia::render('stock-taking/Index', [
            'takings' => $takings,
            'stats' => $stats,
            'filters' => $request->only(['search', 'status', 'per_page']),
        ]);
    }

    public function create()
    {
        $user = $this->authUser();
        if (!$user || !$user->hasPermission('stock_adjustments.create')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $companyCode = $user->company_code;
        $section = $user->section ?? Section::first();
        $sectionCode = $section ? ($section->section_code ?? 'BR01') : 'BR01';

        $sections = Section::where('company_code', $companyCode)
            ->where('is_active', true)
            ->get();

        $suggestedBatch = \App\Services\NumberGeneratorService::preview('STK', $companyCode, $sectionCode);

        return Inertia::render('stock-taking/Create', [
            'sections' => $sections,
            'suggested_batch' => $suggestedBatch,
        ]);
    }

    public function store(Request $request)
    {
        $user = $this->authUser();
        if (!$user || !$user->hasPermission('stock_adjustments.create')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $validated = $request->validate([
            'section_id' => 'required|exists:sections,id',
            'taking_date' => 'required|date',
            'notes' => 'nullable|string|max:1000',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:itemmaster,ItmKy',
            'items.*.batch_no' => 'nullable|string|max:255',
            'items.*.system_stock' => 'required|numeric',
            'items.*.actual_stock' => 'required|numeric|min:0',
            'items.*.cost_price' => 'nullable|numeric|min:0',
            'items.*.notes' => 'nullable|string|max:255',
        ]);

        $companyCode = $user->company_code;
        $section = Section::find($validated['section_id']);
        $sectionCode = $section ? $section->section_code : 'MAIN';

        DB::beginTransaction();
        try {
            $takingNumber = \App\Services\NumberGeneratorService::generate('STK', $companyCode, $sectionCode);

            $taking = StockTaking::create([
                'company_code' => $companyCode,
                'taking_number' => $takingNumber,
                'section_id' => $validated['section_id'],
                'taking_date' => $validated['taking_date'],
                'notes' => $validated['notes'],
                'status' => 'completed',
                'recorded_by' => Auth::id(),
            ]);

            foreach ($validated['items'] as $itemData) {
                $variance = (float) $itemData['actual_stock'] - (float) $itemData['system_stock'];

                StockTakingItem::create([
                    'taking_id' => $taking->id,
                    'product_id' => $itemData['product_id'],
                    'batch_no' => $itemData['batch_no'] ?? null,
                    'system_stock' => $itemData['system_stock'],
                    'actual_stock' => $itemData['actual_stock'],
                    'variance' => $variance,
                    'cost_price' => $itemData['cost_price'] ?? 0,
                    'notes' => $itemData['notes'] ?? null,
                ]);
            }

            DB::commit();
            return redirect()->route('stock-takings.index')->with('success', 'Stock taking saved successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Error saving stock taking: " . $e->getMessage());
            return back()->with('error', 'Failed to save stock taking. ' . $e->getMessage())->withInput();
        }
    }

    public function show(StockTaking $stockTaking)
    {
        $user = $this->authUser();
        if (!$user || !$user->hasPermission('stock_adjustments.view')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $stockTaking->load(['section', 'recorder', 'items.product']);

        return Inertia::render('stock-taking/Show', [
            'taking' => $stockTaking,
        ]);
    }

    public function print(StockTaking $stockTaking)
    {
        $user = $this->authUser();
        if (!$user || !$user->hasPermission('stock_adjustments.view')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $stockTaking->load(['section', 'recorder', 'items.product']);

        $pdf = Pdf::loadView('stock-taking', [
            'taking' => $stockTaking,
        ]);

        return $pdf->stream('Stock-Taking-' . $stockTaking->taking_number . '.pdf');
    }

    public function getStock(Request $request)
    {
        $user = $this->authUser();
        if (!$user || !$user->hasPermission('stock_adjustments.create')) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $companyCode = $user->company_code;
        $sectionId = $request->query('section_id');
        $asAtDate = $request->query('taking_date', date('Y-m-d'));

        $section = Section::find($sectionId);
        if (!$section) {
            return response()->json(['error' => 'Section not found'], 404);
        }

        $sectionCode = $section->section_code;

        $businessUnit = 'vismass';
        if (str_starts_with(strtoupper($companyCode), 'MAL')) {
            $businessUnit = 'malibo';
        }

        // Get items that have stock
        $itemsWithStock = DB::table('stock_in_hand')
            ->where('company_code', $companyCode)
            ->where('section_code', $sectionCode)
            ->when(str_starts_with($companyCode, 'VIS'), function($q) {
                return $q->where(function($subQ) {
                    $subQ->whereNull('batch_no')
                         ->orWhere('batch_no', '')
                         ->orWhere('batch_no', 'not like', 'GRN-VIS-VIS-%')
                         ->orWhere('batch_no', '>=', 'GRN-VIS-VIS-0026');
                });
            })
            ->where('OrdDate', '<=', $asAtDate)
            ->select('ItemKy')
            ->groupBy('ItemKy')
            ->pluck('ItemKy')
            ->toArray();

        if (empty($itemsWithStock)) {
            return response()->json(['items' => []]);
        }

        // Get item details
        $items = DB::table('itemmaster as im')
            ->leftJoin('code_masters as cm', function($join) use ($companyCode) {
                $join->on('im.catkey', '=', 'cm.catkey')
                     ->where('cm.conkey', '=', 'CAT')
                     ->where('cm.company_code', '=', $companyCode);
            })
            ->where(function($q) use ($companyCode, $businessUnit) {
                $q->where('im.company_code', $companyCode)
                  ->orWhereJsonContains('im.available_business_units', $businessUnit);
            })
            ->whereIn('im.ItmKy', $itemsWithStock)
            ->select('im.ItmKy', 'im.ItemCode', 'im.ItmNm', 'im.CosPri', 'cm.cname as category_name')
            ->orderBy('im.ItmNm')
            ->get();

        // Get stock records with unit info for proper conversion
        $itemKeys = $items->pluck('ItmKy')->toArray();

        $stockRecords = DB::table('stock_in_hand')
            ->where('stock_in_hand.company_code', $companyCode)
            ->where('stock_in_hand.section_code', $sectionCode)
            ->whereIn('stock_in_hand.ItemKy', $itemKeys)
            ->when(str_starts_with($companyCode, 'VIS'), function($q) {
                return $q->where(function($subQ) {
                    $subQ->whereNull('stock_in_hand.batch_no')
                         ->orWhere('stock_in_hand.batch_no', '')
                         ->orWhere('stock_in_hand.batch_no', 'not like', 'GRN-VIS-VIS-%')
                         ->orWhere('stock_in_hand.batch_no', '>=', 'GRN-VIS-VIS-0026');
                });
            })
            ->where('stock_in_hand.OrdDate', '<=', $asAtDate)
            ->leftJoin('itemmaster as im', 'stock_in_hand.ItemKy', '=', 'im.ItmKy')
            ->select(
                'stock_in_hand.ItemKy',
                'stock_in_hand.UnitKy',
                'stock_in_hand.RefNo',
                'stock_in_hand.TrnTyp',
                'im.transfer_unit_id',
                'im.receiving_unit_id',
                'im.transfer_conversion_factor',
                DB::raw('SUM(stock_in_hand.Qty + stock_in_hand.FreeQty) as total_stock')
            )
            ->groupBy(
                'stock_in_hand.ItemKy',
                'stock_in_hand.UnitKy',
                'stock_in_hand.RefNo',
                'stock_in_hand.TrnTyp',
                'im.transfer_unit_id',
                'im.receiving_unit_id',
                'im.transfer_conversion_factor'
            )
            ->get();

        // Calculate stock per item and batch with unit conversion
        $stockMap = [];
        foreach ($stockRecords as $record) {
            $itemKy = $record->ItemKy;
            $batchNo = '';
            $key = $itemKy . '_' . $batchNo;

            if (!isset($stockMap[$key])) {
                $stockMap[$key] = [
                    'primary' => 0.0,
                    'secondary' => 0.0,
                    'batch_no' => $batchNo,
                    'item' => $itemKy
                ];
            }

            $stockQty = (float) $record->total_stock;
            $transferUnitId = $record->transfer_unit_id;
            $receivingUnitId = $record->receiving_unit_id;
            $unitKy = $record->UnitKy;
            $refNo = $record->RefNo ?? '';
            $trnTyp = $record->TrnTyp ?? '';

            if ($unitKy == $transferUnitId) {
                $stockMap[$key]['primary'] += $stockQty;
            } elseif ($unitKy == $receivingUnitId) {
                $stockMap[$key]['secondary'] += $stockQty;
            } elseif ($unitKy === null || $unitKy == '') {
                if (str_starts_with($refNo, 'CNV-IN') || $trnTyp === 'SAL-NOS') {
                    $stockMap[$key]['secondary'] += $stockQty;
                } elseif (str_starts_with($refNo, 'RCNV-OUT')) {
                    $stockMap[$key]['primary'] += $stockQty;
                } else {
                    $stockMap[$key]['primary'] += $stockQty;
                }
            } else {
                $stockMap[$key]['primary'] += $stockQty;
            }
        }

        // Get conversion factors for each item
        $itemConversionFactors = DB::table('itemmaster')
            ->whereIn('ItmKy', $itemKeys)
            ->select('ItmKy', 'transfer_conversion_factor')
            ->get()
            ->pluck('transfer_conversion_factor', 'ItmKy')
            ->toArray();

        // Get cost prices from purchase_det
        $prices = DB::table('purchase_det')
            ->select('iTimKy', DB::raw('MAX(CostPrice) as batch_cost_price'))
            ->where('company_code', $companyCode)
            ->where('section_code', $sectionCode)
            ->where('Status', 'A')
            ->groupBy('iTimKy')
            ->get()
            ->pluck('batch_cost_price', 'iTimKy')
            ->toArray();

        $result = [];
        foreach ($items as $item) {
            $hasStock = false;
            foreach ($stockMap as $key => $stockData) {
                if ($stockData['item'] == $item->ItmKy) {
                    $hasStock = true;
                    $conversionFactor = (float) ($itemConversionFactors[$item->ItmKy] ?? 1);

                    if ($conversionFactor > 0) {
                        $consolidatedStock = $stockData['primary'] + ($stockData['secondary'] / $conversionFactor);
                    } else {
                        $consolidatedStock = $stockData['primary'] + $stockData['secondary'];
                    }

                    $costPrice = $prices[$item->ItmKy] ?? $item->CosPri ?? 0;

                    // Only include items that actually have positive stock
                    if ($consolidatedStock > 0) {
                        $result[] = [
                            'product_id' => $item->ItmKy,
                            'item_code' => $item->ItemCode,
                            'item_name' => $item->ItmNm,
                            'category_name' => $item->category_name ?? 'Uncategorized',
                            'system_stock' => round($consolidatedStock, 2),
                            'cost_price' => round($costPrice, 4),
                            'batch_no' => $stockData['batch_no'],
                        ];
                    }
                }
            }
            // Remove the block that adds items with 0 stock when !$hasStock
        }

        return response()->json(['items' => $result]);
    }

    public function printPdf(Request $request, StockTaking $stockTaking)
    {
        $user = $this->authUser();
        if (!$user || !$user->hasPermission('stock_adjustments.view')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $stockTaking->load(['section', 'recorder', 'items.product']);

        $company = $user->company ?? \App\Models\Company::first();
        
        $reportType = $request->query('type', 'full'); // 'full' or 'variance'

        $html = view('stock-taking', [
            'taking' => $stockTaking,
            'company' => $company,
            'reportType' => $reportType,
        ])->render();

        $pdf = Pdf::loadHtml($html)->setPaper('a4', 'portrait');
        
        $filename = 'stock-taking-' . $stockTaking->taking_number;
        if ($reportType === 'variance') {
            $filename .= '-variance';
        }
        
        return $pdf->stream($filename . '.pdf');
    }

    public function download(Request $request, StockTaking $stockTaking)
    {
        $user = $this->authUser();
        if (!$user || !$user->hasPermission('stock_adjustments.view')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $stockTaking->load(['section', 'recorder', 'items.product']);

        $company = $user->company ?? \App\Models\Company::first();
        
        $reportType = $request->query('type', 'full'); // 'full' or 'variance'

        $html = view('stock-taking', [
            'taking' => $stockTaking,
            'company' => $company,
            'reportType' => $reportType,
        ])->render();

        $pdf = Pdf::loadHtml($html)->setPaper('a4', 'portrait');
        
        $filename = 'stock-taking-' . $stockTaking->taking_number;
        if ($reportType === 'variance') {
            $filename .= '-variance';
        }
        
        return $pdf->download($filename . '.pdf');
    }

    public function downloadCsv(Request $request, StockTaking $stockTaking)
    {
        $user = $this->authUser();
        if (!$user || !$user->hasPermission('stock_adjustments.view')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $stockTaking->load(['section', 'recorder', 'items.product']);
        $reportType = $request->query('type', 'full'); // 'full' or 'variance'

        $filename = 'stock-taking-' . $stockTaking->taking_number;
        if ($reportType === 'variance') {
            $filename .= '-variance';
        }
        $filename .= '.csv';

        $headers = [
            "Content-type"        => "text/csv",
            "Content-Disposition" => "attachment; filename=$filename",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0"
        ];

        $items = $stockTaking->items->filter(function($item) use ($reportType) {
            if ($reportType === 'variance') {
                return abs($item->actual_stock - $item->system_stock) > 0.001;
            }
            return $item->system_stock > 0 || $item->actual_stock > 0;
        });

        $callback = function() use ($items) {
            $file = fopen('php://output', 'w');
            
            fputcsv($file, ['#', 'Item Code', 'Item Name', 'System Stock', 'Actual Stock', 'Variance']);
            
            $counter = 1;
            $totalSystem = 0;
            $totalActual = 0;
            $totalVariance = 0;

            foreach ($items as $item) {
                $variance = $item->actual_stock - $item->system_stock;
                $totalSystem += $item->system_stock;
                $totalActual += $item->actual_stock;
                $totalVariance += $variance;

                fputcsv($file, [
                    $counter++,
                    $item->product->ItemCode ?? 'N/A',
                    $item->product->ItmNm ?? 'N/A',
                    number_format($item->system_stock, 2, '.', ''),
                    number_format($item->actual_stock, 2, '.', ''),
                    number_format($variance, 2, '.', '')
                ]);
            }

            fputcsv($file, [
                '', '', 'Total:',
                number_format($totalSystem, 2, '.', ''),
                number_format($totalActual, 2, '.', ''),
                number_format($totalVariance, 2, '.', '')
            ]);

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}

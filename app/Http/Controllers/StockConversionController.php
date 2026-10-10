<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Section;
use App\Models\StockConversion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class StockConversionController extends Controller
{
    // ---------------------------------------------------------------
    // Index — list conversions for the current company
    // ---------------------------------------------------------------
    public function index(Request $request)
    {
        if (! $request->user()->hasPermission('stock.conversions.view')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view stock conversions.');
        }

        $companyCode = Auth::user()->company_code ?? session('company_code');

        $query = StockConversion::where('company_code', $companyCode)
            ->with(['section', 'item']);

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('conversion_number', 'LIKE', "%{$search}%")
                  ->orWhere('item_name', 'LIKE', "%{$search}%")
                  ->orWhere('item_code', 'LIKE', "%{$search}%");
            });
        }

        $conversions = $query->orderByDesc('id')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('StockConversion/Index', [
            'conversions' => $conversions,
            'filters'     => $request->only(['search']),
        ]);
    }

    // ---------------------------------------------------------------
    // Create — render the conversion form
    // ---------------------------------------------------------------
    public function create(Request $request)
    {
        if (! request()->user()->hasPermission('stock.conversions.create')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to create stock conversions.');
        }

        $companyCode = Auth::user()->company_code ?? session('company_code');

        $userBusinessUnit = null;
        if (str_starts_with($companyCode, 'MAL')) {
            $userBusinessUnit = 'malibo';
        } elseif (str_starts_with($companyCode, 'VIS')) {
            $userBusinessUnit = 'vismass';
        }

        // All active items for source and destination
        $items = Product::where(function ($query) use ($companyCode, $userBusinessUnit) {
                $query->where('itemmaster.company_code', $companyCode);
                if ($userBusinessUnit) {
                    $query->orWhereJsonContains('available_business_units', $userBusinessUnit);
                }
            })
            ->where('itemmaster.fInAct', false)
            ->select(
                'itemmaster.ItmKy',
                'itemmaster.ItemCode',
                'itemmaster.ItmNm',
                'itemmaster.transfer_unit_id',
                'itemmaster.receiving_unit_id',
                'itemmaster.transfer_conversion_factor',
                DB::raw('(SELECT cname FROM code_masters WHERE code_masters.id = itemmaster.transfer_unit_id LIMIT 1) as from_unit_name'),
                DB::raw('(SELECT cname FROM code_masters WHERE code_masters.id = itemmaster.receiving_unit_id LIMIT 1) as to_unit_name'),
            )
            ->get();

        // Sections belonging to this company
        $sections = Section::where('company_code', $companyCode)
            ->orderByRaw('is_main_stock DESC, name ASC')
            ->get(['section_code', 'name', 'company_code']);

        return Inertia::render('StockConversion/Create', [
            'items'    => $items,
            'sections' => $sections,
            'initial'  => $request->only(['section_code', 'item_id', 'to_item_id', 'input_quantity', 'reverse']),
        ]);
    }

    // ---------------------------------------------------------------
    // Store — validate, create record, execute conversion
    // ---------------------------------------------------------------
    public function store(Request $request)
    {
        if (! $request->user()->hasPermission('stock.conversions.create')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to create stock conversions.');
        }

        $companyCode = Auth::user()->company_code ?? session('company_code');

        $validated = $request->validate([
            'section_code'    => 'required|exists:sections,section_code',
            'item_id'         => 'required|exists:itemmaster,ItmKy',
            'to_item_id'      => 'required|exists:itemmaster,ItmKy',
            'stock_id'        => 'nullable|exists:stock_in_hand,TableKy',
            'input_quantity'  => 'required|numeric|min:0.0001',
            'output_quantity' => 'required|numeric|min:0.0001',
            'to_batch_no'     => 'nullable|string|max:100',
            'conversion_date' => 'required|date',
            'notes'           => 'nullable|string|max:1000',
            'reverse'         => 'nullable|boolean',
        ]);

        // Load item with conversion data
        $item = Product::where('ItmKy', $validated['item_id'])->first();
        if (! $item) {
            return redirect()->back()->withErrors(['item_id' => 'Item not found.']);
        }

        $toItem = Product::where('ItmKy', $validated['to_item_id'])->first();
        if (!$toItem) {
            return redirect()->back()->withErrors(['to_item_id' => 'Destination item not found.']);
        }

        // Stock availability check
        $batchNo     = null;
        $sourceStock = null;

        if (! empty($validated['stock_id'])) {
            $sourceStock = DB::table('stock_in_hand')
                ->where('TableKy', $validated['stock_id'])
                ->first();

            if (! $sourceStock || $sourceStock->section_code !== $validated['section_code']) {
                return redirect()->back()->withErrors(['stock_id' => 'Selected batch is not in the chosen section.']);
            }

            $batchNo = $sourceStock->batch_no;

            $available = DB::table('stock_in_hand')
                ->where('company_code', $sourceStock->company_code)
                ->where('section_code', $validated['section_code'])
                ->where('ItemKy', $validated['item_id'])
                ->when(is_null($batchNo),
                    fn ($q) => $q->whereNull('batch_no'),
                    fn ($q) => $q->where('batch_no', $batchNo)
                )
                ->lockForUpdate()
                ->sum(DB::raw('Qty + COALESCE(FreeQty, 0)'));
        } else {
            $available = DB::table('stock_in_hand')
                ->where('company_code', $companyCode)
                ->where('section_code', $validated['section_code'])
                ->where('ItemKy', $validated['item_id'])
                ->when(str_starts_with($companyCode, 'VIS'), function($q) {
                    return $q->where(function($subQ) {
                        $subQ->whereNull('batch_no')
                             ->orWhere('batch_no', '')
                             ->orWhere('batch_no', 'not like', 'GRN-VIS-VIS-%')
                             ->orWhere('batch_no', '>=', 'GRN-VIS-VIS-0026');
                    });
                })
                ->lockForUpdate()
                ->sum(DB::raw('Qty + COALESCE(FreeQty, 0)'));
        }

        if ((float) $validated['input_quantity'] > (float) $available) {
            return redirect()->back()->withErrors([
                'input_quantity' => 'Insufficient stock. Available: ' . number_format($available, 4),
            ]);
        }

        try {
            DB::transaction(function () use ($validated, $companyCode, $item, $toItem) {

                $fromUnitId = $item->UnitKy;
                $toUnitId   = $toItem->UnitKy;
                $outputQty  = (float) $validated['output_quantity'];
                $factor = $outputQty > 0 ? $outputQty / (float) $validated['input_quantity'] : 1;

                $conversion = StockConversion::create([
                    'company_code'      => $companyCode,
                    'section_code'      => $validated['section_code'],
                    'item_id'           => $item->ItmKy,
                    'item_code'         => $item->ItemCode,
                    'item_name'         => $item->ItmNm,
                    'to_item_id'        => $toItem->ItmKy,
                    'to_item_code'      => $toItem->ItemCode,
                    'to_item_name'      => $toItem->ItmNm,
                    'stock_id'          => $validated['stock_id'] ?? null,
                    'input_quantity'    => $validated['input_quantity'],
                    'output_quantity'   => $outputQty,
                    'conversion_factor' => $factor,
                    'reverse'           => $validated['reverse'] ?? false,
                    'from_unit_id'      => $fromUnitId,
                    'to_unit_id'        => $toUnitId,
                    'from_unit_name'    => DB::table('code_masters')->where('id', $fromUnitId)->value('cname'),
                    'to_unit_name'      => DB::table('code_masters')->where('id', $toUnitId)->value('cname'),
                    'conversion_date'   => $validated['conversion_date'],
                    'notes'             => $validated['notes'] ?? null,
                    'created_by'        => Auth::id(),
                ]);

                $conversion->executeConversion($validated['to_batch_no'] ?? null);
            });

            return redirect()->route('stock-conversions.index')
                ->with('success', 'Stock conversion completed successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['general' => $e->getMessage()]);
        }
    }

    // ---------------------------------------------------------------
    // Show — view conversion details
    // ---------------------------------------------------------------
    public function show(Request $request, StockConversion $stockConversion)
    {
        if (! $request->user()->hasPermission('stock.conversions.view')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view stock conversions.');
        }

        $stockConversion->load(['section', 'creator']);

        return Inertia::render('StockConversion/Show', [
            'conversion' => $stockConversion,
            'auth' => [
                'user' => $request->user(),
            ],
        ]);
    }

    // ---------------------------------------------------------------
    // Get stock batches for a given item + section (AJAX)
    // ---------------------------------------------------------------
    public function getItemStock(Request $request)
    {
        if (! $request->user()->hasPermission('stock.conversions.view')) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $itemId      = $request->get('item_id');
        $sectionCode = $request->get('section_code');

        if (! $itemId || ! $sectionCode) {
            return response()->json(['stock' => 0, 'batches' => []]);
        }

        // Get all batch groups with total quantity
        $companyCode = $request->user()->company_code ?? session('company_code') ?? 'VIS';
        
        $batches = DB::table('stock_in_hand as s')
            ->where('s.section_code', $sectionCode)
            ->where('s.ItemKy', $itemId)
            ->when(str_starts_with($companyCode, 'VIS'), function($q) {
                return $q->where(function($subQ) {
                    $subQ->whereNull('s.batch_no')
                         ->orWhere('s.batch_no', '')
                         ->orWhere('s.batch_no', 'not like', 'GRN-VIS-VIS-%')
                         ->orWhere('s.batch_no', '>=', 'GRN-VIS-VIS-0026');
                });
            })
            ->select(
                DB::raw('MAX(CASE WHEN s.Qty > 0 THEN s.TableKy ELSE NULL END) as id'),
                's.batch_no',
                DB::raw('MIN(s.OrdDate) as date'),
                DB::raw('SUM(s.Qty) + SUM(COALESCE(s.FreeQty, 0)) as quantity')
            )
            ->groupBy('s.batch_no')
            ->havingRaw('SUM(s.Qty + COALESCE(s.FreeQty, 0)) > 0')
            ->get();

        $totalStock = $batches->sum('quantity');

        return response()->json([
            'stock'   => $totalStock,
            'batches' => $batches,
        ]);
    }

    // ---------------------------------------------------------------
    // Get next batch number for conversions (generates a new unique batch)
    // ---------------------------------------------------------------
    public function getNextBatchNumber(Request $request)
    {
        if (! $request->user()->hasPermission('stock.conversions.create')) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $sectionCode = $request->query('section_code');
        $companyCode = $request->user()->company_code ?? session('company_code');
        
        // Use generate() so it reserves the number and increments the counter
        $batchNo = \App\Services\NumberGeneratorService::generate('CNV', $companyCode, $sectionCode ?: 'MAIN');
        
        return response()->json(['batch_no' => $batchNo]);
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\StockAdjustment;
use App\Models\StockAdjustmentItem;
use App\Models\Product;
use App\Models\Section;
use App\Models\StockInHand;
use App\Models\Sequence;
use App\Models\Vehicle;
use App\Models\VehicleStock;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use App\Models\ItemMaster;
use App\Models\Purchase;
use App\Models\PurchaseDet;
use App\Models\StockTaking;
use App\Notifications\StockAdjustmentPendingNotification;

class StockAdjustmentController extends Controller
{
    /**
     * Get authenticated user from either web or company guard.
     */
    private function authUser()
    {
        return Auth::user() ?? Auth::guard('company')->user();
    }

    /**
     * Display a listing of stock adjustments.
     */
    public function index()
    {
        $user = $this->authUser();
        if (! $user || ! $user->hasPermission('stock_adjustments.view')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view stock adjustments.');
        }

        $companyCode = $user->company_code;

        $adjustments = StockAdjustment::with(['section', 'vehicle', 'recorder', 'items.product'])
            ->where('company_code', $companyCode)
            ->orderBy('adjustment_date', 'desc')
            ->orderBy('id', 'desc')
            ->paginate(15);

        return Inertia::render('stock-adjustment/Index', [
            'adjustments' => $adjustments,
        ]);
    }

    /**
     * Show the form for creating a new stock adjustment.
     */
    public function create(Request $request)
    {
        $user = $this->authUser();
        if (! $user || ! $user->hasPermission('stock_adjustments.create')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to create stock adjustments.');
        }

        $companyCode = $user->company_code;
        $userBusinessUnit = (!empty($companyCode) && str_starts_with(strtoupper($companyCode), 'MAL')) ? 'malibo' : 'vismass';
        
        $products = ItemMaster::where(function($query) use ($companyCode, $userBusinessUnit) {
            $query->where('company_code', $companyCode)
                  ->orWhereJsonContains('available_business_units', $userBusinessUnit);
        })
            ->select('ItmKy as id', 'ItmNm as name', 'ItemCode as code', 'Unit as unit', 'item_type')
            ->get();

        $sections = Section::where('company_code', $companyCode)->get();
        
        $suggestedBatch = '';
        if ($sections->count() > 0) {
            $suggestedBatch = \App\Services\NumberGeneratorService::preview('ADJ', $companyCode, $sections[0]->section_code);
        }

        // Get completed stock takings with variances for this company
        $completedTakings = StockTaking::with(['section'])
            ->where('company_code', $companyCode)
            ->where('status', 'completed')
            ->whereHas('items', function($q) {
                $q->where('actual_stock', '>', 0)
                  ->whereRaw('actual_stock != system_stock');
            })
            ->orderBy('taking_date', 'desc')
            ->get()
            ->map(fn($t) => [
                'id' => $t->id,
                'taking_number' => $t->taking_number,
                'taking_date' => $t->taking_date->format('Y-m-d'),
                'section_name' => $t->section->name ?? 'N/A',
                'section_id' => $t->section_id,
            ]);

        return Inertia::render('stock-adjustment/Create', [
            'products' => $products,
            'sections' => $sections,
            'suggested_batch' => $suggestedBatch,
            'completedTakings' => $completedTakings,
        ]);
    }

    /**
     * Store a newly created stock adjustment in storage.
     */
    public function store(Request $request)
    {
        $user = $this->authUser();
        if (! $user || ! $user->hasPermission('stock_adjustments.create')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to create stock adjustments.');
        }

        $validated = $request->validate([
            'section_id' => 'required|exists:sections,id',
            'batch_no' => 'required|string|max:255',
            'adjustment_date' => 'required|date',
            'notes' => 'nullable|string|max:1000',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:itemmaster,ItmKy',
            'items.*.adjustment_type' => 'required|in:addition,subtraction',
            'items.*.quantity' => 'required|numeric|min:1',
            'items.*.reason' => 'nullable|string|max:255',
            'items.*.batch_no' => 'required|string|max:255',
            'items.*.serial_number' => 'nullable|string|max:255',
            'items.*.cost_price' => 'required|numeric|min:0',
            'items.*.sale_price' => 'required|numeric|min:0',
            'items.*.vehicle_sale_price' => 'required|numeric|min:0',
            'items.*.current_stock' => 'nullable|numeric',
        ]);

        $companyCode = $user->company_code;

        DB::beginTransaction();
        try {
            // Always generate a fresh sequential batch number to ensure the counter increments correctly
            $section = Section::find($validated['section_id']);
            $sectionCode = $section ? $section->section_code : 'MAIN';
            $headerBatchNo = \App\Services\NumberGeneratorService::generate('ADJ', $companyCode, $sectionCode);

            // 1. Create Header (status is 'pending' - awaiting company admin approval)
            $adjustment = StockAdjustment::create([
                'company_code' => $companyCode,
                'adjustment_number' => Sequence::generateNextNumber('stock_adjustment'),
                'batch_no' => $headerBatchNo,
                'section_id' => $validated['section_id'],
                'vehicle_id' => null,
                'adjustment_date' => $validated['adjustment_date'],
                'notes' => $validated['notes'],
                'status' => 'pending',
                'recorded_by' => Auth::id(),
                'approved_by' => null,
                'total_amount' => 0,
            ]);

            $grandTotal = 0;

            // 2. Create Items (stock NOT updated yet - pending approval)
            foreach ($validated['items'] as $itemData) {
                // Use header batch if item batch is not provided or set to 'NEW'
                if (empty($itemData['batch_no']) || $itemData['batch_no'] === 'NEW') {
                    $itemData['batch_no'] = $headerBatchNo;
                }

                // Calculate line total
                $lineTotal = (float)($itemData['quantity'] * ($itemData['cost_price'] ?? 0));
                $itemData['line_total'] = $lineTotal;
                $grandTotal += $lineTotal;

                $item = new StockAdjustmentItem($itemData);
                $adjustment->items()->save($item);
            }

            // Update header total
            $adjustment->update(['total_amount' => $grandTotal]);

            // 3. Send notification to company admins
            $companyAdmins = \App\Models\User::where('company_code', $companyCode)
                ->where(function ($query) {
                    $query->whereHas('role', function($q) {
                        $q->where('level', 'company_admin');
                    })
                    ->orWhere('user_type', 'company_admin');
                })
                ->get();

            foreach ($companyAdmins as $admin) {
                $admin->notify(new StockAdjustmentPendingNotification($adjustment));
            }

            DB::commit();
            return redirect()->route('stock-adjustments.index')->with('success', 'Stock adjustment submitted for approval.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Error processing stock adjustment batch: " . $e->getMessage());
            return back()->with('error', 'Failed to process adjustments. ' . $e->getMessage())->withInput();
        }
    }

    /**
     * Helper to update stock records based on adjustment.
     */
    private function processStockUpdate($header, $item, $prices)
    {
        if ($header->vehicle_id) {
            $this->processVehicleStockUpdate($header, $item, $prices);
            return;
        }

        $section = Section::find($header->section_id);
        $sectionCode = $section ? $section->section_code : 'MAIN';

        // Check if printer needs serialization validation
        $product = ItemMaster::find($item->product_id);
        if ($product && $product->item_type === 'printer' && empty($item->serial_number)) {
            throw new \Exception("Serial number is required for printer: " . $product->ItmNm);
        }

        // Addition logic
        if ($item->adjustment_type === 'addition') {
            StockInHand::insert([
                'uuid' => (string) \Illuminate\Support\Str::uuid(),
                'company_code' => $header->company_code,
                'owner_company_code' => $header->company_code,
                'section_code' => $sectionCode,
                'ItemKy' => $item->product_id,
                'batch_no' => $item->batch_no,
                'serial_number' => $item->serial_number,
                'Qty' => $item->quantity,
                'FreeQty' => 0,
                'TrnTyp' => 'ADJ-IN',
                'OrdKy' => $header->id,
                'OrdDate' => $header->adjustment_date,
                'RefNo' => $header->adjustment_number,
                'CounterID' => Auth::id(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Update item prices if provided
            DB::table('item_price_det')->updateOrInsert(
                [
                    'ItmKy' => $item->product_id,
                    'company_code' => $header->company_code,
                    'batch_no' => $item->batch_no,
                    'serial_number' => $item->serial_number, // Include serial number in matching for printers
                ],
                [
                    'section_code' => $sectionCode,
                    'CosPri' => $prices['cost_price'],
                    'NCostPrice' => $prices['cost_price'],
                    'SlsPri' => $prices['sale_price'],
                    'VehicleSalePrice' => $prices['vehicle_sale_price'],
                    'ChangedDate' => now(),
                    'Status' => 'A',
                    'fInAct' => 0,
                    'uuid' => (string) \Illuminate\Support\Str::uuid(),
                    'updated_at' => now(),
                    'serial_number' => $item->serial_number,
                ]
            );

            // Special handling for printers to ensure they are searchable in POS
            if ($product && $product->item_type === 'printer' && !empty($item->serial_number)) {
                // Find or create a dummy purchase header for adjustments
                $purchaseNo = 900000 + $header->id; // High number to avoid collision
                
                $purchase = Purchase::where('company_code', $header->company_code)
                    ->where('PurchaseNo', $purchaseNo)
                    ->first();

                if (!$purchase) {
                    $purchase = new Purchase();
                    $purchase->PurchaseKey = (Purchase::max('PurchaseKey') ?? 0) + 1;
                    $purchase->company_code = $header->company_code;
                    $purchase->PurchaseNo = $purchaseNo;
                    $purchase->section_code = $sectionCode;
                    $purchase->GRNDate = $header->adjustment_date;
                    $purchase->type = 'adjustment';
                    $purchase->Status = 'A';
                    $purchase->flnact = false;
                    $purchase->AddUser = 'SYSTEM-ADJ';
                    $purchase->CostTotal = $header->total_amount;
                    $purchase->TotalVal = $header->total_amount;
                    $purchase->save();
                }

                $purchaseKey = $purchase->PurchaseKey;

                // Create/Update PurchaseDet for this item/batch/serial
                $detailQuery = PurchaseDet::where('company_code', $header->company_code)
                    ->where('iTimKy', $item->product_id)
                    ->where('batch_no', $item->batch_no);
                
                if (!empty($item->serial_number)) {
                    $detailQuery->where('serial_number', $item->serial_number);
                } else {
                    $detailQuery->whereNull('serial_number');
                }
                
                $detail = $detailQuery->first();

                if (!$detail) {
                    $detail = new PurchaseDet();
                    $detail->PerchaseDetKy = (PurchaseDet::max('PerchaseDetKy') ?? 0) + 1;
                    $detail->company_code = $header->company_code;
                    $detail->PurchaseKey = $purchaseKey;
                    $detail->serial_number = !empty($item->serial_number) ? $item->serial_number : null;
                    $detail->section_code = $sectionCode;
                    $detail->iTimKy = $item->product_id;
                    $detail->Qty = $item->quantity;
                    $detail->CostPrice = $prices['cost_price'];
                    $detail->SalePrice = $prices['sale_price'];
                    $detail->VehicleSalePrice = $prices['vehicle_sale_price'];
                    $detail->batch_no = $item->batch_no;
                    $detail->Status = 'A';
                    $detail->flnAct = false;
                    $detail->save();
                } else {
                    $detail->update([
                        'section_code' => $sectionCode,
                        'CostPrice' => $prices['cost_price'],
                        'SalePrice' => $prices['sale_price'],
                        'VehicleSalePrice' => $prices['vehicle_sale_price'],
                        'batch_no' => $item->batch_no,
                    ]);
                }
            }
        } else {
            // Subtraction logic
            // Check total availability across ALL batches in the section (not just the saved batch_no)
            $available = StockInHand::where('company_code', $header->company_code)
                ->where('section_code', $sectionCode)
                ->where('ItemKy', $item->product_id)
                ->when($item->serial_number, function($q) use ($item) {
                    return $q->where('serial_number', $item->serial_number);
                })
                ->when(str_starts_with($header->company_code, 'VIS'), function($q) {
                    return $q->where(function($subQ) {
                        $subQ->whereNull('batch_no')
                             ->orWhere('batch_no', '')
                             ->orWhere('batch_no', 'not like', 'GRN-VIS-VIS-%')
                             ->orWhereRaw("CAST(SUBSTRING(batch_no, 13) AS UNSIGNED) >= 26");
                    })->where('OrdDate', '>=', '2026-05-02 00:00:00');
                })
                ->sum('Qty');

            if ($available < $item->quantity) {
                throw new \Exception("Insufficient stock for product: " . ($product->ItmNm ?? 'Unknown') . ". Available: $available, Required: {$item->quantity}");
            }

            // Find the best batch to deduct from:
            // 1. Prefer the batch_no saved on the adjustment item (if it has enough stock)
            // 2. Otherwise, find batches with stock ordered by quantity desc (FIFO/most-stock-first)
            $requiredQty = $item->quantity;
            $savedBatchStock = StockInHand::where('company_code', $header->company_code)
                ->where('section_code', $sectionCode)
                ->where('ItemKy', $item->product_id)
                ->where('batch_no', $item->batch_no)
                ->when(str_starts_with($header->company_code, 'VIS'), function($q) {
                    return $q->where(function($subQ) {
                        $subQ->whereNull('batch_no')
                             ->orWhere('batch_no', '')
                             ->orWhere('batch_no', 'not like', 'GRN-VIS-VIS-%')
                             ->orWhereRaw("CAST(SUBSTRING(batch_no, 13) AS UNSIGNED) >= 26");
                    })->where('OrdDate', '>=', '2026-05-02 00:00:00');
                })
                ->sum('Qty');

            if ($savedBatchStock >= $requiredQty) {
                // The originally saved batch has enough — deduct from it as normal
                $batchesToDeduct = [['batch_no' => $item->batch_no, 'deduct' => $requiredQty]];
            } else {
                // Get all batches with available stock for this product/section, ordered by qty desc
                $batchesWithStock = StockInHand::where('company_code', $header->company_code)
                    ->where('section_code', $sectionCode)
                    ->where('ItemKy', $item->product_id)
                    ->when(str_starts_with($header->company_code, 'VIS'), function($q) {
                        return $q->where(function($subQ) {
                            $subQ->whereNull('batch_no')
                                 ->orWhere('batch_no', '')
                                 ->orWhere('batch_no', 'not like', 'GRN-VIS-VIS-%')
                                 ->orWhereRaw("CAST(SUBSTRING(batch_no, 13) AS UNSIGNED) >= 26");
                        })->where('OrdDate', '>=', '2026-05-02 00:00:00');
                    })
                    ->selectRaw('batch_no, SUM(Qty) as total_qty')
                    ->groupBy('batch_no')
                    ->having('total_qty', '>', 0)
                    ->orderBy('total_qty', 'desc')
                    ->get();

                $batchesToDeduct = [];
                $remaining = $requiredQty;
                foreach ($batchesWithStock as $batch) {
                    if ($remaining <= 0) break;
                    $deductFromBatch = min($remaining, $batch->total_qty);
                    $batchesToDeduct[] = ['batch_no' => $batch->batch_no, 'deduct' => $deductFromBatch];
                    $remaining -= $deductFromBatch;
                }
            }

            // Insert ADJ-OUT record(s) for each batch being deducted
            foreach ($batchesToDeduct as $deduction) {
                StockInHand::insert([
                    'uuid' => (string) \Illuminate\Support\Str::uuid(),
                    'company_code' => $header->company_code,
                    'owner_company_code' => $header->company_code,
                    'section_code' => $sectionCode,
                    'ItemKy' => $item->product_id,
                    'batch_no' => $deduction['batch_no'],
                    'serial_number' => $item->serial_number,
                    'Qty' => -$deduction['deduct'],
                    'FreeQty' => 0,
                    'TrnTyp' => 'ADJ-OUT',
                    'OrdKy' => $header->id,
                    'OrdDate' => $header->adjustment_date,
                    'RefNo' => $header->adjustment_number,
                    'CounterID' => Auth::id(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    private function processVehicleStockUpdate($header, $item, $prices)
    {
        $product = ItemMaster::find($item->product_id);
        
        // Addition logic
        if ($item->adjustment_type === 'addition') {
            StockInHand::insert([
                'uuid' => (string) \Illuminate\Support\Str::uuid(),
                'company_code' => $header->company_code,
                'owner_company_code' => $header->company_code,
                'section_code' => null,
                'vehicle_id' => $header->vehicle_id,
                'ItemKy' => $item->product_id,
                'batch_no' => $item->batch_no,
                'serial_number' => $item->serial_number,
                'Qty' => $item->quantity,
                'FreeQty' => 0,
                'TrnTyp' => 'V-ADJ-IN',
                'OrdKy' => $header->id,
                'OrdDate' => $header->adjustment_date,
                'RefNo' => $header->adjustment_number,
                'CounterID' => Auth::id(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $vs = VehicleStock::where('vehicle_id', $header->vehicle_id)
                ->where('item_ky', $item->product_id)
                ->where('batch_no', $item->batch_no)
                ->lockForUpdate()
                ->first();

            if ($vs) {
                $vs->quantity = $vs->quantity + $item->quantity;
                $vs->loaded_quantity = $vs->loaded_quantity + $item->quantity;
                $vs->last_date = now()->toDateString();
                $vs->save();
            } else {
                VehicleStock::create([
                    'vehicle_id' => $header->vehicle_id,
                    'item_ky' => $item->product_id,
                    'batch_no' => $item->batch_no,
                    'serial_number' => $item->serial_number,
                    'quantity' => $item->quantity,
                    'loaded_quantity' => $item->quantity,
                    'delivered_quantity' => 0,
                    'reserved_quantity' => 0,
                    'company_code' => $header->company_code,
                    'last_date' => now()->toDateString(),
                ]);
            }
        } else {
            // Subtraction logic - check total available stock across ALL batches on this vehicle
            $totalAvailable = VehicleStock::where('vehicle_id', $header->vehicle_id)
                ->where('item_ky', $item->product_id)
                ->sum(\DB::raw('quantity - reserved_quantity'));

            if ($totalAvailable < $item->quantity) {
                throw new \Exception("Insufficient vehicle stock for product: " . ($product->ItmNm ?? 'Unknown') . ". Available: $totalAvailable, Required: {$item->quantity}");
            }

            // Find best batch to deduct from: prefer saved batch_no if it has enough stock
            $requiredQty = $item->quantity;
            $savedVs = VehicleStock::where('vehicle_id', $header->vehicle_id)
                ->where('item_ky', $item->product_id)
                ->where('batch_no', $item->batch_no)
                ->lockForUpdate()
                ->first();

            $savedBatchAvailable = $savedVs ? ((float) $savedVs->quantity - (float) $savedVs->reserved_quantity) : 0;

            if ($savedBatchAvailable >= $requiredQty) {
                // Deduct from the originally saved batch
                $savedVs->quantity = $savedVs->quantity - $requiredQty;
                $savedVs->loaded_quantity = max(0, $savedVs->loaded_quantity - $requiredQty);
                $savedVs->save();

                StockInHand::insert([
                    'uuid' => (string) \Illuminate\Support\Str::uuid(),
                    'company_code' => $header->company_code,
                    'owner_company_code' => $header->company_code,
                    'section_code' => null,
                    'vehicle_id' => $header->vehicle_id,
                    'ItemKy' => $item->product_id,
                    'batch_no' => $item->batch_no,
                    'serial_number' => $item->serial_number,
                    'Qty' => -$requiredQty,
                    'FreeQty' => 0,
                    'TrnTyp' => 'V-ADJ-OUT',
                    'OrdKy' => $header->id,
                    'OrdDate' => $header->adjustment_date,
                    'RefNo' => $header->adjustment_number,
                    'CounterID' => Auth::id(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } else {
                // Deduct from batches that have stock (most stock first)
                $batchesWithStock = VehicleStock::where('vehicle_id', $header->vehicle_id)
                    ->where('item_ky', $item->product_id)
                    ->where(\DB::raw('quantity - reserved_quantity'), '>', 0)
                    ->lockForUpdate()
                    ->orderBy('quantity', 'desc')
                    ->get();

                $remaining = $requiredQty;
                foreach ($batchesWithStock as $batchVs) {
                    if ($remaining <= 0) break;
                    $batchAvail = (float) $batchVs->quantity - (float) $batchVs->reserved_quantity;
                    $deductFromBatch = min($remaining, $batchAvail);
                    $batchVs->quantity = $batchVs->quantity - $deductFromBatch;
                    $batchVs->loaded_quantity = max(0, $batchVs->loaded_quantity - $deductFromBatch);
                    $batchVs->save();

                    StockInHand::insert([
                        'uuid' => (string) \Illuminate\Support\Str::uuid(),
                        'company_code' => $header->company_code,
                        'owner_company_code' => $header->company_code,
                        'section_code' => null,
                        'vehicle_id' => $header->vehicle_id,
                        'ItemKy' => $item->product_id,
                        'batch_no' => $batchVs->batch_no,
                        'serial_number' => $item->serial_number,
                        'Qty' => -$deductFromBatch,
                        'FreeQty' => 0,
                        'TrnTyp' => 'V-ADJ-OUT',
                        'OrdKy' => $header->id,
                        'OrdDate' => $header->adjustment_date,
                        'RefNo' => $header->adjustment_number,
                        'CounterID' => Auth::id(),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    $remaining -= $deductFromBatch;
                }
            }
        }
    }

    /**
     * Show the specified adjustment batch.
     */
    public function show($id)
    {
        $user = $this->authUser();
        if (! $user || ! $user->hasPermission('stock_adjustments.view')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $adjustment = StockAdjustment::with(['section', 'vehicle', 'recorder', 'approver', 'items.product'])
            ->findOrFail($id);

        // Fetch current available stock for each item to show in approval modal/page
        foreach ($adjustment->items as $item) {
            if ($adjustment->vehicle_id) {
                $availableStock = DB::table('vehicle_stocks')
                    ->where('company_code', $adjustment->company_code)
                    ->where('vehicle_id', $adjustment->vehicle_id)
                    ->where('item_ky', $item->product_id)
                    ->where('batch_no', $item->batch_no)
                    ->sum(DB::raw('quantity - reserved_quantity'));
            } else {
                $availableStock = DB::table('stock_in_hand')
                    ->where('company_code', $adjustment->company_code)
                    ->where('section_code', $adjustment->section->section_code ?? '')
                    ->where('ItemKy', $item->product_id)
                    ->where('batch_no', $item->batch_no)
                    ->sum(DB::raw('Qty + FreeQty'));
            }
            $item->current_available_stock = $availableStock;
        }

        // If approved, fetch actual stock movements (ADJ-OUT / V-ADJ-OUT) linked to this adjustment
        // so the Show page can display the real batches that were actually deducted from.
        $actualMovements = [];
        if ($adjustment->status === 'approved') {
            $sihRecords = DB::table('stock_in_hand')
                ->where('OrdKy', $adjustment->id)
                ->where('RefNo', $adjustment->adjustment_number)
                ->whereIn('TrnTyp', ['ADJ-OUT', 'V-ADJ-OUT', 'ADJ-IN', 'V-ADJ-IN'])
                ->select('ItemKy', 'batch_no', 'Qty', 'TrnTyp')
                ->get();

            // Group by ItemKy so each product can list all batches used
            foreach ($sihRecords as $record) {
                $key = $record->ItemKy;
                if (!isset($actualMovements[$key])) {
                    $actualMovements[$key] = [];
                }
                $actualMovements[$key][] = [
                    'batch_no' => $record->batch_no,
                    'qty' => abs($record->Qty),
                    'type' => $record->TrnTyp,
                ];
            }
        }

        return Inertia::render('stock-adjustment/Show', [
            'adjustment' => $adjustment,
            'actualMovements' => $actualMovements,
        ]);
    }

    /**
     * API to fetch product details for adjustment.
     */
    public function getProductDetails(Request $request)
    {
        $productId = $request->query('product_id');
        $sectionId = $request->query('section_id');
        $vehicleId = $request->query('vehicle_id');
        $user = $this->authUser();
        $companyCode = $user->company_code;

        $product = ItemMaster::where('ItmKy', $productId)->firstOrFail();

        if ($vehicleId) {
            $vehicle = Vehicle::findOrFail($vehicleId);
            $batches = DB::table(function ($query) use ($productId, $companyCode, $vehicleId) {
                $query->from('vehicle_stocks')
                    ->select('batch_no', 'item_ky', DB::raw('SUM(quantity - reserved_quantity) as total_quantity'))
                    ->where('item_ky', $productId)
                    ->where('company_code', $companyCode)
                    ->where('vehicle_id', $vehicleId)
                    ->groupBy('batch_no', 'item_ky')
                    ->having('total_quantity', '>', 0);
            }, 'vs')
                ->leftJoin('item_price_det as ipd', function($join) use ($companyCode) {
                    $join->on('vs.item_ky', '=', 'ipd.ItmKy')
                         ->on('vs.batch_no', '=', 'ipd.batch_no')
                         ->where('ipd.company_code', '=', $companyCode);
                })
                ->select(
                    'vs.batch_no', 
                    'vs.total_quantity',
                    DB::raw('MAX(ipd.CosPri) as cost_price'),
                    DB::raw('MAX(ipd.SlsPri) as sale_price'),
                    DB::raw('MAX(ipd.VehicleSalePrice) as vehicle_sale_price')
                )
                ->groupBy('vs.batch_no', 'vs.total_quantity')
                ->get()
                ->map(function($batch) use ($vehicle) {
                    $batch->section_code = 'VEH';
                    $batch->section_name = $vehicle->name;
                    return $batch;
                });

            $suggestedBatch = \App\Services\NumberGeneratorService::preview('ADJ', $companyCode, 'VEH');
        } else {
            $section = Section::findOrFail($sectionId);

            // Get batches available in this section with their current stock and prices
            $batches = DB::table(function ($query) use ($productId, $companyCode, $section) {
                $query->from('stock_in_hand')
                    ->select('batch_no', 'ItemKy', DB::raw('SUM(Qty) as total_quantity'))
                    ->where('ItemKy', $productId)
                    ->where('company_code', $companyCode)
                    ->where('section_code', $section->section_code)
                    ->groupBy('batch_no', 'ItemKy')
                    ->having('total_quantity', '>', 0);
            }, 'sih')
                ->leftJoin('item_price_det as ipd', function($join) use ($companyCode) {
                    $join->on('sih.ItemKy', '=', 'ipd.ItmKy')
                         ->on('sih.batch_no', '=', 'ipd.batch_no')
                         ->where('ipd.company_code', '=', $companyCode);
                })
                ->select(
                    'sih.batch_no', 
                    'sih.total_quantity',
                    DB::raw('MAX(ipd.CosPri) as cost_price'),
                    DB::raw('MAX(ipd.SlsPri) as sale_price'),
                    DB::raw('MAX(ipd.VehicleSalePrice) as vehicle_sale_price')
                )
                ->groupBy('sih.batch_no', 'sih.total_quantity')
                ->get()
                ->map(function($batch) use ($section) {
                    $batch->section_code = $section->section_code;
                    $batch->section_name = $section->name;
                    return $batch;
                });
            
            $suggestedBatch = \App\Services\NumberGeneratorService::preview('ADJ', $companyCode, $section->section_code);
        }

        // Get latest prices
        $prices = DB::table('item_price_det')
            ->where('ItmKy', $productId)
            ->where('company_code', $companyCode)
            ->orderBy('ChangedDate', 'desc')
            ->first();

        // Fallback to product owner's company if prices not found locally (for shared products)
        if (!$prices && !empty($product->company_code) && $product->company_code !== $companyCode) {
            $prices = DB::table('item_price_det')
                ->where('ItmKy', $productId)
                ->where('company_code', $product->company_code)
                ->orderBy('ChangedDate', 'desc')
                ->first();
        }



        return response()->json([
            'product' => [
                'id' => $product->ItmKy,
                'name' => $product->ItmNm,
                'code' => $product->ItemCode,
                'item_type' => $product->item_type,
            ],
            'batches' => $batches,
            'default_prices' => [
                'cost_price' => $prices->CosPri ?? 0,
                'sale_price' => $prices->SlsPri ?? 0,
                'vehicle_sale_price' => $prices->VehicleSalePrice ?? 0,
            ],
            'suggested_batch' => $suggestedBatch,
        ]);
    }

    public function getNextBatchNumber(Request $request)
    {
        $sectionId = $request->query('section_id');
        $vehicleId = $request->query('vehicle_id');
        $user = $this->authUser();
        $companyCode = $user->company_code;

        if ($vehicleId) {
            $batchNo = \App\Services\NumberGeneratorService::preview('ADJ', $companyCode, 'VEH');
        } else if ($sectionId) {
            $section = Section::findOrFail($sectionId);
            $batchNo = \App\Services\NumberGeneratorService::preview('ADJ', $companyCode, $section->section_code);
        } else {
            $batchNo = \App\Services\NumberGeneratorService::preview('ADJ', $companyCode, 'MAIN');
        }

        return response()->json(['batch_no' => $batchNo]);
    }

    /**
     * Get stock taking items for loading into stock adjustment.
     */
    public function getTakingItems(Request $request)
    {
        $user = $this->authUser();
        if (! $user || ! $user->hasPermission('stock_adjustments.create')) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $takingId = $request->query('stock_taking_id');
        if (! $takingId) {
            return response()->json(['error' => 'Stock taking ID is required'], 400);
        }

        $taking = StockTaking::with(['items.product', 'section'])
            ->where('id', $takingId)
            ->where('company_code', $user->company_code)
            ->first();

        if (! $taking) {
            return response()->json(['error' => 'Stock taking not found'], 404);
        }

        $companyCode = $user->company_code;
        $sectionCode = $taking->section->section_code ?? '';

        // Fetch existing batches from stock_in_hand for all products in this taking
        $productIds = $taking->items->pluck('product_id')->unique()->toArray();
        $existingBatches = DB::table('stock_in_hand')
            ->where('company_code', $companyCode)
            ->where('section_code', $sectionCode)
            ->whereIn('ItemKy', $productIds)
            ->where('Qty', '>', 0)
            ->select('ItemKy', DB::raw('MAX(batch_no) as batch_no'), DB::raw('SUM(Qty + FreeQty) as total_stock'))
            ->groupBy('ItemKy')
            ->pluck('batch_no', 'ItemKy')
            ->toArray();

        // Fetch batch-specific prices from item_price_det (for subtraction/existing batches)
        $batchPrices = DB::table('item_price_det')
            ->where('company_code', $companyCode)
            ->whereIn('ItmKy', $productIds)
            ->select(
                'ItmKy',
                'batch_no',
                DB::raw('MAX(CosPri) as cost_price'),
                DB::raw('MAX(SlsPri) as sale_price'),
                DB::raw('MAX(VehicleSalePrice) as vehicle_sale_price')
            )
            ->groupBy('ItmKy', 'batch_no')
            ->get()
            ->mapWithKeys(fn($row) => ["{$row->ItmKy}_{$row->batch_no}" => $row])
            ->toArray();

        // Fetch main product prices from itemmaster (for addition/new batches)
        $productPrices = DB::table('itemmaster')
            ->whereIn('ItmKy', $productIds)
            ->select(
                'ItmKy', 
                'CosPri as cost_price', 
                'SlsPri as sale_price', 
                'VehicleSalePrice as vehicle_sale_price'
            )
            ->get()
            ->keyBy('ItmKy')
            ->toArray();

        $items = $taking->items
            ->filter(fn($item) => $item->actual_stock > 0 && $item->variance != 0)
            ->map(function ($item) use ($existingBatches, $batchPrices, $productPrices, $sectionCode) {
                $variance = (float) $item->variance;
                $productId = $item->product_id;

                // Subtraction: use existing batch from stock_in_hand
                // Addition: leave empty, will get new header batch on submit
                $batchNo = $variance < 0 ? ($existingBatches[$productId] ?? $item->batch_no ?? '') : '';

                // Get prices based on type
                if ($variance < 0 && $batchNo) {
                    // Subtraction: batch-specific prices from item_price_det
                    $batchKey = "{$productId}_{$batchNo}";
                    $itemPrices = $batchPrices[$batchKey] ?? null;
                } else {
                    // Addition: main product prices from itemmaster
                    $itemPrices = $productPrices[$productId] ?? null;
                }
                
                // Fetch real-time current stock
                $currentStockQuery = DB::table('stock_in_hand')
                    ->where('section_code', $sectionCode)
                    ->where('ItemKy', $productId);
                
                if ($batchNo) {
                    $currentStockQuery->where('batch_no', $batchNo);
                }
                
                $currentStock = $currentStockQuery->sum(DB::raw('Qty + FreeQty'));

                return [
                    'product_id' => $productId,
                    'product_name' => $item->product->ItmNm ?? 'Unknown',
                    'product_code' => $item->product->ItemCode ?? '',
                    'item_type' => $item->product->item_type ?? 'product',
                    'adjustment_type' => $variance > 0 ? 'addition' : 'subtraction',
                    'quantity' => abs($variance),
                    'batch_no' => $batchNo,
                    'serial_number' => '',
                    'cost_price' => $itemPrices->cost_price ?? $item->cost_price ?? 0,
                    'sale_price' => $itemPrices->sale_price ?? 0,
                    'vehicle_sale_price' => $itemPrices->vehicle_sale_price ?? 0,
                    'current_stock' => $currentStock,
                    'reason' => 'Stock taking variance correction',
                ];
            })
            ->values()
            ->toArray();

        return response()->json([
            'taking' => [
                'id' => $taking->id,
                'taking_number' => $taking->taking_number,
                'section_id' => $taking->section_id,
                'taking_date' => $taking->taking_date->format('Y-m-d'),
            ],
            'items' => $items,
        ]);
    }

    /**
     * Approve a pending stock adjustment.
     */
    public function approve(Request $request, StockAdjustment $stock_adjustment)
    {
        $user = $this->authUser();
        if (! $user || ! $user->hasPermission('stock_adjustments.approve')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have approval permission.');
        }

        if ($stock_adjustment->status !== 'pending') {
            return redirect()->back()->with('error', 'This adjustment cannot be approved.');
        }

        // Validate updated items if provided
        $validated = $request->validate([
            'items' => 'nullable|array',
            'items.*.id' => 'required|exists:stock_adjustment_items,id',
            'items.*.quantity' => 'required|numeric|min:1',
            'items.*.cost_price' => 'required|numeric|min:0',
            'items.*.sale_price' => 'required|numeric|min:0',
            'items.*.vehicle_sale_price' => 'required|numeric|min:0',
        ]);

        DB::beginTransaction();
        try {
            // Update items if provided
            if (!empty($validated['items'])) {
                Log::info("Updating stock adjustment items before approval", [
                    'adjustment_id' => $stock_adjustment->id,
                    'items_count' => count($validated['items']),
                    'items' => $validated['items'],
                ]);

                foreach ($validated['items'] as $itemData) {
                    $item = \App\Models\StockAdjustmentItem::where('id', $itemData['id'])
                        ->where('adjustment_id', $stock_adjustment->id)
                        ->first();
                    if ($item) {
                        $item->update([
                            'quantity' => $itemData['quantity'],
                            'cost_price' => $itemData['cost_price'],
                            'sale_price' => $itemData['sale_price'],
                            'vehicle_sale_price' => $itemData['vehicle_sale_price'],
                            'line_total' => $itemData['quantity'] * $itemData['cost_price'],
                        ]);
                        Log::info("Updated stock adjustment item", [
                            'item_id' => $item->id,
                            'quantity' => $itemData['quantity'],
                            'cost_price' => $itemData['cost_price'],
                        ]);
                    } else {
                        Log::warning("Stock adjustment item not found", [
                            'item_id' => $itemData['id'],
                            'adjustment_id' => $stock_adjustment->id,
                        ]);
                    }
                }

                // Reload items to get updated values for total calculation
                $stock_adjustment->load('items');

                // Update header total
                $totalAmount = $stock_adjustment->items->sum(function ($item) {
                    return (float)$item->quantity * (float)$item->cost_price;
                });
                $stock_adjustment->update(['total_amount' => $totalAmount]);
            }

            // Reload items to get updated values
            $stock_adjustment->load('items', 'items.product', 'section');

            // Apply stock changes for each item
            foreach ($stock_adjustment->items as $item) {
                if ($item->adjustment_type === 'subtraction') {
                    $availableStock = DB::table('stock_in_hand')
                        ->where('company_code', $stock_adjustment->company_code)
                        ->where('section_code', $stock_adjustment->section->section_code)
                        ->where('ItemKy', $item->product_id)
                        ->where('batch_no', $item->batch_no)
                        ->sum(DB::raw('Qty + FreeQty'));

                    if ($availableStock < $item->quantity) {
                        $productName = $item->product->ItmNm ?? 'Unknown Product';
                        throw new \Exception("Insufficient stock for product {$productName} (Batch: {$item->batch_no}). Required: {$item->quantity}, Available: {$availableStock}");
                    }
                }

                $prices = [
                    'cost_price' => $item->cost_price,
                    'sale_price' => $item->sale_price,
                    'vehicle_sale_price' => $item->vehicle_sale_price,
                ];
                $this->processStockUpdate($stock_adjustment, $item, $prices);
            }

            // Update status to approved
            $stock_adjustment->update([
                'status' => 'approved',
                'approved_by' => $user->id,
            ]);

            // Calculate total additions and subtractions for Net Financial Impact
            $totalAdditions = 0;
            $totalSubtractions = 0;

            foreach ($stock_adjustment->items as $item) {
                $lineTotal = (float)$item->quantity * (float)$item->cost_price;
                if ($item->adjustment_type === 'addition') {
                    $totalAdditions += $lineTotal;
                } else {
                    $totalSubtractions += $lineTotal;
                }
            }

            $netImpact = $totalAdditions - $totalSubtractions;

            if (abs($netImpact) > 0) {
                $stockAdjustmentAccount = \App\Models\FinanceAccount::where('company_code', $stock_adjustment->company_code)
                    ->where('account_name', 'like', '%Stock Adjustment%')
                    ->lockForUpdate()
                    ->first();

                if ($stockAdjustmentAccount) {
                    $isDebit = $netImpact > 0;  // Net Gain = Debit (Increase Asset/Cash)
                    $isCredit = $netImpact < 0; // Net Loss = Credit (Decrease Asset/Cash)
                    $absImpact = abs($netImpact);

                    if (in_array($stockAdjustmentAccount->main_category->value ?? 'expenses', ['liabilities', 'revenue', 'equity'])) {
                        // For equity/revenue/liabilities: Credit increases balance, Debit decreases
                        if ($isCredit) {
                            $stockAdjustmentAccount->current_balance += $absImpact;
                        } else {
                            $stockAdjustmentAccount->current_balance -= $absImpact;
                        }
                    } else {
                        // For assets/expenses: Debit increases balance, Credit decreases
                        if ($isDebit) {
                            $stockAdjustmentAccount->current_balance += $absImpact;
                        } else {
                            $stockAdjustmentAccount->current_balance -= $absImpact;
                        }
                    }
                    $stockAdjustmentAccount->save();

                    \App\Models\FinanceAccountTransaction::create([
                        'finance_account_id' => $stockAdjustmentAccount->id,
                        'date' => now(),
                        'source_type' => 'Stock Adjustment',
                        'source_id' => $stock_adjustment->id,
                        'description' => 'Stock adjustment net impact (' . ($netImpact > 0 ? 'Gain' : 'Loss') . ') for batch ' . $stock_adjustment->batch_no,
                        'method' => 'journal',
                        'type' => $netImpact > 0 ? 'debit' : 'credit',
                        'amount' => $absImpact,
                        'reference' => $stock_adjustment->batch_no,
                    ]);
                }
            }

            // Mark related notifications as read
            DB::table('notifications')
                ->where('type', StockAdjustmentPendingNotification::class)
                ->whereRaw("JSON_EXTRACT(data, '$.adjustment_id') = ?", [$stock_adjustment->id])
                ->update(['read_at' => now()]);

            DB::commit();
            return redirect()->back()->with('success', 'Stock adjustment approved and applied successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Error approving stock adjustment: " . $e->getMessage());
            return back()->with('error', 'Failed to approve adjustment. ' . $e->getMessage());
        }
    }

    /**
     * Reject a pending stock adjustment.
     */
    public function reject(Request $request, StockAdjustment $stock_adjustment)
    {
        $user = $this->authUser();
        if (! $user || ! $user->hasPermission('stock_adjustments.approve')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have approval permission.');
        }

        if ($stock_adjustment->status !== 'pending') {
            return redirect()->back()->with('error', 'This adjustment cannot be rejected.');
        }

        $stock_adjustment->update([
            'status' => 'rejected',
            'approved_by' => $user->id,
        ]);

        // Mark related notifications as read
        DB::table('notifications')
            ->where('type', StockAdjustmentPendingNotification::class)
            ->whereRaw("JSON_EXTRACT(data, '$.adjustment_id') = ?", [$stock_adjustment->id])
            ->update(['read_at' => now()]);

        return redirect()->back()->with('success', 'Stock adjustment rejected.');
    }

    /**
     * Mark notification as read.
     */
    public function markNotificationRead(Request $request)
    {
        $user = Auth::user() ?? Auth::guard('company')->user();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $notificationId = $request->input('notification_id');
        $user->notifications()
            ->where('id', $notificationId)
            ->update(['read_at' => now()]);

        return response()->json(['success' => true]);
    }

    /**
     * Get unread notifications count.
     */
    public function getNotifications()
    {
        $user = Auth::user() ?? Auth::guard('company')->user();
        if (!$user) {
            return response()->json(['notifications' => [], 'unread_count' => 0]);
        }

        $notifications = $user->notifications()
            ->whereNull('read_at')
            ->latest()
            ->limit(10)
            ->get();

        $unreadCount = $user->unreadNotifications()->count();

        return response()->json([
            'notifications' => $notifications,
            'unread_count' => $unreadCount,
        ]);
    }
}

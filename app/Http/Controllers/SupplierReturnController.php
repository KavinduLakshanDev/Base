<?php

namespace App\Http\Controllers;

use App\Models\SupplierReturn;
use App\Models\Section;
use App\Models\Address;
use App\Models\Product;
use App\Models\PurchaseDet;
use App\Models\StockInHand;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class SupplierReturnController extends Controller
{
    /**
     * Display a listing of supplier returns.
     */
    public function index()
    {
        $user = Auth::user();
        $returns = SupplierReturn::with(['supplier', 'recordedBy', 'section'])
            ->where('company_code', $user->company_code)
            ->latest()
            ->paginate(15)
            ->through(function ($return) {
                $itemName = 'N/A';
                $itemCode = '';
                
                if ($return->item_type === 'product' && $return->item) {
                    $itemName = $return->item->ItmNm;
                    $itemCode = $return->item->ItemCode;
                } elseif ($return->item_type === 'printer' && $return->purchaseDet && $return->purchaseDet->product) {
                    $itemName = $return->purchaseDet->product->ItmNm;
                    $itemCode = $return->serial_number;
                }

                return [
                    'id' => $return->id,
                    'item_type' => $return->item_type,
                    'item_name' => $itemName,
                    'item_code' => $itemCode,
                    'supplier_name' => $return->supplier->FstNm ?? 'N/A',
                    'supplier_invoice_no' => $return->supplier_invoice_no,
                    'quantity' => $return->quantity,
                    'return_value' => $return->return_value,
                    'reason' => $return->reason,
                    'return_date' => $return->return_date->format('Y-m-d'),
                    'status' => $return->status,
                    'recorded_by' => $return->recordedBy->name ?? 'System',
                    'section_name' => $return->section->name ?? 'N/A',
                ];
            });

        return Inertia::render('SupplierReturn/Index', [
            'returns' => $returns,
        ]);
    }

    /**
     * Show the form for creating a new supplier return.
     */
    public function create()
    {
        $user = Auth::user();
        $sections = Section::where('company_code', $user->company_code)
            ->where('is_active', true)
            ->get();
        $userSection = $user?->section;

        return Inertia::render('SupplierReturn/Create', [
            'sections' => $sections,
            'userSection' => $userSection,
        ]);
    }

    /**
     * Search for suppliers.
     */
    public function searchSuppliers(Request $request)
    {
        $term = $request->get('term');
        
        if (!$term || strlen($term) < 1) {
            return response()->json([]);
        }

        $suppliers = Address::where('AdrTypKy', 4)
            ->where('company_code', Auth::user()->company_code)
            ->where(function ($q) use ($term) {
                $q->where('FstNm', 'LIKE', "%{$term}%")
                  ->orWhere('AdrCd', 'LIKE', "%{$term}%");
            })
            ->select('AdrKy', 'AdrCd', 'FstNm', 'TP1')
            ->orderByRaw("CASE 
                WHEN FstNm LIKE ? THEN 1 
                WHEN AdrCd LIKE ? THEN 2 
                WHEN FstNm LIKE ? THEN 3 
                ELSE 4 END", ["{$term}%", "{$term}%", "%{$term}%"])
            ->limit(50)
            ->get()
            ->map(function ($supplier) {
                return [
                    'id' => $supplier->AdrKy,
                    'code' => $supplier->AdrCd,
                    'name' => $supplier->FstNm,
                    'phone' => $supplier->TP1,
                ];
            });

        return response()->json($suppliers);
    }

    /**
     * Search for invoices for a specific supplier.
     */
    public function searchInvoices(Request $request)
    {
        $user = Auth::user();
        $supplierCode = $request->get('supplier_code');
        $term = $request->get('term');

        if (!$supplierCode) {
            return response()->json([]);
        }

        $invoices = DB::table('purchase')
            ->where('company_code', $user->company_code)
            ->where('SuppCode', $supplierCode)
            ->where(function($q) use ($term) {
                if ($term) {
                    $q->where('SuppInvNo', 'LIKE', "%{$term}%")
                      ->orWhere('PurchaseNo', 'LIKE', "%{$term}%");
                }
            })
            ->select('SuppInvNo', 'PurchaseNo', 'PurchaseKey', 'GRNDate')
            ->orderBy('GRNDate', 'desc')
            ->limit(50)
            ->get()
            ->map(function($inv) {
                return [
                    'purchase_key' => $inv->PurchaseKey,
                    'invoice_no' => $inv->SuppInvNo ?: 'GRN-' . $inv->PurchaseNo,
                    'purchase_no' => $inv->PurchaseNo,
                    'date' => $inv->GRNDate ? date('Y-m-d', strtotime($inv->GRNDate)) : 'N/A',
                ];
            });

        return response()->json($invoices);
    }

    /**
     * Get items from a specific invoice.
     */
    public function getInvoiceItems(Request $request)
    {
        $user = Auth::user();
        $purchaseKey = $request->get('purchase_key');
        $itemType = $request->get('item_type', 'product');
        $sectionId = $request->get('section_id');

        if (!$purchaseKey || !$sectionId) {
            return response()->json([]);
        }

        $section = Section::findOrFail($sectionId);

        // Subquery for aggregated current stock by ItemKy and batch_no
        $stockSubquery = DB::table('stock_in_hand')
            ->select(
                'ItemKy',
                DB::raw('COALESCE(batch_no, "N/A") as batch_no'),
                DB::raw('SUM(Qty + COALESCE(FreeQty, 0)) as stock_quantity')
            )
            ->where('section_code', $section->section_code)
            ->where('company_code', $section->company_code)
            ->where('OrdDate', '<=', now()->toDateString())
            ->groupBy('ItemKy', DB::raw('COALESCE(batch_no, "N/A")'));

        if ($itemType === 'product') {
            $items = DB::table('purchase_det as pd')
                ->leftJoin('itemmaster as im', function($join) use ($user) {
                    $join->on('pd.iTimKy', '=', 'im.ItmKy')
                         ->where('im.company_code', '=', $user->company_code);
                })
                ->leftJoinSub($stockSubquery, 'stock', function($join) {
                    $join->on('pd.iTimKy', '=', 'stock.ItemKy')
                         ->on(DB::raw('COALESCE(pd.batch_no, "N/A")'), '=', 'stock.batch_no');
                })
                ->where('pd.PurchaseKey', $purchaseKey)
                ->where(function($q) {
                    $q->where('im.item_type', 'product')->orWhereNull('im.item_type');
                })
                ->select(
                    'pd.PerchaseDetKy as ItemPriceKey',
                    'pd.iTimKy as ItmKy',
                    'im.ItemCode',
                    'im.ItmNm',
                    'pd.Qty',
                    'pd.batch_no',
                    'pd.CostPrice as CosPri',
                    'pd.DiscountRate',
                    'pd.NewCostPrice',
                    DB::raw('COALESCE(stock.stock_quantity, 0) as stock_quantity')
                )
                ->get();
        } else {
            // For printers
            $items = DB::table('purchase_det as pd')
                ->leftJoin('itemmaster as im', function($join) use ($user) {
                    $join->on('pd.iTimKy', '=', 'im.ItmKy')
                         ->where('im.company_code', '=', $user->company_code);
                })
                ->leftJoinSub($stockSubquery, 'stock', function($join) {
                    $join->on('pd.iTimKy', '=', 'stock.ItemKy')
                         ->on(DB::raw('COALESCE(pd.batch_no, "N/A")'), '=', 'stock.batch_no');
                })
                ->where('pd.PurchaseKey', $purchaseKey)
                ->where(function($q) {
                    $q->where('im.item_type', 'printer')->orWhere('pd.iTimKy', 0);
                })
                ->where('pd.Status', 'A')
                ->leftJoin('brands as b', 'im.brand_id', '=', 'b.id')
                ->leftJoin('models as m', 'im.models_id', '=', 'm.id')
                ->select(
                    'pd.PerchaseDetKy',
                    'pd.iTimKy',
                    DB::raw('COALESCE(im.ItmNm, pd.serial_number) as item_name'),
                    'pd.serial_number',
                    'pd.batch_no',
                    'b.name as brand',
                    'm.name as model',
                    'pd.CostPrice as CosPri',
                    'pd.DiscountRate',
                    'pd.NewCostPrice',
                    'pd.Qty',
                    DB::raw('COALESCE(stock.stock_quantity, 0) as stock_quantity')
                )
                ->distinct()
                ->get();
        }

        return response()->json($items);
    }

    /**
     * Search for items from itemmaster by supplier.
     */
    public function searchItems(Request $request)
    {
        $term = $request->get('term', '');
        $supplierId = $request->get('supplier_id');
        $sectionId = $request->get('section_id');

        if (!$supplierId || !$sectionId) {
            return response()->json([]);
        }

        // Get supplier code from Address table
        $supplier = Address::where('AdrKy', $supplierId)->first();
        if (!$supplier) {
            return response()->json([]);
        }

        $section = Section::findOrFail($sectionId);

        // First, calculate stock quantities per item and batch from stock_in_hand
        $stockSubquery = DB::table('stock_in_hand')
            ->select(
                'ItemKy',
                DB::raw('COALESCE(batch_no, "N/A") as batch_no'),
                DB::raw('SUM(Qty + COALESCE(FreeQty, 0)) as stock_quantity')
            )
            ->where('section_code', $section->section_code)
            ->where('company_code', $section->company_code)
            ->where('OrdDate', '<=', now()->toDateString())
            ->groupBy('ItemKy', DB::raw('COALESCE(batch_no, "N/A")'))
            ->havingRaw('SUM(Qty + COALESCE(FreeQty, 0)) > 0');

        // Join with purchase details to get batch-wise cost price and ensure it's from this supplier
        $user = Auth::user();
        $query = DB::table('purchase_det as pd')
            ->join('purchase as p', 'pd.PurchaseKey', '=', 'p.PurchaseKey')
            ->join('itemmaster as im', 'pd.iTimKy', '=', 'im.ItmKy')
            ->where('im.item_type', 'product')
            ->where('p.company_code', $user->company_code)
            ->joinSub($stockSubquery, 'stock', function($join) {
                $join->on('pd.iTimKy', '=', 'stock.ItemKy')
                     ->on(DB::raw('COALESCE(pd.batch_no, "N/A")'), '=', 'stock.batch_no');
            })
            ->where('p.SuppCode', $supplier->AdrCd);

        // Only add search filter if term is provided
        if ($term && strlen($term) > 0) {
            $query->where(function ($q) use ($term) {
                $q->where('im.ItmNm', 'LIKE', "%{$term}%")
                  ->orWhere('im.ItemCode', 'LIKE', "%{$term}%");
            });
        }

        $items = $query
            ->select(
                DB::raw('MAX(pd.PerchaseDetKy) as ItemPriceKey'),
                'im.ItmKy',
                'im.ItemCode',
                'im.ItmNm',
                'stock.batch_no',
                DB::raw('MAX(pd.CostPrice) as CosPri'),
                DB::raw('MAX(pd.DiscountRate) as DiscountRate'),
                DB::raw('MAX(pd.NewCostPrice) as NewCostPrice'),
                'stock.stock_quantity'
            )
            ->groupBy('im.ItmKy', 'im.ItemCode', 'im.ItmNm', 'stock.batch_no', 'stock.stock_quantity')
            ->orderBy('im.ItmNm')
            ->limit(50)
            ->get();

        return response()->json($items);
    }

    /**
     * Search for printers from purchase_det by supplier.
     */
    public function searchPrinters(Request $request)
    {
        $term = $request->get('term', '');
        $supplierId = $request->get('supplier_id');
        $sectionId = $request->get('section_id');

        if (!$supplierId || !$sectionId) {
            return response()->json([]);
        }

        // Get supplier code from Address table
        $supplier = Address::where('AdrKy', $supplierId)->first();
        if (!$supplier) {
            return response()->json([]);
        }

        $section = Section::findOrFail($sectionId);

        // For printers, calculate stock quantities per item and serial number
        $stockSubquery = DB::table('stock_in_hand')
            ->select(
                'ItemKy',
                'serial_number',
                DB::raw('SUM(Qty + COALESCE(FreeQty, 0)) as stock_quantity')
            )
            ->where('section_code', $section->section_code)
            ->where('company_code', $section->company_code)
            ->where('OrdDate', '<=', now()->toDateString())
            ->whereNotNull('serial_number')
            ->groupBy('ItemKy', 'serial_number')
            ->havingRaw('SUM(Qty + COALESCE(FreeQty, 0)) > 0');

        // Join with purchase details and master data
        $user = Auth::user();
        $query = DB::table('purchase_det as pd')
            ->join('purchase as p', 'pd.PurchaseKey', '=', 'p.PurchaseKey')
            ->join('itemmaster as im', 'pd.iTimKy', '=', 'im.ItmKy')
            ->where('im.item_type', 'printer')
            ->where('p.company_code', $user->company_code)
            ->leftJoin('brands as b', 'im.brand_id', '=', 'b.id')
            ->leftJoin('models as m', 'im.models_id', '=', 'm.id')
            ->joinSub($stockSubquery, 'stock', function($join) {
                $join->on('pd.iTimKy', '=', 'stock.ItemKy')
                     ->on('pd.serial_number', '=', 'stock.serial_number');
            })
            ->whereNotNull('pd.serial_number')
            ->where('pd.serial_number', '!=', '')
            ->where('p.SuppCode', $supplier->AdrCd);

        // Only add search filter if term is provided
        if ($term && strlen($term) > 0) {
            $query->where(function ($q) use ($term) {
                $q->where('im.ItmNm', 'LIKE', "%{$term}%")
                  ->orWhere('pd.serial_number', 'LIKE', "%{$term}%")
                  ->orWhere('b.name', 'LIKE', "%{$term}%")
                  ->orWhere('m.name', 'LIKE', "%{$term}%");
            });
        }

        $printers = $query
            ->select(
                'pd.PerchaseDetKy',
                'pd.iTimKy',
                'im.ItmNm as item_name',
                'pd.serial_number',
                'pd.batch_no',
                'b.name as brand',
                'm.name as model',
                'im.warranty',
                'pd.CostPrice as CosPri',
                'pd.DiscountRate',
                'pd.NewCostPrice',
                'stock.stock_quantity'
            )
            ->orderBy('im.ItmNm')
            ->limit(50)
            ->get();

        return response()->json($printers);
    }

    /**
     * Store a newly created supplier return.
     */
    public function store(Request $request)
    {
        \Log::info('Store method called', ['data' => $request->all()]);
        
        $validated = $request->validate([
            'item_type' => 'required|in:product,printer',
            'items' => 'required|array|min:1',
            'items.*.key' => 'required',
            'items.*.item_master_key' => 'nullable',
            'items.*.supplier_invoice_no' => 'nullable|string|max:50',
            'items.*.batch_no' => 'nullable|string',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.return_value' => 'required|numeric|min:0',
            'supplier_code' => 'required|string',
            'reason' => 'required|string',
            'return_date' => 'required|date',
            'notes' => 'nullable|string',
            'status' => 'required|in:pending,approved,rejected',
            'section_id' => 'required|exists:sections,id',
        ]);
        
        \Log::info('Validation passed', ['validated' => $validated]);

        $section = Section::findOrFail($validated['section_id']);
        $user = Auth::user();
        
        \Log::info('Section and user loaded', ['section' => $section->id, 'user' => $user->id]);

        DB::beginTransaction();
        \Log::info('Transaction started');
        
        try {
            foreach ($validated['items'] as $index => $item) {
                \Log::info('Processing item', ['index' => $index, 'item' => $item]);
                
                $returnData = [
                    'item_type' => $validated['item_type'],
                    'supplier_code' => $validated['supplier_code'],
                    'supplier_invoice_no' => $item['supplier_invoice_no'] ?? null,
                    'quantity' => $item['quantity'],
                    'return_value' => $item['return_value'],
                    'reason' => $validated['reason'],
                    'return_date' => $validated['return_date'],
                    'notes' => $validated['notes'] ?? null,
                    'status' => $validated['status'],
                    'recorded_by' => $user->id,
                    'section_id' => $section->id,
                    'company_code' => $section->company_code,
                    'section_code' => $section->section_code,
                ];

                if ($validated['item_type'] === 'product') {
                    $returnData['item_key'] = $item['key'];
                    $returnData['item_master_key'] = $item['item_master_key'] ?? null;
                    $returnData['batch_no'] = $item['batch_no'] ?? null;
                } else {
                    $purchaseDet = PurchaseDet::where('PerchaseDetKy', $item['key'])->firstOrFail();
                    $returnData['purchase_det_key'] = $item['key'];
                    $returnData['serial_number'] = $purchaseDet->serial_number;
                    $returnData['batch_no'] = $purchaseDet->batch_no;
                }

                \Log::info('Return data prepared', ['returnData' => $returnData]);
                
                $supplierReturn = SupplierReturn::create($returnData);
                
                \Log::info('Supplier return created', ['id' => $supplierReturn->id]);

                // If approved, deduct from stock and update ledger
                if ($validated['status'] === 'approved') {
                    \Log::info('Status is approved, deducting stock and updating ledger');
                    $this->deductStock($supplierReturn, $section);
                    $this->updateLedger($supplierReturn);
                }
            }

            DB::commit();
            \Log::info('Transaction committed successfully');

            return redirect()->route('supplier-returns.index')
                ->with('success', 'Supplier return recorded successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Transaction rolled back', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return back()->with('error', 'Failed to record supplier return: ' . $e->getMessage());
        }
    }

    /**
     * Deduct stock for approved returns.
     */
    private function deductStock(SupplierReturn $return, Section $section)
    {
        if ($return->item_type === 'product') {
            // Deduct item stock
            StockInHand::create([
                'RefNo' => 'SRET-OUT-' . $return->id,
                'Cky' => $section->id,
                'company_code' => $section->company_code,
                'owner_company_code' => $section->company_code, // Owner is the returning company
                'section_code' => $section->section_code,
                'OrdDate' => now()->format('Y-m-d'),
                'ItemKy' => $return->item_master_key,
                'Qty' => -$return->quantity,
                'FreeQty' => 0,
                'TrnTyp' => 'SRET-OUT',
                'OrdKy' => $return->id,
                'batch_no' => $return->batch_no,
            ]);
        } else {
            // Deduct printer stock
            $purchaseDet = $return->purchaseDet;
            StockInHand::create([
                'RefNo' => 'SRET-OUT-' . $return->id,
                'Cky' => $section->id,
                'company_code' => $section->company_code,
                'owner_company_code' => $section->company_code, // Owner is the returning company
                'section_code' => $section->section_code,
                'OrdDate' => now()->format('Y-m-d'),
                'ItemKy' => $purchaseDet->iTimKy,
                'Qty' => -$return->quantity,
                'FreeQty' => 0,
                'TrnTyp' => 'SRET-OUT',
                'OrdKy' => $return->id,
                'batch_no' => $return->batch_no,
                'serial_number' => $return->serial_number,
            ]);
        }
    }

    /**
     * Update ledger for approved returns.
     */
    private function updateLedger(SupplierReturn $return)
    {
        $supplier = Address::where('AdrCd', $return->supplier_code)
            ->where('company_code', $return->company_code)
            ->first();

        if (!$supplier || !$supplier->AccKy) {
            \Log::warning('Supplier or account not found for ledger update', ['code' => $return->supplier_code]);
            return;
        }

        $supplierAcc = \App\Models\AccMas::where('AccKy', $supplier->AccKy)->first();
        if (!$supplierAcc) {
            \Log::warning('Account Master not found for ledger update', ['AccKy' => $supplier->AccKy]);
            return;
        }

        $totalReturnAmount = (float) $return->quantity * (float) $return->return_value;

        // Update original invoice balance if linked
        $purchaseDetKey = $return->purchase_det_key ?: $return->item_key;
        if ($purchaseDetKey) {
            $purchaseDet = \App\Models\PurchaseDet::where('PerchaseDetKy', $purchaseDetKey)->first();
            if ($purchaseDet && $purchaseDet->PurchaseKey) {
                $purchase = \App\Models\Purchase::where('PurchaseKey', $purchaseDet->PurchaseKey)->first();
                if ($purchase) {
                    $purchase->balance_amount -= $totalReturnAmount;
                    // Ensure balance doesn't go negative for invoice-wise tracking, 
                    // though the global CurBal will handle the overall credit.
                    if ($purchase->balance_amount < 0) {
                        $purchase->balance_amount = 0;
                    }
                    $purchase->save();
                }
            }
        }

        // Create Accounting Transaction
        \App\Models\AccTrn::create([
            'AccKy' => $supplierAcc->AccKy,
            'TrnDt' => $return->return_date,
            'TrnNo' => 'SRET-' . $return->id,
            'Amt' => abs($totalReturnAmount), // Positive for returns (reduces payable)
            'VaucherNo' => null,
            'ReferenceNo' => $return->supplier_invoice_no,
            'Dec' => $return->notes ?? 'Supplier Return - ' . ($return->item_type === 'printer' ? $return->serial_number : $return->item_master_key),
            'FInAct' => 1,
            'Status' => 'A',
            'company_code' => $return->company_code,
            'section_code' => $return->section_code,
            'customer_code' => $supplier->AdrCd,
            'customer_name' => $supplier->FstNm,
        ]);

        // Recalculate and update CurBal
        $this->refreshSupplierBalance($supplier, $supplierAcc);
    }

    /**
     * Refresh the current balance for a supplier.
     */
    private function refreshSupplierBalance($supplier, $supplierAcc)
    {
        // Get total purchases
        $totalPurchases = DB::table('purchase')
            ->where('company_code', $supplier->company_code)
            ->where(function ($query) use ($supplier) {
                $query->where('SuppCode', $supplier->AdrCd)
                      ->orWhere('AccKy', $supplier->AccKy);
            })
            ->sum('TotalVal');

        // Get total payments
        $totalPayments = \App\Models\SupplierPayment::where('company_code', $supplier->company_code)
            ->where('supplier_code', $supplier->AdrCd)
            ->sum('paid_amount');

        // Get total returns (approved only)
        $totalReturns = SupplierReturn::where('company_code', $supplier->company_code)
            ->where('supplier_code', $supplier->AdrCd)
            ->where('status', 'approved')
            ->get()
            ->sum(function($ret) {
                return (float)$ret->quantity * (float)$ret->return_value;
            });

        // Update CurBal: Purchases - Payments - Returns
        $supplierAcc->CurBal = $totalPurchases - $totalPayments - $totalReturns;
        $supplierAcc->save();
        
        \Log::info('Supplier balance refreshed', [
            'code' => $supplier->AdrCd,
            'purchases' => $totalPurchases,
            'payments' => $totalPayments,
            'returns' => $totalReturns,
            'new_balance' => $supplierAcc->CurBal
        ]);
    }

    /**
     * Update the specified supplier return.
     */
    public function update(Request $request, int $id)
    {
        $validated = $request->validate([
            'status' => 'required|in:pending,approved,rejected',
            'notes' => 'nullable|string',
        ]);

        $supplierReturn = SupplierReturn::findOrFail($id);
        $oldStatus = $supplierReturn->status;
        $newStatus = $validated['status'];

        if ($oldStatus === $newStatus) {
            return back()->with('info', 'Status is already ' . $newStatus);
        }

        DB::beginTransaction();
        try {
            $supplierReturn->status = $newStatus;
            if (isset($validated['notes'])) {
                $supplierReturn->notes = $validated['notes'];
            }
            $supplierReturn->save();

            $section = Section::where('company_code', $supplierReturn->company_code)
                ->where('section_code', $supplierReturn->section_code)
                ->firstOrFail();

            // Handle transitions
            if ($oldStatus !== 'approved' && $newStatus === 'approved') {
                // Moving to approved: Deduct stock and update ledger
                $this->deductStock($supplierReturn, $section);
                $this->updateLedger($supplierReturn);
            } elseif ($oldStatus === 'approved' && $newStatus !== 'approved') {
                // Moving from approved: Restore stock and refresh balance
                $this->restoreStock($supplierReturn);
                
                $supplier = Address::where('AdrCd', $supplierReturn->supplier_code)
                    ->where('company_code', $supplierReturn->company_code)
                    ->first();
                $supplierAcc = $supplier ? \App\Models\AccMas::where('AccKy', $supplier->AccKy)->first() : null;
                
                if ($supplier && $supplierAcc) {
                    $this->refreshSupplierBalance($supplier, $supplierAcc);
                }

                // Delete AccTrn entry if it exists
                \App\Models\AccTrn::where('TrnNo', 'SRET-' . $supplierReturn->id)
                    ->where('company_code', $supplierReturn->company_code)
                    ->delete();
            }

            DB::commit();

            return redirect()->route('supplier-returns.index')
                ->with('success', 'Supplier return status updated to ' . $newStatus);
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Failed to update return status: ' . $e->getMessage());
        }
    }

    /**
     * Remove the specified supplier return.
     */
    public function destroy(int $id)
    {
        try {
            $return = SupplierReturn::findOrFail($id);

            DB::beginTransaction();

            // If approved, restore stock and update ledger
            if ($return->status === 'approved') {
                $this->restoreStock($return);
                
                // For ledger, we just need to refresh the balance after deletion
                $supplier = Address::where('AdrCd', $return->supplier_code)
                    ->where('company_code', $return->company_code)
                    ->first();
                $supplierAcc = $supplier ? \App\Models\AccMas::where('AccKy', $supplier->AccKy)->first() : null;
            }

            $return->delete();

            if (isset($supplier) && isset($supplierAcc)) {
                $this->refreshSupplierBalance($supplier, $supplierAcc);
            }

            DB::commit();

            return redirect()->route('supplier-returns.index')
                ->with('success', 'Supplier return deleted successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Failed to delete supplier return: ' . $e->getMessage());
        }
    }

    /**
     * Restore stock when return is deleted.
     */
    private function restoreStock(SupplierReturn $return)
    {
        $outRecord = StockInHand::where('RefNo', 'SRET-OUT-' . $return->id)
            ->where('TrnTyp', 'SRET-OUT')
            ->first();

        if ($outRecord) {
            StockInHand::create([
                'RefNo' => 'SRET-IN-' . $return->id,
                'Cky' => $outRecord->Cky,
                'company_code' => $outRecord->company_code,
                'owner_company_code' => $outRecord->owner_company_code, // Preserve ownership from original
                'section_code' => $outRecord->section_code,
                'OrdDate' => now()->format('Y-m-d'),
                'ItemKy' => $outRecord->ItemKy,
                'Qty' => abs($outRecord->Qty),
                'FreeQty' => 0,
                'TrnTyp' => 'SRET-IN',
                'OrdKy' => $return->id,
                'batch_no' => $outRecord->batch_no,
                'serial_number' => $outRecord->serial_number,
            ]);
        }
    }
}

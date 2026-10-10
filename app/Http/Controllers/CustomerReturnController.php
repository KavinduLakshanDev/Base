<?php

namespace App\Http\Controllers;

use App\Models\CustomerReturn;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use App\Models\CustomerReturnItem;
use App\Models\SalesTransaction;
use App\Models\SalesTransactionItem;
use App\Models\ItemMaster;
use App\Models\StockInHand;
use App\Models\Customer;
use App\Models\Section;
use App\Models\StockTransfer;
use App\Models\CustomerPayment;
use App\Models\PurchaseDet;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Barryvdh\DomPDF\Facade\Pdf;
use Dompdf\Dompdf;
use Dompdf\Options;

class CustomerReturnController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('cashier.shift', only: ['index', 'create', 'store']),
        ];
    }
    /**
     * Display a listing of customer returns.
     */
    public function index(Request $request)
    {
        if (!request()->user()->hasPermission('customer_returns.view')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view customer returns.');
        }

        $query = CustomerReturn::with(['customer', 'processedBy', 'items']);

        // Filter by company
        $user = $request->user();
        if ($user && $user->company_code) {
            $query->where('company_code', $user->company_code);
        }

        // Search
        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('return_no', 'like', '%' . $request->search . '%')
                  ->orWhere('customer_name', 'like', '%' . $request->search . '%')
                  ->orWhere('original_invoice_no', 'like', '%' . $request->search . '%');
            });
        }



        // Filter by return type
        if ($request->filled('return_type') && $request->return_type !== 'all') {
            $query->where('return_type', $request->return_type);
        }

        // Filter by date range
        if ($request->filled('date_from')) {
            $query->whereDate('return_date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('return_date', '<=', $request->date_to);
        }

        $stats = [
            'totalReturns' => $query->count(),
            'completedReturns' => (clone $query)->where('status', 'completed')->count(),
            'totalReturnAmount' => (float) $query->sum('total_return_amount'),
        ];

        $perPage = $request->input('per_page', 15);
        $returns = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return Inertia::render('CustomerReturns/Index', [
            'returns' => $returns,
            'stats' => $stats,
            'filters' => $request->only(['search', 'return_type', 'date_from', 'date_to', 'per_page'])
        ]);
    }

    /**
     * Show the form for creating a new customer return.
     */
    public function create()
    {
        if (!request()->user()->hasPermission('customer_returns.create')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to create customer returns.');
        }

        $user = request()->user();
        $section = Section::where('section_code', $user->section_code)->first();

        return Inertia::render('CustomerReturns/Create', [
            'nextReturnNo' => CustomerReturn::generateReturnNo($user->section_code),
            'currentDate' => date('Y-m-d'),
            'section' => $section,
        ]);
    }

    /**
     * Store a newly created customer return.
     */
    public function store(Request $request)
    {
        if (!request()->user()->hasPermission('customer_returns.create')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to create customer returns.');
        }

        $validated = $request->validate([
            'return_date' => 'required|date',
            'customer_name' => 'required|string|max:255',
            'customer_code' => 'nullable|string|max:50',
            'customer_id' => 'nullable|integer',
            'original_invoice_no' => 'nullable|string|max:100',
            'return_type' => 'required|in:item,printer,mixed',
            'refund_method' => 'required|in:cash,exchange,credit_note',  // Added credit_note
            'reason' => 'nullable|string',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.item_code' => 'required|string',
            'items.*.item_ky' => 'nullable|integer',
            'items.*.item_name' => 'required|string',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.discount_amount' => 'nullable|numeric|min:0',
            'items.*.tax_amount' => 'nullable|numeric|min:0',
            'items.*.batch_no' => 'nullable|string',
            'items.*.serial_number' => 'nullable|string',
            'items.*.brand' => 'nullable|string',
            'items.*.model' => 'nullable|string',
            'items.*.warranty' => 'nullable|string',
            'items.*.item_type' => 'required|in:item,printer',
            'items.*.condition' => 'required|in:good,damaged,defective',
            'items.*.damage_notes' => 'nullable|string',
            'items.*.add_to_stock' => 'boolean',
            'items.*.original_sale_item_id' => 'nullable|integer',
            'refund_amount' => 'nullable|numeric|min:0',
            'exchange_amount' => 'nullable|numeric|min:0',
            'refund_details' => 'nullable|array',
            // Exchange items: the replacement goods given to the customer
            'exchange_items'                      => 'nullable|array',
            'exchange_items.*.item_code'          => 'required_with:exchange_items.*|string',
            'exchange_items.*.item_ky'            => 'nullable|integer',
            'exchange_items.*.item_name'          => 'required_with:exchange_items.*|string',
            'exchange_items.*.quantity'           => 'required_with:exchange_items.*|numeric|min:0.01',
            'exchange_items.*.unit_price'         => 'required_with:exchange_items.*|numeric|min:0',
            'exchange_items.*.discount_amount'    => 'nullable|numeric|min:0',
            'exchange_items.*.tax_amount'         => 'nullable|numeric|min:0',
            'exchange_items.*.batch_no'           => 'nullable|string',
            'exchange_items.*.serial_number'      => 'nullable|string',
            'exchange_items.*.item_type'          => 'nullable|in:item,printer',
        ]);

        // make original_invoice_no always defined for later logic
        $origInvoice = $validated['original_invoice_no'] ?? null;

        DB::beginTransaction();

        try {
            $user = request()->user();
            
            // Generate return number
            $returnNo = CustomerReturn::generateReturnNo($user->section_code);

            // Calculate totals
            $totalReturnAmount = 0;
            foreach ($validated['items'] as $item) {
                $itemTotal = ($item['quantity'] * $item['unit_price']) 
                           - ($item['discount_amount'] ?? 0) 
                           + ($item['tax_amount'] ?? 0);
                $totalReturnAmount += $itemTotal;
            }

            // Find sales transaction if invoice number provided
            $salesTransactionId = null;
            $salesTransaction = null; // ensure variable exists when not looking up an invoice
            if (!empty($origInvoice)) {
                // mirror search logic from getSalesByInvoice so that the stored
                // sale is found even when the user types a colon suffix.
                // invoice_no is unique system-wide so no additional filtering needed.
                $searchInvoice = trim($origInvoice);
                $searchInvoice = preg_replace('/:.*/', '', $searchInvoice);

                $companySectionCodes = Section::where('company_code', $user->company_code)
                    ->pluck('section_code');

                $salesTransaction = SalesTransaction::where('invoice_no', $searchInvoice)
                    ->whereIn('section_code', $companySectionCodes)
                    ->first();
                if ($salesTransaction) {
                    $salesTransactionId = $salesTransaction->id;
                }
            }

            // Create customer return with consolidated fields (single source of truth)
            $customerReturn = CustomerReturn::create([
                'return_no' => $returnNo,
                'return_date' => $validated['return_date'],
                'customer_name' => $validated['customer_name'],
                'customer_code' => $validated['customer_code'] ?? null,
                'customer_id' => $validated['customer_id'] ?? null,
                'sales_transaction_id' => $salesTransactionId,
                'original_invoice_no' => $validated['original_invoice_no'] ?? null,
                'section_code' => $user->section_code,
                'company_code' => $user->company_code,
                'return_type' => $validated['return_type'],
                'total_return_amount' => $totalReturnAmount,
                'return_value' => $totalReturnAmount,  // Match total_return_amount
                'refund_amount' => $validated['refund_amount'] ?? $totalReturnAmount,  // Respect frontend provided refund amount, fallback to total return amount
                'exchange_amount' => 0,  // Calculated later
                'refund_method' => $validated['refund_method'],
                'refund_details' => $validated['refund_details'] ?? null,
                'status' => 'pending',  // Will move to 'processed' during actual processing
                'notes' => $validated['notes'] ?? null,
                'reason' => $validated['reason'] ?? null,
                'processed_by' => $user->id,
                'processed_at' => null,  // Set when moved to 'processed'
            ]);

            Log::info('Customer return created (pending)', [
                'return_no' => $returnNo,
                'original_invoice_no' => $origInvoice,
                'items_count' => count($validated['items']),
                'total_return_amount' => $totalReturnAmount,
            ]);

            // --- Return-quantity guard ---
            // Before inserting anything, check that no item quantity exceeds
            // what is still returnable from this invoice.
            if (!empty($origInvoice) && $salesTransaction) {
                foreach ($validated['items'] as $itemData) {
                    if (!empty($itemData['original_sale_item_id'])) {
                        $saleItem = SalesTransactionItem::find($itemData['original_sale_item_id']);
                        $alreadyReturnedQuery = CustomerReturnItem::where('original_sale_item_id', $itemData['original_sale_item_id']);
                    } else {
                        $saleItem = SalesTransactionItem::where('sales_transaction_id', $salesTransaction->id)
                            ->where('item_code', $itemData['item_code'])
                            ->first();
                        $alreadyReturnedQuery = CustomerReturnItem::where('item_code', $itemData['item_code']);
                    }

                    if (!$saleItem) {
                        continue; // item not found in sale – let existing logic handle it
                    }

                    // Sum quantities already returned for this item+invoice (non-cancelled returns only)
                    $alreadyReturned = $alreadyReturnedQuery
                        ->where(function ($q) {
                            $q->whereNull('item_direction')
                              ->orWhere('item_direction', 'in');
                        })
                        ->whereHas('customerReturn', fn ($q) => $q
                            ->where('original_invoice_no', $origInvoice)
                            ->where('status', '!=', 'cancelled')
                        )
                        ->sum('quantity');

                    $returnableQty = $saleItem->quantity - $alreadyReturned;

                    if ($itemData['quantity'] > $returnableQty) {
                        DB::rollBack();
                        $msg = "Cannot return {$itemData['quantity']} of \"{$itemData['item_name']}\". "
                            . "Only {$returnableQty} unit(s) can still be returned "
                            . "(sold: {$saleItem->quantity}, already returned: {$alreadyReturned}).";
                        return redirect()->back()->withInput()->with('error', $msg);
                    }
                }
            }
            // --- end guard ---

            foreach ($validated['items'] as $itemData) {
                $itemTotal = ($itemData['quantity'] * $itemData['unit_price']) 
                           - ($itemData['discount_amount'] ?? 0) 
                           + ($itemData['tax_amount'] ?? 0);


                // Determine target section for stock before creating the item
                // This ensures stock_location_code is set correctly
                $targetSectionCode = $user->section_code; // Default

                // The returned stock must go back to the section it was sold FROM
                // so that the net stock of that section is restored correctly.
                // Priority:
                //   1. salesTransaction->section_code  (the section that made the sale)
                //   2. originalSaleItem->section_code  (per-line override when passed)
                //   3. is_main_stock section            (walk-in / no invoice fallback)
                //   4. $user->section_code              (last resort default)
                if ($salesTransaction && $salesTransaction->section_code) {
                    // Return to the exact section that sold the item
                    $targetSectionCode = $salesTransaction->section_code;
                    Log::info('Customer return: using sale transaction section', [
                        'invoice'    => $origInvoice,
                        'section'    => $targetSectionCode,
                    ]);
                } elseif (!empty($itemData['original_sale_item_id'])) {
                    $originalSaleItem = SalesTransactionItem::find($itemData['original_sale_item_id']);
                    if ($originalSaleItem && $originalSaleItem->section_code) {
                        $targetSectionCode = $originalSaleItem->section_code;
                    }
                } else {
                    // Walk-in return with no matching invoice/transaction → main stock
                    $mainStockSection = Section::where('company_code', $user->company_code)
                        ->where('is_main_stock', true)
                        ->first();
                    // fallback by name when flag is not set
                    if (!$mainStockSection) {
                        $mainStockSection = Section::where('company_code', $user->company_code)
                            ->where('name', 'like', '%Import Buying%')
                            ->orWhere('name', 'like', '%Import%')
                            ->first();
                    }
                    if ($mainStockSection) {
                        $targetSectionCode = $mainStockSection->section_code;
                    }
                }

                // Create return item with explicit item_direction='in' (goods entering stock/system)
                $returnItem = CustomerReturnItem::create([
                    'customer_return_id' => $customerReturn->id,
                    'item_direction'     => 'in',  // Explicitly set: goods coming IN from customer
                    'item_code' => $itemData['item_code'],
                    'item_ky' => $itemData['item_ky'] ?? null,
                    'quantity' => $itemData['quantity'],
                    'unit_price' => $itemData['unit_price'],
                    'discount_amount' => $itemData['discount_amount'] ?? 0,
                    'tax_amount' => $itemData['tax_amount'] ?? 0,
                    'total_amount' => $itemTotal,
                    'batch_no' => $itemData['batch_no'] ?? null,
                    'serial_number' => $itemData['serial_number'] ?? null,
                    'item_type' => $itemData['item_type'],
                    'condition' => $itemData['condition'],
                    'damage_notes' => $itemData['damage_notes'] ?? null,
                    'add_to_stock' => $itemData['add_to_stock'] ?? ($itemData['condition'] === 'good'),
                    'stock_location_code' => $targetSectionCode,
                    'original_sale_item_id' => $itemData['original_sale_item_id'] ?? null,
                ]);

                // Add to stock only if condition is good and add_to_stock is true
                if ($returnItem->add_to_stock && $returnItem->condition === 'good') {
                    Log::info('Processing return item for stock entry', [
                        'item_code' => $returnItem->item_code,
                        'item_direction' => 'in',
                        'target_section' => $targetSectionCode,
                        'batch_no' => $returnItem->batch_no,
                        'quantity' => $returnItem->quantity,
                        'condition' => $returnItem->condition,
                    ]);
                    $this->addToStock($returnItem, $targetSectionCode, $user->company_code);
                } else {
                    Log::info('Return item NOT added to stock', [
                        'item_code' => $returnItem->item_code,
                        'reason' => !$returnItem->add_to_stock ? 'add_to_stock=false' : "condition={$returnItem->condition}",
                        'damage_notes' => $returnItem->damage_notes,
                    ]);
                }
            }

            // ── Process exchange items (goods given to customer as replacement) ─────────
            // These items flow OUT of stock. We record them as item_direction='out' on
            // customer_return_items and create a negative stock_in_hand entry.
            // VALIDATION: Ensure exchange items have sufficient stock before creating records
            $exchangeTotal = 0;
            
            // Pre-validate all exchange items have sufficient stock
            foreach (($validated['exchange_items'] ?? []) as $exData) {
                $itemKy = $exData['item_ky'] ?? null;
                if (!$itemKy) {
                    DB::rollBack();
                    $msg = "Invalid item selected for exchange: '{$exData['item_name']}' (no item ID)";
                    Log::error('Exchange item validation failed - missing item_ky', $exData);
                    return redirect()->back()->withInput()->with('error', $msg);
                }
                
                // Check if item has stock in current user's section
                $availableStock = StockInHand::where('ItemKy', $itemKy)
                    ->where('section_code', $user->section_code)
                    ->sum('Qty');
                
                if ($exData['quantity'] > $availableStock) {
                    DB::rollBack();
                    $msg = "Insufficient stock for exchange item '{$exData['item_name']}'. "
                        . "Available: {$availableStock}, Requested: {$exData['quantity']}";
                    Log::warning('Exchange item stock insufficient', [
                        'item_code' => $exData['item_code'],
                        'item_ky' => $itemKy,
                        'available' => $availableStock,
                        'requested' => $exData['quantity'],
                        'section' => $user->section_code,
                    ]);
                    return redirect()->back()->withInput()->with('error', $msg);
                }
            }
            
            // All exchange items validated for stock - now process them
            $exchangeTotal = 0;
            foreach (($validated['exchange_items'] ?? []) as $exData) {
                $exItemTotal = ($exData['quantity'] * $exData['unit_price'])
                             - ($exData['discount_amount'] ?? 0)
                             + ($exData['tax_amount'] ?? 0);
                $exchangeTotal += $exItemTotal;

                $exchangeReturnItem = CustomerReturnItem::create([
                    'customer_return_id'   => $customerReturn->id,
                    'item_direction'       => 'out',  // Explicitly set: goods going OUT
                    'item_code'            => $exData['item_code'],
                    'item_ky'              => $exData['item_ky'] ?? null,
                    'quantity'             => $exData['quantity'],
                    'unit_price'           => $exData['unit_price'],
                    'discount_amount'      => $exData['discount_amount'] ?? 0,
                    'tax_amount'           => $exData['tax_amount'] ?? 0,
                    'total_amount'         => $exItemTotal,
                    'batch_no'             => $exData['batch_no'] ?? null,
                    'serial_number'        => $exData['serial_number'] ?? null,
                    'item_type'            => $exData['item_type'] ?? 'item',
                    'condition'            => 'good',
                    'add_to_stock'         => false,  // Exchange items don't go back to stock
                    'stock_location_code'  => $user->section_code,
                ]);

                $this->deductFromStock($exchangeReturnItem, $user->section_code, $user->company_code);

                Log::info('Exchange item deducted from stock', [
                    'item_code' => $exData['item_code'],
                    'item_direction' => 'out',
                    'quantity' => $exData['quantity'],
                    'value' => $exItemTotal,
                    'section' => $user->section_code,
                ]);
            }

            // Persist the actual exchange value on the return record
            if ($exchangeTotal > 0) {
                $customerReturn->update(['exchange_amount' => $exchangeTotal]);
                Log::info('Exchange amount updated', [
                    'return_no' => $customerReturn->return_no,
                    'exchange_total' => $exchangeTotal,
                ]);
            }

            // ── Validate and handle exchange with price difference ────────────────────────
            // If exchange_value > return_value: customer OWES the difference
            // If exchange_value < return_value: create credit for the overage
            // Walk-in customers are now allowed; payment records will be created with return_no reference
            if ($exchangeTotal !== $totalReturnAmount) {
                $priceDifference = $exchangeTotal - $totalReturnAmount;
                
                if ($priceDifference > 0) {
                    // Customer owes money (exchange is more expensive than return)
                    Log::warning('Exchange value exceeds return value - customer will owe', [
                        'return_no' => $customerReturn->return_no,
                        'return_value' => $totalReturnAmount,
                        'exchange_value' => $exchangeTotal,
                        'difference_owed' => $priceDifference,
                    ]);
                } else {
                    // Customer gets credit (exchange is cheaper than return)
                    Log::info('Return value exceeds exchange value - customer gets credit', [
                        'return_no' => $customerReturn->return_no,
                        'return_value' => $totalReturnAmount,
                        'exchange_value' => $exchangeTotal,
                        'credit_amount' => abs($priceDifference),
                    ]);
                }
            }

            // ── Update Original Sale Balance ───────────────────────────────────────
            // If the return was linked to a specific sales invoice, we should reduce the invoice's balance
            // so it no longer shows up as an unpaid debt in the Sales list.
            if ($salesTransaction) {
                $amountAppliedToInvoice = 0;
                
                if ($validated['refund_method'] === 'credit_note') {
                    // Account Credit: full return value is applied to the invoice balance
                    $amountAppliedToInvoice = $totalReturnAmount;
                } elseif ($validated['refund_method'] === 'cash') {
                    // Cash Refund: only the amount NOT refunded in cash is applied to the invoice balance
                    $amountAppliedToInvoice = max(0, $totalReturnAmount - $customerReturn->refund_amount);
                }

                if ($amountAppliedToInvoice > 0) {
                    $salesTransaction->balance_amount = max(0, $salesTransaction->balance_amount - $amountAppliedToInvoice);
                    if ($salesTransaction->balance_amount == 0) {
                        $salesTransaction->status = 'Returned';
                    }
                    $salesTransaction->save();
                    
                    Log::info('Original sale balance updated due to return', [
                        'sale_id'          => $salesTransaction->id,
                        'new_balance'      => $salesTransaction->balance_amount,
                        'new_status'       => $salesTransaction->status,
                        'applied_amount'   => $amountAppliedToInvoice
                    ]);
                } else {
                    Log::info('Sale record balance remains unchanged', [
                        'sale_id'          => $salesTransaction->id,
                        'original_invoice' => $salesTransaction->invoice_no,
                        'return_no'        => $customerReturn->return_no,
                        'refund_method'    => $validated['refund_method'],
                    ]);
                }
            }

            // Create customer payment record for cash refunds and exchange price differences
            if ($validated['refund_method'] === 'cash' && $customerReturn->refund_amount > 0) {
                Log::info('Creating refund payment', [
                    'return_no' => $customerReturn->return_no,
                    'refund_method' => $validated['refund_method'],
                    'refund_amount' => $customerReturn->refund_amount,
                    'customer_id' => $customerReturn->customer_id,
                ]);
                $this->createRefundPayment($customerReturn, $user);
            }

            // For exchange: if there's a price difference, create a payment record
            if ($validated['refund_method'] === 'exchange' && $exchangeTotal !== $totalReturnAmount) {
                $priceDifference = $exchangeTotal - $totalReturnAmount;
                $this->createExchangePayment($customerReturn, $priceDifference, $user);
            }

            // All processing complete - mark return as 'processed' (not immediately completed)
            $customerReturn->update([
                'status' => 'processed',
                'processed_at' => now(),
            ]);

            Log::info('Customer return processing completed', [
                'return_no' => $customerReturn->return_no,
                'status' => 'processed',
                'refund_method' => $validated['refund_method'],
                'total_return_amount' => $customerReturn->total_return_amount,
                'refund_amount' => $customerReturn->refund_amount,
                'exchange_amount' => $customerReturn->exchange_amount,
                'user_id' => $user->id,
                'processed_at' => now(),
            ]);

            DB::commit();

            // Return JSON response with return_id for frontend to trigger receipt download
            // Frontend will auto-download receipt, then redirect to show page
            return response()->json([
                'success' => true,
                'message' => 'Customer return processed successfully. Return No: ' . $returnNo,
                'return_id' => $customerReturn->id,
                'return_no' => $returnNo,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Customer return creation failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to create customer return: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Display the specified customer return.
     */
    public function show(CustomerReturn $customerReturn)
    {
        if (!request()->user()->hasPermission('customer_returns.view')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        // Check company access
        $user = request()->user();
        if ($customerReturn->company_code !== $user->company_code) {
            abort(404);
        }

        $customerReturn->load(['customer', 'salesTransaction', 'processedBy', 'items.itemMaster']);

        $company = \App\Models\Company::where('company_code', $user->company_code)->first();

        return Inertia::render('CustomerReturns/Show', [
            'customerReturn' => $customerReturn,
            'company' => $company,
        ]);
    }

    /**
     * Search for customers.
     */
    public function searchCustomers(Request $request)
    {
        $search = $request->input('search', '');
        $user = request()->user();

        $customers = Customer::where('company_code', $user->company_code)
            ->where(function ($query) use ($search) {
                $query->where('AdrKy', 'like', '%' . $search . '%')
                    ->orWhere('AdrName', 'like', '%' . $search . '%')
                    ->orWhere('Mobile', 'like', '%' . $search . '%');
            })
            ->limit(20)
            ->get()
            ->map(function ($customer) {
                return [
                    'id' => $customer->AdrKy,
                    'code' => $customer->AdrKy,
                    'name' => $customer->AdrName,
                    'mobile' => $customer->Mobile,
                    'vat_no' => $customer->vat_no,
                ];
            });

        return response()->json($customers);
    }

    /**
     * Search for items (regular products).
     */
    public function searchItems(Request $request)
    {
        $search = $request->input('search', '');
        $user = request()->user();

        try {
            $items = ItemMaster::where('company_code', $user->company_code)
                ->where('section_code', $user->section_code)
                ->where(function ($query) use ($search) {
                    // Note: database field is BarCode (case-sensitive); avoid unknown column error
                    $query->where('ItemCode', 'like', '%' . $search . '%')
                        ->orWhere('ItmNm', 'like', '%' . $search . '%')
                        ->orWhere('BarCode', 'like', '%' . $search . '%');
                })
                // no longer eager-loading `prices` which didn't exist; use relation defined on model
                ->limit(20)
                ->get()
                ->flatMap(function ($item) use ($user) {
                    // base data for each item
                    $price = $item->priceDetails->first();
                    $base = [
                        'item_ky' => $item->ItmKy,
                        'item_code' => $item->ItemCode,
                        'item_name' => $item->ItmNm ?? $item->ItemName ?? '',
                        'barcode' => $item->BarCode ?? null,
                        'retail_price' => $price?->Price ?? $item->SlsPri ?? 0,
                        'wholesale_price' => $price?->WholePrice ?? 0,
                    ];

                    // find batches with stock > 0
                    $batches = StockInHand::where('ItemKy', $item->ItmKy)
                        ->where('section_code', $item->section_code)
                        ->where('Qty', '>', 0)
                        ->select('batch_no', DB::raw('sum(Qty) as stock'))
                        ->groupBy('batch_no')
                        ->orderBy('batch_no')
                        ->get();

                    if ($batches->isEmpty()) {
                        $row = $base;
                        $row['batch_no'] = $item->batch_no ?? null;
                        $row['stock'] = $this->getItemStock($item->ItmKy, $item->section_code);
                        $row['batch_price'] = PurchaseDet::where('batch_no', $row['batch_no'])
                            ->where('company_code', $user->company_code)
                            ->orderBy('PerchaseDetKy', 'desc')
                            ->value('SalePrice') ?? 0;
                        return [$row];
                    }

                    return $batches->map(function ($b) use ($base, $user) {
                        $row = array_merge($base, [
                            'batch_no' => $b->batch_no,
                            'stock' => floatval($b->stock),
                        ]);
                        $row['batch_price'] = PurchaseDet::where('batch_no', $b->batch_no)
                            ->where('company_code', $user->company_code)
                            ->orderBy('PerchaseDetKy', 'desc')
                            ->value('SalePrice') ?? 0;
                        return $row;
                    })->toArray();
                });
        } catch (\Exception $e) {
            Log::error('customer return item search failed', ['error' => $e->getMessage(), 'search' => $search]);
            return response()->json([], 500);
        }

        return response()->json($items);
    }

    /**
     * Search for printers.
     */
    public function searchPrinters(Request $request)
    {
        $search = $request->input('search', '');
        $user = request()->user();

        try {
            // Search in purchase details for printers with serial numbers
            // table uses company_id/section_id so we don't filter by code here; the
            // calling context will restrict results via authenticated user later if
            // necessary (see SalesController implementation).  dropping the incorrect
            // where clauses avoids SQL errors when those columns are absent.
            $printers = PurchaseDet::join('itemmaster as im', 'purchase_det.iTimKy', '=', 'im.ItmKy')
                ->leftJoin('brands as b', 'im.brand_id', '=', 'b.id')
                ->leftJoin('models as m', 'im.models_id', '=', 'm.id')
                ->whereNotNull('purchase_det.serial_number')
                ->where(function ($query) use ($search) {
                    $query->where('purchase_det.serial_number', 'like', '%' . $search . '%')
                        ->orWhere('im.ItmNm', 'like', '%' . $search . '%')
                        ->orWhere('b.name', 'like', '%' . $search . '%')
                        ->orWhere('m.name', 'like', '%' . $search . '%');
                })
                ->select([
                    'purchase_det.iTimKy',
                    'purchase_det.serial_number',
                    'purchase_det.batch_no',
                    'im.ItemCode',
                    'im.ItmNm as item_name',
                    'im.warranty',
                    'im.SlsPri as UnitPrice',
                    'b.name as brand_name',
                    'm.name as model_name'
                ])
                ->limit(20)
                ->get()
                ->map(function ($printer) {
                    return [
                        'item_ky' => $printer->iTimKy,
                        'item_code' => $printer->ItemCode,
                        'item_name' => $printer->item_name,
                        'serial_number' => $printer->serial_number,
                        'brand' => $printer->brand_name,
                        'model' => $printer->model_name,
                        'warranty' => $printer->warranty,
                        'batch_no' => $printer->batch_no,
                        'unit_price' => $printer->UnitPrice,
                        'retail_price' => $printer->UnitPrice,
                    ];
                });
        } catch (\Exception $e) {
            Log::error('customer return printer search failed', ['error' => $e->getMessage(), 'search' => $search]);
            return response()->json([], 500);
        }

        return response()->json($printers);
    }

    /**
     * Get sales by invoice number.
     */
    public function getSalesByInvoice(Request $request)
    {
        // allow user to include colon suffix (e.g. "INV-001:1") and still match
        $invoiceNo = trim($request->input('invoice_no', ''));
        // strip off anything after the first colon - the actual invoices are stored
        // without the suffix
        $baseInvoice = preg_replace('/:.*/', '', $invoiceNo);

        $user = request()->user();

        try {
            // Restrict lookup to sections belonging to the authenticated user's company.
            // `company_code` was dropped from sales_transactions (migration 2026_01_23),
            // but section_code remains and sections.company_code is the authoritative
            // company boundary.  Collect all section_codes for this company and use
            // whereIn so users from company A cannot retrieve invoices from company B.
            $companySectionCodes = Section::where('company_code', $user->company_code)
                ->pluck('section_code');

            $sale = SalesTransaction::where('invoice_no', $baseInvoice)
                ->whereIn('section_code', $companySectionCodes)
                ->with(['customer', 'items.item.brand', 'items.item.model'])
                ->first();

            if (!$sale) {
                Log::info('Invoice search failed - not found', [
                    'searched_invoice' => $baseInvoice,
                    'original_input'   => $invoiceNo,
                    'user_id'          => $user->id,
                    'company_code'     => $user->company_code,
                ]);

                return response()->json(['error' => 'Invoice not found'], 404);
            }

            // Calculate invoice totals
            $subtotal = $sale->items->sum(function ($item) {
                return $item->quantity * $item->unit_price;
            });
            
            $totalDiscount = $sale->items->sum('discount_amount');
            $totalTax = $sale->items->sum('tax_amount');
            $grandTotal = $sale->final_total ?? ($subtotal - $totalDiscount + $totalTax);

            return response()->json([
                'sale' => [
                    'id' => $sale->id,
                    'invoice_no' => $sale->invoice_no,
                    'invoice_date' => $sale->invoice_date,
                    'customer_code' => $sale->customer_code,
                    'customer_name' => $sale->customer_name,
                    'customer_id' => $sale->customer_id,
                    'subtotal' => number_format($subtotal, 2, '.', ''),
                    'total_discount' => number_format($totalDiscount, 2, '.', ''),
                    'total_tax' => number_format($totalTax, 2, '.', ''),
                    'grand_total' => number_format($grandTotal, 2, '.', ''),
                    'balance_amount' => number_format($sale->balance_amount, 2, '.', ''),
                    'paid_amount' => number_format($grandTotal - $sale->balance_amount, 2, '.', ''),
                    'status' => $sale->status,
                ],
                'items' => $sale->items->map(function ($item) use ($baseInvoice) {
                    $itemTotal = ($item->quantity * $item->unit_price) - $item->discount_amount + $item->tax_amount;

                    // Count quantity already returned for this sale item across ALL
                    // previous (non-cancelled) customer returns for this invoice.
                    // Only count direction='in' rows (items coming back) — exchange-out
                    // rows must not be counted as returned quantity.
                    // We match by item_code + original_invoice_no so it works even for
                    // old return records that did not store original_sale_item_id.
                    $returnedQty = CustomerReturnItem::where('item_code', $item->item_code)
                        ->where(function ($q) {
                            $q->whereNull('item_direction')
                              ->orWhere('item_direction', 'in');
                        })
                        ->whereHas('customerReturn', fn ($q) => $q
                            ->where('original_invoice_no', $baseInvoice)
                            ->where('status', '!=', 'cancelled')
                        )
                        ->sum('quantity');
                    $returnableQty = max(0, $item->quantity - $returnedQty);

                    return [
                        'id' => $item->id,
                        'item_code' => $item->item_code,
                        // SalesTransactionItem stores the item key as product_id / original_item_id,
                        // NOT as item_ky — using item_ky always returned null which caused
                        // stock_in_hand.ItemKy and stock_transfers.item_id to be NULL on return.
                        'item_ky' => $item->product_id ?? $item->original_item_id,
                        'item_name' => $item->item_name,
                        'quantity' => $item->quantity,
                        'returned_qty' => round((float) $returnedQty, 4),
                        'returnable_qty' => round($returnableQty, 4),
                        'unit_price' => number_format($item->unit_price, 2, '.', ''),
                        'discount_amount' => number_format($item->discount_amount, 2, '.', ''),
                        'tax_amount' => number_format($item->tax_amount, 2, '.', ''),
                        'total' => number_format($itemTotal, 2, '.', ''),
                        'batch_no' => $item->batch_no,
                        'serial_number' => $item->serial_number,
                        'brand' => $item->brand,
                        'model' => $item->model,
                        'warranty' => $item->warranty,
                        'item_type' => !empty($item->serial_number) ? 'printer' : 'item',
                    ];
                }),
            ]);
        } catch (\Exception $e) {
            Log::error('searchInvoice failed', ['error' => $e->getMessage(), 'invoice' => $invoiceNo]);
            return response()->json(['error' => 'Unable to lookup invoice'], 500);
        }
    }

    /**
     * Generate receipt PDF using DomPDF.
     */
    public function generateReceipt(CustomerReturn $customerReturn)
    {
        if (!request()->user()->hasPermission('customer_returns.view')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $user = request()->user();
        if ($customerReturn->company_code !== $user->company_code) {
            abort(404);
        }

        $customerReturn->load(['customer', 'salesTransaction', 'processedBy', 'items']);
        $company = \App\Models\Company::where('company_code', $user->company_code)->first();

        // Generate HTML from the blade template
        $html = view('pdf.customer-return-receipt', [
            'customerReturn' => $customerReturn,
            'company' => $company,
        ])->render();

        // Configure DomPDF with proper options
        $options = new Options();
        $options->set('isRemoteEnabled', true);
        $options->set('isHtml5ParserEnabled', true);
        $dompdf = new Dompdf($options);
        
        // Set paper size (80mm width for standard receipt printers)
        $dompdf->setPaper([0, 0, 226.77, 1000]); // 80mm x large height for receipt
        
        // Load HTML and render PDF
        $dompdf->loadHtml($html);
        $dompdf->render();
        
        // Stream the PDF to browser
        return $dompdf->stream('return-' . $customerReturn->return_no . '.pdf');
    }

    /**
     * Add returned item to stock with proper tracking.
     * Creates stock_in_hand entries and stock_transfer records.
     */
    private function addToStock($returnItem, $sectionCode, $companyCode)
    {
        $userId = Auth::id() ?? 0;
        $returnDate = $returnItem->customerReturn->return_date ?? now();
        $returnNo = $returnItem->customerReturn->return_no ?? 'RETURN';

        // Log item type and serial so we can debug branch selection
        Log::info('addToStock invoked', [
            'item_code' => $returnItem->item_code,
            'item_type' => $returnItem->item_type,
            'serial_number' => $returnItem->serial_number,
        ]);

        // For regular items (anything that is not a 'printer' return)
        if ($returnItem->item_type !== 'printer') {
            // Create stock IN entry for the returned item
            $stockEntry = StockInHand::create([
                'uuid' => (string) \Illuminate\Support\Str::uuid(),
                'RefNo' => $returnNo,
                'company_code' => $companyCode,
                'owner_company_code' => $companyCode,
                'section_code' => $sectionCode,
                'OrdDate' => $returnDate,
                'ItemKy' => $returnItem->item_ky,
                'Qty' => $returnItem->quantity,
                'FreeQty' => 0,
                'TrnTyp' => 'CUSTOMER_RETURN',
                'OrdKy' => $returnItem->customer_return_id,
                'StkKy' => 0,
                'OrdTypKy' => 0,
                'CounterID' => $userId,
                // Use null (not empty string '') so this entry groups with other
                // records that have a NULL batch_no.  Storing '' creates a separate
                // batch group and the returned stock appears invisible alongside the
                // original purchase stock in the stock-transfer batch picker.
                'batch_no' => $returnItem->batch_no ?: null,
                'Cky' => 0,
            ]);

            // If item was sold from a different section, create a stock transfer record
            if ($returnItem->original_sale_item_id) {
                $originalSaleItem = SalesTransactionItem::find($returnItem->original_sale_item_id);
                if ($originalSaleItem && $originalSaleItem->section_code !== $sectionCode) {
                    // Create stock transfer record showing the return flow
                    StockTransfer::create([
                        'transfer_number' => $returnNo,
                        'from_section_code' => $originalSaleItem->section_code,
                        'to_section_code' => $sectionCode,
                        // item_id can be null if unknown
                        'item_id' => $returnItem->item_ky ?? null,
                        'item_code' => $returnItem->item_code,
                        'item_name' => $returnItem->item_name,
                        'stock_id' => $stockEntry->TableKy,
                        'quantity' => $returnItem->quantity,
                        'cost_price' => $returnItem->unit_price,
                        'transfer_date' => $returnDate,
                        'notes' => "Customer return from invoice - {$returnItem->customerReturn->original_invoice_no}",
                        'company_code' => $companyCode,
                        'batch_no' => $returnItem->batch_no ?? '',
                    ]);
                }
            }

            Log::info('Item returned to stock', [
                'item_code' => $returnItem->item_code,
                'section_code' => $sectionCode,
                'quantity' => $returnItem->quantity,
                'stock_entry_id' => $stockEntry->TableKy,
            ]);

        } else {
            // For printers with serial numbers
            $purchaseDetail = PurchaseDet::where('serial_number', $returnItem->serial_number)
                ->where('company_code', $companyCode)
                ->first();

            // Always insert a stock_in_hand entry for returned printer even if purchaseDetail is missing
            StockInHand::create([
                'uuid' => (string) \Illuminate\Support\Str::uuid(),
                'RefNo' => $returnNo,
                'company_code' => $companyCode,
                'owner_company_code' => $companyCode,
                'section_code' => $sectionCode,
                'OrdDate' => $returnDate,
                'ItemKy' => $returnItem->item_ky,
                'Qty' => 1,
                'FreeQty' => 0,
                'TrnTyp' => 'CUSTOMER_RETURN',
                'OrdKy' => $returnItem->customer_return_id,
                'StkKy' => $purchaseDetail->PerchaseDetKy ?? 0,
                'OrdTypKy' => 0,
                'CounterID' => $userId,
                'batch_no' => $returnItem->batch_no ?: null,
                'serial_number' => $returnItem->serial_number,
                'Cky' => 0,
            ]);

            if ($purchaseDetail) {
                $originalSection = $purchaseDetail->section_code;

                // Update printer section to the return section
                $purchaseDetail->update([
                    'section_code' => $sectionCode,
                ]);
                
                // Create stock transfer record for printer with valid stock_id
                StockTransfer::create([
                    'transfer_number' => $returnNo,
                    'from_section_code' => $originalSection,
                    'to_section_code' => $sectionCode,
                    'item_id' => $returnItem->item_ky ?? null,
                    'item_code' => $returnItem->item_code,
                    'item_name' => $returnItem->item_name,
                    'stock_id' => $purchaseDetail->PerchaseDetKy,  // Always exists when purchaseDetail exists
                    'quantity' => 1,
                    'cost_price' => $returnItem->unit_price,
                    'transfer_date' => $returnDate,
                    'notes' => "Printer return - SN: {$returnItem->serial_number}",
                    'company_code' => $companyCode,
                    'serial_number' => $returnItem->serial_number,
                ]);

                Log::info('Printer returned to stock with transfer', [
                    'serial_number' => $returnItem->serial_number,
                    'section_code' => $sectionCode,
                    'purchase_det_id' => $purchaseDetail->PerchaseDetKy,
                    'from_section' => $originalSection,
                ]);
            } else {
                $originalSection = null;
                Log::warning('Printer not found in purchase_det - no transfer created', [
                    'serial_number' => $returnItem->serial_number,
                    'company_code' => $companyCode,
                    'section_code' => $sectionCode,
                ]);
            }

            Log::info('Printer stock entry created', [
                'serial_number' => $returnItem->serial_number,
                'section_code' => $sectionCode,
                'purchase_det_found' => $purchaseDetail ? 'yes' : 'no',
            ]);
        }
    }

    /**
     * Deduct an exchange item from stock.
     *
     * Creates a NEGATIVE StockInHand entry (TrnTyp = 'CUSTOMER_EXCHANGE') so
     * that the running stock balance reflects goods that left as part of an
     * exchange.  Only called for items with item_direction = 'out'.
     */
    private function deductFromStock($exchangeItem, $sectionCode, $companyCode)
    {
        $userId     = Auth::id() ?? 0;
        $returnDate = optional($exchangeItem->customerReturn)->return_date ?? now();
        $returnNo   = optional($exchangeItem->customerReturn)->return_no   ?? 'EXCHANGE';

        StockInHand::create([
            'uuid'               => (string) \Illuminate\Support\Str::uuid(),
            'RefNo'              => $returnNo,
            'company_code'       => $companyCode,
            'owner_company_code' => $companyCode,
            'section_code'       => $sectionCode,
            'OrdDate'            => $returnDate,
            'ItemKy'             => $exchangeItem->item_ky,
            // Negative quantity = stock leaving the section
            'Qty'                => -1 * abs($exchangeItem->quantity),
            'FreeQty'            => 0,
            'TrnTyp'             => 'CUSTOMER_EXCHANGE',
            'OrdKy'              => $exchangeItem->customer_return_id,
            'StkKy'              => 0,
            'OrdTypKy'           => 0,
            'CounterID'          => $userId,
            'batch_no'           => $exchangeItem->batch_no ?: null,
            'serial_number'      => $exchangeItem->serial_number ?? null,
            'Cky'                => 0,
        ]);

        Log::info('Exchange item deducted from stock', [
            'item_code'  => $exchangeItem->item_code,
            'section'    => $sectionCode,
            'quantity'   => -1 * abs($exchangeItem->quantity),
        ]);
    }

    /**
     * Create customer payment record for cash refund with comprehensive audit trail.
     *
     * Records the cash outflow in the customer's payment ledger.
     * NOTE: the SalesTransaction.total_amount / balance_amount adjustment
     * is done in store() before this method is called.
     */
    private function createRefundPayment($customerReturn, $user)
    {
        // Create refund payment record for cash refunds
        // For walk-in customers (no customer_id), record is tracked by return_no instead

        try {
            $refundAmount = abs($customerReturn->refund_amount);

            // Always create the cash refund voucher/ledger since cash left the business
            $this->createCashRefundFat(null, $customerReturn, $refundAmount, $user);

            if ($customerReturn->customer_id) {
                // Negative amount = cash physically handed from business to customer.
                $payment = CustomerPayment::create([
                    'customer_id'          => $customerReturn->customer_id,
                    'customer_code'        => $customerReturn->customer_code,
                    'sales_transaction_id' => $customerReturn->sales_transaction_id,
                    'amount'               => -1 * $refundAmount,
                    'date'                 => $customerReturn->return_date,
                    'method'               => 'cash_refund',
                    'reference'            => $customerReturn->return_no,
                    'notes'                => "Cash refund for return: {$customerReturn->return_no}",
                    'status'               => 'completed',
                ]);

                Log::info('Refund payment record created', [
                    'return_no'            => $customerReturn->return_no,
                    'payment_id'           => $payment->id ?? null,
                    'customer_id'          => $customerReturn->customer_id,
                    'refund_amount'        => $refundAmount,
                    'refund_method'        => $customerReturn->refund_method,
                    'processed_by_user_id' => $user->id,
                    'timestamp'            => now(),
                ]);
            }

        } catch (\Exception $e) {
            Log::error('Failed to create refund payment - return processing continues', [
                'error'      => $e->getMessage(),
                'return_no'  => $customerReturn->return_no,
                'customer_id' => $customerReturn->customer_id,
                'refund_amount' => abs($customerReturn->refund_amount),
            ]);
            // Don't throw - we don't want to fail the whole return for this payment issue
        }
    }

    /**
     * Create payment record for exchange price difference.
     *
     * When exchange_value > return_value: customer owes the difference
     * When exchange_value < return_value: customer gets a credit
     */
    private function createExchangePayment($customerReturn, $priceDifference, $user)
    {
        // Create payment record for exchange price difference
        // For walk-in customers (no customer_id), record is tracked by return_no instead

        try {
            $absAmount = abs($priceDifference);
            
            if ($priceDifference > 0) {
                // Customer OWES money (positive amount means debit from customer)
                $method = 'exchange_balance_due';
                $description = "Balance due for exchange - {$customerReturn->return_no}";
                $amount = $absAmount;  // Positive = customer owes
                $status = 'pending';  // Waiting for customer to pay the difference
            } else {
                // Business policy: give physical cash in hand for the remaining balance
                $method = 'cash_refund';
                $description = "Cash refund for remaining exchange balance - {$customerReturn->return_no}";
                $amount = -1 * $absAmount;  // Negative = cash handed to customer
                $status = 'completed';  // Cash handed over instantly
            }

            if ($method === 'cash_refund') {
                $this->createCashRefundFat(null, $customerReturn, $absAmount, $user);
            }

            if ($customerReturn->customer_id) {
                $payment = CustomerPayment::create([
                    'customer_id'          => $customerReturn->customer_id,
                    'customer_code'        => $customerReturn->customer_code,
                    'sales_transaction_id' => $customerReturn->sales_transaction_id,
                    'amount'               => $amount,
                    'date'                 => $customerReturn->return_date,
                    'method'               => $method,
                    'reference'            => $customerReturn->return_no,
                    'notes'                => $description,
                    'status'               => $status,
                ]);

                Log::info('Exchange price difference payment record created', [
                    'return_no'            => $customerReturn->return_no,
                    'payment_id'           => $payment->id ?? null,
                    'customer_id'          => $customerReturn->customer_id,
                    'price_difference'     => $priceDifference,
                    'payment_type'         => $priceDifference > 0 ? 'balance_due' : 'credit',
                    'amount'               => $amount,
                    'status'               => $status,
                    'processed_by_user_id' => $user->id,
                    'timestamp'            => now(),
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Failed to create exchange payment - return processing continues', [
                'error'             => $e->getMessage(),
                'return_no'         => $customerReturn->return_no,
                'customer_id'       => $customerReturn->customer_id,
                'price_difference'  => $priceDifference,
            ]);
            // Don't throw - we don't want to fail the whole return for this payment issue
        }
    }

    /**
     * Get item stock quantity.
     */
    private function getItemStock($itemKy, $sectionCode)
    {
        return StockInHand::where('ItemKy', $itemKy)
            ->where('section_code', $sectionCode)
            ->sum('Qty');
    }

    private function createCashRefundFat($payment, $customerReturn, $refundAmount, $user)
    {
        $companyCode = $customerReturn->company_code ?? $user->company_code ?? null;
        if ($companyCode) {
            // Use Cashier Sales Finance Account
            $mainCashAccount = \App\Models\FinanceAccount::where('account_name', 'like', '%Cashier Sales%')
                ->where('section_code', $customerReturn->section_code ?? $user->section_code)
                ->first() ?? \App\Models\FinanceAccount::find(40);
            
            if ($mainCashAccount) {
                if (in_array($mainCashAccount->main_category->value ?? 'assets', ['liabilities', 'revenue', 'equity'])) {
                    $mainCashAccount->current_balance += $refundAmount; // Credit increases liability/revenue
                } else {
                    $mainCashAccount->current_balance -= $refundAmount; // Credit decreases asset
                }
                $mainCashAccount->save();
                
                $payerAccount = trim(($customerReturn->customer_name ?? '') . ' ' . ($customerReturn->customer_code ?? ''));
                $description = "{$customerReturn->return_no}";

                $voucherData = [
                    'finance_voucher_no' => uniqid('tmp_'),
                    'date' => $customerReturn->return_date ?? now()->toDateString(),
                    'type' => 'withdraw',
                    'finance_account_id' => $mainCashAccount->id,
                    'payer_account' => $payerAccount ?: 'Customer',
                    'description' => $description,
                    'amount' => $refundAmount,
                    'section_code' => $customerReturn->section_code ?? $user->section_code,
                    'company_code' => $companyCode,
                    'created_by_id' => $user->id,
                ];
                $voucher = \App\Models\FinanceVoucher::create($voucherData);
                
                $latest = \App\Models\FinanceVoucher::where('type', 'withdraw')
                    ->where('finance_voucher_no', 'like', 'FW-%')
                    ->where('id', '!=', $voucher->id)
                    ->latest('id')
                    ->first();
                $lastNo = 0;
                if ($latest && preg_match('/FW-(\d+)/', $latest->finance_voucher_no, $matches)) {
                    $lastNo = (int) $matches[1];
                } else {
                    // Fallback to highest ID if regex fails to avoid FW-0001 duplicates
                    $lastNo = \App\Models\FinanceVoucher::max('id') ?? 0;
                }
                $voucher->finance_voucher_no = 'FW-' . str_pad($lastNo + 1, 4, '0', STR_PAD_LEFT);
                $voucher->save();
                
                \App\Models\FinanceAccountTransaction::create([
                    'finance_account_id' => $mainCashAccount->id,
                    'date' => $customerReturn->return_date ?? now()->toDateString(),
                    'source_type' => 'Customer Return Cash Refund',
                    'source_id' => $voucher->id,
                    'description' => $description,
                    'method' => 'cash',
                    'type' => 'credit', // Money out is credit
                    'amount' => $refundAmount,
                    'reference' => $voucher->finance_voucher_no,
                ]);
            }
        }
    }
}

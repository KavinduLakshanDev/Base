<?php

namespace App\Http\Controllers;

use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use App\Models\DayOpeningBalance;
use App\Models\PointsRule;
use App\Models\SalesTransaction;
use App\Models\SalesTransactionItem;
use App\Models\Customer;
use App\Models\CustomerPayment;
use App\Models\ItemMaster;
use App\Models\StockInHand;
use App\Models\PrivilagePoint;
use App\Models\PrivilegeUser;
use App\Models\AccMas;
use App\Models\CodeMaster;
use App\Models\User;
use App\Services\AdminBarcodeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Illuminate\Support\Str;
use Dompdf\Dompdf;

class SalesController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('cashier.shift', only: ['index', 'create', 'store']),
        ];
    }

    /**
     * Verify that the supplied credentials belong to a company admin or super admin.
     * Used by the Sales Index page before allowing access to the edit form.
     */
    public function verifyAdmin(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
            'sale_id'  => 'nullable|integer',
        ]);

        $user = Auth::user();

        // Must find an admin in the SAME company (unless superadmin)
        $adminQuery = User::where('email', $request->email);
        
        if (!$user->isSuperAdmin()) {
            $adminQuery->where('company_code', $user->company_code);
        }

        $admin = $adminQuery->first();

        if (!$admin || !Hash::check($request->password, $admin->password)) {
            return response()->json(['success' => false, 'message' => 'Invalid admin credentials.'], 401);
        }

        // Must have admin-level role
        $isAdmin = $this->userIsSuperAdmin($admin) || 
                   $this->userIsCompanyAdmin($admin) ||
                   ($admin->role && $admin->role->slug === 'accounts_manager');

        if (!$isAdmin) {
            return response()->json(['success' => false, 'message' => 'The supplied account does not have admin privileges.'], 403);
        }

        // Store a one-time session flag so the edit controller knows admin authorised this
        if ($request->has('sale_id') && $request->sale_id) {
            session(['sale_edit_authorized_id' => (int) $request->sale_id]);
        }

        return response()->json(['success' => true]);
    }

    /**
     * Verify admin barcode scan for authorization.
     * Used by the POS when a barcode is scanned instead of typing credentials.
     */
    public function verifyAdminBarcode(Request $request)
    {
        $request->validate([
            'barcode'  => 'required|string',
            'sale_id'  => 'nullable|integer',
        ]);

        $barcodeService = new AdminBarcodeService();
        $admin = $barcodeService->verify($request->barcode);

        if (!$admin) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired admin barcode.',
            ], 401);
        }

        // Must have admin-level role
        $isAdminRole = $this->userIsSuperAdmin($admin) || 
                       $this->userIsCompanyAdmin($admin) ||
                       ($admin->role && $admin->role->slug === 'accounts_manager');

        if (!$isAdminRole) {
            return response()->json([
                'success' => false,
                'message' => 'This barcode does not belong to an admin user.',
            ], 403);
        }

        // Same company check
        $loggedInUser = Auth::user();
        if (!$loggedInUser->isSuperAdmin() && $admin->company_code !== $loggedInUser->company_code) {
            return response()->json([
                'success' => false,
                'message' => 'Admin is not authorized for this company.',
            ], 403);
        }

        // Store a one-time session flag so the edit controller knows admin authorised this
        if ($request->has('sale_id') && $request->sale_id) {
            session(['sale_edit_authorized_id' => (int) $request->sale_id]);
        }

        return response()->json(['success' => true]);
    }

    public function validateCheque(Request $request)
    {
        $request->validate([
            'cheque_no' => 'required|string',
            'bank_name' => 'required|string',
            'branch' => 'required|string',
            'exclude_sale_id' => 'nullable|integer'
        ]);

        $query = CustomerPayment::where('method', 'cheque')
            ->where('cheque_no', $request->cheque_no)
            ->whereRaw('LOWER(bank_name) = ?', [strtolower($request->bank_name)])
            ->whereRaw('LOWER(branch) = ?', [strtolower($request->branch)])
            ->where('status', '!=', 'cancelled');

        if ($request->exclude_sale_id) {
            $query->where('sales_transaction_id', '!=', $request->exclude_sale_id);
        }

        $exists = $query->exists();

        return response()->json(['exists' => $exists]);
    }

    public function index(Request $request)
    {
        if (!request()->user()->hasPermission('sales.view')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view sales.');
        }

        $query = SalesTransaction::query();

        // Filter by company (via sections)
        $user = $request->user();
        if ($user && $user->company_code) {
            $sections = \App\Models\Section::where('company_code', $user->company_code)->pluck('section_code');
            $query->whereIn('section_code', $sections);
        }

        // If the logged‑in user is a cashier (base level), restrict the list to their own sales.
        // company admins, branch admins, and managers should see everything for their context.
        $isManager = $user->role && (str_contains(strtolower($user->role->name), 'manager'));

        if (!$this->userIsSuperAdmin($user) && !$this->userIsCompanyAdmin($user) && !$this->userIsBranchAdmin($user) && !$isManager) {
            $query->where('cashier_id', $user->id);
        }

        // Search by invoice number or customer
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('invoice_no', 'like', '%' . $search . '%')
                  ->orWhere('customer_name', 'like', '%' . $search . '%')
                  ->orWhere('customer_code', 'like', '%' . $search . '%')
                  ->orWhereHas('customer', function($q2) use ($search) {
                      $q2->where('FstNm', 'like', '%' . $search . '%')
                         ->orWhere('LstNm', 'like', '%' . $search . '%')
                         ->orWhere('TP1', 'like', '%' . $search . '%');
                  });
            });
        }

        // Filter by status
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Filter by date range
        if ($request->has('date_from') && $request->date_from) {
            $query->whereDate('transaction_date', '>=', $request->date_from);
        }

        if ($request->has('date_to') && $request->date_to) {
            $query->whereDate('transaction_date', '<=', $request->date_to);
        }

        // Filter by item_type
        if ($request->has('item_type') && $request->item_type && $request->item_type !== 'all') {
            $itemType = $request->item_type;
            $query->whereExists(function ($subQuery) use ($itemType) {
                $subQuery->select(DB::raw(1))
                    ->from('sales_transaction_items as sti')
                    ->join('itemmaster as im', function ($join) {
                        $join->on('im.ItmKy', '=', 'sti.product_id')
                            ->orOn('im.ItemCode', '=', 'sti.item_code');
                    })
                    ->whereColumn('sti.sales_transaction_id', 'sales_transactions.id')
                    ->where('im.item_type', $itemType);
            });
        }

        $sales = $query->orderBy('created_at', 'desc')->paginate($request->input('per_page', 10));

        return Inertia::render('Sales/Index', [
            'sales' => $sales,
            'filters' => $request->only(['search', 'status', 'date_from', 'date_to', 'per_page', 'item_type'])
        ]);
    }

    public function getTransactions(Request $request)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'User not authenticated'], 401);
        }

        $user = $user->load('role');
        if (!$user->hasPermission('sales.view')) {
            return response()->json(['error' => 'Unauthorized. You do not have permission to view sales.'], 403);
        }

        $query = SalesTransaction::query();

        // Filter by company (via sections)
        if ($user && $user->company_code) {
            $sections = \App\Models\Section::where('company_code', $user->company_code)->pluck('section_code');
            $query->whereIn('section_code', $sections);
        }

        // apply cashier restriction when appropriate (mirrors index behaviour)
        if (!$this->userIsSuperAdmin($user) && !$this->userIsCompanyAdmin($user) && !$this->userIsBranchAdmin($user)) {
            $query->where('cashier_id', $user->id);
        }

        // Search by invoice number or customer
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('invoice_no', 'like', '%' . $search . '%')
                  ->orWhere('customer_name', 'like', '%' . $search . '%')
                  ->orWhere('customer_code', 'like', '%' . $search . '%');
            });
        }

        // Filter by status
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Filter by date range
        if ($request->has('date_from') && $request->date_from) {
            $query->whereDate('transaction_date', '>=', $request->date_from);
        }

        if ($request->has('date_to') && $request->date_to) {
            $query->whereDate('transaction_date', '<=', $request->date_to);
        }

        // Filter by item_type
        if ($request->has('item_type') && $request->item_type && $request->item_type !== 'all') {
            $itemType = $request->item_type;
            $query->whereExists(function ($subQuery) use ($itemType) {
                $subQuery->select(DB::raw(1))
                    ->from('sales_transaction_items as sti')
                    ->join('itemmaster as im', function ($join) {
                        $join->on('im.ItmKy', '=', 'sti.product_id')
                            ->orOn('im.ItemCode', '=', 'sti.item_code');
                    })
                    ->whereColumn('sti.sales_transaction_id', 'sales_transactions.id')
                    ->where('im.item_type', $itemType);
            });
        }

        $sales = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'data' => $sales
        ]);
    }

    private function calculateCashBalance($user, $today)
    {
        $sectionCode = $user->section_code ?? 'MAIN';
        $companyCode = $user->company_code ?? null;

        $openingRecord = DayOpeningBalance::where('user_id', $user->id)
            ->where('balance_date', $today)
            ->where('company_code', $companyCode)
            ->where('section_code', $sectionCode)
            ->first();

        $openingBalance = $openingRecord ? (float) $openingRecord->opening_balance : 0;

        // Sum cash sales from SalesTransaction table (authoritative for sale-time payments)
        // We filter by cashier_id, section_code and transaction_date
        $todayCashSales = (float) SalesTransaction::where('cashier_id', $user->id)
            ->where('section_code', $sectionCode)
            ->whereDate('transaction_date', $today)
            ->where('status', '!=', 'cancelled')
            ->get()
            ->sum(function($s) {
                $cash = (float) ($s->payment_details['cash'] ?? 0);
                $change = (float) ($s->payment_details['change'] ?? 0);
                return max(0, $cash - $change);
            });

        // Sum other cash payments (debt collections) collected by this user today
        // We exclude 'Initial' and 'Updated' notes to avoid double counting payments already in SalesTransaction
        $debtCollections = (float) CustomerPayment::where('method', 'cash')
            ->where('status', 'completed')
            ->whereRaw('DATE(date) = ?', [$today])
            ->where('collected_by', $user->id)
            ->where(function($q) {
                $q->where('notes', 'not like', 'Initial%')
                  ->where('notes', 'not like', 'Updated%')
                  ->orWhereNull('notes');
            })
            ->sum('amount');

        // Subtract petty cash outflows created by this user in this section today
        $pettyCash = (float) DB::table('petty_cash_transactions')
            ->where('company_code', $companyCode)
            ->where('section_code', $sectionCode)
            ->whereDate('transaction_date', $today)
            ->where('created_by_id', $user->id)
            ->sum('amount');

        $currentBalance = $openingBalance + $todayCashSales + $debtCollections - $pettyCash;

        return [
            'opening_balance'  => $openingBalance,
            'today_cash_sales' => $todayCashSales,
            'debt_collections' => $debtCollections,
            'expenses'         => $pettyCash,
            'current_balance'  => $currentBalance,
            'balance_date'     => $today,
            'has_opening'      => $openingRecord !== null,
        ];
    }

    public function cashBalance(): \Illuminate\Http\JsonResponse
    {
        $user  = Auth::user();
        $today = date('Y-m-d');
        return response()->json($this->calculateCashBalance($user, $today));
    }

    public function getNextInvoiceNumber(): \Illuminate\Http\JsonResponse
    {
        return response()->json([
            'nextInvoiceNo' => $this->getNextInvoiceNoPreview(),
            'currentDate'   => date('Y-m-d'),
        ]);
    }

    public function create()
    {
        if (!request()->user()->hasPermission('sales.create')) {
             return redirect()->back()->with('error', 'Unauthorized. You do not have permission to create sales.');
        }

        $user  = Auth::user();
        $today = date('Y-m-d');
        $dayBalance = $this->calculateCashBalance($user, $today);

        // also provide active bank accounts for dropdowns (similar to customer payments)
        $bankAccountsQuery = \App\Models\BankAccount::where('status', 'active');
        if ($user && $user->role_id !== 1) {
            if ($user->role_id === 3) {
                $bankAccountsQuery->where('section_code', $user->section_code);
            } else {
                $bankAccountsQuery->where('company_code', $user->company_code);
            }
        }
        $bankAccounts = $bankAccountsQuery->orderBy('bank_name')->get();

        return Inertia::render('Sales/Create', [
            'nextInvoiceNo' => $this->getNextInvoiceNoPreview(),
            'currentDate'   => $today,
            'dayBalance'    => $dayBalance,
            'bankAccounts'  => $bankAccounts,
        ]);
    }

    public function show(SalesTransaction $sale)
    {
        if (!request()->user()->hasPermission('sales.view')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view sales.');
        }

        $sale->load(['items.item', 'payments', 'cashier', 'customer']);
        
        // Transform items to include customer discount rate for printers and stationary items
        $transformedItems = $sale->items->map(function ($item) {
            $itemData = $item->toArray();
            
            // Add fallback for item_name if it's missing in the database
            if (empty($itemData['item_name'])) {
                $itemData['item_name'] = $item->item->ItmNm ?? 'Item ' . $item->item_code;
            }
            
            // For printers (items with serial_number), fetch customer discount rate by serial number
            if (!empty($item->serial_number)) {
                $purchaseDetail = \App\Models\PurchaseDet::where('serial_number', $item->serial_number)
                    ->orderBy('PerchaseDetKy', 'desc')
                    ->first();
                
                if ($purchaseDetail) {
                    $itemData['cus_discount_rate'] = (float)($purchaseDetail->CusDiscountRate ?? 0);
                } else {
                    $itemData['cus_discount_rate'] = 0;
                }
            } else {
                // For stationary items (no serial_number), fetch by item key or batch+name
                $purchaseDetail = \App\Models\PurchaseDet::where(function ($query) use ($item) {
                    if (!empty($item->item_code)) {
                        $itemKey = ItemMaster::where('ItemCode', $item->item_code)->value('ItmKy');
                        if (!empty($itemKey)) {
                            $query->where('iTimKy', $itemKey);
                        }
                    }
                    if (!empty($item->batch_no)) {
                        $query->orWhere('batch_no', $item->batch_no);
                    }
                })
                    ->orderBy('PerchaseDetKy', 'desc')
                    ->first();
                
                if ($purchaseDetail) {
                    $itemData['cus_discount_rate'] = (float)($purchaseDetail->CusDiscountRate ?? 0);
                } else {
                    $itemData['cus_discount_rate'] = 0;
                }
            }
            
            // Override warranty with custom warranty from additional_data if present
            if (!empty($item->additional_data['warranty'])) {
                $itemData['warranty'] = $item->additional_data['warranty'];
            }
            
            return $itemData;
        });
        
        // Replace items with transformed items
        $saleData = $sale->toArray();
        $saleData['items'] = $transformedItems;
        $saleData['payments'] = $sale->payments;
        $saleData['customer'] = $sale->customer;
        $saleData['cashier'] = $sale->cashier;
        
        // Get company details for invoice header
        $company = \App\Models\Company::first();
        
        return Inertia::render('Sales/Show', [
            'sale' => $saleData,
            'company' => $company
        ]);
    }

    public function edit(SalesTransaction $sale)
    {
        // Allow access if the user has the permission OR if an admin just authorised this specific sale
        $adminAuthorized = session()->pull('sale_edit_authorized_id') === $sale->id;

        if (!$adminAuthorized && !request()->user()->hasPermission('sales.edit')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to edit sales.');
        }

        $sale->load(['items', 'payments', 'cashier', 'customer']);

        // Transform the data to match the form structure
        $saleData = [
            'invoice_no' => $sale->invoice_no,
            'transaction_date' => \Carbon\Carbon::parse($sale->transaction_date)->format('Y-m-d'),
            'customer_code' => $sale->customer_code,
            'customer_name' => $sale->customer_name,
            'customer_vat_no' => $sale->customer?->vat_no ?? '',
            'is_vat_invoice' => $sale->is_vat_invoice,
            'vat_rate' => $sale->vat_rate,
            'price_type' => $sale->price_type,
            'items' => $sale->items->map(function ($item) {
                // Fetch current item master data for prices and stock
                $itemMaster = ItemMaster::where('ItemCode', $item->item_code)->first();
                
                $retailPrice = $itemMaster ? (float)$itemMaster->SlsPri : (float)($item->unit_price ?? 0);
                $wholesalePrice = 0;
                $vehicleSalePrice = 0;
                $cardPrice = 0;
                $stock = 0;
                $cusDiscountRate = 0;
                $cusDiscountType = 'fixed';
                $batchPriceDetail = null;
                $tier1Qty = null; $tier1Dis = null;
                $tier2Qty = null; $tier2Dis = null;
                $credTier1Qty = null; $credTier1Dis = null;
                $credTier2Qty = null; $credTier2Dis = null;

                // Resolve tier discounts + discount type (RtDisType1) the same way
                // searchItems() does: company item_price_det first (scoped to this
                // sale line's batch, like the batch lookup in searchItems), then
                // a batch-less fallback, then itemmaster.
                if ($itemMaster) {
                    $priceQuery = \App\Models\ItemPriceDet::where('ItmKy', $itemMaster->ItmKy)
                        ->where('Status', 'A')
                        ->where('fInAct', false)
                        ->where('company_code', Auth::user()->company_code ?? '');

                    // item_price_det rows are per batch (batch_no, default 'DEFAULT'),
                    // so prefer the record for this line's batch...
                    if (!empty($item->batch_no)) {
                        $batchPriceDetail = (clone $priceQuery)
                            ->where('batch_no', $item->batch_no)
                            ->orderBy('ItemPriceKey', 'desc')
                            ->first();
                    }
                    // ...then fall back to the item's latest record for any batch.
                    $priceDetail = $batchPriceDetail ?: $priceQuery->orderBy('ItemPriceKey', 'desc')->first();

                    $src = $priceDetail ?: $itemMaster;
                    $cusDiscountType = $this->normalizeDiscountType($src->RtDisType1 ?: ($itemMaster->RtDisType1 ?? null));
                    $tier1Qty = $priceDetail ? ($priceDetail->RtQty1 ?: $itemMaster->RtQty1) : $itemMaster->RtQty1;
                    $tier1Dis = $priceDetail ? ($priceDetail->RtDis1 ?: $itemMaster->RtDis1) : $itemMaster->RtDis1;
                    $tier2Qty = $priceDetail ? ($priceDetail->RtQty2 ?: $itemMaster->RtQty2) : $itemMaster->RtQty2;
                    $tier2Dis = $priceDetail ? ($priceDetail->RtDis2 ?: $itemMaster->RtDis2) : $itemMaster->RtDis2;
                    $credTier1Qty = $priceDetail ? ($priceDetail->CredQty1 ?: $itemMaster->CredQty1) : $itemMaster->CredQty1;
                    $credTier1Dis = $priceDetail ? ($priceDetail->CredDis1 ?: $itemMaster->CredDis1) : $itemMaster->CredDis1;
                    $credTier2Qty = $priceDetail ? ($priceDetail->CredQty2 ?: $itemMaster->CredQty2) : $itemMaster->CredQty2;
                    $credTier2Dis = $priceDetail ? ($priceDetail->CredDis2 ?: $itemMaster->CredDis2) : $itemMaster->CredDis2;
                }

                // For printers (items with serial_number), fetch customer discount rate AND all prices from purchase_det
                // (mirrors searchPrinters() logic: purchase_det has the authoritative per-unit prices)
                if (!empty($item->serial_number)) {
                    $purchaseDetail = \App\Models\PurchaseDet::where('serial_number', $item->serial_number)
                        ->orderBy('PerchaseDetKy', 'desc')
                        ->first();
                    
                    if ($purchaseDetail) {
                        $cusDiscountRate = (float)($purchaseDetail->CusDiscountRate ?? 0);
                        // purchase_det is the discount-type source only when this batch
                        // has no company item_price_det record (mirrors searchPrinters(),
                        // which prefers item_price_det.RtDisType1).
                        if (empty($batchPriceDetail) && !empty($purchaseDetail->discount_type)) {
                            $cusDiscountType = $this->normalizeDiscountType($purchaseDetail->discount_type);
                        }
                        // Resolve prices the same way searchPrinters() does
                        $prDetRetail    = (float)$purchaseDetail->SalePrice;
                        $retailPrice    = $prDetRetail    ?: $retailPrice;
                        $vehicleSalePrice     = (float)$purchaseDetail->VehicleSalePrice ?: $retailPrice;
                    }
                }
                
                // For non-printer items: get current stock from ItemMaster
                // and expose the current ItemMaster prices for the frontend so that the UI 
                // "Our Price" and "Sales Price" columns display correctly as they do in Create mode.
                if ($itemMaster && empty($item->serial_number)) {
                    $vehicleSalePrice = (float)($itemMaster->VehicleSalePrice ?? $retailPrice);
                    
                    // For stationary items, also fetch customer discount rate from purchase_det.
                    // Scope by ItmKy AND batch_no: an OR here matched any item sharing the
                    // same batch number ('DEFAULT' is shared across many items).
                    $purchaseDetail = \App\Models\PurchaseDet::where('iTimKy', $itemMaster->ItmKy);
                    if (!empty($item->batch_no)) {
                        $purchaseDetail->where('batch_no', $item->batch_no);
                    }
                    $purchaseDetail = $purchaseDetail->orderBy('PerchaseDetKy', 'desc')->first();

                    if ($purchaseDetail) {
                        $cusDiscountRate = (float)($purchaseDetail->CusDiscountRate ?? 0);
                        // purchase_det is the discount-type source only when this batch
                        // has no company item_price_det record (mirrors searchItems()).
                        if (!$batchPriceDetail && !empty($purchaseDetail->discount_type)) {
                            $cusDiscountType = $this->normalizeDiscountType($purchaseDetail->discount_type);
                        }
                    }
                    
                    // Get current stock from stock_in_hand table for the SPECIFIC BATCH
                    $sectionCode = Auth::user()->section_code ?? 'MAIN';
                    $stockQuery = StockInHand::where('ItemKy', $itemMaster->ItmKy)
                        ->where('section_code', $sectionCode);
                    
                    // Filter by batch_no if item has one
                    if (!empty($item->batch_no)) {
                        $stockQuery->where('batch_no', $item->batch_no);
                    }
                    
                    $stockRecord = $stockQuery->selectRaw('SUM(Qty + COALESCE(FreeQty, 0)) as total_qty')
                        ->first();
                    $stock = $stockRecord ? (float)$stockRecord->total_qty : 0;
                }
                
                return [
                    'item_code' => $item->item_code,
                    'item_name' => $itemMaster->ItmNm ?? 'N/A',
                    'unit_price' => (float)($item->unit_price ?? 0),
                    'our_price' => (float)($item->our_price ?? $item->unit_price ?? 0),
                    'cost_price' => (float)($item->cost_price ?? 0),
                    'quantity' => (float)($item->quantity ?? 1),
                    'free_quantity' => (float)($item->free_quantity ?? 0),
                    'total' => (float)($item->line_total ?? 0),
                    'discount_amount' => (float)($item->discount_amount ?? 0),
                    'discount_percentage' => (float)($item->discount_percentage ?? 0),
                    'discount_type' => $item->discount_type ?? null,
                    'cus_discount_rate' => $cusDiscountRate,
                    'cus_discount_type' => $cusDiscountType,
                    'stock' => $stock,
                    'retail_price' => (float)$retailPrice,
                    'wholesale_min_qty' => null,
                    'vehicle_sale_price' => (float)$vehicleSalePrice,
                    'batch_no' => $item->batch_no,
                    'itm_ky' => $item->product_id ?? $item->original_item_id,
                    'serial_number' => $item->serial_number,
                    'brand' => $item->brand,
                    'model' => $item->model,
                    'warranty' => $item->additional_data['warranty'] ?? $item->warranty,
                    'barcode' => $item->barcode,
                    'category' => $item->category,
                    'unit' => $item->unit,
                    // For non-printer items: always read VATItem from current ItemMaster since old sale
                    // records have default(false) stored which is unreliable for VAT-inclusive items.
                    // For printers: use the stored value from the sale item (VATItem not applicable).
                    'vat_inclusive' => empty($item->serial_number)
                        ? (bool)($itemMaster?->VATItem ?? false)
                        : (bool)($item->vat_inclusive ?? false),
                    'free_issue_scheme_buy_qty' => null,
                    'free_issue_scheme_get_qty' => null,
                    'tier1_qty' => $tier1Qty,
                    'tier1_discount' => $tier1Dis,
                    'tier2_qty' => $tier2Qty,
                    'tier2_discount' => $tier2Dis,
                    'cred_tier1_qty' => $credTier1Qty,
                    'cred_tier1_discount' => $credTier1Dis,
                    'cred_tier2_qty' => $credTier2Qty,
                    'cred_tier2_discount' => $credTier2Dis,
                    'is_service' => $itemMaster ? (bool)$itemMaster->is_service : false,
                ];
            })->toArray(),
            'payment_mode' => $sale->payment_mode,
            'subtotal' => $sale->subtotal,
            'discount_amount' => $sale->discount_amount ?? 0,
            'discount_percentage' => $sale->discount_percentage ?? 0,
            'manual_discount_fixed' => $sale->manual_discount_fixed ?? 0,
            'total_discount' => $sale->total_discount ?? 0,
            'tax_amount' => $sale->tax_amount ?? 0,
            'total_amount' => $sale->total_amount,
            'cash_payment' => $sale->payments->where('method', 'cash')->sum('amount') ?: ($sale->payment_details['cash'] ?? 0),
            'card_payment' => $sale->payments->where('method', 'card')->sum('amount') ?: ($sale->payment_details['card'] ?? 0),
            'cheque_payment' => $sale->payments->where('method', 'cheque')->sum('amount') ?: ($sale->payment_details['cheque'] ?? 0),
            'bank_transfer_payment' => $sale->payments->where('method', 'bank')->sum('amount') ?: ($sale->payment_details['bank_transfer'] ?? 0),
            'cheque_no' => $sale->payment_details['cheque_no'] ?? null,
            'cheque_bank' => $sale->payment_details['cheque_bank'] ?? null,
            'cheque_branch' => $sale->payment_details['cheque_branch'] ?? null,
            'cheque_date' => $sale->payment_details['cheque_date'] ?? null,
            'bank_ref' => $sale->payment_details['bank_ref'] ?? null,
            'bank_name' => $sale->payment_details['bank_name'] ?? null,
            'bank_branch' => $sale->payment_details['bank_branch'] ?? null,
            'bank_account_id' => $sale->payment_details['bank_account_id'] ?? null,
            'balance_amount' => $sale->balance_amount ?? 0,
        ];

        // also load active bank accounts for dropdowns
        $user = Auth::user();
        $bankAccountsQuery = \App\Models\BankAccount::where('status', 'active');
        if ($user && $user->role_id !== 1) {
            if ($user->role_id === 3) {
                $bankAccountsQuery->where('section_code', $user->section_code);
            } else {
                $bankAccountsQuery->where('company_code', $user->company_code);
            }
        }
        $bankAccounts = $bankAccountsQuery->orderBy('bank_name')->get();

        return Inertia::render('Sales/Edit', [
            'sale' => $saleData,
            'saleId' => $sale->id,
            'currentDate' => date('Y-m-d'),
            'bankAccounts' => $bankAccounts,
        ]);
    }

    public function update(Request $request, SalesTransaction $sale)
    {
        if (!request()->user()->hasPermission('sales.edit')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to edit sales.');
        }

        $user = request()->user();
        if (!in_array($user->role_id, [1, 2, 5], true)) {
            $isReconciled = \App\Models\CashReconciliation::where('user_id', $user->id)
                ->whereDate('reconciliation_date', $request->input('transaction_date', $sale->transaction_date))
                ->exists();
            if ($isReconciled) {
                if ($request->wantsJson() || $request->ajax()) {
                    return response()->json(['message' => 'Cash reconciliation already completed for this date. No further transactions are allowed.', 'errors' => ['transaction_date' => ['Cash reconciliation already completed for this date.']]], 422);
                }
                return redirect()->back()->with('error', 'Cash reconciliation already completed for this date. No further transactions are allowed.');
            }
        }

        $validated = $request->validate([
            'transaction_date' => 'required|date',
            'customer_code' => 'nullable|string',
            'customer_name' => 'nullable|string',
            'price_type' => 'required|string',
            'subtotal' => 'required|numeric',
            'total_amount' => 'required|numeric',
            'is_vat_invoice' => 'nullable|boolean',
            'vat_rate' => 'nullable|numeric',
            'discount_amount' => 'nullable|numeric|min:0',
            'discount_percentage' => 'nullable|numeric|min:0',
            'cash_payment' => 'nullable|numeric|min:0',
            'card_payment' => 'nullable|numeric|min:0',
            'points_redeem' => 'nullable|numeric|min:0',
            'cheque_payment' => 'nullable|numeric|min:0',
            'bank_transfer_payment' => 'nullable|numeric|min:0',
            'cheque_no' => 'nullable|string',
            'cheque_bank' => 'nullable|string',
            'cheque_branch' => 'nullable|string',
            'cheque_date' => 'nullable|date',
            'bank_ref' => 'nullable|string',
            'bank_name' => 'nullable|string',
            'bank_branch' => 'nullable|string',
            'bank_account_id' => 'nullable|integer|exists:bank_accounts,id',
            'payment_mode' => 'required|string',
            'items' => 'required|array|min:1',
            'items.*.item_code' => 'required|string',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric',
        ]);

        return DB::transaction(function () use ($request, $sale) {
            // Validate that the frontend subtotal matches the items array to prevent React state desync bugs
            $calculatedSubtotal = 0;
            foreach ($request->items as $item) {
                $itemGross = ($item['unit_price'] ?? 0) * ($item['quantity'] ?? 0);
                $calculatedSubtotal += $itemGross;
            }
            
            // Allow a tiny floating point tolerance
            if (abs($calculatedSubtotal - $request->subtotal) > 0.05) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'subtotal' => 'Calculated subtotal (' . $calculatedSubtotal . ') does not match submitted subtotal (' . $request->subtotal . '). Please refresh the page and try again.'
                ]);
            }

            // Find customer
            $customer = Customer::where('AdrCd', $request->customer_code)
                ->where('company_code', Auth::user()->company_code)
                ->first();

            // Store original items for stock adjustment
            $originalItems = $sale->items->toArray();

            // Capture OLD initial balance and payment details BEFORE the update
            $oldPaymentDetails = $sale->payment_details;
            $oldPaid = (float)($oldPaymentDetails['cash'] ?? 0) + 
                       (float)($oldPaymentDetails['card'] ?? 0) + 
                       (float)($oldPaymentDetails['bank_transfer'] ?? 0) + 
                       (float)($oldPaymentDetails['cheque'] ?? 0) +
                       (float)($oldPaymentDetails['points'] ?? 0);
            $oldInitialBalance = (float)$sale->total_amount - $oldPaid;

            // Determine sale type based on new items
            $hasPrinters = collect($request->items)->contains(fn($item) => !empty($item['serial_number']));
            $saleType = $hasPrinters ? 'printer' : 'item';

            // For cheque payments, require a registered customer
            if ($request->payment_mode === 'cheque') {
                if (!$request->customer_code || $request->customer_code === '0001') {
                    return response()->json([
                        'message' => 'Registered customer required for cheque payments',
                        'errors' => ['customer' => 'Registered customer required for cheque payments']
                    ], 422);
                }
            }

            // For printer sales, require a registered customer
            if ($saleType === 'printer') {
                if (!$request->customer_code || $request->customer_code === '0001') {
                    return response()->json([
                        'message' => 'Registered customer required for printer sales',
                        'errors' => ['customer' => 'Registered customer required for printer sales']
                    ], 422);
                }
            }

            // Validate serial numbers – no duplicates within the same sale
            $serialNumbers = collect($request->items)
                ->filter(fn($item) => !empty($item['serial_number']))
                ->pluck('serial_number')
                ->toArray();

            if (count($serialNumbers) !== count(array_unique($serialNumbers))) {
                return response()->json([
                    'message' => 'Duplicate printer serial numbers detected in this sale. Each printer can only be sold once.',
                    'errors' => ['items' => 'Cannot sell the same printer multiple times in one transaction']
                ], 422);
            }

            // Validate stock availability for all items before making any changes.
            // Because adjustStockLevels() will reverse the original items, the effective
            // available stock per item is: current_db_stock + original_qty_for_that_item.
            $sectionCode = Auth::user()->section_code ?? 'MAIN';

            // Build a lookup of original quantities keyed by (product_id|batch_no|serial_number)
            $originalQtyMap = [];
            foreach ($originalItems as $orig) {
                $key = ($orig['product_id'] ?? '') . '|' . ($orig['batch_no'] ?? '') . '|' . ($orig['serial_number'] ?? '');
                $originalQtyMap[$key] = ($originalQtyMap[$key] ?? 0) + ($orig['quantity'] ?? 0) + ($orig['free_quantity'] ?? 0);
            }

            foreach ($request->items as $itemData) {
                $itmKy = $itemData['itm_ky'] ?? null;
                if (!$itmKy) continue;

                $requestedQty = ($itemData['quantity'] ?? 0) + ($itemData['free_quantity'] ?? 0);
                $batchNo = $itemData['batch_no'] ?? null;
                $serialNumber = $itemData['serial_number'] ?? null;

                // Lock the ItemMaster row to prevent race conditions
                ItemMaster::where('ItmKy', $itmKy)->lockForUpdate()->first();

                // Query current stock
                $query = StockInHand::where('ItemKy', $itmKy)
                    ->where('section_code', $sectionCode);

                if ($serialNumber) {
                    $query->where('serial_number', $serialNumber);
                } elseif ($batchNo) {
                    $query->where('batch_no', $batchNo);
                }

                $currentStock = $query->sum(DB::raw('COALESCE(Qty, 0) + COALESCE(FreeQty, 0)'));

                // Add back original qty that will be reversed by adjustStockLevels()
                $origKey = $itmKy . '|' . ($batchNo ?? '') . '|' . ($serialNumber ?? '');
                $originalQty = $originalQtyMap[$origKey] ?? 0;
                $effectiveAvailable = $currentStock + $originalQty;

                if ($effectiveAvailable < $requestedQty) {
                    $itemMaster = ItemMaster::where('ItmKy', $itmKy)->first();
                    if (!$itemMaster || !$itemMaster->is_service) {
                        $itemDesc = $itemData['item_name'];
                        if ($serialNumber) $itemDesc .= " (S/N: $serialNumber)";
                        elseif ($batchNo) $itemDesc .= " (Batch: $batchNo)";

                        throw \Illuminate\Validation\ValidationException::withMessages([
                            'items' => "Insufficient stock for item '{$itemDesc}'. Available: " . number_format($effectiveAvailable, 2) . ", Requested: " . number_format($requestedQty, 2)
                        ]);
                    }
                }
            }

            // Capture OLD bank details BEFORE the update overwrites payment_details
            $oldBankId  = $sale->payment_details['bank_account_id'] ?? null;
            $oldBankAmt = (float) ($sale->payment_details['bank_transfer'] ?? 0);
            $oldCardBankId = $sale->payment_details['card_bank_account_id'] ?? null;
            $oldCardBankAmt = (float) ($sale->payment_details['card'] ?? 0);

            // Calculate new balance and status based on updated payments
            $totalPaid = (float)($request->cash_payment ?? 0) + (float)($request->card_payment ?? 0) + (float)($request->points_redeem ?? 0) + (float)($request->cheque_payment ?? 0) + (float)($request->bank_transfer_payment ?? 0);
            $initialBalance = round((float)$request->total_amount - $totalPaid, 2);
            $appliedCredit = 0;

            $newBalance = round($initialBalance - $appliedCredit, 2);
            $manualDiscount = (float) ($request->discount_amount ?? 0);
            $itemDiscountTotal = collect($request->items)->sum(function ($item) {
                return (float) ($item['discount_amount'] ?? 0);
            });
            $hasCreditContext = $request->payment_mode === 'credit' || $newBalance > 0;
            
            // Recalculate status based on new balance
            $isRegisteredCustomer = $customer && $request->customer_code !== '0001';
            
            $newStatus = 'completed';
            $finalPaymentMode = $request->payment_mode;



            // Only restrict partial payments (balance > 1 rupee) for unregistered customers.
            // Small rounding differences (< Rs.1) are treated as fully paid.
            if ($request->payment_mode === 'credit' || $newBalance > 1) {
                if ($isRegisteredCustomer) {
                    $newStatus = ($newBalance <= 1) ? 'completed' : 'partially_paid';
                    if ($newBalance > 1) {
                        $finalPaymentMode = 'credit';
                    }
                } else {
                    // For unregistered customers, require full payment
                    if ($newBalance > 1) {
                        return response()->json([
                            'message' => 'Partial payments are only allowed for registered customers. Please register the customer or pay the full amount.',
                            'errors' => ['payment' => 'Partial payments require customer registration']
                        ], 422);
                    }
                }
            }

            // Delete existing items and payments
            $sale->items()->delete();
            $sale->payments()->delete();

            // Update sale transaction
            $sale->update([
                'transaction_date' => $request->transaction_date,
                'customer_code' => $request->customer_code,
                'customer_name' => $request->customer_name,
                'price_type' => $request->price_type,
                'subtotal' => $request->subtotal,
                'discount_amount' => $request->discount_amount ?? 0,
                'discount_percentage' => $request->discount_percentage ?? 0,
                'manual_discount_fixed' => $request->manual_discount_fixed ?? 0,
                'total_discount' => $request->total_discount ?? 0,
                'tax_amount' => $request->tax_amount ?? 0,
                'total_amount' => $request->total_amount,
                'is_vat_invoice' => $request->is_vat_invoice ?? false,
                'vat_rate' => $request->vat_rate ?? 0,
                'payment_mode' => $finalPaymentMode,
                'balance_amount' => $newBalance,
                'status' => $newStatus,
                'points_redeem' => $request->points_redeem ?? 0,

                // Ensure payment summary stored on the transaction is updated so
                // invoice views and summaries reflect the edited payment values.
                'payment_details' => [
                    'mode' => $finalPaymentMode,
                    'cash' => $request->cash_payment ?? 0,
                    'card' => $request->card_payment ?? 0,
                    'points' => $request->points_redeem ?? 0,
                    'cheque' => $request->cheque_payment ?? 0,
                    'bank_transfer' => $request->bank_transfer_payment ?? 0,
                    'credit' => $newBalance > 0 ? $newBalance : 0,
                    'change' => $newBalance < 0 ? abs($newBalance) : 0,
                    'applied_credit' => $appliedCredit,
                    'cheque_no' => $request->cheque_no ?? null,
                    'cheque_bank' => $request->cheque_bank ?? null,
                    'cheque_branch' => $request->cheque_branch ?? null,
                    'cheque_date' => $request->cheque_date ?? null,
                    'bank_ref' => $request->bank_ref ?? null,
                    'bank_name' => $request->bank_name ?? null,
                    'bank_branch' => $request->bank_branch ?? null,
                    'bank_account_id' => $request->bank_account_id ?? null,
                    'card_bank_account_id' => $request->card_bank_account_id ?? null,
                ],
            ]);

            // Create new items
            foreach ($request->items as $index => $itemData) {
                // ensure we don't push non-numeric strings into bigint column
                $productId = isset($itemData['itm_ky']) && is_numeric($itemData['itm_ky'])
                    ? $itemData['itm_ky']
                    : null;

                $sale->items()->create([
                    'uuid' => (string) Str::uuid(),
                    'invoice_no' => $sale->invoice_no,
                    'item_code' => $itemData['item_code'],
                    'category' => $itemData['category'] ?? null,
                    'unit' => $itemData['unit'] ?? null,
                    'batch_no' => $itemData['batch_no'] ?? null,
                    'product_id' => $productId,
                    'company_code' => Auth::user()->company_code ?? null,
                    'section_code' => Auth::user()->section_code ?? 'MAIN',
                    'original_item_id' => $itemData['itm_ky'] ?? null,
                    'unit_price' => $itemData['unit_price'],
                    'our_price' => $itemData['our_price'] ?? $itemData['unit_price'],
                    'cost_price' => $itemData['cost_price'] ?? 0,
                    'quantity' => $itemData['quantity'],
                    'free_quantity' => $itemData['free_quantity'] ?? 0,
                    'discount_amount' => $itemData['discount_amount'] ?? 0,
                    'cus_discount_rate' => $itemData['cus_discount_rate'] ?? 0,
                    'line_total' => $itemData['total'],
                    'line_number' => $index + 1,
                    'price_type' => $request->price_type,
                    'serial_number' => $itemData['serial_number'] ?? null,
                    'vat_inclusive' => $itemData['vat_inclusive'] ?? false,
                    'additional_data' => !empty($itemData['warranty']) ? ['warranty' => $itemData['warranty']] : null,
                ]);
            }

            // adjust bank account balances: reverse old transfer, apply new transfer
            if ($oldBankId && $oldBankAmt > 0) {
                $oldBank = \App\Models\BankAccount::lockForUpdate()->find($oldBankId);
                if ($oldBank) {
                    $oldBank->current_balance = (float)$oldBank->current_balance - $oldBankAmt;
                    $oldBank->save();
                }
            }
            if (($request->bank_transfer_payment ?? 0) > 0 && $request->bank_account_id) {
                $newBank = \App\Models\BankAccount::lockForUpdate()->find($request->bank_account_id);
                if ($newBank) {
                    $newBank->current_balance = (float)$newBank->current_balance + (float)$request->bank_transfer_payment;
                    $newBank->save();
                }
            }

            // adjust card bank balances
            if ($oldCardBankId && $oldCardBankAmt > 0) {
                $oldCardBank = \App\Models\BankAccount::lockForUpdate()->find($oldCardBankId);
                if ($oldCardBank) {
                    $oldCardBank->current_balance = (float)$oldCardBank->current_balance - $oldCardBankAmt;
                    $oldCardBank->save();
                }
            }
            if (($request->card_payment ?? 0) > 0 && $request->card_bank_account_id) {
                $newCardBank = \App\Models\BankAccount::lockForUpdate()->find($request->card_bank_account_id);
                if ($newCardBank) {
                    $newCardBank->current_balance = (float)$newCardBank->current_balance + (float)$request->card_payment;
                    $newCardBank->save();
                }
            }

            // Sync Cashier Sales Account Balance
            $oldFat = \App\Models\FinanceAccountTransaction::where('source_type', 'Sale')
                ->where('source_id', $sale->id)
                ->first();
                
            $sectionCode = Auth::user()->section_code ?? 'MAIN';
            $cashierFinanceAccount = \App\Models\FinanceAccount::where('account_name', 'like', '%Cashier Sales%')
                ->where('section_code', $sectionCode)
                ->first() ?? \App\Models\FinanceAccount::find(40);
                
            if ($oldFat) {
                // Reverse the old transaction from the account balance
                $oldAccount = \App\Models\FinanceAccount::find($oldFat->finance_account_id);
                if ($oldAccount) {
                    if (in_array($oldAccount->main_category->value ?? 'assets', ['liabilities', 'revenue', 'equity'])) {
                        $oldAccount->current_balance += $oldFat->amount; // Reversing a debit on a liability increases it
                    } else {
                        $oldAccount->current_balance -= $oldFat->amount; // Reversing a debit on an asset decreases it
                    }
                    $oldAccount->save();
                }
                $oldFat->delete();
            }

            // Calculate new effective cash
            $changeAmount = $newBalance < 0 ? abs($newBalance) : 0;
            $effectiveCash = (float)($request->cash_payment ?? 0);
            if ($changeAmount > 0 && $effectiveCash > 0) {
                $deduct = min($effectiveCash, $changeAmount);
                $effectiveCash -= $deduct;
            }

            // Create new FAT if there is effective cash
            if ($effectiveCash > 0 && $cashierFinanceAccount) {
                if (in_array($cashierFinanceAccount->main_category->value ?? 'assets', ['liabilities', 'revenue', 'equity'])) {
                    $cashierFinanceAccount->current_balance -= $effectiveCash; // Debit decreases liability/revenue
                } else {
                    $cashierFinanceAccount->current_balance += $effectiveCash; // Debit increases asset
                }
                $cashierFinanceAccount->save();
                
                \App\Models\FinanceAccountTransaction::create([
                    'finance_account_id' => $cashierFinanceAccount->id,
                    'date' => $request->transaction_date,
                    'source_type' => 'Sale',
                    'source_id' => $sale->id,
                    'description' => 'Cash Sale (Edited) - ' . $sale->invoice_no,
                    'type' => 'debit',
                    'amount' => $effectiveCash,
                    'running_balance' => 0
                ]);
            }
            // Create payment records for each payment method used
            if ($customer) {
                $paymentMethods = [];

                if (($request->cash_payment ?? 0) > 0) {
                    $changeAmount = $newBalance < 0 ? abs($newBalance) : 0;
                    $effectiveCash = (float)($request->cash_payment ?? 0);
                    if ($changeAmount > 0 && $effectiveCash > 0) {
                        $deduct = min($effectiveCash, $changeAmount);
                        $effectiveCash -= $deduct;
                    }

                    if ($effectiveCash > 0) {
                        $paymentMethods[] = [
                            'method' => 'cash',
                            'amount' => $effectiveCash,
                        ];
                    }
                }

                if (($request->card_payment ?? 0) > 0) {
                    $paymentMethods[] = [
                        'method' => 'card',
                        'amount' => $request->card_payment,
                    ];
                }

                if (($request->points_redeem ?? 0) > 0) {
                    $paymentMethods[] = [
                        'method' => 'points',
                        'amount' => $request->points_redeem,
                    ];
                }

                if (($request->cheque_payment ?? 0) > 0) {
                    $paymentMethods[] = [
                        'method' => 'cheque',
                        'amount' => $request->cheque_payment,
                        'cheque_no' => $request->cheque_no ?? null,
                        'bank_name' => $request->cheque_bank ?? null,
                        'branch' => $request->cheque_branch ?? null,
                        'cheque_date' => $request->cheque_date ?? null,
                    ];
                }

                if (($request->bank_transfer_payment ?? 0) > 0) {
                    $paymentMethods[] = [
                        'method' => 'bank',
                        'amount' => $request->bank_transfer_payment,
                        'reference' => $request->bank_ref ?? null,
                        'bank_name' => $request->bank_name ?? null,
                        'branch' => $request->bank_branch ?? null,
                    ];
                }

                // Create payment records for each method
                foreach ($paymentMethods as $payment) {
                    CustomerPayment::create([
                        'customer_id' => $customer->AdrKy,
                        'customer_code' => $request->customer_code,
                        'sales_transaction_id' => $sale->id,
                        'amount' => $payment['amount'],
                        'date' => $request->transaction_date,
                        'method' => $payment['method'],
                        'cheque_no' => $payment['cheque_no'] ?? null,
                        'bank_name' => $payment['bank_name'] ?? null,
                        'branch' => $payment['branch'] ?? null,
                        'cheque_date' => $payment['cheque_date'] ?? null,
                        'reference' => $payment['reference'] ?? $sale->invoice_no,
                        'notes' => "Updated {$payment['method']} payment for sale",
                        'status' => 'completed',
                        'collected_by' => Auth::id(),
                    ]);
                }
            }

            // Update Customer Account Balance (AccMas)
            if ($customer) {
                $accMas = AccMas::where('AccKy', $customer->AccKy)->first();
                if ($accMas) {
                    // Reverse the OLD initial balance (the debt part of the original sale)
                    if ($oldInitialBalance > 0) {
                        $accMas->decrement('CurBal', $oldInitialBalance);
                    }
                    
                    // Apply the NEW initial balance (the debt part of the updated sale)
                    if ($initialBalance > 0) {
                        $accMas->increment('CurBal', $initialBalance);
                    }
                }
            }

            // Adjust stock levels
            $this->adjustStockLevels($request->items, $originalItems);

            $dayBalance = $this->calculateCashBalance(Auth::user(), date('Y-m-d'));
            return redirect()->route('sales.show', $sale)->with([
                'success' => 'Sale updated successfully.',
                'dayBalance' => $dayBalance
            ]);
        });
    }

    public function store(Request $request)
    {
        if (!request()->user()->hasPermission('sales.create')) {
             return redirect()->back()->with('error', 'Unauthorized. You do not have permission to create sales.');
        }

        $user = request()->user();
        if (!in_array($user->role_id, [1, 2, 5], true)) {
            $isReconciled = \App\Models\CashReconciliation::where('user_id', $user->id)
                ->whereDate('reconciliation_date', $request->input('transaction_date', date('Y-m-d')))
                ->exists();
            if ($isReconciled) {
                if ($request->wantsJson() || $request->ajax()) {
                    return response()->json(['message' => 'Cash reconciliation already completed for this date. No further transactions are allowed.', 'errors' => ['transaction_date' => ['Cash reconciliation already completed for this date.']]], 422);
                }
                return redirect()->back()->with('error', 'Cash reconciliation already completed for this date. No further transactions are allowed.');
            }
        }

        $validated = $request->validate([
            'transaction_date' => 'required|date',
            'customer_code' => 'nullable|string',
            'customer_name' => 'nullable|string',
            'price_type' => 'required|string',
            'subtotal' => 'required|numeric',
            'total_amount' => 'required|numeric',
            'is_vat_invoice' => 'nullable|boolean',
            'vat_rate' => 'nullable|numeric',
            'discount_amount' => 'nullable|numeric|min:0',
            'discount_percentage' => 'nullable|numeric|min:0',
            'manual_discount_fixed' => 'nullable|numeric|min:0',
            'cash_payment' => 'nullable|numeric|min:0',
            'card_payment' => 'nullable|numeric|min:0',
            'points_redeem' => 'nullable|numeric|min:0',
            'cheque_payment' => 'nullable|numeric|min:0',
            'bank_transfer_payment' => 'nullable|numeric|min:0',
            'credit_used' => 'nullable|numeric|min:0',
            'cheque_no' => 'nullable|string',
            'cheque_bank' => 'nullable|string',
            'cheque_branch' => 'nullable|string',
            'cheque_date' => 'nullable|date',
            'bank_ref' => 'nullable|string',
            'bank_name' => 'nullable|string',
            'bank_branch' => 'nullable|string',
            'bank_account_id' => 'nullable|integer|exists:bank_accounts,id',
            'payment_mode' => 'required|string',
            'items' => 'required|array|min:1',
            'items.*.item_code' => 'required|string',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric',
        ]);

        return DB::transaction(function () use ($request) {
            // Validate that the frontend subtotal matches the items array to prevent React state desync bugs
            $calculatedSubtotal = 0;
            foreach ($request->items as $item) {
                $itemGross = ($item['unit_price'] ?? 0) * ($item['quantity'] ?? 0);
                $calculatedSubtotal += $itemGross;
            }
            
            // Allow a tiny floating point tolerance
            if (abs($calculatedSubtotal - $request->subtotal) > 0.05) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'subtotal' => 'Calculated subtotal (' . $calculatedSubtotal . ') does not match submitted subtotal (' . $request->subtotal . '). Please refresh the page and try again.'
                ]);
            }

            // Determine sale type based on items
            $hasPrinters = collect($request->items)->contains(fn($item) => !empty($item['serial_number']));
            $saleType = $hasPrinters ? 'printer' : 'item';

            // For printer sales, require customer selection
            if ($saleType === 'printer') {
                if (!$request->customer_code || $request->customer_code === '0001') {
                    return response()->json([
                        'message' => 'Registered customer required for printer sales',
                        'errors' => ['customer' => 'Registered customer required for printer sales']
                    ], 422);
                }
            }

            $invoiceNo = $this->generateInvoiceNo($saleType);

            // Validate serial numbers for printers - ensure no duplicates in the same sale
            $serialNumbers = collect($request->items)
                ->filter(fn($item) => !empty($item['serial_number']))
                ->pluck('serial_number')
                ->toArray();
            
            if (count($serialNumbers) !== count(array_unique($serialNumbers))) {
                return response()->json([
                    'message' => 'Duplicate printer serial numbers detected in this sale. Each printer can only be sold once.',
                    'errors' => ['items' => 'Cannot sell the same printer multiple times in one transaction']
                ], 422);
            }

            // Validate stock availability for ALL items with locking to prevent race conditions
            foreach ($request->items as $itemData) {
                $itmKy = $itemData['itm_ky'] ?? null;
                if (!$itmKy) continue;

                $requestedQty = ($itemData['quantity'] ?? 0) + ($itemData['free_quantity'] ?? 0);
                $batchNo = $itemData['batch_no'] ?? null;
                $serialNumber = $itemData['serial_number'] ?? null;
                $sectionCode = Auth::user()->section_code ?? 'MAIN';

                // 1. Lock the ItemMaster record to serialize access to this item's stock
                // This ensures that while we are checking and deducting stock, no one else can do the same 
                // for this item, preventing race conditions.
                $lock = ItemMaster::where('ItmKy', $itmKy)->lockForUpdate()->first();

                // 2. Query valid stock
                $query = StockInHand::where('ItemKy', $itmKy)
                    ->where('section_code', $sectionCode);

                if ($serialNumber) {
                    $query->where('serial_number', $serialNumber);
                } elseif ($batchNo) {
                    $query->where('batch_no', $batchNo);
                }

                $currentStock = $query->sum(DB::raw('COALESCE(Qty, 0) + COALESCE(FreeQty, 0)'));

                if ($currentStock < $requestedQty) {
                    if (!$lock || !$lock->is_service) {
                        $itemDesc = $itemData['item_name'];
                        if ($serialNumber) $itemDesc .= " (S/N: $serialNumber)";
                        elseif ($batchNo) $itemDesc .= " (Batch: $batchNo)";

                        throw \Illuminate\Validation\ValidationException::withMessages([
                            'items' => "Insufficient stock for item '{$itemDesc}'. Available: " . number_format($currentStock, 2) . ", Requested: " . number_format($requestedQty, 2)
                        ]);
                    }
                }
            }

            // Filter by company to prevent cross-company AdrKy mismatch
            $customer = Customer::where('AdrCd', $request->customer_code)
                ->where('company_code', Auth::user()->company_code)
                ->first();
            
            // For cheque payments, require a registered customer
            if ($request->payment_mode === 'cheque' && (!$customer || $request->customer_code === '0001')) {
                return response()->json([
                    'message' => 'Registered customer required for cheque payments',
                    'errors' => ['customer' => 'Please select a valid registered customer']
                ], 422);
            }

            // For printer sales, ensure customer exists
            if ($saleType === 'printer' && !$customer) {
                return response()->json([
                    'message' => 'Registered customer required for printer sales',
                    'errors' => ['customer' => 'Please select a valid registered customer']
                ], 422);
            }

            $creditUsed = (float) ($request->credit_used ?? 0);

            // Validate that credit_used does not exceed customer's available credit
            if ($creditUsed > 0) {
                if (!$customer || $request->customer_code === '0001') {
                    return response()->json([
                        'message' => 'Credit balance can only be applied for registered customers.',
                        'errors' => ['credit_used' => 'Registered customer required to apply credit balance']
                    ], 422);
                }
                $outstandingBalance = $customer->calculateOutstandingBalance();
                // outstandingBalance < 0 means credit. Available credit = abs(outstandingBalance) when negative
                $availableCredit = $outstandingBalance < 0 ? abs($outstandingBalance) : 0;
                if ($creditUsed > $availableCredit + 0.01) {
                    return response()->json([
                        'message' => 'Credit used exceeds the customer available credit balance.',
                        'errors' => ['credit_used' => 'Insufficient credit balance']
                    ], 422);
                }
            }

            $totalPaid = (float)($request->cash_payment ?? 0) + (float)($request->card_payment ?? 0) + (float)($request->points_redeem ?? 0) + (float)($request->cheque_payment ?? 0) + (float)($request->bank_transfer_payment ?? 0) + (float)$creditUsed;
            $initialBalance = round((float)$request->total_amount - $totalPaid, 2);
            $appliedCredit = 0;

            $balance = round($initialBalance - $appliedCredit, 2);
            $manualDiscount = (float) ($request->discount_amount ?? 0);
            $itemDiscountTotal = collect($request->items)->sum(function ($item) {
                return (float) ($item['discount_amount'] ?? 0);
            });
            // Only restrict discounts when there is an actual unpaid remaining balance.
            // A fully-settled sale (via cash, card, or credit balance) should always allow discounts.
            $hasCreditContext = $balance > 0;

            // Only allow partial payments for registered customers
            $isRegisteredCustomer = $customer && $request->customer_code !== '0001';

            $status = 'completed';
            $finalPaymentMode = $request->payment_mode;



            // Only restrict partial payments (balance > 1 rupee) for unregistered customers.
            // Small rounding differences (< Rs.1) are treated as fully paid.
            if ($request->payment_mode === 'credit' || $balance > 1) {
                if ($isRegisteredCustomer) {
                    $status = ($balance <= 1) ? 'completed' : 'partially_paid';
                    if ($balance > 1) {
                        $finalPaymentMode = 'credit';
                    }
                } else {
                    // For unregistered customers, require full payment
                    if ($balance > 1) {
                        return response()->json([
                            'message' => 'Partial payments are only allowed for registered customers. Please register the customer or pay the full amount.',
                            'errors' => ['payment' => 'Partial payments require customer registration']
                        ], 422);
                    }
                }
            }
            
            $sale = SalesTransaction::create([
                'uuid' => (string) Str::uuid(),
                'invoice_no' => $invoiceNo,
                'transaction_date' => $request->transaction_date,
                'section_code' => Auth::user()->section_code, // Added section_code
                'customer_code' => $request->customer_code,
                'customer_name' => $request->customer_name,
                'customer_id' => $customer ? $customer->AdrKy : null,
                'cashier_id' => Auth::id(),
                'price_type' => $request->price_type,
                'subtotal' => $request->subtotal,
                'discount_amount' => $request->discount_amount ?? 0,
                'discount_percentage' => $request->discount_percentage ?? 0,
                'manual_discount_fixed' => $request->manual_discount_fixed ?? 0,
                'tax_amount' => $request->tax_amount ?? 0,
                'vat_rate' => $request->vat_rate ?? 0,
                'is_vat_invoice' => $request->is_vat_invoice ?? false,
                'total_amount' => $request->total_amount,
                'total_discount' => $request->total_discount ?? 0,
                'balance_amount' => $balance,
                'payment_details' => [
                    'mode' => $finalPaymentMode,
                    'cash' => $request->cash_payment ?? 0,
                    'card' => $request->card_payment ?? 0,
                    'points' => $request->points_redeem ?? 0,
                    'cheque' => $request->cheque_payment ?? 0,
                    'bank_transfer' => $request->bank_transfer_payment ?? 0,
                    'credit_applied' => $creditUsed,
                    'credit' => $balance > 0 ? $balance : 0,
                    'change' => $balance < 0 ? abs($balance) : 0,
                    'applied_credit' => $appliedCredit,
                    'cheque_no' => $request->cheque_no ?? null,
                    'cheque_bank' => $request->cheque_bank ?? null,
                    'cheque_branch' => $request->cheque_branch ?? null,
                    'cheque_date' => $request->cheque_date ?? null,
                    'bank_ref' => $request->bank_ref ?? null,
                    'bank_name' => $request->bank_name ?? null,
                    'bank_branch' => $request->bank_branch ?? null,
                    'bank_account_id' => $request->bank_account_id ?? null,
                    'card_bank_account_id' => $request->card_bank_account_id ?? null,
                ],
                'status' => $status,
                'completed_at' => now(),
            ]);

            // if bank transfer occurred, update bank account balance
            if (($request->bank_transfer_payment ?? 0) > 0 && $request->bank_account_id) {
                $bank = \App\Models\BankAccount::lockForUpdate()->find($request->bank_account_id);
                if ($bank) {
                    $bank->current_balance = (float)$bank->current_balance + (float)$request->bank_transfer_payment;
                    $bank->save();
                }
            }

            // if card payment occurred, update bank account balance
            if (($request->card_payment ?? 0) > 0 && $request->card_bank_account_id) {
                $cardBank = \App\Models\BankAccount::lockForUpdate()->find($request->card_bank_account_id);
                if ($cardBank) {
                    $cardBank->current_balance = (float)$cardBank->current_balance + (float)$request->card_payment;
                    $cardBank->save();
                }
            }

            // Record to Cashier Sales Finance Account
            $cashierFinanceAccount = \App\Models\FinanceAccount::where('account_name', 'like', '%Cashier Sales%')
                ->where('section_code', Auth::user()->section_code)
                ->first();
            
            if (!$cashierFinanceAccount) {
                $cashierFinanceAccount = \App\Models\FinanceAccount::find(40); // Fallback to ID 40
            }

            if ($cashierFinanceAccount && ($request->cash_payment ?? 0) > 0) {
                $changeAmount = $balance < 0 ? abs($balance) : 0;
                $effectiveCash = (float)($request->cash_payment ?? 0);
                if ($changeAmount > 0 && $effectiveCash > 0) {
                    $deduct = min($effectiveCash, $changeAmount);
                    $effectiveCash -= $deduct;
                }
                
                if ($effectiveCash > 0) {
                    \App\Models\FinanceAccountTransaction::create([
                        'finance_account_id' => $cashierFinanceAccount->id,
                        'date' => $request->transaction_date,
                        'source_type' => 'Sale',
                        'source_id' => $sale->id,
                        'description' => 'Cash Sale - ' . $invoiceNo,
                        'type' => 'debit',
                        'amount' => $effectiveCash,
                        'running_balance' => 0
                    ]);
                    
                    if (in_array($cashierFinanceAccount->main_category->value, ['liabilities', 'revenue', 'equity'])) {
                        $cashierFinanceAccount->current_balance -= $effectiveCash;
                    } else {
                        $cashierFinanceAccount->current_balance += $effectiveCash;
                    }
                    $cashierFinanceAccount->save();
                }
            }

            // Generate separate stock reference number different from invoice number
            $stockRefNo = 'STK-' . str_pad($sale->id, 6, '0', STR_PAD_LEFT);

            // Create payment records for each payment method used
            if ($customer) {
                $paymentMethods = [];

                if (($request->cash_payment ?? 0) > 0) {
                    $changeAmount = $balance < 0 ? abs($balance) : 0;
                    $effectiveCash = (float)($request->cash_payment ?? 0);
                    if ($changeAmount > 0 && $effectiveCash > 0) {
                        $deduct = min($effectiveCash, $changeAmount);
                        $effectiveCash -= $deduct;
                    }

                    if ($effectiveCash > 0) {
                        $paymentMethods[] = [
                            'method' => 'cash',
                            'amount' => $effectiveCash,
                        ];
                    }
                }

                if (($request->card_payment ?? 0) > 0) {
                    $paymentMethods[] = [
                        'method' => 'card',
                        'amount' => $request->card_payment,
                    ];
                }

                if (($request->points_redeem ?? 0) > 0) {
                    $paymentMethods[] = [
                        'method' => 'points',
                        'amount' => $request->points_redeem,
                    ];
                }

                if (($request->cheque_payment ?? 0) > 0) {
                    $paymentMethods[] = [
                        'method' => 'cheque',
                        'amount' => $request->cheque_payment,
                        'cheque_no' => $request->cheque_no ?? null,
                        'bank_name' => $request->cheque_bank ?? null,
                        'branch' => $request->cheque_branch ?? null,
                        'cheque_date' => $request->cheque_date ?? null,
                    ];
                }

                if (($request->bank_transfer_payment ?? 0) > 0) {
                    $paymentMethods[] = [
                        'method' => 'bank',
                        'amount' => $request->bank_transfer_payment,
                        'reference' => $request->bank_ref ?? null,
                        'bank_name' => $request->bank_name ?? null,
                        'branch' => $request->bank_branch ?? null,
                    ];
                }

                // Create payment records for each method
                foreach ($paymentMethods as $payment) {
                    CustomerPayment::create([
                        'customer_id' => $customer->AdrKy,
                        'customer_code' => $request->customer_code,
                        'sales_transaction_id' => $sale->id,
                        'amount' => $payment['amount'],
                        'date' => $request->transaction_date,
                        'method' => $payment['method'],
                        'cheque_no' => $payment['cheque_no'] ?? null,
                        'bank_name' => $payment['bank_name'] ?? null,
                        'branch' => $payment['branch'] ?? null,
                        'cheque_date' => $payment['cheque_date'] ?? null,
                        'reference' => $payment['reference'] ?? $invoiceNo,
                        'notes' => "Initial {$payment['method']} payment for sale",
                        'status' => 'completed',
                        'collected_by' => Auth::id(),
                    ]);
                }

                // Create a CustomerPayment record for credit balance applied toward this sale
                if ($creditUsed > 0) {
                    CustomerPayment::create([
                        'customer_id'          => $customer->AdrKy,
                        'customer_code'        => $request->customer_code,
                        'sales_transaction_id' => $sale->id,
                        'amount'               => $creditUsed,
                        'date'                 => $request->transaction_date,
                        'method'               => 'credit_applied',
                        'reference'            => $invoiceNo,
                        'notes'                => 'Credit balance applied toward sale ' . $invoiceNo,
                        'status'               => 'completed',
                        'collected_by'         => Auth::id(),
                    ]);
                }
            }

            foreach ($request->items as $index => $itemData) {
                // ensure product_id is numeric to avoid inserting strings into bigint column
                $productId = isset($itemData['itm_ky']) && is_numeric($itemData['itm_ky'])
                    ? $itemData['itm_ky']
                    : null;

                $sale->items()->create([
                    'uuid' => (string) Str::uuid(),
                    'invoice_no' => $invoiceNo,
                    'item_code' => $itemData['item_code'],
                    'unit' => is_array($itemData['unit'] ?? null) ? ($itemData['unit']['UnitCd'] ?? null) : ($itemData['unit'] ?? null),
                    'batch_no' => $itemData['batch_no'] ?? null,
                    'product_id' => $productId,
                    'company_code' => Auth::user()->company_code ?? null,
                    'section_code' => Auth::user()->section_code ?? 'MAIN',
                    'original_item_id' => $itemData['itm_ky'] ?? null,
                    'unit_price' => $itemData['unit_price'],
                    'our_price' => $itemData['our_price'] ?? $itemData['unit_price'],
                    'cost_price' => $itemData['cost_price'] ?? 0,
                    'quantity' => $itemData['quantity'],
                    'free_quantity' => $itemData['free_quantity'] ?? 0,
                    'discount_amount' => $itemData['discount_amount'] ?? 0,
                    'cus_discount_rate' => $itemData['cus_discount_rate'] ?? 0,
                    'line_total' => $itemData['total'],
                    'line_number' => $index + 1,
                    'price_type' => $request->price_type,
                    'serial_number' => is_array($itemData['serial_number'] ?? null) ? null : ($itemData['serial_number'] ?? null),
                    'vat_inclusive' => (bool)($itemData['vat_inclusive'] ?? false),
                    'additional_data' => !empty($itemData['warranty']) ? ['warranty' => $itemData['warranty']] : null,
                ]);

                // Update stock logic - Create a new row in stock_in_hand for the sale
                // Use SAL-NOS when selling individual (NOS) units from a conversion,
                // SAL-BND when selling a bundle (pack) of a convertible item,
                // and SAL for regular (non-convertible) items.
                // This lets bundle_stock queries distinguish new bundle sales (SAL-BND)
                // from legacy pre-SAL-NOS NOS sales that were stored as plain SAL.
                // Note: Service items (is_service=true) do NOT create stock_in_hand records
                $salTrnTyp = 'SAL';
                if (($itemData['sell_unit_type'] ?? '') === 'nos') {
                    $salTrnTyp = 'SAL-NOS';
                } elseif (($itemData['sell_unit_type'] ?? '') === 'bundle') {
                    $salTrnTyp = 'SAL-BND';
                }

                // Check if this is a service item
                $isServiceItem = false;
                if (isset($itemData['itm_ky'])) {
                    $itemMaster = ItemMaster::where('ItmKy', $itemData['itm_ky'])->select('is_service')->first();
                    $isServiceItem = $itemMaster && $itemMaster->is_service;
                }

                // Only create stock_in_hand record for regular items, skip for service items
                if (!$isServiceItem) {
                    StockInHand::create([
                        'RefNo' => $stockRefNo,
                        'OrdDate' => $request->transaction_date,
                        'ItemKy' => $itemData['itm_ky'] ?? null,
                        'Qty' => -$itemData['quantity'],
                        'FreeQty' => -($itemData['free_quantity'] ?? 0),
                        'TrnTyp' => $salTrnTyp,
                        'batch_no' => $itemData['batch_no'] ?? null,
                        'company_code' => Auth::user()->company_code ?? null,
                        'owner_company_code' => Auth::user()->company_code ?? null, // Owner is the selling company
                        'section_code' => Auth::user()->section_code ?? 'MAIN', // Use user's section
                        'serial_number' => is_array($itemData['serial_number'] ?? null) ? null : ($itemData['serial_number'] ?? null),
                        'unit' => is_array($itemData['unit'] ?? null) ? ($itemData['unit']['UnitCd'] ?? null) : ($itemData['unit'] ?? null),
                    ]);
                }
            }

            // Update Customer Account Balance (AccMas)
            if ($customer) {
                $accMas = AccMas::where('AccKy', $customer->AccKy)->first();
                if ($accMas) {
                    // If there is an unpaid balance (credit sale), add it as debt
                    if ($initialBalance > 0) {
                        $accMas->CurBal = (float)($accMas->CurBal ?? 0) + $initialBalance;
                        $accMas->save();
                    }
                    // If customer credit was applied, reduce their credit balance
                    // CurBal is negative for credit (e.g. -14400 means customer has 14400 CR)
                    // Applying 3950 CR: CurBal = -14400 + 3950 = -10450
                    if ($creditUsed > 0) {
                        $accMas->refresh();
                        $accMas->CurBal = (float)($accMas->CurBal ?? 0) + $creditUsed;
                        $accMas->save();
                    }
                }
            }

            $dayBalance = $this->calculateCashBalance(Auth::user(), date('Y-m-d'));

            // Return success response with sale ID for invoice generation
            return response()->json([
                'success' => true,
                'message' => 'Sale saved successfully. Invoice: ' . $invoiceNo,
                'sale_id' => $sale->id,
                'invoice_no' => $invoiceNo,
                'dayBalance' => $dayBalance,
            ]);
        });
    }

    public function searchCustomers(Request $request)
    {
        $query = $request->input('query');
        $date = $request->input('date');
        $type = $request->input('type');

        $customers = Customer::where(function ($q) use ($query) {
            $q->where('AdrCd', 'like', "%{$query}%")
                ->orWhere('FstNm', 'like', "%{$query}%")
                ->orWhere('LstNm', 'like', "%{$query}%")
                ->orWhere('TP1', 'like', "%{$query}%");
        });

        if ($type === 'customer') {
            $customers->where(function($q) {
                $q->where('AdrCd', 'like', 'CUS%')
                  ->orWhere('AdrCd', '0001');
            });
        }

        // Filter by company code
        $user = Auth::user();
        if ($user && $user->company_code) {
            $customers->where('company_code', $user->company_code);
        }

        return $customers->limit(10)
            ->get()
            ->map(function (Customer $item) {
                return [
                    'code' => $item->AdrCd,
                    'name' => trim($item->FstNm . ' ' . $item->LstNm),
                    'phone' => $item->TP1,
                    'is_vat_registered' => (bool)$item->fVATRegistered,
                    'vat_no' => $item->VATNo,
                    'is_privilege_user' => (bool)$item->is_privilege_user,
                    'outstanding_balance' => $item->calculateOutstandingBalance(),
                ];
            });
    }

    public function searchItems(Request $request)
    {
        $query = $request->input('query');
        $category = $request->input('category');
        $price = $request->input('price');
        $supplier = $request->input('supplier');

        // Determine the current user's business unit key for sharing logic
        $user = Auth::user();
        $businessUnit = $this->getUserBusinessUnit($user);

        $itemsQuery = ItemMaster::query()
            ->with(['priceDetails' => function($q) use ($user) {
                // Filter by the authenticated user's company so that cross-company unit-converted
                // prices (e.g. per-sheet price created when a bundle was transferred to Malibo)
                // are used instead of the sender company's bundle-level prices.
                $q->where('Status', 'A')
                  ->where('company_code', $user->company_code ?? '')
                  ->where('fInAct', false)
                  ->orderBy('ItemPriceKey', 'desc');
            }, 'category', 'unit', 'supplier'])
            // Only return items that belong to the user's company OR are shared with their business unit
            ->where(function ($q) use ($user, $businessUnit) {
                $q->where('company_code', $user->company_code ?? '')
                  ->orWhereJsonContains('available_business_units', $businessUnit);
            });

        // Search Query
        if ($query) {
            $itemsQuery->where(function ($q) use ($query) {
                $q->where('ItemCode', 'like', "%{$query}%")
                    ->orWhere('BarCode', 'like', "%{$query}%")
                    ->orWhere('ItmNm', 'like', "%{$query}%");
            });
        }

        // Category Filter
        if ($category && $category !== 'all') {
            $itemsQuery->whereHas('category', function ($q) use ($category) {
                $q->where('cname', $category);
            });
        }

        // Price Search (Type and Auto Search)
        if ($price && $price !== 'all') {
             // Use LIKE to find items starting with or containing the price digits
             // This mimics "type and auto search" behavior better than exact match
             $itemsQuery->where(function($q) use ($price) {
                  $q->where('SlsPri', 'LIKE', "{$price}%")
                    ->orWhere('SlsPri', 'LIKE', "%{$price}%");
             });
        }

        // Supplier Filter
        if ($supplier && $supplier !== 'all') {
             if (is_numeric($supplier)) {
                 $itemsQuery->where('SupKey', $supplier);
             } else {
                 $itemsQuery->whereHas('supplier', function($q) use ($supplier) {
                     $q->where('AccNm', $supplier);
                 });
             }
        }

        return $itemsQuery->limit(50)
            ->get()
            ->map(function ($item) {
                // Fetch stock grouped by batch for this item in current section
                $user = Auth::user();
                $sectionCode = $user->section_code ?? 'MAIN';
                $stocks = StockInHand::where('ItemKy', $item->ItmKy)
                    ->where('section_code', $sectionCode)
                    ->where(function ($q) {
                        $q->whereNull('batch_no')
                          ->orWhere('batch_no', '')
                          ->orWhere('batch_no', 'not like', 'GRN-VIS-VIS-%')
                          ->orWhere('batch_no', '>=', 'GRN-VIS-VIS-0026');
                    })
                    ->select('batch_no', DB::raw('SUM(Qty + COALESCE(FreeQty, 0)) as total_qty'))
                    ->groupBy('batch_no')
                    ->having('total_qty', '>', 0)
                    ->get();

                $priceDetail = $item->priceDetails->first();
                $baseItem = [
                    'item_code' => $item->ItemCode,
                    'item_name' => $item->ItmNm,
                    'unit_price' => (float)(($priceDetail->SlsPri ?? null) ?: $item->SlsPri),
                    'cost_price' => (float)(($priceDetail->NCostPrice ?? null) ?: $item->NCostPrice),
                    'retail_price' => (float)(($priceDetail->SlsPri ?? null) ?: $item->SlsPri),
                    'vehicle_sale_price' => (float)($priceDetail ? $priceDetail->VehicleSalePrice : ($item->VehicleSalePrice ?? $item->SlsPri)),
                    'barcode' => $item->BarCode,
                    'brand' => $item->brand ? $item->brand->name : null,
                    'model' => null,
                    'serial_number' => null,
                    'warranty' => $item->warranty,
                    'category' => $item->category ? $item->category->cname : null,
                    'supplier' => $item->supplier ? $item->supplier->AccNm : null,
                    'unit' => $item->unit ? $item->unit->UnitCd : null,
                    'itm_ky' => $item->ItmKy,
                    'is_service' => (bool)$item->is_service,
                    'vat_inclusive' => (bool)$item->VATItem,
                    'cus_discount_rate' => 0, // Default, will be overridden by batch
                    'cus_discount_type' => $this->normalizeDiscountType($item->RtDisType1),
                    'transfer_conversion_factor' => (float)($item->transfer_conversion_factor ?? 1),
                    'from_unit_name' => $item->transfer_unit_id
                        ? DB::table('code_masters')->where('id', $item->transfer_unit_id)->value('cname')
                        : null,
                    'to_unit_name' => $item->receiving_unit_id
                        ? DB::table('code_masters')->where('id', $item->receiving_unit_id)->value('cname')
                        : null,
                    'free_issue_scheme_buy_qty' => null,
                    'free_issue_scheme_get_qty' => null,
                    'wholesale_min_qty' => null,
                    'tiers' => [
                        'tier1' => ['qty' => $priceDetail?->RtQty1 ?: $item->RtQty1, 'discount' => $priceDetail?->RtDis1 ?: $item->RtDis1],
                        'tier2' => ['qty' => $priceDetail?->RtQty2 ?: $item->RtQty2, 'discount' => $priceDetail?->RtDis2 ?: $item->RtDis2],
                    ],
                    'cred_tiers' => [
                        'tier1' => ['qty' => $priceDetail?->CredQty1 ?: $item->CredQty1, 'discount' => $priceDetail?->CredDis1 ?: $item->CredDis1],
                        'tier2' => ['qty' => $priceDetail?->CredQty2 ?: $item->CredQty2, 'discount' => $priceDetail?->CredDis2 ?: $item->CredDis2],
                    ],
                ];

                if ($stocks->isEmpty()) {
                    return array_merge($baseItem, ['stock' => 0, 'batches' => []]);
                }

                $batches = $stocks->map(function ($stk) use ($baseItem, $item, $user) {
                    // Priority 1: company-specific price record in item_price_det.
                    // This is where the unit-converted price lives after a cross-company
                    // transfer (e.g. 580 bundle ÷ 100 = 5.80 per sheet for Malibo).
                    $companyPrice = DB::table('item_price_det')
                        ->where('ItmKy', $item->ItmKy)
                        ->where('batch_no', $stk->batch_no)
                        ->where('company_code', $user->company_code ?? '')
                        ->where('fInAct', false)
                        ->whereIn('Status', ['A', 'U'])
                        ->orderBy('ItemPriceKey', 'desc')
                        ->first();

                    // Priority 2: batch-level purchase detail (Vismass GRN data).
                    $purchaseDet = \App\Models\PurchaseDet::where('batch_no', $stk->batch_no)
                        ->where('iTimKy', $item->ItmKy)
                        ->orderBy('PerchaseDetKy', 'desc')
                        ->first();

                    $batchPrices = [];
                    if ($companyPrice) {
                        // Use the company-specific (possibly unit-converted) price
                        $batchPrices = [
                            'unit_price'      => (float)$companyPrice->SlsPri,
                            'retail_price'    => (float)$companyPrice->SlsPri,
                            'vehicle_sale_price'     => (float)($companyPrice->VehicleSalePrice ?: $companyPrice->SlsPri),
                            'cost_price'      => (float)$companyPrice->NCostPrice,
                            'cus_discount_rate' => (float)(empty((float)$companyPrice->RtDis1) ? ($item->RtDis1 ?: 0) : $companyPrice->RtDis1),
                            'cus_discount_type' => $this->normalizeDiscountType($companyPrice->RtDisType1 ?: ($item->RtDisType1 ?? null)),
                            'tiers' => [
                                'tier1' => [
                                    'qty' => empty((float)$companyPrice->RtQty1) ? $item->RtQty1 : $companyPrice->RtQty1, 
                                    'discount' => empty((float)$companyPrice->RtDis1) ? $item->RtDis1 : $companyPrice->RtDis1
                                ],
                                'tier2' => [
                                    'qty' => empty((float)$companyPrice->RtQty2) ? $item->RtQty2 : $companyPrice->RtQty2, 
                                    'discount' => empty((float)$companyPrice->RtDis2) ? $item->RtDis2 : $companyPrice->RtDis2
                                ],
                                'tier3' => [
                                    'qty' => null, 
                                    'discount' => null
                                ],
                                'tier4' => [
                                    'qty' => null, 
                                    'discount' => null
                                ],
                            ],
                            'cred_tiers' => [
                                'tier1' => [
                                    'qty' => empty((float)$companyPrice->CredQty1) ? $item->CredQty1 : $companyPrice->CredQty1, 
                                    'discount' => empty((float)$companyPrice->CredDis1) ? $item->CredDis1 : $companyPrice->CredDis1
                                ],
                                'tier2' => [
                                    'qty' => empty((float)$companyPrice->CredQty2) ? $item->CredQty2 : $companyPrice->CredQty2, 
                                    'discount' => empty((float)$companyPrice->CredDis2) ? $item->CredDis2 : $companyPrice->CredDis2
                                ],
                            ],
                        ];
                    } elseif ($purchaseDet) {
                        // Fall back to GRN purchase detail prices
                        $batchPrices = [
                            'unit_price'      => (float)$purchaseDet->SalePrice,
                            'retail_price'    => (float)$purchaseDet->SalePrice,
                            'vehicle_sale_price'     => (float)$purchaseDet->VehicleSalePrice,
                            'cost_price'      => (float)$purchaseDet->CostPrice,
                            'cus_discount_rate' => (float)($purchaseDet->CusDiscountRate ?: $item->RtDis1 ?: 0),
                            'cus_discount_type' => $this->normalizeDiscountType($purchaseDet->discount_type ?: ($item->RtDisType1 ?? null)),
                            'tiers' => [
                                'tier1' => ['qty' => $item->RtQty1, 'discount' => $item->RtDis1],
                                'tier2' => ['qty' => $item->RtQty2, 'discount' => $item->RtDis2],
                            ],
                            'cred_tiers' => [
                                'tier1' => ['qty' => $item->CredQty1, 'discount' => $item->CredDis1],
                                'tier2' => ['qty' => $item->CredQty2, 'discount' => $item->CredDis2],
                            ],
                        ];
                    }

                    // Fallback: when no batch-specific price is found (e.g. stock-converted
                    // batches that have no item_price_det or purchase_det record), try to
                    // find a valid retail_price from other sources so the batch selection
                    // modal never shows 0.
                    if (empty($batchPrices['retail_price'])) {
                        // 1) Try the base item's retail_price (from item_price_det or itemmaster)
                        $fallbackPrice = $baseItem['retail_price'] ?? 0;

                        // 2) If base is also 0, look for any item_price_det record for this
                        //    item + company (ignoring batch) that has a non-zero SlsPri
                        if (empty($fallbackPrice)) {
                            $anyPrice = DB::table('item_price_det')
                                ->where('ItmKy', $item->ItmKy)
                                ->where('company_code', $user->company_code ?? '')
                                ->where('fInAct', false)
                                ->whereIn('Status', ['A', 'U'])
                                ->where('SlsPri', '>', 0)
                                ->orderBy('ItemPriceKey', 'desc')
                                ->first();
                            if ($anyPrice) {
                                $fallbackPrice = (float)$anyPrice->SlsPri;
                            }
                        }

                        // 3) Last resort: use the itemmaster's default SlsPri
                        if (empty($fallbackPrice)) {
                            $fallbackPrice = (float)($item->SlsPri ?? 0);
                        }

                        $batchPrices['retail_price'] = $fallbackPrice;
                    }
                    if (empty($batchPrices['unit_price'])) {
                        $batchPrices['unit_price'] = $batchPrices['retail_price'];
                    }
                    if (empty($batchPrices['cost_price'])) {
                        $batchPrices['cost_price'] = $baseItem['cost_price'] ?? 0;
                    }

                    // bundle_stock = all rows that represent bundle-level stock movements:
                    // Determine if this section ever had CNV-IN rows — if so, plain SAL rows
                    // at this section are legacy NOS-level sales (before SAL-NOS was introduced).
                    // Detect conversion activity: forward CNV-IN% credits OR reverse RCNV-OUT%
                    // NOS debits both indicate that unit-splitting has been used at this section.
                    $hasConversionRows = DB::table('stock_in_hand')
                        ->where('ItemKy', $item->ItmKy)
                        ->where('section_code', $user->section_code ?? 'MAIN')
                        ->where('batch_no', $stk->batch_no)
                        ->where(function ($q) {
                            $q->where('RefNo', 'LIKE', 'CNV-IN%')
                              ->orWhere('RefNo', 'LIKE', 'RCNV-OUT%');
                        })
                        ->exists();

                    //   GRN, TRF-IN (pack transfers), CNV-OUT (packs going into conversion), SAL-BND (new bundle sales)
                    // Exclude:
                    //   CNV-IN% (NOS credits from conversion)
                    //   SAL-NOS (NOS-level sales)
                    //   plain SAL when CNV-IN rows exist at this section — those are legacy NOS sales
                    //     that were stored as SAL before SAL-NOS was introduced.
                    // Use NULL-safe comparisons: MySQL NOT LIKE / != silently drop NULL rows.
                    $bundleStock = (float)DB::table('stock_in_hand')
                        ->where('ItemKy', $item->ItmKy)
                        ->where('section_code', $user->section_code ?? 'MAIN')
                        ->where('batch_no', $stk->batch_no)
                        ->where(function ($q) {
                            // Exclude CNV-IN% (forward NOS credits) and RCNV-OUT% (reverse NOS debits)
                            // both represent NOS-level movements, not bundle-level.
                            // Treat NULL RefNo as bundle-level (include).
                            $q->whereNull('RefNo')
                              ->orWhere(function ($q2) {
                                  $q2->where('RefNo', 'NOT LIKE', 'CNV-IN%')
                                     ->where('RefNo', 'NOT LIKE', 'RCNV-OUT%');
                              });
                        })
                        ->where(function ($q) use ($hasConversionRows) {
                            // Always exclude SAL-NOS.
                            // When CNV-IN rows exist, also exclude old plain SAL rows
                            // (they are legacy NOS-level sales stored before SAL-NOS was introduced).
                            // New bundle sales at converted sections use SAL-BND and are still counted.
                            if ($hasConversionRows) {
                                $q->whereNull('TrnTyp')
                                  ->orWhereNotIn('TrnTyp', ['SAL-NOS', 'SAL']);
                            } else {
                                $q->whereNull('TrnTyp')
                                  ->orWhere('TrnTyp', '!=', 'SAL-NOS');
                            }
                        })
                        ->sum(DB::raw('Qty + COALESCE(FreeQty, 0)'));

                    // nos_stock = CNV-IN% credits (forward NOS additions)
                    //           + RCNV-OUT% debits (reverse NOS removals, stored negative)
                    //           + SAL-NOS debits (NOS-level sales)
                    $nosStock = (float)DB::table('stock_in_hand')
                        ->where('ItemKy', $item->ItmKy)
                        ->where('section_code', $user->section_code ?? 'MAIN')
                        ->where('batch_no', $stk->batch_no)
                        ->where(function ($q) {
                            $q->where('RefNo', 'LIKE', 'CNV-IN%')
                              ->orWhere('RefNo', 'LIKE', 'RCNV-OUT%')
                              ->orWhere('TrnTyp', 'SAL-NOS');
                        })
                        ->sum(DB::raw('Qty + COALESCE(FreeQty, 0)'));

                    return array_merge($baseItem, $batchPrices, [
                        'batch_no'     => $stk->batch_no,
                        'stock'        => (float)$stk->total_qty,
                        'bundle_stock' => max(0, $bundleStock),
                        'nos_stock'    => max(0, $nosStock),
                    ]);
                })->values();

                return array_merge($baseItem, [
                    'stock'        => $batches->sum('stock'),
                    'nos_stock'    => $batches->sum('nos_stock'),
                    'bundle_stock' => $batches->sum('bundle_stock'),
                    'batches'      => $batches
                ]);
            })
            ->take(50)
            ->values();
    }

    public function getSuppliers()
    {
        $user = Auth::user();
        if (!$user) return response()->json([]);

        return AccMas::where('AccTyp', 'SUPPLIER')
            ->where('Status', 'A') // Active only
            ->where('company_code', $user->company_code ?? Auth::guard('company')->user()->company_code)
            // ->whereNull('deleted_at') // If using SoftDeletes
            ->orderBy('AccNm')
            ->select('AccKy', 'AccNm')
            ->get();
    }

    public function getCategories()
    {
        $user = Auth::user();
        if (!$user) return response()->json([]);

        // Get categories that are actually used in active items or all categories
        // For better UX, we'll return all active categories
        return CodeMaster::where('conkey', 'CAT')
            ->where('is_active', true)
            ->where('company_code', $user->company_code ?? Auth::guard('company')->user()->company_code)
            ->whereNull('deleted_at')
            ->orderBy('cname')
            ->pluck('cname');
    }

    public function searchPrinters(Request $request)
    {
        $query = $request->input('query');
        if (empty($query)) return response()->json([]);

        // when editing a sale we may want to include printers already on that sale even
        // if their stock quantity appears to be zero (because the original sale
        // consumed it). frontend sends sale_id when editing.
        $saleSerials = [];
        if ($request->has('sale_id') && $request->input('sale_id')) {
            $sale = SalesTransaction::find($request->input('sale_id'));
            if ($sale) {
                $saleSerials = $sale->items->pluck('serial_number')->filter()->toArray();
            }
        }

        // Search from purchase_det table for printers (GRN data)
        $purchaseQuery = \App\Models\PurchaseDet::join('itemmaster as im', 'purchase_det.iTimKy', '=', 'im.ItmKy')
            ->leftJoin('brands as b', 'im.brand_id', '=', 'b.id')
            ->leftJoin('models as m', 'im.models_id', '=', 'm.id')
            ->select(
                'purchase_det.serial_number',
                'b.name as brand',
                'm.name as model',
                'im.warranty',
                'purchase_det.batch_no',
                'purchase_det.iTimKy as ItemKy',
                'purchase_det.SalePrice',
                'purchase_det.VehicleSalePrice',
                'purchase_det.CostPrice',
                'im.BarCode as barcode',
                'im.VATItem',
                'im.ItmNm as item_name',
                DB::raw('COALESCE(NULLIF(purchase_det.CusDiscountRate, 0), im.RtDis1, 0) as CusDiscountRate')
            )
            ->when(!$this->userIsSuperAdmin(Auth::user()), function($q) {
                return $q->where('purchase_det.company_code', Auth::user()->company_code);
            })
            ->whereNotNull('purchase_det.serial_number')
            ->where('purchase_det.serial_number', '!=', '')
            ->where(function($q) use ($query) {
                $q->where('purchase_det.serial_number', 'like', "%{$query}%")
                  ->orWhere('im.BarCode', '=', $query)
                  ->orWhere('im.ItmNm', 'like', "%{$query}%")
                  ->orWhere('b.name', 'like', "%{$query}%")
                  ->orWhere('m.name', 'like', "%{$query}%");
            });

        // Search from stock_adjustment_items table for printers (Adjustment data)
        // Join with stock_adjustments to filter by company_code
        $adjustmentQuery = \App\Models\StockAdjustmentItem::join('stock_adjustments', 'stock_adjustment_items.adjustment_id', '=', 'stock_adjustments.id')
            ->leftJoin('itemmaster as im', 'stock_adjustment_items.product_id', '=', 'im.ItmKy')
            ->select(
                'stock_adjustment_items.serial_number',
                DB::raw('NULL as brand'),
                DB::raw('NULL as model'),
                DB::raw('NULL as warranty'),
                'stock_adjustment_items.batch_no',
                'stock_adjustment_items.product_id as ItemKy',
                'stock_adjustment_items.sale_price as SalePrice',
                'stock_adjustment_items.vehicle_sale_price as VehicleSalePrice',
                'stock_adjustment_items.cost_price as CostPrice',
                'im.BarCode as barcode',
                DB::raw('im.VATItem'),
                'im.ItmNm as item_name',
                DB::raw('COALESCE(im.RtDis1, 0) as CusDiscountRate')
            )
            ->when(!$this->userIsSuperAdmin(Auth::user()), function($q) {
                return $q->where('stock_adjustments.company_code', Auth::user()->company_code);
            })
            ->whereNotNull('stock_adjustment_items.serial_number')
            ->where('stock_adjustment_items.serial_number', '!=', '')
            ->where(function($q) use ($query) {
                $q->where('stock_adjustment_items.serial_number', 'like', "%{$query}%")
                  ->orWhere('stock_adjustment_items.batch_no', 'like', "%{$query}%");
            });

        $purchaseResults = $purchaseQuery->union($adjustmentQuery)->get();

        // PERFORMANCE FIX: Batch load all needed data instead of N+1 queries
        $sectionCode = Auth::user()->section_code ?? 'MAIN';
        $serialNumbers = $purchaseResults->pluck('serial_number')->toArray();
        $itmKys = $purchaseResults->pluck('ItemKy')->filter()->toArray();

        // Fetch all stock records in ONE query (instead of one per printer)
        $stockMap = StockInHand::whereIn('serial_number', $serialNumbers)
            ->where('section_code', $sectionCode)
            ->select('serial_number', DB::raw('SUM(Qty + COALESCE(FreeQty, 0)) as total_qty'))
            ->groupBy('serial_number')
            ->pluck('total_qty', 'serial_number');

        // Fetch all ItemMaster records in ONE query (instead of one per printer)
        $baseItems = ItemMaster::whereIn('ItmKy', $itmKys)
            ->with(['priceDetails' => function($q) {
                $q->where('Status', 'A')->orderBy('ItemPriceKey', 'desc');
            }, 'category', 'unit'])
            ->get()
            ->keyBy('ItmKy');

        // Fetch exact batch prices to get the correct customer discount type
        $batchNos = $purchaseResults->pluck('batch_no')->filter()->toArray();
        $batchPrices = DB::table('item_price_det')
            ->whereIn('batch_no', $batchNos)
            ->whereIn('ItmKy', $itmKys)
            ->where('Status', 'A')
            ->get()
            ->keyBy(function($bp) {
                return $bp->ItmKy . '_' . $bp->batch_no;
            });

        return $purchaseResults->map(function ($purchase) use ($saleSerials, $stockMap, $baseItems, $batchPrices) {
            $availableStock = (float)($stockMap[$purchase->serial_number] ?? 0);

            if ($availableStock <= 0) {
                if (in_array($purchase->serial_number, $saleSerials, true)) {
                    $availableStock = 1;
                } else {
                    return null;
                }
            }

            $item = $purchase->ItemKy ? $baseItems[$purchase->ItemKy] ?? null : null;
            $priceDetail = $item ? ($item->priceDetails->first() ?? null) : null;
            $batchPrice = $batchPrices->get($purchase->ItemKy . '_' . $purchase->batch_no);

            $retailPrice = (float)($purchase->SalePrice ?: ($item ? $item->SlsPri : 0));
            $vehicleSalePrice = (float)($purchase->VehicleSalePrice ?: ($item ? ($item->VehicleSalePrice ?? $item->SlsPri) : 0));
            $costPrice = (float)($purchase->CostPrice ?: ($item ? $item->NCostPrice : 0));

            return [
                'item_code' => $item ? $item->ItemCode : 'PRINTER',
                'item_name' => $item ? $item->ItmNm : (($purchase->brand ?? '') . ' ' . ($purchase->model ?? '')),
                'serial_number' => $purchase->serial_number,
                'brand' => $purchase->brand,
                'model' => $purchase->model,
                'warranty' => $purchase->warranty,
                'batch_no' => $purchase->batch_no,
                'barcode' => $purchase->barcode ?: ($item ? $item->BarCode : null),
                'category' => $item && $item->category ? $item->category->cname : null,
                'unit' => $item && $item->unit ? $item->unit->UnitCd : null,
                'itm_ky' => $purchase->ItemKy,
                'is_service' => $item ? (bool)$item->is_service : false,
                'stock' => $availableStock,
                'unit_price' => $retailPrice,
                'cost_price' => $costPrice,
                'retail_price' => $retailPrice,
                'vehicle_sale_price' => $vehicleSalePrice,
                'vat_inclusive' => (bool)$purchase->VATItem,  // Check VATItem from purchase_det: 1=includes VAT, 0=does not include VAT
                'cus_discount_rate' => (float)($purchase->CusDiscountRate ?? 0),
                'cus_discount_type' => $this->normalizeDiscountType($batchPrice ? $batchPrice->RtDisType1 : ($item ? $item->RtDisType1 : null)),
                'is_printer' => true,
                'tiers' => [
                    'tier1' => [
                        'qty' => $priceDetail ? $priceDetail->RtQty1 : ($item ? $item->RtQty1 : null),
                        'discount' => $priceDetail ? $priceDetail->RtDis1 : ($item ? $item->RtDis1 : null)
                    ],
                    'tier2' => [
                        'qty' => $priceDetail ? $priceDetail->RtQty2 : ($item ? $item->RtQty2 : null),
                        'discount' => $priceDetail ? $priceDetail->RtDis2 : ($item ? $item->RtDis2 : null)
                    ],
                    'tier3' => [
                        'qty' => null,
                        'discount' => null
                    ],
                    'tier4' => [
                        'qty' => null,
                        'discount' => null
                    ],
                ],
                'cred_tiers' => [
                    'tier1' => [
                        'qty' => $priceDetail ? $priceDetail->CredQty1 : ($item ? $item->CredQty1 : null),
                        'discount' => $priceDetail ? $priceDetail->CredDis1 : ($item ? $item->CredDis1 : null)
                    ],
                    'tier2' => [
                        'qty' => $priceDetail ? $priceDetail->CredQty2 : ($item ? $item->CredQty2 : null),
                        'discount' => $priceDetail ? $priceDetail->CredDis2 : ($item ? $item->CredDis2 : null)
                    ],
                ],
            ];
        })->filter()->values(); // Remove null values (out of stock items) and reset array keys
    }

    private function getNextInvoiceNoPreview($type = 'item')
    {
        $user = Auth::user();
        $companyPrefix = '';
        $sequenceKey = 'DEFAULT'; // Default key for sequence
        
        // Determine company prefix and sequence key
        if ($user && $user->company_code) {
            $code = strtoupper($user->company_code);
            if (str_starts_with($code, 'VIS')) {
                $companyPrefix = 'VIS-';
                $sequenceKey = 'VIS';
            } elseif (str_starts_with($code, 'MAL')) {
                $companyPrefix = 'MAL-';
                $sequenceKey = 'MAL';
            }
        }

        $typePrefix = match($type) {
            'printer' => 'PRI-',
            'item' => 'ITM-',
            default => 'INV-'
        };
        
        $prefix = $companyPrefix . $typePrefix;
        
        // Use strictly separate sequence names based on the prefix key (VIS/MAL)
        // e.g. sales_VIS_item vs sales_MAL_item
        $sequenceName = 'sales_' . $sequenceKey . '_' . $type;
        
        // Peek at the next value without incrementing
        $nextValue = \App\Models\Sequence::peekNextValue($sequenceName);
        
        // If it's 1 (default), check if we have existing legacy records to initialize from
        if ($nextValue == 1) {
             $lastSale = SalesTransaction::where('invoice_no', 'like', $prefix . '%')
                ->orderBy('invoice_no', 'desc')
                ->first();
            
            if ($lastSale) {
                // Extract numeric part based on prefix length
                $numericPart = substr($lastSale->invoice_no, strlen($prefix));
                if (is_numeric($numericPart)) {
                    $nextValue = (int)$numericPart + 1;
                }
            }
        }

        // Use 6 digits padding as standard
        return $prefix . str_pad($nextValue, 6, '0', STR_PAD_LEFT);
    }

    private function generateInvoiceNo($type = 'item')
    {
        $user = Auth::user();
        $companyPrefix = '';
        $sequenceKey = 'DEFAULT'; // Default key for sequence
        
        // Determine company prefix and sequence key
        if ($user && $user->company_code) {
            $code = strtoupper($user->company_code);
            if (str_starts_with($code, 'VIS')) {
                $companyPrefix = 'VIS-';
                $sequenceKey = 'VIS';
            } elseif (str_starts_with($code, 'MAL')) {
                $companyPrefix = 'MAL-';
                $sequenceKey = 'MAL';
            }
        }

        $typePrefix = match($type) {
            'printer' => 'PRI-',
            'item' => 'ITM-',
            default => 'INV-'
        };
        
        $prefix = $companyPrefix . $typePrefix;

        // Use strictly separate sequence names based on the prefix key (VIS/MAL)
        // e.g. sales_VIS_item vs sales_MAL_item
        $sequenceName = 'sales_' . $sequenceKey . '_' . $type;
        
        // Use generic sequence generator with initialization capability
        $nextValue = \App\Models\Sequence::incrementSequence($sequenceName, function () use ($prefix) {
            // Initializer: Find the max existing invoice number to continue from if sequence is new
            $lastSale = SalesTransaction::where('invoice_no', 'like', $prefix . '%')
                ->orderBy('invoice_no', 'desc')
                ->first();
            
            if ($lastSale) {
                // Extract numeric part (e.g., VIS-ITM-000123 -> 123)
                $numericPart = substr($lastSale->invoice_no, strlen($prefix));
                return is_numeric($numericPart) ? (int)$numericPart : 0;
            }
            
            return 0;
        });

        return $prefix . str_pad($nextValue, 6, '0', STR_PAD_LEFT);
    }

    private function getLogoBase64()
    {
        // Try logo.png first (for backwards compatibility)
        $path = public_path('logo.png');
        if (!file_exists($path)) {
            // Fall back to logo.svg
            $path = public_path('logo.svg');
        }

        if (file_exists($path)) {
            $type = pathinfo($path, PATHINFO_EXTENSION);
            $data = file_get_contents($path);
            return 'data:image/' . $type . ';base64,' . base64_encode($data);
        }

        // Try to fetch remote and base64 it to avoid Dompdf fetch issues
        try {
            $url = 'https://www.vismass.lk/wp-content/uploads/2023/12/vismass.png';
            $data = file_get_contents($url);
            if ($data !== false) {
                return 'data:image/png;base64,' . base64_encode($data);
            }
        } catch (\Exception $e) {
            // Log error or ignore
        }

        return '';
    }

    public function generateReceipt(SalesTransaction $sale)
    {
        if (!request()->user()->hasPermission('sales.view')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view sales.');
        }

        $sale->load(['items.item.brand', 'items.item.model', 'cashier', 'customer']);

        // Convert SalesTransaction model to the same data format used in preview
        // This ensures the receipt looks identical to the one printed after sale completion
        $data = [
            'invoice_no' => $sale->invoice_no,
            'transaction_date' => $sale->transaction_date,
            'customer_code' => $sale->customer_code,
            'customer_name' => $sale->customer_name,
            'customer_vat_no' => $sale->customer ? $sale->customer->vat_no : '',
            'cashier_name' => $sale->cashier ? $sale->cashier->name : 'System',
            'price_type' => $sale->price_type,
            'subtotal' => $sale->subtotal,
            'discount_amount' => $sale->discount_amount,
            'vat_rate' => $sale->vat_rate,
            'is_vat_invoice' => $sale->is_vat_invoice,
            'total_amount' => $sale->total_amount,
            'cash_payment' => $sale->payment_details['cash'] ?? 0,
            'card_payment' => $sale->payment_details['card'] ?? 0,
            'points_redeem' => $sale->payment_details['points'] ?? 0,
            'balance_amount' => $sale->balance_amount,
            'applied_credit' => $sale->payment_details['applied_credit'] ?? 0,
            'customer_id' => $sale->customer_id,
            'payment_mode' => $sale->status === 'completed' ? 'cash' : 'credit',
            'items' => []
        ];

        // Convert items
        foreach ($sale->items as $item) {
            $data['items'][] = [
                'item_code' => $item->item_code,
                'item_name' => $item->item->ItmNm ?? 'N/A',
                'barcode' => $item->item->BarCode ?? null,
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price,
                'total' => $item->line_total,
                'serial_number' => $item->serial_number,
                'brand' => $item->item->brand->name ?? null,
                'model' => $item->item->model->name ?? null,
                'warranty' => $item->item->warranty ?? null,
            ];
        }

        // Determine if printer entry logic applies
        $isPrinterEntry = false;
        foreach ($data['items'] as $item) {
            if (!empty($item['serial_number'])) {
                $isPrinterEntry = true;
                break;
            }
        }

        // If frontend requests POS format (query param ?pos=1), use the POS receipt HTML
        $isPosRequest = request()->query('pos') ? true : false;

        // Choose rendering method:
        // - Printer entries & POS request: use POS receipt HTML on 80mm roll
        // - Default: standard POS receipt preview HTML
        if ($isPrinterEntry || $isPosRequest) {
            // generatePosReceiptHtml expects the SalesTransaction model
            $html = $this->generatePosReceiptHtml($sale);
        } else {
            $html = $this->generatePreviewReceiptHtml($data);
        }

        return response($html)
            ->header('Content-Type', 'text/html');
    }

    public function generateInvoice(SalesTransaction $sale)
    {
        if (!request()->user()->hasPermission('sales.view')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view sales.');
        }

        $sale->load(['items.item', 'cashier', 'customer']);

        // Check if the sale contains printers (items with serial_number, brand, and model)
        $hasPrinters = $sale->items->contains(function ($item) {
            return !empty($item->serial_number);
        });

        if ($hasPrinters) {
            // Printer invoice: 80mm POS roll (same as regular invoice)
            $html = view('sales.printer_invoice', ['sale' => $sale])->render();
        } else {
            // Regular POS invoice: 80mm roll
            $html = view('sales.invoice', ['sale' => $sale])->render();
        }

        return response($html)
            ->header('Content-Type', 'text/html');
    }

    public function previewReceipt(Request $request)
    {
        $data = $request->all();

        // Determine if printer entry logic applies
        $isPrinterEntry = false;
        if (isset($data['items']) && is_array($data['items'])) {
            foreach ($data['items'] as $item) {
                if (!empty($item['serial_number'])) {
                    $isPrinterEntry = true;
                    break;
                }
            }
        }

        // All sales (printer or regular) use POS 80mm receipt format
        $html = $this->generatePreviewReceiptHtml($data);
        $paper = [0, 0, 226.77, 1000];
        $orientation = 'portrait';

        // Use DomPDF to generate PDF
        $options = new \Dompdf\Options();
        $options->set('isRemoteEnabled', true);
        $options->set('isHtml5ParserEnabled', true);
        $dompdf = new Dompdf($options);
        
        if (is_array($paper)) {
            $dompdf->setPaper($paper);
        } else {
            $dompdf->setPaper($paper, $orientation);
        }
        
        $dompdf->loadHtml($html);

        $dompdf->render();

        return $dompdf->stream('receipt-preview.pdf', [
            'Attachment' => false
        ]);
    }
    
    private function generatePosReceiptHtml(SalesTransaction $sale, $widthMm = 80)
    {
        $company = \App\Models\Company::first();
        $companyName = $company ? $company->company_name : 'Your Company Name';
        $companyAddress = $company ? $company->address : '123 Main Street, City, Country';
        $companyPhone = $company ? $company->phone : '+1-234-567-8900';
        $companyVatNo = $company ? $company->vat_no : '';

        // Use customer_id (AdrKy) to look up the correct company customer for VAT details
        $customer = $sale->customer_id ? Customer::find($sale->customer_id) : null;
        $customerVatNo = $customer ? $customer->vat_no : '';
        $isVatInvoice = $sale->is_vat_invoice;

        $contentWidth = $widthMm - 4; // 2mm margin on each side

        // Set Sri Lankan timezone
        $sriLankaTime = new \DateTime('now', new \DateTimeZone('Asia/Colombo'));

        $billTitle = 'SALES RECEIPT';

        $html = '
        <style>
            @page {
                margin: 0;
            }
            body {
                font-family: Courier, monospace;
                font-size: 11px;
                margin: 0;
                padding: 10px;
                background-color: #fff;
                width: ' . ($widthMm - 10) . 'mm;
                line-height: 1.2;
                color: #000;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .uppercase { text-transform: uppercase; }
            
            .header h1 {
                margin: 0;
                font-size: 18px;
                text-transform: uppercase;
                margin-bottom: 2px;
            }
            .header p {
                margin: 0;
                font-size: 10px;
            }
            .bill-title {
                margin: 10px 0;
                font-size: 14px;
                font-weight: bold;
                text-align: left;
            }
            .dotted-line {
                border-top: 1px dashed #000;
                margin: 5px 0;
            }
            .items-table {
                width: 100%;
                border-collapse: collapse;
                margin: 5px 0;
            }
            .items-table th {
                border-bottom: 1px dashed #000;
                padding-bottom: 4px;
                text-align: left;
                font-weight: bold;
                font-size: 10px;
            }
            .info-block {
                margin-bottom: 8px;
            }
            .info-row {
                width: 100%;
                margin-bottom: 2px;
                clear: both;
            }
            .info-label { float: left; }
            .info-value { float: right; }
            .total-block {
                font-weight: bold;
                margin-top: 4px;
            }
            .footer {
                margin-top: 15px;
                text-align: center;
                font-size: 10px;
            }
        </style>

        <div class="receipt-box">
            <div class="header text-center">
                <center><img src="' . $this->getLogoBase64() . '" style="height: 60px; width: auto; margin-bottom: 5px;"></center>
                <h1>' . $companyName . '</h1>
                <p>' . $companyAddress . '</p>
                <div style="height: 10px;"></div>
                <p>Tel: ' . $companyPhone . '</p>
                <div style="height: 10px;"></div>
            </div>

            <div class="bill-title">' . $billTitle . '</div>

            <div class="info-block">
                <div class="info-row">
                    <span class="info-label">Date:</span>
                    <span class="info-value">' . $sriLankaTime->format('n/j/Y, g:i:s A') . '</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Invoice No:</span>
                    <span class="info-value">' . $sale->invoice_no . '</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Cashier:</span>
                    <span class="info-value">' . ($sale->cashier->name ?? 'Admin') . '</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Customer:</span>
                    <span class="info-value">' . ($sale->customer_name ?: 'Walk-in Customer') . '</span>
                </div>
            </div>

            <table class="items-table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th class="text-right">Qty</th>
                        <th class="text-right">Price</th>
                        <th class="text-right">Total</th>
                    </tr>
                </thead>
                <tbody>';

        $vatMultiplier = 1 + ($sale->vat_rate / 100);
        foreach ($sale->items as $item) {
            $unitPriceInclusive = $item->unit_price * $vatMultiplier;
            $totalInclusive = $item->line_total * $vatMultiplier;

            $html .= '
                    <tr>
                        <td colspan="4" style="padding-top: 4px;">' . substr($item->item_name, 0, 30) . '</td>
                    </tr>';
            
            // Add warranty information if available
            if ($item->warranty) {
                $html .= '
                    <tr>
                        <td colspan="4" style="font-size: 9px; color: #666; padding-left: 5px;">Warranty: ' . $item->warranty . '</td>
                    </tr>';
            }
            
            $html .= '
                    <tr>
                        <td></td>
                        <td class="text-right">' . number_format($item->quantity, 0) . '</td>
                        <td class="text-right">' . number_format($unitPriceInclusive, 2) . '</td>
                        <td class="text-right">' . number_format($totalInclusive, 2) . '</td>
                    </tr>';
        }

        $html .= '
                </tbody>
            </table>

            <div class="info-block">
                <div class="info-row">
                    <span class="info-label">SUBTOTAL:</span>
                    <span class="info-value">' . number_format($isVatInvoice ? $sale->subtotal : $sale->subtotal * $vatMultiplier, 2) . '</span>
                </div>';

        // Calculate separate discounts
        $itemDiscountsTotal = $sale->items->sum('discount_amount') + $sale->items->sum('cus_discount_rate');
        $manualDiscount = $sale->discount_amount ?? 0;

        if ($itemDiscountsTotal > 0) {
            $html .= '
                <div class="info-row">
                    <span class="info-label">ITEM DISCOUNT:</span>
                    <span class="info-value">-' . number_format($isVatInvoice ? $itemDiscountsTotal : $itemDiscountsTotal * $vatMultiplier, 2) . '</span>
                </div>';
        }

        if ($manualDiscount > 0) {
            $percSuffix = ($sale->discount_percentage > 0) ? ' (' . number_format((float)$sale->discount_percentage, 0) . '%)' : '';
            $html .= '
                <div class="info-row">
                    <span class="info-label">ADDITIONAL DISC.' . $percSuffix . ':</span>
                    <span class="info-value">-' . number_format($isVatInvoice ? $manualDiscount : $manualDiscount * $vatMultiplier, 2) . '</span>
                </div>';
        }

        if ($isVatInvoice) {
            $html .= '
                <div class="info-row">
                    <span class="info-label">VAT (' . number_format((float)$sale->vat_rate, 0) . '%):</span>
                    <span class="info-value">' . number_format((float)($sale->tax_amount ?? 0), 2) . '</span>
                </div>';
        }

        $html .= '
                <div class="info-row" style="margin-top: 5px; border-top: 1px dashed #000; padding-top: 5px;">
                    <span class="info-label font-bold" style="font-size: 14px;">TOTAL:</span>
                    <span class="info-value font-bold" style="font-size: 14px;">' . number_format((float)($sale->total_amount ?? 0), 2) . '</span>
                </div>
                
                <div class="info-row">
                    <span class="info-label">Pay Mode:</span>
                    <span class="info-value uppercase">' . ($sale->payment_mode ?? 'cash') . '</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Cash Paid:</span>
                    <span class="info-value">' . number_format(($sale->payment_details['cash'] ?? 0) + ($sale->payment_details['card'] ?? 0) + ($sale->payment_details['bank_transfer'] ?? 0) + ($sale->payment_details['cheque'] ?? 0), 2) . '</span>
                </div>';

        if (($sale->payment_details['applied_credit'] ?? 0) > 0) {
            $html .= '
                <div class="info-row">
                    <span class="info-label">CREDIT APPLIED:</span>
                    <span class="info-value">' . number_format($sale->payment_details['applied_credit'], 2) . '</span>
                </div>';
        }

        $html .= '
                <div class="info-row">
                    <span class="info-label">Balance:</span>
                    <span class="info-value">' . number_format($sale->balance_amount ?? 0, 2) . '</span>
                </div>';
                        // Add Customer Total Outstanding
        if ($sale->customer_id) {
            $customer = Customer::find($sale->customer_id);
            if ($customer) {
                $totalBalance = $customer->calculateOutstandingBalance();
                $isCredit = $totalBalance < 0;
                $balanceLabel = $isCredit ? 'CUS. CREDIT BAL:' : 'CUS. OUTSTANDING:';
                $balanceValue = number_format(abs($totalBalance), 2) . ($isCredit ? ' CR' : '');
                
                $html .= '
                <div class="info-row" style="margin-top: 5px; border-top: 1px dotted #000; padding-top: 5px;">
                    <span class="info-label font-bold">' . $balanceLabel . '</span>
                    <span class="info-value font-bold">' . $balanceValue . '</span>
                </div>';
            }
        }

        $html .= '
            </div>

            <div class="footer">
                ' . ($isVatInvoice ? '
                <div style="text-align: left; margin-bottom: 15px;">
                    <div class="info-row">
                        <span class="info-label">VAT Rate:</span>
                        <span class="info-value">' . number_format((float)($sale->vat_rate ?? 0), 0) . '%</span>
                    </div>' . ($companyVatNo ? '
                    <div class="info-row">
                        <span class="info-label">Company VAT:</span>
                        <span class="info-value">' . $companyVatNo . '</span>
                    </div>' : '') . '
                    <div class="info-row">
                        <span class="info-label">Customer VAT:</span>
                        <span class="info-value">' . ($customerVatNo ?: '') . '</span>
                    </div>
                </div>' : '') . '
                Thank you for your business!<br>
                *** Powered by UNITEC ***
            </div>
        </div>';

        return $html;
    }

    private function generatePreviewReceiptHtml($data, $widthMm = 80)
    {
        $company = \App\Models\Company::first();
        $companyName = $company ? $company->company_name : 'VISMASS PVT LTD';
        $companyAddress = $company ? $company->address : '32, Ground Floor, Yakkala Park, Kandy Road, Yakkala.';
        $companyPhone = $company ? $company->phone : '0332234300';
        $companyVatNo = $company ? $company->vat_no : '';

        $isVatInvoice = isset($data['is_vat_invoice']) && $data['is_vat_invoice'];
        $customerVatNo = $data['customer_vat_no'] ?? '';
        $vatRate = $data['vat_rate'] ?? 0;

        $contentWidth = $widthMm - 4; // 2mm margin on each side

        // Set Sri Lankan timezone
        $sriLankaTime = new \DateTime('now', new \DateTimeZone('Asia/Colombo'));

        $billTitle = 'SALES RECEIPT';

        $html = '
        <style>
            @page {
                margin: 0;
            }
            body {
                font-family: Courier, monospace;
                font-size: 11px;
                margin: 0;
                padding: 10px;
                background-color: #fff;
                width: ' . ($widthMm - 10) . 'mm;
                line-height: 1.2;
                color: #000;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .uppercase { text-transform: uppercase; }
            
            .header h1 {
                margin: 0;
                font-size: 18px;
                text-transform: uppercase;
                margin-bottom: 2px;
            }
            .header p {
                margin: 0;
                font-size: 10px;
            }
            .bill-title {
                margin: 10px 0;
                font-size: 14px;
                font-weight: bold;
                text-align: left;
            }
            .dotted-line {
                border-top: 1px dashed #000;
                margin: 5px 0;
            }
            .items-table {
                width: 100%;
                border-collapse: collapse;
                margin: 5px 0;
            }
            .items-table th {
                border-bottom: 1px dashed #000;
                padding-bottom: 4px;
                text-align: left;
                font-weight: bold;
                font-size: 10px;
            }
            .info-block {
                margin-bottom: 8px;
            }
            .info-row {
                width: 100%;
                margin-bottom: 2px;
                clear: both;
            }
            .info-label { float: left; }
            .info-value { float: right; }
            .total-block {
                font-weight: bold;
                margin-top: 4px;
            }
            .footer {
                margin-top: 15px;
                text-align: center;
                font-size: 10px;
            }
        </style>

        <div class="receipt-box">
            <div class="header text-center">
                <center><img src="' . $this->getLogoBase64() . '" style="height: 60px; width: auto; margin-bottom: 5px;"></center>
                <h1>' . $companyName . '</h1>
                <p>' . $companyAddress . '</p>
                <div style="height: 10px;"></div>
                <p>Tel: ' . $companyPhone . '</p>
                <div style="height: 10px;"></div>
            </div>

            <div class="bill-title">' . $billTitle . '</div>

            <div class="info-block">
                <div class="info-row">
                    <span class="info-label">Date:</span>
                    <span class="info-value">' . $sriLankaTime->format('n/j/Y, g:i:s A') . '</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Invoice No:</span>
                    <span class="info-value">' . ($data['invoice_no'] ?? '(PREVIEW)') . '</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Cashier:</span>
                    <span class="info-value">' . (Auth::user()->name ?? 'Admin') . '</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Customer:</span>
                    <span class="info-value">' . (($data['customer_name'] ?? '') ?: 'Walk-in Customer') . '</span>
                </div>
            </div>

            <table class="items-table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th class="text-right">Qty</th>
                        <th class="text-right">Price</th>
                        <th class="text-right">Total</th>
                    </tr>
                </thead>
                <tbody>';

        if (isset($data['items']) && is_array($data['items'])) {
            foreach ($data['items'] as $item) {
                $html .= '
                    <tr>
                        <td colspan="4" style="padding-top: 4px;">' . substr($item['item_name'] ?? '', 0, 30) . '</td>
                    </tr>';
                
                // Add warranty information if available
                if (isset($item['warranty']) && $item['warranty']) {
                    $html .= '
                    <tr>
                        <td colspan="4" style="font-size: 9px; color: #666; padding-left: 5px;">Warranty: ' . $item['warranty'] . '</td>
                    </tr>';
                }
                
                $html .= '
                    <tr>
                        <td></td>
                        <td class="text-right">' . number_format($item['quantity'] ?? 0, 0) . '</td>
                        <td class="text-right">' . number_format($item['our_price'] ?? $item['unit_price'] ?? 0, 2) . '</td>
                        <td class="text-right">' . number_format($item['total'] ?? 0, 2) . '</td>
                    </tr>';
            }
        }

        $html .= '
                </tbody>
            </table>

            <div class="info-block">
                <div class="info-row">
                    <span class="info-label">SUBTOTAL:</span>
                    <span class="info-value">' . number_format($data['subtotal'] ?? 0, 2) . '</span>
                </div>';
        
        // Calculate separate discounts
        $itemDiscountsTotal = collect($data['items'] ?? [])->sum('discount_amount') + collect($data['items'] ?? [])->sum('cus_discount_rate');
        $manualDiscount = $data['discount_amount'] ?? 0;

        if ($itemDiscountsTotal > 0) {
            $html .= '
                <div class="info-row">
                    <span class="info-label">ITEM DISCOUNT:</span>
                    <span class="info-value">-' . number_format($itemDiscountsTotal, 2) . '</span>
                </div>';
        }

        if ($manualDiscount > 0) {
            $percSuffix = (isset($data['discount_percentage']) && $data['discount_percentage'] > 0) ? ' (' . number_format($data['discount_percentage'], 0) . '%)' : '';
            $html .= '
                <div class="info-row">
                    <span class="info-label">ADDITIONAL DISC.' . $percSuffix . ':</span>
                    <span class="info-value">-' . number_format($manualDiscount, 2) . '</span>
                </div>';
        }

        if ($isVatInvoice) {
            $html .= '
                <div class="info-row">
                    <span class="info-label">VAT (' . number_format($vatRate, 0) . '%):</span>
                    <span class="info-value">' . number_format($data['tax_amount'] ?? 0, 2) . '</span>
                </div>';
        }

        $html .= '
                <div class="info-row" style="margin-top: 5px; border-top: 1px dashed #000; padding-top: 5px;">
                    <span class="info-label font-bold" style="font-size: 14px;">TOTAL:</span>
                    <span class="info-value font-bold" style="font-size: 14px;">' . number_format($data['total_amount'] ?? 0, 2) . '</span>
                </div>
                
                <div class="info-row">
                    <span class="info-label">Pay Mode:</span>
                    <span class="info-value uppercase">' . ($data['payment_mode'] ?? 'cash') . '</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Cash Paid:</span>
                    <span class="info-value">' . number_format($data['cash_payment'] ?? ($data['total_amount'] ?? 0), 2) . '</span>
                </div>';
        // Add Customer Total Outstanding
        if (isset($data['customer_id']) && $data['customer_id']) {
            $customer = Customer::find($data['customer_id']);
            if ($customer) {
                $totalBalance = $customer->calculateOutstandingBalance();
                $isCredit = $totalBalance < 0;
                $balanceLabel = $isCredit ? 'CUS. CREDIT BAL:' : 'CUS. OUTSTANDING:';
                $balanceValue = number_format(abs($totalBalance), 2) . ($isCredit ? ' CR' : '');
                
                $html .= '
                <div class="info-row" style="margin-top: 5px; border-top: 1px dotted #000; padding-top: 5px;">
                    <span class="info-label font-bold">' . $balanceLabel . '</span>
                    <span class="info-value font-bold">' . $balanceValue . '</span>
                </div>';
            }
        }        if (isset($data['applied_credit']) && $data['applied_credit'] > 0) {
            $html .= '
                <div class="info-row">
                    <span class="info-label">CREDIT APPLIED:</span>
                    <span class="info-value">' . number_format($data['applied_credit'], 2) . '</span>
                </div>';
        }

        $html .= '
                <div class="info-row">
                    <span class="info-label">Balance:</span>
                    <span class="info-value">' . number_format($data['balance_amount'] ?? 0, 2) . '</span>
                </div>';
                


        $html .= '
            </div>

            <div class="footer">
                ' . ($isVatInvoice ? '
                <div style="text-align: left; margin-bottom: 15px;">
                    <div class="info-row">
                        <span class="info-label">VAT Rate:</span>
                        <span class="info-value">' . number_format($vatRate, 0) . '%</span>
                    </div>' . ($companyVatNo ? '
                    <div class="info-row">
                        <span class="info-label">Company VAT:</span>
                        <span class="info-value">' . $companyVatNo . '</span>
                    </div>' : '') . '
                    <div class="info-row">
                        <span class="info-label">Customer VAT:</span>
                        <span class="info-value">' . ($data['customer_vat_no'] ?? '') . '</span>
                    </div>
                </div>' : '') . '
                Thank you for your business!<br>
                *** Powered by UNITEC ***
            </div>
        </div>';

        return $html;
    }

    private function mmToPoints($mm)
    {
        // Convert millimeters to points (1 mm = 2.83465 points)
        return $mm * 2.83465;
    }

    private function adjustStockLevels($newItems, $originalItems)
    {
        // For sale edits, we need to:
        // 1. Reverse the original stock deductions (add back stock)
        // 2. Apply new stock deductions
        // Note: Service items (is_service=true) do NOT create stock_in_hand records
        
        $sectionCode = Auth::user()->section_code ?? 'MAIN';
        $companyCode = Auth::user()->company_code ?? null;
        
        // Step 1: Reverse original stock deductions by creating positive stock records
        foreach ($originalItems as $originalItem) {
            if (($originalItem['quantity'] ?? 0) > 0 || ($originalItem['free_quantity'] ?? 0) > 0) {
                // Check if this is a service item
                $isServiceItem = false;
                if (isset($originalItem['product_id']) || isset($originalItem['original_item_id'])) {
                    $itemId = $originalItem['product_id'] ?? $originalItem['original_item_id'];
                    $itemMaster = ItemMaster::where('ItmKy', $itemId)->select('is_service')->first();
                    $isServiceItem = $itemMaster && $itemMaster->is_service;
                }

                // Only create record for regular items, skip for service items
                if (!$isServiceItem) {
                    StockInHand::create([
                        'RefNo' => 'REV-' . ($originalItem['invoice_no'] ?? 'EDIT'),
                        'OrdDate' => now(),
                        'ItemKy' => $originalItem['product_id'] ?? $originalItem['original_item_id'] ?? null,
                        'Qty' => $originalItem['quantity'] ?? 0,
                        'FreeQty' => $originalItem['free_quantity'] ?? 0,
                        'TrnTyp' => 'SREV',  // Sale Reversal
                        'batch_no' => $originalItem['batch_no'] ?? null,
                        'company_code' => $companyCode,
                        'owner_company_code' => $companyCode, // Owner is the company
                        'section_code' => $sectionCode,
                        'serial_number' => $originalItem['serial_number'] ?? null,
                    ]);
                }
            }
        }
        
        // Step 2: Apply new stock deductions by creating negative stock records
        foreach ($newItems as $newItem) {
            if (($newItem['quantity'] ?? 0) > 0 || ($newItem['free_quantity'] ?? 0) > 0) {
                // Check if this is a service item
                $isServiceItem = false;
                if (isset($newItem['itm_ky'])) {
                    $itemMaster = ItemMaster::where('ItmKy', $newItem['itm_ky'])->select('is_service')->first();
                    $isServiceItem = $itemMaster && $itemMaster->is_service;
                }

                // Only create record for regular items, skip for service items
                if (!$isServiceItem) {
                    StockInHand::create([
                        'RefNo' => 'UPD-' . uniqid(),
                        'OrdDate' => now(),
                        'ItemKy' => $newItem['itm_ky'] ?? null,
                        'Qty' => -($newItem['quantity'] ?? 0),
                        'FreeQty' => -($newItem['free_quantity'] ?? 0),
                        'TrnTyp' => 'SAL',
                        'batch_no' => $newItem['batch_no'] ?? null,
                        'company_code' => $companyCode,
                        'owner_company_code' => $companyCode, // Owner is the company
                        'section_code' => $sectionCode,
                        'serial_number' => $newItem['serial_number'] ?? null,
                    ]);
                }
            }
        }
    }

    /**
     * Helper: normalize discount type to 'fixed' or 'percentage'
     */
    private function normalizeDiscountType($type): string
    {
        return $type === 'percentage' ? 'percentage' : 'fixed';
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

    /**
     * Helper: detect company admin
     */
    private function userIsCompanyAdmin($user): bool
    {
        if (!$user) return false;
        return (
            (isset($user->user_type) && $user->user_type === 'company_admin') ||
            ($user->role && $user->role->level === 'company_admin')
        );
    }

    /**
     * Helper: detect branch admin
     */
    private function userIsBranchAdmin($user): bool
    {
        if (!$user) return false;
        return (
            (isset($user->user_type) && in_array($user->user_type, ['branch_admin', 'section_admin'])) ||
            ($user->role && $user->role->level === 'branch_admin')
        );
    }

    /**
     * Helper: determine business unit key (vismass/malibo)
     */
    private function getUserBusinessUnit($user): string
    {
        if (!$user) return 'vismass';
        if (!empty($user->company_code) && str_starts_with(strtoupper($user->company_code), 'MAL')) {
            return 'malibo';
        }
        return 'vismass';
    }
}
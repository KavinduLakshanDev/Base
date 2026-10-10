<?php

namespace App\Http\Controllers;

use App\Models\Vehicle;
use App\Models\Section;
use App\Models\Shop;
use App\Models\Product;
use App\Models\StockInHand;
use App\Models\Delivery;
use App\Models\DeliveryItem;
use App\Models\DeliveryPayment;
use App\Models\AccMas;
use App\Models\PurchaseDet;
use App\Services\VehicleStockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class DeliverySaleController extends Controller
{
    protected $stockService;

    public function __construct(VehicleStockService $stockService)
    {
        $this->stockService = $stockService;
    }

    public function index(Request $request)
    {
        $user = Auth::user();
        
        $query = Delivery::where('company_code', $user->company_code)
            ->where('notes', 'Direct sale from vehicle')
            ->with(['vehicle', 'shop', 'items', 'assignedUser'])
            ->orderBy('id', 'desc');

        if ($user->role && $user->role->level === 'sales_rep') {
            $query->where('assigned_user_id', $user->id);
        }

        // Apply filters if they exist
        if ($request->filled('date_from')) {
            $query->whereDate('delivery_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('delivery_date', '<=', $request->date_to);
        }
        if ($request->filled('section_code')) {
            $query->where('section_code', $request->section_code);
        }
        if ($request->filled('shop_id')) {
            $query->where('shop_id', $request->shop_id);
        }
        if ($request->filled('invoice_no')) {
            $query->where('delivery_number', 'like', '%' . $request->invoice_no . '%');
        }

        $deliveries = $query->paginate(20)->withQueryString();

        $sections = Section::where('company_code', $user->company_code)
            ->where('is_active', true)
            ->get(['id', 'name', 'section_code']);

        $shops = Shop::where('company_code', $user->company_code)
            ->where('is_active', true)
            ->get(['id', 'name']);

        return Inertia::render('delivery/sales-index', [
            'deliveries' => $deliveries,
            'sections' => $sections,
            'shops' => $shops,
            'filters' => $request->only(['date_from', 'date_to', 'section_code', 'shop_id', 'invoice_no']),
        ]);
    }

    public function create()
    {
        $user = Auth::user();
        
        $sections = Section::where('company_code', $user->company_code)
            ->where('is_active', true)
            ->get(['id', 'name', 'section_code']);

        $shops = Shop::where('company_code', $user->company_code)
            ->where('is_active', true)
            ->with('externalCustomer')
            ->get();

        $bankAccounts = \App\Models\BankAccount::where('company_code', $user->company_code)
            ->where('status', 'active')
            ->get();

        return Inertia::render('delivery/sale', [
            'sections' => $sections,
            'shops' => $shops,
            'bankAccounts' => $bankAccounts,
            'nextInvoiceNo' => $this->getNextInvoiceNo($user->company_code),
            'currentDate' => date('Y-m-d'),
            'user' => $user->only(['id', 'delivery_section_code']),
        ]);
    }

    public function edit(Delivery $delivery)
    {
        $user = Auth::user();
        
        if ($delivery->notes !== 'Direct sale from vehicle') {
            return redirect()->back()->with('error', 'Only Direct Sales can be edited here.');
        }

        $sections = Section::where('company_code', $user->company_code)
            ->where('is_active', true)
            ->get(['id', 'name', 'section_code']);

        $shops = Shop::where('company_code', $user->company_code)
            ->where('is_active', true)
            ->with('externalCustomer')
            ->get();

        $bankAccounts = \App\Models\BankAccount::where('company_code', $user->company_code)
            ->where('status', 'active')
            ->get();
            
        $delivery->load(['items.itemMaster', 'payments']);

        return Inertia::render('delivery/sale-edit', [
            'delivery' => $delivery,
            'sections' => $sections,
            'shops' => $shops,
            'bankAccounts' => $bankAccounts,
            'user' => $user->only(['id', 'delivery_section_code']),
        ]);
    }

    public function update(Request $request, Delivery $delivery)
    {
        $user = Auth::user();
        
        if ($delivery->notes !== 'Direct sale from vehicle') {
            return response()->json(['error' => 'Only Direct Sales can be updated here.'], 403);
        }

        $request->validate([
            'section_code' => 'required|exists:sections,section_code',
            'shop_id' => 'required|exists:shops,id',
            'transaction_date' => 'required|date',
            'items' => 'required|array|min:1',
            'items.*.itm_ky' => 'required|exists:itemmaster,ItmKy',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'payment_mode' => 'required|in:cash,credit,cheque,card,transfer',
            'cash_amount' => 'nullable|numeric|min:0',
            'bank_account_id' => 'required_if:payment_mode,transfer|required_if:payment_mode,card|nullable|exists:bank_accounts,id',
            'reference_no' => 'required_if:payment_mode,cheque|required_if:payment_mode,transfer|nullable|string|max:100',
        ]);

        try {
            DB::beginTransaction();

            // 1. Revert Old Stock
            foreach ($delivery->items as $oldItem) {
                StockInHand::create([
                    'RefNo' => $delivery->delivery_number,
                    'Cky' => $delivery->shop_id,
                    'company_code' => $user->company_code,
                    'owner_company_code' => $user->company_code,
                    'section_code' => $delivery->section_code,
                    'OrdDate' => now()->format('Y-m-d'),
                    'ItemKy' => $oldItem->ItmKy,
                    'Qty' => abs($oldItem->quantity),
                    'FreeQty' => 0,
                    'TrnTyp' => 'SDEL-REV',
                    'OrdKy' => $delivery->id,
                    'batch_no' => $oldItem->batch_no ?? null,
                ]);
            }

            // 2. Delete old items and payments
            $delivery->items()->delete();
            $delivery->payments()->delete();

            $shop = Shop::findOrFail($request->shop_id);

            // 3. Update Delivery Record
            $delivery->update([
                'delivery_route_id' => $shop->delivery_route_id,
                'section_code' => $request->section_code,
                'vehicle_id' => null,
                'shop_id' => $shop->id,
                'customer_name' => $shop->name ?? 'Unknown Shop',
                'customer_address' => $shop->address ?? 'N/A',
                'customer_phone' => $shop->contact_phone ?? 'N/A',
                'delivery_date' => $request->transaction_date,
                'discount_type' => $request->discount_type ?? 'fixed',
                'discount_value' => $request->discount_value ?? 0,
            ]);
            $delivery->refresh(); // Ensure shop_id and section_code are current in memory

            // 4. Add New Items & Deduct Stock
            $finalTotal = 0;
            foreach ($request->items as $itemData) {
                $qty = (float)$itemData['quantity'];
                $price = (float)$itemData['unit_price'];
                $lineTotal = $qty * $price;

                DeliveryItem::create([
                    'delivery_id' => $delivery->id,
                    'ItmKy' => $itemData['itm_ky'],
                    'batch_no' => $itemData['batch_no'] ?? null,
                    'quantity' => $qty,
                    'unit_price' => $price,
                    'total_amount' => $lineTotal,
                ]);

                $finalTotal += $lineTotal;

                StockInHand::create([
                    'RefNo' => $delivery->delivery_number,
                    'Cky' => $delivery->shop_id,
                    'company_code' => $user->company_code,
                    'owner_company_code' => $user->company_code,
                    'section_code' => $request->section_code,
                    'OrdDate' => now()->format('Y-m-d'),
                    'ItemKy' => $itemData['itm_ky'],
                    'Qty' => -abs($qty),
                    'FreeQty' => 0,
                    'TrnTyp' => 'SDEL-OUT',
                    'OrdKy' => $delivery->id,
                    'batch_no' => $itemData['batch_no'] ?? null,
                ]);
            }

            // 5. Apply Discounts
            if ($delivery->discount_type === 'percentage') {
                $discountAmount = $finalTotal * ($delivery->discount_value / 100);
            } else {
                $discountAmount = $delivery->discount_value;
            }
            $finalTotal = max(0, $finalTotal - $discountAmount);

            // 6. Add Payment
            $paidAmount = $request->cash_amount ?? 0;
            if ($request->payment_mode !== 'cash' && $request->payment_mode !== 'credit') {
                $paidAmount = $finalTotal; 
            }

            $recordedPayment = min($paidAmount, $finalTotal);

            if ($request->payment_mode !== 'credit' && $recordedPayment > 0) {
                DeliveryPayment::create([
                    'delivery_id' => $delivery->id,
                    'amount' => $recordedPayment,
                    'method' => $request->payment_mode,
                    'cheque_no' => $request->payment_mode === 'cheque' ? $request->reference_no : null,
                    'status' => 'cleared',
                    'reference_no' => $request->payment_mode !== 'cheque' ? $request->reference_no : null,
                    'bank_account_id' => $request->bank_account_id,
                    'bank_name' => $request->bank_name,
                    'branch' => $request->branch,
                    'cheque_date' => $request->cheque_date,
                    'payment_date' => $request->transaction_date,
                    'recorded_by' => $user->id,
                    'company_code' => $user->company_code,
                ]);
            }

            DB::commit();

            return redirect()->route('delivery.delivery-sales.index')->with('success', 'Sale updated successfully!');

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function searchProducts(Request $request)
    {
        $request->validate([
            'section_code' => 'required|exists:sections,section_code',
            'search' => 'nullable|string',
        ]);

        $query = StockInHand::where('section_code', $request->section_code)
            ->select('ItemKy', 'batch_no', DB::raw('SUM(Qty) as quantity'))
            ->groupBy('ItemKy', 'batch_no')
            ->havingRaw('SUM(Qty) > 0')
            ->with(['item' => function($q) {
                $q->select('ItmKy', 'ItemCode', 'ItmNm', 'BarCode', 'VehicleSalePrice', 'SlsPri', 'CosPri', 'VATItem', 'Unit', 'RtQty1', 'RtDis1', 'RtQty2', 'RtDis2', 'CredQty1', 'CredDis1', 'CredQty2', 'CredDis2', 'RtDisType1');
            }]);

        if ($request->search) {
            $search = $request->search;
            $query->whereHas('item', function($q) use ($search) {
                $q->where('ItmNm', 'like', "%{$search}%")
                  ->orWhere('ItemCode', 'like', "%{$search}%")
                  ->orWhere('BarCode', 'like', "%{$search}%");
            });
        }

        $user = Auth::user();

        $stocks = $query->take(50)->get()->map(function($stock) use ($user) {
            $item = $stock->item;

            // Priority 1: batch-specific price record in item_price_det (mirrors SalesController)
            $companyPrice = DB::table('item_price_det')
                ->where('ItmKy', $item->ItmKy)
                ->where('batch_no', $stock->batch_no)
                ->where('company_code', $user->company_code ?? '')
                ->where('fInAct', false)
                ->whereIn('Status', ['A', 'U'])
                ->orderBy('ItemPriceKey', 'desc')
                ->first();

            // Priority 2: batch-level GRN purchase detail
            $purchaseDet = \App\Models\PurchaseDet::where('batch_no', $stock->batch_no)
                ->where('iTimKy', $item->ItmKy)
                ->orderBy('PerchaseDetKy', 'desc')
                ->first();

            // Resolve tier values: batch override → master item fallback
            if ($companyPrice) {
                $tier1_qty       = !empty((float)$companyPrice->RtQty1)   ? $companyPrice->RtQty1   : $item->RtQty1;
                $tier1_discount  = !empty((float)$companyPrice->RtDis1)   ? $companyPrice->RtDis1   : $item->RtDis1;
                $tier2_qty       = !empty((float)$companyPrice->RtQty2)   ? $companyPrice->RtQty2   : $item->RtQty2;
                $tier2_discount  = !empty((float)$companyPrice->RtDis2)   ? $companyPrice->RtDis2   : $item->RtDis2;
                $cred_tier1_qty  = !empty((float)$companyPrice->CredQty1) ? $companyPrice->CredQty1 : $item->CredQty1;
                $cred_tier1_dis  = !empty((float)$companyPrice->CredDis1) ? $companyPrice->CredDis1 : $item->CredDis1;
                $cred_tier2_qty  = !empty((float)$companyPrice->CredQty2) ? $companyPrice->CredQty2 : $item->CredQty2;
                $cred_tier2_dis  = !empty((float)$companyPrice->CredDis2) ? $companyPrice->CredDis2 : $item->CredDis2;
                $dis_type        = $companyPrice->RtDisType1 ?: $item->RtDisType1;
                $unit_price      = (float)($companyPrice->VehicleSalePrice ?: $companyPrice->SlsPri ?: $item->VehicleSalePrice ?: $item->SlsPri);
                $cost_price      = (float)($companyPrice->NCostPrice ?: $item->CosPri);
            } elseif ($purchaseDet) {
                $tier1_qty       = $item->RtQty1;
                $tier1_discount  = $item->RtDis1;
                $tier2_qty       = $item->RtQty2;
                $tier2_discount  = $item->RtDis2;
                $cred_tier1_qty  = $item->CredQty1;
                $cred_tier1_dis  = $item->CredDis1;
                $cred_tier2_qty  = $item->CredQty2;
                $cred_tier2_dis  = $item->CredDis2;
                $dis_type        = $purchaseDet->discount_type ?: $item->RtDisType1;
                $unit_price      = (float)($purchaseDet->VehicleSalePrice ?: $purchaseDet->SalePrice ?: $item->VehicleSalePrice ?: $item->SlsPri);
                $cost_price      = (float)($purchaseDet->CostPrice ?: $item->CosPri);
            } else {
                $tier1_qty       = $item->RtQty1;
                $tier1_discount  = $item->RtDis1;
                $tier2_qty       = $item->RtQty2;
                $tier2_discount  = $item->RtDis2;
                $cred_tier1_qty  = $item->CredQty1;
                $cred_tier1_dis  = $item->CredDis1;
                $cred_tier2_qty  = $item->CredQty2;
                $cred_tier2_dis  = $item->CredDis2;
                $dis_type        = $item->RtDisType1;
                $unit_price      = (float)($item->VehicleSalePrice ?: $item->SlsPri);
                $cost_price      = (float)$item->CosPri;
            }

            $cus_discount_type = in_array(strtolower((string)$dis_type), ['p', 'percentage', '2', 2])
                ? 'percentage'
                : 'fixed';

            return [
                'itm_ky'             => $item->ItmKy,
                'item_code'          => $item->ItemCode,
                'item_name'          => $item->ItmNm,
                'barcode'            => $item->BarCode,
                'batch_no'           => $stock->batch_no,
                'available_qty'      => (float) $stock->quantity,
                'unit_price'         => $unit_price,
                'cost_price'         => $cost_price,
                'vat_inclusive'      => (bool) $item->VATItem,
                'unit'               => $item->Unit,
                'tier1_qty'          => $tier1_qty,
                'tier1_discount'     => $tier1_discount,
                'tier2_qty'          => $tier2_qty,
                'tier2_discount'     => $tier2_discount,
                'cred_tier1_qty'     => $cred_tier1_qty,
                'cred_tier1_discount'=> $cred_tier1_dis,
                'cred_tier2_qty'     => $cred_tier2_qty,
                'cred_tier2_discount'=> $cred_tier2_dis,
                'cus_discount_type'  => $cus_discount_type,
                'cus_discount_rate'  => 0,
            ];
        });

        return response()->json($stocks);
    }

    public function store(Request $request)
    {
        $request->validate([
            'section_code' => 'required|exists:sections,section_code',
            'shop_id' => 'required|exists:shops,id',
            'transaction_date' => 'required|date',
            'items' => 'required|array|min:1',
            'items.*.itm_ky' => 'required|exists:itemmaster,ItmKy',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'payment_mode' => 'required|in:cash,credit,cheque,card,transfer',
            'cash_amount' => 'nullable|numeric|min:0',
            'bank_account_id' => 'required_if:payment_mode,transfer|required_if:payment_mode,card|nullable|exists:bank_accounts,id',
            'reference_no' => 'required_if:payment_mode,cheque|required_if:payment_mode,transfer|nullable|string|max:100',
            'bank_name' => 'required_if:payment_mode,cheque|nullable|string|max:100',
            'branch' => 'required_if:payment_mode,cheque|nullable|string|max:100',
            'cheque_date' => 'required_if:payment_mode,cheque|nullable|date',
            'discount_type' => 'nullable|in:fixed,percentage',
            'discount_value' => 'nullable|numeric|min:0',
        ]);

        return DB::transaction(function () use ($request) {
            $user = Auth::user();
            $shop = Shop::findOrFail($request->shop_id);

            // 1. Create Delivery Record
            $delivery = Delivery::create([
                'delivery_number' => 'TEMP-' . uniqid(),
                'delivery_route_id' => $shop->delivery_route_id,
                'assigned_user_id' => $user->id,
                'section_code' => $request->section_code,
                'shop_id' => $shop->id,
                'status' => 'delivered', // Directly delivered
                'company_code' => $user->company_code,
                'customer_name' => $shop->name ?? 'Unknown Shop',
                'customer_address' => $shop->address ?? 'N/A',
                'customer_phone' => $shop->contact_phone ?? 'N/A',
                'delivery_date' => $request->transaction_date,
                'delivery_time' => 'anytime',
                'priority' => 'normal',
                'notes' => 'Direct sale from vehicle',
                'discount_type' => $request->discount_type ?? 'fixed',
                'discount_value' => $request->discount_value ?? 0,
            ]);

            // Update with proper number (company-isolated sequence)
            $delivery->update([
                'delivery_number' => $this->getNextInvoiceNo($user->company_code)
            ]);
            $delivery->refresh(); // Ensure in-memory model reflects the new delivery_number

            $totalAmount = 0;

            // 2. Create Items & Deduct Stock
            foreach ($request->items as $itemData) {
                $product = Product::findOrFail($itemData['itm_ky']);
                $grossAmount    = $itemData['quantity'] * $itemData['unit_price'];
                $itemDiscount   = (float)($itemData['discount_amount'] ?? 0);
                $lineNet        = max(0, $grossAmount - $itemDiscount);
                $totalAmount   += $lineNet;

                DeliveryItem::create([
                    'delivery_id'     => $delivery->id,
                    'ItmKy'           => $product->ItmKy,
                    'batch_no'        => $itemData['batch_no'] ?? '',
                    'serial_number'   => $itemData['serial_number'] ?? null,
                    'brand'           => $itemData['brand'] ?? null,
                    'model'           => $itemData['model'] ?? null,
                    'warranty'        => $itemData['warranty'] ?? null,
                    'section_code'    => $user->section_code,
                    'ItemCode'        => $product->ItemCode,
                    'ItemName'        => $product->ItmNm,
                    'Unit'            => $product->Unit,
                    'quantity'        => $itemData['quantity'],
                    'unit_price'      => $itemData['unit_price'],
                    'discount_amount' => $itemDiscount,
                    'total_amount'    => $lineNet,
                ]);

                // Deduct from Section Stock
                StockInHand::create([
                    'RefNo'            => $delivery->delivery_number,
                    'Cky'              => $shop->id,
                    'company_code'     => $user->company_code,
                    'owner_company_code' => $user->company_code,
                    'section_code'     => $request->section_code,
                    'OrdDate'          => now()->format('Y-m-d'),
                    'ItemKy'           => $product->ItmKy,
                    'Qty'              => -abs($itemData['quantity']),
                    'FreeQty'          => 0,
                    'TrnTyp'           => 'SDEL-OUT',
                    'OrdKy'            => $delivery->id,
                    'batch_no'         => $itemData['batch_no'] ?? null,
                    'serial_number'    => $itemData['serial_number'] ?? null,
                ]);
            }

            // 3. Apply global invoice-level discount on top of item-tier subtotal
            $globalDiscountValue = (float)($request->discount_value ?? 0);
            $globalDiscountAmount = 0;
            if ($request->discount_type === 'percentage') {
                $globalDiscountAmount = $totalAmount * ($globalDiscountValue / 100);
            } else {
                $globalDiscountAmount = $globalDiscountValue;
            }
            $finalTotal = max(0, $totalAmount - $globalDiscountAmount);

            $delivery->update([
                'total_amount' => $finalTotal
            ]);


            $paidAmount = (float) $request->cash_amount;
            if ($request->payment_mode === 'cash' && !$paidAmount) {
                $paidAmount = $finalTotal;
            }

            $recordedPayment = min($paidAmount, $finalTotal);

            if ($request->payment_mode !== 'credit' && $recordedPayment > 0) {
                $paymentRecord = DeliveryPayment::create([
                    'delivery_id' => $delivery->id,
                    'amount' => $recordedPayment,
                    'method' => $request->payment_mode,
                    'cheque_no' => $request->payment_mode === 'cheque' ? $request->reference_no : null,
                    'status' => 'cleared',
                    'reference_no' => $request->payment_mode !== 'cheque' ? $request->reference_no : null,
                    'bank_account_id' => $request->bank_account_id,
                    'bank_name' => $request->bank_name,
                    'branch' => $request->branch,
                    'payment_date' => $request->transaction_date,
                    'recorded_by' => $user->id,
                    'company_code' => $user->company_code,
                    'notes' => 'Direct payment for ' . $delivery->delivery_number,
                ]);

                // Finance Account Transaction for Cash collected by Delivery Rep
                if ($request->payment_mode === 'cash') {
                    $deliveryFinanceAccount = \App\Models\FinanceAccount::where('account_name', 'like', '%Delivery Sales%')
                        ->where('section_code', $user->section_code)
                        ->first() ?? \App\Models\FinanceAccount::find(41); // Fallback to ID 41 (Delivery Sales)

                    if ($deliveryFinanceAccount) {
                        if (in_array($deliveryFinanceAccount->main_category->value ?? 'assets', ['liabilities', 'revenue', 'equity'])) {
                            $deliveryFinanceAccount->current_balance -= $recordedPayment; // Debit decreases liability/revenue
                        } else {
                            $deliveryFinanceAccount->current_balance += $recordedPayment; // Debit increases asset
                        }
                        $deliveryFinanceAccount->save();

                        \App\Models\FinanceAccountTransaction::create([
                            'finance_account_id' => $deliveryFinanceAccount->id,
                            'date' => $request->transaction_date,
                            'source_type' => 'Delivery Sale',
                            'source_id' => $delivery->id,
                            'description' => 'Delivery Cash Sale - ' . $delivery->delivery_number,
                            'method' => 'cash',
                            'type' => 'debit',
                            'amount' => $recordedPayment,
                            'reference' => $delivery->delivery_number,
                            'running_balance' => 0
                        ]);
                    }
                }
            }

            return redirect()->back()->with([
                'success' => 'Direct sale recorded successfully',
                'delivery_id' => $delivery->id
            ]);
        });
    }

    public function searchPrinters(Request $request)
    {
        $user = Auth::user();
        $search = $request->input('search');
        $sectionCode = $request->input('section_code');

        if (empty($search)) {
            return response()->json([]);
        }

        // Source 1: purchase_det (GRN data)
        $purchaseQuery = PurchaseDet::join('itemmaster as im', 'purchase_det.iTimKy', '=', 'im.ItmKy')
            ->leftJoin('brands as b', 'im.brand_id', '=', 'b.id')
            ->leftJoin('models as m', 'im.models_id', '=', 'm.id')
            ->select(
                'purchase_det.serial_number',
                'purchase_det.batch_no',
                'b.name as brand',
                'm.name as model',
                'im.warranty',
                'im.ItmKy as ItemKy',
                'im.CredQty1',
                'im.CredDis1',
                'im.CredQty2',
                'im.CredDis2',
                'im.RtDisType1 as cus_discount_type',
                DB::raw('COALESCE(NULLIF(purchase_det.CusDiscountRate, 0), im.RtDis1, 0) as CusDiscountRate'),
                'im.ItemCode as item_code',
                'im.ItmNm as item_name',
                'im.BarCode as barcode',
                'im.Unit as unit',
                'im.VATItem as vat_inclusive',
                'purchase_det.SalePrice as unit_price',
                'purchase_det.VehicleSalePrice as vehicle_sale_price',
                'purchase_det.CostPrice as cost_price'
            )
            ->where('purchase_det.company_code', $user->company_code)
            ->whereNotNull('purchase_det.serial_number')
            ->where('purchase_det.serial_number', '!=', '')
            ->where(function ($q) use ($search) {
                $q->where('purchase_det.serial_number', 'like', "%{$search}%")
                  ->orWhere('im.BarCode', 'like', "%{$search}%")
                  ->orWhere('im.ItmNm', 'like', "%{$search}%")
                  ->orWhere('b.name', 'like', "%{$search}%")
                  ->orWhere('m.name', 'like', "%{$search}%");
            });

        // Source 2: stock_adjustment_items (Adjustment data)
        $adjustmentQuery = \App\Models\StockAdjustmentItem::join('stock_adjustments', 'stock_adjustment_items.adjustment_id', '=', 'stock_adjustments.id')
            ->leftJoin('itemmaster as im', 'stock_adjustment_items.product_id', '=', 'im.ItmKy')
            ->leftJoin('brands as b', 'im.brand_id', '=', 'b.id')
            ->leftJoin('models as m', 'im.models_id', '=', 'm.id')
            ->select(
                'stock_adjustment_items.serial_number',
                'stock_adjustment_items.batch_no',
                'b.name as brand',
                'm.name as model',
                'im.warranty',
                'stock_adjustment_items.product_id as ItemKy',
                'im.CredQty1',
                'im.CredDis1',
                'im.CredQty2',
                'im.CredDis2',
                'im.RtDisType1 as cus_discount_type',
                DB::raw('im.RtDis1 as CusDiscountRate'),
                'im.ItemCode as item_code',
                'im.ItmNm as item_name',
                'im.BarCode as barcode',
                'im.Unit as unit',
                'im.VATItem as vat_inclusive',
                'stock_adjustment_items.sale_price as unit_price',
                'im.VehicleSalePrice as vehicle_sale_price',
                'stock_adjustment_items.cost_price as cost_price'
            )
            ->where('stock_adjustments.company_code', $user->company_code)
            ->whereNotNull('stock_adjustment_items.serial_number')
            ->where('stock_adjustment_items.serial_number', '!=', '')
            ->where(function ($q) use ($search) {
                $q->where('stock_adjustment_items.serial_number', 'like', "%{$search}%")
                  ->orWhere('im.ItmNm', 'like', "%{$search}%")
                  ->orWhere('b.name', 'like', "%{$search}%")
                  ->orWhere('m.name', 'like', "%{$search}%");
            });

        $allResults = $purchaseQuery->union($adjustmentQuery)->take(50)->get();

        // Batch load stock for all serial numbers at once
        $serialNumbers = $allResults->pluck('serial_number')->filter()->values()->toArray();
        $stockMap = [];
        if (!empty($serialNumbers)) {
            $stockQuery = StockInHand::whereIn('serial_number', $serialNumbers)
                ->select('serial_number', DB::raw('SUM(Qty + COALESCE(FreeQty, 0)) as total_qty'))
                ->groupBy('serial_number');
            if ($sectionCode) {
                $stockQuery->where('section_code', $sectionCode);
            }
            $stockMap = $stockQuery->pluck('total_qty', 'serial_number')->toArray();
        }

        // Filter and map results
        $results = $allResults->filter(function ($printer) use ($stockMap) {
            $stock = $stockMap[$printer->serial_number] ?? 0;
            return $stock > 0;
        })->map(function ($printer) use ($stockMap) {
            $stockQty = $stockMap[$printer->serial_number] ?? 0;
            $unitPrice = (float) ($printer->vehicle_sale_price ?: $printer->unit_price);
            return [
                'serial_number' => $printer->serial_number,
                'brand' => $printer->brand,
                'model' => $printer->model,
                'warranty' => $printer->warranty,
                'batch_no' => $printer->batch_no,
                'itm_ky' => $printer->ItemKy,
                'item_code' => $printer->item_code,
                'item_name' => $printer->item_name,
                'barcode' => $printer->barcode,
                'unit' => $printer->unit,
                'vat_inclusive' => (bool) $printer->vat_inclusive,
                'unit_price' => $unitPrice,
                'cost_price' => (float) $printer->cost_price,
                'stock' => (float) $stockQty,
                'cred_tier1_qty' => $printer->CredQty1,
                'cred_tier1_discount' => $printer->CredDis1,
                'cred_tier2_qty' => $printer->CredQty2,
                'cred_tier2_discount' => $printer->CredDis2,
                'cus_discount_type' => $printer->cus_discount_type === '%' || $printer->cus_discount_type === 'percentage' ? 'percentage' : 'fixed',
                'cus_discount_rate' => $printer->CusDiscountRate,
            ];
        })->values();

        return response()->json($results);
    }

    public function getShopOutstanding($shopId)
    {
        $user = auth()->user();

        $deliveries = \App\Models\Delivery::where('shop_id', $shopId)
            ->where('company_code', $user->company_code)
            ->whereIn('status', ['delivered', 'delivering', 'assigned'])
            ->with(['items', 'payments'])
            ->get()
            ->filter(fn($d) => abs($d->outstanding_balance) > 0.005);

        $totalOutstanding = (float) $deliveries->sum(fn($d) => $d->outstanding_balance);
        $deliveryCount = $deliveries->count();

        $invoices = $deliveries->map(function ($d) {
            $date = \Carbon\Carbon::parse($d->created_at);
            return [
                'id' => $d->id,
                'invoice_no' => $d->delivery_number ?? 'N/A',
                'outstanding' => (float) $d->outstanding_balance,
                'age_in_days' => intval($date->diffInDays(now())),
                'date' => $date->format('Y-m-d')
            ];
        })->values()->toArray();

        return response()->json([
            'outstanding' => $totalOutstanding,
            'credit' => $totalOutstanding < 0,
            'delivery_count' => $deliveryCount,
            'invoices' => $invoices,
        ]);
    }

    private function getNextInvoiceNo($companyCode)
    {
        $lastDelivery = Delivery::where('company_code', $companyCode)
            ->where('delivery_number', 'like', 'DEL-%')
            ->orderBy('id', 'desc')
            ->first();
            
        if (!$lastDelivery) {
            return 'DEL-0000001';
        }

        // Extract numeric part
        preg_match('/DEL-(\d+)/', $lastDelivery->delivery_number, $matches);
        $nextId = isset($matches[1]) ? (int)$matches[1] + 1 : $lastDelivery->id + 1;
        
        return 'DEL-' . str_pad($nextId, 7, '0', STR_PAD_LEFT);
    }
}

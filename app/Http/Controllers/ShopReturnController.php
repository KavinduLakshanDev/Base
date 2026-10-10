<?php

namespace App\Http\Controllers;

use App\Models\Delivery;
use App\Models\ShopReturn;
use App\Models\ShopReturnItem;
use App\Models\Shop;
use App\Models\Vehicle;
use App\Models\User;
use App\Models\Section;
use App\Services\VehicleStockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Barryvdh\DomPDF\Facade\Pdf;

class ShopReturnController extends Controller
{
    protected $stockService;

    public function __construct(VehicleStockService $stockService)
    {
        $this->stockService = $stockService;
    }

    public function index(Request $request)
    {
        if (!request()->user()->hasPermission('shop_returns.view') && !request()->user()->hasPermission('sales.returns') && !request()->user()->hasPermission('deliveries.view')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $companyCode = request()->user()->company_code;
        $query = ShopReturn::where('company_code', $companyCode)
            ->with(['shop:id,name', 'section:id,section_code,name', 'delivery:id,delivery_number', 'user:id,first_name,last_name'])
            ->orderBy('return_date', 'desc')
            ->orderBy('id', 'desc');

        // Simple filtering
        if ($request->search) {
            $query->whereHas('shop', function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%");
            });
        }
        if ($request->date_from) {
            $query->where('return_date', '>=', $request->date_from);
        }
        if ($request->date_to) {
            $query->where('return_date', '<=', $request->date_to);
        }

        $perPage = $request->input('per_page', 20);

        return Inertia::render('ShopReturn/Index', [
            'shopReturns' => $query->paginate($perPage)->withQueryString(),
            'filters' => $request->only(['search', 'date_from', 'date_to', 'per_page']),
        ]);
    }

    public function show($id)
    {
        if (!request()->user()->hasPermission('shop_returns.view') && !request()->user()->hasPermission('sales.returns') && !request()->user()->hasPermission('deliveries.view')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $companyCode = request()->user()->company_code;
        $return = ShopReturn::where('id', $id)
            ->where('company_code', $companyCode)
            ->with([
                'shop', 
                'section', 
                'delivery:id,delivery_number',
                'user:id,first_name,last_name',
                'items' => function($q) {
                    $q->select('shop_return_items.*')
                      ->leftJoin('itemmaster', 'itemmaster.ItmKy', '=', 'shop_return_items.item_ky')
                      ->addSelect('itemmaster.ItemCode', 'itemmaster.ItmNm as item_name');
                }
            ])
            ->firstOrFail();

        return Inertia::render('ShopReturn/Show', [
            'shopReturn' => $return,
        ]);
    }

    public function downloadPdf($id)
    {
        if (!request()->user()->hasPermission('shop_returns.view') && !request()->user()->hasPermission('sales.returns') && !request()->user()->hasPermission('deliveries.view')) {
            abort(403, 'Unauthorized.');
        }

        $companyCode = request()->user()->company_code;
        $return = ShopReturn::where('id', $id)
            ->where('company_code', $companyCode)
            ->with([
                'shop', 
                'section', 
                'delivery:id,delivery_number',
                'user:id,first_name,last_name',
                'items' => function($q) {
                    $q->select('shop_return_items.*')
                      ->leftJoin('itemmaster', 'itemmaster.ItmKy', '=', 'shop_return_items.item_ky')
                      ->addSelect('itemmaster.ItemCode', 'itemmaster.ItmNm as item_name');
                }
            ])
            ->firstOrFail();

        $company = \App\Models\Company::where('company_code', $companyCode)->first() ?? \App\Models\Company::first();

        $data = [
            'shopReturn' => $return,
            'company' => $company,
            'generated_at' => now()->format('Y-m-d H:i:A'),
            'generated_by' => request()->user()->name ?? 'System',
        ];

        $pdf = Pdf::loadView('shop_return_pdf', $data);
        
        $filename = 'Shop_Return_SR-' . str_pad($return->id, 6, '0', STR_PAD_LEFT) . '_' . date('Ymd_His') . '.pdf';
        
        return $pdf->download($filename);
    }

    public function create()
    {
        if (!request()->user()->hasPermission('shop_returns.create') && !request()->user()->hasPermission('sales.returns') && !request()->user()->hasPermission('deliveries.view')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $companyCode = request()->user()->company_code;
        $shops = Shop::where('company_code', $companyCode)->where('is_active', true)->get();
        $vehicles = Vehicle::where('company_code', $companyCode)->where('is_active', true)->get();
        $sections = Section::where('company_code', $companyCode)->orderBy('name')->get(['section_code', 'name']);

        return Inertia::render('ShopReturn/Create', [
            'shops' => $shops,
            'vehicles' => $vehicles,
            'sections' => $sections,
        ]);
    }

    /**
     * API: Get deliveries for a given shop (used to populate Delivery No dropdown).
     */
    public function shopDeliveries(Request $request)
    {
        $request->validate(['shop_id' => 'required|integer']);

        $companyCode = request()->user()->company_code;

        $deliveries = Delivery::where('shop_id', $request->shop_id)
            ->where('company_code', $companyCode)
            ->where('status', '!=', 'cancelled')
            ->with(['vehicle:id,name,registration_no'])
            ->orderBy('delivery_date', 'desc')
            ->orderBy('id', 'desc')
            ->get(['id', 'delivery_number', 'delivery_date', 'vehicle_id']);

        return response()->json($deliveries);
    }

    /**
     * API: Get items belonging to a specific delivery (used to populate product dropdown).
     */
    public function deliveryItems(Request $request)
    {
        $request->validate(['delivery_id' => 'required|integer']);

        $companyCode = request()->user()->company_code;

        $delivery = Delivery::with('payments')->where('id', $request->delivery_id)
            ->where('company_code', $companyCode)
            ->firstOrFail();

        // Only include items that still have returnable quantity remaining.
        $items = $delivery->items()
            ->select('id', 'ItmKy', 'ItemCode', 'ItemName', 'batch_no', 'unit_price', 'quantity', 'returned_quantity')
            ->whereRaw('(quantity - returned_quantity) > 0')
            ->get()
            ->map(fn($i) => [
                'item_ky'    => (string) $i->ItmKy,
                'item_code'  => $i->ItemCode,
                'item_name'  => $i->ItemName,
                'batch_no'   => $i->batch_no,
                'unit_price' => (float) $i->unit_price,
                'quantity'   => (float) ($i->quantity - $i->returned_quantity),  // remaining returnable qty
            ]);

        // Calculate payment summary
        $totalPaid = $delivery->payments->where('status', 'cleared')->sum('amount');
        $methods = $delivery->payments->where('status', 'cleared')->pluck('method')->unique()->values();

        return response()->json([
            'items' => $items,
            'payment_summary' => [
                'total_amount' => $delivery->total_amount,
                'total_paid' => $totalPaid,
                'methods' => $methods,
            ]
        ]);
    }

    public function store(Request $request)
    {
        if (!request()->user()->hasPermission('shop_returns.create') && !request()->user()->hasPermission('sales.returns') && !request()->user()->hasPermission('deliveries.view')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $request->validate([
            'shop_id' => 'required|exists:shops,id',
            'delivery_id' => 'nullable|exists:deliveries,id',
            'section_code' => 'required|string|exists:sections,section_code',
            'return_date' => 'required|date',
            'notes' => 'nullable|string',
            'refund_method' => 'required|in:cash,credit_note',
            'refund_amount' => 'required|numeric|min:0',
            'items' => 'required|array|min:1',
            'items.*.item_ky' => 'required|string',
            'items.*.batch_no' => 'required|string',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'nullable|numeric|min:0',
        ]);

        $companyCode = request()->user()->company_code;

        DB::beginTransaction();
        try {
            $totalReturnAmount = 0;
            foreach ($request->items as $it) {
                $totalReturnAmount += ($it['quantity'] * ($it['unit_price'] ?? 0));
            }

            $sr = ShopReturn::create([
                'shop_id' => $request->shop_id,
                'section_code' => $request->section_code,
                'delivery_id' => $request->delivery_id,
                'recorded_by' => request()->user()->id,
                'company_code' => $companyCode,
                'return_date' => $request->return_date,
                'notes' => $request->notes,
                'status' => 'approved', 
                'total_return_amount' => $totalReturnAmount,
                'refund_amount' => $request->refund_amount,
                'refund_method' => $request->refund_method,
            ]);

            foreach ($request->items as $it) {
                ShopReturnItem::create([
                    'shop_return_id' => $sr->id,
                    'item_ky' => $it['item_ky'],
                    'batch_no' => $it['batch_no'] ?? null,
                    'quantity' => $it['quantity'],
                    'unit_price' => $it['unit_price'] ?? 0,
                ]);

                // 1) Reduce delivered quantities on matching DeliveryItem(s) for this shop.
                $remainingToAdjust = (float)$it['quantity'];
                $deliveryQuery = Delivery::query()
                    ->where('shop_id', $request->shop_id)
                    ->where('company_code', $companyCode)
                    ->where('status', '!=', 'cancelled');

                if ($request->delivery_id) {
                    $deliveryQuery->where('id', $request->delivery_id);
                }

                $deliveries = $deliveryQuery->orderBy('delivery_date', 'asc')->get();

                foreach ($deliveries as $delivery) {
                    /** @var \App\Models\Delivery $delivery */
                    if ($remainingToAdjust <= 0) break;

                    $dItemQuery = $delivery->items()
                        ->where('ItmKy', $it['item_ky'])
                        ->where('batch_no', $it['batch_no'] ?? 'DEFAULT');

                    $dItems = $dItemQuery->whereRaw('(quantity - returned_quantity) > 0')->orderBy('id', 'desc')->lockForUpdate()->get();

                    foreach ($dItems as $dItem) {
                        if ($remainingToAdjust <= 0) break;

                        $availableQty = (float)($dItem->quantity - $dItem->returned_quantity);
                        if ($availableQty <= 0) continue;

                        $deduct = min($availableQty, $remainingToAdjust);
                        $dItem->returned_quantity += $deduct;
                        $dItem->save();

                        $remainingToAdjust -= $deduct;
                    }
                }

                if ($remainingToAdjust > 0) {
                    throw new \Exception(
                        "Return quantity exceeds remaining delivered quantity for item #{$it['item_ky']}."
                    );
                }

                // 2) Credit to stock_in_hand (since we no longer return to vehicles)
                \App\Models\StockInHand::create([
                    'RefNo' => 'SHOP-RET',
                    'Cky' => null,
                    'company_code' => $companyCode,
                    'owner_company_code' => $companyCode,
                    'section_code' => $request->section_code,
                    'OrdDate' => now()->format('Y-m-d'),
                    'ItemKy' => $it['item_ky'],
                    'Qty' => $it['quantity'],
                    'FreeQty' => 0,
                    'TrnTyp' => 'SHOP-RET',
                    'OrdKy' => $sr->id,
                    'batch_no' => $it['batch_no'] ?? null,
                ]);
            }

            if ($request->refund_method === 'cash' && $request->refund_amount > 0 && $request->delivery_id) {
                $refundPayment = \App\Models\DeliveryPayment::create([
                    'delivery_id'  => $request->delivery_id,
                    'amount'       => -$request->refund_amount,
                    'method'       => 'cash',
                    'status'       => 'cleared',
                    'payment_date' => $request->return_date,
                    'recorded_by'  => request()->user()->id,
                    'company_code' => $companyCode,
                    'notes'        => 'Cash refund for shop return #' . $sr->id,
                ]);

                // Deduct refund amount from the Delivery Sales FinanceAccount
                $sectionCode = request()->user()->section_code ?? 'VIS-SEC-001';
                $cashAccount = \App\Models\FinanceAccount::where('account_name', 'like', '%Delivery Sales%')
                    ->where('section_code', $sectionCode)
                    ->lockForUpdate()
                    ->first() ?? \App\Models\FinanceAccount::find(41); // Fallback to ID 41 (Delivery Sales)

                if ($cashAccount) {
                    if (in_array($cashAccount->main_category->value ?? 'assets', ['liabilities', 'revenue', 'equity'])) {
                        $cashAccount->current_balance += $request->refund_amount; // Credit increases liability/revenue
                    } else {
                        $cashAccount->current_balance -= $request->refund_amount; // Credit decreases asset
                    }
                    $cashAccount->save();

                    $deliveryNo = \App\Models\Delivery::find($request->delivery_id)?->delivery_number ?? 'N/A';

                    \App\Models\FinanceAccountTransaction::create([
                        'finance_account_id' => $cashAccount->id,
                        'date'               => now(),
                        'source_type'        => 'Shop Return Cash Refund',
                        'source_id'          => $refundPayment->id,
                        'description'        => 'Cash refund for shop return #' . $sr->id . ' (Delivery: ' . $deliveryNo . ')',
                        'method'             => 'cash',
                        'type'               => 'credit',
                        'amount'             => $request->refund_amount,
                        'reference'          => $deliveryNo,
                    ]);
                }
            } elseif ($request->refund_method === 'credit_note' && $request->refund_amount > 0 && $request->delivery_id) {
                // We no longer explicitly create a 'credit_note' DeliveryPayment because the 
                // Delivery->returned_amount automatically natively reduces the outstanding_balance 
                // by the value of the returned goods, immediately surfacing it as an overpayment/credit!
            }

            $shop = \App\Models\Shop::find($request->shop_id);
            if ($shop) $shop->updateCurrentBalance();

            DB::commit();
            return redirect()->route('delivery.returns.index')->with('success', 'Return recorded successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Failed to record return: ' . $e->getMessage());
        }
    }
}

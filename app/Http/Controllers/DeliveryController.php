<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class DeliveryController extends Controller
{
    public function index()
    {
        if (!request()->user()->hasPermission('deliveries.view')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view deliveries.');
        }

        $user = request()->user();
        $companyCode = $user->company_code;

        $query = \App\Models\Delivery::with(['deliveryRoute', 'assignedUser', 'items', 'shop', 'payments'])
            ->where('company_code', $companyCode)
            ->orderByDesc('id');

        // Filter for Sales Reps: only show their own deliveries
        if ($user->role && $user->role->level === 'sales_rep') {
            $query->where('assigned_user_id', $user->id);
        }

        $deliveries = $query->get();


        $routesQuery = \App\Models\DeliveryRoute::where('company_code', $companyCode)->where('is_active', true);
        
        if ($user->role && $user->role->level === 'sales_rep') {
            $routesQuery->whereHas('users', fn($q) => $q->where('users.id', $user->id));
        }
        $routes = $routesQuery->get();
        $salesReps = \App\Models\User::where('company_code', $companyCode)
            ->whereHas('role', function($query) {
                $query->where('level', 'sales_rep');
            })
            ->where('is_active', true)
            ->get();

        return \Inertia\Inertia::render('delivery/index', [
            'deliveries' => $deliveries,
            'routes' => $routes,
            'salesReps' => $salesReps,
        ]);
    }

    public function create()
    {
        if (!request()->user()->hasPermission('deliveries.create')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to create deliveries.');
        }

        $companyCode = request()->user()->company_code;
        // Load routes with their assigned users & shops so the UI can filter without extra API calls
        // Load routes with their assigned users & shops so the UI can filter without extra API calls
        $user = request()->user();
        $routesQuery = \App\Models\DeliveryRoute::where('company_code', $companyCode)
            ->where('is_active', true)
            ->with(['users:id,first_name,last_name','shops:id,name,delivery_route_id']);

        if ($user->role && $user->role->level === 'sales_rep') {
            $routesQuery->whereHas('users', fn($q) => $q->where('users.id', $user->id));
        }

        $routes = $routesQuery->get()->map(function($route) {
            // ensure shops cached on the route include any that have been linked by
            // simply setting the delivery_route_id column (older paths of assignment)
            $extra = \App\Models\Shop::where('delivery_route_id', $route->id)
                ->select(['id','name'])
                ->get();
            $route->setRelation('shops', $route->shops->merge($extra));
            return $route;
        });

        $salesReps = \App\Models\User::where('company_code', $companyCode)
            ->whereHas('role', function($query) {
                $query->where('level', 'sales_rep');
            })
            ->where('is_active', true)
            ->get();
        
        // Determine user business unit for sharing logic
        $userBusinessUnit = null;
        if (str_starts_with($companyCode, 'MAL')) {
            $userBusinessUnit = 'malibo';
        } elseif (str_starts_with($companyCode, 'VIS')) {
            $userBusinessUnit = 'vismass';
        }

        // Get products from itemmaster table with pricing details
        $products = \App\Models\Product::where(function($query) use ($companyCode, $userBusinessUnit) {
                $query->where('company_code', $companyCode);
                if ($userBusinessUnit) {
                    $query->orWhereJsonContains('available_business_units', $userBusinessUnit);
                }
            })
            ->where('fInAct', false)
            ->select([
                'ItmKy as id',
                'ItmNm as name',
                'ItemCode as code',
                'BarCode as barcode',
                'catkey as category',
                'UnitKy as unit',
                'CosPri as cost_price',
                'SlsPri as sale_price',
                'VehicleSalePrice',
            ])
            ->orderBy('ItmNm')
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'name' => $item->name,
                    'code' => $item->code ?? '',
                    'barcode' => $item->barcode ?? '',
                    'category' => $item->category ?? 'N/A',
                    'unit' => $item->unit ?? 'Unit',
                    'cost_price' => $item->cost_price ?? 0,
                    'sale_price' => $item->sale_price ?? 0,
                    'VehicleSalePrice' => $item->VehicleSalePrice ?? 0,
                ];
            });

        // Get all sections for the company
        $sections = \App\Models\Section::where('company_code', $companyCode)
            ->orderByRaw('is_main_stock DESC, name ASC')
            ->get()
            ->map(function ($section) {
                return [
                    'id' => $section->id,
                    'section_code' => $section->section_code,
                    'name' => $section->name,
                ];
            });

        $vehiclesQuery = \App\Models\Vehicle::where('company_code', $companyCode)->where('is_active', true);
        if ($user->role && $user->role->level === 'sales_rep') {
            $vehiclesQuery->where('assigned_user_id', $user->id);
        }
        $vehicles = $vehiclesQuery->get();
        $shopsQuery = \App\Models\Shop::where('company_code', $companyCode)->where('is_active', true);
        if ($user->role && $user->role->level === 'sales_rep') {
            $assignedRouteIds = $user->routes()->pluck('delivery_routes.id');
            $shopsQuery->whereIn('delivery_route_id', $assignedRouteIds);
        }
        $shops = $shopsQuery->get();

        return \Inertia\Inertia::render('delivery/create', [
            'routes' => $routes,
            'salesReps' => $salesReps,
            'products' => $products,
            'sections' => $sections,
            'vehicles' => $vehicles,
            'shops' => $shops,
        ]);
    }

    public function store(Request $request)
    {
        if (!request()->user()->hasPermission('deliveries.create')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to create deliveries.');
        }

        $request->validate([
            'customer_name' => 'nullable|string',
            'customer_address' => 'nullable|string',
            'customer_phone' => 'nullable|string',
            'delivery_route_id' => 'required|exists:delivery_routes,id',
            'assigned_user_id' => 'nullable|exists:users,id',
            'vehicle_id' => 'nullable|exists:vehicles,id',
            'shop_id' => 'required|exists:shops,id',
            'delivery_date' => 'required|date',
            'delivery_time' => 'nullable|string',
            'priority' => 'nullable|string|in:low,normal,high,urgent',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.ItmKy' => 'required|string',
            'items.*.batch_no' => 'required|string',
            'items.*.section_code' => 'required|string',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
        ]);

        $companyCode = request()->user()->company_code;
        
        // business rule: a vehicle may not be scheduled for deliveries on two
        // different routes on the same date *and time slot*. deliveries with a
        // preferred time of 'anytime' conflict with any other booking on that
        // date.
        if ($request->filled('vehicle_id') && $request->filled('delivery_date') && $request->filled('delivery_route_id')) {
            $deliveryTime = $request->delivery_time;
            $conflictQuery = \App\Models\Delivery::where('company_code', $companyCode)
                ->where('vehicle_id', $request->vehicle_id)
                ->where('delivery_date', $request->delivery_date)
                ->where('delivery_route_id', '!=', $request->delivery_route_id)
                ->where('status', '!=', 'cancelled');

            if ($deliveryTime && $deliveryTime !== 'anytime') {
                $conflictQuery->where(function($q) use ($deliveryTime) {
                    $q->where('delivery_time', $deliveryTime)
                      ->orWhere('delivery_time', 'anytime');
                });
            }
            // if requested time is 'anytime' we leave the query as-is which will
            // match any existing delivery on that date (any slot).

            $conflict = $conflictQuery->exists();

            if ($conflict) {
                return back()->withErrors(['vehicle_id' => 'Selected vehicle is already assigned to another route/time on that date.'])->withInput();
            }
        }
        
        // Determine user business unit for sharing logic
        $userBusinessUnit = null;
        if (str_starts_with($companyCode, 'MAL')) {
            $userBusinessUnit = 'malibo';
        } elseif (str_starts_with($companyCode, 'VIS')) {
            $userBusinessUnit = 'vismass';
        }

        // Validate stock availability (respect vehicle selection when provided)
        // aggregate quantities by item+batch so duplicates are handled
        $aggregates = [];
        foreach ($request->items as $itemData) {
            $key = $itemData['ItmKy'] . '|' . ($itemData['batch_no'] ?? '');
            $aggregates[$key]['ItmKy'] = $itemData['ItmKy'];
            $aggregates[$key]['batch_no'] = $itemData['batch_no'] ?? '';
            $aggregates[$key]['section_code'] = $itemData['section_code'];
            $aggregates[$key]['quantity'] = ($aggregates[$key]['quantity'] ?? 0) + $itemData['quantity'];
        }

        foreach ($aggregates as $agg) {
            $itemMaster = \App\Models\Product::where('ItmKy', $agg['ItmKy'])
                ->where(function($query) use ($companyCode, $userBusinessUnit) {
                    $query->where('company_code', $companyCode);
                    if ($userBusinessUnit) {
                        $query->orWhereJsonContains('available_business_units', $userBusinessUnit);
                    }
                })
                ->first();

            if (!$itemMaster) {
                return back()->withErrors(['items' => 'One or more selected items are not available.'])->withInput();
            }

            if ($request->vehicle_id) {
                // Check availability in vehicle_stock
                $vehQuery = \App\Models\VehicleStock::where('vehicle_id', $request->vehicle_id)
                    ->where('item_ky', $agg['ItmKy']);
                if (!empty($agg['batch_no'])) {
                    $vehQuery->where('batch_no', $agg['batch_no']);
                }
                $vehicleStockQty = $vehQuery
                    ->selectRaw('COALESCE(SUM(quantity - reserved_quantity), 0) as total')
                    ->value('total') ?? 0;

                if ($agg['quantity'] > $vehicleStockQty) {
                    return back()->withErrors(['items' => "Insufficient vehicle stock for {$itemMaster->ItmNm}. Available: {$vehicleStockQty}"])->withInput();
                }
            } else {
                // Check stock availability in stock_in_hand table for the selected section
                $stockQuery = \App\Models\StockInHand::where('ItemKy', $agg['ItmKy'])
                    ->where('company_code', $companyCode)
                    ->where('section_code', $agg['section_code']);
                if (!empty($agg['batch_no'])) {
                    $stockQuery->where('batch_no', $agg['batch_no']);
                }
                $availableStock = $stockQuery
                    ->selectRaw('SUM(Qty + FreeQty) as total_stock')
                    ->value('total_stock') ?? 0;

                if ($agg['quantity'] > $availableStock) {
                    return back()->withErrors(['items' => "Insufficient stock for {$itemMaster->ItmNm} in selected section. Available: {$availableStock}"])->withInput();
                }
            }
        }

        // Wrap delivery + stock changes in a transaction so stock_in_hand stays consistent
        try {
            \Illuminate\Support\Facades\DB::transaction(function () use ($request, $companyCode) {
                // Create with a unique temporary placeholder so we can obtain the auto-increment ID
                // then replace the placeholder with a sequential, thread-safe delivery number
                $tempNumber = 'DEL-TEMP-' . uniqid('', true);

                $delivery = \App\Models\Delivery::create([
                    'delivery_number' => $tempNumber,
                    'customer_name' => $request->customer_name ?? 'General Customer',
                    'customer_address' => $request->customer_address ?? 'N/A',
                    'customer_phone' => $request->customer_phone ?? 'N/A',
                    'delivery_route_id' => $request->delivery_route_id,
                    'assigned_user_id' => $request->assigned_user_id,
                    'vehicle_id' => $request->vehicle_id ?? null,
                    'shop_id' => $request->shop_id ?? null,
                    'delivery_date' => $request->delivery_date,
                    'delivery_time' => $request->delivery_time,
                    'priority' => $request->priority ?? 'normal',
                    'notes' => $request->notes,
                    'company_code' => request()->user()->company_code,
                    'status' => 'assigned',
                ]);

                // Use a company-aware sequence instead of global ID
                $lastDelivery = \App\Models\Delivery::where('company_code', request()->user()->company_code)
                    ->where('delivery_number', 'like', 'DEL-%')
                    ->orderBy('id', 'desc')
                    ->first();
                
                $nextId = 1;
                if ($lastDelivery) {
                    preg_match('/DEL-(\d+)/', $lastDelivery->delivery_number, $matches);
                    $nextId = isset($matches[1]) ? (int)$matches[1] + 1 : $lastDelivery->id + 1;
                }

                $seq = str_pad($nextId, 7, '0', STR_PAD_LEFT);
                $finalNumber = 'DEL-' . $seq;
                $delivery->update(['delivery_number' => $finalNumber]);

                // Create delivery items and immediately deduct stock (create negative stock_in_hand record)
                $stockService = app(\App\Services\VehicleStockService::class);

                foreach ($request->items as $itemData) {
                // Re-determine business unit inside closure if needed or pass it down, 
                // but simpler to just query by ID since we validated existence above. 
                // However, to be safe and consistent:
                $userBusinessUnit = null;
                if (str_starts_with(request()->user()->company_code, 'MAL')) {
                    $userBusinessUnit = 'malibo';
                } elseif (str_starts_with(request()->user()->company_code, 'VIS')) {
                    $userBusinessUnit = 'vismass';
                }

                $itemMaster = \App\Models\Product::where('ItmKy', $itemData['ItmKy'])
                    ->where(function($query) use ($companyCode, $userBusinessUnit) {
                        $query->where('company_code', $companyCode);
                        if ($userBusinessUnit) {
                            $query->orWhereJsonContains('available_business_units', $userBusinessUnit);
                        }
                    })
                    ->first();

                if ($itemMaster) {
                    \App\Models\DeliveryItem::create([
                        'delivery_id' => $delivery->id,
                        'ItmKy' => $itemData['ItmKy'],
                        'batch_no' => $itemData['batch_no'] ?? '',
                        'section_code' => $itemData['section_code'],


                        'ItemCode' => $itemMaster->ItemCode,
                        'ItemName' => $itemMaster->ItmNm,
                        'Unit' => $itemMaster->Unit,
                        'quantity' => $itemData['quantity'],
                        'unit_price' => $itemData['unit_price'],
                        'total_amount' => $itemData['quantity'] * $itemData['unit_price'],
                    ]);

                    // If delivery is sourced from a vehicle, deduct from vehicle_stock (service handles stock_in_hand)
                    if ($request->vehicle_id) {
                        $stockService->deductFromVehicle((int) $request->vehicle_id, $itemData['ItmKy'], $itemData['batch_no'], (float) $itemData['quantity']);
                    } else {
                        // Deduct stock (negative Qty) for this delivery item from section
                        \App\Models\StockInHand::create([
                            'RefNo' => $delivery->delivery_number,
                            'OrdDate' => $delivery->delivery_date ?? now()->toDateString(),
                            'ItemKy' => $itemData['ItmKy'],
                            'Qty' => -1 * $itemData['quantity'],
                            'FreeQty' => 0,
                            'TrnTyp' => 'DELIVERY',
                            'batch_no' => $itemData['batch_no'] ?? '',
                            'company_code' => $companyCode,
                            'owner_company_code' => $companyCode,
                            'section_code' => $itemData['section_code'],
                            'serial_number' => null,
                            'brand' => null,
                            'model' => null,
                            'unit' => $itemMaster->Unit ?? null,
                            'warranty' => $itemMaster->warranty ?? null,
                        ]);
                    }
                }
            }
        });
        } catch (\Exception $e) {
            if (str_contains($e->getMessage(), 'Insufficient vehicle stock')) {
                return back()->withErrors(['items' => $e->getMessage()])->withInput();
            }
            throw $e;
        }

        return redirect()->route('delivery.index')->with('success', 'Delivery assigned successfully!');
    }

    /**
     * Simple endpoint used by the frontend to ensure the selected vehicle is
     * not already scheduled on a different route for the given date. Returns
     * a JSON object `{available: bool, message?: string}`.
     */
    public function checkVehicleAvailability(Request $request)
    {
        $request->validate([
            'vehicle_id' => 'required|exists:vehicles,id',
            'delivery_date' => 'required|date',
            'route_id' => 'required|exists:delivery_routes,id',
            'delivery_time' => 'required|string',
        ]);

        $companyCode = $request->user()->company_code;
        $deliveryTime = $request->delivery_time;
        $busyQuery = \App\Models\Delivery::where('company_code', $companyCode)
            ->where('vehicle_id', $request->vehicle_id)
            ->where('delivery_date', $request->delivery_date)
            ->where('delivery_route_id', '!=', $request->route_id)
            ->where('status', '!=', 'cancelled');

        if ($deliveryTime && $deliveryTime !== 'anytime') {
            $busyQuery->where(function($q) use ($deliveryTime) {
                $q->where('delivery_time', $deliveryTime)
                  ->orWhere('delivery_time', 'anytime');
            });
        }

        $busy = $busyQuery->exists();

        if ($busy) {
            return response()->json([
                'available' => false,
                'message' => 'Vehicle already assigned to another route on that date.'
            ]);
        }

        return response()->json(['available' => true]);
    }

    public function updateStatus(Request $request, \App\Models\Delivery $delivery)
    {
        // Allow either the dedicated update_status permission OR full edit permission
        if (!request()->user()->hasPermission('deliveries.update_status') && !request()->user()->hasPermission('deliveries.edit')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to update delivery status.');
        }

        $request->validate([
            'status' => 'required|in:pending,assigned,delivering,delivered,cancelled',
        ]);

        $oldStatus = $delivery->status;
        $newStatus = $request->status;

        // Business Rule: Prevent cancellation if payments have been recorded
        if ($newStatus === 'cancelled' && $delivery->paid_amount > 0) {
            return redirect()->back()->with('error', 'Cannot cancel a delivery that has received payments. Please remove or void the payments first.');
        }

        try {
            DB::transaction(function () use ($delivery, $oldStatus, $newStatus) {
                $delivery->update(['status' => $newStatus]);

                $stockService = app(\App\Services\VehicleStockService::class);

                // 1. Handle CANCELLATION (Restoring Stock)
                if ($oldStatus !== 'cancelled' && $newStatus === 'cancelled') {
                    // Only return stock if it wasn't already 'delivered' (customer already has it)
                    if (in_array($oldStatus, ['assigned', 'delivering', 'pending'])) {
                        foreach ($delivery->items as $item) {
                            if ($delivery->vehicle_id) {
                                $stockService->addToVehicle(
                                    (int) $delivery->vehicle_id,
                                    $item->ItmKy,
                                    $item->batch_no ?: null,
                                    (float) $item->quantity,
                                    $delivery->company_code
                                );
                            } else {
                                \App\Models\StockInHand::create([
                                    'RefNo' => $delivery->delivery_number . '-CAN',
                                    'OrdDate' => now()->toDateString(),
                                    'ItemKy' => $item->ItmKy,
                                    'Qty' => (float) $item->quantity,
                                    'FreeQty' => 0,
                                    'TrnTyp' => 'DELIVERY-RESTORE',
                                    'batch_no' => $item->batch_no,
                                    'company_code' => $delivery->company_code,
                                    'owner_company_code' => $delivery->company_code,
                                    'section_code' => $item->section_code,
                                    'unit' => $item->Unit ?? null,
                                ]);
                            }
                        }
                    }
                }

                // 2. Handle UN-CANCELLATION (Re-deducting Stock)
                if ($oldStatus === 'cancelled' && $newStatus !== 'cancelled') {
                    foreach ($delivery->items as $item) {
                        if ($delivery->vehicle_id) {
                            $stockService->deductFromVehicle(
                                (int) $delivery->vehicle_id,
                                $item->ItmKy,
                                $item->batch_no ?: null,
                                (float) $item->quantity
                            );
                        } else {
                            \App\Models\StockInHand::create([
                                'RefNo' => $delivery->delivery_number . '-REAC',
                                'OrdDate' => now()->toDateString(),
                                'ItemKy' => $item->ItmKy,
                                'Qty' => -1 * (float) $item->quantity,
                                'FreeQty' => 0,
                                'TrnTyp' => 'DELIVERY',
                                'batch_no' => $item->batch_no,
                                'company_code' => $delivery->company_code,
                                'owner_company_code' => $delivery->company_code,
                                'section_code' => $item->section_code,
                                'unit' => $item->Unit ?? null,
                            ]);
                        }
                    }
                }
            });
        } catch (\Exception $e) {
            $msg = $e->getMessage();
            if (str_contains($msg, 'Insufficient')) {
                return redirect()->back()->with('error', $msg);
            }
            throw $e;
        }

        return redirect()->back()->with('success', 'Status updated successfully.');
    }

    /**
     * Render a printable receipt for a delivery.
     */
    public function generateReceipt(\App\Models\Delivery $delivery)
    {
        if (!request()->user()->hasPermission('deliveries.view')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view deliveries.');
        }

        $companyCode = request()->user()->company_code;
        if ($delivery->company_code !== $companyCode) {
            abort(404);
        }

        $delivery->load(['items', 'deliveryRoute', 'assignedUser', 'shop']);

        // Fetch all outstanding deliveries for this customer
        $outstandingDeliveries = collect();
        
        $query = \App\Models\Delivery::where('company_code', $companyCode);

        // Identify customer by Shop ID, or fallback to Phone Number
        if ($delivery->shop_id) {
            $query->where('shop_id', $delivery->shop_id);
        } elseif ($delivery->customer_phone) {
            $query->whereNull('shop_id')->where('customer_phone', $delivery->customer_phone);
        } else {
            // Cannot reliably identify customer history without Shop ID or Phone
            // Just return the current delivery as the only "outstanding" one if applicable
            $query->where('id', $delivery->id);
        }

        // We only care about deliveries that *might* have outstanding balance.
        // Optimization: Filter out 'cancelled' to avoid noise, though outstanding check handles logic.
        $candidates = $query->where('status', '!=', 'cancelled')
            ->with(['items', 'payments']) // Eager load for accessors
            ->get();

        $outstandingDeliveries = $candidates->filter(function($d) {
            return $d->outstanding_balance > 0.005; // Filter > 0 with tolerance
        });

        return view('deliveries.receipt', [
            'delivery' => $delivery,
            'outstandingDeliveries' => $outstandingDeliveries
        ]);
    }

    public function show(\App\Models\Delivery $delivery)
    {
        if (!request()->user()->hasPermission('deliveries.view')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view deliveries.');
        }

        $companyCode = request()->user()->company_code;
        if ($delivery->company_code !== $companyCode) {
            abort(404);
        }

        $user = request()->user();
        $routesQuery = \App\Models\DeliveryRoute::where('company_code', $companyCode)
            ->where('is_active', true)
            ->with(['users:id,first_name,last_name','shops:id,name,delivery_route_id']);
        
        if ($user->role && $user->role->level === 'sales_rep') {
            $routesQuery->whereHas('users', fn($q) => $q->where('users.id', $user->id));
        }
        $routes = $routesQuery->get()->map(function($route) {
            $extra = \App\Models\Shop::where('delivery_route_id', $route->id)
                ->select(['id','name'])
                ->get();
            $route->setRelation('shops', $route->shops->merge($extra));
            return $route;
        });
        $salesReps = \App\Models\User::where('company_code', $companyCode)
            ->whereHas('role', function($query) {
                $query->where('level', 'sales_rep');
            })
            ->where('is_active', true)
            ->get();

        $delivery->load(['deliveryRoute', 'assignedUser', 'items', 'payments.recordedBy', 'shop']);

        $bankAccountsQuery = \App\Models\BankAccount::where('status', 'active');
        if ($user && $user->role_id !== 1) {
            if ($user->role_id === 3) {
                $bankAccountsQuery->where('section_code', $user->section_code);
            } else {
                $bankAccountsQuery->where('company_code', $user->company_code);
            }
        }
        $bankAccounts = $bankAccountsQuery->orderBy('bank_name')->get();

        // Fetch other outstanding deliveries for the same customer/shop
        $otherDeliveries = \App\Models\Delivery::with(['items', 'payments'])
            ->where('id', '!=', $delivery->id)
            ->where('company_code', $delivery->company_code)
            ->where(function($q) use ($delivery) {
                if ($delivery->shop_id) {
                    $q->where('shop_id', $delivery->shop_id);
                } else {
                    $q->where('customer_phone', $delivery->customer_phone)
                      ->where('customer_name', $delivery->customer_name);
                }
            })
            ->whereIn('status', ['delivered', 'delivering', 'assigned'])
            ->get()
            ->filter(fn($d) => $d->payment_status !== 'paid')
            ->values();

        return \Inertia\Inertia::render('delivery/show', [
            'delivery'       => $delivery,
            'invoiceTotal'   => $delivery->total_amount,
            'paidAmount'     => $delivery->paid_amount,
            'returnedAmount' => $delivery->returned_amount,
            'outstanding'    => $delivery->outstanding_balance,
            'paymentStatus'  => $delivery->payment_status,
            'routes'        => $routes,
            'salesReps'     => $salesReps,
            'bankAccounts'  => $bankAccounts,
            'otherDeliveries' => $otherDeliveries,
        ]);
    }

    public function edit(\App\Models\Delivery $delivery)
    {
        if (!request()->user()->hasPermission('deliveries.edit')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to edit deliveries.');
        }

        $companyCode = request()->user()->company_code;
        if ($delivery->company_code !== $companyCode) {
            abort(404);
        }

        $user = request()->user();
        $routesQuery = \App\Models\DeliveryRoute::where('company_code', $companyCode)
            ->where('is_active', true)
            ->with(['users:id,first_name,last_name','shops:id,name,delivery_route_id']);
        
        if ($user->role && $user->role->level === 'sales_rep') {
            $routesQuery->whereHas('users', fn($q) => $q->where('users.id', $user->id));
        }
        $routes = $routesQuery->get()->map(function($route) {
            $extra = \App\Models\Shop::where('delivery_route_id', $route->id)
                ->select(['id','name'])
                ->get();
            $route->setRelation('shops', $route->shops->merge($extra));
            return $route;
        });
        $salesReps = \App\Models\User::where('company_code', $companyCode)
            ->whereHas('role', function($query) {
                $query->where('level', 'sales_rep');
            })
            ->where('is_active', true)
            ->get();
        
        // Determine user business unit for sharing logic
        $userBusinessUnit = null;
        if (str_starts_with($companyCode, 'MAL')) {
            $userBusinessUnit = 'malibo';
        } elseif (str_starts_with($companyCode, 'VIS')) {
            $userBusinessUnit = 'vismass';
        }

        // Get products from itemmaster table with pricing details
        $products = \App\Models\Product::where(function($query) use ($companyCode, $userBusinessUnit) {
                $query->where('company_code', $companyCode);
                if ($userBusinessUnit) {
                    $query->orWhereJsonContains('available_business_units', $userBusinessUnit);
                }
            })
            ->where('fInAct', false)
            ->select([
                'ItmKy as id',
                'ItmNm as name',
                'ItemCode as code',
                'BarCode as barcode',
                'catkey as category',
                'UnitKy as unit',
                'CosPri as cost_price',
                'SlsPri as sale_price',
                'VehicleSalePrice',
            ])
            ->orderBy('ItmNm')
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'name' => $item->name,
                    'code' => $item->code ?? '',
                    'barcode' => $item->barcode ?? '',
                    'category' => $item->category ?? 'N/A',
                    'unit' => $item->unit ?? 'Unit',
                    'cost_price' => $item->cost_price ?? 0,
                    'sale_price' => $item->sale_price ?? 0,
                    'VehicleSalePrice' => $item->VehicleSalePrice ?? 0,
                ];
            });

        // Get all sections for the company
        $sections = \App\Models\Section::where('company_code', $companyCode)
            ->orderByRaw('is_main_stock DESC, name ASC')
            ->get()
            ->map(function ($section) {
                return [
                    'id' => $section->id,
                    'section_code' => $section->section_code,
                    'name' => $section->name,
                ];
            });

        $vehiclesQuery = \App\Models\Vehicle::where('company_code', $companyCode)->where('is_active', true);
        if ($user->role && $user->role->level === 'sales_rep') {
            $vehiclesQuery->where('assigned_user_id', $user->id);
        }
        $vehicles = $vehiclesQuery->get();
        $shopsQuery = \App\Models\Shop::where('company_code', $companyCode)->where('is_active', true);
        if ($user->role && $user->role->level === 'sales_rep') {
            $assignedRouteIds = $user->routes()->pluck('delivery_routes.id');
            $shopsQuery->whereIn('delivery_route_id', $assignedRouteIds);
        }
        $shops = $shopsQuery->get();

        return \Inertia\Inertia::render('delivery/edit', [
            'delivery' => $delivery->load(['deliveryRoute', 'assignedUser', 'items']),
            'routes' => $routes,
            'salesReps' => $salesReps,
            'products' => $products,
            'sections' => $sections,
            'vehicles' => $vehicles,
            'shops' => $shops,
        ]);
    }

    public function update(Request $request, \App\Models\Delivery $delivery)
    {
        if (!request()->user()->hasPermission('deliveries.edit')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to edit deliveries.');
        }

        $companyCode = request()->user()->company_code;
        if ($delivery->company_code !== $companyCode) {
            abort(404);
        }

        $request->validate([
            'customer_name' => 'required|string',
            'customer_address' => 'required|string',
            'customer_phone' => 'required|string',
            'route_id' => 'required|exists:delivery_routes,id',
            'assigned_user_id' => 'nullable|exists:users,id',
            'vehicle_id' => 'nullable|exists:vehicles,id',
            'shop_id' => 'required|exists:shops,id',
            'status' => 'required|in:assigned,delivering,delivered,cancelled',
            'items' => 'required|array|min:1',
            'items.*.ItmKy' => 'required|string',
            'items.*.batch_no' => 'required|string',
            'items.*.section_code' => 'required|string',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
        ]);

        // Ensure vehicle isn't already used for another route/time slot on this date
        if ($request->filled('vehicle_id') && $request->filled('delivery_date')) {
            $deliveryTime = $request->delivery_time;
            $conflictQuery = \App\Models\Delivery::where('company_code', $companyCode)
                ->where('vehicle_id', $request->vehicle_id)
                ->where('delivery_date', $request->delivery_date)
                ->where('delivery_route_id', '!=', $request->route_id)
                ->where('id', '!=', $delivery->id)
                ->where('status', '!=', 'cancelled');

            if ($deliveryTime && $deliveryTime !== 'anytime') {
                $conflictQuery->where(function($q) use ($deliveryTime) {
                    $q->where('delivery_time', $deliveryTime)
                      ->orWhere('delivery_time', 'anytime');
                });
            }

            if ($conflictQuery->exists()) {
                return back()->withErrors(['vehicle_id' => 'Selected vehicle is already assigned to another route/time on that date.'])->withInput();
            }
        }

        // Determine user business unit for sharing logic
        $userBusinessUnit = null;
        if (str_starts_with($companyCode, 'MAL')) {
            $userBusinessUnit = 'malibo';
        } elseif (str_starts_with($companyCode, 'VIS')) {
            $userBusinessUnit = 'vismass';
        }

        // Validate stock availability
        foreach ($request->items as $itemData) {
            $itemMaster = \App\Models\Product::where('ItmKy', $itemData['ItmKy'])
                ->where(function($query) use ($companyCode, $userBusinessUnit) {
                    $query->where('company_code', $companyCode);
                    if ($userBusinessUnit) {
                        $query->orWhereJsonContains('available_business_units', $userBusinessUnit);
                    }
                })
                ->first();
                
            if (!$itemMaster) {
                return back()->withErrors(['items' => 'One or more selected items are not available.'])->withInput();
            }

            if ($request->vehicle_id) {
                // Check availability in vehicle_stock (include old quantity if the same vehicle)
                $vehQuery = \App\Models\VehicleStock::where('vehicle_id', $request->vehicle_id)
                    ->where('item_ky', $itemData['ItmKy']);
                if (!empty($itemData['batch_no'])) {
                    $vehQuery->where('batch_no', $itemData['batch_no']);
                }
                $vehicleStockQty = $vehQuery
                    ->selectRaw('COALESCE(SUM(quantity - reserved_quantity), 0) as total')
                    ->value('total') ?? 0;

                // if editing an existing delivery on same vehicle, add back old quantity
                $oldQty = 0;
                if (isset($delivery) && $delivery->vehicle_id == $request->vehicle_id) {
                    $oldItem = $delivery->items->firstWhere('ItmKy', $itemData['ItmKy']);
                    if ($oldItem) {
                        $oldQty = $oldItem->quantity;
                    }
                }

                $availableForRequest = $vehicleStockQty + $oldQty;
                if ($itemData['quantity'] > $availableForRequest) {
                    return back()->withErrors(['items' => "Insufficient vehicle stock for {$itemMaster->ItmNm}. Available: {$availableForRequest}"])->withInput();
                }
            } else {
                // Check stock availability in stock_in_hand table for the selected section
                $stockQuery = \App\Models\StockInHand::where('ItemKy', $itemData['ItmKy'])
                    ->where('company_code', $companyCode)
                    ->where('section_code', $itemData['section_code']);
                if (!empty($itemData['batch_no'])) {
                    $stockQuery->where('batch_no', $itemData['batch_no']);
                }
                $availableStock = $stockQuery
                    ->selectRaw('SUM(Qty + FreeQty) as total_stock')
                    ->value('total_stock') ?? 0;

                if ($itemData['quantity'] > $availableStock) {
                    return back()->withErrors(['items' => "Insufficient stock for {$itemMaster->ItmNm} in selected section. Available: {$availableStock}"])->withInput();
                }
            }
        }

        // before making changes, verify vehicle availability just as create() does
        if ($request->vehicle_id) {
            $deliveryTime = $request->delivery_time;
            $busyQuery = \App\Models\Delivery::where('company_code', $companyCode)
                ->where('vehicle_id', $request->vehicle_id)
                ->where('delivery_date', $request->delivery_date)
                ->where('delivery_route_id', '!=', $request->route_id)
                ->where('status', '!=', 'cancelled')
                ->where('id', '!=', $delivery->id);
            if ($deliveryTime && $deliveryTime !== 'anytime') {
                $busyQuery->where(function($q) use ($deliveryTime) {
                    $q->where('delivery_time', $deliveryTime)
                      ->orWhere('delivery_time', 'anytime');
                });
            }
            if ($busyQuery->exists()) {
                return redirect()->back()->withErrors(['vehicle_id' => 'Vehicle already assigned to another route on that date.'])->withInput();
            }
        }

        // Wrap update + stock adjustments in a transaction
        try {
            \Illuminate\Support\Facades\DB::transaction(function () use ($request, $delivery, $companyCode) {
                // Update delivery header (don't overwrite priority with null — keep existing if not provided)
                $delivery->update([
                    'customer_name' => $request->customer_name,
                    'customer_address' => $request->customer_address,
                    'customer_phone' => $request->customer_phone,
                    'delivery_route_id' => $request->route_id,
                    'assigned_user_id' => $request->assigned_user_id,
                    'vehicle_id' => $request->vehicle_id ?? null,
                    'shop_id' => $request->shop_id ?? null,
                    'delivery_date' => $request->delivery_date,
                    'delivery_time' => $request->delivery_time,
                    'priority' => $request->priority ?? $delivery->priority,
                    'status' => $request->status,
                    'notes' => $request->notes,
                ]);

                $stockService = app(\App\Services\VehicleStockService::class);

                // Restore stock for existing delivery items (reverse previous deductions)
                foreach ($delivery->items as $oldItem) {
                    if ($delivery->vehicle_id) {
                        // restore back to vehicle stock
                        $stockService->addToVehicle($delivery->vehicle_id, $oldItem->ItmKy, $oldItem->batch_no, (float)$oldItem->quantity, $companyCode);
                    } else {
                        \App\Models\StockInHand::create([
                            'RefNo' => $delivery->delivery_number . '-RESTORE',
                            'OrdDate' => now()->toDateString(),
                            'ItemKy' => $oldItem->ItmKy,
                            'Qty' => $oldItem->quantity, // positive to restore
                            'FreeQty' => 0,
                            'TrnTyp' => 'DELIVERY-RESTORE',
                            'batch_no' => $oldItem->batch_no,
                            'company_code' => $companyCode,
                            'owner_company_code' => $companyCode,
                            'section_code' => $oldItem->section_code,
                            'serial_number' => null,
                            'brand' => null,
                            'model' => null,
                            'unit' => $oldItem->Unit ?? null,
                            'warranty' => null,
                        ]);
                    }
                }

                // Remove old items
                $delivery->items()->delete();

                // Create new items and deduct stock for each
                $stockService = app(\App\Services\VehicleStockService::class);

                // Re-determine business unit inside closure
                $userBusinessUnit = null;
                if (str_starts_with($companyCode, 'MAL')) {
                    $userBusinessUnit = 'malibo';
                } elseif (str_starts_with($companyCode, 'VIS')) {
                    $userBusinessUnit = 'vismass';
                }

                foreach ($request->items as $itemData) {
                    $itemMaster = \App\Models\Product::where('ItmKy', $itemData['ItmKy'])
                        ->where(function($query) use ($companyCode, $userBusinessUnit) {
                            $query->where('company_code', $companyCode);
                            if ($userBusinessUnit) {
                                $query->orWhereJsonContains('available_business_units', $userBusinessUnit);
                            }
                        })
                        ->first();

                    if ($itemMaster) {
                        \App\Models\DeliveryItem::create([
                            'delivery_id' => $delivery->id,
                            'ItmKy' => $itemData['ItmKy'],
                            'batch_no' => $itemData['batch_no'] ?? '',
                            'section_code' => $itemData['section_code'],
                            'ItemCode' => $itemMaster->ItemCode,
                            'ItemName' => $itemMaster->ItmNm,
                            'Unit' => $itemMaster->Unit,
                            'quantity' => $itemData['quantity'],
                            'unit_price' => $itemData['unit_price'],
                            'total_amount' => $itemData['quantity'] * $itemData['unit_price'],
                        ]);

                        if ($request->vehicle_id) {
                            $stockService->deductFromVehicle((int) $request->vehicle_id, $itemData['ItmKy'], $itemData['batch_no'], (float) $itemData['quantity']);
                        } else {
                            // Deduct stock for the new item from section
                            \App\Models\StockInHand::create([
                                'RefNo' => $delivery->delivery_number,
                                'OrdDate' => $delivery->delivery_date ?? now()->toDateString(),
                                'ItemKy' => $itemData['ItmKy'],
                                'Qty' => -1 * $itemData['quantity'],
                                'FreeQty' => 0,
                                'TrnTyp' => 'DELIVERY',
                                'batch_no' => $itemData['batch_no'] ?? null,
                                'company_code' => $companyCode,
                                'owner_company_code' => $companyCode,
                                'section_code' => $itemData['section_code'],
                                'serial_number' => null,
                                'brand' => null,
                                'model' => null,
                                'unit' => $itemMaster->Unit ?? null,
                                'warranty' => $itemMaster->warranty ?? null,
                            ]);
                        }
                    }
                }
            });
        } catch (\Exception $e) {
            if (str_contains($e->getMessage(), 'Insufficient vehicle stock')) {
                return back()->withErrors(['items' => $e->getMessage()])->withInput();
            }
            // rethrow anything unexpected so it surfaces during development/testing
            throw $e;
        }

        return redirect()->route('delivery.index')->with('success', 'Delivery updated successfully!');
    }

    public function destroy(\App\Models\Delivery $delivery)
    {
        if (!request()->user()->hasPermission('deliveries.delete')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to delete deliveries.');
        }

        $companyCode = request()->user()->company_code;
        if ($delivery->company_code !== $companyCode) {
            abort(404);
        }

        // Business Rule: Prevent deletion if payments have been recorded
        if ($delivery->paid_amount > 0) {
            return redirect()->back()->with('error', 'Cannot delete a delivery that has received payments. Please remove or void the payments first.');
        }

        // Restore stock for all items on delete, then remove delivery
        \Illuminate\Support\Facades\DB::transaction(function () use ($delivery, $companyCode) {
            $stockService = app(\App\Services\VehicleStockService::class);
            
            foreach ($delivery->items as $item) {
                if ($delivery->vehicle_id) {
                    // restore back to vehicle stock
                    $stockService->addToVehicle($delivery->vehicle_id, $item->ItmKy, $item->batch_no, (float)$item->quantity, $companyCode);
                } else {
                    // Restore to warehouse section
                    \App\Models\StockInHand::create([
                        'RefNo' => $delivery->delivery_number . '-RESTORE',
                        'OrdDate' => now()->toDateString(),
                        'ItemKy' => $item->ItmKy,
                        'Qty' => $item->quantity,
                        'FreeQty' => 0,
                        'TrnTyp' => 'DELIVERY-RESTORE',
                        'batch_no' => $item->batch_no,
                        'company_code' => $companyCode,
                        'owner_company_code' => $companyCode,
                        'section_code' => $item->section_code,
                        'serial_number' => null,
                        'brand' => null,
                        'model' => null,
                        'unit' => $item->Unit ?? null,
                        'warranty' => null,
                    ]);
                }
            }

            $delivery->delete();
        });

        return redirect()->route('delivery.index')->with('success', 'Delivery deleted successfully!');
    }

    public function getProductBatches(Request $request)
    {
        $productId = $request->input('product_id');
        $sectionId = $request->input('section_id');
        $companyCode = request()->user()->company_code;

        if (!$productId) {
            return response()->json([]);
        }

        $vehicleId = $request->input('vehicle_id');

        // --- Vehicle Stock Logic (Overrules Section Logic if vehicle_id is present) ---
        if ($vehicleId) {
            $batches = \App\Models\VehicleStock::where('vehicle_id', $vehicleId)
                ->where('item_ky', $productId)
                ->select(
                    'batch_no',
                    \Illuminate\Support\Facades\DB::raw('SUM(quantity - reserved_quantity) as available_quantity'),
                    \Illuminate\Support\Facades\DB::raw('MAX(updated_at) as last_date')
                )
                ->groupBy('batch_no')
                ->havingRaw('SUM(quantity - reserved_quantity) > 0')
                ->orderBy('last_date', 'desc')
                ->get()
                ->map(function ($batch) {
                    return [
                        'batch_no' => $batch->batch_no ?? null,
                        'serial_number' => null, // Vehicle stock doesn't track serials per se in this view
                        'available_quantity' => (float) $batch->available_quantity,
                        'brand' => null,
                        'model' => null,
                        'warranty' => null,
                        'last_date' => $batch->last_date,
                    ];
                });

            return response()->json($batches);
        }
        
        // --- Warehouse Section Stock Logic (Restored for Vehicle Loading) ---
        // Get section_code from section_id
        $sectionCode = null;
        if ($sectionId) {
            // Use where() instead of find() since we're filtering by company_code too
            $section = \App\Models\Section::where('company_code', $companyCode)
                ->where('id', $sectionId)
                ->first();
            $sectionCode = $section ? $section->section_code : null;
            
            Log::info('Product Batches - Section lookup', [
                'product_id' => $productId,
                'section_id' => $sectionId,
                'section_code' => $sectionCode
            ]);
        }

        // Query stock_in_hand for ALL transactions of this product
        $batchesQuery = \App\Models\StockInHand::where('ItemKy', $productId)
            ->where('company_code', $companyCode);

        if ($sectionCode) {
            $batchesQuery->where('section_code', $sectionCode);
        }

        // Group by batch_no and sum quantities
        $batches = $batchesQuery
            ->select(
                \Illuminate\Support\Facades\DB::raw('COALESCE(batch_no, "N/A") as batch_no'),
                \Illuminate\Support\Facades\DB::raw('GROUP_CONCAT(DISTINCT serial_number SEPARATOR ", ") as serial_number'),
                \Illuminate\Support\Facades\DB::raw('SUM(Qty + COALESCE(FreeQty, 0)) as total_quantity'),
                \Illuminate\Support\Facades\DB::raw('MAX(OrdDate) as last_date')
            )
            ->groupBy(\Illuminate\Support\Facades\DB::raw('COALESCE(batch_no, "N/A")'))
            ->havingRaw('SUM(Qty + COALESCE(FreeQty, 0)) > 0') // Only show batches with positive net stock
            ->orderBy('last_date', 'desc')
            ->get()
            ->map(function ($batch) {
                return [
                    'batch_no' => $batch->batch_no === 'N/A' ? null : $batch->batch_no,
                    'serial_number' => $batch->serial_number,
                    'available_quantity' => (float) $batch->total_quantity,
                    'last_date' => $batch->last_date,
                    'brand' => null,
                    'model' => null,
                    'warranty' => null,
                ];
            });

        return response()->json($batches);
    }

    public function unifiedSearch(Request $request)
    {
        $term = $request->input('term');
        $sectionId = $request->input('section_id');
        $companyCode = request()->user()->company_code;

        if (!$term || strlen($term) < 2) {
            return response()->json([]);
        }

        Log::info('Unified Search Debug', [
            'term' => $term,
            'section_id' => $sectionId,
            'company_code' => $companyCode
        ]);

        // Determine user business unit for sharing logic
        $userBusinessUnit = null;
        if (str_starts_with($companyCode, 'MAL')) {
            $userBusinessUnit = 'malibo';
        } elseif (str_starts_with($companyCode, 'VIS')) {
            $userBusinessUnit = 'vismass';
        }

        $query = \App\Models\Product::where(function($query) use ($companyCode, $userBusinessUnit) {
                $query->where('company_code', $companyCode);
                if ($userBusinessUnit) {
                    $query->orWhereJsonContains('available_business_units', $userBusinessUnit);
                }
            })
            ->where('fInAct', false)
            ->where(function($query) use ($term) {
                $query->where('ItmNm', 'like', '%' . $term . '%')
                      ->orWhere('ItemCode', 'like', '%' . $term . '%')
                      ->orWhere('BarCode', 'like', '%' . $term . '%');
            });

        // If vehicle_id is provided, filter products having available stock > 0 in that vehicle
        $vehicleId = $request->input('vehicle_id');
        if ($vehicleId) {
            $query->whereIn('ItmKy', function($sub) use ($vehicleId) {
                $sub->select('item_ky')
                    ->from('vehicle_stocks')
                    ->where('vehicle_id', $vehicleId)
                    ->groupBy('item_ky')
                    // Check if total quantity - reserved > 0
                    ->havingRaw('SUM(quantity - reserved_quantity) > 0');
            });
        } elseif ($sectionId) {
            // Restore section-based filtering for Loading Stock (Vehicle Stock page)
            // Use where() instead of find() since we're filtering by company_code too
            $section = \App\Models\Section::where('company_code', $companyCode)
                ->where('id', $sectionId)
                ->first();
            
            Log::info('Section lookup', [
                'section_id' => $sectionId,
                'section_found' => $section ? $section->section_code : 'NOT FOUND'
            ]);
            
            if ($section) {
                $query->whereIn('ItmKy', function($sub) use ($section, $companyCode) {
                    $sub->select('ItemKy')
                        ->from('stock_in_hand')
                        ->where('section_code', $section->section_code)
                        ->where('company_code', $companyCode)
                        ->groupBy('ItemKy')
                        ->havingRaw('SUM(Qty + COALESCE(FreeQty, 0)) > 0');
                });
            }
        }

        $products = $query->with(['itemPriceDet' => function($q) {
                // Eager load active price details, similar to SalesController
                $q->where('Status', 'A')->latest('ChangedDate');
            }])
            ->select([
                'ItmKy as id',
                'ItmNm as name',
                'ItemCode as code',
                'BarCode as barcode',
                'catkey as category',
                'UnitKy as unit',
                'CosPri as cost_price',
                'SlsPri as sale_price',
                'VehicleSalePrice',
            ])
            ->orderBy('ItmNm')
            ->limit(20)
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'name' => $item->name,
                    'code' => $item->code ?? '',
                    'barcode' => $item->barcode ?? '',
                    'category' => $item->category ?? 'N/A',
                    'unit' => $item->unit ?? 'Unit',
                    'cost_price' => $item->cost_price ?? 0,
                    'sale_price' => $item->sale_price ?? 0,
                    'VehicleSalePrice' => $item->itemPriceDet->first() ? $item->itemPriceDet->first()->VehicleSalePrice : ($item->VehicleSalePrice ?? 0),
                ];
            });

        return response()->json($products);
    }
}
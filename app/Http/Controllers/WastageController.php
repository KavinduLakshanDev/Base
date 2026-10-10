<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Wastage;
use App\Models\PurchaseDet;
use App\Models\StockInHand;
use App\Models\Section;
use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class WastageController extends Controller
{
    /**
     * Display a listing of the wastage records.
     */
    public function index()
    {
        if (! request()->user() || ! request()->user()->hasPermission('wastages.view')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view wastage records.');
        }

        $wastages = Wastage::with(['product.category', 'product.unit', 'recordedBy', 'section'])
            ->latest()
            ->paginate(15)
            ->through(function ($wastage) {
                return [
                    'id' => $wastage->id,
                    'product_name' => $wastage->product->ItmNm ?? $wastage->category ?? 'N/A',
                    'category' => $wastage->product->category->cname ?? $wastage->category ?? 'N/A',
                    'quantity' => $wastage->quantity,
                    'unit' => $wastage->product->unit->cname ?? $wastage->unit ?? 'Unit',
                    'cost_price' => $wastage->cost_price ?? 0,
                    'batch_no' => $wastage->batch_no,
                    'serial_number' => $wastage->serial_number,
                    'warranty' => $wastage->warranty,
                    'reason' => $wastage->reason,
                    'notes' => $wastage->notes,
                    'section_name' => $wastage->section->name ?? 'N/A',
                    'wastage_date' => $wastage->wastage_date,
                    'recorded_by' => $wastage->recordedBy->name ?? 'System',
                    'recorded_at' => $wastage->created_at->format('Y-m-d H:i'),
                    'status' => $wastage->status,
                ];
            });

        return Inertia::render('wastage/index', [
            'wastages' => $wastages,
        ]);
    }

    /**
     * Show the form for creating a new wastage record.
     */
    public function create()
    {
        if (! request()->user() || ! request()->user()->hasPermission('wastages.create')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to record wastage.');
        }

        // Get products from itemmaster table with pricing details
        $products = Product::where('item_type', 'product')
            ->where('is_service', false)
            ->leftJoin('code_masters', function($join) {
                $join->on('itemmaster.catkey', '=', 'code_masters.catkey')
                     ->where('code_masters.conkey', '=', 'CAT');
            })
            ->select([
                'itemmaster.ItmKy as id',
                'itemmaster.ItmNm as name',
                'itemmaster.ItemCode as code',
                'itemmaster.BarCode as barcode',
                'code_masters.cname as category',
                'itemmaster.UnitKy as unit',
                'itemmaster.CosPri as cost_price',
                'itemmaster.SlsPri as sale_price',
            ])
            ->orderBy('itemmaster.ItmNm')
            ->get()
        ->map(function ($item) {
            // Get latest price details if available
            $latestPrice = DB::table('item_price_det')
                ->where('ItmKy', $item->id)
                ->where('Status', 'A')
                ->orderBy('ChangedDate', 'desc')
                ->first();

            // Note: Stock quantity is NOT shown here as it varies by batch and section
            // Use getProductBatches() API to get accurate batch-specific stock

            return [
                'id' => $item->id,
                'name' => $item->name,
                'code' => $item->code ?? '',
                'barcode' => $item->barcode ?? '',
                'category' => $item->category ?? 'N/A',
                'unit' => $item->unit ?? 'Unit',
                'cost_price' => $latestPrice->CosPri ?? $item->cost_price ?? 0,
                'sale_price' => $latestPrice->SlsPri ?? $item->sale_price ?? 0,
                'purchase_price' => $latestPrice->CosPri ?? $item->cost_price ?? 0,
            ];
        });

        // Get only sections that belong to current user's company
        $companyCode = request()->user()->company_code;
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

        return Inertia::render('wastage/create', [
            'products' => $products,
            'sections' => $sections,
        ]);
    }

    /**
     * Store a newly created wastage record in storage (supports multiple items).
     */
    public function store(Request $request)
    {
        if (! request()->user() || ! request()->user()->hasPermission('wastages.create')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to record wastage.');
        }

        // Check if this is a multi-item request
        if ($request->has('items') && is_array($request->items)) {
            return $this->storeMultipleItems($request);
        }

        // Original single-item logic
        // Basic validation without product_id existence check (to allow orphaned items)
        $validated = $request->validate([
            'product_id' => 'required',
            'quantity' => 'required|numeric|min:0.01',
            'reason' => 'required|string|max:255',
            'wastage_date' => 'required|date',
            'notes' => 'nullable|string|max:1000',
            'status' => 'required|in:pending,approved,rejected',
            'serial_number' => 'nullable|string|max:255',
            'batch_no' => 'nullable|string|max:255',
            'warranty' => 'nullable|string|max:255',
            'section_id' => [
                'required',
                \Illuminate\Validation\Rule::exists('sections', 'id')->where(function ($q) {
                    $q->where('company_code', request()->user()->company_code);
                }),
            ],
        ]);

        // Automatically approve pending wastage
        if ($validated['status'] === 'pending') {
            $validated['status'] = 'approved';
        }

        // Check if this is an orphaned purchase item (format: PD_123)
        $isOrphanedPurchase = is_string($validated['product_id']) && str_starts_with($validated['product_id'], 'PD_');
        
        if ($isOrphanedPurchase) {
            // Extract purchase detail ID
            $purchaseDetId = (int) str_replace('PD_', '', $validated['product_id']);
            $purchaseDet = PurchaseDet::find($purchaseDetId);
            
            if (!$purchaseDet) {
                return back()->withErrors(['product_id' => 'Invalid purchase detail reference.']);
            }

            // Create wastage record with purchase detail info
            Wastage::create([
                'product_id' => null, // No product link
                'category' => $purchaseDet->product->ItmNm ?? 'N/A',
                'quantity' => $validated['quantity'],
                'unit' => 'Unit',
                'reason' => $validated['reason'],
                'wastage_date' => $validated['wastage_date'],
                'notes' => ($validated['notes'] ?? '') . ' [Purchase Detail: ' . ($purchaseDet->product->ItmNm ?? 'N/A') . ', Serial: ' . $purchaseDet->serial_number . ']',
                'status' => $validated['status'],
                'recorded_by' => Auth::id(),
                'section_id' => $validated['section_id'],
            ]);
        } else {
            // Normal product from itemmaster
            $productId = (int) $validated['product_id'];
            
            // Verify product exists
            $product = Product::where('ItmKy', $productId)
                ->where('item_type', 'product')
                ->where('is_service', false)
                ->first();
            if (!$product) {
                return back()->withErrors(['product_id' => 'The selected product is invalid.']);
            }

            // Find specific stock record if serial number or batch number is provided
            $stockInHandId = null;
            $purchaseDetId = null;
            
            if (!empty($validated['serial_number']) || !empty($validated['batch_no'])) {
                $stockQuery = StockInHand::where('ItemKy', $productId)
                    ->where('Qty', '>', 0);
                
                if (!empty($validated['serial_number'])) {
                    $stockQuery->where('serial_number', $validated['serial_number']);
                }
                if (!empty($validated['batch_no'])) {
                    $stockQuery->where('batch_no', $validated['batch_no']);
                }
                
                $specificStock = $stockQuery->first();
                if ($specificStock) {
                    $stockInHandId = $specificStock->TableKy;
                }
                
                // Try to find the purchase detail record for reference
                $purchaseDetQuery = PurchaseDet::where('iTimKy', $productId);
                if (!empty($validated['serial_number'])) {
                    $purchaseDetQuery->where('serial_number', $validated['serial_number']);
                }
                if (!empty($validated['batch_no'])) {
                    $purchaseDetQuery->where('batch_no', $validated['batch_no']);
                }
                $purchaseDet = $purchaseDetQuery->first();
                if ($purchaseDet) {
                    $purchaseDetId = $purchaseDet->PerchaseDetKy;
                }
            }

            // Get section_code from section_id
            $section = \App\Models\Section::find($validated['section_id']);
            if (!$section) {
                return back()->withErrors(['section_id' => 'Invalid section selected.']);
            }
            $sectionCode = $section->section_code;

            // Validate available stock before creating wastage
            $availableStockQuery = StockInHand::where('ItemKy', $productId)
                ->where('section_code', $sectionCode);
            
            if (!empty($validated['serial_number'])) {
                $availableStockQuery->where('serial_number', $validated['serial_number']);
            }
            if (!empty($validated['batch_no'])) {
                $availableStockQuery->where('batch_no', $validated['batch_no']);
            }
            
            // Calculate available stock including free quantity
            $availableStock = $availableStockQuery
                ->selectRaw('SUM(Qty + COALESCE(FreeQty, 0)) as total')
                ->value('total') ?? 0;
            
            if ($validated['quantity'] > $availableStock) {
                $errorMsg = 'Insufficient stock. Available: ' . $availableStock;
                if (!empty($validated['batch_no']) || !empty($validated['serial_number'])) {
                    $errorMsg .= ' for the selected batch/serial';
                }
                return back()->withErrors(['quantity' => $errorMsg])->withInput();
            }

            // Create wastage record
            $wastage = Wastage::create([
                'product_id' => $productId,
                'category' => $product->catkey ?? 'N/A',
                'quantity' => $validated['quantity'],
                'unit' => $product->UnitKy ?? 'Unit',
                'serial_number' => $validated['serial_number'] ?? null,
                'batch_no' => $validated['batch_no'] ?? null,
                'warranty' => $validated['warranty'] ?? null,
                'purchase_det_id' => $purchaseDetId,
                'stock_in_hand_id' => $stockInHandId,
                'reason' => $validated['reason'],
                'wastage_date' => $validated['wastage_date'],
                'notes' => $validated['notes'],
                'status' => $validated['status'],
                'recorded_by' => Auth::id(),
                'section_id' => $validated['section_id'],
            ]);

            // Only deduct from stock if status is 'approved'
            if ($validated['status'] === 'approved') {
                Log::info("Deducting stock for wastage", [
                    'product_id' => $productId,
                    'quantity' => $validated['quantity'],
                    'serial_number' => $validated['serial_number'] ?? null,
                    'batch_no' => $validated['batch_no'] ?? null,
                    'stock_in_hand_id' => $stockInHandId,
                    'section_code' => $sectionCode
                ]);
                
                $this->deductStock(
                    $productId, 
                    $validated['quantity'], 
                    $sectionCode,
                    $validated['serial_number'] ?? null,
                    $validated['batch_no'] ?? null,
                    $stockInHandId
                );
            } else {
                Log::info("Wastage created as rejected, stock not deducted yet", [
                    'product_id' => $productId,
                    'status' => $validated['status']
                ]);
            }
        }

        return redirect()->route('wastages.index')
            ->with('success', 'Wastage record created successfully.');
    }

    /**
     * Store multiple wastage items at once.
     */
    private function storeMultipleItems(Request $request)
    {
        // Validate global fields and items array
        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.cost_price' => 'required|numeric|min:0',
            'items.*.reason' => 'required|string|max:255',
            'items.*.serial_number' => 'nullable|string|max:255',
            'items.*.batch_no' => 'nullable|string|max:255',
            'items.*.warranty' => 'nullable|string|max:255',
            'wastage_date' => 'required|date',
            'status' => 'required|in:pending,approved,rejected',
            'section_id' => [
                'required',
                \Illuminate\Validation\Rule::exists('sections', 'id')->where(function ($q) {
                    $q->where('company_code', request()->user()->company_code);
                }),
            ],
        ]);

        // Automatically approve pending wastage
        if ($validated['status'] === 'pending') {
            $validated['status'] = 'approved';
        }

        // Get section details
        $section = \App\Models\Section::find($validated['section_id']);
        if (!$section) {
            return back()->withErrors(['section_id' => 'Invalid section selected.']);
        }
        $sectionCode = $section->section_code;

        $createdCount = 0;
        $errors = [];

        // Use database transaction to ensure all-or-nothing
        DB::beginTransaction();
        try {
            foreach ($validated['items'] as $index => $item) {
                try {
                    // Check if this is an orphaned purchase item (format: PD_123)
                    $isOrphanedPurchase = is_string($item['product_id']) && str_starts_with($item['product_id'], 'PD_');
                    
                    if ($isOrphanedPurchase) {
                        // Extract purchase detail ID
                        $purchaseDetId = (int) str_replace('PD_', '', $item['product_id']);
                        $purchaseDet = PurchaseDet::find($purchaseDetId);
                        
                        if (!$purchaseDet) {
                            $errors[] = "Item " . ($index + 1) . ": Invalid purchase detail reference.";
                            continue;
                        }

                        // Create wastage record with purchase detail info
                        Wastage::create([
                            'product_id' => null,
                            'category' => $purchaseDet->product->ItmNm ?? 'N/A',
                            'quantity' => $item['quantity'],
                            'unit' => 'Unit',
                            'cost_price' => $item['cost_price'],
                            'reason' => $item['reason'],
                            'wastage_date' => $validated['wastage_date'],
                            'notes' => '[Purchase Detail: ' . ($purchaseDet->product->ItmNm ?? 'N/A') . ', Serial: ' . $purchaseDet->serial_number . ']',
                            'status' => $validated['status'],
                            'recorded_by' => Auth::id(),
                            'section_id' => $validated['section_id'],
                        ]);
                        $createdCount++;
                    } else {
                        // Normal product from itemmaster
                        $productId = (int) $item['product_id'];
                        
                        // Verify product exists
                        $product = Product::where('ItmKy', $productId)
                            ->where('item_type', 'product')
                            ->where('is_service', false)
                            ->first();
                        if (!$product) {
                            $errors[] = "Item " . ($index + 1) . ": Invalid product.";
                            continue;
                        }

                        // Find specific stock record if serial number or batch number is provided
                        $stockInHandId = null;
                        $purchaseDetId = null;
                        
                        if (!empty($item['serial_number']) || !empty($item['batch_no'])) {
                            $stockQuery = StockInHand::where('ItemKy', $productId)
                                ->where('Qty', '>', 0);
                            
                            if (!empty($item['serial_number'])) {
                                $stockQuery->where('serial_number', $item['serial_number']);
                            }
                            if (!empty($item['batch_no'])) {
                                $stockQuery->where('batch_no', $item['batch_no']);
                            }
                            
                            $specificStock = $stockQuery->first();
                            if ($specificStock) {
                                $stockInHandId = $specificStock->TableKy;
                            }
                            
                            // Try to find the purchase detail record for reference
                            $purchaseDetQuery = PurchaseDet::where('iTimKy', $productId);
                            if (!empty($item['serial_number'])) {
                                $purchaseDetQuery->where('serial_number', $item['serial_number']);
                            }
                            if (!empty($item['batch_no'])) {
                                $purchaseDetQuery->where('batch_no', $item['batch_no']);
                            }
                            $purchaseDet = $purchaseDetQuery->first();
                            if ($purchaseDet) {
                                $purchaseDetId = $purchaseDet->PerchaseDetKy;
                            }
                        }

                        // Validate available stock before creating wastage
                        $availableStockQuery = StockInHand::where('ItemKy', $productId)
                            ->where('section_code', $sectionCode);
                        
                        if (!empty($item['serial_number'])) {
                            $availableStockQuery->where('serial_number', $item['serial_number']);
                        }
                        if (!empty($item['batch_no'])) {
                            $availableStockQuery->where('batch_no', $item['batch_no']);
                        }
                        
                        // Calculate available stock including free quantity
                        $availableStock = $availableStockQuery
                            ->selectRaw('SUM(Qty + COALESCE(FreeQty, 0)) as total')
                            ->value('total') ?? 0;
                        
                        if ($item['quantity'] > $availableStock) {
                            $errorMsg = "Item " . ($index + 1) . ": Insufficient stock. Available: " . $availableStock;
                            if (!empty($item['batch_no']) || !empty($item['serial_number'])) {
                                $errorMsg .= ' for the selected batch/serial';
                            }
                            $errors[] = $errorMsg;
                            continue;
                        }

                        // Create wastage record
                        $wastage = Wastage::create([
                            'product_id' => $productId,
                            'category' => $product->catkey ?? 'N/A',
                            'quantity' => $item['quantity'],
                            'unit' => $product->UnitKy ?? 'Unit',
                            'cost_price' => $item['cost_price'],
                            'serial_number' => $item['serial_number'] ?? null,
                            'batch_no' => $item['batch_no'] ?? null,
                            'warranty' => $item['warranty'] ?? null,
                            'purchase_det_id' => $purchaseDetId,
                            'stock_in_hand_id' => $stockInHandId,
                            'reason' => $item['reason'],
                            'wastage_date' => $validated['wastage_date'],
                            'notes' => null,
                            'status' => $validated['status'],
                            'recorded_by' => Auth::id(),
                            'section_id' => $validated['section_id'],
                        ]);

                        // Only deduct from stock if status is 'approved'
                        if ($validated['status'] === 'approved') {
                            Log::info("Deducting stock for multi-item wastage", [
                                'product_id' => $productId,
                                'quantity' => $item['quantity'],
                                'serial_number' => $item['serial_number'] ?? null,
                                'batch_no' => $item['batch_no'] ?? null,
                                'stock_in_hand_id' => $stockInHandId,
                                'section_code' => $sectionCode
                            ]);
                            
                            $this->deductStock(
                                $productId, 
                                $item['quantity'], 
                                $sectionCode,
                                $item['serial_number'] ?? null,
                                $item['batch_no'] ?? null,
                                $stockInHandId
                            );
                        }
                        
                        $createdCount++;
                    }
                } catch (\Exception $e) {
                    $errors[] = "Item " . ($index + 1) . ": " . $e->getMessage();
                    Log::error("Error creating wastage for item", [
                        'item' => $item,
                        'error' => $e->getMessage()
                    ]);
                }
            }

            // If any items were created successfully, commit the transaction
            if ($createdCount > 0) {
                DB::commit();
                $message = "{$createdCount} wastage record(s) created successfully.";
                if (!empty($errors)) {
                    $message .= " " . count($errors) . " item(s) failed: " . implode('; ', $errors);
                }
                return redirect()->route('wastages.index')->with('success', $message);
            } else {
                DB::rollBack();
                return back()->withErrors(['items' => 'No items could be created. ' . implode('; ', $errors)])->withInput();
            }
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Error in multi-item wastage creation", ['error' => $e->getMessage()]);
            return back()->withErrors(['items' => 'Error creating wastage records: ' . $e->getMessage()])->withInput();
        }
    }

    /**
     * Display the specified wastage record.
     */
    public function show(string $id)
    {
        if (! request()->user() || ! request()->user()->hasPermission('wastages.view')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view wastage records.');
        }

        $wastage = Wastage::with(['product.category', 'product.unit', 'recordedBy', 'section'])->findOrFail($id);

        return Inertia::render('wastage/show', [
            'wastage' => [
                'id' => $wastage->id,
                'product_name' => $wastage->product->ItmNm ?? 'N/A',
                'item_code' => $wastage->product->ItemCode ?? null,
                'category' => $wastage->product->category->cname ?? $wastage->category ?? 'N/A',
                'quantity' => $wastage->quantity,
                'unit' => $wastage->product->unit->cname ?? $wastage->unit ?? 'Unit',
                'reason' => $wastage->reason,
                'batch_no' => $wastage->batch_no,
                'wastage_date' => $wastage->wastage_date->format('Y-m-d'),
                'notes' => $wastage->notes,
                'status' => $wastage->status,
                'recorded_by' => $wastage->recordedBy->name ?? 'System',
                'section_name' => $wastage->section->name ?? 'N/A',
                'created_at' => $wastage->created_at->format('Y-m-d H:i:s'),
                'updated_at' => $wastage->updated_at->format('Y-m-d H:i:s'),
            ],
            'auth' => [
                'user' => request()->user(),
            ],
        ]);
    }

    /**
     * Show the form for editing the specified wastage record.
     */
    public function edit(string $id)
    {
        if (! request()->user() || ! request()->user()->hasPermission('wastages.edit')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to edit wastage records.');
        }

        $wastage = Wastage::findOrFail($id);
        
        $products = Product::where('item_type', 'product')
            ->where('is_service', false)
            ->leftJoin('code_masters', function($join) {
                $join->on('itemmaster.catkey', '=', 'code_masters.catkey')
                     ->where('code_masters.conkey', '=', 'CAT');
            })
            ->select([
                'itemmaster.ItmKy as id',
                'itemmaster.ItmNm as name',
                'code_masters.cname as category',
                'itemmaster.UnitKy as unit',
            ])
            ->orderBy('itemmaster.ItmNm')
            ->get()
        ->map(function ($item) {
            return [
                'id' => $item->id,
                'name' => $item->name,
                'category' => $item->category ?? 'N/A',
                'unit' => $item->unit ?? 'Unit',
            ];
        });

        // Get only sections that belong to the logged-in user's company
        $companyCode = request()->user()->company_code;
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

        return Inertia::render('wastage/edit', [
            'wastage' => $wastage,
            'products' => $products,
            'sections' => $sections,
        ]);
    }

    /**
     * Update the specified wastage record in storage.
     */
    public function update(Request $request, string $id)
    {
        if (! request()->user() || ! request()->user()->hasPermission('wastages.edit')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to edit wastage records.');
        }

        $wastage = Wastage::findOrFail($id);
        $oldStatus = $wastage->status;
        $oldQuantity = $wastage->quantity;
        $oldProductId = $wastage->product_id;

        $validated = $request->validate([
            'product_id' => [
                'required',
                \Illuminate\Validation\Rule::exists('itemmaster', 'ItmKy')->where('item_type', 'product')->where('is_service', false)
            ],
            'quantity' => 'required|numeric|min:0.01',
            'reason' => 'required|string|max:255',
            'wastage_date' => 'required|date',
            'notes' => 'nullable|string|max:1000',
            'status' => 'required|in:pending,approved,rejected',
            'serial_number' => 'nullable|string|max:255',
            'batch_no' => 'nullable|string|max:255',
            'warranty' => 'nullable|string|max:255',
            'section_id' => 'required|exists:sections,id',
        ]);

        // Automatically approve pending wastage
        if ($validated['status'] === 'pending') {
            $validated['status'] = 'approved';
        }

        // Get product details
        $product = Product::where('ItmKy', $validated['product_id'])
            ->where('item_type', 'product')
            ->where('is_service', false)
            ->first();

        // Get section_code from section_id
        $section = \App\Models\Section::find($validated['section_id']);
        if (!$section) {
            return back()->withErrors(['section_id' => 'Invalid section selected.']);
        }
        $sectionCode = $section->section_code;

        // Find specific stock record if serial number or batch number is provided
        $stockInHandId = null;
        $purchaseDetId = null;
        
        if (!empty($validated['serial_number']) || !empty($validated['batch_no'])) {
            $stockQuery = StockInHand::where('ItemKy', $validated['product_id'])
                ->where('Qty', '>', 0);
            
            if (!empty($validated['serial_number'])) {
                $stockQuery->where('serial_number', $validated['serial_number']);
            }
            if (!empty($validated['batch_no'])) {
                $stockQuery->where('batch_no', $validated['batch_no']);
            }
            
            $specificStock = $stockQuery->first();
            if ($specificStock) {
                $stockInHandId = $specificStock->TableKy;
            }
        }

        // Validate available stock if status is approved or changing to approved
        if ($validated['status'] === 'approved') {
            $availableStockQuery = StockInHand::where('ItemKy', $validated['product_id'])
                ->where('section_code', $sectionCode);
            
            if (!empty($validated['serial_number'])) {
                $availableStockQuery->where('serial_number', $validated['serial_number']);
            }
            if (!empty($validated['batch_no'])) {
                $availableStockQuery->where('batch_no', $validated['batch_no']);
            }
            
            // Calculate available stock including free quantity
            $availableStock = $availableStockQuery
                ->selectRaw('SUM(Qty + COALESCE(FreeQty, 0)) as total')
                ->value('total') ?? 0;
            
            // If status was already approved, add back the old quantity to available stock
            if ($oldStatus === 'approved' && $oldProductId === $validated['product_id']) {
                $availableStock += $oldQuantity;
            }
            
            if ($validated['quantity'] > $availableStock) {
                $errorMsg = 'Insufficient stock. Available: ' . $availableStock;
                if (!empty($validated['batch_no']) || !empty($validated['serial_number'])) {
                    $errorMsg .= ' for the selected batch/serial';
                }
                return back()->withErrors(['quantity' => $errorMsg])->withInput();
            }
        }

        // capture old section code before we update the record so we can restore stock correctly
        $oldSection = \App\Models\Section::find($wastage->section_id);
        $oldSectionCode = $oldSection ? $oldSection->section_code : null;

        $wastage->update([
            'product_id' => $validated['product_id'],
            'category' => $product->catkey ?? 'N/A',
            'quantity' => $validated['quantity'],
            'unit' => $product->UnitKy ?? 'Unit',
            'serial_number' => $validated['serial_number'] ?? null,
            'batch_no' => $validated['batch_no'] ?? null,
            'warranty' => $validated['warranty'] ?? null,
            'stock_in_hand_id' => $stockInHandId,
            'reason' => $validated['reason'],
            'wastage_date' => $validated['wastage_date'],
            'notes' => $validated['notes'],
            'status' => $validated['status'],
            'section_id' => $validated['section_id'],
        ]);

        // new section code after update (used for any stock operations below)
        $sectionCode = Section::find($wastage->section_id)->section_code;

        // Handle stock changes based on status change
        if ($oldStatus !== $validated['status']) {
            if ($validated['status'] === 'approved' && $oldStatus !== 'approved') {
                // Status changed to approved - deduct stock
                $this->deductStock(
                    $validated['product_id'], 
                    $validated['quantity'],
                    $sectionCode,
                    $validated['serial_number'] ?? null,
                    $validated['batch_no'] ?? null,
                    $stockInHandId
                );
            } elseif ($oldStatus === 'approved' && $validated['status'] !== 'approved') {
                // Status changed from approved to something else - restore stock
                $this->restoreStock(
                    $oldProductId, 
                    $oldQuantity,
                    $oldSectionCode,
                    $wastage->serial_number,
                    $wastage->batch_no,
                    $wastage->stock_in_hand_id
                );
            }
        } elseif ($validated['status'] === 'approved') {
            // Status still approved – check for any change in product, quantity or section
            if (
                $oldProductId !== $validated['product_id'] ||
                $oldQuantity != $validated['quantity'] ||
                $oldSectionCode !== $sectionCode
            ) {
                // restore stock from the old values/section
                $this->restoreStock(
                    $oldProductId,
                    $oldQuantity,
                    $oldSectionCode,
                    $wastage->serial_number,
                    $wastage->batch_no,
                    $wastage->stock_in_hand_id
                );

                // deduct using the new values/section
                $this->deductStock(
                    $validated['product_id'], 
                    $validated['quantity'],
                    $sectionCode,
                    $validated['serial_number'] ?? null,
                    $validated['batch_no'] ?? null,
                    $stockInHandId
                );
            }
        }

        return redirect()->route('wastages.index')
            ->with('success', 'Wastage record updated successfully.');
    }

    /**
     * Remove the specified wastage record from storage.
     */
    public function destroy(string $id)
    {
        if (! request()->user() || ! request()->user()->hasPermission('wastages.delete')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to delete wastage records.');
        }

        $wastage = Wastage::findOrFail($id);
        
        // Only restore stock if it was previously deducted (status was 'approved')
        if ($wastage->product_id && $wastage->status === 'approved') {
            $section = \App\Models\Section::find($wastage->section_id);
            $sectionCode = $section ? $section->section_code : null;
            
            Log::info("Restoring stock before deleting wastage", [
                'wastage_id' => $wastage->id,
                'product_id' => $wastage->product_id,
                'quantity' => $wastage->quantity,
                'serial_number' => $wastage->serial_number,
                'batch_no' => $wastage->batch_no,
                'stock_in_hand_id' => $wastage->stock_in_hand_id,
                'section_code' => $sectionCode,
                'status' => $wastage->status
            ]);
            
            $this->restoreStock(
                $wastage->product_id, 
                $wastage->quantity,
                $sectionCode,
                $wastage->serial_number,
                $wastage->batch_no,
                $wastage->stock_in_hand_id
            );
        }
        
        $wastage->delete();

        return redirect()->route('wastages.index')
            ->with('success', 'Wastage record deleted successfully.');
    }

    /**
     * Search products by serial number from purchase details.
     */
    public function searchBySerial(Request $request)
    {
        if (! request()->user() || ! request()->user()->hasPermission('wastages.search')) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $serialNumber = $request->input('serial_number');

        if (!$serialNumber) {
            return response()->json([]);
        }

        $results = collect();

        // First, try to find purchase details with valid product links
        $purchaseDetailsWithProducts = PurchaseDet::where('serial_number', 'LIKE', "%{$serialNumber}%")
            ->where(function($query) {
                $query->where('Status', 'A')
                      ->orWhereNull('Status');
            })
            ->where('iTimKy', '!=', 0)
            ->whereNotNull('iTimKy')
            ->with(['product' => function ($query) {
            }])
            ->limit(20)
            ->get();

        foreach ($purchaseDetailsWithProducts as $purchaseDet) {
            if ($purchaseDet->product && $purchaseDet->iTimKy) {
                $product = $purchaseDet->product;
                
                $latestPrice = DB::table('item_price_det')
                    ->where('ItmKy', $product->ItmKy)
                    ->where('Status', 'A')
                    ->orderBy('ChangedDate', 'desc')
                    ->first();

                // Note: stock_quantity removed - use batch-specific quantities via getProductBatches() API

                $results->push([
                    'id' => $product->ItmKy,
                    'code' => $product->ItemCode ?? '',
                    'barcode' => $product->BarCode ?? '',
                    'category' => $product->catkey ?? 'N/A',
                    'unit' => $product->UnitKy ?? 'Unit',
                    'cost_price' => $latestPrice->NCostPrice ?? $product->CosPri ?? $purchaseDet->NewCostPrice ?? 0,
                    'sale_price' => $latestPrice->SlsPri ?? $product->SlsPri ?? $purchaseDet->SalePrice ?? 0,
                    'purchase_price' => $latestPrice->CosPri ?? $purchaseDet->CostPrice ?? $product->CosPri ?? 0,
                    'serial_number' => $purchaseDet->serial_number,
                    'batch_no' => $purchaseDet->batch_no,
                ]);
            }
        }

        // Note: Orphaned purchases search removed as it referenced non-existent columns (item_name, barcode, warranty)

        return response()->json($results->values()->all());
    }

    /**
     * Unified search for products and serial numbers.
     */
    public function unifiedSearch(Request $request)
    {
        if (! request()->user() || ! request()->user()->hasPermission('wastages.search')) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $term = $request->input('term');

        if (!$term) {
            return response()->json([]);
        }

        // Search for products by name, code, barcode
        $products = Product::where('item_type', 'product')
            ->where('is_service', false)
            ->leftJoin('code_masters', function($join) {
                $join->on('itemmaster.catkey', '=', 'code_masters.catkey')
                     ->where('code_masters.conkey', '=', 'CAT');
            })
            ->select([
                'itemmaster.ItmKy as id', 'itemmaster.ItmNm as name', 'itemmaster.ItemCode as code', 'itemmaster.BarCode as barcode',
                'code_masters.cname as category', 'itemmaster.UnitKy as unit', 'itemmaster.CosPri as cost_price',
            ])
            ->where(function ($query) use ($term) {
                $query->where('itemmaster.ItmNm', 'LIKE', "%{$term}%")
                      ->orWhere('itemmaster.ItemCode', 'LIKE', "%{$term}%")
                      ->orWhere('itemmaster.BarCode', 'LIKE', "%{$term}%");
            })
            ->orderBy('itemmaster.ItmNm')
            ->limit(10)
            ->get()
        ->map(function ($item) {
            $latestPrice = DB::table('item_price_det')
                ->where('ItmKy', $item->id)
                ->where('Status', 'A')
                ->orderBy('ChangedDate', 'desc')
                ->first();

            // Note: stock_quantity removed - use batch-specific quantities via getProductBatches() API

            return [
                'id' => $item->id,
                'name' => $item->name,
                'code' => $item->code ?? '',
                'barcode' => $item->barcode ?? '',
                'category' => $item->category ?? 'N/A',
                'unit' => $item->unit ?? 'Unit',
                'cost_price' => $latestPrice->CosPri ?? $item->cost_price ?? 0,
                'sale_price' => $latestPrice->SlsPri ?? $item->sale_price ?? 0,
                'purchase_price' => $latestPrice->CosPri ?? $item->cost_price ?? 0,
                'type' => 'product',
            ];
        });

        // Search for serial numbers
        $serialResults = $this->searchBySerialLogic($term);

        // Combine and return unique results
        $combined = $products->concat($serialResults)->unique('id')->values();

        return response()->json($combined);
    }

    private function searchBySerialLogic($serialNumber)
    {
        $results = collect();

        // 1. Search linked purchases
        $purchaseDetailsWithProducts = PurchaseDet::where('serial_number', 'LIKE', "%{$serialNumber}%")
            ->where(function($query) {
                $query->where('Status', 'A')->orWhereNull('Status');
            })
            ->where('iTimKy', '!=', 0)->whereNotNull('iTimKy')
            ->limit(10)->get();

        foreach ($purchaseDetailsWithProducts as $purchaseDet) {
            if ($purchaseDet->product) {
                $product = $purchaseDet->product;
                $latestPrice = DB::table('item_price_det')
                ->where('ItmKy', $product->ItmKy)->where('Status', 'A')->orderBy('ChangedDate', 'desc')->first();
                
                // Note: stock_quantity removed - use batch-specific quantities via getProductBatches() API
                
                $results->push([
                    'id' => $product->ItmKy,
                    'name' => $product->ItmNm,
                    'code' => $product->ItemCode ?? '',
                    'barcode' => $product->BarCode ?? $purchaseDet->barcode ?? '',
                    'category' => $product->category->cname ?? $product->catkey ?? 'N/A',
                    'unit' => $product->UnitKy ?? 'Unit',
                    'cost_price' => $latestPrice->CosPri ?? $product->CosPri ?? $purchaseDet->CostPrice ?? 0,
                    'sale_price' => $latestPrice->SlsPri ?? $product->SlsPri ?? $purchaseDet->SalePrice ?? 0,
                    'purchase_price' => $latestPrice->CosPri ?? $purchaseDet->CostPrice ?? $product->CosPri ?? 0,
                    'serial_number' => $purchaseDet->serial_number,
                    'batch_no' => $purchaseDet->batch_no,
                    'type' => 'serial',
                ]);
            }
        }

        // Note: Orphaned purchases search removed as it referenced non-existent columns (item_name, barcode, warranty)
        return $results;
    }

    /**
     * Calculate total available stock for a product from stock_in_hand
     */
    private function calculateStock($productId)
    {
        return StockInHand::where('ItemKy', $productId)
            ->selectRaw('SUM(Qty + COALESCE(FreeQty, 0)) as total')
            ->value('total') ?? 0;
    }

    /**
     * Get available batches for a product with stock quantities
     */
    public function getProductBatches(Request $request)
    {
        if (! request()->user() || ! request()->user()->hasAnyPermission(['wastages.search', 'service_jobs.view'])) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $productId = $request->input('product_id');
        $sectionCode = $request->input('section_code');

        if (!$productId) {
            return response()->json([]);
        }

        // If no section_code provided, use the authenticated user's section_code
        if (!$sectionCode) {
            $user = Auth::user();
            $sectionCode = $user ? $user->section_code : null;
        }

        // Ensure we have a valid section_code for filtering
        if (!$sectionCode) {
            Log::warning('Product batches requested without valid section_code', [
                'product_id' => $productId,
                'user_id' => Auth::id()
            ]);
            return response()->json([]);
        }

        Log::info('Fetching product batches', [
            'product_id' => $productId,
            'section_code' => $sectionCode,
            'user_id' => Auth::id(),
        ]);

        // Query stock_in_hand for ALL transactions of this product in the specified section ONLY
        // We need to include both positive and negative transactions to calculate NET stock
        $batchesQuery = DB::table('stock_in_hand as sh')
            ->where('sh.ItemKy', $productId)
            ->where('sh.section_code', $sectionCode);

        // Determine database driver for GROUP_CONCAT syntax
        $driver = DB::getDriverName();
        $groupConcatSyntax = $driver === 'sqlite' ? 'GROUP_CONCAT' : 'GROUP_CONCAT(DISTINCT %s SEPARATOR \', \')';

        // Group by batch_no and sum quantities (including negative transactions)
        // Use COALESCE to handle NULL batch_no as 'N/A'
        $batches = $batchesQuery
            ->leftJoin('itemmaster as im', function($join) {
                $join->on('sh.ItemKy', '=', 'im.ItmKy')
                     ->where('im.item_type', '=', 'product')
                     ->where('im.is_service', '=', false);
            })
            ->leftJoin('brands as b', 'im.brand_id', '=', 'b.id')
            ->leftJoin('models as m', 'im.models_id', '=', 'm.id')
            ->select(
                DB::raw('COALESCE(sh.batch_no, "N/A") as batch_no'),
                DB::raw(sprintf($groupConcatSyntax, 'sh.serial_number') . ' as serial_number'),
                DB::raw(sprintf($groupConcatSyntax, 'b.name') . ' as brand'),
                DB::raw(sprintf($groupConcatSyntax, 'm.name') . ' as model'),
                DB::raw(sprintf($groupConcatSyntax, 'im.warranty') . ' as warranty'),
                DB::raw('SUM(sh.Qty + COALESCE(sh.FreeQty, 0)) as total_quantity'),
                DB::raw('MAX(sh.OrdDate) as last_date')
            )
            ->groupBy(DB::raw('COALESCE(sh.batch_no, "N/A")'), 'b.name', 'm.name', 'im.warranty')
            ->havingRaw('SUM(sh.Qty + COALESCE(sh.FreeQty, 0)) > 0')
            ->orderBy('last_date', 'desc')
            ->get()
            ->map(function ($batch) use ($productId) {
                // Clean up concatenated values - remove NULLs and empty strings
                $serialNumbers = array_filter(explode(', ', $batch->serial_number ?? ''), function($v) {
                    return $v !== '' && $v !== null && strtolower($v) !== 'null';
                });
                $brands = array_filter(explode(', ', $batch->brand ?? ''), function($v) {
                    return $v !== '' && $v !== null && strtolower($v) !== 'null';
                });
                $models = array_filter(explode(', ', $batch->model ?? ''), function($v) {
                    return $v !== '' && $v !== null && strtolower($v) !== 'null';
                });
                $warranties = array_filter(explode(', ', $batch->warranty ?? ''), function($v) {
                    return $v !== '' && $v !== null && strtolower($v) !== 'null';
                });
                
                $batchPrice = null;
                if ($batch->batch_no !== 'N/A') {
                    $batchPrice = \DB::table('purchase_det')
                        ->where('iTimKy', $productId)
                        ->where('batch_no', $batch->batch_no)
                        ->whereNotNull('SalePrice')
                        ->orderByDesc('PerchaseDetKy')
                        ->value('SalePrice');
                }
                
                return [
                    'batch_no' => $batch->batch_no === 'N/A' ? null : $batch->batch_no,
                    'serial_number' => !empty($serialNumbers) ? implode(', ', $serialNumbers) : null,
                    'available_quantity' => (float) $batch->total_quantity,
                    'brand' => !empty($brands) ? implode(', ', $brands) : null,
                    'model' => !empty($models) ? implode(', ', $models) : null,
                    'warranty' => !empty($warranties) ? implode(', ', $warranties) : null,
                    'last_date' => $batch->last_date,
                    'sale_price' => $batchPrice,
                ];
            });

        // If no batches found, return a zero-stock entry to ensure UI consistency
        if ($batches->isEmpty()) {
            Log::info('No batches found for product', [
                'product_id' => $productId,
                'section_code' => $sectionCode,
            ]);
            
            $batches->push([
                'batch_no' => null,
                'serial_number' => null,
                'available_quantity' => 0,
                'brand' => null,
                'model' => null,
                'warranty' => null,
                'last_date' => null,
            ]);
        } else {
            Log::info('Found batches for product', [
                'product_id' => $productId,
                'section_code' => $sectionCode,
                'batch_count' => $batches->count(),
                'batches' => $batches->toArray(),
            ]);
        }

        return response()->json($batches);
    }

    /**
     * Deduct quantity from stock_in_hand for the given product.
     * Creates a new negative transaction record.
     */
    private function deductStock($productId, $quantity, $sectionCode, $serialNumber = null, $batchNo = null, $stockInHandId = null)
    {
        DB::transaction(function () use ($productId, $quantity, $sectionCode, $serialNumber, $batchNo, $stockInHandId) {
            // Get reference stock record for company info
            $referenceStock = null;
            
            if ($stockInHandId) {
                $referenceStock = StockInHand::where('TableKy', $stockInHandId)->first();
            }
            
            if (!$referenceStock && ($serialNumber || $batchNo)) {
                $query = StockInHand::where('ItemKy', $productId)
                    ->where('section_code', $sectionCode);
                if ($serialNumber) {
                    $query->where('serial_number', $serialNumber);
                }
                if ($batchNo) {
                    $query->where('batch_no', $batchNo);
                }
                $referenceStock = $query->orderBy('TableKy', 'desc')->first();
            }
            
            if (!$referenceStock) {
                $referenceStock = StockInHand::where('ItemKy', $productId)
                    ->where('section_code', $sectionCode)
                    ->orderBy('TableKy', 'desc')
                    ->first();
            }
            
            // Get company info from section (not from reference stock)
            $section = Section::where('section_code', $sectionCode)->first();
            $companyCode = $section->company_code ?? session('company_code') ?? optional(Auth::user())->company_code ?? null;
            $company = Company::where('company_code', $companyCode)->first();
            $companyId = $company->id ?? session('company_id') ?? optional(Auth::user())->company_id ?? null;
            
            // Create new NEGATIVE transaction record for wastage deduction
            $newStock = StockInHand::create([
                'company_code' => $companyCode,
                'owner_company_code' => $referenceStock->owner_company_code ?? $companyCode, // Preserve ownership
                'section_code' => $sectionCode,
                'Cky' => $companyId,
                'OrdDate' => now()->toDateString(),
                'ItemKy' => $productId,
                'Qty' => -$quantity, // NEGATIVE quantity for deduction
                'FreeQty' => 0,
                'TrnTyp' => 'WASTAGE',
                'serial_number' => $serialNumber,
                'batch_no' => $batchNo,
            ]);
            
            Log::info("Stock wastage deduction record created", [
                'product_id' => $productId,
                'table_ky' => $newStock->TableKy,
                'qty' => -$quantity,
                'serial_number' => $serialNumber,
                'batch_no' => $batchNo,
                'stock_in_hand_id' => $stockInHandId
            ]);
        });
    }

    /**
     * Restore quantity to stock_in_hand for the given product.
     * Creates a new positive transaction record to reverse the wastage.
     */
    private function restoreStock($productId, $quantity, $sectionCode, $serialNumber = null, $batchNo = null, $stockInHandId = null)
    {
        DB::transaction(function () use ($productId, $quantity, $sectionCode, $serialNumber, $batchNo, $stockInHandId) {
            // Get reference stock record for company info
            $referenceStock = null;
            
            if ($stockInHandId) {
                $referenceStock = StockInHand::where('TableKy', $stockInHandId)->first();
            }
            
            if (!$referenceStock && ($serialNumber || $batchNo)) {
                $query = StockInHand::where('ItemKy', $productId)
                    ->where('section_code', $sectionCode);
                if ($serialNumber) {
                    $query->where('serial_number', $serialNumber);
                }
                if ($batchNo) {
                    $query->where('batch_no', $batchNo);
                }
                $referenceStock = $query->orderBy('TableKy', 'desc')->first();
            }
            
            if (!$referenceStock) {
                $referenceStock = StockInHand::where('ItemKy', $productId)
                    ->where('section_code', $sectionCode)
                    ->orderBy('TableKy', 'desc')
                    ->first();
            }
            
            // Get company info from section (not from reference stock)
            $section = Section::where('section_code', $sectionCode)->first();
            $companyCode = $section->company_code ?? session('company_code') ?? optional(Auth::user())->company_code ?? null;
            $company = Company::where('company_code', $companyCode)->first();
            $companyId = $company->id ?? session('company_id') ?? optional(Auth::user())->company_id ?? null;
            
            // Create new POSITIVE transaction record to restore stock
            $newStock = StockInHand::create([
                'company_code' => $companyCode,
                'owner_company_code' => $referenceStock->owner_company_code ?? $companyCode, // Preserve ownership
                'section_code' => $sectionCode,
                'Cky' => $companyId,
                'OrdDate' => now()->toDateString(),
                'ItemKy' => $productId,
                'Qty' => $quantity, // POSITIVE quantity to restore
                'FreeQty' => 0,
                'TrnTyp' => 'WST_RESTO',
                'serial_number' => $serialNumber,
                'batch_no' => $batchNo,
            ]);
            
            Log::info("Stock wastage restoration record created", [
                'product_id' => $productId,
                'table_ky' => $newStock->TableKy,
                'qty' => $quantity,
                'serial_number' => $serialNumber,
                'batch_no' => $batchNo,
                'stock_in_hand_id' => $stockInHandId,
                'reference_stock_id' => $referenceStock->TableKy ?? null
            ]);
        });
    }
}




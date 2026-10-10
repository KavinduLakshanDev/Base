<?php

namespace App\Http\Controllers;

use App\Models\Section;
use App\Models\Product;
use App\Models\StockTransfer;
use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Barryvdh\DomPDF\Facade\Pdf;
use Inertia\Inertia;

class StockTransferController extends Controller
{
    public function index(Request $request)
    {
        if (!request()->user()->hasPermission('stock.transfers.view')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view stock transfers.');
        }

        // Get company_code from authenticated user or session
        $companyCode = Auth::user()->company_code ?? session('company_code');

        $fromDate = $request->get('from_date', '');
        $toDate = $request->get('to_date', '');
        $fromSection = $request->get('from_section', '');
        $toSection = $request->get('to_section', '');
        $search = $request->get('search', '');

        $query = StockTransfer::select('stock_transfers.*')
            ->join('itemmaster as im', 'stock_transfers.item_id', '=', 'im.ItmKy')
            ->where(function ($q) use ($companyCode) {
                $q->where('stock_transfers.company_code', $companyCode)
                  ->orWhereHas('toSection', function ($q) use ($companyCode) {
                      $q->where('company_code', $companyCode);
                  });
            })
            ->where('stock_transfers.item_id', '!=', 0)
            ->where('im.item_type', '!=', 'printer')
            ->with(['fromSection', 'toSection', 'item']);

        // Date range filter
        if ($fromDate) {
            $query->whereDate('transfer_date', '>=', $fromDate);
        }
        if ($toDate) {
            $query->whereDate('transfer_date', '<=', $toDate);
        }

        // From section filter
        if ($fromSection && $fromSection !== 'all') {
            $query->where('from_section_code', $fromSection);
        }

        // To section filter
        if ($toSection && $toSection !== 'all') {
            $query->where('to_section_code', $toSection);
        }

        // Search functionality
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('transfer_number', 'LIKE', "%{$search}%")
                  ->orWhere('notes', 'LIKE', "%{$search}%")
                  ->orWhereHas('item', function ($q) use ($search) {
                      $q->where('ItmNm', 'LIKE', "%{$search}%")
                        ->orWhere('ItemCode', 'LIKE', "%{$search}%");
                  })
                  ->orWhereHas('fromSection', function ($q) use ($search) {
                      $q->where('name', 'LIKE', "%{$search}%")
                        ->orWhere('section_code', 'LIKE', "%{$search}%");
                  })
                  ->orWhereHas('toSection', function ($q) use ($search) {
                      $q->where('name', 'LIKE', "%{$search}%")
                        ->orWhere('section_code', 'LIKE', "%{$search}%");
                  });
            });
        }

        $stockTransfers = $query->orderBy('transfer_number', 'desc')
            ->paginate((int) $request->get('per_page', 15))
            ->withQueryString();

        // Ensure relationships are properly included in the response
        $stockTransfers->getCollection()->transform(function ($transfer) {
            $transfer->fromSection = $transfer->fromSection ? [
                'name' => $transfer->fromSection->name,
                'section_code' => $transfer->fromSection->section_code,
                'company_code' => $transfer->fromSection->company_code,
            ] : null;
            $transfer->toSection = $transfer->toSection ? [
                'name' => $transfer->toSection->name,
                'section_code' => $transfer->toSection->section_code,
                'company_code' => $transfer->toSection->company_code,
            ] : null;
            $transfer->item = $transfer->item ? [
                'ItemCode' => $transfer->item->ItemCode,
                'ItmNm' => $transfer->item->ItmNm,
            ] : null;
            return $transfer;
        });

        // Fetch sections for dropdowns
        $sections = Section::where('company_code', $companyCode)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['section_code', 'name']);

        return Inertia::render('StockTransfer/Index', [
            'stockTransfers' => $stockTransfers,
            'filters' => [
                'search' => $search,
                'from_date' => $fromDate,
                'to_date' => $toDate,
                'from_section' => $fromSection,
                'to_section' => $toSection,
                'per_page' => $request->get('per_page', '15'),
            ],
            'sections' => $sections,
        ]);
    }

    public function create()
    {
        if (!request()->user()->hasPermission('stock.transfers.create')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to create stock transfers.');
        }

        // Get company_code from authenticated user or session
        $user = Auth::user();
        $companyCode = $user->company_code ?? session('company_code');

        // Determine user business unit for sharing logic
        $userBusinessUnit = str_starts_with(strtoupper($companyCode), 'MAL') ? 'malibo' : 'vismass';

        // Fetch items available to this user's Business Unit
        $items = Product::where('itemmaster.fInAct', false)
            ->where(function ($query) use ($userBusinessUnit) {
                // Users can see products shared with their Business Unit
                $query->whereJsonContains('itemmaster.available_business_units', $userBusinessUnit);
            })
            ->leftJoin('item_price_det', function($join) use ($companyCode) {
                $join->on('itemmaster.ItmKy', '=', 'item_price_det.ItmKy')
                     ->where('item_price_det.company_code', '=', $companyCode)
                     ->where('item_price_det.fInAct', '=', false);
            })
            ->select(
                'itemmaster.ItmKy',
                'itemmaster.ItemCode',
                'itemmaster.ItmNm',
                'itemmaster.BarCode as barcode',
                'item_price_det.CosPri as cost_price',
                'itemmaster.transfer_unit_id',
                'itemmaster.receiving_unit_id',
                'itemmaster.transfer_conversion_factor',
                \DB::raw('(SELECT cname FROM code_masters WHERE code_masters.id = itemmaster.transfer_unit_id LIMIT 1) as transfer_unit_name'),
                \DB::raw('(SELECT cname FROM code_masters WHERE code_masters.id = itemmaster.receiving_unit_id LIMIT 1) as receiving_unit_name')
            )
            ->get();

        $sectionsQuery = Section::orderByRaw('is_main_stock DESC, name ASC');
        if (request()->user()->role?->slug === 'vis001_service_manager') {
            $sectionsQuery->whereIn('section_code', ['VIS-SEC-001', 'VIS-SEC-002']);
        }
        $sections = $sectionsQuery->get();

        return Inertia::render('StockTransfer/Create', [
            'sections' => $sections,
            'items' => $items,
        ]);
    }

    public function store(Request $request)
    {
        if (!request()->user()->hasPermission('stock.transfers.create')) {
             return redirect()->back()->with('error', 'Unauthorized. You do not have permission to create stock transfers.');
        }

        // Get company_code from authenticated user or session
        $companyCode = Auth::user()->company_code ?? session('company_code');

        $validated = $request->validate([
            'from_section_code' => 'required|exists:sections,section_code',
            'to_section_code' => 'required|exists:sections,section_code|different:from_section_code',
            'items' => 'required|array|min:1',
            'items.*.item_id' => 'required|exists:itemmaster,ItmKy',
            'items.*.stock_id' => 'nullable|exists:stock_in_hand,TableKy', // Make nullable for backward compatibility but UI will enforce
            'items.*.quantity' => 'required|numeric|min:0.0001', // Allow small decimal quantities
            'transfer_date' => 'required|date',
            'notes' => 'nullable|string',
        ]);

        if (request()->user()->role?->slug === 'vis001_service_manager') {
            if ($validated['from_section_code'] !== 'VIS-SEC-002' || $validated['to_section_code'] !== 'VIS-SEC-001') {
                return redirect()->back()->withErrors([
                    'from_section_code' => 'You are only allowed to transfer stock from Vismass Shop Stock to Service section.',
                ]);
            }
        }

        // Additional validation: ensure sections exist
        $fromSection = Section::where('section_code', $validated['from_section_code'])
            ->first();
        $toSection = Section::where('section_code', $validated['to_section_code'])
            ->first();

        if (!$fromSection) {
            return redirect()->back()->withErrors(['from_section_code' => 'Source section not found.']);
        }
        if (!$toSection) {
            return redirect()->back()->withErrors(['to_section_code' => 'Destination section not found.']);
        }

        // Detect cross-company transfer and block it
        $isCrossCompanyTransfer = $fromSection->company_code !== $toSection->company_code;
        
        if ($isCrossCompanyTransfer) {
            return redirect()->back()->withErrors([
                'to_section_code' => 'Cross-company stock transfers are not allowed.'
            ]);
        }

        try {
            return DB::transaction(function () use ($validated, $companyCode, $fromSection, $toSection, $isCrossCompanyTransfer) {
                // Detect destination Business Unit for auto-sharing
                $toBusinessUnit = str_starts_with(strtoupper($toSection->company_code), 'MAL') ? 'malibo' : 'vismass';

                $errors = [];

                // Generate sequential transfer number (Thread-safe)
                // This uses a database lock to ensure no duplicate numbers are generated, even under high concurrency
                $sequenceValue = \App\Models\Sequence::incrementSequence('STOCK_TRANSFER');
                $transferNumber = 'TRF-' . date('Ymd') . '-' . str_pad($sequenceValue, 5, '0', STR_PAD_LEFT);

                // Group items by item_id to handle duplicate items correctly
                $groupedItems = [];
                foreach ($validated['items'] as $index => $itemData) {
                    $itemId = $itemData['item_id'];
                    if (!isset($groupedItems[$itemId])) {
                        $groupedItems[$itemId] = [
                            'total_quantity' => 0,
                            'indices' => []
                        ];
                    }
                    $groupedItems[$itemId]['total_quantity'] += $itemData['quantity'];
                    $groupedItems[$itemId]['indices'][] = $index;
                }

                // Validate each item
                foreach ($validated['items'] as $index => $itemData) {
                    $itemId = $itemData['item_id'];
                    $stockId = $itemData['stock_id'] ?? null;
                    $quantity = $itemData['quantity'];

                    // Find product (allow from any company for cross-company transfers)
                    $item = Product::where('itemmaster.ItmKy', $itemId)
                        ->leftJoin('item_price_det', function($join) use ($companyCode) {
                            $join->on('itemmaster.ItmKy', '=', 'item_price_det.ItmKy')
                                 ->where('item_price_det.company_code', '=', $companyCode)
                                 ->where('item_price_det.fInAct', '=', false);
                        })
                        ->select('itemmaster.*', 'item_price_det.CosPri as cost_price')
                        ->first();

                    if (!$item) {
                        $errors["items.{$index}.item_id"] = 'Item not found.';
                        continue;
                    }

                    // Check specific batch stock if stock_id is provided
                    if ($stockId) {
                        $batchStock = DB::table('stock_in_hand')
                            ->where('TableKy', $stockId)
                            ->first();

                        if (!$batchStock) {
                            $errors["items.{$index}.stock_id"] = 'Selected batch not found.';
                            continue;
                        }

                        // Ensure the batch is in the source section
                        if ($batchStock->section_code !== $validated['from_section_code']) {
                            $errors["items.{$index}.stock_id"] = 'Selected batch is not in the source section.';
                            continue;
                        }

                        $batchNo = $batchStock->batch_no;
                        // Determine whether conversion rows exist for this item/section
                        $hasConversionRows = DB::table('stock_in_hand')
                            ->where('ItemKy', $itemId)
                            ->where('section_code', $validated['from_section_code'])
                            ->where(function ($q) {
                                $q->where('RefNo', 'LIKE', 'CNV-IN%')
                                  ->orWhere('RefNo', 'LIKE', 'RCNV-OUT%');
                            })
                            ->exists();

                        if ($hasConversionRows) {
                            // only count bundle stock when conversions present
                            $availableQty = DB::table('stock_in_hand')
                                ->where('ItemKy', $itemId)
                                ->where('section_code', $validated['from_section_code'])
                                ->when(is_null($batchNo),
                                    fn ($q) => $q->whereNull('batch_no'),
                                    fn ($q) => $q->where('batch_no', $batchNo)
                                )
                                ->where(function ($q) {
                                    $q->whereNull('RefNo')
                                      ->orWhere(function ($q2) {
                                          $q2->where('RefNo', 'NOT LIKE', 'CNV-IN%')
                                             ->where('RefNo', 'NOT LIKE', 'RCNV-OUT%');
                                      });
                                })
                                ->where(function ($q) {
                                    $q->whereNull('TrnTyp')
                                      ->orWhere('TrnTyp', '!=', 'SAL-NOS');
                                })
                                ->lockForUpdate()
                                ->sum(DB::raw('COALESCE(Qty, 0) + COALESCE(FreeQty, 0)'));
                        } else {
                            // legacy behaviour
                            $availableQty = DB::table('stock_in_hand')
                                ->where('company_code', $batchStock->company_code) // Use batch's company
                                ->where('section_code', $validated['from_section_code'])
                                ->where('ItemKy', $itemId)
                                ->when(is_null($batchNo),
                                    fn ($q) => $q->whereNull('batch_no'),
                                    fn ($q) => $q->where('batch_no', $batchNo)
                                )
                                ->lockForUpdate()
                                ->sum(DB::raw('COALESCE(Qty, 0) + COALESCE(FreeQty, 0)'));
                        }

                        if ($quantity > $availableQty) {
                            $errors["items.{$index}.quantity"] = 'Insufficient stock in selected batch. Available: ' . number_format($availableQty, 2);
                        }
                    } else {
                        // Fallback to total stock check if no batch selected
                        $hasConversionRows = DB::table('stock_in_hand')
                            ->where('ItemKy', $itemId)
                            ->where('section_code', $validated['from_section_code'])
                            ->where(function ($q) {
                                $q->where('RefNo', 'LIKE', 'CNV-IN%')
                                  ->orWhere('RefNo', 'LIKE', 'RCNV-OUT%');
                            })
                            ->exists();

                        if ($hasConversionRows) {
                            $availableStock = DB::table('stock_in_hand')
                                ->where('ItemKy', $itemId)
                                ->where('section_code', $validated['from_section_code'])
                                ->where(function ($q) {
                                    $q->whereNull('RefNo')
                                      ->orWhere(function ($q2) {
                                          $q2->where('RefNo', 'NOT LIKE', 'CNV-IN%')
                                             ->where('RefNo', 'NOT LIKE', 'RCNV-OUT%');
                                      });
                                })
                                ->where(function ($q) {
                                    $q->whereNull('TrnTyp')
                                      ->orWhere('TrnTyp', '!=', 'SAL-NOS');
                                })
                                ->lockForUpdate()
                                ->sum(DB::raw('COALESCE(Qty, 0) + COALESCE(FreeQty, 0)'));
                        } else {
                            $availableStock = DB::table('stock_in_hand')
                                ->where('company_code', $fromSection->company_code) // Use source section's company
                                ->where('section_code', $validated['from_section_code'])
                                ->where('ItemKy', $itemId)
                                ->lockForUpdate()
                                ->sum(DB::raw('COALESCE(Qty, 0) + COALESCE(FreeQty, 0)'));
                        }

                        if ($quantity > $availableStock) {
                            $errors["items.{$index}.quantity"] = 'Insufficient total stock. Available: ' . number_format($availableStock, 2);
                        }
                    }
                }

                if (!empty($errors)) {
                    throw new \Exception('Validation failed: ' . json_encode($errors));
                }

                // Create transfers and execute them atomically
                $firstTransferId = null;
                foreach ($validated['items'] as $itemData) {
                    // Find product (allow cross-company if stock exists)
                    $item = Product::where('itemmaster.ItmKy', $itemData['item_id'])
                        // Remove strict company check to support shared products
                        // ->where('itemmaster.company_code', $companyCode)
                        ->leftJoin('item_price_det', function($join) use ($companyCode) {
                            $join->on('itemmaster.ItmKy', '=', 'item_price_det.ItmKy')
                                 ->where('item_price_det.company_code', '=', $companyCode)
                                 ->where('item_price_det.fInAct', '=', false);
                        })
                        ->select('itemmaster.*', 'item_price_det.CosPri as cost_price')
                        ->first();

                    // Find the original inward stock record with cost price
                    $sourceStock = null;
                    if (!empty($itemData['stock_id'])) {
                        $sourceStock = DB::table('stock_in_hand')
                            ->where('TableKy', $itemData['stock_id'])
                            ->first();
                    }

                    // Fallback if no stock_id provided
                    if (!$sourceStock) {
                        $sourceStock = DB::table('stock_in_hand')
                            ->where('company_code', $fromSection->company_code) // Use source section's company
                            ->where('section_code', $validated['from_section_code'])
                            ->where('ItemKy', $itemData['item_id'])
                            ->whereRaw('(Qty + COALESCE(FreeQty, 0)) > 0') // Prefer stock with quantity
                            ->orderBy('OrdDate', 'asc') // FIFO
                            ->first();
                    }

                    if (!$sourceStock) {
                        throw new \Exception("No stock records found for item {$itemData['item_id']} in source section.");
                    }

                    // Get cost price from purchase_det table using the exact batch from stock record
                    $costPrice = 0;
                    if ($sourceStock->batch_no) {
                        $purchaseRecord = DB::table('purchase_det')
                            ->where('iTimKy', $itemData['item_id'])
                            ->where('batch_no', $sourceStock->batch_no)
                            ->where('flnAct', false)
                            ->select('CostPrice')
                            ->first();
                        
                        if ($purchaseRecord && $purchaseRecord->CostPrice) {
                            $costPrice = (float) $purchaseRecord->CostPrice;
                        }
                    } 
                    
                    if ($costPrice <= 0) {
                        // If no batch_no, or batch_no not found in purchase_det (like adjustments), try to find latest purchase record
                        $purchaseRecord = DB::table('purchase_det')
                            ->where('iTimKy', $itemData['item_id'])
                            ->where('flnAct', false)
                            ->select('CostPrice')
                            ->orderBy('created_at', 'desc')
                            ->first();
                        
                        if ($purchaseRecord && $purchaseRecord->CostPrice) {
                            $costPrice = (float) $purchaseRecord->CostPrice;
                        } else {
                            // Final fallback to item master cost price
                            $costPrice = (float) ($item->cost_price ?? 0);
                        }
                    }

                    // Auto-share with the destination business unit if it's not already shared
                    // This ensures the product is visible and usable at the target company/BU
                    $currentBUs = $item->available_business_units ?? [];
                    $sharedNote = "";
                    if (!in_array($toBusinessUnit, $currentBUs)) {
                        $currentBUs[] = $toBusinessUnit;
                        $item->available_business_units = $currentBUs;
                        $item->save();
                        
                        $displayName = ucfirst($toBusinessUnit);
                        $sharedNote = " [Auto-Shared with {$displayName}]";
                        
                        \Log::info("Auto-shared product {$item->ItemCode} with Business Unit: {$toBusinessUnit} due to cross-BU stock transfer.");
                    }

                    $transfer = StockTransfer::create([
                        'transfer_number' => $transferNumber,
                        'from_section_code' => $validated['from_section_code'],
                        'to_section_code' => $validated['to_section_code'],
                        'item_id' => $itemData['item_id'],
                        'item_code' => $item->ItemCode,
                        'stock_id' => $sourceStock->TableKy,
                        'quantity' => $itemData['quantity'],
                        'cost_price' => $costPrice, // Use batch cost price from item_price_det
                        'transfer_date' => $validated['transfer_date'],
                        'notes' => trim(($validated['notes'] ?? '') . $sharedNote),
                        'company_code' => $companyCode,
                        'batch_no' => $sourceStock->batch_no,
                        'serial_number' => $sourceStock->serial_number,
                        // No unit conversion during transfer.
                        // Stock is transferred as-is in the sender's unit.
                        // Use the dedicated Stock Conversion module to convert
                        // bundles/packs into individual units after receiving.
                        'sent_unit_id'      => null,
                        'received_unit_id'  => null,
                        'conversion_factor' => 1,
                        'received_quantity' => null,
                    ]);

                    // Save the first transfer ID for PDF download
                    if ($firstTransferId === null) {
                        $firstTransferId = $transfer->id;
                    }

                    // Execute transfer by inserting new IN and OUT rows
                    $transfer->executeTransfer();
                }

                return redirect()->back()->with('success', 'Stock transferred successfully.')->with('transfer_id', $firstTransferId);
            });
        } catch (\Exception $e) {
            $message = $e->getMessage();
            if (str_starts_with($message, 'Validation failed: ')) {
                $errors = json_decode(str_replace('Validation failed: ', '', $message), true);
                return redirect()->back()->withErrors($errors);
            } else {
                return redirect()->back()->withErrors(['general' => $message]);
            }
        }
    }

    public function getProductStock(Request $request)
    {
        \Log::info('StockTransfer - getProductStock hit', [
            'url' => $request->fullUrl(),
            'params' => $request->all(),
            'user_id' => Auth::id()
        ]);

        try {
            $itemId = trim((string)$request->get('item_id'));
            $sectionCode = trim((string)$request->get('section_code'));
            $user = Auth::user();
            $companyCode = $user->company_code ?? session('company_code');

            if (!$user) {
                \Log::error('StockTransfer - getProductStock: User not authenticated');
                return response()->json(['error' => 'Unauthenticated'], 401);
            }

            \Log::info('StockTransfer - getProductStock details', [
                'item_id' => $itemId,
                'section_code' => $sectionCode,
                'company_code' => $companyCode
            ]);

            if (!$itemId || !$sectionCode) {
                return response()->json([
                    'stock' => 0,
                    'batches' => [],
                    'message' => 'Missing item_id or section_code'
                ], 400);
            }

            // Get product master info for conversion factors
            // Use TRIM on ItmKy to handle legacy whitespace issues in the database
            $itemMaster = Product::whereRaw('TRIM(ItmKy) = ?', [$itemId])->first();
            if (!$itemMaster) {
                \Log::warning('StockTransfer - getProductStock: Item not found', ['item_id' => $itemId]);
                return response()->json(['stock' => 0, 'batches' => [], 'error' => 'Item not found'], 404);
            }

            // Get all available stock batches with positive quantity.
            $batchesQuery = DB::table('stock_in_hand as s')
                ->whereRaw('TRIM(s.section_code) = ?', [$sectionCode])
                ->whereRaw('TRIM(s.ItemKy) = ?', [$itemId])
                ->where('s.company_code', $companyCode)
                ->select(
                    DB::raw('MAX(CASE WHEN s.Qty > 0 THEN s.TableKy ELSE NULL END) as id'),
                    's.batch_no',
                    's.UnitKy',
                    DB::raw('MIN(s.OrdDate) as date'),
                    DB::raw('SUM(COALESCE(s.Qty, 0) + COALESCE(s.FreeQty, 0)) as quantity')
                )
                ->selectSub(function ($query) {
                    $query->from('purchase_det')
                        ->select('CostPrice')
                        ->whereRaw('TRIM(iTimKy) = TRIM(s.ItemKy)')
                        ->where(function($q) {
                            $q->whereRaw('TRIM(batch_no) = TRIM(s.batch_no)')
                              ->orWhere(function($q2) {
                                  $q2->whereNull('batch_no')
                                     ->whereNull('s.batch_no');
                              });
                        })
                        ->where('flnAct', false)
                        ->orderBy('created_at', 'desc')
                        ->limit(1);
                }, 'cost_price')
                ->groupBy('s.batch_no', 's.ItemKy', 's.UnitKy')
                ->having('quantity', '>', 0)
                ->orderBy('date', 'asc');

            \Log::info('StockTransfer - SQL', [
                'sql' => $batchesQuery->toSql(),
                'bindings' => $batchesQuery->getBindings()
            ]);

            $batches = $batchesQuery->get();

            // Handle unit conversion if necessary (mirroring StockInHandReportController logic)
            $transferUnitId = $itemMaster->transfer_unit_id;
            $receivingUnitId = $itemMaster->receiving_unit_id;
            $conversionFactor = (float) ($itemMaster->transfer_conversion_factor ?? 1);
            if ($conversionFactor <= 0) $conversionFactor = 1;

            $totalStock = 0;
            $processedBatches = [];

            // Group by batch to handle consolidated units
            $batchGroups = $batches->groupBy('batch_no');
            foreach ($batchGroups as $batchNo => $batchRecords) {
                $primaryQty = 0;
                $secondaryQty = 0;
                $sampleBatch = $batchRecords->first();

                foreach ($batchRecords as $batch) {
                    $qty = (float) $batch->quantity;
                    if ($batch->UnitKy == $transferUnitId) {
                        $primaryQty += $qty;
                    } elseif ($batch->UnitKy == $receivingUnitId) {
                        $secondaryQty += $qty;
                    } else {
                        // Default to primary unit if unknown
                        $primaryQty += $qty;
                    }
                }

                $batchTotal = $primaryQty + ($secondaryQty / $conversionFactor);
                if ($batchTotal > 0) {
                    $totalStock += $batchTotal;
                    $processedBatches[] = [
                        'id' => $sampleBatch->id,
                        'batch_no' => $batchNo,
                        'date' => $sampleBatch->date,
                        'quantity' => round($batchTotal, 2),
                        'cost_price' => (float) ($sampleBatch->cost_price ?? 0)
                    ];
                }
            }

            return response()->json([
                'stock' => round($totalStock, 2),
                'batches' => $processedBatches,
                'debug' => [
                    'item_id' => $itemId,
                    'section' => $sectionCode,
                    'raw_batch_count' => $batches->count()
                ]
            ]);
        } catch (\Exception $e) {
            \Log::error('StockTransfer - getProductStock error: ' . $e->getMessage());
            return response()->json([
                'stock' => 0,
                'batches' => [],
                'error' => 'Failed to retrieve stock information: ' . $e->getMessage()
            ], 500);
        }
    }

    public function downloadPdf(Request $request)
    {
        if (!request()->user()->hasPermission('stock.transfers.view')) {
             return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view stock transfers.');
        }

        try {
            $companyCode = Auth::user()->company_code ?? session('company_code');
            $user = Auth::user();

            // Parse items data from request
            $items = $request->get('items', []);
            $fromSectionCode = $request->get('from_section_code');
            $toSectionCode = $request->get('to_section_code');
            $transferDate = $request->get('transfer_date');
            $notes = $request->get('notes', '');

            // Get section information
            $fromSection = Section::where('section_code', $fromSectionCode)->first();
            $toSection = Section::where('section_code', $toSectionCode)->first();
            $company = $user->company ?? Company::first();

            // Process items for PDF with details
            $processedItems = [];
            $totalCostValue = 0;

            foreach ($items as $itemData) {
                if (empty($itemData['item_id']) || empty($itemData['quantity'])) {
                    continue;
                }

                $item = Product::where('itemmaster.ItmKy', $itemData['item_id'])
                    ->where('itemmaster.company_code', $companyCode)
                    ->leftJoin('item_price_det', function($join) use ($companyCode) {
                        $join->on('itemmaster.ItmKy', '=', 'item_price_det.ItmKy')
                             ->where('item_price_det.company_code', '=', $companyCode)
                             ->where('item_price_det.fInAct', '=', false);
                    })
                    ->select('itemmaster.ItmKy', 'itemmaster.ItemCode', 'itemmaster.ItmNm', 'item_price_det.CosPri as cost_price')
                    ->first();

                if ($item) {
                    $quantity = floatval($itemData['quantity']);
                    
                    // Fetch batch info and cost price from purchase_det
                    $batchNo = 'N/A';
                    $costPrice = floatval($item->cost_price ?? 0);
                    
                    if (!empty($itemData['stock_id'])) {
                        $batchStock = DB::table('stock_in_hand')
                            ->where('TableKy', $itemData['stock_id'])
                            ->select('batch_no')
                            ->first();
                        
                        if ($batchStock) {
                            $batchNo = $batchStock->batch_no ?? 'N/A';
                            
                            // Get cost price from purchase_det using batch_no
                            if ($batchNo !== 'N/A') {
                                $purchaseRecord = DB::table('purchase_det')
                                    ->where('iTimKy', $itemData['item_id'])
                                    ->where('batch_no', $batchNo)
                                    ->where('flnAct', false)
                                    ->select('CostPrice')
                                    ->first();
                                
                                if ($purchaseRecord && $purchaseRecord->CostPrice) {
                                    $costPrice = floatval($purchaseRecord->CostPrice);
                                }
                            }
                        }
                    }

                    $totalValue = $quantity * $costPrice;

                    $processedItems[] = [
                        'item_code' => $item->ItemCode,
                        'item_name' => $item->ItmNm,
                        'batch_no' => $batchNo,
                        'quantity' => $quantity,
                        'cost_price' => $costPrice,
                        'total_value' => $totalValue,
                    ];

                    $totalCostValue += $totalValue;
                }
            }

            // Prepare data for PDF
            $data = [
                'company_name' => $company ? $company->name : 'Company',
                'transfer_number' => 'PENDING', // Default for preview
                'transfer_date' => $transferDate,
                'from_section' => $fromSection ? $fromSection->name : 'Unknown',
                'to_section' => $toSection ? $toSection->name : 'Unknown',
                'items' => $processedItems,
                'total_cost_value' => $totalCostValue,
                'notes' => $notes,
                'generated_at' => now()->format('d M Y, h:i A'),
                'generated_by' => $user->username ?? $user->name ?? 'System',
            ];

            // Set PDF options
            $options = [
                'isRemoteEnabled' => true,
                'isHtml5ParserEnabled' => true,
                'enable_unicode' => true,
            ];

            // Generate PDF
            $pdf = Pdf::loadView('stock_transfer_pdf', $data);
            $pdf->setOptions($options);
            $pdf->setPaper('A4', 'portrait');

            // Generate filename with timestamp
            $filename = 'stock-transfer-preview-' . date('Y-m-d-H-i-s') . '.pdf';

            // Return PDF download
            return $pdf->download($filename);

        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('PDF Download Error: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to generate PDF: ' . $e->getMessage()], 500);
        }
    }

    public function downloadPdfById(StockTransfer $stockTransfer)
    {
        if (!request()->user()->hasPermission('stock.transfers.view')) {
             return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view stock transfers.');
        }

        try {
            $user = Auth::user();
            $company = $user->company ?? Company::first(); // Or fetch by company_code

            $stockTransfer->load(['fromSection', 'toSection', 'item']);

            // Fetch ALL transfers with the same transfer_number
            $transferNumber = $stockTransfer->transfer_number;
            $allTransfers = StockTransfer::where('transfer_number', $transferNumber)
                ->with(['item'])
                ->get();

            // Process all items in this transfer
            $processedItems = [];
            $totalCostValue = 0;

            foreach ($allTransfers as $transfer) {
                $itemValue = $transfer->quantity * $transfer->cost_price;
                $processedItems[] = [
                    'item_code' => $transfer->item->ItemCode ?? 'N/A',
                    'item_name' => $transfer->item->ItmNm ?? 'N/A',
                    'batch_no' => $transfer->batch_no ?? 'N/A',
                    'quantity' => $transfer->quantity,
                    'cost_price' => $transfer->cost_price,
                    'total_value' => $itemValue,
                ];
                $totalCostValue += $itemValue;
            }

            $data = [
                'company_name' => $company ? $company->name : 'Company',
                'transfer_number' => $stockTransfer->transfer_number ?? 'N/A',
                'transfer_date' => $stockTransfer->transfer_date,
                'from_section' => $stockTransfer->fromSection->name ?? $stockTransfer->from_section_code,
                'to_section' => $stockTransfer->toSection->name ?? $stockTransfer->to_section_code,
                'items' => $processedItems,
                'total_cost_value' => $totalCostValue,
                'notes' => $stockTransfer->notes,
                'generated_at' => now()->format('d M Y, h:i A'),
                'generated_by' => $user->username ?? $user->name ?? 'System',
            ];

            $pdf = Pdf::loadView('stock_transfer_pdf', $data);
            $pdf->setPaper('A4', 'portrait');

            $filename = 'stock-transfer-' . ($stockTransfer->transfer_number ?? $stockTransfer->id) . '.pdf';

            return $pdf->download($filename);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('PDF Download By ID Error: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to generate PDF'], 500);
        }
    }
    public function show($id)
    {
        if (!request()->user()->hasPermission('stock.transfers.view')) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $stockTransfer = StockTransfer::findOrFail($id);
        $companyCode = Auth::user()->company_code ?? session('company_code');

        // Fetch ALL transfers with the same transfer_number
        $transferNumber = $stockTransfer->transfer_number;
        $items = StockTransfer::where('transfer_number', $transferNumber)
            ->with(['item', 'fromSection', 'toSection'])
            ->get();

        return response()->json([
            'transfer_number' => $transferNumber,
            'transfer_date' => $stockTransfer->transfer_date,
            'fromSection' => $stockTransfer->fromSection,
            'toSection' => $stockTransfer->toSection,
            'notes' => $stockTransfer->notes,
            'items' => $items,
            'totalQuantity' => $items->sum('quantity'),
            'totalValue' => $items->sum(function($item) {
                return $item->quantity * $item->cost_price;
            }),
        ]);
    }
}
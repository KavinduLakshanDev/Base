<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use App\Models\Company;
use App\Models\Section;
use App\Models\StockInHand;
use Barryvdh\DomPDF\Facade\Pdf;

class StockInHandReportController extends Controller
{
    /**
     * Display the stock in hand report.
     */
    public function index(Request $request)
    {
        if (!request()->user()->hasPermission('reports.stock_in_hand')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view stock.');
        }

        $user = Auth::user();

        // Get company & branch info from user first
        try {
            $company = $user->company ?? Company::first();
            $section = $user->section ?? Section::first();

            $companyCode = $company ? ($company->company_code ?? 'C01') : 'C01';
            $sectionCode = $section ? ($section->section_code ?? 'BR01') : 'BR01';

            // Handle section filter from request
            if ($request->has('section') && !empty($request->section)) {
                $requestedSection = Section::find($request->section);
                if ($requestedSection) {
                    $sectionCode = $requestedSection->section_code;
                    $companyCode = $requestedSection->company_code; // Update company code to match selected section
                    $section = $requestedSection;
                }
            }

            $companyInfo = [
                'name' => $company ? ($company->name ?? 'Company') : 'Company',
                'section' => $section ? ($section->name ?? 'Main') : 'Main',
                'code' => $companyCode,
                'section_code' => $sectionCode,
            ];
        } catch (\Exception $e) {
            $companyInfo = [
                'name' => 'Company',
                'section' => 'Main',
                'code' => 'C01',
                'section_code' => 'BR01',
            ];
            $companyCode = 'C01';
            $sectionCode = 'BR01';
        }

        // Determine business unit for sharing logic
        $businessUnit = 'vismass'; // Default
        if (str_starts_with(strtoupper($companyCode), 'MAL')) {
            $businessUnit = 'malibo';
        }

        // Get all sections for the filter dropdown - excluding 'Malibu Section'.
        // we also need company_code so the frontend can restrict to the user's company
        $sections = Section::where('name', '!=', 'Malibu Section')
            ->where('is_active', true)
            ->select('id', 'name', 'company_code')
            ->orderBy('name')
            ->get();

        // Get categories for filter dropdown
        $categories = DB::table('code_masters')
            ->where('conkey', 'CAT') // Categories are stored with conkey 'CAT'
            ->where('company_code', $companyCode)
            ->select('catkey', 'cname')
            ->orderBy('cname')
            ->get();

        // Get suppliers for filter dropdown
        $suppliers = DB::table('acc_mas')
            ->where('AccTyp', 'SUPPLIER')
            ->where('Status', 'A')
            ->where('company_code', $companyCode)
            // ->where('section_code', $sectionCode) // Suppliers are usually company-wide
            ->select('AccKy as id', 'AccNm as name')
            ->orderBy('AccNm')
            ->get();

        // Get items for item code filter dropdown
        $dropdownItems = DB::table('itemmaster')
            ->select('ItmKy as id', 'ItemCode as code', 'ItmNm as name')
            ->where('fInAct', false) // Only active items
            ->where(function($q) use ($companyCode, $businessUnit) {
                $q->where('company_code', $companyCode)
                  ->orWhereJsonContains('available_business_units', $businessUnit);
            });

        $itemType = $request->query('item_type', 'all');
        if (in_array($itemType, ['product', 'printer'], true)) {
            $dropdownItems->where('item_type', $itemType);
        }

        $dropdownItems = $dropdownItems
            ->orderBy('ItmNm')
            ->get();

        // Get unique printer details from purchase_det for selection
        $printerDetails = DB::table('purchase_det as pd')
            ->join('itemmaster as im', 'pd.iTimKy', '=', 'im.ItmKy')
            ->leftJoin('brands as b', 'im.brand_id', '=', 'b.id')
            ->leftJoin('models as m', 'im.models_id', '=', 'm.id')
            ->where('pd.company_code', $companyCode)
            ->where('pd.section_code', $sectionCode)
            ->whereNotNull('pd.serial_number')
            ->select('b.name as brand', 'm.name as model', 'pd.serial_number')
            ->distinct()
            ->orderBy('brand')
            ->orderBy('model')
            ->get()
            ->map(function($item) {
                $labelParts = [];
                if ($item->brand) $labelParts[] = $item->brand;
                if ($item->model) $labelParts[] = $item->model;
                if ($item->serial_number) $labelParts[] = $item->serial_number;

                return [
                    'brand' => $item->brand,
                    'model' => $item->model,
                    'serial_number' => $item->serial_number,
                    'label' => implode(' - ', $labelParts)
                ];
            });

        // Build query for items based on filters
        $asAtDate = $request->query('as_at_date', date('Y-m-d'));
        
        // When "All Items" is selected, get items that actually have stock
        if ((!$request->has('item_code') || $request->item_code === 'all') && 
            (!$request->has('category') || $request->category === 'all') &&
            (!$request->has('supplier') || $request->supplier === 'all') &&
            !$request->has('brand') &&
            !$request->has('model')) {
            // Get items that have stock in stock_in_hand for this section
            $itemsWithStock = DB::table('stock_in_hand')
                ->where('company_code', $companyCode)
                ->where('section_code', $sectionCode)
                ->when(str_starts_with($companyCode, 'VIS'), function($q) {
                    return $q->where(function($subQ) {
                        $subQ->whereNull('batch_no')
                             ->orWhere('batch_no', '')
                             ->orWhere('batch_no', 'not like', 'GRN-VIS-VIS-%')
                             ->orWhere('batch_no', '>=', 'GRN-VIS-VIS-0026');
                });
            })
                ->where('OrdDate', '<=', $asAtDate)
                ->select('ItemKy')
                ->groupBy('ItemKy')
                // ->havingRaw('SUM(Qty + FreeQty) > 0')
                ->pluck('ItemKy')
                ->toArray();
            
            $itemsQuery = DB::table('itemmaster as im')
                ->leftJoin('code_masters as cm', function($join) use ($companyCode) {
                    $join->on('im.catkey', '=', 'cm.catkey')
                         ->where('cm.conkey', '=', 'CAT')
                         ->where('cm.company_code', '=', $companyCode);
                })
                ->where(function($q) use ($companyCode, $businessUnit) {
                    $q->where('im.company_code', $companyCode)
                      ->orWhereJsonContains('im.available_business_units', $businessUnit);
                })
                ->whereIn('im.ItmKy', $itemsWithStock)
                ->orderBy('im.ItmNm');

            if (in_array($itemType, ['product', 'printer'], true)) {
                $itemsQuery->where('im.item_type', $itemType);
            }
        } else {
            // Original query for filtered results
            $itemsQuery = DB::table('itemmaster as im')
                ->leftJoin('code_masters as cm', function($join) use ($companyCode) {
                    $join->on('im.catkey', '=', 'cm.catkey')
                         ->where('cm.conkey', '=', 'CAT')
                         ->where('cm.company_code', '=', $companyCode);
                })
                ->where(function($q) use ($companyCode, $businessUnit) {
                    $q->where('im.company_code', $companyCode)
                      ->orWhereJsonContains('im.available_business_units', $businessUnit);
                })
                ->orderBy('im.ItmNm');

            if (in_array($itemType, ['product', 'printer'], true)) {
                $itemsQuery->where('im.item_type', $itemType);
            }

            // Apply category filter if selected
            if ($request->has('category') && !empty($request->category) && $request->category !== 'all') {
                $itemsQuery->where('im.catkey', $request->category);
            }

            // Apply item code filter if provided
            if ($request->has('item_code') && !empty($request->item_code) && $request->item_code !== 'all') {
                $itemsQuery->where('im.ItemCode', $request->item_code);
            }

            // Apply supplier filter if selected
            if ($request->has('supplier') && !empty($request->supplier) && $request->supplier !== 'all') {
                $itemsQuery->where('im.SupKey', $request->supplier);
            }
            
            // Add Brand Filter
            if ($request->has('brand') && !empty($request->brand)) {
                $itemsQuery->whereExists(function ($query) use ($request) {
                    $query->select(DB::raw(1))
                        ->from('brands')
                        ->whereColumn('brands.id', 'im.brand_id')
                        ->where('brands.name', 'like', '%' . $request->brand . '%');
                });
            }

            // Add Model Filter
            if ($request->has('model') && !empty($request->model)) {
                $itemsQuery->whereExists(function ($query) use ($request) {
                    $query->select(DB::raw(1))
                        ->from('models')
                        ->whereColumn('models.id', 'im.models_id')
                        ->where('models.name', 'like', '%' . $request->model . '%');
                });
            }
        }
        
        // Get items without cache for immediate updates
        $items = $itemsQuery->get();

        // Get current stock from stock_in_hand table for selected branch
        $stockMovements = [];
        if ($items->isNotEmpty()) {
            $itemKeys = $items->pluck('ItmKy')->toArray();
            
            // Get fresh batch-wise stock data without cache for immediate updates
            $query = DB::table('stock_in_hand')
                ->where('stock_in_hand.company_code', $companyCode)
                ->where('stock_in_hand.section_code', $sectionCode)
                ->whereIn('stock_in_hand.ItemKy', $itemKeys)
                ->when(str_starts_with($companyCode, 'VIS'), function($q) {
                    return $q->where(function($subQ) {
                        $subQ->whereNull('stock_in_hand.batch_no')
                             ->orWhere('stock_in_hand.batch_no', '')
                             ->orWhere('stock_in_hand.batch_no', 'not like', 'GRN-VIS-VIS-%')
                             ->orWhere('stock_in_hand.batch_no', '>=', 'GRN-VIS-VIS-0026');
                    });
                });
            
            if ($asAtDate) {
                $query->where('stock_in_hand.OrdDate', '<=', $asAtDate);
            }
            
            // Add Serial Number Filter
            if ($request->has('serial_number') && !empty($request->serial_number)) {
                $query->where('stock_in_hand.serial_number', 'like', '%' . $request->serial_number . '%');
            }

            // Subquery to get batch-specific prices from purchase_det without record duplication
            $priceSubquery = DB::table('purchase_det')
                ->select('iTimKy', 'batch_no')
                ->selectRaw('MAX(CostPrice) as batch_cost_price')
                ->selectRaw('MAX(SalePrice) as batch_sale_price')
                ->where('company_code', $companyCode)
                ->where('section_code', $sectionCode)
                ->where('Status', 'A')
                ->where(function($q) {
                    $q->where('flnAct', false)->orWhereNull('flnAct');
                })
                ->groupBy('iTimKy', 'batch_no');

            // Get batch-wise stock data with unit conversion support and batch-specific pricing
            $stockRecords = $query
                ->leftJoin('itemmaster as im', 'stock_in_hand.ItemKy', '=', 'im.ItmKy')
                ->leftJoin('code_masters as units', function($join) use ($companyCode) {
                    $join->on('stock_in_hand.UnitKy', '=', 'units.id')
                         ->where('units.conkey', '=', 'UNT')
                         ->where('units.company_code', '=', $companyCode);
                })
                // Left join with purchase_det subquery to get batch-specific prices without fan-out
                ->leftJoinSub($priceSubquery, 'pd', function($join) {
                    $join->on('stock_in_hand.ItemKy', '=', 'pd.iTimKy')
                         ->on('stock_in_hand.batch_no', '=', 'pd.batch_no');
                })
                ->select(
                    'stock_in_hand.ItemKy', 
                    'stock_in_hand.batch_no',
                    'stock_in_hand.UnitKy',
                    'stock_in_hand.RefNo',
                    'stock_in_hand.TrnTyp',
                    'stock_in_hand.serial_number',
                    'im.item_type', 
                    'units.cname as unit_name',
                    'im.transfer_unit_id',
                    'im.receiving_unit_id',
                    'im.transfer_conversion_factor',
                    'pd.batch_cost_price',
                    'pd.batch_sale_price',
                    DB::raw('SUM(stock_in_hand.Qty + stock_in_hand.FreeQty) as total_stock'),
                    DB::raw('MIN(stock_in_hand.OrdDate) as first_received_date'),
                    DB::raw('MAX(stock_in_hand.OrdDate) as last_received_date'),
                    'b.name as brand_name',
                    'm.name as model_name'
                )
                ->leftJoin('brands as b', 'im.brand_id', '=', 'b.id')
                ->leftJoin('models as m', 'im.models_id', '=', 'm.id')
                ->groupBy(
                    'stock_in_hand.ItemKy', 
                    'stock_in_hand.UnitKy', 
                    'stock_in_hand.batch_no',
                    'stock_in_hand.RefNo',
                    'stock_in_hand.TrnTyp',
                    'stock_in_hand.serial_number',
                    'im.item_type', 
                    'units.cname',
                    'im.transfer_unit_id',
                    'im.receiving_unit_id',
                    'im.transfer_conversion_factor',
                    'pd.batch_cost_price',
                    'pd.batch_sale_price',
                    'b.name',
                    'm.name'
                )
                // Don't filter out negative stock here - we need RCNV-OUT records to properly reduce bundle stock
                // ->having('total_stock', '>', 0)
                ->orderBy('stock_in_hand.ItemKy')
                ->orderBy('stock_in_hand.batch_no')
                ->get();
            
            // Pre-fetch all unit names to avoid N+1 queries in the loop
            $allUnits = DB::table('code_masters')
                ->where('conkey', 'UNT')
                ->where('company_code', $companyCode)
                ->pluck('cname', 'id')
                ->toArray();
                
            // Pre-fetch all conversions and source prices to avoid N+1 queries in the loop
            $cnvBatchNos = $stockRecords->pluck('batch_no')->filter(fn($b) => $b !== null && str_starts_with($b, 'CNV-'))->unique()->toArray();
            
            $conversionData = [];
            if (!empty($cnvBatchNos)) {
                $conversions = DB::table('stock_conversions')->whereIn('to_batch_no', $cnvBatchNos)->get();
                if ($conversions->isNotEmpty()) {
                    $sourceItemsIds = $conversions->pluck('item_id')->unique()->toArray();
                    $sourceBatchNos = $conversions->pluck('batch_no')->unique()->toArray();
                    
                    $sourcePrices = DB::table('purchase_det')
                        ->whereIn('iTimKy', $sourceItemsIds)
                        ->whereIn('batch_no', $sourceBatchNos)
                        ->get()
                        ->keyBy(function($item) {
                            return $item->iTimKy . '_' . $item->batch_no;
                        });
                        
                    $sourceItems = DB::table('itemmaster')
                        ->whereIn('ItmKy', $sourceItemsIds)
                        ->get()
                        ->keyBy('ItmKy');
                        
                    foreach ($conversions as $conv) {
                        $conversionData[$conv->to_batch_no] = [
                            'conversion' => $conv,
                            'price' => $sourcePrices->get($conv->item_id . '_' . $conv->batch_no),
                            'item' => $sourceItems->get($conv->item_id)
                        ];
                    }
                }
            }
            
            // Group stock records by ItemKy to avoid O(N^2) lookups in the loop
            $stockRecordsByItem = $stockRecords->groupBy('ItemKy');

            // Batch-wise view - process all items with unit conversion
            foreach ($items as $item) {
                $itemBatches = $stockRecordsByItem->get($item->ItmKy, collect());
                
                if ($itemBatches->isEmpty()) {
                    // If item has no batches but was in the query results, show it with null batch
                    $stockMovements[] = [
                        'item_code' => $item->ItemCode,
                        'item_name' => $item->ItmNm,
                        'batch_no' => 'N/A',
                        'category_name' => $item->category_name ?? 'Uncategorized',
                        'cost_price' => (float) ($item->CosPri ?? 0),
                        'retail_price' => (float) ($item->SlsPri ?? 0),
                        'current_stock' => 0,
                        'first_received_date' => null,
                        'last_received_date' => null,
                    ];
                } else {
                    // Group by batch and consolidate units
                    $batchGroups = $itemBatches->groupBy('batch_no');
                    
                    foreach ($batchGroups as $batchNo => $batchRecords) {
                        $consolidatedStock = 0;
                        $primaryUnitName = null;
                        $firstReceived = null;
                        $lastReceived = null;
                        
                        // Get item's unit configuration
                        $sample = $batchRecords->first();
                        $transferUnitId = $sample->transfer_unit_id;
                        $receivingUnitId = $sample->receiving_unit_id;
                        $conversionFactor = (float) ($sample->transfer_conversion_factor ?? 1);
                        
                        // prepare counters for primary & secondary quantities
                        $primaryQty = 0.0;
                        $secondaryQty = 0.0;
                        $secondaryUnitName = null;
                        foreach ($batchRecords as $batch) {
                            $stockQty = (float) $batch->total_stock;

                            // Determine which unit this stock belongs to
                            $isSecondaryUnit = false;
                            
                            if ($batch->UnitKy == $transferUnitId) {
                                // Explicitly primary unit (e.g., Bundle)
                                $primaryQty += $stockQty;
                                $primaryUnitName = $batch->unit_name;
                            } elseif ($batch->UnitKy == $receivingUnitId) {
                                // Explicitly secondary/receiving unit (e.g., Nos/Papers)
                                $secondaryQty += $stockQty;
                                $secondaryUnitName = $batch->unit_name;
                                $isSecondaryUnit = true;
                            } elseif ($batch->UnitKy === null || $batch->UnitKy == '') {
                                // UnitKy not set - determine from RefNo pattern or TrnTyp
                                $refNo = $batch->RefNo ?? '';
                                $trnTyp = $batch->TrnTyp ?? '';
                                
                                // CNV-IN = Conversion IN (papers added from bundle conversion) → Secondary (Papers)
                                // RCNV-OUT = Reverse Conversion OUT (bundles removed for conversion) → Primary (Bundle)
                                // SAL-NOS = Sales in Nos unit → Secondary (Papers)
                                
                                if (str_starts_with($refNo, 'CNV-IN') || $trnTyp === 'SAL-NOS') {
                                    // CNV-IN: Papers added from conversion (positive)
                                    // SAL-NOS: Papers sold (negative)
                                    $secondaryQty += $stockQty;
                                    $isSecondaryUnit = true;
                                } elseif (str_starts_with($refNo, 'RCNV-OUT')) {
                                    // RCNV-OUT: Bundles removed for conversion (negative)
                                    // This reduces bundle stock, so add to primaryQty (it's negative, so it reduces)
                                    $primaryQty += $stockQty;
                                } else {
                                    // Default to primary unit (Bundle)
                                    $primaryQty += $stockQty;
                                }
                            } else {
                                // Unknown unit ID - default to primary
                                $primaryQty += $stockQty;
                            }

                            // track dates
                            if (!$firstReceived || $batch->first_received_date < $firstReceived) {
                                $firstReceived = $batch->first_received_date;
                            }
                            if (!$lastReceived || $batch->last_received_date > $lastReceived) {
                                $lastReceived = $batch->last_received_date;
                            }
                        }

                        // Calculate consolidated stock in primary unit terms
                        // Primary stays as-is, secondary converted to primary
                        if ($conversionFactor > 0) {
                            $consolidatedStock = $primaryQty + ($secondaryQty / $conversionFactor);
                        } else {
                            $consolidatedStock = $primaryQty + $secondaryQty;
                        }

                        // if still missing unit name, try lookup on transfer_unit_id
                        if (!$primaryUnitName && $transferUnitId) {
                            $primaryUnitName = $allUnits[$transferUnitId] ?? null;
                        }

                        // IMPORTANT: If item has receiving_unit_id configured but no stock in that unit yet,
                        // still fetch and set the secondary_unit_name so frontend displays breakdown properly
                        if (!$secondaryUnitName && $receivingUnitId && $receivingUnitId != $transferUnitId) {
                            $secondaryUnitName = $allUnits[$receivingUnitId] ?? null;
                        }

                        // IMPORTANT: We no longer skip negative batches here because the frontend aggregates batches
                        // to calculate the true total stock. If a batch went negative (e.g. from a sale without a batch),
                        // it must be included to reduce the total item stock correctly.
                        // if ($consolidatedStock <= 0) {
                        //     continue; 
                        // }

                        // Get batch-specific prices from purchase_det if available, otherwise use master prices
                        $batchCostPrice = 0;
                        $batchSalePrice = 0;
                        
                        // Find the first record with prices in this batch (should have same prices across all records for same batch)
                        $priceRecord = $batchRecords->first();
                        if ($priceRecord && ($priceRecord->batch_cost_price > 0 || $priceRecord->batch_sale_price > 0)) {
                            $batchCostPrice = (float) ($priceRecord->batch_cost_price ?? 0);
                            $batchSalePrice = (float) ($priceRecord->batch_sale_price ?? 0);
                        } else {
                            // Fallback to master prices if batch prices not found
                            $batchCostPrice = (float) ($item->CosPri ?? 0);
                            $batchSalePrice = (float) ($item->SlsPri ?? 0);

                            // Check if this is a conversion batch
                            if ($batchNo !== 'N/A' && str_starts_with($batchNo, 'CNV-')) {
                                if (isset($conversionData[$batchNo])) {
                                    $convInfo = $conversionData[$batchNo];
                                    $conversion = $convInfo['conversion'];
                                    $sourceBatchPrice = $convInfo['price'];
                                    
                                    $factor = (float) ($conversion->conversion_factor > 0 ? $conversion->conversion_factor : 1);
                                    
                                    if ($sourceBatchPrice) {
                                        $batchCostPrice = (float) ($sourceBatchPrice->CostPrice ?? 0) / $factor;
                                        $batchSalePrice = (float) ($sourceBatchPrice->SalePrice ?? 0) / $factor;
                                    } else {
                                        $sourceItem = $convInfo['item'];
                                        if ($sourceItem) {
                                            $batchCostPrice = (float) ($sourceItem->CosPri ?? 0) / $factor;
                                            $batchSalePrice = (float) ($sourceItem->SlsPri ?? 0) / $factor;
                                        }
                                    }
                                }
                            }
                        }

                        $stockMovements[] = [
                            'item_code' => $item->ItemCode,
                            'item_name' => $item->ItmNm,
                            'batch_no' => $batchNo ?? 'N/A',
                            'unit_name' => $primaryUnitName ?? 'N/A',
                            'secondary_unit_name' => $secondaryUnitName,
                            'primary_stock' => round($primaryQty, 2),
                            'secondary_stock' => round($secondaryQty, 2),
                            'category_name' => $item->category_name ?? 'Uncategorized',
                            'cost_price' => $batchCostPrice,
                            'retail_price' => $batchSalePrice,
                            'brand' => $sample->brand_name,
                            'model' => $sample->model_name,
                            'serial_number' => $sample->serial_number,
                            'item_type' => $sample->item_type, // Pass item_type to frontend
                            'current_stock' => round($consolidatedStock, 2),
                            'first_received_date' => $firstReceived,
                            'last_received_date' => $lastReceived,
                        ];
                    }
                }
            }
        }

        // Group by category and calculate totals
        $groupedStock = [];
        foreach ($stockMovements as $item) {
            $category = $item['category_name'];
            if (!isset($groupedStock[$category])) {
                $groupedStock[$category] = [
                    'category_name' => $category,
                    'items' => [],
                    'total_cost_value' => 0,
                    'total_wholesale_value' => 0,
                    'total_retail_value' => 0,
                ];
            }
                $groupedStock[$category]['items'][] = $item;
                $groupedStock[$category]['total_cost_value'] += ((float) $item['cost_price']) * ((float) $item['current_stock']);
                $groupedStock[$category]['total_retail_value'] += ((float) $item['retail_price']) * ((float) $item['current_stock']);
        }

        // Sort items within each category by last_received_date (descending - newest first)
        foreach ($groupedStock as &$categoryGroup) {
            usort($categoryGroup['items'], function($a, $b) {
                $dateA = $a['last_received_date'] ?? '1970-01-01';
                $dateB = $b['last_received_date'] ?? '1970-01-01';
                return strtotime($dateB) - strtotime($dateA); // Descending order (newest first)
            });
        }

        $groupedStock = array_values($groupedStock);

        // Calculate overall totals
        $overallTotalCostValue = 0;
        $overallTotalWholesaleValue = 0;
        $overallTotalRetailValue = 0;
        foreach ($groupedStock as $group) {
            $overallTotalCostValue += $group['total_cost_value'];
            $overallTotalWholesaleValue += $group['total_wholesale_value'];
            $overallTotalRetailValue += $group['total_retail_value'];
        }

        return Inertia::render('Reports/StockInHand', [
            'categories' => $categories,
            'suppliers' => $suppliers,
            'sections' => $sections,
            'items' => $dropdownItems,
            'printerDetails' => $printerDetails,
            'company' => $companyInfo,
            'filters' => $request->only(['category', 'as_at_date', 'item_code', 'supplier', 'section', 'item_type', 'brand', 'model', 'serial_number']),
            'groupedStock' => $groupedStock,
            'overallTotalCostValue' => $overallTotalCostValue,
            'overallTotalWholesaleValue' => $overallTotalWholesaleValue,
            'overallTotalRetailValue' => $overallTotalRetailValue,
        ]);
    }

    public function generateReport(Request $request)
    {
        if (!request()->user()->hasPermission('reports.stock_in_hand')) {
             return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view stock.');
        }

        try {
            $user = Auth::user();

            // Get company & branch from user first
            $company = $user->company ?? Company::first();
            $section = $user->section ?? Section::first();
            $companyCode = $company ? ($company->company_code ?? 'C01') : 'C01';
            $sectionCode = $section ? ($section->section_code ?? 'BR01') : 'BR01';

            // Handle section filter from request
            if ($request->has('section') && !empty($request->section)) {
                $requestedSection = Section::find($request->section);
                if ($requestedSection) {
                    $sectionCode = $requestedSection->section_code;
                    $companyCode = $requestedSection->company_code; // Update company code to match selected section
                    $section = $requestedSection;
                }
            }

            // Determine business unit for sharing logic
            $businessUnit = 'vismass'; // Default
            if (str_starts_with(strtoupper($companyCode), 'MAL')) {
                $businessUnit = 'malibo';
            }

            $asAtDate = $request->query('as_at_date', date('Y-m-d'));
            $itemType = $request->query('item_type', 'all');

            // Get stock movements and calculate stock as of the specified date
            $stockMovements = [];
            
            // Build query for items based on category filter
            $itemsQuery = DB::table('itemmaster as im')
                ->leftJoin('code_masters as cm', function($join) use ($companyCode) {
                    $join->on('im.catkey', '=', 'cm.catkey')
                         ->where('cm.conkey', '=', 'CAT')
                         ->where('cm.company_code', '=', $companyCode);
                })
                ->where(function($q) use ($companyCode, $businessUnit) {
                    $q->where('im.company_code', $companyCode)
                      ->orWhereJsonContains('im.available_business_units', $businessUnit);
                })
                ->orderBy('im.ItmNm');

            if (in_array($itemType, ['product', 'printer'], true)) {
                $itemsQuery->where('im.item_type', $itemType);
            }
            
            // Apply category filter if selected
            if ($request->has('category') && $request->category !== 'all' && !empty($request->category)) {
                $itemsQuery->where('im.catkey', $request->category);
            }
            
            // Apply item code filter
            if ($request->has('item_code') && $request->item_code !== 'all' && !empty($request->item_code)) {
                $itemsQuery->where('im.ItemCode', $request->item_code);
            }

            // Apply supplier filter
            if ($request->has('supplier') && $request->supplier !== 'all' && !empty($request->supplier)) {
                $itemsQuery->where('im.SupKey', $request->supplier);
            }

            // Add Brand Filter
            if ($request->has('brand') && !empty($request->brand)) {
                $itemsQuery->whereExists(function ($query) use ($request) {
                    $query->select(DB::raw(1))
                        ->from('brands')
                        ->whereColumn('brands.id', 'im.brand_id')
                        ->where('brands.name', 'like', '%' . $request->brand . '%');
                });
            }

            // Add Model Filter
            if ($request->has('model') && !empty($request->model)) {
                $itemsQuery->whereExists(function ($query) use ($request) {
                    $query->select(DB::raw(1))
                        ->from('models')
                        ->whereColumn('models.id', 'im.models_id')
                        ->where('models.name', 'like', '%' . $request->model . '%');
                });
            }
            
            $items = $itemsQuery->get();

            // Always process items, even if empty
            $itemKeys = $items->pluck('ItmKy')->toArray();

            if (!empty($itemKeys)) {
                $stockQuery = DB::table('stock_in_hand')
                    ->where('company_code', $companyCode)
                    ->where('section_code', $sectionCode)
                    ->whereIn('ItemKy', $itemKeys)
                    ->when(str_starts_with($companyCode, 'VIS'), function($q) {
                        return $q->where(function($subQ) {
                            $subQ->whereNull('stock_in_hand.batch_no')
                                 ->orWhere('stock_in_hand.batch_no', '')
                                 ->orWhere('stock_in_hand.batch_no', 'not like', 'GRN-VIS-VIS-%')
                                 ->orWhere('stock_in_hand.batch_no', '>=', 'GRN-VIS-VIS-0026');
                        });
                    });
                
                if ($asAtDate) {
                    $stockQuery->where('OrdDate', '<=', $asAtDate);
                }

                // Add Serial Number Filter
                if ($request->has('serial_number') && !empty($request->serial_number)) {
                    $stockQuery->where('stock_in_hand.serial_number', 'like', '%' . $request->serial_number . '%');
                }

                // Subquery to get batch-specific prices from purchase_det without record duplication
                $priceSubquery = DB::table('purchase_det')
                    ->select('iTimKy', 'batch_no')
                    ->selectRaw('MAX(CostPrice) as batch_cost_price')
                    ->selectRaw('MAX(SalePrice) as batch_sale_price')
                    ->where('company_code', $companyCode)
                    ->where('section_code', $sectionCode)
                    ->where('Status', 'A')
                    ->where(function($q) {
                        $q->where('flnAct', false)->orWhereNull('flnAct');
                    })
                    ->groupBy('iTimKy', 'batch_no');

                // Get batch-wise stock data with batch-specific pricing
                $stockRecords = $stockQuery
                    // Left join with itemmaster to get item details (needed for unit conversion and PDF logic)
                    ->leftJoin('itemmaster as im', 'stock_in_hand.ItemKy', '=', 'im.ItmKy')
                    // Left join with purchase_det subquery to get batch-specific prices without fan-out
                    ->leftJoinSub($priceSubquery, 'pd', function($join) {
                        $join->on('stock_in_hand.ItemKy', '=', 'pd.iTimKy')
                             ->on('stock_in_hand.batch_no', '=', 'pd.batch_no');
                    })
                    ->select(
                        'stock_in_hand.ItemKy', 
                        'stock_in_hand.batch_no',
                        'stock_in_hand.serial_number',
                        'im.item_type', // Added item_type for PDF logic
                        'pd.batch_cost_price',
                        'pd.batch_sale_price',
                        DB::raw('MIN(stock_in_hand.OrdDate) as first_received_date'),
                        DB::raw('MAX(stock_in_hand.OrdDate) as last_received_date'),
                        DB::raw('SUM(stock_in_hand.Qty + stock_in_hand.FreeQty) as total_stock')
                    )
                    // ->having('total_stock', '>', 0) // Removed so negative stocks are included in aggregation
                    ->orderBy('stock_in_hand.ItemKy')
                    ->orderBy('stock_in_hand.batch_no')
                    ->get();
                
                // Pre-fetch all conversions and source prices to avoid N+1 queries in the loop
                $cnvBatchNos = $stockRecords->pluck('batch_no')->filter(fn($b) => $b !== null && str_starts_with($b, 'CNV-'))->unique()->toArray();
                
                $conversionData = [];
                if (!empty($cnvBatchNos)) {
                    $conversions = DB::table('stock_conversions')->whereIn('to_batch_no', $cnvBatchNos)->get();
                    if ($conversions->isNotEmpty()) {
                        $sourceItemsIds = $conversions->pluck('item_id')->unique()->toArray();
                        $sourceBatchNos = $conversions->pluck('batch_no')->unique()->toArray();
                        
                        $sourcePrices = DB::table('purchase_det')
                            ->whereIn('iTimKy', $sourceItemsIds)
                            ->whereIn('batch_no', $sourceBatchNos)
                            ->get()
                            ->keyBy(function($item) {
                                return $item->iTimKy . '_' . $item->batch_no;
                            });
                            
                        $sourceItems = DB::table('itemmaster')
                            ->whereIn('ItmKy', $sourceItemsIds)
                            ->get()
                            ->keyBy('ItmKy');
                            
                        foreach ($conversions as $conv) {
                            $conversionData[$conv->to_batch_no] = [
                                'conversion' => $conv,
                                'price' => $sourcePrices->get($conv->item_id . '_' . $conv->batch_no),
                                'item' => $sourceItems->get($conv->item_id)
                            ];
                        }
                    }
                }

                // Group stock records by ItemKy to avoid O(N^2) lookups in the loop
                $stockRecordsByItem = $stockRecords->groupBy('ItemKy');

                // Process batch-wise data
                foreach ($items as $item) {
                    $itemBatches = $stockRecordsByItem->get($item->ItmKy, collect());
                    
                    if ($itemBatches->isEmpty()) {
                        $stockMovements[] = [
                            'item_code' => $item->ItemCode,
                            'item_name' => $item->ItmNm,
                            'batch_no' => 'N/A',
                            'category_name' => $item->category_name ?? 'Uncategorized',
                            'cost_price' => (float) ($item->CosPri ?? 0),
                            'retail_price' => (float) ($item->SlsPri ?? 0),
                            'current_stock' => 0,
                            'first_received_date' => null,
                            'last_received_date' => null,
                        ];
                    } else {
                        foreach ($itemBatches as $batch) {
                            $currentStock = (float) $batch->total_stock;
                            
                            // if ($currentStock <= 0) {
                            //     continue;
                            // }
                            
                            // Use batch-specific prices if available, otherwise use master prices
                            $costPrice = (float) ($batch->batch_cost_price ?? $item->CosPri ?? 0);
                            $salePrice = (float) ($batch->batch_sale_price ?? $item->SlsPri ?? 0);

                            // Check if this is a conversion batch
                            $bNo = $batch->batch_no ?? '';
                            if ($bNo !== 'N/A' && str_starts_with($bNo, 'CNV-')) {
                                if (isset($conversionData[$bNo])) {
                                    $convInfo = $conversionData[$bNo];
                                    $conversion = $convInfo['conversion'];
                                    $sourceBatchPrice = $convInfo['price'];
                                    
                                    $factor = (float) ($conversion->conversion_factor > 0 ? $conversion->conversion_factor : 1);
                                    
                                    if ($sourceBatchPrice) {
                                        $costPrice = (float) ($sourceBatchPrice->CostPrice ?? 0) / $factor;
                                        $salePrice = (float) ($sourceBatchPrice->SalePrice ?? 0) / $factor;
                                    } else {
                                        $sourceItem = $convInfo['item'];
                                        if ($sourceItem) {
                                            $costPrice = (float) ($sourceItem->CosPri ?? 0) / $factor;
                                            $salePrice = (float) ($sourceItem->SlsPri ?? 0) / $factor;
                                        }
                                    }
                                }
                            }
                            
                            $stockMovements[] = [
                                'item_code' => $item->ItemCode,
                                'item_name' => $item->ItmNm,
                                'batch_no' => $batch->batch_no ?? 'N/A',
                                'category_name' => $item->category_name ?? 'Uncategorized',
                                'cost_price' => $costPrice,
                                'retail_price' => $salePrice,
                                'current_stock' => $currentStock,
                                'first_received_date' => $batch->first_received_date,
                                'last_received_date' => $batch->last_received_date,
                            ];
                        }
                    }
                }
            }

            // Group by category and calculate totals
            $groupedStock = [];
            foreach ($stockMovements as $item) {
                $category = $item['category_name'];
                if (!isset($groupedStock[$category])) {
                    $groupedStock[$category] = [
                        'category_name' => $category,
                        'items' => [],
                        'total_cost_value' => 0,
                        'total_wholesale_value' => 0,
                        'total_retail_value' => 0,
                    ];
                }
                $groupedStock[$category]['items'][] = $item;
                $groupedStock[$category]['total_cost_value'] += ((float) $item['cost_price']) * ((float) $item['current_stock']);
                $groupedStock[$category]['total_retail_value'] += ((float) $item['retail_price']) * ((float) $item['current_stock']);
            }

            $groupedStock = array_values($groupedStock);

            // Calculate overall totals
            $overallTotalCostValue = 0;
            $overallTotalWholesaleValue = 0;
            $overallTotalRetailValue = 0;
            foreach ($groupedStock as $group) {
                $overallTotalCostValue += $group['total_cost_value'];
                $overallTotalWholesaleValue += $group['total_wholesale_value'];
                $overallTotalRetailValue += $group['total_retail_value'];
            }

            // Get company info for PDF
            $company = $user->company ?? Company::first();
            $section = $user->section ?? Section::first();

            // Prepare data for PDF
            $data = [
                'groupedStock' => $groupedStock,
                'overallTotalCostValue' => $overallTotalCostValue,
                'overallTotalWholesaleValue' => $overallTotalWholesaleValue,
                'overallTotalRetailValue' => $overallTotalRetailValue,
                'filters' => [
                    'category' => $request->category,
                    'as_at_date' => $request->as_at_date,
                    'item_code' => $request->item_code,
                    'supplier' => $request->supplier,
                    'item_type' => $itemType,
                ],
                'itemType' => $itemType,
                'generated_at' => now()->format('d M Y, h:i A'),
                'generated_by' => $user->username ?? $user->name ?? 'System',
                'company' => [
                    'name' => $company ? $company->name : 'Company',
                    'section' => $section ? $section->name : 'Main',
                ],
            ];

            // Debug data
            Log::info('PDF Data:', $data);

            // Set options for PDF generation
            $options = [
                'isRemoteEnabled' => true,
                'isHtml5ParserEnabled' => true,
                'isPhpEnabled' => true,
                'enable_unicode' => true,
                'enable_html5_parser' => true,
            ];

            // Generate PDF using DomPDF
            $pdf = Pdf::loadView('reports.stock_in_hand', $data);
            $pdf->setOptions($options);

            // Set paper size and orientation to A4 portrait
            $pdf->setPaper('A4', 'portrait');

            // Generate filename with timestamp
            $filename = 'stock-in-hand-report-' . date('Y-m-d-H-i-s') . '.pdf';

            // Return PDF download
            return $pdf->download($filename);
        } catch (\Exception $e) {
            Log::error('Error generating stock in hand report: ' . $e->getMessage());
            return back()->with('error', 'Failed to generate report: ' . $e->getMessage());
        }
    }

    /**
     * Get stock chart data for a specific item.
     */
    public function getStockChartData(Request $request, $itemId)
    {
        if (!request()->user()->hasPermission('reports.stock_in_hand')) {
             return response()->json(['error' => 'Unauthorized'], 403);
        }

        // Validate that itemId is an integer
        if (!is_numeric($itemId) || !ctype_digit($itemId)) {
            return response()->json(['error' => 'Invalid item ID'], 400);
        }

        $user = Auth::user();
        $company = $user->company ?? Company::first();
        $section = $user->section ?? Section::first();
        $companyCode = $company ? ($company->company_code ?? 'C01') : 'C01';
        $sectionCode = $section ? ($section->section_code ?? 'BR01') : 'BR01';

        // Get date range parameters
        $fromDate = $request->query('from_date');
        $toDate = $request->query('to_date');

        // Get stock movements ordered by date
        $query = DB::table('stock_in_hand')
            ->where('company_code', $companyCode)
            ->where('section_code', $sectionCode)
            ->where('ItemKy', $itemId);

        // Apply date filters if provided
        if ($fromDate) {
            $query->where('OrdDate', '>=', $fromDate);
        }
        if ($toDate) {
            $query->where('OrdDate', '<=', $toDate);
        }

        $stockData = $query->orderBy('OrdDate')
            ->select('OrdDate', 'Qty', 'FreeQty')
            ->get();

        $chartData = [];
        $cumulativeQty = 0;

        foreach ($stockData as $record) {
            $cumulativeQty += (float) $record->Qty + (float) $record->FreeQty;
            $chartData[] = [
                'date' => $record->OrdDate,
                'quantity' => $cumulativeQty,
            ];
        }

        return response()->json($chartData);
    }

    /**
     * Get sales chart data for a specific item.
     */
    public function getSalesChartData(Request $request, $itemId)
    {
        if (!request()->user()->hasPermission('reports.stock_in_hand')) {
             return response()->json(['error' => 'Unauthorized'], 403);
        }

        // Validate that itemId is an integer
        if (!is_numeric($itemId) || !ctype_digit($itemId)) {
            return response()->json(['error' => 'Invalid item ID'], 400);
        }

        $user = Auth::user();
        $company = $user->company ?? Company::first();
        $section = $user->section ?? Section::first();
        $companyCode = $company ? ($company->company_code ?? 'C01') : 'C01';
        $sectionCode = $section ? ($section->section_code ?? 'BR01') : 'BR01';

        // Get date range parameters
        $fromDate = $request->query('from_date');
        $toDate = $request->query('to_date');

        // Get sales data (TrnTyp = 'SAL') grouped by date
        $query = DB::table('stock_in_hand')
            ->where('company_code', $companyCode)
            ->where('section_code', $sectionCode)
            ->where('ItemKy', $itemId)
            ->where('TrnTyp', 'SAL');

        // Apply date filters if provided
        if ($fromDate) {
            $query->where('OrdDate', '>=', $fromDate);
        }
        if ($toDate) {
            $query->where('OrdDate', '<=', $toDate);
        }

        $salesData = $query->select('OrdDate', DB::raw('SUM(Qty) as total_qty'))
            ->groupBy('OrdDate')
            ->orderBy('OrdDate')
            ->get();

        $chartData = $salesData->map(function ($record) {
            return [
                'date' => $record->OrdDate,
                'quantity' => (float) $record->total_qty,
            ];
        });

        return response()->json($chartData);
    }

    /**
     * Display the stock charts page.
     */
    public function charts()
    {
        if (!request()->user()->hasPermission('reports.stock_in_hand')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view stock charts.');
        }

        // Get items for dropdown
        $dropdownItems = DB::table('itemmaster')
            ->select('ItmKy as id', 'ItemCode as code', 'ItmNm as name')
            ->where('fInAct', false) // Only active items
            ->orderBy('ItmNm')
            ->get();

        return Inertia::render('Reports/StockCharts', [
            'items' => $dropdownItems,
        ]);
    }

    /**
     * Display the sales history page.
     */
    public function salesHistory()
    {
        if (!request()->user()->hasPermission('reports.stock_in_hand')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view sales history.');
        }

        return Inertia::render('Reports/SalesHistory');
    }

    /**
     * Get sales history data.
     */
    public function getSalesHistory()
    {
        if (!request()->user()->hasPermission('reports.stock_in_hand')) {
             return response()->json(['error' => 'Unauthorized'], 403);
        }

        $user = Auth::user();
        $company = $user->company ?? Company::first();
        $section = $user->section ?? Section::first();
        $companyCode = $company ? ($company->company_code ?? 'C01') : 'C01';
        $sectionCode = $section ? ($section->section_code ?? 'BR01') : 'BR01';

        // Get sales data with item details
        $salesData = DB::table('stock_in_hand as sih')
            ->join('itemmaster as im', 'sih.ItemKy', '=', 'im.ItmKy')
            ->where('sih.company_code', $companyCode)
            ->where('sih.section_code', $sectionCode)
            ->where('sih.TrnTyp', 'SAL')
            ->select('im.ItemCode', 'im.ItmNm', 'sih.Qty', 'sih.OrdDate')
            ->orderBy('sih.OrdDate', 'desc')
            ->get();

        $formattedData = $salesData->map(function ($record) {
            return [
                'item_code' => $record->ItemCode,
                'item_name' => $record->ItmNm,
                'qty' => (float) $record->Qty,
                'date' => $record->OrdDate,
            ];
        });

        return response()->json($formattedData);
    }

    /**
     * Get sales transactions for a specific item.
     */
    public function getItemSalesTransactions(Request $request, $itemId)
    {
        if (!request()->user()->hasPermission('reports.stock_in_hand')) {
             return response()->json(['error' => 'Unauthorized'], 403);
        }

        // Validate that itemId is an integer
        if (!is_numeric($itemId) || !ctype_digit($itemId)) {
            return response()->json(['error' => 'Invalid item ID'], 400);
        }

        $user = Auth::user();
        $company = $user->company ?? Company::first();
        $section = $user->section ?? Section::first();
        $companyCode = $company ? ($company->company_code ?? 'C01') : 'C01';
        $sectionCode = $section ? ($section->section_code ?? 'BR01') : 'BR01';

        // Get date range parameters
        $fromDate = $request->query('from_date');
        $toDate = $request->query('to_date');

        // Get sales transactions with item details
        $query = DB::table('stock_in_hand as sih')
            ->join('itemmaster as im', 'sih.ItemKy', '=', 'im.ItmKy')
            ->where('sih.company_code', $companyCode)
            ->where('sih.section_code', $sectionCode)
            ->where('sih.ItemKy', $itemId)
            ->where('sih.TrnTyp', 'SAL');

        // Apply date filters if provided
        if ($fromDate) {
            $query->where('sih.OrdDate', '>=', $fromDate);
        }
        if ($toDate) {
            $query->where('sih.OrdDate', '<=', $toDate);
        }

        $salesTransactions = $query->select('im.ItemCode', 'im.ItmNm', 'sih.Qty', 'sih.OrdDate', 'sih.RefNo')
            ->orderBy('sih.OrdDate', 'desc')
            ->get();

        $formattedData = $salesTransactions->map(function ($record) {
            return [
                'item_code' => $record->ItemCode,
                'item_name' => $record->ItmNm,
                'qty' => (float) $record->Qty,
                'date' => $record->OrdDate,
                'ref_no' => $record->RefNo,
            ];
        });

        return response()->json($formattedData);
    }
}

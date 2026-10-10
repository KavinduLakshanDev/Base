<?php

namespace App\Http\Controllers\POS;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use App\Http\Controllers\Controller;

class ItemSearchController extends Controller
{
    /**
     * Search items by ItemCode or BarCode for autocomplete functionality
     */
    public function searchByItemCode(Request $request)
    {
        try {
            $searchTerm = $request->query('q', '');
            $limit = $request->query('limit', 10);
            $priceType = $request->query('price_type', 'retail'); // Default to retail

            if (empty($searchTerm)) {
                return response()->json([]);
            }

            // Determine which price field to use based on price type
            $priceField = match ($priceType) {
                'retail' => 'item_price_det.SlsPri',
                'wholesale' => 'item_price_det.WholePrice',
                'extra' => 'item_price_det.VehicleSalePrice',
                default => 'item_price_det.SlsPri'
            };

            $items = Product::where('itemmaster.fInAct', false) // Only active items
                ->where(function ($query) use ($searchTerm) {
                    $query->where('itemmaster.ItemCode', 'like', '%' . $searchTerm . '%')
                          ->orWhere('itemmaster.BarCode', 'like', '%' . $searchTerm . '%');
                })
                ->when(!(Auth::user()?->is_super_admin ?? false), function ($query) {
                    return $query->where('itemmaster.company_code', Auth::user()->company_code);
                })
                ->leftJoin(DB::raw('(SELECT catkey, MIN(cname) as cname FROM code_master GROUP BY catkey) as category'), 'itemmaster.catkey', '=', 'category.catkey')
                ->leftJoin('item_price_det', function($join) {
                    $join->on('itemmaster.ItmKy', '=', 'item_price_det.ItmKy')
                         ->whereRaw('item_price_det.ChangedDate = (SELECT MAX(ChangedDate) FROM item_price_det ipd2 WHERE ipd2.ItmKy = itemmaster.ItmKy)');
                })
                ->select(
                    'itemmaster.ItmKy as id',
                    'itemmaster.ItemCode as ItemCode',
                    'itemmaster.ItmNm as ItmNm',
                    'itemmaster.BarCode as BarCode',
                    DB::raw("COALESCE($priceField, itemmaster.SlsPri) as unit_price"),
                    'itemmaster.QuntityDiscount as QuntityDiscount',
                    'category.cname as category'
                )
                ->orderBy('itemmaster.ItemCode')
                ->limit($limit)
                ->get();

            Log::info('ItemSearchController::searchByItemCode - Search term: ' . $searchTerm . ', Price type: ' . $priceType . ', Results: ' . $items->count());

            return response()->json($items);
        } catch (\Exception $e) {
            Log::error('ItemSearchController::searchByItemCode - Error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to search items by code',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get item details by exact ItemCode or BarCode
     */
    public function getItemByCode(Request $request)
    {
        try {
            $code = $request->query('code');
            $priceType = $request->query('price_type', 'retail'); // Default to retail

            if (empty($code)) {
                return response()->json(['error' => 'Item code is required'], 400);
            }

            // Get user's company and branch codes for stock filtering
            $user = Auth::user();
            $companyCode = $user->company_code;
            $branchCode = $user->branch_code;

            // Determine which price field to use based on price type
            $priceField = match ($priceType) {
                'retail' => 'item_price_det.SlsPri',
                'wholesale' => 'item_price_det.WholePrice',
                'extra' => 'item_price_det.VehicleSalePrice',
                default => 'item_price_det.SlsPri'
            };

            // First, try to find by ItemCode
            $item = Product::where('itemmaster.fInAct', false) // Only active items
                ->where('itemmaster.ItemCode', $code)
                ->when(!(Auth::user()?->is_super_admin ?? false), function ($query) {
                    return $query->where('itemmaster.company_code', Auth::user()->company_code);
                })
                ->leftJoin('code_master as category', 'itemmaster.catkey', '=', 'category.catkey')
                ->leftJoin('acc_mas as supplier', 'itemmaster.SupKey', '=', 'supplier.AccKy')
                ->leftJoin('item_price_det', function($join) {
                    $join->on('itemmaster.ItmKy', '=', 'item_price_det.ItmKy')
                         ->whereRaw('item_price_det.ChangedDate = (SELECT MAX(ChangedDate) FROM item_price_det ipd2 WHERE ipd2.ItmKy = itemmaster.ItmKy)');
                })
                ->leftJoin(DB::raw('(SELECT ItemKy, company_code, branch_code, SUM(COALESCE(Qty, 0) + COALESCE(FreeQty, 0)) as total_stock FROM stock_in_hand GROUP BY ItemKy, company_code, branch_code) as stock'), function($join) use ($companyCode, $branchCode) {
                    $join->on('itemmaster.ItmKy', '=', 'stock.ItemKy')
                         ->where('stock.company_code', '=', $companyCode)
                         ->where('stock.branch_code', '=', $branchCode);
                })
                ->select(
                    'itemmaster.ItmKy as id',
                    'itemmaster.ItemCode as ItemCode',
                    'itemmaster.ItmNm as ItmNm',
                    'itemmaster.BarCode as BarCode',
                    DB::raw("COALESCE($priceField, itemmaster.SlsPri) as unit_price"),
                    'itemmaster.QuntityDiscount as QuntityDiscount',
                    'category.cname as category',
                    'supplier.AccNm as supplier',
                    DB::raw('COALESCE(stock.total_stock, 0) as stock_quantity')
                )
                ->first();

            // If not found by ItemCode, try to find by BarCode
            if (!$item) {
                $item = Product::where('itemmaster.fInAct', false) // Only active items
                    ->where('itemmaster.BarCode', $code)
                    ->when(!(Auth::user()?->is_super_admin ?? false), function ($query) {
                        return $query->where('itemmaster.company_code', Auth::user()->company_code);
                    })
                    ->leftJoin('code_master as category', 'itemmaster.catkey', '=', 'category.catkey')
                    ->leftJoin('acc_mas as supplier', 'itemmaster.SupKey', '=', 'supplier.AccKy')
                    ->leftJoin('item_price_det', function($join) {
                        $join->on('itemmaster.ItmKy', '=', 'item_price_det.ItmKy')
                             ->whereRaw('item_price_det.ChangedDate = (SELECT MAX(ChangedDate) FROM item_price_det ipd2 WHERE ipd2.ItmKy = itemmaster.ItmKy)');
                    })
                    ->leftJoin(DB::raw('(SELECT ItemKy, company_code, branch_code, SUM(COALESCE(Qty, 0) + COALESCE(FreeQty, 0)) as total_stock FROM stock_in_hand GROUP BY ItemKy, company_code, branch_code) as stock'), function($join) use ($companyCode, $branchCode) {
                        $join->on('itemmaster.ItmKy', '=', 'stock.ItemKy')
                             ->where('stock.company_code', '=', $companyCode)
                             ->where('stock.branch_code', '=', $branchCode);
                    })
                    ->select(
                        'itemmaster.ItmKy as id',
                        'itemmaster.ItemCode as ItemCode',
                        'itemmaster.ItmNm as ItmNm',
                        'itemmaster.BarCode as BarCode',
                        DB::raw("COALESCE($priceField, itemmaster.SlsPri) as unit_price"),
                        'itemmaster.QuntityDiscount as QuntityDiscount',
                        'category.cname as category',
                        'supplier.AccNm as supplier',
                        DB::raw('COALESCE(stock.total_stock, 0) as stock_quantity')
                    )
                    ->first();

                // Log when item is found by barcode instead of item code
                if ($item) {
                    Log::info('ItemSearchController::getItemByCode - Item found by BarCode: ' . $code . ' -> ItemCode: ' . $item->ItemCode);
                }
            }

            if (!$item) {
                Log::info('ItemSearchController::getItemByCode - Item not found for code: ' . $code);
                return response()->json(['error' => 'Item not found'], 404);
            }

            return response()->json($item);
        } catch (\Exception $e) {
            Log::error('ItemSearchController::getItemByCode - Error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to get item by code',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all available prices for an item in the format expected by PriceSelectionModal
     */
    public function getItemPricesForModal(Request $request)
    {
        try {
            $itemCode = $request->query('code');

            if (empty($itemCode)) {
                return response()->json(['error' => 'Item code is required'], 400);
            }

            // Get item basic info
            $item = Product::where('itemmaster.fInAct', false) // Only active items
                ->where('itemmaster.ItemCode', $itemCode)
                ->when(!(Auth::user()?->is_super_admin ?? false), function ($query) {
                    return $query->where('itemmaster.company_code', Auth::user()->company_code);
                })
                ->leftJoin('code_master as category', 'itemmaster.catkey', '=', 'category.catkey')
                ->select(
                    'itemmaster.ItmKy',
                    'itemmaster.ItemCode',
                    'itemmaster.ItmNm',
                    'itemmaster.Status',
                    'category.cname as category'
                )
                ->first();

            if (!$item) {
                return response()->json(['error' => 'Item not found'], 404);
            }

            // Get all price records for this item
            $prices = DB::table('item_price_det')
                ->where('ItmKy', $item->ItmKy)
                ->select([
                    'ItemPriceKey',
                    'CosPri',
                    'SlsPri',
                    'WholePrice',
                    'VehicleSalePrice',
                    'ChangedDate',
                    'NCostPrice',
                    'Status'
                ])
                ->get()
                ->map(function ($price) {
                    return [
                        'ItemPriceKey' => $price->ItemPriceKey,
                        'CosPri' => $price->CosPri,
                        'SlsPri' => $price->SlsPri,
                        'WholePrice' => $price->WholePrice,
                        'VehicleSalePrice' => $price->VehicleSalePrice,
                        'ChangedDate' => $price->ChangedDate,
                        'NCostPrice' => $price->NCostPrice ?? 0,
                        'Status' => $price->Status
                    ];
                })
                ->toArray();

            // Transform item info to match modal interface
            $itemInfo = [
                'ItmKy' => $item->ItmKy,
                'ItemCode' => $item->ItemCode,
                'ItmNm' => $item->ItmNm,
                'Status' => $item->Status
            ];

            return response()->json([
                'item' => $itemInfo,
                'prices' => $prices,
                'has_multiple_prices' => count($prices) > 1
            ]);

        } catch (\Exception $e) {
            Log::error('ItemSearchController::getItemPricesForModal - Error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to get item prices for modal',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all available prices for an item
     */
    public function getItemPrices(Request $request)
    {
        try {
            $itemCode = $request->query('code');

            if (empty($itemCode)) {
                return response()->json(['error' => 'Item code is required'], 400);
            }

            $item = Product::where('itemmaster.fInAct', false) // Only active items
                ->where('itemmaster.ItemCode', $itemCode)
                ->when(!(Auth::user()?->is_super_admin ?? false), function ($query) {
                    return $query->where('itemmaster.company_code', Auth::user()->company_code);
                })
                ->leftJoin('code_master as category', 'itemmaster.catkey', '=', 'category.catkey')
                ->leftJoin('item_price_det', function($join) {
                    $join->on('itemmaster.ItmKy', '=', 'item_price_det.ItmKy')
                         ->whereRaw('item_price_det.ChangedDate = (SELECT MAX(ChangedDate) FROM item_price_det ipd2 WHERE ipd2.ItmKy = itemmaster.ItmKy)');
                })
                ->select(
                    'itemmaster.ItmKy',
                    'itemmaster.ItemCode',
                    'itemmaster.ItmNm',
                    'item_price_det.SlsPri as retail_price',
                    'item_price_det.WholePrice as wholesale_price',
                    'item_price_det.VehicleSalePrice as vehicle_sale_price',
                    'category.cname as category'
                )
                ->first();

            if (!$item) {
                return response()->json(['error' => 'Item not found'], 404);
            }

            // Build prices array with available price types
            $prices = [];

            if ($item->retail_price && $item->retail_price > 0) {
                $prices[] = [
                    'type' => 'retail',
                    'label' => 'Retail Price',
                    'price' => $item->retail_price,
                    'unit_price' => $item->retail_price
                ];
            }

            if ($item->wholesale_price && $item->wholesale_price > 0) {
                $prices[] = [
                    'type' => 'wholesale',
                    'label' => 'Wholesale Price',
                    'price' => $item->wholesale_price,
                    'unit_price' => $item->wholesale_price
                ];
            }

            if ($item->vehicle_sale_price && $item->vehicle_sale_price > 0) {
                $prices[] = [
                    'type' => 'extra',
                    'label' => 'Vehicle Sale Price',
                    'price' => $item->vehicle_sale_price,
                    'unit_price' => $item->vehicle_sale_price
                ];
            }

            // If no prices found in item_price_det, use default price from itemmaster
            if (empty($prices)) {
                $prices[] = [
                    'type' => 'default',
                    'label' => 'Default Price',
                    'price' => $item->SlsPri ?? 0,
                    'unit_price' => $item->SlsPri ?? 0
                ];
            }

            return response()->json([
                'item' => [
                    'id' => $item->ItmKy,
                    'ItemCode' => $item->ItemCode,
                    'ItmNm' => $item->ItmNm,
                    'category' => $item->category
                ],
                'prices' => $prices,
                'has_multiple_prices' => count($prices) > 1
            ]);

        } catch (\Exception $e) {
            Log::error('ItemSearchController::getItemPrices - Error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to get item prices',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Search items by ItemName for autocomplete functionality
     */
    public function searchByItemName(Request $request)
    {
        try {
            $searchTerm = $request->query('q', '');
            $limit = $request->query('limit', 10);
            $priceType = $request->query('price_type', 'retail'); // Default to retail

            if (empty($searchTerm)) {
                return response()->json([]);
            }

            // Determine which price field to use based on price type
            $priceField = match ($priceType) {
                'retail' => 'item_price_det.SlsPri',
                'wholesale' => 'item_price_det.WholePrice',
                'extra' => 'item_price_det.VehicleSalePrice',
                default => 'item_price_det.SlsPri'
            };

            $items = Product::where('itemmaster.fInAct', false) // Only active items
                ->where(function ($query) use ($searchTerm) {
                    $query->where('itemmaster.ItmNm', 'like', '%' . $searchTerm . '%');
                })
                ->when(!(Auth::user()?->is_super_admin ?? false), function ($query) {
                    return $query->where('itemmaster.company_code', Auth::user()->company_code);
                })
                ->leftJoin(DB::raw('(SELECT catkey, MIN(cname) as cname FROM code_master GROUP BY catkey) as category'), 'itemmaster.catkey', '=', 'category.catkey')
                ->leftJoin('item_price_det', function($join) {
                    $join->on('itemmaster.ItmKy', '=', 'item_price_det.ItmKy')
                         ->whereRaw('item_price_det.ChangedDate = (SELECT MAX(ChangedDate) FROM item_price_det ipd2 WHERE ipd2.ItmKy = itemmaster.ItmKy)');
                })
                ->select(
                    'itemmaster.ItmKy as id',
                    'itemmaster.ItemCode as ItemCode',
                    'itemmaster.ItmNm as ItmNm',
                    DB::raw("COALESCE($priceField, itemmaster.SlsPri) as unit_price"),
                    'itemmaster.QuntityDiscount as QuntityDiscount',
                    'category.cname as category'
                )
                ->orderBy('itemmaster.ItmNm')
                ->limit($limit)
                ->get();

            Log::info('ItemSearchController::searchByItemName - Search term: ' . $searchTerm . ', Price type: ' . $priceType . ', Results: ' . $items->count());

            return response()->json($items);
        } catch (\Exception $e) {
            Log::error('ItemSearchController::searchByItemName - Error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to search items by name',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
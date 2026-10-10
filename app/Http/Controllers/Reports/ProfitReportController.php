<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\ItemMaster;
use App\Models\SalesTransactionItem;
use App\Models\Section;
use App\Models\ServiceJob;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class ProfitReportController extends Controller
{
    public function index(Request $request)
    {
        // authorization check
        if (! request()->user() || ! request()->user()->hasPermission('reports.profit')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view profit reports.');
        }
        // Get date range or default to today
        $startDate = $request->input('start_date', Carbon::now()->format('Y-m-d'));
        $endDate = $request->input('end_date', Carbon::now()->format('Y-m-d'));

        // convert to carbon range for queries
        $from = Carbon::parse($startDate)->startOfDay();
        $to = Carbon::parse($endDate)->endOfDay();

        // additional filters
        $itemType = $request->input('item_type', 'all');
        $sectionCode = $request->input('section_code');

        // Get authenticated user's company
        $company = null;
        if (auth('company')->check()) {
            $company = auth('company')->user();
        } else {
            $user = auth('web')->user();
            $company = $user ? $user->company : Company::first();
        }

        if (!$company) {
            $company = Company::first();
        }

        // Get all sections for this company
        $companySections = Section::where('company_code', $company->company_code)->pluck('section_code');

// build sales items from normal transactions first
        $salesItemsQuery = SalesTransactionItem::with(['transaction.items', 'item.unit'])
            ->whereHas('transaction', function ($query) use ($from, $to, $companySections) {
                $query->whereBetween('transaction_date', [$from, $to])
                      ->where('status', '!=', 'cancelled') // Exclude cancelled transactions
                      ->whereIn('section_code', $companySections);
            });

        if ($sectionCode && $sectionCode !== 'all') {
            // items may not always carry a section_code; filter by parent transaction instead
            $salesItemsQuery->whereHas('transaction', function ($q) use ($sectionCode) {
                $q->where('section_code', $sectionCode);
            });
        }

        if ($itemType && $itemType !== 'all') {
            $normalizedType = $itemType === 'stationary' ? 'product' : $itemType;
            
            // Join with itemmaster to filter by item_type directly
            $salesItemsQuery->join('itemmaster as im', function ($join) use ($company) {
                $join->on('im.ItmKy', '=', 'sales_transaction_items.product_id')
                    ->orOn('im.ItemCode', '=', 'sales_transaction_items.item_code');
                if ($company->company_code ?? null) {
                    $join->where('im.company_code', '=', $company->company_code);
                }
            })
            ->where('im.item_type', $normalizedType)
            ->select('sales_transaction_items.*'); // Ensure we return columns from the primary table
        }

        $salesItems = $salesItemsQuery->get()->map(function ($item) {
            // Calculate item-level values
            $quantity = (float) $item->quantity;
            
            // Use unit_price (selling price) and cost_price from the record
            // Fallback to 0 if null
            $salesPrice = (float) ($item->unit_price ?? 0);
            $costPrice = (float) ($item->cost_price ?? 0);

            // Get item master info for unit conversion details
            $itemMaster = $item->item;
            $unitInfo = null;
            $conversionFactor = null;
            $primaryUnit = null;
            $secondaryUnit = null;
            $isSecondaryUnitSale = false;

            if ($itemMaster && $itemMaster->transfer_conversion_factor > 1) {
                $conversionFactor = $itemMaster->transfer_conversion_factor;
                
                // Get unit names from code_masters
                if ($itemMaster->transfer_unit_id) {
                    $transferUnit = \DB::table('code_masters')
                        ->where('id', $itemMaster->transfer_unit_id)
                        ->where('conkey', 'UNT')
                        ->first();
                    $primaryUnit = $transferUnit ? $transferUnit->cname : null;
                }
                
                if ($itemMaster->receiving_unit_id) {
                    $receivingUnit = \DB::table('code_masters')
                        ->where('id', $itemMaster->receiving_unit_id)
                        ->where('conkey', 'UNT')
                        ->first();
                    $secondaryUnit = $receivingUnit ? $receivingUnit->cname : null;
                }

                // Try to detect if this was a secondary unit sale
                // Check stock_in_hand first (source of truth) for SAL-NOS transaction type
                $stockRecord = \DB::table('stock_in_hand')
                    ->where('RefNo', $item->invoice_no)
                    ->where('ItemKy', $itemMaster->ItmKy)
                    ->where('TrnTyp', 'SAL-NOS')
                    ->first();
                
                if ($stockRecord) {
                    $isSecondaryUnitSale = true;
                } elseif ($secondaryUnit && $item->unit && stripos($item->unit, $secondaryUnit) !== false) {
                    // Fallback: Check the unit field against secondary unit name
                    $isSecondaryUnitSale = true;
                }

                // Build unit info string
                if ($conversionFactor && $primaryUnit && $secondaryUnit) {
                    $unitInfo = $isSecondaryUnitSale 
                        ? "$secondaryUnit (1 $primaryUnit = $conversionFactor $secondaryUnit)"
                        : "$primaryUnit (1 $primaryUnit = $conversionFactor $secondaryUnit)";
                }

                // LEGACY FIX: If this is a secondary unit sale but cost_price seems wrong
                // (i.e., it wasn't divided by conversion factor), recalculate it
                if ($isSecondaryUnitSale && $conversionFactor > 1) {
                    // Check if cost_price appears to be bundle-level (not adjusted)
                    // If cost_price is significantly higher than sale price, it's likely bundle cost
                    if ($costPrice > ($salesPrice * 10)) {
                        // Definitely bundle cost - divide it
                        $costPrice = $costPrice / $conversionFactor;
                    } else {
                        // Try the item master comparison
                        $estimatedBaseCost = $costPrice * $conversionFactor;
                        $actualBaseCost = (float) ($itemMaster->cost_price ?? 0);
                        
                        // If within 20% tolerance, assume cost_price wasn't adjusted
                        if ($actualBaseCost > 0 && abs($estimatedBaseCost - $actualBaseCost) / $actualBaseCost < 0.20) {
                            $costPrice = $costPrice / $conversionFactor;
                        }
                    }
                }
            }

            // Calculate totals
            // Use line_total as it includes item-level discounts
            $totalSales = (float) ($item->line_total ?? ($salesPrice * $quantity));
            
            // Adjust for transaction-level discounts/tax if total_amount differs from the sum of line totals
            $transaction = $item->transaction;
            if ($transaction && (float)$transaction->total_amount > 0) {
                // Get the net sum of all lines (already including item discounts)
                $netSubtotal = $transaction->items->sum('line_total');
                if ($netSubtotal > 0 && abs((float)$transaction->total_amount - $netSubtotal) > 0.01) {
                    $ratio = (float)$transaction->total_amount / $netSubtotal;
                    $totalSales = $totalSales * $ratio;
                }
            }

            if ($quantity > 0) {
                $salesPrice = $totalSales / $quantity;
            }

            $totalCost = $costPrice * $quantity;
            $profit = $totalSales - $totalCost;

            // Ensure there is a usable unit label for stationary items (and other sales items).
            // Many rows do not populate `unit`, but the item master may have a unit relation/value.
            if (!$itemMaster && $item->item_code) {
                // Attempt to resolve the unit via the item code when the relation isn't set (common in legacy data).
                $itemMaster = ItemMaster::where('ItemCode', $item->item_code)
                    ->orWhere('ItmKy', $item->item_code)
                    ->first();
            }

            // Treat empty string as missing
            $rawUnit = isset($item->unit) ? trim((string) $item->unit) : '';
            $resolvedUnit = $rawUnit !== '' ? $rawUnit : ($itemMaster?->unit?->cname ?? $itemMaster?->Unit ?? null);
            $resolvedUnitInfo = $unitInfo ?? $resolvedUnit;

            return [
                'id' => $item->id,
                'transaction_date' => $item->transaction->transaction_date->format('Y-m-d'),
                'invoice_no' => $item->invoice_no ?? $item->transaction->invoice_no,
                'item_code' => $item->item_code,
                'item_name' => $item->item_name,
                'quantity' => $quantity,
                'sales_price' => $salesPrice,
                'cost_price' => $costPrice,
                'total_sales' => $totalSales,
                'total_cost' => $totalCost,
                'profit' => $profit,
                'unit' => $resolvedUnit,
                'unit_info' => $resolvedUnitInfo,
                'is_secondary_unit' => $isSecondaryUnitSale,
                'conversion_factor' => $conversionFactor,
            ];
        });

        // now append any service job items matching the same filters
        // Only include service items when the report is not filtered by item type.
        // Item type filter is intended to show only sales invoices (printer vs stationary).
        $jobsQuery = null;
        if ($itemType === 'all') {
            // Eager-load item master data for service items so we can show a proper unit label.
            $jobsQuery = ServiceJob::with('items.itemMaster.unit')
                ->where('company_code', $company->company_code)
                ->where('status', '!=', 'cancelled')
                ->whereNull('invoice_number')
                ->where(function($q) use ($from, $to) {
                    $q->whereBetween('actual_completion_date', [$from, $to])
                      ->orWhereBetween('estimated_completion_date', [$from, $to])
                      ->orWhereBetween('received_date', [$from, $to]);
                });
        }

        // Find the default service section (section with "service" in name)
        $defaultServiceSection = null;
        if ($sectionCode && $sectionCode !== 'all') {
            $selectedSection = Section::where('section_code', $sectionCode)->first();
            // Check if this is a service-related section
            if ($selectedSection && (
                stripos($selectedSection->name, 'service') !== false ||
                $selectedSection->section_type === 'service'
            )) {
                $defaultServiceSection = $sectionCode;
            }
        }

        if ($jobsQuery && $sectionCode && $sectionCode !== 'all') {
            // jobs may belong to a section or items themselves may be tagged
            // If filtering by service section, also include jobs with NULL section (they default to service section)
            $jobsQuery->where(function($q) use ($sectionCode, $defaultServiceSection) {
                $q->where('section_code', $sectionCode)
                  ->orWhereHas('items', function($iq) use ($sectionCode) {
                      $iq->where('section_code', $sectionCode);
                  });
                
                // If this is the service section, include jobs with NULL/empty section_code
                if ($defaultServiceSection) {
                    $q->orWhereNull('section_code')
                      ->orWhere('section_code', '');
                }
            });
        }

        $serviceItems = [];
        if ($jobsQuery) {
            foreach ($jobsQuery->get() as $job) {
                foreach ($job->items as $it) {
                    // if section filter is active, check if this item should be included
                    if ($sectionCode && $sectionCode !== 'all') {
                        // item section inherits from job if not explicitly set
                        $itemSection = $it->section_code ?: $job->section_code;
                        $jobSection = $job->section_code;
                        
                        // If job/item section is NULL and we're filtering by service section, treat as service section
                        if ($defaultServiceSection && (empty($jobSection) || empty($itemSection))) {
                            // Job/item with NULL section belongs to service section
                            $itemSection = $itemSection ?: $defaultServiceSection;
                            $jobSection = $jobSection ?: $defaultServiceSection;
                        }
                        
                        // include if either job or item section matches
                        $itemMatchesSection = ($jobSection === $sectionCode) || 
                                             ($itemSection === $sectionCode);
                        if (!$itemMatchesSection) {
                            continue;
                        }
                    }

                    $qty = (float) ($it->quantity ?? 0);
                    $salesP = (float) ($it->unit_price ?? 0);
                    $costP = (float) ($it->cost_price ?? 0);

                    // prefer actual completion date but fall back to estimated, received or creation
                    $date = $job->actual_completion_date
                        ?? $job->estimated_completion_date
                        ?? $job->received_date
                        ?? $job->created_at;
                    if ($date instanceof \Carbon\Carbon) {
                        $date = $date->format('Y-m-d');
                    }

                    // Detect unit for service items (they don't have a unit field by default).
                    // Prefer the unit label from the item master if available.
                    $unit = null;
                    $unitInfo = null;
                    if ($it->itemMaster) {
                        $unit = $it->itemMaster->unit?->cname ?? $it->itemMaster->Unit;
                        $unitInfo = $unit;
                    }

                    $tSales = (float)($it->total_price ?? ($salesP * $qty));
                    $tCost = $costP * $qty;

                    $serviceItems[] = [
                        'id' => $it->id,
                        'transaction_date' => $date,
                        'invoice_no' => $job->job_number,
                        'item_code' => $it->item_code,
                        'item_name' => $it->item_name,
                        'quantity' => $qty,
                        'sales_price' => $qty > 0 ? $tSales / $qty : $salesP,
                        'cost_price' => $costP,
                        'total_sales' => $tSales,
                        'total_cost' => $tCost,
                        'profit' => $tSales - $tCost,
                        'unit' => $unit,
                        'unit_info' => $unitInfo,
                    ];
                }
            }
        }
        if (!empty($serviceItems)) {
            $salesItems = $salesItems->concat(collect($serviceItems));
        }

        // Sort items by date then invoice
        $salesItems = $salesItems->sortBy([
            ['transaction_date', 'asc'],
            ['invoice_no', 'asc']
        ])->values();

        // Calculate summary totals
        $summary = [
            'total_sales' => $salesItems->sum('total_sales'),
            'total_cost' => $salesItems->sum('total_cost'),
            'total_profit' => $salesItems->sum('profit'),
        ];

        // load sections for dropdown
        $sections = Section::where('company_code', $company->company_code)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['section_code', 'name']);

        return Inertia::render('Reports/ProfitReport', [
            'salesItems' => $salesItems,
            'summary' => $summary,
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'item_type' => $itemType,
                'section_code' => $sectionCode,
            ],
            'company' => $company,
            'sections' => $sections,
        ]);
    }
}

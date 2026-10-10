<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\Company;
use App\Models\Section;
use App\Models\ItemMaster;
use App\Models\CodeMaster;
use App\Models\AccMas;
use App\Models\PurchaseDet;
use App\Models\ItemPriceDet;

class ItemListReportController extends Controller
{
    /**
     * Display the item list report.
     */
    public function index(Request $request)
    {
        // permissions check
        if (! request()->user() || ! request()->user()->hasPermission('reports.item_list')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view the item‑list report.');
        }

        try {
            $user = Auth::user();

            // Get company & branch info from user first
            try {
                $company = $user->company ?? Company::first();
                $section = $user->section ?? Section::first();

                $companyCode = $company ? ($company->company_code ?? 'C01') : 'C01';
                $sectionCode = $section ? ($section->section_code ?? 'BR01') : 'BR01';

                $companyInfo = [
                    'name' => $company ? ($company->name ?? 'Company') : 'Company',
                    'section' => $section ? ($section->name ?? 'Main') : 'Main',
                    'code' => $companyCode,
                    'section_code' => $sectionCode,
                    'primary_color' => $company ? ($company->primary_color ?? '#00aeef') : '#00aeef',
                    'secondary_color' => $company ? ($company->secondary_color ?? '#737578') : '#737578',
                ];
            } catch (\Exception $e) {
                $companyInfo = [
                    'name' => 'Company',
                    'section' => 'Main',
                    'code' => 'C01',
                    'section_code' => 'BR01',
                    'primary_color' => '#00aeef',
                    'secondary_color' => '#737578',
                ];
                $companyCode = 'C01';
                $sectionCode = 'BR01';
            }

            // Determine business unit for sharing logic
            $businessUnit = 'vismass'; // Default
            if (str_starts_with(strtoupper($companyCode), 'MAL')) {
                $businessUnit = 'malibo';
            }

            // Get section filter
            $sectionFilter = $request->query('section', 'all');

            // --- Dynamic Categories Fetching ---
            // Get all active categories for filter dropdown
            $categoriesQuery = CodeMaster::where('conkey', 'CAT')
                ->where('is_active', true);

            // Apply company filter if needed (optional, depending on if categories are company-specific)
            // if ($companyCode) {
            //     $categoriesQuery->where('company_code', $companyCode);
            // }

            $categories = $categoriesQuery->select('catkey', 'cname')
                ->orderBy('cname')
                ->get();


            // --- Dynamic Sections Fetching ---
            // Get all active sections from Sections model filtered by company
            $sectionsData = Section::select('section_code', 'name')
                ->where('is_active', true)
                ->where('company_code', $companyCode)
                ->orderBy('name')
                ->get();

            // Format sections for dropdown
            $sections = [['value' => 'all', 'label' => 'All Sections']];
            foreach ($sectionsData as $sec) {
                $sections[] = [
                    'value' => $sec->section_code,
                    'label' => $sec->name
                ];
            }

            // --- Build Query ---
            $itemsQuery = ItemMaster::query()
                ->select(
                    'itemmaster.ItmKy',
                    'itemmaster.ItemCode',
                    'itemmaster.ItmNm',
                    'itemmaster.catkey',
                    'itemmaster.SupKey',
                    'itemmaster.UnitKy',
                    'itemmaster.Unit',
                    'itemmaster.CosPri',
                    'itemmaster.SlsPri',
                    'itemmaster.WholePrice',
                    'itemmaster.section_code',
                    'itemmaster.company_code',
                    // Add other necessary fields, potentially needing joins if details are in other tables
                    // For now, assuming core data is in itemmaster or can be loaded via relationships
                    'itemmaster.batch_no',
                    'itemmaster.BarCode',
                    'itemmaster.brand_id'
                );
            
            // Calculate Qty from StockInHand
            $itemsQuery->withSum('stockInHand as Qty', 'Qty');

            // Apply Section Filter
            if ($sectionFilter !== 'all') {
                // If a specific section is selected, we need to respect its company context
                // But since items can be shared, we shouldn't strictly filter by item's section code if it's a shared item
                // Instead, we might want to filter by where the stock is held if we were joining with stock table
                // For the item LIST, we just want to see valid items for this context.
                
                // However, the original code filtered ItemMaster by section_code. 
                // If ItemMaster.section_code represents the "Owner Section", then we should loosen this 
                // if we want to see items available to the section but owned by others.
                
                // If the user wants to see "Items in this section", that usually implies Stock.
                // If they want "Items defined in this section", that's strict.
                // Assuming the requirement "show all item when I select the section" means 
                // "Show items that are valid/available for this section".
                
                // Let's check if the selected section implies a different company (e.g. Malibo section selected while in Vismass)
                $selectedSectionObj = Section::where('section_code', $sectionFilter)->first();
                if ($selectedSectionObj) {
                     $sectionCompanyCode = $selectedSectionObj->company_code;
                     
                     // Update business unit based on the selected section's company
                     if (str_starts_with(strtoupper($sectionCompanyCode), 'MAL')) {
                        $businessUnit = 'malibo';
                    } else {
                        $businessUnit = 'vismass';
                    }

                     $itemsQuery->where(function($q) use ($sectionCompanyCode, $businessUnit) {
                        $q->where('itemmaster.company_code', $sectionCompanyCode)
                          ->orWhereJsonContains('itemmaster.available_business_units', $businessUnit);
                    });
                }
            } else {
                // No specific section selected (All Sections)
                // Show items for the current logged-in company context AND shared items
                 $itemsQuery->where(function($q) use ($companyCode, $businessUnit) {
                    $q->where('itemmaster.company_code', $companyCode)
                      ->orWhereJsonContains('itemmaster.available_business_units', $businessUnit);
                });
            }


            // Apply Category Filter
            if ($request->has('category') && !empty($request->category) && $request->category !== 'all') {
                $itemsQuery->where('itemmaster.catkey', $request->category);
            }

            // Apply Item Type Filter
            if ($request->has('item_type') && !empty($request->item_type) && $request->item_type !== 'all') {
                $itemsQuery->where('itemmaster.item_type', $request->item_type);
            }

            // Apply Search Filter
            if ($request->has('search') && !empty($request->search)) {
                $search = $request->search;
                $itemsQuery->where(function ($q) use ($search) {
                    $q->where('itemmaster.ItemCode', 'like', "%{$search}%")
                        ->orWhere('itemmaster.ItmNm', 'like', "%{$search}%");
                });
            }

            // Apply Date Filter
            if ($request->has('start_date') && !empty($request->start_date)) {
                $itemsQuery->whereDate('itemmaster.created_at', '>=', $request->start_date);
            }
            if ($request->has('end_date') && !empty($request->end_date)) {
                $itemsQuery->whereDate('itemmaster.created_at', '<=', $request->end_date);
            }

            // Order by item name alphabetically
            $itemsQuery->orderBy('itemmaster.ItmNm', 'asc');

            // Get Items
            $itemMasters = $itemsQuery->get();


            // Transform items for display
            $transformedItems = $itemMasters->map(function ($item) {
                // Load relationships individually to avoid errors or use loaded relations
                $category = null;
                $supplier = null;
                $unit = null;
                $brand = null;

                try {
                    if ($item->catkey) {
                        $category = CodeMaster::where('catkey', $item->catkey)
                            ->where('conkey', 'CAT')
                            ->first();
                    }
                } catch (\Exception $e) {}

                try {
                    if ($item->SupKey) {
                        $supplier = AccMas::where('AccKy', $item->SupKey)->first();
                    }
                } catch (\Exception $e) {}

                try {
                    if ($item->UnitKy) {
                        $unit = CodeMaster::where('id', $item->UnitKy)->first();
                    }
                } catch (\Exception $e) {}
                
                 try {
                    if ($item->brand_id) {
                         // Assuming Brand model exists or stored in CodeMaster/Brand table
                         // Using relationships if defined in ItemMaster would be better
                         $brand = $item->brand; 
                    }
                } catch (\Exception $e) {}


                return [
                    'ItmKy' => $item->ItmKy,
                    'ItemCode' => $item->ItemCode,
                    'ItmNm' => $item->ItmNm,
                    'category_name' => $category ? $category->cname : 'N/A',
                    'supplier_name' => $supplier ? $supplier->AccNm : 'N/A',
                    'unit_name' => $unit ? $unit->cname : ($item->Unit ?? 'N/A'),
                    'CosPri' => (float) $item->CosPri,
                    'SlsPri' => (float) $item->SlsPri,
                    'WholePrice' => (float) $item->WholePrice,
                    'source_section' => $item->section_code,
                    'Qty' => (float) $item->Qty, 
                    'batch_no' => $item->batch_no ?? null,
                    'BarCode' => $item->BarCode ?? null,
                    'brand' => $brand ? $brand->name : null, // Adjust based on Brand model
                    // Fields that were specific to printers/stationaries in previous query might be missing
                    // or need to be mapped if they exist in ItemMaster
                    'PurchaseKey' => null, // Not standard in ItemMaster usually
                    'model' => null,
                    'serial_number' => null,
                ];
            })->toArray();

            return Inertia::render('Reports/ItemList', [
                'items' => $transformedItems,
                'categories' => $categories->toArray(),
                'sections' => $sections,
                'company' => $companyInfo,
                'filters' => [
                    'category' => $request->query('category', 'all'),
                    'section' => $request->query('section', 'all'),
                    'item_type' => $request->query('item_type', 'all'),
                    'search' => $request->query('search', ''),
                    'start_date' => $request->query('start_date', ''),
                    'end_date' => $request->query('end_date', ''),
                ],
            ]);
        } catch (\Exception $e) {
            // Log the error
            Log::error('ItemList Report Error: ' . $e->getMessage());
            Log::error('ItemList Report Stack Trace: ' . $e->getTraceAsString());

            // Return with error data
            return Inertia::render('Reports/ItemList', [
                'items' => [],
                'categories' => [],
                'sections' => [
                    ['value' => 'all', 'label' => 'All Sections'],
                ],
                'company' => [
                    'name' => 'Company',
                    'section' => 'Main',
                    'code' => 'C01',
                    'section_code' => 'BR01',
                    'primary_color' => '#00aeef',
                    'secondary_color' => '#737578',
                ],
                'filters' => [
                    'category' => 'all',
                    'section' => 'all',
                    'item_type' => 'all',
                    'search' => '',
                    'start_date' => '',
                    'end_date' => '',
                ],
                'error' => 'An error occurred while loading the report. Please try again.',
                'debug_error' => config('app.debug') ? $e->getMessage() : null,
            ]);
        }
    }
}

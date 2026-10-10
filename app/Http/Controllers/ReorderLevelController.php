<?php

namespace App\Http\Controllers;

use App\Models\ReorderLevel;
use App\Models\ItemMaster;
use App\Models\Section;
use App\Models\StockInHand;
use App\Models\ReorderLevelLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ReorderLevelController extends Controller
{
    /**
     * API helper - return the reorder level for a given item in the current user's section.
     *
     * This is consumed by the product details page to display the branch-specific
     * reorder level without having to reload the entire list.
     */
    public function getForItem(Request $request, $itemCode)
    {
        $user = Auth::user();
        $companyCode = $user->company_code ?? 'C01';
        $sectionCode = $user->section_code ?? null;

        $query = ReorderLevel::where('company_code', $companyCode)
            ->where('item_code', $itemCode);

        if ($sectionCode) {
            $query->where('section_code', $sectionCode);
        }

        $level = $query->first();

        return response()->json([
            'has_reorder_level' => (bool) $level,
            'reorder_level' => $level ? $level->reorder_level : null,
        ]);
    }

    /**
     * Display a listing of reorder levels and items that need reordering.
     */
    public function index(Request $request)
    {
        if (! request()->user() || ! request()->user()->hasPermission('reorder_levels.view')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to manage reorder levels.');
        }

        $user = Auth::user();
        $companyCode = $user->company_code ?? 'C01';

        // Get reorder levels with product and section info
        $reorderLevels = ReorderLevel::with(['product', 'section'])
            ->where('company_code', $companyCode)
            ->whereHas('product', function($q) {
                $q->where('is_service', false);
            })
            ->when($request->search, function($q) use ($request) {
                return $q->whereHas('product', function($pq) use ($request) {
                    $pq->where('ItmNm', 'like', '%' . $request->search . '%')
                       ->orWhere('ItemCode', 'like', '%' . $request->search . '%');
                });
            })
            ->when($request->section, function($q) use ($request) {
                return $q->where('section_code', $request->section);
            })
            ->paginate(15)
            ->through(function ($level) {
                return [
                    'id' => $level->id,
                    'item_code' => $level->item_code,
                    'item_name' => $level->product->ItmNm ?? 'N/A',
                    'section_code' => $level->section_code,
                    'section_name' => $level->section->name ?? 'N/A',
                    'reorder_level' => $level->reorder_level,
                    'current_stock' => $this->getCurrentStock($level->item_code, $level->section_code),
                    'needs_reorder' => $this->getCurrentStock($level->item_code, $level->section_code) <= $level->reorder_level,
                ];
            });

        // Get items that need reordering (current stock <= reorder level)
        $itemsNeedingReorder = $this->getItemsNeedingReorder($companyCode);

        return Inertia::render('pos/reorder-levels/index', [
            'reorderLevels' => $reorderLevels,
            'itemsNeedingReorder' => $itemsNeedingReorder,
            'sections' => Section::where('company_code', $companyCode)->orderByRaw('is_main_stock DESC, name ASC')->get(),
            'filters' => $request->only(['search', 'section']),
        ]);
    }

    /**
     * Return history logs for a given reorder level. This is an API endpoint
     * called from the frontend when the user wants to inspect what changes were
     * made and by whom.
     */
    public function logs(ReorderLevel $reorderLevel)
    {
        if (! request()->user() || ! request()->user()->hasPermission('reorder_levels.manage')) {
            abort(403);
        }
        $user = Auth::user();
        $companyCode = $user->company_code ?? 'C01';

        // make sure user has access to this record
        if ($reorderLevel->company_code !== $companyCode) {
            abort(403);
        }

        $logs = $reorderLevel->logs()->with('user')->orderBy('created_at', 'desc')->get();

        return response()->json(['logs' => $logs]);
    }

    /**
     * Show the form for creating a new reorder level.
     */
    public function create()
    {
        if (! request()->user() || ! request()->user()->hasPermission('reorder_levels.create')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to manage reorder levels.');
        }
        $user = Auth::user();
        $companyCode = $user->company_code ?? 'C01';

        // Determine user business unit for sharing logic
        $userBusinessUnit = null;
        if (str_starts_with($companyCode, 'MAL')) {
            $userBusinessUnit = 'malibo';
        } elseif (str_starts_with($companyCode, 'VIS')) {
            $userBusinessUnit = 'vismass';
        }

        // Get all products for the company and shared business units (like stock transfer)
        $products = ItemMaster::where(function($query) use ($companyCode, $userBusinessUnit) {
                $query->where('itemmaster.company_code', $companyCode);
                if ($userBusinessUnit) {
                    $query->orWhereJsonContains('available_business_units', $userBusinessUnit);
                }
            })
            ->where('itemmaster.fInAct', false) // Only active items
            ->where('itemmaster.is_service', false) // Exclude service items
            ->orderBy('itemmaster.ItmNm')
            ->get(['itemmaster.ItmKy', 'itemmaster.ItemCode', 'itemmaster.ItmNm', 'itemmaster.BarCode']);

        // add normalized barcode property for the frontend
        $products = $products->map(function ($p) {
            return array_merge($p->toArray(), ['barcode' => $p->BarCode]);
        });

        // Get all sections (like stock transfer)
        $sections = Section::where('company_code', $companyCode)
            ->orderByRaw('is_main_stock DESC, name ASC')
            ->get();

        return Inertia::render('pos/reorder-levels/create', [
            'products' => $products,
            'sections' => $sections,
        ]);
    }

    public function store(Request $request)
    {
        if (! request()->user() || ! request()->user()->hasPermission('reorder_levels.create')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to create reorder levels.');
        }
        $request->validate([
            'item_code' => 'required|string',
            'section_code' => 'required|string|exists:sections,section_code',
            'reorder_level' => 'required|numeric|min:0',
        ]);

        $user = Auth::user();
        $companyCode = $user->company_code ?? 'C01';

        // Determine user business unit for sharing logic
        $userBusinessUnit = null;
        if (str_starts_with($companyCode, 'MAL')) {
            $userBusinessUnit = 'malibo';
        } elseif (str_starts_with($companyCode, 'VIS')) {
            $userBusinessUnit = 'vismass';
        }

        // Validate that the item_code is allowed for this user
        $allowedItem = ItemMaster::where('ItemCode', $request->item_code)
            ->where(function($query) use ($companyCode, $userBusinessUnit) {
                $query->where('company_code', $companyCode);
                if ($userBusinessUnit) {
                    $query->orWhereJsonContains('available_business_units', $userBusinessUnit);
                }
            })
            ->where('fInAct', false)
            ->where('is_service', false)
            ->first();

        if (!$allowedItem) {
            return back()->withErrors(['item_code' => 'Selected item is not available for selection.']);
        }

        // Check if reorder level already exists for this item and section
        $existing = ReorderLevel::where('item_code', $request->item_code)
            ->where('section_code', $request->section_code)
            ->where('company_code', $companyCode)
            ->first();

        if ($existing) {
            return back()->withErrors(['item_code' => 'Reorder level already exists for this item in the selected section.']);
        }

        $new = ReorderLevel::create([
            'item_code' => $request->item_code,
            'section_code' => $request->section_code,
            'company_code' => $companyCode,
            'reorder_level' => $request->reorder_level,
        ]);

        // log creation
        ReorderLevelLog::create([
            'reorder_level_id' => $new->id,
            'company_code' => $companyCode,
            'section_code' => $request->section_code,
            'item_code' => $request->item_code,
            'old_level' => null,
            'new_level' => $request->reorder_level,
            'action' => 'created',
            'changed_by' => $user->id,
        ]);

        return redirect()->route('pos.reorder-levels.index')->with('success', 'Reorder level created successfully.');
    }

    /**
     * Show the form for editing the specified reorder level.
     */
    public function edit(ReorderLevel $reorderLevel)
    {
        if (! request()->user() || ! request()->user()->hasPermission('reorder_levels.edit')) {
            abort(403);
        }
        $user = Auth::user();
        $companyCode = $user->company_code ?? 'C01';

        // Ensure user can only edit reorder levels from their company
        if ($reorderLevel->company_code !== $companyCode) {
            abort(403);
        }

        // Determine user business unit for sharing logic
        $userBusinessUnit = null;
        if (str_starts_with($companyCode, 'MAL')) {
            $userBusinessUnit = 'malibo';
        } elseif (str_starts_with($companyCode, 'VIS')) {
            $userBusinessUnit = 'vismass';
        }

        // Get all products for the company and shared business units (like stock transfer)
        $products = ItemMaster::where(function($query) use ($companyCode, $userBusinessUnit) {
                $query->where('itemmaster.company_code', $companyCode);
                if ($userBusinessUnit) {
                    $query->orWhereJsonContains('available_business_units', $userBusinessUnit);
                }
            })
            ->where('itemmaster.fInAct', false) // Only active items
            ->where('itemmaster.is_service', false) // Exclude service items
            ->orderBy('itemmaster.ItmNm')
            ->get(['itemmaster.ItmKy', 'itemmaster.ItemCode', 'itemmaster.ItmNm', 'itemmaster.BarCode']);

        // add normalized barcode property for the frontend
        $products = $products->map(function ($p) {
            return array_merge($p->toArray(), ['barcode' => $p->BarCode]);
        });

        // Get all sections (like stock transfer)
        $sections = Section::where('company_code', $companyCode)
            ->orderByRaw('is_main_stock DESC, name ASC')
            ->get();

        return Inertia::render('pos/reorder-levels/edit', [
            'reorderLevel' => $reorderLevel->load('product'),
            'products' => $products,
            'sections' => $sections,
        ]);
    }

    /**
     * Update the specified reorder level.
     */
    public function update(Request $request, ReorderLevel $reorderLevel)
    {
        if (! request()->user() || ! request()->user()->hasPermission('reorder_levels.edit')) {
            abort(403);
        }
        $request->validate([
            'item_code' => 'required|string',
            'section_code' => 'required|string|exists:sections,section_code',
            'reorder_level' => 'required|numeric|min:0',
        ]);

        $user = Auth::user();
        $companyCode = $user->company_code ?? 'C01';

        // Ensure user can only update reorder levels from their company
        if ($reorderLevel->company_code !== $companyCode) {
            abort(403);
        }

        // Determine user business unit for sharing logic
        $userBusinessUnit = null;
        if (str_starts_with($companyCode, 'MAL')) {
            $userBusinessUnit = 'malibo';
        } elseif (str_starts_with($companyCode, 'VIS')) {
            $userBusinessUnit = 'vismass';
        }

        // Validate that the item_code is allowed for this user
        $allowedItem = ItemMaster::where('ItemCode', $request->item_code)
            ->where(function($query) use ($companyCode, $userBusinessUnit) {
                $query->where('company_code', $companyCode);
                if ($userBusinessUnit) {
                    $query->orWhereJsonContains('available_business_units', $userBusinessUnit);
                }
            })
            ->where('fInAct', false)
            ->where('is_service', false)
            ->first();

        if (!$allowedItem) {
            return back()->withErrors(['item_code' => 'Selected item is not available for selection.']);
        }

        // Check if another reorder level exists for this item and section (excluding current)
        $existing = ReorderLevel::where('item_code', $request->item_code)
            ->where('section_code', $request->section_code)
            ->where('company_code', $companyCode)
            ->where('id', '!=', $reorderLevel->id)
            ->first();

        if ($existing) {
            return back()->withErrors(['item_code' => 'Reorder level already exists for this item in the selected section.']);
        }

        $oldLevel = $reorderLevel->reorder_level;

        $reorderLevel->update([
            'item_code' => $request->item_code,
            'section_code' => $request->section_code,
            'reorder_level' => $request->reorder_level,
        ]);

        // log update
        ReorderLevelLog::create([
            'reorder_level_id' => $reorderLevel->id,
            'company_code' => $companyCode,
            'section_code' => $request->section_code,
            'item_code' => $request->item_code,
            'old_level' => $oldLevel,
            'new_level' => $request->reorder_level,
            'action' => 'updated',
            'changed_by' => $user->id,
        ]);

        return redirect()->route('pos.reorder-levels.index')->with('success', 'Reorder level updated successfully.');
    }

    /**
     * Remove the specified reorder level.
     */
    public function destroy(ReorderLevel $reorderLevel)
    {
        if (! request()->user() || ! request()->user()->hasPermission('reorder_levels.delete')) {
            abort(403);
        }
        $user = Auth::user();
        $companyCode = $user->company_code ?? 'C01';

        // Ensure user can only delete reorder levels from their company
        if ($reorderLevel->company_code !== $companyCode) {
            abort(403);
        }

        $oldLevel = $reorderLevel->reorder_level;

        // log deletion before removing record
        ReorderLevelLog::create([
            'reorder_level_id' => $reorderLevel->id,
            'company_code' => $companyCode,
            'section_code' => $reorderLevel->section_code,
            'item_code' => $reorderLevel->item_code,
            'old_level' => $oldLevel,
            'new_level' => null,
            'action' => 'deleted',
            'changed_by' => $user->id,
        ]);

        $reorderLevel->delete();

        return redirect()->route('pos.reorder-levels.index')->with('success', 'Reorder level deleted successfully.');
    }

    /**
     * Get current stock for an item in a specific section.
     * Note: Includes both regular Qty and FreeQty (promotional/free items)
     * Excludes service item transactions (TrnTyp='SVC-SAL' which are audit-only with Qty=0)
     */
    private function getCurrentStock($itemCode, $sectionCode)
    {
        $item = ItemMaster::where('ItemCode', $itemCode)->first();
        if (!$item) return 0;

        return StockInHand::where('ItemKy', $item->ItmKy)
            ->where('section_code', $sectionCode)
            ->whereNotIn('TrnTyp', ['SVC-SAL', 'SVC-REV'])  // Exclude service item transactions
            ->sum(DB::raw('COALESCE(Qty, 0) + COALESCE(FreeQty, 0)')) ?? 0;
    }

    /**
     * Get items that need reordering.
     */
    private function getItemsNeedingReorder($companyCode)
    {
        // Get all reorder levels for the company (excluding service items)
        $reorderLevels = ReorderLevel::with('product', 'section')
            ->where('company_code', $companyCode)
            ->whereHas('product', function($q) {
                $q->where('is_service', false);
            })
            ->get();

        $itemsNeedingReorder = [];

        foreach ($reorderLevels as $level) {
            $currentStock = $this->getCurrentStock($level->item_code, $level->section_code);

            if ($currentStock <= $level->reorder_level) {
                $itemsNeedingReorder[] = [
                    'item_code' => $level->item_code,
                    'item_name' => $level->product->ItmNm ?? 'N/A',
                    'section_name' => $level->section->name ?? 'N/A',
                    'current_stock' => $currentStock,
                    'reorder_level' => $level->reorder_level,
                    'shortage' => $level->reorder_level - $currentStock,
                ];
            }
        }

        return $itemsNeedingReorder;
    }
}
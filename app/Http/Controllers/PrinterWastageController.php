<?php

namespace App\Http\Controllers;

use App\Models\PrinterWastage;
use App\Models\PurchaseDet;
use App\Models\Product;
use App\Models\Section;
use App\Models\StockInHand;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PrinterWastageController extends Controller
{
    /**
     * Display a listing of printer wastage records.
     */
    public function index()
    {
        if (! request()->user() || ! request()->user()->hasPermission('printing.wastage.view')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view printer wastage records.');
        }

        $wastages = PrinterWastage::join('purchase_det as pd', 'printer_wastages.purchase_det_key', '=', 'pd.PerchaseDetKy')
            ->join('itemmaster as im', 'pd.iTimKy', '=', 'im.ItmKy')
            ->leftJoin('brands as b', 'im.brand_id', '=', 'b.id')
            ->leftJoin('models as m', 'im.models_id', '=', 'm.id')
            ->with(['recordedBy'])
            ->select('printer_wastages.*', 'pd.serial_number', 'pd.batch_no', 'b.name as brand_name', 'm.name as model_name', 'im.warranty as item_warranty', 'im.ItmNm as item_name')
            ->latest('printer_wastages.created_at')
            ->paginate(15)
            ->through(function ($wastage) {
                return [
                    'id' => $wastage->id,
                    'printer_name' => $wastage->item_name ?? 'N/A',
                    'serial_number' => $wastage->serial_number ?? 'N/A',
                    'batch_no' => $wastage->batch_no ?? 'N/A',
                    'brand' => $wastage->brand_name ?? 'N/A',
                    'model' => $wastage->model_name ?? 'N/A',
                    'warranty' => $wastage->item_warranty ?? 'N/A',
                    'reason' => $wastage->reason,
                    'recorded_by' => $wastage->recordedBy->name ?? 'System',
                    'recorded_at' => $wastage->created_at->format('Y-m-d'),
                    'status' => $wastage->status,
                ];
            });

        return Inertia::render('PrinterWastage/Index', [
            'wastages' => $wastages,
        ]);
    }

    /**
     * Show the form for creating a new printer wastage record.
     */
    public function create()
    {
        if (! request()->user() || ! request()->user()->hasPermission('printing.wastage.create')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to record printer wastage.');
        }

        $sections = Section::where('company_code', request()->user()->company_code)->get();
        $userSection = Auth::user()?->section;

        return Inertia::render('PrinterWastage/Create', [
            'sections' => $sections,
            'userSection' => $userSection,
        ]);
    }

    /**
     * Search for printers in stock by serial number, name, or code.
     */
    public function searchPrinters(Request $request)
    {
        if (! request()->user() || ! request()->user()->hasPermission('printing.wastage.search')) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $term = $request->get('term');
        $sectionId = $request->get('section_id');

        if (!$term || !$sectionId) {
            return response()->json([]);
        }

        try {
            $section = Section::find($sectionId);
            if (!$section) {
                return response()->json(['error' => 'Section not found'], 404);
            }

            // Search in stock_in_hand for printers that have stock in the selected section
            $printers = DB::table('stock_in_hand as sih')
                ->join('itemmaster as im', 'sih.ItemKy', '=', 'im.ItmKy')
                ->leftJoin('purchase_det as pd', function ($join) {
                    $join->on('sih.ItemKy', '=', 'pd.iTimKy')
                        ->on('sih.batch_no', '=', 'pd.batch_no')
                        ->on('sih.serial_number', '=', 'pd.serial_number');
                })
                ->leftJoin('brands as b', 'im.brand_id', '=', 'b.id')
                ->leftJoin('models as m', 'im.models_id', '=', 'm.id')
                ->where('sih.section_code', $section->section_code)
                ->where('im.item_type', 'printer')
                ->where(function ($query) use ($term) {
                    $query->where('im.ItmNm', 'LIKE', "%{$term}%")
                        ->orWhere('im.ItemCode', 'LIKE', "%{$term}%")
                        ->orWhere('sih.serial_number', 'LIKE', "%{$term}%")
                        ->orWhere('sih.batch_no', 'LIKE', "%{$term}%")
                        ->orWhere('b.name', 'LIKE', "%{$term}%")
                        ->orWhere('m.name', 'LIKE', "%{$term}%");
                })
                ->select(
                    'pd.PerchaseDetKy as id',
                    'sih.ItemKy',
                    'im.ItmNm as name',
                    'im.ItemCode as code',
                    'sih.serial_number',
                    'sih.batch_no',
                    'b.name as brand',
                    'm.name as model',
                    'im.warranty',
                    DB::raw('SUM(sih.Qty) as stock_quantity')
                )
                ->groupBy(
                    'pd.PerchaseDetKy',
                    'sih.ItemKy',
                    'im.ItmNm',
                    'im.ItemCode',
                    'sih.serial_number',
                    'sih.batch_no',
                    'b.name',
                    'm.name',
                    'im.warranty'
                )
                ->having('stock_quantity', '>', 0)
                ->limit(30)
                ->get();

            return response()->json($printers);
        } catch (\Exception $e) {
            \Log::error('Printer search error: ' . $e->getMessage());
            return response()->json(['error' => 'Search failed: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Store a newly created printer wastage record.
     */
    public function store(Request $request)
    {
        if (! request()->user() || ! request()->user()->hasPermission('printing.wastage.create')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to record printer wastage.');
        }

        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.serial_number' => 'required|string|exists:purchase_det,serial_number',
            'items.*.quantity' => 'required|numeric|in:1', // Always 1 for printers
            'reason' => 'required|string|max:255',
            'wastage_date' => 'required|date',
            'notes' => 'nullable|string',
            'status' => 'required|in:approved',
            'section_id' => 'required|exists:sections,id',
        ]);

        DB::beginTransaction();
        try {
            foreach ($validated['items'] as $item) {
                $purchaseDet = PurchaseDet::where('serial_number', $item['serial_number'])->firstOrFail();

                // Create printer wastage record
                $wastage = PrinterWastage::create([
                    'purchase_det_key' => $purchaseDet->PerchaseDetKy,
                    'quantity' => 1, // Always 1 for printers
                    'reason' => $validated['reason'],
                    'wastage_date' => $validated['wastage_date'],
                    'notes' => $validated['notes'],
                    'status' => $validated['status'],
                    'recorded_by' => Auth::id(),
                    'section_id' => $validated['section_id'],
                ]);

                // If approved, deduct from stock_in_hand
                if ($validated['status'] === 'approved') {
                    $this->deductPrinterStock($purchaseDet, $validated['section_id'], $wastage->id);
                }
            }

            DB::commit();

            return redirect()->route('printer-wastages.index')
                ->with('success', 'Printer wastage recorded successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Failed to record printer wastage: ' . $e->getMessage());
        }
    }

    /**
     * Deduct printer stock from stock_in_hand.
     */
    private function deductPrinterStock(PurchaseDet $purchaseDet, int $sectionId, int $wastageId)
    {
        // Get the section to retrieve section_code
        $section = Section::findOrFail($sectionId);
        
        // Find the stock record for this printer by serial number
        $stock = StockInHand::where('serial_number', $purchaseDet->serial_number)
            ->where('batch_no', $purchaseDet->batch_no)
            ->where('section_code', $section->section_code)
            ->where('Qty', '>', 0)
            ->orderBy('OrdDate', 'asc')
            ->first();

        // Create wastage OUT record (negative quantity)
        StockInHand::create([
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
            'RefNo' => 'PWST-OUT-' . $wastageId,
            'company_code' => $section->company_code,
            'owner_company_code' => $stock->owner_company_code ?? $section->company_code,
            'section_code' => $section->section_code,
            'OrdDate' => now()->format('Y-m-d'),
            'ItemKy' => $purchaseDet->iTimKy,
            'batch_no' => $purchaseDet->batch_no,
            'serial_number' => $purchaseDet->serial_number,
            'Qty' => -1.00,
            'FreeQty' => 0,
            'TrnTyp' => 'PWST-OUT',
            'OrdKy' => $wastageId,
            'CounterID' => Auth::id() ?? 0,
        ]);
    }

    /**
     * Display the specified printer wastage record.
     */
    public function show(int $id)
    {
        if (! request()->user() || ! request()->user()->hasPermission('printing.wastage.view')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view printer wastage records.');
        }

        $wastage = PrinterWastage::join('purchase_det as pd', 'printer_wastages.purchase_det_key', '=', 'pd.PerchaseDetKy')
            ->join('itemmaster as im', 'pd.iTimKy', '=', 'im.ItmKy')
            ->leftJoin('brands as b', 'im.brand_id', '=', 'b.id')
            ->leftJoin('models as m', 'im.models_id', '=', 'm.id')
            ->join('sections as s', 'printer_wastages.section_id', '=', 's.id')
            ->with(['recordedBy'])
            ->select('printer_wastages.*', 'pd.serial_number', 'pd.batch_no', 'b.name as brand_name', 'm.name as model_name', 'im.warranty as item_warranty', 'im.ItmNm as item_name', 'im.ItemCode as item_code', 's.name as section_name')
            ->findOrFail($id);

        return response()->json([
            'id' => $wastage->id,
            'printer_name' => $wastage->item_name,
            'printer_code' => $wastage->item_code,
            'serial_number' => $wastage->serial_number,
            'batch_no' => $wastage->batch_no,
            'brand' => $wastage->brand_name,
            'model' => $wastage->model_name,
            'warranty' => $wastage->item_warranty,
            'reason' => $wastage->reason,
            'wastage_date' => $wastage->wastage_date,
            'notes' => $wastage->notes,
            'status' => $wastage->status,
            'section_name' => $wastage->section_name,
            'recorded_by' => $wastage->recordedBy->name ?? 'System',
            'recorded_at' => $wastage->created_at->format('Y-m-d H:i:s'),
        ]);
    }

    /**
     * Update the specified printer wastage record.
     */
    public function update(Request $request, int $id)
    {
        if (! request()->user() || ! request()->user()->hasPermission('printing.wastage.edit')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to edit printer wastage records.');
        }

        $wastage = PrinterWastage::findOrFail($id);
        $oldStatus = $wastage->status;

        $validated = $request->validate([
            'reason' => 'required|string|max:255',
            'wastage_date' => 'required|date',
            'notes' => 'nullable|string',
            'status' => 'required|in:approved',
            'serial_number' => 'nullable|string|exists:purchase_det,serial_number',
        ]);

        DB::beginTransaction();
        try {
            $oldPurchaseDetKey = $wastage->purchase_det_key;
            $newPurchaseDet = null;

            if (isset($validated['serial_number'])) {
                $newPurchaseDet = PurchaseDet::where('serial_number', $validated['serial_number'])->firstOrFail();
                if ($newPurchaseDet->PerchaseDetKy !== $oldPurchaseDetKey) {
                    // Printer changed!
                    // 1. Restore stock for the old printer
                    $this->restorePrinterStock($wastage);
                    
                    // 2. Update the wastage record with the new printer key
                    $wastage->purchase_det_key = $newPurchaseDet->PerchaseDetKy;
                }
            }

            $wastage->update([
                'reason' => $validated['reason'],
                'wastage_date' => $validated['wastage_date'],
                'notes' => $validated['notes'],
                'status' => $validated['status'],
                'purchase_det_key' => $wastage->purchase_det_key,
            ]);

            // Status transition logic OR printer change logic
            // If it was already approved and we changed the printer, we need to deduct stock for the new one
            // If it wasn't approved and now it is, we need to deduct stock
            if ($validated['status'] === 'approved') {
                if ($oldStatus !== 'approved' || ($newPurchaseDet && $newPurchaseDet->PerchaseDetKy !== $oldPurchaseDetKey)) {
                    $purchaseDet = $newPurchaseDet ?? PurchaseDet::where('PerchaseDetKy', $wastage->purchase_det_key)->firstOrFail();
                    $this->deductPrinterStock($purchaseDet, $wastage->section_id, $wastage->id);
                }
            }

            DB::commit();

            return redirect()->back()->with('success', 'Printer wastage record updated successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Failed to update printer wastage: ' . $e->getMessage());
        }
    }

    /**
     * Remove the specified printer wastage record.
     */
    public function destroy(int $id)
    {
        if (! request()->user() || ! request()->user()->hasPermission('printing.wastage.delete')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to delete printer wastage records.');
        }

        try {
            $wastage = PrinterWastage::findOrFail($id);

            DB::beginTransaction();

            // Restore stock for all printer wastages when deleted, regardless of status
            $this->restorePrinterStock($wastage);

            $wastage->delete();

            DB::commit();

            return redirect()->route('printer-wastages.index')
                ->with('success', 'Printer wastage record deleted successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Failed to delete printer wastage: ' . $e->getMessage());
        }
    }

    /**
     * Restore printer stock when wastage is deleted.
     */
    private function restorePrinterStock(PrinterWastage $wastage)
    {
        $purchaseDet = $wastage->purchaseDet;

        // Find the original OUT record
        $outRecord = StockInHand::where('RefNo', 'PWST-OUT-' . $wastage->id)
            ->where('TrnTyp', 'PWST-OUT')
            ->first();

        if ($outRecord) {
            // Create an IN record to restore the stock
            StockInHand::create([
                'RefNo' => 'PWST-IN-' . $wastage->id,
                'Cky' => $outRecord->Cky,
                'company_code' => $outRecord->company_code,
                'owner_company_code' => $outRecord->owner_company_code, // Preserve ownership from original
                'section_code' => $outRecord->section_code,
                'OrdDate' => now()->format('Y-m-d'),
                'ItemKy' => $outRecord->ItemKy,
                'Qty' => 1, // Restore 1 unit (positive)
                'FreeQty' => 0,
                'TrnTyp' => 'PWST-IN',
                'OrdKy' => $wastage->id,
                'batch_no' => $outRecord->batch_no,
                'serial_number' => $outRecord->serial_number,
            ]);
        }
    }
}

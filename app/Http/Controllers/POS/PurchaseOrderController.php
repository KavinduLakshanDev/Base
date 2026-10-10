<?php

namespace App\Http\Controllers\POS;

use App\Http\Controllers\Controller;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderDetail;
use App\Models\Address;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Barryvdh\DomPDF\Facade\Pdf;

class PurchaseOrderController extends Controller
{
    private function userIsSuperAdmin($user): bool
    {
        if (!$user) return false;
        if (method_exists($user, 'isSuperAdmin')) return (bool) $user->isSuperAdmin();
        if (method_exists($user, 'hasRole')) {
            try { return (bool) $user->hasRole('super_admin') || (bool) $user->hasRole('admin'); } catch (\Throwable $e) {}
        }
        if (property_exists($user, 'role') && !empty($user->role)) {
            return in_array(strtolower((string)$user->role), ['super_admin', 'superadmin', 'admin', 'administrator']);
        }
        if (isset($user->is_super_admin)) return (bool) $user->is_super_admin;
        return false;
    }

    public function index(Request $request): Response
    {
        $user = Auth::user();
        if (!$user->hasPermission('reports.purchase_orders')) {
             return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view purchase orders.');
        }

        $query = PurchaseOrder::with(['supplier', 'section'])
            ->withCount('details')
            ->where('company_code', $user->company_code);

        if ($user->role_id === 3) {
            $query->where('section_code', $user->section_code);
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function($q) use ($search) {
                $q->where('PurchaseOrderNo', 'LIKE', "%{$search}%")
                  ->orWhere('SuppCode', 'LIKE', "%{$search}%")
                  ->orWhere('Des', 'LIKE', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('Status', $request->input('status'));
        }

        $perPage = $request->input('per_page', 10);
        $purchaseOrders = $query->orderBy('created_at', 'desc')->paginate($perPage)->withQueryString();

        $purchaseOrders->getCollection()->transform(function($po) {
            return [
                'id' => $po->PurchaseOrderKey,
                'purchase_order_no' => $po->company_code . '-PO-' . sprintf('%06d', $po->PurchaseOrderNo),
                'date' => $po->PODate->format('Y-m-d'),
                'supplier_name' => $po->supplier->FstNm ?? 'N/A',
                'branch_name' => $po->branch->name ?? 'N/A',
                'description' => $po->Des,
                'net_amount' => (float) ($po->CostTotal - $po->ToIDscount),
                'status' => $po->Status,
                'details_count' => $po->details_count,
            ];
        });

        $baseQuery = PurchaseOrder::where('company_code', $user->company_code);
        if ($user->role_id === 3) {
            $baseQuery->where('section_code', $user->section_code);
        }

        $stats = [
            'total' => $baseQuery->count(),
            'pending' => (clone $baseQuery)->where('Status', 'Pending')->count(),
            'approved' => (clone $baseQuery)->where('Status', 'Approved')->count(),
            'completed' => (clone $baseQuery)->where('Status', 'Completed')->count(),
            'cancelled' => (clone $baseQuery)->where('Status', 'Cancelled')->count(),
        ];

        return Inertia::render('pos/purchase-orders/index', [
            'purchaseOrders' => $purchaseOrders,
            'stats' => $stats,
            'filters' => $request->only(['search', 'per_page', 'status']),
        ]);
    }

    public function create(Request $request): Response
    {
        $user = Auth::user();

        if (!$user->hasPermission('reports.purchase_orders')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view purchase orders.');
        }

        $suppliers = \App\Models\AccMas::where('AccTyp', 'SUPPLIER')
            ->where('Status', 'A')
            ->where('company_code', $user->company_code)
            ->orderBy('AccNm')
            ->get(['AccKy', 'AccCd as AdrCd', 'AccNm']);

        $products = Product::where('fInAct', false)
            ->where('company_code', $user->company_code)
            ->orderBy('ItmNm')
            ->get(['ItmKy', 'ItemCode', 'ItmNm', 'CosPri', 'item_type']);

        $companies = \App\Models\Company::where('company_code', $user->company_code)->get();
        $sections = \App\Models\Section::where('company_code', $user->company_code)->where('is_active', true)->get();

        $maxPoNo = PurchaseOrder::where('company_code', $user->company_code)->max('PurchaseOrderNo') ?? 0;
        $nextPoNo = $maxPoNo + 1;

        return Inertia::render('pos/purchase-orders/create', [
            'suppliers' => $suppliers,
            'products' => $products,
            'companies' => $companies,
            'branches' => $sections,
            'nextPoNo' => $nextPoNo,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();
        if (!$user->hasPermission('reports.purchase_orders')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to create purchase orders.');
        }

        $validated = $request->validate([
            'company_id' => 'required|integer',
            'branch_id' => 'required|integer',
            'supplier_code' => 'required|string',
            'po_date' => 'required|date',
            'description' => 'nullable|string',
            'item_type' => 'required|string|in:product,printer',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer',
            'items.*.qty' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.tax_rate' => 'nullable|numeric|min:0|max:100',
        ]);

        $section = \App\Models\Section::find($validated['branch_id']);
        $company = \App\Models\Company::find($validated['company_id']);

        try {
            DB::beginTransaction();

            $maxPoNo = PurchaseOrder::where('company_code', $company->company_code)->lockForUpdate()->max('PurchaseOrderNo') ?? 0;
            $purchaseOrderNo = $maxPoNo + 1;
            
            $maxPoKey = PurchaseOrder::lockForUpdate()->max('PurchaseOrderKey') ?? 0;
            $purchaseOrderKey = $maxPoKey + 1;

            $supplier = \App\Models\AccMas::where('AccCd', $validated['supplier_code'])->where('company_code', $company->company_code)->first();

            $vatRate = $company->vat_rate ?? 0;

            // Calculate totals from items using company vat_rate
            $costTotal = 0;
            foreach ($validated['items'] as $item) {
                $unitPrice = $item['unit_price'] ?? 0;
                $qty = $item['qty'];
                $costTotal += $qty * $unitPrice;
            }
            $taxTotal = $costTotal * $vatRate / 100;
            $grandTotal = $costTotal + $taxTotal;

            $po = new PurchaseOrder();
            $po->company_code = $company->company_code;
            $po->section_code = $section->section_code;
            $po->PurchaseOrderKey = $purchaseOrderKey;
            $po->PurchaseOrderNo = $purchaseOrderNo;
            $po->PODate = $validated['po_date'];
            $po->SuppCode = $validated['supplier_code'];
            $po->AccKy = $supplier->AccKy ?? null;
            $po->Des = $validated['description'];
            $po->item_type = $validated['item_type'];
            $po->CostTotal = $costTotal;
            $po->TotalVal = $grandTotal;
            $po->ToIDscount = 0;
            $po->TaxAmount = $taxTotal;
            $po->AddUser = substr($user->username ?? $user->email, 0, 15);
            $po->Status = 'Approved';
            $po->flnact = false;
            $po->save();

            $maxDetKey = PurchaseOrderDetail::max('PurchaseOrderDetKy') ?? 0;

            foreach ($validated['items'] as $index => $item) {
                $unitPrice = $item['unit_price'] ?? 0;
                $qty = $item['qty'];
                $lineTotal = $qty * $unitPrice;

                $det = new PurchaseOrderDetail();
                $det->company_code = $company->company_code;
                $det->section_code = $section->section_code;
                $det->PurchaseOrderDetKy = $maxDetKey + $index + 1;
                $det->PurchaseOrderKey = $purchaseOrderKey;
                $det->iTimKy = $item['product_id'];
                $det->Qty = $qty;
                $det->CostPrice = $unitPrice;
                $det->DiscountRate = $vatRate;
                $det->AmountF = $lineTotal;
                $det->Status = 'A';
                $det->flnAct = false;
                $det->save();
            }

            DB::commit();
            return redirect()->route('pos.purchase-orders.index')->with('success', 'Purchase Order created successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Error creating Purchase Order: ' . $e->getMessage());
        }
    }

    public function show($id): Response
    {
        $user = Auth::user();

        if (!$user->hasPermission('reports.purchase_orders')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view purchase orders.');
        }
        $purchaseOrder = PurchaseOrder::with(['supplier', 'section', 'details.product'])
            ->where('company_code', $user->company_code)
            ->where('PurchaseOrderKey', $id)
            ->firstOrFail();

        $company = \App\Models\Company::where('company_code', $purchaseOrder->company_code)->first();
        $vatRate = $company->vat_rate ?? 0;

        $costTotal = 0;
        foreach ($purchaseOrder->details as $det) {
            $costTotal += $det->Qty * ($det->CostPrice ?? 0);
        }
        $taxAmount = $costTotal * $vatRate / 100;
        $grandTotal = $costTotal + $taxAmount;

        $poData = [
            'id' => $purchaseOrder->PurchaseOrderKey,
            'purchase_order_no' => $purchaseOrder->company_code . '-PO-' . sprintf('%06d', $purchaseOrder->PurchaseOrderNo),
            'date' => $purchaseOrder->PODate->format('Y-m-d'),
            'supplier_name' => $purchaseOrder->supplier->FstNm ?? $purchaseOrder->supplier->AccNm ?? 'N/A',
            'supplier_code' => $purchaseOrder->SuppCode,
            'branch_name' => $purchaseOrder->section->name ?? 'N/A',
            'description' => $purchaseOrder->Des,
            'item_type' => $purchaseOrder->item_type,
            'status' => $purchaseOrder->Status,
            'vat_rate' => $vatRate,
            'cost_total' => $costTotal,
            'tax_amount' => $taxAmount,
            'grand_total' => $grandTotal,
            'discount' => 0,
            'items' => $purchaseOrder->details->map(function($det) use ($vatRate) {
                $lineTotal = $det->Qty * ($det->CostPrice ?? 0);
                return [
                    'product_id' => $det->iTimKy,
                    'product_name' => $det->product->ItmNm ?? 'Unknown Product',
                    'qty' => (float) $det->Qty,
                    'unit_price' => (float) $det->CostPrice,
                    'tax_rate' => $vatRate,
                    'line_total' => $lineTotal,
                ];
            })
        ];

        return Inertia::render('pos/purchase-orders/show', [
            'purchaseOrder' => $poData,
        ]);
    }

    public function edit($id): Response
    {
        $user = Auth::user();

        if (!$user->hasPermission('reports.purchase_orders')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view purchase orders.');
        }
        
        $purchaseOrder = PurchaseOrder::with(['details.product'])
            ->where('company_code', $user->company_code)
            ->where('PurchaseOrderKey', $id)
            ->firstOrFail();

        $suppliers = \App\Models\AccMas::where('AccTyp', 'SUPPLIER')
            ->where('Status', 'A')
            ->where('company_code', $user->company_code)
            ->orderBy('AccNm')
            ->get(['AccKy', 'AccCd as AdrCd', 'AccNm']);

        $products = Product::where('fInAct', false)
            ->where('company_code', $user->company_code)
            ->orderBy('ItmNm')
            ->get(['ItmKy', 'ItemCode', 'ItmNm', 'CosPri', 'item_type']);

        $companies = \App\Models\Company::where('company_code', $user->company_code)->get();
        $sections = \App\Models\Section::where('company_code', $user->company_code)->where('is_active', true)->get();

        $poData = [
            'id' => $purchaseOrder->PurchaseOrderKey,
            'purchase_order_no' => $purchaseOrder->company_code . '-PO-' . sprintf('%06d', $purchaseOrder->PurchaseOrderNo),
            'company_id' => \App\Models\Company::where('company_code', $purchaseOrder->company_code)->first()->id ?? '',
            'branch_id' => \App\Models\Section::where('section_code', $purchaseOrder->section_code)->first()->id ?? '',
            'supplier_code' => $purchaseOrder->SuppCode,
            'po_date' => $purchaseOrder->PODate->format('Y-m-d'),
            'description' => $purchaseOrder->Des,
            'item_type' => $purchaseOrder->item_type ?? 'product',
            'status' => $purchaseOrder->Status,
            'items' => $purchaseOrder->details->map(function($det) {
                return [
                    'product_id' => $det->iTimKy,
                    'product_name' => $det->product->ItmNm ?? 'Unknown',
                    'qty' => (float) $det->Qty,
                    'unit_price' => (float) $det->CostPrice,
                    'tax_rate' => (float) $det->DiscountRate,
                ];
            })
        ];

        return Inertia::render('pos/purchase-orders/edit', [
            'purchaseOrder' => $poData,
            'suppliers' => $suppliers,
            'products' => $products,
            'companies' => $companies,
            'branches' => $sections,
        ]);
    }

    public function update(Request $request, $id): RedirectResponse
    {
        $user = Auth::user();

        if (!$user->hasPermission('reports.purchase_orders')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to update purchase orders.');
        }

        $validated = $request->validate([
            'company_id' => 'required|integer',
            'branch_id' => 'required|integer',
            'supplier_code' => 'required|string',
            'po_date' => 'required|date',
            'description' => 'nullable|string',
            'item_type' => 'required|string|in:product,printer',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer',
            'items.*.qty' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.tax_rate' => 'nullable|numeric|min:0|max:100',
        ]);

        $purchaseOrder = PurchaseOrder::where('company_code', $user->company_code)
            ->where('PurchaseOrderKey', $id)
            ->firstOrFail();

        $section = \App\Models\Section::find($validated['branch_id']);
        $company = \App\Models\Company::find($validated['company_id']);

        try {
            DB::beginTransaction();

            $supplier = \App\Models\AccMas::where('AccCd', $validated['supplier_code'])->where('company_code', $company->company_code)->first();

            $vatRate = $company->vat_rate ?? 0;

            // Calculate totals from items using company vat_rate
            $costTotal = 0;
            foreach ($validated['items'] as $item) {
                $unitPrice = $item['unit_price'] ?? 0;
                $qty = $item['qty'];
                $costTotal += $qty * $unitPrice;
            }
            $taxTotal = $costTotal * $vatRate / 100;

            $purchaseOrder->PODate = $validated['po_date'];
            $purchaseOrder->SuppCode = $validated['supplier_code'];
            $purchaseOrder->AccKy = $supplier->AccKy ?? null;
            $purchaseOrder->Des = $validated['description'];
            $purchaseOrder->item_type = $validated['item_type'];
            $purchaseOrder->CostTotal = $costTotal;
            $purchaseOrder->TotalVal = $costTotal + $taxTotal;
            $purchaseOrder->ToIDscount = 0;
            $purchaseOrder->TaxAmount = $taxTotal;
            $purchaseOrder->save();

            // Delete existing details and re-create
            PurchaseOrderDetail::where('PurchaseOrderKey', $id)->delete();

            $maxDetKey = PurchaseOrderDetail::lockForUpdate()->max('PurchaseOrderDetKy') ?? 0;

            foreach ($validated['items'] as $index => $item) {
                $unitPrice = $item['unit_price'] ?? 0;
                $qty = $item['qty'];
                $lineTotal = $qty * $unitPrice;

                $det = new PurchaseOrderDetail();
                $det->company_code = $company->company_code;
                $det->section_code = $section->section_code;
                $det->PurchaseOrderDetKy = $maxDetKey + $index + 1;
                $det->PurchaseOrderKey = $id;
                $det->iTimKy = $item['product_id'];
                $det->Qty = $qty;
                $det->CostPrice = $unitPrice;
                $det->DiscountRate = $vatRate;
                $det->AmountF = $lineTotal;
                $det->Status = 'A';
                $det->flnAct = false;
                $det->save();
            }

            DB::commit();
            return redirect()->route('pos.purchase-orders.show', $id)->with('success', 'Purchase Order updated successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Error updating Purchase Order: ' . $e->getMessage());
        }
    }

    public function downloadPdf($id)
    {
        try {
            $user = Auth::user();

            if (!$user->hasPermission('reports.purchase_orders')) {
                return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view purchase orders.');
            }

            $purchaseOrder = PurchaseOrder::with(['supplier', 'section', 'details.product'])
                ->where('company_code', $user->company_code)
                ->where('PurchaseOrderKey', $id)
                ->firstOrFail();

            // Prepare data for PDF
            $data = [
                'reportTitle' => 'Purchase Order Report',
                'purchaseOrder' => $purchaseOrder,
                'generated_at' => now()->format('d M Y, h:i A'),
                'generated_by' => $user->username,
            ];

            // Generate PDF using DomPDF
            $pdf = Pdf::loadView('reports.purchase-order', $data);
            
            // Set paper size and orientation
            $pdf->setPaper('A4', 'portrait');

            // Generate filename
            $filename = $purchaseOrder->company_code . '-PO-' . sprintf('%06d', $purchaseOrder->PurchaseOrderNo) . '-' . now()->format('Y-m-d') . '.pdf';

            // Return PDF download
            return $pdf->download($filename);
        } catch (\Exception $e) {
            return back()->with('error', 'Failed to generate PDF: ' . $e->getMessage());
        }
    }
}

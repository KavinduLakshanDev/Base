<?php

namespace App\Http\Controllers\POS;

use App\Http\Controllers\Controller;
use App\Models\Purchase;
use App\Models\PurchaseDet;
use App\Models\Address;
use App\Models\Product;
use App\Models\ItemPriceDet;
use App\Models\ItemMaster;
use App\Models\AccMas;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;
use Barryvdh\DomPDF\Facade\Pdf;

class PurchaseController extends Controller
{

    private function userIsSuperAdmin($user): bool
    {
        if (!$user) {
            return false;
        }

        if (method_exists($user, 'isSuperAdmin')) {
            return (bool) $user->isSuperAdmin();
        }

        if (method_exists($user, 'hasRole')) {
            try {
                return (bool) $user->hasRole('super_admin') || (bool) $user->hasRole('admin');
            } catch (\Throwable $e) {
                // ignore and continue fallback checks
            }
        }

        if (property_exists($user, 'role') && !empty($user->role)) {
            $role = strtolower((string)$user->role);
            return in_array($role, ['super_admin', 'superadmin', 'admin', 'administrator']);
        }

        if (isset($user->is_super_admin)) {
            return (bool) $user->is_super_admin;
        }

        return false;
    }

    /**
     * Display a listing of purchases (GRN).
     */
    public function index(Request $request): Response
    {
        $user = Auth::user();

        if (!$user->hasPermission('purchases.view')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view purchases.');
        }
        
        $query = Purchase::with(['supplier', 'section'])
            ->withCount('details')
            ->where('company_code', $user->company_code)
            ->where('type', '!=', 'adjustment');

        // Filter by section for branch admins
        if ($user->role_id === 3) { // Branch Admin
            $query->where('section_code', $user->section_code);
        }

        // Apply search filter
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function($q) use ($search) {
                // Search in purchase number (both formatted and raw)
                $q->where('PurchaseNo', 'LIKE', "%{$search}%")
                  ->orWhere('SuppInvNo', 'LIKE', "%{$search}%")
                  ->orWhere('SuppCode', 'LIKE', "%{$search}%")
                  ->orWhere('Des', 'LIKE', "%{$search}%");

                // Also search for formatted GRN numbers without section (e.g. "C5C5-000123")
                if (preg_match('/^([A-Z0-9]+)-(\d+)$/', $search, $matches)) {
                    $purchaseNo = (int) $matches[2];
                    $q->orWhere('PurchaseNo', $purchaseNo);
                }

                // Search for partial matches like "C5C5-001" -> numbers starting with 001
                if (preg_match('/^([A-Z0-9]+)-(\d*)$/', $search, $matches)) {
                    $partialNo = $matches[2];
                    if (!empty($partialNo)) {
                        $q->orWhereRaw('PurchaseNo LIKE ?', ["{$partialNo}%"]);
                    }
                }
            });
        }

        // Filter by supplier
        if ($request->filled('supplier')) {
            $query->where('SuppCode', $request->supplier);
        }

        // Filter by section
        if ($request->filled('branch')) {
            $query->where('section_code', $request->branch);
        }

        // Filter by status
        if ($request->filled('status')) {
            if ($request->status === 'posted') {
                $query->where('flused', true);
            } elseif ($request->status === 'active') {
                $query->where('flused', false)->where('Status', 'A')->where('flnact', false);
            } elseif ($request->status === 'inactive') {
                $query->where(function($q) {
                    $q->where('flnact', true)->orWhere('Status', 'I');
                });
            }
        }

        // Filter by date range
        // Filter by date range
        if ($request->filled('date_from')) {
            $query->whereDate('GRNDate', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('GRNDate', '<=', $request->date_to);
        }

        // Filter by item type (Product/Printer)
        if ($request->filled('item_type')) {
            $itemType = $request->item_type;
            $query->whereHas('details.product', function($q) use ($itemType) {
                if ($itemType === 'product') {
                    $q->where(function($sub) {
                        $sub->where('item_type', 'product')
                            ->orWhereNull('item_type');
                    });
                } else {
                    $q->where('item_type', $itemType);
                }
            });
        }

        $perPage = $request->input('per_page', 10);
        $purchases = $query->orderBy('created_at', 'desc')
            ->paginate($perPage)
            ->withQueryString();

        // Transform purchases for frontend
        $purchases->getCollection()->transform(function($purchase) {
            return [
                'id' => $purchase->PurchaseKey,
                // remove section_code from displayed number, thread‑safe company‑level format
                'purchase_no' => $purchase->company_code . '-' . sprintf('%06d', $purchase->PurchaseNo),
                'purchase_key' => $purchase->PurchaseKey,
                'date' => $purchase->GRNDate->format('Y-m-d'),
                'supplier_code' => $purchase->SuppCode,
                'supplier_name' => $purchase->supplier->FstNm ?? 'N/A',
                'branch_name' => $purchase->branch->name ?? 'N/A',
                'supplier_invoice_no' => $purchase->SuppInvNo,
                'description' => $purchase->Des,
                'batch_no' => $purchase->batch_no,
                'cost_total' => (float) $purchase->CostTotal,
                'total_value' => (float) $purchase->TotalVal,
                'total_discount' => (float) $purchase->ToIDscount,
                'tax_amount' => (float) $purchase->TaxAmount,
                'net_amount' => (float) ($purchase->CostTotal - $purchase->ToIDscount),
                'grand_total' => (float) ($purchase->CostTotal - $purchase->ToIDscount + $purchase->TaxAmount),
                'status' => $purchase->Status,
                'is_used' => $purchase->flused,
                'is_inactive' => $purchase->flnact,
                'details_count' => $purchase->details_count,
                'can_edit' => true,
                'can_delete' => !$purchase->flused,
                'created_at' => $purchase->created_at->format('Y-m-d H:i:s'),
            ];
        });

        // Get suppliers for filter dropdown
        $suppliers = \App\Models\AccMas::where('AccTyp', 'SUPPLIER')
            ->where('Status', 'A')
            ->where('company_code', $user->company_code);
        
        // Filter by section for branch admins and staff users
        if ($user->role_id === 3 || $user->role_id === 4) { // Branch Admin or Staff User
            $suppliers->where('section_code', $user->section_code);
        }
        
        $suppliers = $suppliers->orderBy('AccNm')
            ->select('AccCd', 'AccNm')
            ->get()
            ->map(function($supplier) {
                return [
                    'code' => $supplier->AccCd,
                    'name' => $supplier->AccNm
                ];
            });

        // Get sections for filter dropdown (only for company admins)
        $sections = collect();
        if ($user->role_id === 2) { // Company Admin
            $sections = \App\Models\Section::where('company_code', $user->company_code)
                ->where('is_active', true)
                ->orderBy('name')
                ->select('section_code', 'name')
                ->get()
                ->map(function($section) {
                    return [
                        'code' => $section->section_code,
                        'name' => $section->name
                    ];
                });
        }

        return Inertia::render('pos/purchases/index', [
            'purchases' => $purchases,
            'suppliers' => $suppliers,
            'sections' => $sections,
            'filters' => $request->only(['search', 'supplier', 'branch', 'status', 'date_from', 'date_to', 'per_page', 'item_type']),
            'download_pdf' => $request->query('download_pdf') === 'true',
            'purchase_id' => $request->query('purchase_id'),
        ]);
    }

    /**
     * Show the form for creating a new purchase.
     */
    public function create(Request $request): Response
    {
        ini_set('memory_limit', '512M');
        ini_set('max_execution_time', '300');
        
        $user = Auth::user();

        if (!$user->hasPermission('purchases.create')) {
             return redirect()->back()->with('error', 'Unauthorized. You do not have permission to create purchases.');
        }

        $type = $request->get('type', 'supplier'); // default to supplier
        
        // Get suppliers with AccKy
        $suppliers = \App\Models\AccMas::where('AccTyp', 'SUPPLIER')
            ->where('Status', 'A')
            ->where('company_code', $user->company_code);
        
        $suppliers = $suppliers->orderBy('AccNm')
            ->get()
            ->map(function($supplier) {
                return [
                    'id' => $supplier->AccKy,
                    'code' => $supplier->AccCd,
                    'name' => $supplier->AccNm,
                    'acc_ky' => $supplier->AccKy,
                    'section_code' => $supplier->section_code,
                    'vat_no' => $supplier->VATNo,
                    'vat_registered' => $supplier->fVATRegistered,
                ];
            });

        // Get purchase types from code_master (TAX = Tax)
        $purchaseTypes = \App\Models\CodeMaster::where('conkey', 'TAX')
            ->when($user && $user->company_code, function($q) use ($user) { return $q->where('company_code', $user->company_code); })
            ->where('is_active', true)
            ->orderBy('concode')
            ->get()
            ->map(function($type) {
                return [
                    'code' => $type->concode,
                    'name' => $type->cname,
                    'description' => $type->description,
                ];
            });

        // Get categories for filtering
        $categories = \App\Models\CodeMaster::where('conkey', 'CAT')
            ->where('is_active', true)
            ->where('company_code', $user->company_code)
            ->orderBy('cname')
            ->get()
            ->map(function($category) {
                return [
                    'id' => $category->catkey,
                    'code' => $category->concode,
                    'name' => $category->cname,
                    'is_printer_category' => (bool) $category->is_printer_category,
                ];
            });

        // Determine business unit for sharing logic
        $businessUnit = 'vismass'; // Default
        if (str_starts_with(strtoupper($user->company_code), 'MAL')) {
            $businessUnit = 'malibo';
        }

        // Get all products from itemmaster with prices from item_price_det and category info
        $query = Product::where('fInAct', false)
            ->where('is_service', false)
            ->with(['itemPriceDet' => function($q) use ($user) {
                $q->where('fInAct', false)
                  ->where('company_code', $user->company_code)
                  ->orderBy('ChangedDate', 'desc');
            }, 'category', 'brand', 'model'])
            ->where(function($q) use ($user, $businessUnit) {
                $q->where('company_code', $user->company_code)
                  ->orWhereJsonContains('available_business_units', $businessUnit);
            })
            ->orderBy('ItmNm');

        // Load all stock data in one query for performance
        $stockData = \App\Models\StockInHand::where('company_code', $user->company_code)
            ->where('section_code', $user->section_code)
            ->selectRaw('ItemKy, SUM(Qty) as total_qty, SUM(FreeQty) as total_free_qty')
            ->groupBy('ItemKy')
            ->get()
            ->keyBy('ItemKy');

        // Debug logging
        Log::info('Purchase Create - User company_code: ' . ($user->company_code ?? 'null'));
        Log::info('Purchase Create - User section_code: ' . ($user->section_code ?? 'null'));
        Log::info('Purchase Create - User is super admin: ' . ($this->userIsSuperAdmin($user) ? 'yes' : 'no'));
        Log::info('Purchase Create - Product query count: ' . $query->count());

        $products = $query->get()
            ->map(function($product) use ($user, $stockData) {
                // Get current stock for this product from preloaded data
                $currentStock = $stockData->get($product->ItmKy);

                return [
                    'id' => $product->ItmKy,
                    'code' => $product->ItemCode,
                    'name' => $product->ItmNm,
                    'barcode' => $product->BarCode,
                    'category_id' => $product->catkey,
                    'category_name' => $product->category ? $product->category->cname : null,
                    'cost_price' => (float) ($product->CosPri > 0 ? $product->CosPri : ($product->itemPriceDet->first()?->CosPri ?? 0)),
                    'normal_cost' => (float) ($product->NCostPrice > 0 ? $product->NCostPrice : ($product->itemPriceDet->first()?->NCostPrice ?? 0)),
                    'retail_price' => (float) ($product->SlsPri > 0 ? $product->SlsPri : ($product->itemPriceDet->first()?->SlsPri ?? 0)),
                    'VehicleSalePrice' => (float) ($product->VehicleSalePrice > 0 ? $product->VehicleSalePrice : ($product->itemPriceDet->first()?->VehicleSalePrice ?? 0)),
                    'current_stock' => (float) (($currentStock?->total_qty ?? 0) + ($currentStock?->total_free_qty ?? 0)),
                    'free_stock' => (float) ($currentStock?->total_free_qty ?? 0),
                    'brand' => $product->brand?->name ?? null,
                    'model' => $product->model?->name ?? null,
                    'serial_number' => null,
                    'warranty' => $product->warranty ?? null,
                    'sup_key' => $product->SupKey ? (int)$product->SupKey : null,
                    'is_service' => (bool)$product->is_service,
                    'cus_discount_rate' => (float) ($product->itemPriceDet->first()?->RtDis1 ?? $product->RtDis1 ?? 0),
                    'cus_discount_type' => $product->itemPriceDet->first()?->RtDisType1 ?? $product->RtDisType1 ?? 'fixed',
                    'RtDisType1' => $product->itemPriceDet->first()?->RtDisType1 ?? $product->RtDisType1 ?? 'fixed',
                    'RtQty1' => (float) ($product->itemPriceDet->first()?->RtQty1 ?? $product->RtQty1 ?? 0),
                    'RtDis1' => (float) ($product->itemPriceDet->first()?->RtDis1 ?? $product->RtDis1 ?? 0),
                    'RtQty2' => (float) ($product->itemPriceDet->first()?->RtQty2 ?? $product->RtQty2 ?? 0),
                    'RtDis2' => (float) ($product->itemPriceDet->first()?->RtDis2 ?? $product->RtDis2 ?? 0),
                    'CredQty1' => (float) ($product->itemPriceDet->first()?->CredQty1 ?? $product->CredQty1 ?? 0),
                    'CredDis1' => (float) ($product->itemPriceDet->first()?->CredDis1 ?? $product->CredDis1 ?? 0),
                    'CredQty2' => (float) ($product->itemPriceDet->first()?->CredQty2 ?? $product->CredQty2 ?? 0),
                    'CredDis2' => (float) ($product->itemPriceDet->first()?->CredDis2 ?? $product->CredDis2 ?? 0),
                ];
            });

        // Get companies and sections for selection
        $companies = collect();
        $sections = collect();
        
        // Super Admin can see all companies and sections
        if ($this->userIsSuperAdmin($user)) {
            $companies = \App\Models\Company::where('is_active', true)
                ->orderBy('name')
                ->get()
                ->map(function($company) {
                    return [
                        'id' => $company->id,
                        'company_code' => $company->company_code,
                        'name' => $company->name,
                    ];
                });
            
            $sections = \App\Models\Section::where('is_active', true)
                ->orderBy('name')
                ->get()
                ->map(function($section) {
                    return [
                        'id' => $section->id,
                        'company_code' => $section->company_code ?? null,
                        'section_code' => $section->section_code,
                        'name' => $section->name,
                        'is_main_stock' => $section->is_main_stock,
                    ];
                });
            } else {
                // Company/Branch users can only see their company and its branches
                if ($user->company_code) {
                    // Get user's company
                    $userCompany = \App\Models\Company::where('company_code', $user->company_code)->first();
                    
                    if ($userCompany) {
                        $companies = collect([
                            [
                                'id' => $userCompany->id,
                                'company_code' => $userCompany->company_code,
                                'name' => $userCompany->name,
                            ]
                        ]);
                        
                        // For GRN creation, show all active sections in the user's company
                        // This allows users to select different sections/branches during GRN entry
                        $sections = \App\Models\Section::where('company_code', $user->company_code)
                            ->where('is_active', true)
                            ->orderBy('name')
                            ->get()
                            ->map(function($section) use ($user) {
                                return [
                                    'id' => $section->id,
                                    'company_code' => $user->company_code,
                                    'section_code' => $section->section_code,
                                    'name' => $section->name,
                                    'is_main_stock' => $section->is_main_stock,
                                ];
                            });
                    }
                }
            }

        // Generate next purchase number and key based on user role
        // For role-based GRN generation:
        // - Super Admin: Can select any company/section
        // - Company Admin: Auto-selected company, can choose section
        // - Branch Admin: Auto-selected company and section
        $previewCompanyCode = null;
        $previewSectionCode = null;
        
        if ($this->userIsSuperAdmin($user)) {
            // Super Admin: Use first available company/section for preview
            $previewCompanyCode = $companies->first()['company_code'] ?? $user->company_code;
            $previewSectionCode = $sections->first()['section_code'] ?? $user->section_code;
        } elseif ($user->role_id === 2) { // Company Admin
            // Company Admin: Use company, first available section for preview
            $previewCompanyCode = $user->company_code;
            $previewSectionCode = $sections->first()['section_code'] ?? $user->section_code;
        } else { // Branch Admin or other roles
            // Branch Admin: Use user's company and section
            $previewCompanyCode = $user->company_code;
            $previewSectionCode = $user->section_code;
        }
        
        // Generate preview purchase number based solely on company (thread‑safe across sections)
        $maxPurchaseNo = Purchase::where('company_code', $previewCompanyCode)
            // note: intentionally no section_code filter so display number is unique within a company
            ->max('PurchaseNo') ?? 0;
        $nextPurchaseNo = $maxPurchaseNo + 1;
        
        $maxPurchaseKey = Purchase::max('PurchaseKey') ?? 0;
        $nextPurchaseKey = $maxPurchaseKey + 1;

        // Create user context for role-based UI behavior
        // Resolve company_id and branch_id from codes or user object
        $actualCompanyId = null;
        $actualBranchId = null;
        
        // Find company ID from companies collection based on user's company_code
        if ($user->company_code) {
            $company = collect($companies)->firstWhere('company_code', $user->company_code);
            if ($company) {
                $actualCompanyId = $company['id'];
            }
        }
        
        // Fallback to user's company_id if not found
        if (!$actualCompanyId && $user->company_id) {
            $actualCompanyId = $user->company_id;
        }
        
        // Find branch/section ID from sections collection based on user's section_code
        if ($user->section_code) {
            $section = collect($sections)->firstWhere('section_code', $user->section_code);
            if ($section) {
                $actualBranchId = $section['id'];
            }
        }
        
        // Fallback to user's branch_id if not found
        if (!$actualBranchId && $user->branch_id) {
            $actualBranchId = $user->branch_id;
        }
        
        $userContext = [
            'company_id' => $actualCompanyId,
            'branch_id' => $actualBranchId,
            'is_super_admin' => $this->userIsSuperAdmin($user),
            'is_company_admin' => $user->role_id === 2, // Company Admin role
            'is_branch_admin' => $user->role_id === 3,  // Branch Admin role
            'is_staff_user' => $user->role_id === 4,    // Staff User role
        ];

        // Fetch unique brands and models for suggestion dropdowns
        $existingBrands = \App\Models\Brand::active()
            ->where('company_code', $user->company_code)
            ->with(['category', 'models' => function($query) use ($user) {
                $query->active()
                    ->where('company_code', $user->company_code)
                    ->select('id', 'name', 'brand_id');
            }])
            ->get()
            ->map(function($brand) {
                return [
                    'id' => $brand->id,
                    'name' => $brand->name,
                    'category_id' => $brand->category_id,
                    'category_code' => $brand->category ? $brand->category->catkey : null,
                    'models' => $brand->models->pluck('name')->toArray(),
                ];
            })
            ->toArray();
            
        $existingModels = \App\Models\ProductModel::active()
            ->where('company_code', $user->company_code)
            ->distinct()
            ->pluck('name')
            ->toArray();

        // Fetch approved purchase orders to allow auto-filling GRN
        $poQuery = \App\Models\PurchaseOrder::where('company_code', $user->company_code)
            ->where('Status', 'Approved');
            
        if ($user->role_id === 3) {
            $poQuery->where('section_code', $user->section_code);
        }
        
        $approvedPurchaseOrders = $poQuery->with(['details'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function($po) {
                return [
                    'id' => $po->PurchaseOrderKey,
                    'purchase_order_no' => $po->formatted_purchase_order_no,
                    'supplier_code' => $po->SuppCode,
                    'item_type' => $po->item_type ?? 'product',
                    'details' => $po->details->map(function($detail) {
                        return [
                            'product_id' => (int)$detail->iTimKy,
                            'qty' => (float)$detail->Qty,
                        ];
                    })
                ];
            });

        return Inertia::render('pos/purchases/create', [
            'suppliers' => $suppliers,
            'products' => $products,
            'categories' => $categories,
            'companies' => $companies,
            'branches' => $sections,
            'approvedPurchaseOrders' => $approvedPurchaseOrders,
            'nextPurchaseNo' => $nextPurchaseNo,
            'previewGrnInfo' => [
                'company_code' => $previewCompanyCode,
                'next_number' => $nextPurchaseNo,
            ],
            'userRole' => $user->role_id,
            'userContext' => $userContext,
            'user' => [
                'company_code' => $user->company_code,
                'branch_code' => $user->section_code, // Frontend expects branch_code but DB has section_code
            ],
            'type' => $type,
            'existingBrands' => $existingBrands,
            'existingModels' => $existingModels,
        ]);
    }

    /**
     * Store a newly created purchase in storage.
     * 
     * Role-based GRN Generation:
     * - Super Admin: Can select any company and branch → GRN generated based on selections
     * - Company Admin: Auto-selected company, can choose branch → GRN based on company + selected branch
     * - Branch Admin: Auto-selected company and branch → GRN generated automatically
     */
    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();

        if (!$user->hasPermission('purchases.create')) {
             return redirect()->back()->with('error', 'Unauthorized. You do not have permission to create purchases.');
        }

        $validated = $request->validate([
            'type' => ['required', 'in:supplier,transfer', 'string'],
            'supplier_code' => ['required_if:type,supplier', 'nullable', 'string', 'max:50'],
            'company_id' => ['required', 'integer'],
            'branch_id' => ['required', 'integer'],
            'from_section' => ['required_if:type,transfer', 'nullable', 'string'],
            'to_section' => ['required_if:type,transfer', 'nullable', 'string'],
            'grn_date' => ['required', 'date'],
            'supplier_invoice_no' => ['required_if:type,supplier', 'nullable', 'string', 'max:25'],
            'description' => ['nullable', 'string', 'max:100'],
            'batch_no' => ['nullable', 'string', 'max:50'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer'],
            'items.*.product_name' => ['nullable', 'string'], // Add product_name validation for new items
            'items.*.qty' => ['required', 'numeric', 'min:0'],
            'items.*.cost_price' => ['required', 'numeric', 'min:0'],
            'items.*.normal_cost' => ['nullable', 'numeric', 'min:0'],
            'items.*.discount_rate' => ['nullable', 'numeric', 'min:0', 'max:999999.99'],
            'items.*.item_discount' => ['nullable', 'numeric', 'min:0', 'max:999999.99'],
            'items.*.discount_type' => ['nullable', 'string', 'in:fixed,percentage'],
            'items.*.RtDisType1' => ['nullable', 'string', 'in:fixed,percentage'],
            'items.*.cus_discount_rate' => ['nullable', 'numeric', 'min:0', 'max:999999.99'],
            'items.*.RtQty1' => ['nullable', 'numeric', 'min:0'],
            'items.*.RtDis1' => ['nullable', 'numeric', 'min:0', 'max:999999.99'],
            'items.*.RtQty2' => ['nullable', 'numeric', 'min:0'],
            'items.*.RtDis2' => ['nullable', 'numeric', 'min:0', 'max:999999.99'],
            'items.*.CredQty1' => ['nullable', 'numeric', 'min:0'],
            'items.*.CredDis1' => ['nullable', 'numeric', 'min:0', 'max:999999.99'],
            'items.*.CredQty2' => ['nullable', 'numeric', 'min:0'],
            'items.*.CredDis2' => ['nullable', 'numeric', 'min:0', 'max:999999.99'],
            'items.*.free_qty' => ['nullable', 'numeric', 'min:0'],
            'items.*.retail_price' => ['nullable', 'numeric', 'min:0'],
            'items.*.VehicleSalePrice' => ['nullable', 'numeric', 'min:0'],
            'items.*.new_cost_price' => ['nullable', 'numeric', 'min:0'],
            'items.*.brand' => ['nullable', 'string'],
            'items.*.model' => ['nullable', 'string'],
            'items.*.serial_number' => ['nullable', 'string'],
            'items.*.warranty' => ['nullable', 'string'],
            'items.*.barcode' => ['nullable', 'string'],
            'items.*.remark' => ['nullable', 'string'],
            'total_amount' => ['required', 'numeric', 'min:0'],
            'total_discount' => ['nullable', 'numeric', 'min:0'],
            'total_payable' => ['required', 'numeric', 'min:0'],
        ]);

        // Get the selected section and company information for authorization
        $selectedSection = \App\Models\Section::find($validated['branch_id']);
        $selectedCompany = \App\Models\Company::find($validated['company_id']);
        
        if (!$selectedSection || !$selectedCompany) {
            return back()->withErrors(['error' => 'Invalid company or section selection']);
        }

        // Role-based authorization checks for GRN generation
        if (!$this->userIsSuperAdmin($user)) {
            // Company Admin can only create purchases for their company
            if ($user->role_id === 2 && $selectedCompany->company_code !== $user->company_code) {
                return back()->withErrors(['company_id' => 'You can only create purchases for your company']);
            }
            // Branch Admin can only create purchases for their company and section
            if ($user->role_id === 3 && 
                ($selectedCompany->company_code !== $user->company_code || $selectedSection->section_code !== $user->section_code)) {
                return back()->withErrors(['branch_id' => 'You can only create purchases for your assigned section']);
            }
        }

        try {
            DB::beginTransaction();

            // Generate keys based on selected company and section (role-based GRN generation)
            // Use lockForUpdate to prevent race conditions during concurrent requests
            $maxPurchaseNo = Purchase::where('company_code', $selectedCompany->company_code)
                // remove section filter so numbering is company‑wide and thread‑safe
                ->lockForUpdate()
                ->max('PurchaseNo') ?? 0;
            $purchaseNo = $maxPurchaseNo + 1;
            
            $maxPurchaseKey = Purchase::lockForUpdate()->max('PurchaseKey') ?? 0;
            $purchaseKey = $maxPurchaseKey + 1;

            // Generate batch_no if not provided
            $batchNo = $validated['batch_no'] ?? \App\Services\NumberGeneratorService::generate(
                $validated['type'] === 'transfer' ? 'TRN' : 'GRN',
                $selectedCompany->company_code,
                $selectedSection->section_code
            );

            $purchase = new Purchase();
            $purchase->company_code = $selectedCompany->company_code;
            $purchase->section_code = $selectedSection->section_code;
            $purchase->PurchaseKey = $purchaseKey;
            $purchase->PurchaseNo = $purchaseNo;
            $purchase->GRNDate = $validated['grn_date'];
            $purchase->type = $validated['type'];

            if ($validated['type'] === 'supplier') {
                // Get supplier AccKy from selected company
                $supplier = Address::where('AdrCd', $validated['supplier_code'])
                    ->where('company_code', $selectedCompany->company_code)
                    ->first();
                
                if (!$supplier) {
                    throw new \Exception("Supplier not found: {$validated['supplier_code']}");
                }
                
                $purchase->SuppCode = $validated['supplier_code'];
                $purchase->AccKy = $supplier->AccKy; // Get AccKy from supplier's account
                $purchase->SuppInvNo = $validated['supplier_invoice_no'] ?? null;
            } else {
                // Transfer
                $purchase->SuppCode = null;
                $purchase->AccKy = null;
                $purchase->SuppInvNo = null;
            }
            $purchase->Des = $validated['description'] ?? null;
            $purchase->batch_no = $batchNo;
            $purchase->barcode = $validated['items'][0]['barcode'] ?? null; // Use first item's barcode as representative
            $purchase->item_name = $validated['items'][0]['product_name'] ?? null; // Use first item's name as representative
            $purchase->CostTotal = $validated['total_amount'];
            $purchase->ToIDscount = $validated['total_discount'] ?? 0;
            $purchase->TotalVal = $purchase->CostTotal - $purchase->ToIDscount; // Calculate from amount and discount
            $purchase->balance_amount = $purchase->TotalVal; // Initialize balance_amount for payments
            $purchase->TaxAmount = 0;
            $purchase->AddUser = substr($user->username ?? $user->email, 0, 15);
            $purchase->Status = 'A';
            $purchase->flnact = false;
            $purchase->flused = false;
            $purchase->save();

            // Create new details
            $maxDetKey = PurchaseDet::max('PerchaseDetKy') ?? 0;
            $createdNewItems = []; // Track newly created items
            
            foreach ($validated['items'] as $index => &$item) {
                $detKey = $maxDetKey + $index + 1;
                
                $qty = $item['qty'];
                $costPrice = $item['cost_price'];
                $discountRate = $item['discount_rate'] ?? 0;
                $itemDiscount = $item['item_discount'] ?? 0; // Use calculated RS amount from frontend
                $freeQty = $item['free_qty'] ?? 0;
                
                $amount = ($costPrice * $qty) - $itemDiscount;
                
                // Handle new items (product_id = 0) for both Main Stock and Printing Section
                $actualProductId = $item['product_id'];
                $hasSerialNumber = !empty($item['serial_number']);
                
                // Check if this is a new product (product_id = 0) but barcode exists
                // If barcode exists in database, use existing product instead of creating new
                if ($item['product_id'] == 0 && isset($item['barcode']) && !empty($item['barcode']) && !$hasSerialNumber) {
                    $existingProduct = Product::where('BarCode', $item['barcode'])
                        ->where('company_code', $selectedCompany->company_code)
                        ->where('fInAct', false)
                        ->first();
                    
                    if ($existingProduct) {
                        // Product exists with this barcode - use existing product_id
                        $actualProductId = $existingProduct->ItmKy;
                        Log::info('Found existing product by barcode', [
                            'barcode' => $item['barcode'],
                            'product_id' => $actualProductId,
                            'product_name' => $existingProduct->ItmNm
                        ]);
                    }
                }
                
                // If item has serial number, use ItemKy=0 (printers don't need itemmaster entries)
                if ($item['product_id'] == 0 && $actualProductId == 0 && $hasSerialNumber) {
                    // Printers only exist in purchase_det and stock_in_hand tables
                    $actualProductId = 0;
                } elseif ($item['product_id'] == 0 && $actualProductId == 0 && !$hasSerialNumber) {
                    // Create new product in itemmaster and item_price_det ONLY for main_stock
                    // Printing section items are tracked in purchase_det directly without master records
                    // Create new product in itemmaster
                    $maxItmKy = Product::max('ItmKy') ?? 0;
                    $newProductId = $maxItmKy + 1;

                    // Generate unique ItemCode
                    $prefix = 'MS';
                    $categoryCode = substr($item['brand'] ?? $prefix, 0, 3); // Use first 3 chars of brand or prefix
                    $timeStamp = now()->format('ymdHis'); // YYMMDDHHMMSS
                    $newItemCode = "{$prefix}-{$categoryCode}-{$timeStamp}";

                    $businessUnit = str_starts_with(strtoupper($selectedCompany->company_code), 'MAL') ? 'malibo' : 'vismass';
                    $newProduct = Product::create([
                        'Status' => 'A',
                        'company_code' => $selectedCompany->company_code,
                        'section_code' => $selectedSection->section_code,
                        'ItemCode' => $newItemCode,
                        'BarCode' => $item['barcode'] ?? null,
                        'batch_no' => $batchNo, // Add batch_no to itemmaster
                        'ItmNm' => $item['product_name'] ?? $item['brand'] ?? 'Unknown Product', // Use product_name if provided, fallback to brand
                        'warranty' => $item['warranty'] ?? null,
                        'CosPri' => $costPrice,
                        'NCostPrice' => $item['normal_cost'] ?? $costPrice,
                        'SlsPri' => $item['retail_price'] ?? 0,
                        'VehicleSalePrice' => $item['extra_price'] ?? 0,
                        'catkey' => 1, // Default category
                        'UnitKy' => 1, // Default unit
                        'ReOrdlLvl' => 0,
                        'RtQty1' => $item['RtQty1'] ?? 0,
                        'RtDis1' => $item['cus_discount_rate'] ?? $item['RtDis1'] ?? 0,
                        'RtDisType1' => $item['cus_discount_type'] ?? 'fixed',
                        'RtQty2' => $item['RtQty2'] ?? 0,
                        'RtDis2' => $item['RtDis2'] ?? 0,
                        'CredQty1' => $item['CredQty1'] ?? 0,
                        'CredDis1' => $item['CredDis1'] ?? 0,
                        'CredQty2' => $item['CredQty2'] ?? 0,
                        'CredDis2' => $item['CredDis2'] ?? 0,
                        'DiscountQty' => 0,
                        'QuntityDiscount' => 0,
                        'available_business_units' => [$businessUnit],
                    ]);

                    // Create corresponding item_price_det record
                    ItemPriceDet::create([
                        'fInAct' => false,
                        'Status' => 'A',
                        'ItmKy' => $newProductId,
                        'batch_no' => $batchNo, // Add batch_no to item_price_det
                        'company_code' => $selectedCompany->company_code,
                        'section_code' => $selectedSection->section_code,
                        'warranty' => $item['warranty'] ?? null,
                        'CosPri' => $costPrice,
                        'NCostPrice' => $item['normal_cost'] ?? $costPrice,
                        'SlsPri' => $item['retail_price'] ?? 0,
                        'VehicleSalePrice' => $item['VehicleSalePrice'] ?? 0,
                        'RtQty1' => $item['RtQty1'] ?? 0,
                        'RtDis1' => $item['cus_discount_rate'] ?? $item['RtDis1'] ?? 0,
                        'RtDisType1' => $item['cus_discount_type'] ?? 'fixed',
                        'RtQty2' => $item['RtQty2'] ?? 0,
                        'RtDis2' => $item['RtDis2'] ?? 0,
                        'CredQty1' => $item['CredQty1'] ?? 0,
                        'CredDis1' => $item['CredDis1'] ?? 0,
                        'CredQty2' => $item['CredQty2'] ?? 0,
                        'CredDis2' => $item['CredDis2'] ?? 0,
                        'DiscountQty' => 0,
                        'QuntityDiscount' => 0,
                        'ChangedDate' => now(),
                        'uuid' => (string) \Illuminate\Support\Str::uuid(),
                    ]);

                    $actualProductId = $newProductId;
                    $createdNewItems[] = $newProductId;
                }
                
                $detail = new PurchaseDet();
                $detail->company_code = $selectedCompany->company_code;
                $detail->section_code = $selectedSection->section_code;
                $detail->batch_no = $batchNo;
                $detail->PerchaseDetKy = $detKey;
                $detail->PurchaseKey = $purchase->PurchaseKey;
                $detail->iTimKy = $actualProductId;
                
                // Serial number is always saved as it is unique to the batch/item
                $detail->serial_number = $item['serial_number'] ?? null;
                
                $detail->Qty = $qty;
                $detail->CostPrice = $costPrice;
                $detail->DiscountRate = $discountRate;
                $detail->discount_type = $item['discount_type'] ?? 'fixed';
                // Save customer discount rate to purchase_det for all items (including batch-wise printers)
                $detail->CusDiscountRate = $item['RtDis1'] ?? $item['cus_discount_rate'] ?? 0;
                $detail->iTimDiscount = $itemDiscount;
                $detail->Free = $freeQty;
                $detail->AmountF = $amount;
                $detail->SalePrice = $item['retail_price'] ?? 0;
                $detail->VehicleSalePrice = $item['VehicleSalePrice'] ?? 0;
                $detail->NormalCost = $item['normal_cost'] ?? $costPrice;
                $detail->NewCostPrice = $item['new_cost_price'] ?? $costPrice;
                $detail->remark = $item['remark'] ?? null;
                $detail->Status = 'A';
                $detail->flnAct = false;
                $detail->save();

                // Create ItemPriceDet record for existing products to maintain batch price history
                if (!in_array($actualProductId, $createdNewItems)) {
                    $currentProduct = Product::where('ItmKy', $actualProductId)
                        ->where('company_code', $selectedCompany->company_code)
                        ->first();
                    
                    if ($currentProduct) {
                        ItemPriceDet::create([
                            'fInAct' => false,
                            'Status' => 'A',
                            'ItmKy' => $actualProductId,
                            'batch_no' => $batchNo,
                            'company_code' => $selectedCompany->company_code,
                            'section_code' => $selectedSection->section_code,
                            'serial_number' => $item['serial_number'] ?? $currentProduct->serial_number ?? null,
                            'warranty' => $item['warranty'] ?? $currentProduct->warranty ?? null,
                            'CosPri' => $costPrice,
                            'NCostPrice' => $item['normal_cost'] ?? $costPrice,
                            'SlsPri' => $item['retail_price'] ?? 0,
                            'VehicleSalePrice' => $item['VehicleSalePrice'] ?? 0,
                            'RtQty1' => $item['RtQty1'] ?? $currentProduct->RtQty1 ?? 0,
                            'RtDis1' => $item['RtDis1'] ?? $currentProduct->RtDis1 ?? 0,
                            'RtDisType1' => $item['RtDisType1'] ?? $currentProduct->RtDisType1 ?? 'fixed',
                            'RtQty2' => $item['RtQty2'] ?? $currentProduct->RtQty2 ?? 0,
                            'RtDis2' => $item['RtDis2'] ?? $currentProduct->RtDis2 ?? 0,
                            'CredQty1' => $item['CredQty1'] ?? $currentProduct->CredQty1 ?? 0,
                            'CredDis1' => $item['CredDis1'] ?? $currentProduct->CredDis1 ?? 0,
                            'CredQty2' => $item['CredQty2'] ?? $currentProduct->CredQty2 ?? 0,
                            'CredDis2' => $item['CredDis2'] ?? $currentProduct->CredDis2 ?? 0,
                            'DiscountQty' => $currentProduct->DiscountQty ?? 0,
                            'QuntityDiscount' => $currentProduct->QuntityDiscount ?? 0,
                            'ChangedDate' => now(),
                            'uuid' => (string) \Illuminate\Support\Str::uuid(),
                        ]);
                    }
                }

                // Update the original item in the array with the actual product ID
                // This ensures that the subsequent stock insertion loop has the correct ID
                $item['product_id'] = $actualProductId;
                
                // Auto-create model in models table if it's a new model
                if (!empty($item['brand']) && !empty($item['model'])) {
                    // Find the brand by name
                    $brand = \App\Models\Brand::where('name', $item['brand'])
                        ->where('company_code', $selectedCompany->company_code)
                        ->where('is_active', true)
                        ->first();
                    
                    if ($brand) {
                        // Check if model already exists for this brand
                        $existingModel = \App\Models\ProductModel::where('name', $item['model'])
                            ->where('brand_id', $brand->id)
                            ->where('company_code', $selectedCompany->company_code)
                            ->first();
                        
                        // If model doesn't exist, create it
                        if (!$existingModel) {
                            // Generate unique code per company (shared across all sections)
                            $models = \App\Models\ProductModel::where('company_code', $selectedCompany->company_code)
                                ->where('code', 'LIKE', 'MDL%')
                                ->pluck('code');

                            $maxNumber = 0;
                            foreach ($models as $existingCode) {
                                if (preg_match('/^MDL(\d+)$/', $existingCode, $matches)) {
                                    $maxNumber = max($maxNumber, (int) $matches[1]);
                                }
                            }

                            // Find next available code (handle concurrent requests)
                            $code = null;
                            $attempts = 0;
                            while ($code === null && $attempts < 100) {
                                $nextNumber = $maxNumber + 1 + $attempts;
                                $testCode = 'MDL' . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);
                                
                                // Check if this code is already taken in this company
                                $exists = \App\Models\ProductModel::where('code', $testCode)
                                    ->where('company_code', $selectedCompany->company_code)
                                    ->exists();
                                
                                if (!$exists) {
                                    $code = $testCode;
                                } else {
                                    $attempts++;
                                }
                            }

                            if ($code === null) {
                                throw new \Exception('Unable to generate unique model code after 100 attempts');
                            }

                            \App\Models\ProductModel::create([
                                'uuid' => (string) \Illuminate\Support\Str::uuid(),
                                'code' => $code,
                                'name' => $item['model'],
                                'brand_id' => $brand->id,
                                'company_code' => $selectedCompany->company_code,
                                'section_code' => $selectedSection->section_code,
                                'is_active' => true,
                            ]);
                            
                            Log::info('Created new model', [
                                'model_name' => $item['model'],
                                'brand_id' => $brand->id,
                                'brand_name' => $brand->name,
                                'code' => $code,
                            ]);
                        }
                    }
                }
            }
            unset($item); // Break the reference with the last element

            // Add new stock entries for new items
            foreach ($validated['items'] as $index => $item) {
                $trnTyp = $validated['type'] === 'transfer' ? 'TRN' : 'GRN';
                
                // Use the product ID that was resolved in the previous loop
                $actualItemKy = $item['product_id'];
                
                $stockData = [
                    'company_code' => $selectedCompany->company_code,
                    'section_code' => $selectedSection->section_code,
                    'owner_company_code' => $selectedCompany->company_code,
                    'RefNo' => $selectedCompany->company_code . '-' . sprintf('%06d', $purchaseNo),
                    'Cky' => $selectedCompany->id,
                    'OrdDate' => $validated['grn_date'],
                    'ItemKy' => $actualItemKy,
                    'Qty' => $item['qty'],
                    'FreeQty' => $item['free_qty'] ?? 0,
                    'TrnTyp' => $trnTyp,
                    'OrdKy' => $purchase->PurchaseKey,
                    'batch_no' => $batchNo,
                    'serial_number' => $item['serial_number'] ?? null,
                ];


                \App\Models\StockInHand::create($stockData);

                // For transfer, create StockTransfer log
                if ($validated['type'] === 'transfer') {
                    \App\Models\StockTransfer::create([
                        'from_section_code' => $validated['from_section'],
                        'to_section_code' => $selectedSection->section_code,
                        'item_id' => $actualItemKy,
                        'quantity' => $item['qty'],
                        'cost_price' => $item['cost_price'],
                        'transfer_date' => $validated['grn_date'],
                        'notes' => 'GRN Transfer',
                        'company_code' => $selectedCompany->company_code,
                    ]);
                }
            }

            /* 
            // NOTE: Disabled as per user request to prevent GRN from updating product master (itemmaster) columns.
            // Update product prices in itemmaster and item_price_det
            $productUpdates = [];
            foreach ($validated['items'] as $item) {
                $productId = $item['product_id'];
                if (!isset($productUpdates[$productId])) {
                    // Check if new_cost_price is provided and different from cost_price
                    $costPriceToUse = isset($item['new_cost_price']) && $item['new_cost_price'] != $item['cost_price']
                        ? $item['new_cost_price']
                        : $item['cost_price'];

                    $productUpdates[$productId] = [
                        'cos_pri' => $costPriceToUse,
                        'n_cost_price' => $item['normal_cost'] ?? $item['cost_price'],
                        'sls_pri' => $item['retail_price'] ?? 0,
                        'VehicleSalePrice' => $item['VehicleSalePrice'] ?? 0,
                        'only_cost_price_changed' => isset($item['new_cost_price']) && $item['new_cost_price'] != $item['cost_price'] &&
                                                   $item['normal_cost'] == $item['cost_price'] &&
                                                   $item['retail_price'] == 0 &&
                                                   $item['VehicleSalePrice'] == 0,
                        'item_data' => $item, // Store item data for ItemPriceDet creation
                    ];
                }
            }

            foreach ($productUpdates as $productId => $prices) {
                // Skip updating if product_id is 0 or less (e.g. main stock serialized entries without a product master)
                // Also skip newly created items since they already have the correct prices
                if ($productId <= 0 || in_array($productId, $createdNewItems)) {
                    continue;
                }

                // Get current product prices
                $currentProduct = Product::where('ItmKy', $productId)
                    ->where('company_code', $user->company_code)
                    ->first();

                if ($currentProduct) {
                    // Only save a price record and update itemmaster when at least one price has changed
                    $hasChanged =
                        $currentProduct->CosPri != $prices['cos_pri'] ||
                        $currentProduct->NCostPrice != $prices['n_cost_price'] ||
                        $currentProduct->SlsPri != $prices['sls_pri'] ||
                        $currentProduct->VehicleSalePrice != $prices['VehicleSalePrice'];

                    if ($hasChanged) {
                        // Get current item_price_det for quantity-discount carry-over
                        $currentPriceDet = ItemPriceDet::where('ItmKy', $productId)
                            ->latest('ChangedDate')
                            ->first();

                        // Insert new row in item_price_det with updated prices
                        ItemPriceDet::create([
                            'fInAct' => false,
                            'Status' => 'A',
                            'ItmKy' => $productId,
                            'company_code' => $selectedCompany->company_code,
                            'section_code' => $selectedSection->section_code,
                            'serial_number' => $prices['item_data']['serial_number'] ?? $currentProduct->serial_number ?? null,
                            'warranty' => $prices['item_data']['warranty'] ?? null,
                            'CosPri' => $prices['cos_pri'],
                            'NCostPrice' => $prices['n_cost_price'],
                            'SlsPri' => $prices['sls_pri'],
                            'VehicleSalePrice' => $prices['VehicleSalePrice'],
                            'RtQty1' => $currentPriceDet->RtQty1 ?? $currentProduct->RtQty1 ?? 0,
                            'RtDis1' => $currentPriceDet->RtDis1 ?? $currentProduct->RtDis1 ?? 0,
                            'RtQty2' => $currentPriceDet->RtQty2 ?? $currentProduct->RtQty2 ?? 0,
                            'RtDis2' => $currentPriceDet->RtDis2 ?? $currentProduct->RtDis2 ?? 0,
                            'DiscountQty' => $currentPriceDet->DiscountQty ?? $currentProduct->DiscountQty ?? 0,
                            'QuntityDiscount' => $currentPriceDet->QuntityDiscount ?? $currentProduct->QuntityDiscount ?? 0,
                            'ChangedDate' => now(),
                            'uuid' => (string) \Illuminate\Support\Str::uuid(),
                        ]);

                        // Update itemmaster - conditionally update only CosPri if only cost price changed
                        if ($prices['only_cost_price_changed']) {
                            Product::where('ItmKy', $productId)
                                ->where('company_code', $selectedCompany->company_code)
                                ->update([
                                    'CosPri' => $prices['cos_pri'],
                                ]);
                        } else {
                            Product::where('ItmKy', $productId)
                                ->where('company_code', $selectedCompany->company_code)
                                ->update([
                                    'CosPri' => $prices['cos_pri'],
                                    'NCostPrice' => $prices['n_cost_price'],
                                    'SlsPri' => $prices['sls_pri'],
                                    'VehicleSalePrice' => $prices['VehicleSalePrice'],
                                ]);
                        }
                    }
                }
            }
            */

            // Update supplier's outstanding balance for supplier purchases
            if ($validated['type'] === 'supplier' && isset($supplier)) {
                $supplierAcc = AccMas::where('AccKy', $supplier->AccKy)->first();
                if ($supplierAcc) {
                    $supplierAcc->increment('CurBal', (float) $purchase->TotalVal); // Atomic increment (liability increase)

                    // Create Accounting Transaction
                    \App\Models\AccTrn::create([
                        'AccKy' => $supplierAcc->AccKy,
                        'TrnDt' => $validated['grn_date'],
                        'TrnNo' => $purchase->company_code . '-' . sprintf('%06d', $purchase->PurchaseNo),
                        'Amt' => -(float) $purchase->TotalVal, // Negative for GRN (liability increase)
                        'VaucherNo' => $validated['supplier_invoice_no'] ?? null,
                        'Dec' => 'GRN - ' . ($validated['description'] ?? 'Supplier Purchase'),
                        'FInAct' => 1,
                        'Status' => 'A',
                        'company_code' => $selectedCompany->company_code,
                        'section_code' => $selectedSection->section_code,
                        'customer_code' => $supplier->AdrCd,
                        'customer_name' => $supplier->FstNm ?? 'N/A',
                    ]);
                }
            }

            DB::commit();

            // Redirect with query parameters to trigger PDF download
            return redirect()
                ->route('pos.purchases.index', [
                    'purchase_id' => $purchaseKey,
                    'download_pdf' => 'true'
                ])
                ->with('success', "Purchase " . $purchase->company_code . '-' . sprintf('%06d', $purchaseNo) . " created successfully!");

        } catch (\Exception $e) {
            DB::rollBack();
            
            return back()
                ->withErrors(['error' => 'Failed to create purchase. ' . $e->getMessage()])
                ->withInput();
        }
    }

    /**
     * Display the specified purchase.
     * Note: View temporarily redirects to index until show page is created
     */
    public function show($id)
    {
        $user = Auth::user();
        
        $purchase = Purchase::with(['supplier', 'section', 'details.product.brand', 'details.product.model'])
            ->where('PurchaseKey', $id)
            ->where('company_code', $user->company_code)
            ->firstOrFail();

        // Fetch associated returns
        $returns = \App\Models\SupplierReturn::where('company_code', $user->company_code)
            ->where('supplier_code', $purchase->SuppCode)
            ->where('supplier_invoice_no', $purchase->SuppInvNo)
            ->get();

        $batchPrices = \App\Models\ItemPriceDet::where('batch_no', $purchase->batch_no)
            ->whereIn('ItmKy', $purchase->details->pluck('iTimKy'))
            ->where('Status', 'A')
            ->get()
            ->keyBy('ItmKy');

        return Inertia::render('pos/purchases/show', [
            'purchase' => [
                'id' => $purchase->PurchaseKey,
                'purchase_no' => $purchase->company_code . '-' . sprintf('%06d', $purchase->PurchaseNo),
                'date' => $purchase->GRNDate->format('Y-m-d'),
                'supplier_code' => $purchase->SuppCode,
                'supplier_name' => $purchase->supplier->FstNm ?? 'N/A',
                'supplier_invoice_no' => $purchase->SuppInvNo,
                'company_code' => $purchase->company_code,
                'branch_code' => $purchase->section_code,
                'branch_name' => $purchase->section->name ?? 'N/A',
                'purchase_type' => $purchase->Purchase_Type,
                'description' => $purchase->Des,
                'batch_no' => $purchase->batch_no,
                'total_amount' => (float) $purchase->TotalVal,
                'total_discount' => (float) $purchase->ToIDscount,
                'total_payable' => (float) $purchase->TotalVal,
                'status' => $purchase->Status,
                'is_used' => (bool) $purchase->flused,
                'is_inactive' => (bool) $purchase->flInActive,
                'created_at' => $purchase->created_at->format('Y-m-d H:i:s'),
                'updated_at' => $purchase->updated_at->format('Y-m-d H:i:s'),
                'can_edit' => true,
                'can_delete' => !$purchase->flused,
                'items' => $purchase->details->map(function($detail) use ($batchPrices) {
                    $productName = $detail->product->ItmNm ?? 'Unknown Product';
                    $batchPrice = $batchPrices->get($detail->iTimKy);
                    
                    return [
                        'id' => $detail->PerchaseDetKy,
                        'product_id' => $detail->iTimKy,
                        'product_code' => $detail->product->ItemCode ?? '',
                        'product_name' => $productName,
                        'qty' => (float) $detail->Qty,
                        'cost_price' => (float) $detail->CostPrice,
                        'brand' => $detail->product->brand->name ?? '',
                        'model' => $detail->product->model->name ?? '',
                        'serial_number' => $detail->serial_number ?? '',
                        'warranty' => $detail->product->warranty ?? '',
                        'item_discount' => (float) $detail->iTimDiscount,
                        'amount' => (float) $detail->AmountF,
                        'free_qty' => (float) ($detail->Free ?? 0),
                        'discount_rate' => (float) ($detail->DiscountRate ?? 0),
                        'cus_discount_rate' => (float) ($detail->CusDiscountRate ?? 0),
                        'retail_price' => (float) ($detail->SalePrice ?? 0),
                        'VehicleSalePrice' => (float) ($detail->VehicleSalePrice ?? 0),
                        'discount_type' => $detail->discount_type ?? 'fixed',
                        'cus_discount_type' => $batchPrice ? $batchPrice->RtDisType1 : 'fixed',
                        'item_type' => $detail->product->item_type ?? 'product',
                    ];
                }),
                'returns' => $returns->map(function($ret) {
                    return [
                        'id' => $ret->id,
                        'date' => $ret->return_date->format('Y-m-d'),
                        'quantity' => (float) $ret->quantity,
                        'return_value' => (float) $ret->return_value,
                        'reason' => $ret->reason,
                        'status' => $ret->status,
                        'serial_number' => $ret->serial_number,
                        'item_key' => $ret->item_key,
                        'purchase_det_key' => $ret->purchase_det_key,
                    ];
                }),
            ]
        ]);
    }

    /**
     * Show the form for editing the specified purchase.
     * Note: View temporarily redirects to index until edit page is created
     */
    public function edit($id)
    {
        ini_set('memory_limit', '512M');
        ini_set('max_execution_time', '300');
        ini_set('memory_limit', '512M');
        ini_set('max_execution_time', '300');

        $user = Auth::user();
        
        $purchase = Purchase::with(['supplier', 'details.product.brand', 'details.product.model'])
            ->where('PurchaseKey', $id)
            ->where('company_code', $user->company_code)
            ->firstOrFail();

        // Check if can edit
        if ($purchase->flused) {
            return redirect()->back()->with('error', 'Cannot edit a posted purchase');
        }

        // Get suppliers
        $suppliers = \App\Models\AccMas::where('AccTyp', 'SUPP')
            ->where('Status', 'A')
            ->where('company_code', $user->company_code);
        
        // Filter by section for branch admins and staff users
        if ($user->role_id === 3 || $user->role_id === 4) { // Branch Admin or Staff User
            $suppliers->where('section_code', $user->section_code);
        }
        
        $suppliers = $suppliers->orderBy('AccNm')
            ->get()
            ->map(function($supplier) {
                return [
                    'id' => $supplier->AccKy,
                    'code' => $supplier->AccCd,
                    'name' => $supplier->AccNm,
                    'acc_ky' => $supplier->AccKy,
                    'section_code' => $supplier->section_code,
                    'vat_no' => $supplier->VATNo,
                    'vat_registered' => $supplier->fVATRegistered,
                ];
            });

        // Get categories for filtering
        $categories = \App\Models\CodeMaster::where('conkey', 'CAT')
            ->where('is_active', true)
            ->where('company_code', $user->company_code)
            ->orderBy('cname')
            ->get()
            ->map(function($category) {
                return [
                    'id' => $category->catkey,
                    'code' => $category->concode,
                    'name' => $category->cname,
                    'is_printer_category' => (bool) $category->is_printer_category,
                ];
            });

        // Get all products from itemmaster with prices from item_price_det and category info
        $query = Product::where('fInAct', false)
            ->where('is_service', false)
            ->whereHas('itemPriceDet', function($q) use ($user) {
                $q->where('fInAct', false)
                    ->where('company_code', $user->company_code);
            })
            ->with(['itemPriceDet' => function($q) use ($user) {
                $q->where('fInAct', false)
                    ->where('company_code', $user->company_code);
            }, 'category', 'brand', 'model'])
            ->where('company_code', $user->company_code)
            ->orderBy('ItmNm');

        // Debug logging
        Log::info('Purchase Edit - User company_code: ' . ($user->company_code ?? 'null'));
        Log::info('Purchase Edit - User section_code: ' . ($user->section_code ?? 'null'));
        Log::info('Purchase Edit - Product query count: ' . $query->count());

        // Load all stock data in one query for performance
        $stockData = \App\Models\StockInHand::where('company_code', $user->company_code)
            ->where('section_code', $user->section_code)
            ->selectRaw('ItemKy, SUM(Qty) as total_qty, SUM(FreeQty) as total_free_qty')
            ->groupBy('ItemKy')
            ->get()
            ->keyBy('ItemKy');

        $products = $query->get()
            ->map(function($product) use ($user, $stockData) {
                // Get current stock for this product from preloaded data
                $currentStock = $stockData->get($product->ItmKy);

                return [
                    'id' => $product->ItmKy,
                    'code' => $product->ItemCode,
                    'name' => $product->ItmNm,
                    'barcode' => $product->BarCode,
                    'category_id' => $product->catkey,
                    'category_name' => $product->category ? $product->category->cname : null,
                    'cost_price' => (float) ($product->itemPriceDet->first()?->CosPri ?? $product->CosPri ?? 0),
                    'normal_cost' => (float) ($product->itemPriceDet->first()?->NCostPrice ?? $product->NCostPrice ?? 0),
                    'retail_price' => (float) ($product->itemPriceDet->first()?->SlsPri ?? $product->SlsPri ?? 0),
                    'VehicleSalePrice' => (float) ($product->itemPriceDet->first()?->VehicleSalePrice ?? $product->VehicleSalePrice ?? 0),
                    'current_stock' => (float) (($currentStock?->total_qty ?? 0) + ($currentStock?->total_free_qty ?? 0)),
                    'free_stock' => (float) ($currentStock?->total_free_qty ?? 0),
                    'brand' => $product->brand?->name ?? null,
                    'model' => $product->model?->name ?? null,
                    'serial_number' => null,
                    'warranty' => $product->warranty ?? null,
                    'is_service' => (bool)$product->is_service,
                ];
            });

        return Inertia::render('pos/purchases/edit', [
            'purchase' => [
                'id' => $purchase->PurchaseKey,
                'purchase_no' => $purchase->company_code . '-' . sprintf('%06d', $purchase->PurchaseNo),
                'supplier_code' => $purchase->SuppCode,
                'supplier_name' => $purchase->supplier->FstNm ?? 'N/A',
                'date' => $purchase->GRNDate->format('Y-m-d'),
                'supplier_invoice_no' => $purchase->SuppInvNo,
                'company_code' => $purchase->company_code,
                'purchase_type' => $purchase->type ?? 'supplier', // Or use Purchase_Type logic
                'description' => $purchase->Des,
                'total_amount' => (float) $purchase->CostTotal,
                'total_discount' => (float) $purchase->ToIDscount,
                'total_payable' => (float) $purchase->TotalVal,
                'status' => $purchase->Status,
                'is_used' => (bool) $purchase->flused,
                'is_inactive' => (bool) $purchase->flnact,
                'created_at' => $purchase->created_at->format('Y-m-d H:i:s'),
                'updated_at' => $purchase->updated_at->format('Y-m-d H:i:s'),
                'items' => $purchase->details->map(function($detail) {
                    return [
                        'id' => $detail->PerchaseDetKy,
                        'product_id' => $detail->iTimKy,
                        'product_code' => $detail->product->ItemCode ?? '',
                        'product_name' => $detail->product->ItmNm ?? 'Unknown Product',
                        'qty' => (float) $detail->Qty,
                        'cost_price' => (float) $detail->CostPrice,
                        'item_discount' => (float) $detail->iTimDiscount,
                        'discount_rate' => (float) $detail->DiscountRate,
                        'cus_discount_rate' => (float) ($detail->CusDiscountRate ?? 0),
                        'free_qty' => (float) $detail->Free,
                        'retail_price' => (float) $detail->SalePrice,
                        'VehicleSalePrice' => (float) $detail->VehicleSalePrice,
                        'new_cost_price' => (float) $detail->NewCostPrice,
                        'normal_cost' => (float) $detail->NormalCost,
                        'brand' => $detail->product->brand->name ?? '',
                        'model' => $detail->product->model->name ?? '',
                        'serial_number' => $detail->serial_number,
                        'warranty' => $detail->product->warranty ?? '',
                        'barcode' => $detail->product->BarCode ?? '',
                    ];
                }),
            ],
            'suppliers' => $suppliers,
            'products' => $products,
            'categories' => $categories,
        ]);
    }

    /**
     * Update the specified purchase in storage.
     */
    public function update(Request $request, $id): RedirectResponse
    {
        $user = Auth::user();

        /** @var Purchase $purchase */
        $purchase = Purchase::where('PurchaseKey', $id)
            ->where('company_code', $user->company_code)
            ->firstOrFail();

        $validated = $request->validate([
            'supplier_invoice_no' => ['nullable', 'string', 'max:25'],
            'description' => ['nullable', 'string', 'max:500'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.id' => ['required', 'integer'],
            'items.*.product_code' => ['nullable', 'string'], // allow changing the code to switch product
            'items.*.product_name' => ['nullable', 'string'],
            'items.*.qty' => ['required', 'numeric', 'min:0'],
            'items.*.cost_price' => ['required', 'numeric', 'min:0'],
            'items.*.item_discount' => ['nullable', 'numeric', 'min:0'],
            'items.*.discount_rate' => ['nullable', 'numeric', 'min:0', 'max:999999.99'],
            'items.*.cus_discount_rate' => ['nullable', 'numeric', 'min:0', 'max:999999.99'],
            'items.*.free_qty' => ['nullable', 'numeric', 'min:0'],
            'items.*.brand' => ['nullable', 'string'],
            'items.*.model' => ['nullable', 'string'],
            'items.*.serial_number' => ['nullable', 'string'],
            'items.*.retail_price' => ['nullable', 'numeric', 'min:0'],
            'items.*.VehicleSalePrice' => ['nullable', 'numeric', 'min:0'],
        ]);

        try {
            DB::beginTransaction();

            $oldTotalVal = $purchase->TotalVal; // Store old total for balance adjustment

            // Update purchase header fields only
            $purchase->SuppInvNo = $validated['supplier_invoice_no'] ?? null;
            $purchase->Des = $validated['description'] ?? null;

            // Calculate new totals
            $totalAmount = 0;
            $totalDiscount = 0;

            // Recalculate totals from items
            foreach ($validated['items'] as $index => $item) {
                $qty = $item['qty'];
                $costPrice = $item['cost_price'];
                $discountRate = $item['discount_rate'] ?? 0;
                $discountType = $item['discount_type'] ?? 'fixed';
                
                if ($discountType === 'percentage') {
                    $itemDiscount = ($qty * $costPrice * $discountRate) / 100;
                } else {
                    $itemDiscount = $discountRate;
                }
                
                $totalAmount += ($qty * $costPrice);
                $totalDiscount += $itemDiscount;

                // Store calculated discount for detail update
                $validated['items'][$index]['calculated_discount'] = $itemDiscount;
            }

            $purchase->CostTotal = $totalAmount;
            $purchase->TotalVal = $totalAmount - $totalDiscount;
            $purchase->ToIDscount = $totalDiscount;
            
            // Adjust balance_amount based on the change in total
            $totalChange = $purchase->TotalVal - $oldTotalVal;
            $purchase->balance_amount += $totalChange;
            
            $purchase->save();

            // Adjust supplier balance for total change
            if ($purchase->type === 'supplier' && $purchase->AccKy) {
                $supplierAcc = AccMas::where('AccKy', $purchase->AccKy)->first();
                if ($supplierAcc) {
                    $supplierAcc->increment('CurBal', (float) $totalChange); // Atomic adjustment
                }
            }

            // Update details
            foreach ($validated['items'] as $item) {
                $detail = PurchaseDet::find($item['id']);
                
                if ($detail) {
                    // if product code changed, attempt to resolve new product id
                    // for printer rows we ignore the product_code field because that input
                    // is actually used to edit the serial number and should not be saved
                    // as a barcode override.  the serial is handled separately below.
                    if (!empty($item['product_code']) &&
                        empty($detail->serial_number)) {
                        $newProd = Product::where('ItemCode', $item['product_code'])->first();
                        if ($newProd) {
                            $detail->iTimKy = $newProd->ItmKy;
                        }
                    }

                    // if this is a printer row and the serial has been edited, clear any
                    // leftover barcode value so we don't accidentally keep the old serial
                    // (barcode column removed as it does not exist)

                    // No brand/model/warranty/item_name writes to purchase_det as per normalization

                    // Serial number is always saved as it is unique to the batch/item
                    if (isset($item['serial_number'])) {
                        $detail->serial_number = $item['serial_number'];
                    }

                    $detail->Qty = $item['qty'];
                    $detail->CostPrice = $item['cost_price'];
                    $detail->DiscountRate = $item['discount_rate'] ?? 0;
                    $detail->discount_type = $item['discount_type'] ?? 'fixed';
                    $detail->iTimDiscount = $item['calculated_discount'] ?? 0;
                    $detail->AmountF = ($item['qty'] * $item['cost_price']) - ($item['calculated_discount'] ?? 0);
                    $detail->CusDiscountRate = $item['cus_discount_rate'] ?? 0;
                    $detail->Free = $item['free_qty'] ?? 0;
                    $detail->SalePrice = $item['retail_price'] ?? 0;
                    $detail->VehicleSalePrice = $item['VehicleSalePrice'] ?? 0;
                    $detail->save();
                }
            }

            // Sync Stock In Hand: Delete all and recreate to ensure consistency (handle duplicates, etc)
            // Get Company ID
            $companyId = \App\Models\Company::where('company_code', $purchase->company_code)->value('id');
            
            // Delete existing stock entries for this purchase
            \App\Models\StockInHand::where('OrdKy', $purchase->PurchaseKey)
                ->where('company_code', $purchase->company_code)
                ->where('section_code', $purchase->section_code)
                ->delete();

            // Determine TrnTyp
            $trnTyp = $purchase->type === 'transfer' ? 'TRN' : 'GRN';

            // Recreate stock entries from refreshed details
            $purchase->refresh();
            foreach ($purchase->details as $detail) {
                // Ensure active items only? purchase_det flnAct should match purchase flnAct usually
                if ($detail->Status == 'A') {
                   \App\Models\StockInHand::create([
                       'company_code' => $purchase->company_code,
                       'owner_company_code' => $purchase->company_code, // Set owner to purchasing company
                       'section_code' => $purchase->section_code,
                       'RefNo' => $purchase->company_code . '-' . sprintf('%06d', $purchase->PurchaseNo),
                       'Cky' => $companyId,
                       'OrdDate' => $purchase->GRNDate,
                       'ItemKy' => $detail->iTimKy,
                       'Qty' => $detail->Qty,
                       'FreeQty' => $detail->Free,
                       'TrnTyp' => $trnTyp,
                       'OrdKy' => $purchase->PurchaseKey,
                       'batch_no' => $purchase->batch_no,
                       'serial_number' => $detail->serial_number,
                   ]); 
                }
            }

            DB::commit();

            return redirect()
                ->route('pos.purchases.show', $id)
                ->with('success', 'Purchase updated successfully with stock synchronization.');

        } catch (\Exception $e) {
            DB::rollBack();
            
            return back()
                ->withErrors(['error' => 'Failed to update purchase. ' . $e->getMessage()])
                ->withInput();
        }
    }

    /**
     * Remove the specified purchase from storage.
     */
    /**
     * Remove the specified purchase from storage.
     */
    public function destroy($id): RedirectResponse
    {
        $user = Auth::user();

        $purchase = Purchase::where('PurchaseKey', $id)
            ->where('company_code', $user->company_code)
            ->firstOrFail();

        // Only super admins can delete purchases
        if ($user->user_type !== 'super_admin') {
            return back()->withErrors(['error' => 'Unauthorized. Only super admins can delete purchases.']);
        }

        // Check if can delete
        if ($purchase->flused) {
            return back()->withErrors(['error' => 'Cannot delete a posted purchase']);
        }

        try {
            DB::beginTransaction();

            // 1. Remove stock entries that were created by this GRN
            // Note: TrnTyp is stored as 'GRN' or 'TRN' (for transfers), not 'PURCHASE'
            \App\Models\StockInHand::where('OrdKy', $purchase->PurchaseKey)
                ->where('company_code', $purchase->company_code)
                ->where('section_code', $purchase->section_code)
                ->whereIn('TrnTyp', ['GRN', 'TRN', 'PURCHASE']) // Cover all potential types
                ->delete();

            // 2. Delete details
            PurchaseDet::where('PurchaseKey', $purchase->PurchaseKey)->delete();
            
            // 3. Reverse supplier balance for supplier purchases
            if ($purchase->type === 'supplier' && $purchase->AccKy) {
                $supplierAcc = AccMas::where('AccKy', $purchase->AccKy)->first();
                if ($supplierAcc) {
                    $supplierAcc->decrement('CurBal', (float) $purchase->TotalVal); // Atomic decrement (liability reversal)
                }
            }
            
            // 4. Delete master
            $purchase->delete();

            DB::commit();

            return redirect()
                ->route('pos.purchases.index')
                ->with('success', 'Purchase deleted successfully! Stock reversed.');

        } catch (\Exception $e) {
            DB::rollBack();
            
            return back()->withErrors(['error' => 'Failed to delete purchase. ' . $e->getMessage()]);
        }
    }

    /**
     * Cancel (soft-cancel) the specified purchase.
     * This will: delete stock_in_hand records created by this GRN and mark the purchase/details inactive.
     */
    public function cancel(Request $request, $id): RedirectResponse
    {
        $user = Auth::user();

        $purchase = Purchase::where('PurchaseKey', $id)
            ->where('company_code', $user->company_code)
            ->firstOrFail();

        // Do not allow cancelling a posted purchase
        if ($purchase->flused) {
            return back()->withErrors(['error' => 'Cannot cancel a posted purchase']);
        }

        try {
            DB::beginTransaction();

            // Remove stock entries that were created by this GRN
            \App\Models\StockInHand::where('OrdKy', $purchase->PurchaseKey)
                ->where('company_code', $user->company_code)
                ->where('section_code', $user->section_code)
                ->where('TrnTyp', 'PURCHASE')
                ->delete();

            // Reverse supplier balance for supplier purchases
            if ($purchase->type === 'supplier' && $purchase->AccKy) {
                $supplierAcc = AccMas::where('AccKy', $purchase->AccKy)->first();
                if ($supplierAcc) {
                    $supplierAcc->decrement('CurBal', (float) $purchase->TotalVal); // Atomic decrement (liability reversal)
                }
            }

            // Mark purchase details inactive
            PurchaseDet::where('PurchaseKey', $purchase->PurchaseKey)
                ->update([
                    'Status' => 'I',
                    'flnAct' => true,
                ]);

            // Mark purchase master inactive
            $purchase->Status = 'I';
            $purchase->flnact = true;
            $purchase->save();

            DB::commit();

            return redirect()
                ->route('pos.purchases.index')
                ->with('success', "Purchase cancelled successfully!");

        } catch (\Exception $e) {
            DB::rollBack();
            return back()->withErrors(['error' => 'Failed to cancel purchase. ' . $e->getMessage()]);
        }
    }

    /**
     * Generate PDF for filtered purchases (bulk report).
     */
    public function downloadBulkPdf(Request $request)
    {
        try {
            $user = Auth::user();

            // Build the same query as the index method
            $query = Purchase::with(['supplier', 'details'])
                ->where('company_code', $user->company_code);

            // Apply search filter
            if ($request->filled('search')) {
                $search = $request->input('search');
                $query->where(function($q) use ($search) {
                    // Search in purchase number (both formatted and raw)
                    $q->where('PurchaseNo', 'LIKE', "%{$search}%")
                      ->orWhere('SuppInvNo', 'LIKE', "%{$search}%")
                      ->orWhere('SuppCode', 'LIKE', "%{$search}%")
                      ->orWhere('Des', 'LIKE', "%{$search}%");

                    // Also search for formatted GRN numbers without section (e.g., "C5C5-000123")
                    if (preg_match('/^([A-Z0-9]+)-(\d+)$/', $search, $matches)) {
                        $purchaseNo = (int) $matches[2];
                        $q->orWhere('PurchaseNo', $purchaseNo);
                    }

                    // Search for partial GRN matches by numeric prefix
                    if (preg_match('/^([A-Z0-9]+)-(\d*)$/', $search, $matches)) {
                        $partialNo = $matches[2];
                        if (!empty($partialNo)) {
                            $q->orWhereRaw('PurchaseNo LIKE ?', ["{$partialNo}%"]);
                        }
                    }
                });
            }

            // Filter by supplier
            if ($request->filled('supplier')) {
                $query->where('SuppCode', $request->supplier);
            }

            // Filter by status
            if ($request->filled('status')) {
                if ($request->status === 'posted') {
                    $query->where('flused', true);
                } elseif ($request->status === 'active') {
                    $query->where('flused', false)->where('Status', 'A')->where('flnact', false);
                } elseif ($request->status === 'inactive') {
                    $query->where(function($q) {
                        $q->where('flnact', true)->orWhere('Status', 'I');
                    });
                }
            }

            // Filter by date range
            if ($request->filled('date_from')) {
                $query->whereDate('GRNDate', '>=', $request->date_from);
            }

            if ($request->filled('date_to')) {
                $query->whereDate('GRNDate', '<=', $request->date_to);
            }

            // Get all purchases (not paginated) for PDF
            $purchases = $query->latest('GRNDate')->get();

            // Load relationships for PDF
            $purchases->load(['supplier', 'details.product', 'company', 'branch']);

            // Group purchases by date for better organization
            $groupedPurchases = $purchases->groupBy(function($purchase) {
                return $purchase->GRNDate->format('Y-m-d');
            });

            // Separate active and inactive purchases
            $activePurchases = $purchases->where('flnact', false);
            $inactivePurchases = $purchases->where('flnact', true);

            // Prepare data for PDF
            $data = [
                'purchases' => $purchases,
                'groupedPurchases' => $groupedPurchases,
                'activePurchases' => $activePurchases,
                'inactivePurchases' => $inactivePurchases,
                'filters' => [
                    'search' => $request->input('search'),
                    'supplier' => $request->input('supplier'),
                    'status' => $request->input('status'),
                    'date_from' => $request->input('date_from'),
                    'date_to' => $request->input('date_to'),
                ],
                'generated_at' => now()->format('d M Y, h:i A'),
                'generated_by' => $user->username,
                'total_purchases' => $purchases->count(),
                'total_value' => $purchases->sum('TotalVal'),
                'active_count' => $activePurchases->count(),
                'inactive_count' => $inactivePurchases->count(),
            ];

            // Generate PDF using DomPDF
            $pdf = Pdf::loadView('reports.purchase_bulk', $data);
            
            // Set paper size and orientation
            $pdf->setPaper('A4', 'landscape');

            // Generate filename with date range
            $dateRange = '';
            if ($request->filled('date_from') && $request->filled('date_to')) {
                $dateRange = $request->date_from . '_to_' . $request->date_to;
            } elseif ($request->filled('date_from')) {
                $dateRange = 'from_' . $request->date_from;
            } elseif ($request->filled('date_to')) {
                $dateRange = 'to_' . $request->date_to;
            }

            $filename = 'Purchase_Report_' . ($dateRange ?: now()->format('Y-m-d')) . '.pdf';

            // Return PDF download
            return $pdf->download($filename);
        } catch (\Exception $e) {
            return back()->with('error', 'Failed to generate PDF: ' . $e->getMessage());
        }
    }

    /**
     * Get products with stock information for a specific branch.
     * Used when branch selection changes in purchase create form.
     */
    public function getProductsByBranch(Request $request)
    {
        $request->validate([
            'company_id' => 'required|integer',
            'branch_id' => 'required|integer',
        ]);

        $user = Auth::user();
        
        // Get company and section information
        $company = \App\Models\Company::find($request->company_id);
        $section = \App\Models\Section::find($request->branch_id);
        
        if (!$company || !$section) {
            return response()->json(['error' => 'Invalid company or section'], 404);
        }

        // Determine business unit for sharing logic
        $businessUnit = 'vismass'; // Default
        if (str_starts_with(strtoupper($company->company_code), 'MAL')) {
            $businessUnit = 'malibo';
        }

        // Get all products from itemmaster with prices from item_price_det and category info
        $query = Product::where('fInAct', false)
            ->where('is_service', false)
            ->with(['itemPriceDet' => function($q) use ($company) {
                $q->where('fInAct', false)
                  ->where('company_code', $company->company_code);
            }, 'category', 'brand', 'model'])
            ->where(function($q) use ($company, $businessUnit) {
                $q->where('company_code', $company->company_code)
                  ->orWhereJsonContains('available_business_units', $businessUnit);
            })
            ->orderBy('ItmNm');

        $products = $query->get();
        
        $productIds = $products->pluck('ItmKy')->toArray();
        $lastGrnDetails = \App\Models\PurchaseDet::whereIn('iTimKy', $productIds)
            ->where('company_code', $company->company_code)
            ->orderBy('created_at', 'desc')
            ->get()
            ->groupBy('iTimKy')
            ->map(function ($items) {
                return $items->first();
            });

        $mappedProducts = $products->map(function($product) use ($company, $section, $lastGrnDetails) {
                // Get current stock for this product in the specific section
                $currentStock = \App\Models\StockInHand::where('ItemKy', $product->ItmKy)
                    ->where('company_code', $company->company_code)
                    ->where('section_code', $section->section_code)
                    ->when(str_starts_with($company->company_code, 'VIS'), function($q) {
                        return $q->where(function($subQ) {
                            $subQ->whereNull('batch_no')
                                 ->orWhere('batch_no', '')
                                 ->orWhere('batch_no', 'not like', 'GRN-VIS-VIS-%')
                                 ->orWhere('batch_no', '>=', 'GRN-VIS-VIS-0026');
                        });
                    })
                    ->selectRaw('SUM(Qty) as total_qty, SUM(FreeQty) as total_free_qty')
                    ->first();
                
                $lastGrnDetail = $lastGrnDetails->get($product->ItmKy);

                return [
                    'id' => $product->ItmKy,
                    'code' => $product->ItemCode,
                    'name' => $product->ItmNm,
                    'barcode' => $product->BarCode,
                    'category_id' => $product->catkey,
                    'category_name' => $product->category ? $product->category->cname : null,
                    'cost_price' => (float) ($product->itemPriceDet->first()?->CosPri ?? $product->CosPri ?? 0),
                    'normal_cost' => (float) ($product->itemPriceDet->first()?->NCostPrice ?? $product->NCostPrice ?? 0),
                    'retail_price' => (float) ($product->itemPriceDet->first()?->SlsPri ?? $product->SlsPri ?? 0),
                    'VehicleSalePrice' => (float) ($product->itemPriceDet->first()?->VehicleSalePrice ?? $product->VehicleSalePrice ?? 0),
                    'current_stock' => (float) (($currentStock?->total_qty ?? 0) + ($currentStock?->total_free_qty ?? 0)),
                    'free_stock' => (float) ($currentStock?->total_free_qty ?? 0),
                    'brand' => $product->brand?->name ?? null,
                    'model' => $product->model?->name ?? null,
                    'serial_number' => null,
                    'warranty' => $product->warranty ?? null,
                    'sup_key' => $product->SupKey ? (int)$product->SupKey : null,
                    'item_type' => $product->item_type ?? 'product',
                    'is_service' => (bool)$product->is_service,
                    'cus_discount_rate' => (float) ($product->itemPriceDet->first()?->RtDis1 ?? $product->RtDis1 ?? 0),
                    'last_grn_cost' => $lastGrnDetail ? (float)$lastGrnDetail->CostPrice : null,
                    'last_grn_retail' => $lastGrnDetail ? (float)$lastGrnDetail->SalePrice : null,
                    'last_grn_wholesale' => $lastGrnDetail ? (float)$lastGrnDetail->WholePrice : null,
                    'last_grn_vehicle_sale' => $lastGrnDetail ? (float)$lastGrnDetail->VehicleSalePrice : null,
                    'cus_discount_type' => $product->itemPriceDet->first()?->RtDisType1 ?? $product->RtDisType1 ?? 'fixed',
                    'RtDisType1' => $product->itemPriceDet->first()?->RtDisType1 ?? $product->RtDisType1 ?? 'fixed',
                    'RtQty1' => (float) ($product->itemPriceDet->first()?->RtQty1 ?? $product->RtQty1 ?? 0),
                    'RtDis1' => (float) ($product->itemPriceDet->first()?->RtDis1 ?? $product->RtDis1 ?? 0),
                    'RtQty2' => (float) ($product->itemPriceDet->first()?->RtQty2 ?? $product->RtQty2 ?? 0),
                    'RtDis2' => (float) ($product->itemPriceDet->first()?->RtDis2 ?? $product->RtDis2 ?? 0),
                    'CredQty1' => (float) ($product->itemPriceDet->first()?->CredQty1 ?? $product->CredQty1 ?? 0),
                    'CredDis1' => (float) ($product->itemPriceDet->first()?->CredDis1 ?? $product->CredDis1 ?? 0),
                    'CredQty2' => (float) ($product->itemPriceDet->first()?->CredQty2 ?? $product->CredQty2 ?? 0),
                    'CredDis2' => (float) ($product->itemPriceDet->first()?->CredDis2 ?? $product->CredDis2 ?? 0),
                ];
            });

        return response()->json([
            'products' => $mappedProducts,
            'company' => [
                'id' => $company->id,
                'name' => $company->name,
                'code' => $company->company_code,
            ],
            'section' => [
                'id' => $section->id,
                'name' => $section->name,
                'code' => $section->section_code,
            ],
        ]);
    }

    /**
     * Search product by barcode.
     * Returns existing product details if barcode is found, null otherwise.
     */
    public function searchByBarcode(Request $request)
    {
        $request->validate([
            'barcode' => 'required|string',
            'company_id' => 'required|integer',
        ]);

        $user = Auth::user();
        $company = \App\Models\Company::find($request->company_id);
        
        if (!$company) {
            return response()->json(['error' => 'Invalid company'], 404);
        }

        // Determine business unit for sharing logic
        $businessUnit = 'vismass'; // Default
        if (str_starts_with(strtoupper($company->company_code), 'MAL')) {
            $businessUnit = 'malibo';
        }

        // Search for product by barcode in the company (including shared items)
        $product = Product::where('BarCode', $request->barcode)
            ->where('fInAct', false)
            ->where('is_service', false)
            ->where(function($q) use ($company, $businessUnit) {
                $q->where('company_code', $company->company_code)
                  ->orWhereJsonContains('available_business_units', $businessUnit);
            })
            ->with(['itemPriceDet' => function($q) use ($company) {
                $q->where('company_code', $company->company_code)
                  ->where('fInAct', false)
                  ->latest('ChangedDate')
                  ->limit(1);
            }, 'category'])
            ->first();

        if (!$product) {
            // Check in purchase_det if not found in itemmaster (for Printing Section items)
            $purchaseDetail = DB::table('purchase_det as pd')
                ->leftJoin('itemmaster as im', 'pd.iTimKy', '=', 'im.ItmKy')
                ->leftJoin('brands as b', 'im.brand_id', '=', 'b.id')
                ->leftJoin('models as m', 'im.models_id', '=', 'm.id')
                ->where('pd.serial_number', $request->barcode) // For printers, serial is often used as barcode
                ->where('pd.company_code', $company->company_code)
                ->where('pd.Status', '!=', 'I') // Exclude inactive/cancelled items
                ->select(
                    'pd.*',
                    'b.name as brand',
                    'm.name as model',
                    'im.warranty as item_warranty',
                    'im.ItmNm as item_name'
                )
                ->latest('pd.PerchaseDetKy')
                ->first();

            if ($purchaseDetail) {
                 return response()->json([
                    'found' => true,
                    'product' => [
                        'id' => $purchaseDetail->iTimKy ?? 0,
                        'code' => '', // No item code for non-master items
                        'name' => $purchaseDetail->item_name,
                        'barcode' => $purchaseDetail->serial_number, // Use serial as barcode for printers
                        'category_id' => null, // Cannot determine category easily without master
                        'category_name' => null,
                        'brand' => $purchaseDetail->brand ?? '',
                        'model' => $purchaseDetail->model ?? '',
                        'serial_number' => $purchaseDetail->serial_number ?? '',
                        'cost_price' => (float) $purchaseDetail->CostPrice,
                        'normal_cost' => (float) $purchaseDetail->NormalCost,
                        'retail_price' => (float) $purchaseDetail->SalePrice,
                        'VehicleSalePrice' => (float) $purchaseDetail->VehicleSalePrice,
                        'warranty' => $purchaseDetail->item_warranty ?? '',
                        'current_stock' => 0, // Default to 0 for historical items if not in master
                        'cus_discount_rate' => (float) ($purchaseDetail->CusDiscountRate ?? 0),
                        'cus_discount_type' => 'fixed',
                        'RtQty1' => 0,
                        'RtDis1' => 0,
                        'RtQty2' => 0,
                        'RtDis2' => 0,
                        'CredQty1' => 0,
                        'CredDis1' => 0,
                        'CredQty2' => 0,
                        'CredDis2' => 0,
                    ],
                    'message' => 'Product found in history! loaded from previous purchase.',
                ]);
            }

            return response()->json([
                'found' => false,
                'message' => 'Product not found. You can create a new product with this barcode.',
            ]);
        }

        // Get the latest price details
        $priceDetails = $product->itemPriceDet->first();
        
        // Get the latest purchase details for metadata fallback (brand/model)
        $purchaseDetail = DB::table('purchase_det as pd')
            ->leftJoin('itemmaster as im', 'pd.iTimKy', '=', 'im.ItmKy')
            ->leftJoin('brands as b', 'im.brand_id', '=', 'b.id')
            ->leftJoin('models as m', 'im.models_id', '=', 'm.id')
            ->where('pd.iTimKy', $product->ItmKy)
            ->where('pd.company_code', $company->company_code)
            ->select('b.name as brand', 'm.name as model')
            ->latest('pd.PerchaseDetKy')
            ->first();
        
        // Get category ID from the loaded category relationship
        $categoryId = $product->category ? $product->category->concode : null;
        
        // Log for debugging
        Log::info('Barcode Search Category Debug', [
            'product_catkey' => $product->catkey,
            'category_object' => $product->category ? [
                'id' => $product->category->id,
                'catkey' => $product->category->catkey,
                'concode' => $product->category->concode,
                'cname' => $product->category->cname,
            ] : null,
            'final_category_id' => $categoryId
        ]);

        return response()->json([
            'found' => true,
            'product' => [
                'id' => $product->ItmKy,
                'code' => $product->ItemCode,
                'name' => $product->ItmNm,
                'barcode' => $product->BarCode,
                'category_id' => $product->catkey,
                'category_name' => $product->category ? $product->category->cname : null,
                'brand' => $purchaseDetail?->brand ?? $product->brand ?? '',
                'model' => $purchaseDetail?->model ?? $product->model ?? '',
                'serial_number' => $purchaseDetail?->serial_number ?? $product->serial_number ?? '',
                'cost_price' => (float) ($priceDetails?->CosPri ?? $product->CosPri ?? 0),
                'normal_cost' => (float) ($priceDetails?->NCostPrice ?? $product->NCostPrice ?? 0),
                'retail_price' => (float) ($priceDetails?->SlsPri ?? $product->SlsPri ?? 0),
                'VehicleSalePrice' => (float) ($priceDetails?->VehicleSalePrice ?? $product->VehicleSalePrice ?? 0),
                'warranty' => $purchaseDetail?->warranty ?? $priceDetails?->warranty ?? $product->warranty ?? '',
                'item_type' => $product->item_type ?? 'product',
                'current_stock' => (float) \App\Models\StockInHand::where('ItemKy', $product->ItmKy)
                    ->where('company_code', $company->company_code)
                    ->selectRaw('SUM(Qty + COALESCE(FreeQty, 0)) as total')
                    ->value('total') ?? 0,
                'cus_discount_rate' => (float) ($priceDetails?->RtDis1 ?? $product->RtDis1 ?? 0),
                'cus_discount_type' => $priceDetails?->RtDisType1 ?? $product->RtDisType1 ?? 'fixed',
                'RtQty1' => (float) ($priceDetails?->RtQty1 ?? $product->RtQty1 ?? 0),
                'RtDis1' => (float) ($priceDetails?->RtDis1 ?? $product->RtDis1 ?? 0),
                'RtQty2' => (float) ($priceDetails?->RtQty2 ?? $product->RtQty2 ?? 0),
                'RtDis2' => (float) ($priceDetails?->RtDis2 ?? $product->RtDis2 ?? 0),
                'CredQty1' => (float) ($priceDetails?->CredQty1 ?? $product->CredQty1 ?? 0),
                'CredDis1' => (float) ($priceDetails?->CredDis1 ?? $product->CredDis1 ?? 0),
                'CredQty2' => (float) ($priceDetails?->CredQty2 ?? $product->CredQty2 ?? 0),
                'CredDis2' => (float) ($priceDetails?->CredDis2 ?? $product->CredDis2 ?? 0),
            ],
            'message' => 'Product found! Data loaded from existing record.',
        ]);
    }

    /**
     * Get GRN preview number for selected company and branch.
     * Used for dynamic GRN number generation based on role and selection.
     */
    public function getGrnPreview(Request $request)
    {
        $request->validate([
            'company_id' => 'required|integer',
            'branch_id' => 'required|integer',
        ]);

        $user = Auth::user();
        
        // Get company and section information
        $company = \App\Models\Company::find($request->company_id);
        $section = \App\Models\Section::find($request->branch_id);
        
        if (!$company || !$section) {
            return response()->json(['error' => 'Invalid company or section'], 404);
        }

        // Check authorization based on user role
        if (!$this->userIsSuperAdmin($user)) {
            // Company Admin can only access their company
            if ($user->role_id === 2 && $company->company_code !== $user->company_code) {
                return response()->json(['error' => 'Unauthorized company access'], 403);
            }
            // Branch Admin can only access their company and section
            if ($user->role_id === 3 && 
                ($company->company_code !== $user->company_code || $section->section_code !== $user->section_code)) {
                return response()->json(['error' => 'Unauthorized section access'], 403);
            }
        }

        // Ensure section belongs to the selected company
        if ($section->company_code !== $company->company_code) {
            return response()->json(['error' => 'Section does not belong to the selected company'], 400);
        }

        // Generate next purchase number for this company only (section omitted)
        $maxPurchaseNo = Purchase::where('company_code', $company->company_code)
            // company‑wide sequence for preview
            ->max('PurchaseNo') ?? 0;
        $nextPurchaseNo = $maxPurchaseNo + 1;

        // Generate GRN preview format: C01-000006 (company only)
        $companyNumber = preg_replace('/[^0-9]/', '', $company->company_code); // Extract "1" from "C1"
        $formattedCompany = 'C' . str_pad($companyNumber, 2, '0', STR_PAD_LEFT); // "C01"
        $grnNumber = $formattedCompany . '-' . sprintf('%06d', $nextPurchaseNo);

        return response()->json([
            'grn_number' => $grnNumber,
            'next_purchase_no' => $nextPurchaseNo,
            'company_code' => $company->company_code,
            'section_code' => $section->section_code,
        ]);
    }

    /**
     * Generate PDF for a single GRN (Purchase).
     */
    public function downloadPdf(Purchase $purchase)
    {
        try {
            // Load relationships with eager loading
            $purchase->load([
                'supplier', 
                'company', 
                'section', 
                'details.product'
            ]);

            // Ensure item_name is populated for all details (for backward compatibility)
            foreach ($purchase->details as $detail) {
                if (empty($detail->item_name) && $detail->product) {
                    $detail->item_name = $detail->product->ItmNm;
                }
            }

            // Prepare data for PDF
            $data = [
                'reportTitle' => 'GRN Report',
                'purchase' => $purchase,
                'generated_at' => now()->format('d M Y, h:i A'),
                'generated_by' => Auth::user()->username,
            ];

            // Generate PDF using DomPDF
            $pdf = Pdf::loadView('reports.grn', $data);
            
            // Set paper size and orientation
            $pdf->setPaper('A4', 'portrait');

            // Generate filename with new GRN format
            $filename = $purchase->company_code . '-' . sprintf('%06d', $purchase->PurchaseNo) . '-' . now()->format('Y-m-d') . '.pdf';

            // Return PDF download
            return $pdf->download($filename);
        } catch (\Exception $e) {
            return back()->with('error', 'Failed to generate PDF: ' . $e->getMessage());
        }
    }

    /**
     * Generate PDF of barcodes for the GRN items based on quantities
     */
    public function printBarcodes(Purchase $purchase)
    {
        try {
            $purchase->load(['details.product']);
            
            $barcodeItems = [];
            $generator = new \Picqer\Barcode\BarcodeGeneratorPNG();
            
            foreach ($purchase->details as $detail) {
                // If the product doesn't exist (e.g. printer), try serial number. Otherwise item code or product's barcode.
                $barcode = null;
                if (!empty($detail->serial_number)) {
                    $barcode = $detail->serial_number;
                } elseif ($detail->product) {
                    $barcode = $detail->product->BarCode ?: $detail->product->ItemCode;
                }
                
                if (empty($barcode)) {
                    continue; // Skip items with no identifiable barcode string
                }
                
                $itemName = $detail->item_name ?: ($detail->product ? $detail->product->ItmNm : 'Unknown Item');
                
                // Generate base64 image
                $barcodeImage = base64_encode($generator->getBarcode($barcode, $generator::TYPE_CODE_128));
                
                $qty = (int)$detail->Qty;
                
                for ($i = 0; $i < $qty; $i++) {
                    $barcodeItems[] = [
                        'name' => $itemName,
                        'barcode_string' => $barcode,
                        'image' => $barcodeImage,
                        'price' => $detail->CostPrice, // or retail price depending on requirement
                    ];
                }
            }
            
            $data = [
                'purchase' => $purchase,
                'barcodeItems' => $barcodeItems,
                'generated_at' => now()->format('d M Y, h:i A'),
                'generated_by' => Auth::user()->username,
            ];
            
            $pdf = Pdf::loadView('purchases.barcodes', $data);
            $pdf->setPaper('A4', 'portrait');
            
            $filename = 'barcodes-' . $purchase->company_code . '-' . sprintf('%06d', $purchase->PurchaseNo) . '.pdf';
            
            // Return stream so it can be previewed/printed directly
            return $pdf->stream($filename);
        } catch (\Exception $e) {
            return back()->with('error', 'Failed to generate barcodes: ' . $e->getMessage());
        }
    }

    /**
     * Display printing section products from GRN purchase details.
     */
    public function printingSectionProducts(Request $request)
    {
        $user = Auth::user();
        $search = $request->input('search');
        $locationCode = ($request->filled('stock_location') && $request->stock_location !== 'all') 
            ? $request->stock_location 
            : null;
        $availability = $request->get('availability', 'all');
        $batch = $request->input('batch');

        // Helper to apply common filters to both queries
        $applyFilters = function($query, $sourceType) use ($search, $locationCode, $availability, $batch, $user) {
            // 1. Search Filter
            if ($search) {
                $query->where(function($q) use ($search, $sourceType) {
                    if ($sourceType === 'purchase') {
                        $q->where('im.ItmNm', 'LIKE', "%{$search}%")
                          ->orWhere('b.name', 'LIKE', "%{$search}%")
                          ->orWhere('m.name', 'LIKE', "%{$search}%")
                          ->orWhere('pd.serial_number', 'LIKE', "%{$search}%")
                          ->orWhere('im.BarCode', 'LIKE', "%{$search}%");
                    } else {
                        $q->where('im.ItmNm', 'LIKE', "%{$search}%")
                          ->orWhere('sa.serial_number', 'LIKE', "%{$search}%")
                          ->orWhere('im.BarCode', 'LIKE', "%{$search}%");
                    }
                });
            }

            // 2. Batch Filter
            if ($batch) {
                $query->where($sourceType === 'purchase' ? 'pd.batch_no' : 'sa.batch_no', $batch);
            }

            // Exclude deleted old batches 0001-0025 for VIS
            $companyCode = $user->company_code ?? 'C01';
            $query->when(str_starts_with($companyCode, 'VIS'), function($q) use ($sourceType) {
                $batchCol = $sourceType === 'purchase' ? 'pd.batch_no' : 'sa.batch_no';
                return $q->where(function($subQ) use ($batchCol) {
                    $subQ->whereNull($batchCol)
                         ->orWhere($batchCol, '')
                         ->orWhere($batchCol, 'not like', 'GRN-VIS-VIS-%')
                         ->orWhere($batchCol, '>=', 'GRN-VIS-VIS-0026');
                });
            });

            // 3. Location & Availability Filter
            if ($locationCode || $availability !== 'all') {
                $locationId = null;
                if ($locationCode) {
                    $locationId = DB::table('sections')->where('section_code', $locationCode)->value('id');
                }

                $serialCol = $sourceType === 'purchase' ? 'pd.serial_number' : 'sa.serial_number';
                $itemCol = $sourceType === 'purchase' ? 'pd.iTimKy' : 'sa.product_id';

                if ($availability === 'available') {
                    $query->where(function($q) use ($serialCol, $itemCol, $user, $locationCode, $sourceType, $locationId) {
                        $q->whereExists(function($sq) use ($serialCol, $itemCol, $user, $locationCode) {
                            $sq->select(DB::raw(1))
                               ->from('stock_in_hand')
                               ->whereRaw("stock_in_hand.ItemKy = $itemCol")
                               ->where(function($w) use ($serialCol) {
                                    $w->whereRaw("TRIM(stock_in_hand.serial_number) = TRIM($serialCol)")
                                      ->orWhereRaw("TRIM(stock_in_hand.serial_number) LIKE CONCAT('%', TRIM($serialCol))")
                                      ->orWhereRaw("TRIM($serialCol) LIKE CONCAT('%', TRIM(stock_in_hand.serial_number))");
                               })
                               ->when($locationCode, function($wq) use ($locationCode) {
                                   $wq->where('section_code', $locationCode);
                               })
                               ->havingRaw('SUM(Qty + COALESCE(FreeQty, 0)) > 0');
                        })
                        ->orWhere(function($sq) use ($serialCol, $itemCol, $user, $locationCode) {
                            $sq->where(function($ssq) use ($serialCol) {
                                $ssq->whereNull($serialCol)->orWhere(DB::raw("TRIM($serialCol)"), '');
                            })
                            ->whereExists(function($ex) use ($itemCol, $user, $locationCode) {
                                $ex->select(DB::raw(1))
                                   ->from('stock_in_hand')
                                   ->whereRaw("stock_in_hand.ItemKy = $itemCol")
                                   ->where(function($sssq) {
                                       $sssq->whereNull('serial_number')->orWhere(DB::raw("TRIM(serial_number)"), '');
                                   })
                                   ->when($locationCode, function($wq) use ($locationCode) {
                                       $wq->where('section_code', $locationCode);
                                   })
                                   ->havingRaw('SUM(Qty + COALESCE(FreeQty, 0)) > 0');
                            });
                        });
                    });
                } elseif ($availability === 'sold') {
                    $query->whereNotExists(function($sq) use ($serialCol, $itemCol, $user, $locationCode) {
                        $sq->select(DB::raw(1))
                           ->from('stock_in_hand')
                           ->whereRaw("stock_in_hand.ItemKy = $itemCol")
                           ->where(function($w) use ($serialCol) {
                                $w->whereRaw("TRIM(stock_in_hand.serial_number) = TRIM($serialCol)")
                                  ->orWhereRaw("TRIM(stock_in_hand.serial_number) LIKE CONCAT('%', TRIM($serialCol))")
                                  ->orWhereRaw("TRIM($serialCol) LIKE CONCAT('%', TRIM(stock_in_hand.serial_number))");
                           })
                           ->when($locationCode, function($wq) use ($locationCode) {
                               $wq->where('section_code', $locationCode);
                           })
                           ->havingRaw('SUM(Qty + COALESCE(FreeQty, 0)) > 0');
                    })->where(function($q) use ($serialCol, $itemCol, $user, $locationCode) {
                        $q->whereNotNull($serialCol)->where(DB::raw("TRIM($serialCol)"), '!=', '');
                    });
                } elseif ($locationCode) {
                    $query->where(function($q) use ($serialCol, $itemCol, $sourceType, $locationCode, $locationId, $user) {
                        $q->whereExists(function($sq) use ($serialCol, $itemCol, $user, $locationCode) {
                            $sq->select(DB::raw(1))
                               ->from('stock_in_hand')
                               ->whereRaw("stock_in_hand.ItemKy = $itemCol")
                               ->where('section_code', $locationCode)
                               ->where(function($w) use ($serialCol) {
                                    $w->whereRaw("TRIM(stock_in_hand.serial_number) = TRIM($serialCol)")
                                      ->orWhereRaw("TRIM(stock_in_hand.serial_number) LIKE CONCAT('%', TRIM($serialCol))")
                                      ->orWhereRaw("TRIM($serialCol) LIKE CONCAT('%', TRIM(stock_in_hand.serial_number))");
                               });
                        });
                        if ($sourceType === 'purchase') {
                            $q->orWhere('p.section_code', $locationCode);
                        } elseif ($locationId) {
                            $q->orWhere('h.section_id', $locationId);
                        }
                    });
                }
            }

            return $query;
        };

        // Query 1: Purchase Details
        $purchaseQuery = DB::table('purchase_det as pd')
            ->join('purchase as p', 'pd.PurchaseKey', '=', 'p.PurchaseKey')
            ->join('itemmaster as im', 'pd.iTimKy', '=', 'im.ItmKy')
            ->leftJoin('brands as b', 'im.brand_id', '=', 'b.id')
            ->leftJoin('models as m', 'im.models_id', '=', 'm.id')
            ->leftJoin('address as s', 'p.SuppCode', '=', 's.AdrCd')
            ->where('pd.company_code', $user->company_code)
            ->where('p.type', 'supplier')
            ->where('im.item_type', 'printer')
            ->select([
                'pd.PerchaseDetKy as id',
                'im.ItmNm as product_name',
                'b.name as brand',
                'm.name as model',
                'pd.serial_number',
                'im.BarCode as barcode',
                'pd.Qty as qty',
                'pd.CostPrice as cost_price',
                'pd.SalePrice as retail_price',
                'pd.VehicleSalePrice',
                DB::raw("CONCAT(pd.company_code, '-', LPAD(p.PurchaseNo, 6, '0')) as grn_no"),
                'p.GRNDate as grn_date',
                's.FstNm as supplier_name',
                'pd.batch_no',
                'pd.created_at',
                'pd.iTimKy as ItmKy'
            ]);
        $purchaseQuery = $applyFilters($purchaseQuery, 'purchase');

        // Query 2: Stock Adjustments (Items)
        $adjustmentQuery = DB::table('stock_adjustment_items as sa')
            ->join('stock_adjustments as h', 'sa.adjustment_id', '=', 'h.id')
            ->join('itemmaster as im', 'sa.product_id', '=', 'im.ItmKy')
            ->leftJoin('brands as b', 'im.brand_id', '=', 'b.id')
            ->leftJoin('models as m', 'im.models_id', '=', 'm.id')
            ->where('h.company_code', $user->company_code)
            ->where('im.item_type', 'printer')
            ->select([
                'sa.id',
                'im.ItmNm as product_name',
                'b.name as brand',
                'm.name as model',
                'sa.serial_number',
                'im.BarCode as barcode',
                'sa.quantity as qty',
                'sa.cost_price',
                'sa.sale_price as retail_price',
                DB::raw("0 as VehicleSalePrice"),
                DB::raw("CONCAT('ADJ-', h.adjustment_number) as grn_no"),
                'h.adjustment_date as grn_date',
                DB::raw("'ADJUSTMENT' as supplier_name"),
                'sa.batch_no',
                'sa.created_at',
                'sa.product_id as ItmKy'
            ]);
        $adjustmentQuery = $applyFilters($adjustmentQuery, 'adjustment');

        // Combine and Paginate or Export
        $isExport = $request->get('export') === 'json';
        $combinedQuery = $purchaseQuery->union($adjustmentQuery)->orderBy('created_at', 'desc');
        
        $products = $isExport ? $combinedQuery->get() : $combinedQuery->paginate(15)->withQueryString();

        // Final transformation
        $currentSection = $locationCode ?: null; // Use null for global search if no section selected

        $collection = $isExport ? $products : $products->getCollection();
        $collection->transform(function($product) use ($user) {
            $stockRecords = DB::table('stock_in_hand')
                ->where('ItemKy', $product->ItmKy)
                ->where(function($q) use ($product) {
                    if (!empty($product->serial_number)) {
                        $serial = trim($product->serial_number);
                        $q->where(function($sq) use ($serial) {
                            $sq->whereRaw('TRIM(serial_number) = ?', [$serial])
                               ->orWhereRaw("TRIM(serial_number) LIKE CONCAT('%', ?)", [$serial])
                               ->orWhereRaw("? LIKE CONCAT('%', TRIM(serial_number))", [$serial]);
                        });
                    } else {
                        $q->whereNull('serial_number')->orWhere(DB::raw('TRIM(serial_number)'), '');
                    }
                })
                ->groupBy('section_code')
                ->selectRaw('section_code, SUM(Qty + COALESCE(FreeQty, 0)) as total_qty')
                ->get();

            $availableIn = $stockRecords->filter(function($record) {
                return (float)$record->total_qty > 0;
            })->first();

            $isAvailable = $availableIn !== null;

            return [
                'id' => $product->id,
                'product_name' => $product->product_name ?? 'Unknown Product',
                'brand' => $product->brand ?? '',
                'model' => $product->model ?? '',
                'serial_number' => $product->serial_number ?: '[MISSING SERIAL]',
                'barcode' => $product->barcode ?? '',
                'qty' => (float) ($product->qty ?? 0),
                'cost_price' => (float) ($product->cost_price ?? 0),
                'retail_price' => (float) ($product->retail_price ?? 0),
                'VehicleSalePrice' => (float) ($product->VehicleSalePrice ?? 0),
                'grn_no' => $product->grn_no,
                'grn_date' => $product->grn_date,
                'supplier_name' => $product->supplier_name,
                'batch_no' => $product->batch_no ?? '',
                'is_available' => $isAvailable,
                'section_code' => $isAvailable ? $availableIn->section_code : null,
                'created_at' => $product->created_at,
            ];
        });

        if ($isExport) {
            return response()->json($products);
        }

        // Determine company for header
        $company = null;
        if (auth('company')->check()) {
            $company = auth('company')->user();
        } else {
            $company = $user ? $user->company : null;
        }

        if (!$company) {
            $company = (object) [
                'company_code' => $user->company_code ?? 'C01',
                'name' => 'Company',
            ];
        }

        return Inertia::render('pos/printing-section-products/index', [
            'company' => $company,
            'products' => $products,
            'filters' => $request->only(['search', 'stock_location', 'batch', 'availability']),
            'sections' => \App\Models\Section::where('company_code', $user->company_code)->get(),
            'batches' => DB::table('stock_in_hand')
                ->where('company_code', $user->company_code)
                ->whereNotNull('batch_no')
                ->where('batch_no', '!=', '')
                ->when(str_starts_with($user->company_code ?? '', 'VIS'), function($q) {
                    return $q->where(function($subQ) {
                        $subQ->where('batch_no', 'not like', 'GRN-VIS-VIS-%')
                             ->orWhere('batch_no', '>=', 'GRN-VIS-VIS-0026');
                    });
                })
                ->distinct()
                ->pluck('batch_no')
                ->sort()
                ->values()
        ]);
    }

    /**
     * Check if a serial number has already been used in any GRN
     */
    public function checkSerialNumber(Request $request)
    {
        $user = Auth::user();

        if (!$user->hasPermission('purchases.create')) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $request->validate([
            'serial_numbers' => 'required|array',
            'serial_numbers.*' => 'string',
        ]);

        $serialNumbers = array_map('trim', $request->input('serial_numbers'));
        $companyCode = $user->company_code;

        // Check if any of these serial numbers exist in purchase details
        $existingInPurchases = DB::table('purchase_det')
            ->where('company_code', $companyCode)
            ->whereIn(DB::raw('TRIM(serial_number)'), $serialNumbers)
            ->pluck('serial_number')
            ->toArray();

        // Also check stock_in_hand
        $existingInStock = DB::table('stock_in_hand')
            ->where('company_code', $companyCode)
            ->whereIn(DB::raw('TRIM(serial_number)'), $serialNumbers)
            ->pluck('serial_number')
            ->toArray();

        $duplicates = array_values(array_unique(array_merge($existingInPurchases, $existingInStock)));

        return response()->json([
            'duplicates' => $duplicates,
        ]);
    }
}

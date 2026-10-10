<?php

namespace App\Http\Controllers\POS;

use App\Models\Product;
use App\Models\ItemPriceDet;
use App\Models\Section;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use App\Http\Controllers\Controller;
use App\Services\NumberGeneratorService;

class PrinterController extends Controller
{
    /**
     * Get the authenticated user from available guards
     */
    private function getAuthenticatedUser()
    {
        if (Auth::guard('web')->check()) {
            return Auth::guard('web')->user();
        }
        if (Auth::guard('company')->check()) {
            return Auth::guard('company')->user();
        }
        return Auth::user();
    }

    /**
     * Helper: detect super admin
     */
    private function userIsSuperAdmin($user): bool
    {
        if (!$user) {
            return false;
        }

        if (isset($user->user_type) && $user->user_type === 'super_admin') {
            return true;
        }

        if (method_exists($user, 'isSuperAdmin')) {
            return (bool) $user->isSuperAdmin();
        }

        if (method_exists($user, 'hasRole')) {
            try {
                return (bool) $user->hasRole('super_admin') || (bool) $user->hasRole('admin');
            } catch (\Throwable $e) {
                // ignore
            }
        }

        if ($user->role) {
            $roleSlug = $user->role->slug ?? '';
            if (in_array($roleSlug, ['super_admin', 'superadmin', 'admin', 'administrator'])) {
                return true;
            }
        }

        if (isset($user->is_super_admin)) {
            return (bool) $user->is_super_admin;
        }

        return false;
    }

    /**
     * Generate next unique sequential printer code
     */
    private function generateNextPrinterCode($company_code): string
    {
        // Get the highest sequential number for this company
        $printerPrefix = 'PRN-';
        
        $lastPrinter = DB::table('itemmaster')
            ->where('company_code', $company_code)
            ->where('ItemCode', 'LIKE', $printerPrefix . '%')
            ->orderByRaw('CAST(SUBSTR(ItemCode, ' . (strlen($printerPrefix) + 1) . ') AS UNSIGNED) DESC')
            ->value('ItemCode');

        // Extract number from last printer code and increment
        if ($lastPrinter && preg_match('/' . preg_quote($printerPrefix) . '(\d+)/', $lastPrinter, $matches)) {
            $nextNumber = intval($matches[1]) + 1;
        } else {
            $nextNumber = 1;
        }

        // Return formatted code with 4-digit padding (PRN-0001, PRN-0002, etc.)
        return $printerPrefix . sprintf('%04d', $nextNumber);
    }

    /**
     * Display the printer registration form
     */
    public function create()
    {
        $user = $this->getAuthenticatedUser();
        if (!$user) abort(401, 'User not authenticated.');

        // Check if user can create printers
        if (!$user->hasPermission('printers.create') && !$user->hasPermission('products.create')) {
            return redirect()->back()->with('error', 'You are not allowed to register new printers.');
        }

        // Generate next printer code
        $nextPrinterCode = $this->generateNextPrinterCode($user->company_code);

        // Get brands (category_id = 1 only)
        $brands = DB::table('brands')
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->where('category_id', 1)
            ->select('id', 'name', 'code', 'category_id')
            ->orderBy('name')
            ->get();

        // Get categories (filter for printer types)
        $categories = DB::table('code_masters')
            ->where('conkey', 'CAT')
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->where('company_code', $user->company_code)
            ->select('catkey as id', 'cname as name')
            ->orderBy('cname')
            ->get();

        // Get units (for pricing)
        $units = DB::table('code_masters')
            ->where('conkey', 'UNT')
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->where('company_code', $user->company_code)
            ->select('id', 'cname as name')
            ->orderBy('cname')
            ->get();

        // Get suppliers
        $suppliers = DB::table('acc_mas')
            ->where('AccTyp', 'SUPPLIER')
            ->where('Status', 'A')
            ->where('company_code', $user->company_code)
            ->select('AccKy as id', 'AccNm as name')
            ->orderBy('AccNm')
            ->get();

        return Inertia::render('pos/printers/create', [
            'brands' => $brands,
            'categories' => $categories,
            'units' => $units,
            'suppliers' => $suppliers,
            'nextPrinterCode' => $nextPrinterCode,
        ]);
    }

    /**
     * Store a newly registered printer
     */
    public function store(Request $request)
    {
        $user = $this->getAuthenticatedUser();
        if (!$user) abort(401, 'User not authenticated.');

        // Check if user can create printers
        if (!$user->hasPermission('printers.create') && !$user->hasPermission('products.create')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to register printers.');
        }

        $validator = Validator::make($request->all(), [
            'printer_code' => 'required|string|max:50|unique:itemmaster,ItemCode',
            'printer_name' => 'required|string|max:100',
            'model_id' => 'nullable|integer|exists:models,id',
            'model' => 'nullable|string|max:100',
            'brand_id' => 'nullable|integer|exists:brands,id',
            'supplier_id' => 'nullable|integer|exists:acc_mas,AccKy',
            'cost_price' => 'required|numeric|min:0',
            'retail_price' => 'nullable|numeric|min:0',
            'wholesale_price' => 'nullable|numeric|min:0',
            'vehicle_sale_price' => 'nullable|numeric|min:0',
            'warranty' => 'nullable|numeric|min:0',
            'barcode' => 'required|string|max:255',
            'vat_applicable' => 'nullable|boolean',
            'RtQty1' => 'nullable|numeric|min:0',
            'RtDis1' => 'nullable|numeric|min:0',
            'RtDisType1' => 'nullable|string|in:fixed,percentage',
        ]);

        if ($validator->fails()) {
            return redirect()->back()
                ->withErrors($validator)
                ->withInput();
        }

        try {
            DB::beginTransaction();

            $data = $validator->validated();

            // Get models_id if model is provided
            $modelsId = null;
            if (!empty($data['model_id'])) {
                $modelsId = $data['model_id'];
            } elseif (!empty($data['model'])) {
                $modelRecord = \App\Models\ProductModel::where('name', $data['model'])
                    ->where('company_code', $user->company_code)
                    ->first();
                if ($modelRecord) {
                    $modelsId = $modelRecord->id;
                }
            }

            // Get company and section from authenticated user
            $company_code = $user->company_code;
            
            // Find default section or main stock
            $section = Section::where('company_code', $company_code)
                ->orderBy('is_main_stock', 'desc')
                ->orderBy('id', 'asc')
                ->first();

            if (!$section) {
                throw new \Exception('No sections found for this company. Please create a section first.');
            }

            $section_code = $section->section_code;

            // Validate barcode presence (required field)
            $barcode = $request->input('barcode');
            if (empty($barcode)) {
                throw new \Exception('Barcode is required.');
            }

            // Get PRINTER category ID to ensure all printers use the same category for filtering
            $printerCatkey = DB::table('code_masters')
                ->where('conkey', 'CAT')
                ->where('cname', 'PRINTER')
                ->where('company_code', $company_code)
                ->value('catkey');

            // Default to CAT001 if printer category not found
            if (!$printerCatkey) {
                $printerCatkey = 'CAT001';
            }

            // Prepare product data using itemmaster columns
            $productData = [
                'ItemCode' => $data['printer_code'],
                'ItmNm' => $data['printer_name'],
                'BarCode' => $barcode,
                'brand_id' => $data['brand_id'] ?? null,
                'models_id' => $modelsId,
                'SupKey' => $data['supplier_id'] ?? null,
                'warranty' => $data['warranty'] ?? null,
                'catkey' => $printerCatkey,
                'CosPri' => $data['cost_price'],
                'NCostPrice' => $data['cost_price'],
                'SlsPri' => $data['retail_price'] ?? $data['cost_price'],
                'WholePrice' => $data['wholesale_price'] ?? $data['cost_price'],
                'VehicleSalePrice' => $data['vehicle_sale_price'] ?? 0,
                'UnitKy' => 1, // Default unit (usually "Piece")
                'VATItem' => $data['vat_applicable'] ? 1 : 0, // VAT based on user selection
                'item_type' => 'printer', // Explicitly mark as printer
                'company_code' => $company_code,
                'section_code' => $section_code,
                'available_sections' => [$section_code],
                'available_business_units' => $this->getUserBusinessUnits($user),
                'Status' => 'I', // Insert
                'fInAct' => false, // Active
                'ReOrdlLvl' => 0,
                'RtQty1' => $data['RtQty1'] ?? 0,
                'RtDis1' => $data['RtDis1'] ?? 0,
                'RtDisType1' => $data['RtDisType1'] ?? 'fixed',
            ];

            // Store color/specs in a notes field if available, otherwise in the description
            if (!empty($data['color_specs'])) {
                // Store as remark or other available field
                $productData['category'] = $data['color_specs'];
            }

            // Create the product record
            $product = Product::create($productData);

            // Save price details - must include ItemCode
            ItemPriceDet::create([
                'ItmKy' => $product->ItmKy,
                'CosPri' => $data['cost_price'],
                'NCostPrice' => $data['cost_price'],
                'SlsPri' => $data['retail_price'] ?? $data['cost_price'],
                'WholePrice' => $data['wholesale_price'] ?? $data['cost_price'],
                'warranty' => $data['warranty'] ?? null,
                'VehicleSalePrice' => $data['vehicle_sale_price'] ?? 0,
                'RtQty1' => $data['RtQty1'] ?? 0,
                'RtDis1' => $data['RtDis1'] ?? 0,
                'RtDisType1' => $data['RtDisType1'] ?? 'fixed',
                'ChangedDate' => now(),
            ]);

            DB::commit();

            return redirect()->route('pos.printers.index')
                ->with('success', "Printer '{$data['printer_name']}' registered successfully. You can now use it in GRN entries.");

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error registering printer: ' . $e->getMessage());
            return redirect()->back()
                ->withErrors(['error' => 'Failed to register printer: ' . $e->getMessage()])
                ->withInput();
        }
    }

    /**
     * Display list of registered printers
     */
    public function index(Request $request)
    {
        $user = $this->getAuthenticatedUser();
        if (!$user) abort(401, 'User not authenticated.');

        if (!$user->hasPermission('printers.view') && !$user->hasPermission('products.view')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $search = $request->input('search');
        $status = $request->input('status');
        $perPage = $request->input('per_page', 10);

        // Get all registered printers (filtered by PRN- prefix)
        $query = Product::where('itemmaster.company_code', $user->company_code)
            ->where('itemmaster.ItemCode', 'LIKE', 'PRN-%');

        // Apply Search Filter
        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('itemmaster.ItmNm', 'LIKE', "%{$search}%")
                  ->orWhere('itemmaster.ItemCode', 'LIKE', "%{$search}%");
            });
        }

        // Apply Status Filter
        if ($status === 'active') {
            $query->where('itemmaster.fInAct', false);
        } elseif ($status === 'inactive') {
            $query->where('itemmaster.fInAct', true);
        }

        $printers = $query->leftJoin('code_masters as cm', function ($join) use ($user) {
                $join->on('itemmaster.catkey', '=', 'cm.catkey')
                    ->where('cm.conkey', '=', 'CAT')
                    ->where('cm.company_code', '=', $user->company_code);
            })
            ->leftJoin('brands', 'itemmaster.brand_id', '=', 'brands.id')
            ->leftJoin('models', 'itemmaster.models_id', '=', 'models.id')
            ->select(
                'itemmaster.ItmKy',
                'itemmaster.ItemCode',
                'itemmaster.ItmNm',
                'itemmaster.models_id',
                'models.name as model',
                'brands.name as brand',
                'itemmaster.CosPri',
                'itemmaster.SlsPri',
                'itemmaster.RtDis1',
                'itemmaster.RtDisType1',
                'itemmaster.created_at',
                'itemmaster.fInAct',
                DB::raw('COALESCE(cm.cname, "PRINTER") as category')
            )
            ->orderBy('itemmaster.ItmNm')
            ->paginate($perPage)
            ->withQueryString();

        // Calculate global stats for the current filter (excluding pagination)
        $statsQuery = Product::where('itemmaster.company_code', $user->company_code)
            ->where('itemmaster.ItemCode', 'LIKE', 'PRN-%');

        if ($search) {
            $statsQuery->where(function($q) use ($search) {
                $q->where('itemmaster.ItmNm', 'LIKE', "%{$search}%")
                  ->orWhere('itemmaster.ItemCode', 'LIKE', "%{$search}%");
            });
        }

        if ($status === 'active') {
            $statsQuery->where('itemmaster.fInAct', false);
        } elseif ($status === 'inactive') {
            $statsQuery->where('itemmaster.fInAct', true);
        }

        $stats = [
            'totalCount' => $statsQuery->count(),
            'activeCount' => (clone $statsQuery)->where('fInAct', false)->count(),
            'totalValue' => $statsQuery->sum('CosPri'),
        ];

        return Inertia::render('pos/printers/index', [
            'printers' => $printers,
            'filters' => $request->only(['search', 'status', 'per_page']),
            'stats' => $stats,
        ]);
    }



    /**
     * Show printer details
     */
    public function show($id)
    {
        $user = $this->getAuthenticatedUser();
        if (!$user) abort(401, 'User not authenticated.');

        if (!$user->hasPermission('printers.view') && !$user->hasPermission('products.view')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $printer = Product::where('ItmKy', $id)
            ->where('company_code', $user->company_code)
            ->with(['brand', 'model'])
            ->firstOrFail();

        return Inertia::render('pos/printers/show', [
            'printer' => $printer,
        ]);
    }

    /**
     * Show edit form
     */
    public function edit($id)
    {
        $user = $this->getAuthenticatedUser();
        if (!$user) abort(401, 'User not authenticated.');

        if (!$user->hasPermission('printers.edit') && !$user->hasPermission('products.edit')) {
            return redirect()->back()->with('error', 'You are not allowed to edit printers.');
        }

        $printer = Product::where('ItmKy', $id)
            ->where('company_code', $user->company_code)
            ->with(['brand', 'model'])
            ->firstOrFail();

        // Get pricing details from ItemPriceDet (latest by ChangedDate)
        $pricing = ItemPriceDet::where('ItmKy', $id)
            ->orderBy('ChangedDate', 'desc')
            ->first();

        // Add pricing to printer object, fallback to itemmaster values if missing
        $printer->WholePrice = $pricing->WholePrice ?? $printer->WholePrice ?? null;
        $printer->VehicleSalePrice = $pricing->VehicleSalePrice ?? $printer->VehicleSalePrice ?? null;
        $printer->RtQty1 = $pricing->RtQty1 ?? $printer->RtQty1 ?? null;
        $printer->RtDis1 = $pricing->RtDis1 ?? $printer->RtDis1 ?? null;
        $printer->RtDisType1 = $pricing->RtDisType1 ?? $printer->RtDisType1 ?? 'fixed';

        // Ensure barcode is accessible (map BarCode to barcode for frontend)
        $printer->barcode = $printer->BarCode ?? null;

        // Get brands (category_id = 1 only)
        $brands = DB::table('brands')
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->where('category_id', 1)
            ->select('id', 'name', 'code', 'category_id')
            ->orderBy('name')
            ->get();

        // Get suppliers
        $suppliers = DB::table('acc_mas')
            ->where('AccTyp', 'SUPPLIER')
            ->where('Status', 'A')
            ->where('company_code', $user->company_code)
            ->select('AccKy as id', 'AccNm as name')
            ->orderBy('AccNm')
            ->get();

        return Inertia::render('pos/printers/edit', [
            'printer' => $printer,
            'brands' => $brands,
            'suppliers' => $suppliers,
        ]);
    }

    /**
     * Toggle printer active/inactive status
     */
    public function toggle($id)
    {
        $user = $this->getAuthenticatedUser();
        if (!$user) abort(401, 'User not authenticated.');

        if (!$user->hasPermission('printers.edit') && !$user->hasPermission('products.edit')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        try {
            $printer = Product::where('ItmKy', $id)
                ->where('company_code', $user->company_code)
                ->firstOrFail();

            // Toggle inactive status (fInAct = 1 means inactive, 0 means active)
            $printer->update([
                'fInAct' => !$printer->fInAct,
            ]);

            $status = $printer->fInAct ? 'inactivated' : 'activated';

            return redirect()->route('pos.printers.index')
                ->with('success', "Printer '{$printer->ItmNm}' has been $status successfully.");

        } catch (\Exception $e) {
            Log::error('Error toggling printer: ' . $e->getMessage());
            return redirect()->back()
                ->withErrors(['error' => 'Failed to toggle printer status: ' . $e->getMessage()]);
        }
    }

    /**
     * Update printer details
     */
    public function update(Request $request, $id)
    {
        $user = $this->getAuthenticatedUser();
        if (!$user) abort(401, 'User not authenticated.');

        if (!$user->hasPermission('printers.edit') && !$user->hasPermission('products.edit')) {
            return redirect()->back()->with('error', 'You are not allowed to edit printers.');
        }

        $printer = Product::where('ItmKy', $id)
            ->where('company_code', $user->company_code)
            ->firstOrFail();

        // Validate request  
        $validator = Validator::make($request->all(), [
            'printer_name' => 'required|string|max:100',
            'model_id' => 'nullable|integer|exists:models,id',
            'model' => 'nullable|string|max:100',
            'cost_price' => 'required|numeric|min:0',
            'retail_price' => 'nullable|numeric|min:0',
            'wholesale_price' => 'nullable|numeric|min:0',
            'vehicle_sale_price' => 'nullable|numeric|min:0',
            'warranty' => 'nullable|numeric|min:0',
            'barcode' => 'nullable|string|max:255',
            'brand_id' => 'nullable|integer',
            'supplier_id' => 'nullable|integer',
            'vat_applicable' => 'nullable|boolean',
            'RtQty1' => 'nullable|numeric|min:0',
            'RtDis1' => 'nullable|numeric|min:0',
            'RtDisType1' => 'nullable|string|in:fixed,percentage',
            'batch_no' => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return redirect()->back()
                ->withErrors($validator)
                ->withInput();
        }

        try {
            DB::beginTransaction();

            // Get models_id if model is provided
            $modelsId = null;
            if (!empty($request->input('model_id'))) {
                $modelsId = $request->input('model_id');
            } elseif (!empty($request->input('model'))) {
                $modelRecord = \App\Models\ProductModel::where('name', $request->input('model'))
                    ->where('company_code', $user->company_code)
                    ->first();
                if ($modelRecord) {
                    $modelsId = $modelRecord->id;
                }
            }

            // Update printer in itemmaster
            $printer->update([
                'ItmNm' => $request->input('printer_name'),
                'models_id' => $modelsId,
                'CosPri' => $request->input('cost_price'),
                'SlsPri' => $request->input('retail_price') ?? 0,
                'WholePrice' => $request->input('wholesale_price') ?? 0,
                'VehicleSalePrice' => $request->input('vehicle_sale_price') ?? 0,
                'warranty' => $request->input('warranty') ?? null,
                'BarCode' => $request->input('barcode') ?? null,
                'brand_id' => $request->input('brand_id'),
                'SupKey' => $request->input('supplier_id'),
                'VATItem' => $request->input('vat_applicable') ? 1 : 0, // VAT based on user selection
                'RtQty1' => $request->input('RtQty1') ?? 0,
                'RtDis1' => $request->input('RtDis1') ?? 0,
                'RtDisType1' => $request->input('RtDisType1') ?? 'fixed',
            ]);

            $batchNo = $request->input('batch_no') ?: 'DEFAULT';

            ItemPriceDet::updateOrCreate(
                [
                    'ItmKy' => $printer->ItmKy,
                    'batch_no' => $batchNo,
                ],
                [
                    'CosPri' => $request->input('cost_price'),
                    'NCostPrice' => $request->input('cost_price'),
                    'SlsPri' => $request->input('retail_price') ?? 0,
                    'WholePrice' => $request->input('wholesale_price') ?? 0,
                    'VehicleSalePrice' => $request->input('vehicle_sale_price') ?? 0,
                    'warranty' => $request->input('warranty') ?? null,
                    'RtQty1' => $request->input('RtQty1') ?? 0,
                    'RtDis1' => $request->input('RtDis1') ?? 0,
                    'RtDisType1' => $request->input('RtDisType1') ?? 'fixed',
                    'ChangedDate' => now(),
                ]
            );

            // If batch_no is provided, sync selling price (and cost) back to purchase_det for that batch
            if (!empty($batchNo) && $batchNo !== 'DEFAULT') {
                try {
                    $purchaseUpdate = [];
                    if ($request->has('retail_price')) {
                        $purchaseUpdate['SalePrice'] = $request->input('retail_price');
                    }
                    if ($request->has('cost_price')) {
                        $purchaseUpdate['CostPrice'] = $request->input('cost_price');
                    }
                    if ($request->has('wholesale_price')) {
                        $purchaseUpdate['WholePrice'] = $request->input('wholesale_price');
                    }
                    if ($request->has('vehicle_sale_price')) {
                        $purchaseUpdate['VehicleSalePrice'] = $request->input('vehicle_sale_price');
                    }

                    if (!empty($purchaseUpdate)) {
                        DB::table('purchase_det')
                            ->where('iTimKy', $printer->ItmKy)
                            ->where('company_code', $printer->company_code)
                            ->where('batch_no', $batchNo)
                            ->update($purchaseUpdate);
                        
                        Log::info('Updated purchase_det prices for printer ItmKy: ' . $printer->ItmKy . ' batch_no: ' . $batchNo);
                    }
                } catch (\Exception $e) {
                    Log::warning('Failed to update purchase_det prices for printer ItmKy: ' . $printer->ItmKy . ' batch_no: ' . $batchNo . ' - ' . $e->getMessage());
                }
            }

            DB::commit();

            return redirect()->route('pos.printers.index')
                ->with('success', "Printer '{$request->input('printer_name')}' updated successfully.");

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating printer: ' . $e->getMessage());
            return redirect()->back()
                ->withErrors(['error' => 'Failed to update printer: ' . $e->getMessage()])
                ->withInput();
        }
    }

    /**
     * Get models by brand ID (AJAX endpoint)
     */
    public function getModelsByBrand($brandId)
    {
        $user = $this->getAuthenticatedUser();
        if (!$user) abort(401, 'User not authenticated.');

        try {
            $models = \App\Models\ProductModel::where('brand_id', $brandId)
                ->where('is_active', true)
                ->where('company_code', $user->company_code)
                ->select('id', 'name', 'code')
                ->orderBy('name')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $models,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching models: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch models',
            ], 500);
        }
    }

    /**
     * Get user's business units
     */
    private function getUserBusinessUnits($user): array
    {
        if (!$user || empty($user->company_code)) {
            return ['vismass'];
        }

        if (str_starts_with(strtoupper($user->company_code), 'MAL')) {
            return ['malibo'];
        }

        return ['vismass'];
    }
}

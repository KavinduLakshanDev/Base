<?php
namespace App\Http\Controllers\POS;

use App\Models\Product;
use App\Models\ItemPriceDet;
use App\Models\Address;
use App\Models\Company;
use App\Models\Section;
use App\Http\Controllers\PromotionalDiscountController;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Tighten\Ziggy\Ziggy;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use App\Http\Controllers\Controller;
use App\Services\NumberGeneratorService;

class ProductController extends Controller
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
     * Check if user can manage products
     */
    private function canManageProducts(): bool
    {
        $user = $this->getAuthenticatedUser();
        if (!$user) return false;

        return $user->hasPermission('products.create') || $user->hasPermission('products.edit');
    }

    /**
     * Generate the next ItemCode in ITMXXXX format (e.g. ITM0001, ITM0002)
     */
    private function generateNextItemCode(): string
    {
        $prefix = 'ITM';
        $lastItem = DB::table('itemmaster')
            ->where('ItemCode', 'LIKE', $prefix . '%')
            ->orderByRaw('CAST(SUBSTR(ItemCode, ' . (strlen($prefix) + 1) . ') AS UNSIGNED) DESC')
            ->value('ItemCode');

        if ($lastItem && preg_match('/' . preg_quote($prefix) . '(\d+)/', $lastItem, $matches)) {
            $nextNumber = intval($matches[1]) + 1;
        } else {
            $nextNumber = 1;
        }

        return $prefix . sprintf('%04d', $nextNumber);
    }
    
    /**
     * Get the business unit for a given user
     */
    private function getUserBusinessUnit($user): string
    {
        if (!$user || empty($user->company_code)) {
            return 'vismass'; // Default fallback
        }
        
        // Check if company code indicates Malibo
        if (str_starts_with(strtoupper($user->company_code), 'MAL')) {
            return 'malibo';
        }
        
        return 'vismass';
    }

    /**
     * Check if user can access a specific product
     * Products are company-wide: all users in a company can access all company products
     * AND products shared to their business unit
     */
    private function canAccessProduct(Product $product): bool
    {
        $user = $this->getAuthenticatedUser();

        if (!$user) {
            return false;
        }

        // Super admin can access all products
        if ($this->userIsSuperAdmin($user)) {
            return true;
        }

        // 1. Check direct company ownership
        if ($product->company_code === $user->company_code) {
            return true;
        }

        // 2. Check business unit sharing
        $userBusinessUnit = $this->getUserBusinessUnit($user);
        $productBusinessUnits = $product->available_business_units ?? [];
        
        if (in_array($userBusinessUnit, $productBusinessUnits)) {
            return true;
        }

        return false;
    }

    /**
     * Check if user can delete/activate/deactivate products
     */
    private function canDeleteProduct(): bool
    {
        $user = $this->getAuthenticatedUser();
        if (!$user) return false;
        
        return $this->userIsSuperAdmin($user);
    }

    /**
     * Helper: detect super admin
     */
    private function userIsSuperAdmin($user): bool
    {
        if (!$user) return false;
        
        // Use the standardized model method if available
        if (method_exists($user, 'isSuperAdmin')) {
            return (bool) $user->isSuperAdmin();
        }

        // Fallback for legacy or different guard users
        return ($user->user_type === 'super_admin' || ($user->role && $user->role->level === 'super_admin'));
    }

    /**
     * Helper: detect admin (either super admin or company admin)
     */
    private function userIsAdmin($user): bool
    {
        return $this->userIsSuperAdmin($user) || $this->userIsCompanyAdmin($user);
    }

    /**
     * Helper: detect company admin
     */
    private function userIsCompanyAdmin($user): bool
    {
        if (!$user) return false;
        if ($user instanceof Company) return true;
        
        return (
            (isset($user->user_type) && $user->user_type === 'company_admin') ||
            ($user->role && $user->role->level === 'company_admin') ||
            (isset($user->is_company_admin) && $user->is_company_admin)
        );
    }

    /**
     * Helper: detect branch admin
     */
    private function userIsBranchAdmin($user): bool
    {
        if (!$user) return false;
        
        return (
            (isset($user->user_type) && in_array($user->user_type, ['branch_admin', 'section_admin'])) ||
            ($user->role && $user->role->level === 'branch_admin') ||
            (isset($user->is_branch_admin) && $user->is_branch_admin)
        );
    }
        
    public function index(Request $request)
    {
        $query = Product::query();

        // Apply multi-tenancy filters based on user type and request parameters
        // Products are company-wide: all users in a company can see all company products
        $user = $this->getAuthenticatedUser();

        if (!$user) {
            abort(401, 'User not authenticated.');
        }

        if (!$user->hasPermission('products.view')) {
             return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view products.');
        }
        
        // Get company and section filters. Non-super admins are strictly locked to their own company/section.
        $companyCode = $user->company_code;
        $sectionCode = $user->section_code;

        if ($user->isSuperAdmin()) {
            $companyCode = $request->query('company_code', $companyCode);
            $sectionCode = $request->query('section_code', $sectionCode);
        }
        
        // Check if this is a malibo route
        $isMaliboRoute = $request->route() && str_contains($request->route()->getName(), 'malibo.');
        
        // Join with reorder_levels to get section-specific reorder level (must be done before WHERE)
        if (!$this->userIsSuperAdmin($user) && $sectionCode && !$isMaliboRoute) {
            $query->leftJoin('reorder_levels', function($join) use ($companyCode, $sectionCode) {
                $join->on('itemmaster.ItemCode', '=', 'reorder_levels.item_code')
                     ->where('reorder_levels.company_code', '=', $companyCode)
                     ->where('reorder_levels.section_code', '=', $sectionCode);
            })
            // alias to "branch_reorder_level" so the frontend code can consume it directly
            ->select('itemmaster.*', 'reorder_levels.reorder_level as branch_reorder_level');
        } else {
            $query->select('itemmaster.*')
                  ->selectRaw('NULL as branch_reorder_level');
        }
        
        // Apply filters based on route type
        // Apply filters based on permissions and sharing
        if (!$this->userIsSuperAdmin($user)) {
            $userBusinessUnit = $this->getUserBusinessUnit($user);
            
            $query->where(function($q) use ($companyCode, $sectionCode, $userBusinessUnit) {
                // 1. Standard Ownership: User's Company AND User's Section
                $q->where(function($sub) use ($companyCode, $sectionCode) {
                    $sub->where('itemmaster.company_code', $companyCode);
                    if ($sectionCode) {
                         // Use the scope but on the sub-builder
                         $sub->whereJsonContains('available_sections', $sectionCode);
                    }
                })
                // 2. Shared Business Unit Access
                ->orWhereJsonContains('available_business_units', $userBusinessUnit);
            });
        }
        
        // Exclude printers from product list (they have their own dedicated page)
        $query->where('itemmaster.ItemCode', 'NOT LIKE', 'PRN-%');
        
        // Handle search parameter
        if ($request->filled('search')) {
            $searchTerm = $request->get('search');
            $query->where(function($q) use ($searchTerm) {
                $q->where('itemmaster.ItmNm', 'like', '%' . $searchTerm . '%')
                  ->orWhere('itemmaster.ItemCode', 'like', '%' . $searchTerm . '%')
                  ->orWhere('itemmaster.BarCode', 'like', '%' . $searchTerm . '%');
            });
        }
        
        // Handle barcode parameter
        if ($request->filled('barcode')) {
            $barcodeTerm = $request->get('barcode');
            $query->where('itemmaster.BarCode', 'like', '%' . $barcodeTerm . '%');
        }
        
        // Calculate stats based on search/barcode filters, but BEFORE status filter
        // This ensures stats reflect the search results while still showing status distribution
        $stats = [
            'total' => (clone $query)->count(),
            'active' => (clone $query)->where('itemmaster.fInAct', false)->count(),
            'inactive' => (clone $query)->where('itemmaster.fInAct', true)->count(),
            'with_barcode' => (clone $query)->whereNotNull('itemmaster.BarCode')->where('itemmaster.BarCode', '!=', '')->count(),
            'vat_items' => (clone $query)->where('itemmaster.VATItem', true)->count(),
            'services' => (clone $query)->where('itemmaster.is_service', true)->count(),
        ];

        // Handle status filter
        if ($request->filled('status')) {
            $status = $request->get('status');
            if ($status === 'active') {
                $query->where('itemmaster.fInAct', false); // false = active
            } elseif ($status === 'inactive') {
                $query->where('itemmaster.fInAct', true); // true = inactive
            }
        }

        // Handle is_service filter
        if ($request->filled('is_service')) {
            $isService = $request->get('is_service');
            if ($isService === 'yes') {
                $query->where('itemmaster.is_service', true);
            } elseif ($isService === 'no') {
                $query->where('itemmaster.is_service', false);
            }
        }
        
        $perPage = $request->input('per_page', 10);
        $items = $query->with(['brand:id,name'])->paginate($perPage)->withQueryString();
        
        // Get categories for filter dropdown
        $categories = DB::table('code_masters')
            ->where('conkey', 'CAT')
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->where('company_code', $user->company_code)
            ->select('catkey as id', 'cname as name')
            ->orderBy('cname')
            ->get();
        
        // Determine which view to render based on route
        $viewPath = $isMaliboRoute ? 'malibo/products/index' : 'pos/products/index';
        
        return Inertia::render($viewPath, [ 
            'items' => $items,
            'stats' => $stats,
            'categories' => $categories,
            'filters' => $request->only(['search', 'status', 'barcode', 'company_code', 'section_code', 'per_page', 'is_service']),
            'canDelete' => $this->canDeleteProduct() && !$isMaliboRoute, // Malibo users cannot delete products
            'canManage' => false, // Malibo users cannot manage products (read-only)
            'ziggy' => array_merge((new Ziggy)->toArray(), ['location' => url()->current()]),
        ]);
    }

    public function show($id)
    {
        // load related brand and all price details so view can display them
        $item = Product::with(['brand', 'allPriceDetails', 'purchaseDetails'])->findOrFail($id);
        
        // Check if user can access this product
        $user = $this->getAuthenticatedUser();
        if (!$user) abort(401, 'User not authenticated.');

        if (!$user->hasPermission('products.view')) {
            return redirect()->back()->with('error', 'You are not allowed to view products.');
        }

        if (!$this->canAccessProduct($item)) {
            return redirect()->back()->with('error', 'You are not allowed to load this product.');
        }
        
        $user = $this->getAuthenticatedUser();

        if (!$user) {
            abort(401, 'User not authenticated.');
        }
        
        // Get suppliers for the company - show all suppliers for product viewing
        $suppliersQuery = Address::where('company_code', $user->company_code)
            ->whereIn('AdrTypKy', [4, 5]);
        
        // For show method, always show all company suppliers (no section filtering)
        // This ensures the product's assigned supplier is always visible
        
        $suppliers = $suppliersQuery->select('AdrKy', 'FstNm', 'LstNm', 'AdrCd', 'section_code')
            ->orderBy('FstNm')
            ->get()
            ->map(function ($supplier) {
                return [
                    'AdrKy' => $supplier->AdrKy,
                    'AccKy' => $supplier->AdrKy,
                    'full_name' => trim($supplier->FstNm . ' ' . $supplier->LstNm),
                    'FstNm' => $supplier->FstNm,
                    'id' => $supplier->AdrKy,
                    'name' => trim($supplier->FstNm . ' ' . $supplier->LstNm),
                    'section_code' => $supplier->section_code,
                ];
            });
        
        // also send category and unit lists so show page can render readable names
        $categories = DB::table('code_masters')
            ->where('conkey', 'CAT')
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->where('company_code', $user->company_code)
            ->select('catkey as id', 'cname as name')
            ->orderBy('cname')
            ->get();

        $units = DB::table('code_masters')
            ->where('conkey', 'UNT')
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->where('company_code', $user->company_code)
            ->select('id', 'cname as name')
            ->orderBy('cname')
            ->get();

        return Inertia::render('pos/products/show', [
            'item' => $item,
            'suppliers' => $suppliers,
            'categories' => $categories,
            'units' => $units,
            'canDelete' => $this->canDeleteProduct(),
            'canManage' => $this->canManageProducts(),
        ]);
    }

    public function create()
    {
        $user = $this->getAuthenticatedUser();
        if (!$user) abort(401, 'User not authenticated.');

        // Check if user can create products
        if (!$user->hasPermission('products.create')) {
            return redirect()->back()->with('error', 'You are not allowed to create new products.');
        }

        /** @var \App\Models\User $user */
        $user = $this->getAuthenticatedUser();

        if (!$user) {
            abort(401, 'User not authenticated.');
        }

        // Get categories
        $categories = DB::table('code_masters')
            ->where('conkey', 'CAT')
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->where('company_code', $user->company_code)
            ->select('catkey as id', 'cname as name')
            ->orderBy('cname')
            ->get();

        // Get suppliers
        $suppliersQuery = DB::table('acc_mas')
            ->where('AccTyp', 'SUPPLIER')
            ->where('Status', 'A')
            ->where('company_code', $user->company_code);

        // Section admins can only see suppliers from their own section
        if ($this->userIsBranchAdmin($user)) {
            $suppliersQuery->where('section_code', $user->section_code);
        }

        $suppliers = $suppliersQuery->select('AccKy as id', 'AccNm as name')
            ->orderBy('AccNm')
            ->get();

        // Get units
        $units = DB::table('code_masters')
            ->where('conkey', 'UNT')
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->where('company_code', $user->company_code)
            ->select('id', 'cname as name')
            ->orderBy('cname')
            ->get();

        Log::info('Units being passed to create view:', [
            'count' => $units->count(),
            'units' => $units->toArray()
        ]);

        $nextItemCode = $this->generateNextItemCode();

        return Inertia::render('pos/products/create', [
            'categories' => $categories,
            'suppliers' => $suppliers,
            'units' => $units,
            'nextItemCode' => $nextItemCode,
        ]);
    }

    public function store(Request $request)
    {
        $user = $this->getAuthenticatedUser();
        if (!$user) abort(401, 'User not authenticated.');

        // Check if user can create products
        if (!$user->hasPermission('products.create')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to create products.');
        }
        $validator = Validator::make($request->all(), [
            'fInAct' => 'nullable|boolean',
            'Status' => 'nullable|string|max:50',
            // company_code and section_code will be set automatically from authenticated user
            'company_code' => 'nullable|string|max:50',
            'section_code' => 'nullable|string|max:50',
            'ItmKy' => 'nullable|integer',
            'ItemCode' => 'nullable|string|max:50|unique:itemmaster,ItemCode',
            'BarCode' => 'nullable|string|max:100',
            'batch_no' => 'nullable|string|max:100',
            'brand_id' => 'nullable|integer|exists:brands,id',
            'models_id' => 'nullable|integer|exists:models,id',
            'serial_number' => 'nullable|string|max:100',
            'warranty' => 'nullable|string|max:100',
            'ItmNm' => 'required|string|max:100',
            'catkey' => 'nullable|string',
            'UnitKy' => 'nullable|integer|exists:code_masters,id',
            'CosPri' => 'nullable|numeric',
            'VehicleSalePrice' => 'nullable|numeric',
            'ReOrdlLvl' => 'nullable|integer',
            'SupKey' => 'nullable|integer',
            'RtQty1' => 'nullable|integer',
            'RtDis1' => 'nullable|numeric',
            'RtQty2' => 'nullable|integer',
            'RtDis2' => 'nullable|numeric',

            'CredQty1' => 'nullable|integer',
            'CredDis1' => 'nullable|numeric',
            'CredQty2' => 'nullable|integer',
            'CredDis2' => 'nullable|numeric',
            'SlsPri' => 'nullable|numeric',
            'VATItem' => 'nullable|boolean',
            'free_issue_scheme_buy_qty' => 'nullable|integer|min:1',
            'free_issue_scheme_get_qty' => 'nullable|integer|min:1',

            'transfer_unit_id' => 'nullable|integer|exists:code_masters,id',
            'receiving_unit_id' => 'nullable|integer|exists:code_masters,id',
            'transfer_conversion_factor' => 'nullable|numeric|min:0.0001',
            'is_service' => 'nullable|boolean',
            'RtDisType1' => 'nullable|string|in:fixed,percentage',
        ]);

        if ($validator->fails()) {
            return redirect()->back()
                ->withErrors($validator)
                ->withInput();
        }

        // Get authenticated user
        $user = $this->getAuthenticatedUser();

        if (!$user) {
            abort(401, 'User not authenticated.');
        }

        $targetCompanyCode = $user->company_code;

        // Optional: Check package limits if packageDetails relationship exists
        // Commented out for now as the relationship doesn't exist yet
        // if ($targetCompanyCode) {
        //     $company = \App\Models\Company::where('company_code', $targetCompanyCode)->first();
        //     if ($company && method_exists($company, 'packageDetails') && $company->packageDetails) {
        //         $currentProducts = Product::where('company_code', $targetCompanyCode)->count();
        //         $maxProducts = $company->packageDetails->max_products;
        //         
        //         if ($currentProducts >= $maxProducts) {
        //              return redirect()->back()
        //                 ->withErrors(['error' => "You have reached the maximum number of products allowed for your package ({$maxProducts}). Please upgrade your package to add more products."])
        //                 ->withInput();
        //         }
        //     }
        // }

        try {
            DB::beginTransaction();

            $data = $validator->validated();

            // Never trust a client-supplied PK on create — strip it to let the DB assign one
            unset($data['ItmKy']);

            // ensure conversion factor is never null (database default = 1)
            if (!isset($data['transfer_conversion_factor']) || $data['transfer_conversion_factor'] === null) {
                $data['transfer_conversion_factor'] = 1;
            }

            // Products are company-wide: all sections can see company products
            // But we track which section created it for audit purposes
            $data['company_code'] = $user->company_code;
            $data['section_code'] = $data['section_code'] ?? $user->section_code;

            // If section_code is still null (e.g. company admin), find a default section
            if (empty($data['section_code'])) {
                $defaultSection = Section::where('company_code', $user->company_code)
                    ->orderBy('is_main_stock', 'desc') // Prefer main stock
                    ->orderBy('id', 'asc') // Then oldest
                    ->first();
                
                if ($defaultSection) {
                    $data['section_code'] = $defaultSection->section_code;
                } else {
                    // Fallback if absolutely no section exists (should not happen in prod)
                    throw new \Exception('No sections found for this company. Please create a section first.');
                }
            }

            // Set available sections to include the section code
            $data['available_sections'] = [$data['section_code']];

            // Default available_business_units based on creating user's company (so MAL company products are visible in Malibo)
            if (!isset($data['available_business_units']) || empty($data['available_business_units'])) {
                if (!empty($user->company_code) && str_starts_with(strtoupper($user->company_code), 'MAL')) {
                    $data['available_business_units'] = ['malibo'];
                    // Check if sharing with Vismass is requested
                    if ($request->boolean('share_with_other_unit')) {
                        $data['available_business_units'][] = 'vismass';
                    }
                } else {
                    $data['available_business_units'] = ['vismass'];
                    // Check if sharing with Malibo is requested
                    if ($request->boolean('share_with_other_unit')) {
                        $data['available_business_units'][] = 'malibo';
                    }
                }
            }

            // Generate barcode if not provided
            if (empty($data['BarCode'])) {
                $numberGenerator = app(NumberGeneratorService::class);
                $data['BarCode'] = $numberGenerator->generate('product_barcode', $data['company_code'], $data['section_code']);
            }

            // Generate ItemCode if not provided
            if (empty($data['ItemCode'])) {
                $data['ItemCode'] = $this->generateNextItemCode();
            }

            // Mark as Insert (I) and set item type to product
            $data['Status'] = 'I';
            $data['item_type'] = 'product'; // Explicitly mark as product

            $product = Product::create($data);

            // Always save price details to item_price_det table when creating a product with Status 'I'
            $this->savePriceDetails($product, $data, 'I');

            // Sync the selling (and cost) price back to purchase_det for the selected batch, if any
            if (!empty($data['batch_no'])) {
                $this->updatePurchaseDetPricesForBatch($product, $data['batch_no'], $data);
            }

            DB::commit();

            // Generate barcode print batch for the new product
            $batch = $this->generateBarcodePrintBatch($product);

            // Redirect back to create page with success message
            return redirect()->back()->with('success', 'Item created successfully! Ready for next entry.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Product creation error: ' . $e->getMessage());
            return redirect()->back()
                ->withErrors(['error' => 'Error occurred while creating item: ' . $e->getMessage()])
                ->withInput();
        }
    }

    /**
     * Quick create a product (streamlined version for GRN entry)
     */
    public function quickCreate(Request $request)
    {
        $user = $this->getAuthenticatedUser();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'User not authenticated.'], 401);
        }

        // Check if user can create products
        if (!$user->hasPermission('products.create')) {
            return response()->json(['success' => false, 'message' => 'Unauthorized. You do not have permission to create products.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'ItemCode' => 'required|string|max:50|unique:itemmaster,ItemCode',
            'ItmNm' => 'required|string|max:100',
            'catkey' => 'required|string',
            'brand_id' => 'nullable|integer|exists:brands,id',
            'models_id' => 'nullable|integer|exists:models,id',
            'BarCode' => 'nullable|string|max:100',
            'CosPri' => 'required|numeric',
            'SlsPri' => 'required|numeric',
            'UnitKy' => 'nullable|integer|exists:code_masters,id',
            'serial_number' => 'nullable|string|max:100',
            'model' => 'nullable|string|max:100',
            'warranty' => 'nullable|string|max:100',
            'VATItem' => 'nullable|boolean',
            'SupKey' => 'nullable|integer',
            'transfer_unit_id' => 'nullable|integer|exists:code_masters,id',
            'receiving_unit_id' => 'nullable|integer|exists:code_masters,id',
            'transfer_conversion_factor' => 'nullable|numeric|min:0.0001',
            'is_service' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false, 
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            $data = $validator->validated();

            // ensure conversion factor is never null (database default = 1)
            if (!isset($data['transfer_conversion_factor']) || $data['transfer_conversion_factor'] === null) {
                $data['transfer_conversion_factor'] = 1;
            }

            // Set company and section codes
            $data['company_code'] = $user->company_code;
            
            // Use user's section for products
            $data['section_code'] = $user->section_code;

            if (empty($data['section_code'])) {
                $defaultSection = Section::where('company_code', $user->company_code)
                    ->orderBy('is_main_stock', 'desc')
                    ->orderBy('id', 'asc')
                    ->first();
                
                if ($defaultSection) {
                    $data['section_code'] = $defaultSection->section_code;
                } else {
                    throw new \Exception('No sections found for this company. Please create a section first.');
                }
            }

            // Set available sections to include the section code
            $data['available_sections'] = [$data['section_code']];

            // Default available_business_units based on creating user's company
            if (!isset($data['available_business_units']) || empty($data['available_business_units'])) {
                if (!empty($user->company_code) && str_starts_with(strtoupper($user->company_code), 'MAL')) {
                    $data['available_business_units'] = ['malibo'];
                } else {
                    $data['available_business_units'] = ['vismass'];
                }
            }

            // Generate barcode if not provided
            if (empty($data['BarCode'])) {
                $numberGenerator = app(NumberGeneratorService::class);
                $data['BarCode'] = $numberGenerator->generate('product_barcode', $data['company_code'], $data['section_code']);
            }

            // Set defaults
            $data['Status'] = 'I';  // Insert status
            $data['fInAct'] = false;  // Active

            $product = Product::create($data);

            // Save price details
            $this->savePriceDetails($product, $data, 'I');

            // Sync purchase_det pricing for the selected batch (if any)
            if (!empty($data['batch_no'])) {
                $this->updatePurchaseDetPricesForBatch($product, $data['batch_no'], $data);
            }

            DB::commit();

            // Return product data in format compatible with frontend
            // Load brand relationship if needed
            if ($product->brand_id) {
                $product->load('brand');
            }

            return response()->json([
                'success' => true,
                'message' => 'Product created successfully',
                'product' => [
                    'id' => (int) $product->ItmKy,
                    'code' => $product->ItemCode,
                    'name' => $product->ItmNm,
                    'barcode' => $product->BarCode,
                    'category_id' => $product->catkey,
                    'cost_price' => (float) ($product->CosPri ?? 0),
                    'retail_price' => (float) ($product->SlsPri ?? 0),
                    'extra_price' => (float) ($product->VehicleSalePrice ?? 0),
                    'current_stock' => 0,
                    'free_stock' => 0,
                    'serial_number' => $product->serial_number ?? '',
                    'warranty' => $product->warranty ?? '',
                    'brand' => $product->brand ? $product->brand->name : '',
                    'model' => $product->model ? $product->model->name : '',
                    'sup_key' => $product->SupKey ? (int)$product->SupKey : null,
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Quick product creation error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error occurred while creating product: ' . $e->getMessage()
            ], 500);
        }
    }

    public function savePriceDetails($product, $data, $status = null)
    {
        try {
            // Filter out product-specific fields that don't belong in item_price_det table
            $priceData = collect($data)->except([
                'brand_id', 'models_id', 'warranty',
                'ItmNm', 'catkey', 'category_name', 'UnitKy', 'Unit', 
                'SupKey', 'supplier_name', 'ReOrdlLvl', 'keep_price', 
                'selectedPriceHistoryId',
                'transfer_unit_id', 'receiving_unit_id', 'transfer_conversion_factor',
            ])->toArray();
            
            // Re-add serial_number to price data explicitly if it exists in item
            $priceData['serial_number'] = $data['serial_number'] ?? $item->serial_number ?? null;
            $user = $this->getAuthenticatedUser();
            
            // Allow section_code to be passed in data, otherwise fallback to item's section, user's section, or find default
            $sectionCode = $data['section_code'] ?? $product->section_code ?? $user->section_code;
            
            if (empty($sectionCode)) {
                $defaultSection = Section::where('company_code', $user->company_code)
                    ->orderBy('is_main_stock', 'desc')
                    ->first();
                $sectionCode = $defaultSection ? $defaultSection->section_code : null;
            }

            ItemPriceDet::create([
                'fInAct' => $priceData['fInAct'] ?? false,
                'Status' => $status ?? $priceData['Status'] ?? null,
                'CKey' => $priceData['CKey'] ?? 0,
                'ItmKy' => $product->ItmKy,
                'batch_no' => $data['batch_no'] ?? 'DEFAULT',
                'serial_number' => $data['serial_number'] ?? $product->serial_number ?? null,
                'warranty' => $data['warranty'] ?? $product->warranty ?? null,
                'company_code' => $user->company_code,
                'section_code' => $sectionCode,
                'CosPri' => $priceData['CosPri'] ?? null,
                'SlsPri' => $priceData['SlsPri'] ?? null,
                'RtQty1' => $priceData['RtQty1'] ?? 0,
                'RtDis1' => $priceData['RtDis1'] ?? 0,
                'RtQty2' => $priceData['RtQty2'] ?? 0,
                'RtDis2' => $priceData['RtDis2'] ?? 0,

                'CredQty1' => $priceData['CredQty1'] ?? 0,
                'CredQty2' => $priceData['CredQty2'] ?? 0,

                'CredDis1' => $priceData['CredDis1'] ?? 0,
                'CredDis2' => $priceData['CredDis2'] ?? 0,
                'VehicleSalePrice' => $priceData['VehicleSalePrice'] ?? 0,
                'RtDisType1' => $priceData['RtDisType1'] ?? 'fixed',
                'ChangedDate' => now(),
            ]);

            Log::info('Price details saved successfully for ItmKy: ' . $product->ItmKy . ' with Status: ' . ($status ?? $data['Status'] ?? 'null'));
        } catch (\Exception $e) {
            Log::error('Failed to save price details: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Keep purchase detail pricing aligned with the batch-specific product price
     */
    private function updatePurchaseDetPricesForBatch($product, $batchNo, $data)
    {
        if (empty($batchNo) || empty($product->ItmKy)) {
            return;
        }

        $update = [];
        if (isset($data['SlsPri'])) {
            $update['SalePrice'] = $data['SlsPri'];
        }
        if (isset($data['CosPri'])) {
            $update['CostPrice'] = $data['CosPri'];
        }
        if (isset($data['VehicleSalePrice'])) {
            $update['VehicleSalePrice'] = $data['VehicleSalePrice'];
        }
        if (isset($data['RtDisType1'])) {
            $update['discount_type'] = $data['RtDisType1'];
        }

        if (empty($update)) {
            return;
        }

        try {
            DB::table('purchase_det')
                ->where('iTimKy', $product->ItmKy)
                ->where('company_code', $product->company_code)
                ->where('batch_no', $batchNo)
                ->update($update);

            Log::info('Updated purchase_det prices for ItmKy: ' . $product->ItmKy . ' batch_no: ' . $batchNo);
        } catch (\Exception $e) {
            Log::warning('Failed to update purchase_det prices for ItmKy: ' . $product->ItmKy . ' batch_no: ' . $batchNo . ' - ' . $e->getMessage());
        }
    }

    public function edit($id)
    {
        $item = Product::findOrFail($id);

        $user = $this->getAuthenticatedUser();
        if (!$user) abort(401, 'User not authenticated.');

        // Check if user can access and edit this product
        if (!$this->canAccessProduct($item)) {
             return redirect()->back()->with('error', 'You are not allowed to access this product.');
        }

        if (!$user->hasPermission('products.edit')) {
            return redirect()->back()->with('error', 'You are not allowed to edit products.');
        }

        $user = $this->getAuthenticatedUser();

        if (!$user) {
            abort(401, 'User not authenticated.');
        }

        // Get categories
        $categories = DB::table('code_masters')
            ->where('conkey', 'CAT')
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->where('company_code', $user->company_code)
            ->select('catkey as id', 'cname as name')
            ->orderBy('cname')
            ->get();

        // Get suppliers
        $suppliersQuery = DB::table('acc_mas')
            ->where('AccTyp', 'SUPPLIER')
            ->where('Status', 'A')
            ->where('company_code', $user->company_code);

        // Section admins can only see suppliers from their own section
        if ($this->userIsBranchAdmin($user)) {
            // But always include the current product's supplier if it exists
            if ($item->SupKey) {
                $suppliersQuery->where(function($query) use ($user, $item) {
                    $query->where('section_code', $user->section_code)
                          ->orWhere('AccKy', $item->SupKey);
                });
            } else {
                $suppliersQuery->where('section_code', $user->section_code);
            }
        }

        $suppliers = $suppliersQuery->select('AccKy as id', 'AccNm as name')
            ->orderBy('AccNm')
            ->get();

        // Get units
        $units = DB::table('code_masters')
            ->where('conkey', 'UNT')
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->where('company_code', $user->company_code)
            ->select('id', 'cname as name')
            ->orderBy('cname')
            ->get();

        // Get price history for this item
        $priceHistory = DB::table('item_price_det')
            ->where('ItmKy', $item->ItmKy)
            ->orderBy('ChangedDate', 'desc')
            ->get();

        // Get branches for branch selection
        $branches = DB::table('sections')
            ->where('company_code', $user->company_code)
            ->where('is_active', true)
            ->select('id', 'section_code as branch_code', 'name')
            ->orderBy('name')
            ->get();

        return Inertia::render('pos/products/create', [
            'product' => $item,
            'priceHistory' => $priceHistory,
            'branches' => $branches,
            'suppliers' => $suppliers,
            'categories' => $categories,
            'units' => $units,
            'userBranchCode' => $user->section_code ?? '',
            'canViewAllBranches' => $this->userIsSuperAdmin($user) || $this->userIsAdmin($user),
            'canManageReorderLevels' => $this->canManageProducts(),
            'canDelete' => $this->canDeleteProduct(),
        ]);
    }

    public function search(Request $request)
    {
        $request->validate([
            'search_term' => 'required|string'
        ]);

        $query = Product::query();
        
        // Products are company-wide: non-superadmins are strictly locked to their own company
        $user = Auth::user();
        if (!$this->userIsSuperAdmin($user)) {
            $query->where('company_code', $user->company_code);
        } else {
            if ($request->filled('company_code')) {
                $query->where('company_code', $request->get('company_code'));
            }
        }

        $items = $query->with('category')
                      ->where('fInAct', false) // Only active products
                      ->where(function($q) use ($request) {
                          $q->where('ItemCode', $request->search_term)
                            ->orWhere('ItmNm', 'like', '%' . $request->search_term . '%')
                            ->orWhere('BarCode', $request->search_term);
                      })->get();

        if ($items->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'Item not found',
                'items' => []
            ], 200);
        }

        return response()->json([
            'success' => true,
            'items' => $items
        ]);
    }

    public function update(Request $request, $id)
    {
        $item = Product::findOrFail($id);
        
        $user = $this->getAuthenticatedUser();
        if (!$user) abort(401, 'User not authenticated.');
        
        // Check if user can access and update this product
        if (!$this->canAccessProduct($item)) {
             return redirect()->back()->with('error', 'You are not allowed to access this product.');
        }

        if (!$user->hasPermission('products.edit')) {
            return redirect()->back()->with('error', 'You are not allowed to edit products.');
        }

        $validator = Validator::make($request->all(), [
            'fInAct' => 'nullable|boolean',
            'Status' => 'nullable|string|max:50',
            'CKey' => 'nullable|integer',
            'company_code' => 'nullable|string|max:50',
            'section_code' => 'nullable|string|max:50',
            // company_code and section_code will be set automatically from authenticated user
            'ItemCode' => 'required|string|max:50|unique:itemmaster,ItemCode,' . $item->ItmKy . ',ItmKy',
            'BarCode' => 'nullable|string|max:100',
            'batch_no' => 'nullable|string|max:100',
            'brand_id' => 'nullable|integer|exists:brands,id',
            'models_id' => 'nullable|integer|exists:models,id',
            'serial_number' => 'nullable|string|max:100',
            'ItmNm' => 'required|string|max:100',
            'catkey' => 'nullable|string|exists:code_masters,catkey',
            'ItmRefKy' => 'nullable|integer',
            'UnitKy' => 'nullable|integer|exists:code_masters,id',
            'CosPri' => 'nullable|numeric',
            'VehicleSalePrice' => 'nullable|numeric',
            'ReOrdlLvl' => 'nullable|integer',
            'SupKey' => 'nullable|integer',
            'RtQty1' => 'nullable|integer',
            'RtDis1' => 'nullable|numeric',
            'RtQty2' => 'nullable|integer',
            'RtDis2' => 'nullable|numeric',

            'CredQty1' => 'nullable|integer',
            'CredDis1' => 'nullable|numeric',
            'CredQty2' => 'nullable|integer',
            'CredDis2' => 'nullable|numeric',
            'SlsPri' => 'nullable|numeric',
            'VATItem' => 'nullable|boolean',
            'keep_price' => 'nullable|boolean',
            'selectedPriceHistoryId' => 'nullable|integer|exists:item_price_det,ItemPriceKey',
            'free_issue_scheme_buy_qty' => 'nullable|integer|min:1',
            'free_issue_scheme_get_qty' => 'nullable|integer|min:1',
            'is_service' => 'nullable|boolean',
            'RtDisType1' => 'nullable|string|in:fixed,percentage',

            'transfer_unit_id' => 'nullable|integer|exists:code_masters,id',
            'receiving_unit_id' => 'nullable|integer|exists:code_masters,id',
            'transfer_conversion_factor' => 'nullable|numeric|min:0.0001',
        ]);

        if ($validator->fails()) {
            return redirect()->back()
                ->withErrors($validator)
                ->withInput();
        }

        try {
            DB::beginTransaction();

            $data = $validator->validated();
            $keepPrice = $data['keep_price'] ?? false;
            $selectedPriceHistoryId = $data['selectedPriceHistoryId'] ?? null;
            unset($data['keep_price'], $data['selectedPriceHistoryId']);
            
            $user = $this->getAuthenticatedUser();

            if (!$user) {
                abort(401, 'User not authenticated.');
            }

            // Automatically set company_code and section_code from authenticated user
            $data['company_code'] = $user->company_code;
            $data['section_code'] = $data['section_code'] ?? $user->section_code;

            // If section_code is still null (e.g. company admin), find a default section
            if (empty($data['section_code'])) {
                // Try to use existing product's section code
                if (!empty($item->section_code)) {
                    $data['section_code'] = $item->section_code;
                } else {
                    $defaultSection = Section::where('company_code', $user->company_code)
                        ->orderBy('is_main_stock', 'desc')
                        ->orderBy('id', 'asc')
                        ->first();
                    
                    if ($defaultSection) {
                        $data['section_code'] = $defaultSection->section_code;
                    }
                }
            }

            // Set available sections to include the section code
            $data['available_sections'] = [$data['section_code']];
            
            // Handle sharing update
            if ($request->has('share_with_other_unit')) {
                $currentUnits = $item->available_business_units ?? [];
                $shouldShare = $request->boolean('share_with_other_unit');
                
                $userUnit = 'vismass';
                $otherUnit = 'malibo';
                
                if (!empty($user->company_code) && str_starts_with(strtoupper($user->company_code), 'MAL')) {
                    $userUnit = 'malibo';
                    $otherUnit = 'vismass';
                }
                
                // Ensure user's own unit is always present if it wasn't already (data integrity)
                if (!in_array($userUnit, $currentUnits)) {
                    $currentUnits[] = $userUnit;
                }
                
                if ($shouldShare) {
                    if (!in_array($otherUnit, $currentUnits)) {
                        $currentUnits[] = $otherUnit;
                    }
                } else {
                    // Remove other unit
                    $currentUnits = array_values(array_filter($currentUnits, function($unit) use ($otherUnit) {
                        return $unit !== $otherUnit;
                    }));
                }
                
                $data['available_business_units'] = $currentUnits;
            }
            
            $data['Status'] = 'U'; // 'U' for Update operation

            // Check if any price-related fields or discount fields have changed
            $priceFields = ['CosPri', 'SlsPri', 'WholePrice', 'VehicleSalePrice'];
            $discountFields = ['RtQty1', 'RtDis1', 'RtQty2', 'RtDis2', 'CredQty1', 'CredDis1', 'CredQty2', 'CredDis2'];
            $priceOrDiscountChanged = false;

            // First check if it differs from the existing batch price
            if (!empty($data['batch_no'])) {
                $existingBatchPrice = ItemPriceDet::where('ItmKy', $item->ItmKy)
                    ->where('batch_no', $data['batch_no'])
                    ->orderBy('ChangedDate', 'desc')
                    ->first();
                
                if ($existingBatchPrice) {
                    foreach (array_merge($priceFields, $discountFields) as $field) {
                        if (isset($data[$field]) && $data[$field] != $existingBatchPrice->$field) {
                            $priceOrDiscountChanged = true;
                            break;
                        }
                    }
                } else {
                    $priceOrDiscountChanged = true; // New batch record needed
                }
            }

            // Fallback to checking against itemmaster if still not changed (or no batch)
            if (!$priceOrDiscountChanged) {
                // Check price fields
                foreach ($priceFields as $field) {
                    if (isset($data[$field]) && $data[$field] != $item->$field) {
                        $priceOrDiscountChanged = true;
                        break;
                    }
                }
                
                // Check discount fields if price fields haven't changed
                if (!$priceOrDiscountChanged) {
                    foreach ($discountFields as $field) {
                        if (isset($data[$field]) && $data[$field] != $item->$field) {
                            $priceOrDiscountChanged = true;
                            break;
                        }
                    }
                }
            }

            // Always update the main product record, but exclude pricing if updating a specific batch
            $itemData = $data;
            if (!empty($data['batch_no'])) {
                foreach (array_merge($priceFields, $discountFields) as $field) {
                    unset($itemData[$field]);
                }
            }
            $item->update($itemData);

            if ($priceOrDiscountChanged) {
                if ($selectedPriceHistoryId) {
                    // A specific price history record is selected for editing - update only that record
                    $selectedPriceRecord = ItemPriceDet::where('ItemPriceKey', $selectedPriceHistoryId)
                        ->where('ItmKy', $item->ItmKy)
                        ->first();
                    
                    if ($selectedPriceRecord) {
                        // Update the selected price history record and mark as updated
                        $selectedPriceRecord->update([
                            'Status' => 'U',
                            'batch_no' => $data['batch_no'] ?? $selectedPriceRecord->batch_no,
                            'serial_number' => $data['serial_number'] ?? $selectedPriceRecord->serial_number,
                            'CosPri' => $data['CosPri'] ?? $selectedPriceRecord->CosPri,
                            'SlsPri' => $data['SlsPri'] ?? $selectedPriceRecord->SlsPri,
                            'VehicleSalePrice' => $data['VehicleSalePrice'] ?? $selectedPriceRecord->VehicleSalePrice,
                            'RtQty1' => $data['RtQty1'] ?? $selectedPriceRecord->RtQty1,
                            'RtDis1' => $data['RtDis1'] ?? $selectedPriceRecord->RtDis1,
                            'RtQty2' => $data['RtQty2'] ?? $selectedPriceRecord->RtQty2,
                            'RtDis2' => $data['RtDis2'] ?? $selectedPriceRecord->RtDis2,

                            'CredQty1' => $data['CredQty1'] ?? $selectedPriceRecord->CredQty1,
                            'CredQty2' => $data['CredQty2'] ?? $selectedPriceRecord->CredQty2,

                            'CredDis1' => $data['CredDis1'] ?? $selectedPriceRecord->CredDis1,
                            'CredDis2' => $data['CredDis2'] ?? $selectedPriceRecord->CredDis2,
                            'RtDisType1' => $data['RtDisType1'] ?? $selectedPriceRecord->RtDisType1 ?? 'fixed',
                            'ChangedDate' => now(),
                        ]);
                        Log::info('Updated selected price history record for ItmKy: ' . $item->ItmKy . ' with ItemPriceKey: ' . $selectedPriceHistoryId . ' and Status: U');
                    } else {
                        // Selected record not found or doesn't belong to this item
                        Log::warning('Selected price history record not found or invalid for ItmKy: ' . $item->ItmKy . ' with ItemPriceKey: ' . $selectedPriceHistoryId);
                        return redirect()->back()
                            ->withErrors(['error' => 'Selected price record not found. Please try again.'])
                            ->withInput();
                    }
                } elseif ($keepPrice) {
                    // Keep price checked: Create NEW record in item_price_det with Status 'U' for history
                    $this->savePriceDetails($item, $data, 'U');
                    Log::info('Keep price checked - Created new price record for ItmKy: ' . $item->ItmKy . ' with Status: U');
                } else {
                    // Keep price NOT checked: Update the latest price record for the SPECIFIC batch in item_price_det (if exists)
                    $existingPriceRecord = ItemPriceDet::where('ItmKy', $item->ItmKy)
                        ->where('batch_no', $data['batch_no'] ?? 'DEFAULT')
                        ->orderBy('ChangedDate', 'desc')
                        ->first();
                    
                    if ($existingPriceRecord) {
                        // Update the existing record and set Status to 'U'
                        $existingPriceRecord->update([
                            'Status' => 'U',
                            'batch_no' => $data['batch_no'] ?? $existingPriceRecord->batch_no,
                            'serial_number' => $data['serial_number'] ?? $existingPriceRecord->serial_number,
                            'CosPri' => $data['CosPri'] ?? $existingPriceRecord->CosPri,
                            'SlsPri' => $data['SlsPri'] ?? $existingPriceRecord->SlsPri,
                            'VehicleSalePrice' => $data['VehicleSalePrice'] ?? $existingPriceRecord->VehicleSalePrice,
                            'RtQty1' => $data['RtQty1'] ?? $existingPriceRecord->RtQty1,
                            'RtDis1' => $data['RtDis1'] ?? $existingPriceRecord->RtDis1,
                            'RtQty2' => $data['RtQty2'] ?? $existingPriceRecord->RtQty2,
                            'RtDis2' => $data['RtDis2'] ?? $existingPriceRecord->RtDis2,

                            'CredQty1' => $data['CredQty1'] ?? $existingPriceRecord->CredQty1,
                            'CredQty2' => $data['CredQty2'] ?? $existingPriceRecord->CredQty2,

                            'CredDis1' => $data['CredDis1'] ?? $existingPriceRecord->CredDis1,
                            'CredDis2' => $data['CredDis2'] ?? $existingPriceRecord->CredDis2,
                            'RtDisType1' => $data['RtDisType1'] ?? $existingPriceRecord->RtDisType1 ?? 'fixed',
                            'ChangedDate' => now(),
                        ]);
                        Log::info('Keep price NOT checked - Updated latest price record for ItmKy: ' . $item->ItmKy . ' with Status: U');
                    } else {
                        // No existing record, create one with Status 'U'
                        $this->savePriceDetails($item, $data, 'U');
                        Log::info('Keep price NOT checked - No existing record, created new one for ItmKy: ' . $item->ItmKy . ' with Status: U');
                    }
                }

                // If batch_no is provided, sync selling price (and cost) back to purchase_det for that batch
                if (!empty($data['batch_no'])) {
                    $this->updatePurchaseDetPricesForBatch($item, $data['batch_no'], $data);
                }
            }

            DB::commit();

            // Redirect based on whether a specific price history was updated
            if ($selectedPriceHistoryId) {
                return redirect()->route('pos.products.edit', $item->ItmKy)->with('success', 'Price Updated Successfully.');
            } else {
                return redirect()->back()->with('success', 'Item Updated Successfully.');
            }
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Product update error: ' . $e->getMessage());
            return redirect()->back()
                ->withErrors(['error' => 'Error occurred while updating item: ' . $e->getMessage()])
                ->withInput();
        }
    }


    public function getItemDetails($itemCode)
    {
        $user = $this->getAuthenticatedUser();
        if (!$user) return response()->json(['error' => 'User not authenticated.'], 401);
        if (!$user->hasPermission('products.view')) return response()->json(['error' => 'Unauthorized'], 403);

        $companyCode = request()->query('company_code');
        
        $query = Product::where('ItemCode', $itemCode);
        
        // Products are company-wide: all users in a company can access all company products
        $user = $this->getAuthenticatedUser();
        if (!$this->userIsSuperAdmin($user)) {
            $companyCode = $companyCode ?: ($user->company_code ?? $user->company_code);
            $query->where('company_code', $companyCode);
        }
        
        $item = $query->leftJoin('code_masters', 'itemmaster.catkey', '=', 'code_masters.catkey')
            ->select(
                'itemmaster.*',
                'code_masters.cname as categoryName'
            )
            ->first();
        
        if (!$item) {
            return response()->json(['error' => 'Item not found'], 404);
        }
        
        return response()->json($item);
    }

    public function getItemCodesWithCategory()
    {
        try {
            $companyCode = request()->query('company_code');
            
            $query = DB::table('itemmaster as im')
                ->leftJoin('code_masters as cm', 'im.catkey', '=', 'cm.catkey')
                ->select(
                    'im.ItmKy as id',
                    'im.ItemCode as code',
                    'im.ItmNm as name',
                    'cm.cname as categoryName'
                )
                ->orderBy('im.ItmNm');

            // Apply multi-tenancy filters
            $user = $this->getAuthenticatedUser();
            if ($this->userIsSuperAdmin($user)) {
                // Super admin can see all products
            } elseif ($this->userIsCompanyAdmin($user)) {
                $query->where('im.company_code', $companyCode ?: ($user->company_code ?? $user->company_code));
            } else {
                $query->where('im.company_code', $companyCode ?: ($user->company_code ?? $user->company_code))
                      ->where('im.section_code', $user->section_code ?? $user->section_code);
            }
            
            $itemCodes = $query->orderBy('im.ItmNm')->get();

            return response()->json($itemCodes);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch item codes with category',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function getItemNames()
    {
        try {
            $user = $this->getAuthenticatedUser();
            $query = Product::select(
                'ItmKy as id',
                'ItmNm as name',
                'ItemCode as code'
            );

            if (!$this->userIsSuperAdmin($user)) {
                $query->where('company_code', $user->company_code ?? $user->company_code);
            }

            $itemNames = $query->orderBy('ItmNm')
                               ->get();

            return response()->json($itemNames);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch item names',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    // FIXED: Get suppliers where AdrTypKy = 4 (Local Supplier)


    public function getSuppliers(?Request $request = null)
    {
        try {
            $user = $this->getAuthenticatedUser();
            if (!$user) {
                return response()->json([
                    'error' => 'Authentication required',
                    'message' => 'You must be logged in to access this resource'
                ], 401);
            }

            $query = DB::table('acc_mas')
                ->where('AccTyp', 'SUPPLIER')
                ->where('Status', 'A');

            // Filter by company_code - all users need this
            if ($user->company_code) {
                $query->where('company_code', $user->company_code);
            }

            // Section admins can only see suppliers from their own section
            if ($this->userIsBranchAdmin($user)) {
                $query->where('section_code', $user->section_code);
            } elseif (!$this->userIsSuperAdmin($user) && !$this->userIsCompanyAdmin($user)) {
                // Other non-admin users also see only their section suppliers
                $query->where('section_code', $user->section_code);
            }
            
            // Allow filtering by section via request parameter for company/super admins
            if ($request && $request->query('section_code') && 
                ($this->userIsCompanyAdmin($user) || $this->userIsSuperAdmin($user))) {
                $query->where('section_code', $request->query('section_code'));
            }

            $suppliers = $query->select(
                    'AccKy as id',
                    'AccNm as name',
                    'AccKy'
                )
                ->orderBy('AccNm')
                ->get();

            return response()->json($suppliers);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch suppliers',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function getCategories()
    {
        try {
            $user = $this->getAuthenticatedUser();
            $categories = DB::table('code_masters')
                ->where('conkey', 'CAT')
                ->where('is_active', true)
                ->whereNull('deleted_at')
                ->where('company_code', $user->company_code)
                ->where('section_code', $user->section_code)
                ->select('catkey as id', 'cname as name')
                ->orderBy('cname')
                ->get();
            
            return response()->json($categories);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch categories',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function getUnits()
    {
        try {
            $user = $this->getAuthenticatedUser();

            if (!$user) {
                return response()->json(['error' => 'User not authenticated.'], 401);
            }

            $units = DB::table('code_masters')
                ->where('conkey', 'UNT') 
                ->where('is_active', true) 
                ->whereNull('deleted_at') 
                ->where('company_code', $user->company_code)
                ->select('id', 'cname as name', 'catkey')
                ->orderBy('cname')
                ->get();
            
            Log::info('Units fetched:', $units->toArray());
            
            return response()->json($units);
        } catch (\Exception $e) {
            Log::error('Failed to fetch units: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to fetch units',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function getBags()
    {
        try {
            $user = $this->getAuthenticatedUser();
            $bags = DB::table('code_masters')
                ->where('conkey', 'BAG')
                ->where('is_active', true)
                ->whereNull('deleted_at')
                ->where('company_code', $user->company_code)
                ->where('section_code', $user->section_code)
                ->select('id', 'cname as name', 'catkey')
                ->orderBy('cname')
                ->get();

            Log::info('Bags fetched:', $bags->toArray());

            return response()->json($bags);
        } catch (\Exception $e) {
            Log::error('Failed to fetch bags: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to fetch bags',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function getAllCategories()
    {
        try {
            $categories = DB::table('code_masters')
                ->where('conkey', 'CAT')
                ->select('catkey as id', 'cname as name', 'concode')
                ->orderBy('cname')
                ->get();
            
            return response()->json($categories);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch all categories',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function getBatches(Request $request)
    {
        $itemCode = $request->query('item_code');
        if (!$itemCode) {
            return response()->json(['error' => 'Item code is required'], 400);
        }

        $user = $this->getAuthenticatedUser();
        if (!$user) {
            return response()->json(['error' => 'User not authenticated'], 401);
        }

        try {
            // Find all matching item keys for this item code across company scopes
            $itemKeys = DB::table('itemmaster')
                ->where('ItemCode', $itemCode)
                ->pluck('ItmKy')
                ->filter()
                ->unique()
                ->toArray();

            if (empty($itemKeys)) {
                return response()->json([]);
            }

            // Fetch batches from stock_in_hand that currently have available stock (> 0)
            $batches = DB::table('stock_in_hand')
                ->whereIn('ItemKy', $itemKeys)
                ->whereNotNull('batch_no')
                ->where('batch_no', '!=', '')
                ->select('batch_no')
                ->groupBy('batch_no')
                ->havingRaw('SUM(Qty + COALESCE(FreeQty, 0)) > 0')
                ->pluck('batch_no')
                ->map(fn($b) => trim((string)$b))
                ->filter(fn($b) => $b !== '')
                ->unique()
                ->sort()
                ->values();

            return response()->json($batches);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch batches',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function getPricesForBatch(Request $request)
    {
        $itemCode = $request->query('item_code');
        $batchNo = $request->query('batch_no');
        if (!$itemCode || !$batchNo) {
            return response()->json(['error' => 'Item code and batch no are required'], 400);
        }

        $user = $this->getAuthenticatedUser();
        if (!$user) {
            return response()->json(['error' => 'User not authenticated'], 401);
        }

        try {
            // Find all matching item keys for this item code across company scopes
            $itemKeys = DB::table('itemmaster')
                ->where('ItemCode', $itemCode)
                ->pluck('ItmKy')
                ->filter()
                ->unique()
                ->toArray();

            if (empty($itemKeys)) {
                return response()->json([]);
            }

            // 1. Fetch GRN batch prices directly from purchase_det
            $purchaseRecord = DB::table('purchase_det')
                ->whereIn('iTimKy', $itemKeys)
                ->where('batch_no', $batchNo)
                ->orderBy('PerchaseDetKy', 'desc')
                ->select([
                    'CostPrice as CosPri',
                    'SalePrice as SlsPri',
                    'VehicleSalePrice',
                    'NewCostPrice',
                    'batch_no',
                    'serial_number',
                    'CusDiscountRate as RtDis1',
                    'discount_type as RtDisType1',
                ])
                ->first();

            // 2. Fetch stock adjustment batch prices from stock_adjustment_items
            $adjustmentRecord = DB::table('stock_adjustment_items')
                ->whereIn('product_id', $itemKeys)
                ->where('batch_no', $batchNo)
                ->orderBy('id', 'desc')
                ->select([
                    'cost_price as CosPri',
                    'sale_price as SlsPri',
                    'vehicle_sale_price as VehicleSalePrice',
                    'batch_no',
                    'serial_number',
                ])
                ->first();

            // 3. Fetch price history / overrides from item_price_det
            $priceOverride = DB::table('item_price_det')
                ->whereIn('ItmKy', $itemKeys)
                ->where('batch_no', $batchNo)
                ->orderBy('ChangedDate', 'desc')
                ->first();

            // 4. Fetch base product master
            $product = Product::whereIn('ItmKy', $itemKeys)->first();

            // Priority: item_price_det -> purchase_det -> stock_adjustment_items -> product master
            $price = $priceOverride ?? $purchaseRecord ?? $adjustmentRecord;

            if (!$price && $product) {
                $price = (object) [
                    'CosPri' => $product->CosPri,
                    'SlsPri' => $product->SlsPri,
                    'VehicleSalePrice' => $product->VehicleSalePrice,
                    'NewCostPrice' => $product->NewCostPrice,
                    'batch_no' => $batchNo,
                ];
            }

            if ($price) {
                // Ensure price fields fill from purchase_det or stock_adjustment_items if empty/0 in item_price_det, then product master
                if (empty((float)($price->CosPri ?? 0))) {
                    $price->CosPri = !empty((float)($purchaseRecord->CosPri ?? 0)) ? $purchaseRecord->CosPri : (!empty((float)($adjustmentRecord->CosPri ?? 0)) ? $adjustmentRecord->CosPri : ($product?->CosPri ?? 0));
                }
                if (empty((float)($price->SlsPri ?? 0))) {
                    $price->SlsPri = !empty((float)($purchaseRecord->SlsPri ?? 0)) ? $purchaseRecord->SlsPri : (!empty((float)($adjustmentRecord->SlsPri ?? 0)) ? $adjustmentRecord->SlsPri : ($product?->SlsPri ?? 0));
                }
                if (empty((float)($price->VehicleSalePrice ?? 0))) {
                    $price->VehicleSalePrice = !empty((float)($purchaseRecord->VehicleSalePrice ?? 0)) ? $purchaseRecord->VehicleSalePrice : (!empty((float)($adjustmentRecord->VehicleSalePrice ?? 0)) ? $adjustmentRecord->VehicleSalePrice : ($product?->VehicleSalePrice ?? 0));
                }
                if (empty((float)($price->NewCostPrice ?? 0))) {
                    $price->NewCostPrice = !empty((float)($purchaseRecord->NewCostPrice ?? 0)) ? $purchaseRecord->NewCostPrice : ($product?->NewCostPrice ?? 0);
                }

                // Tiered discounts and quantities fallback
                if ($product) {
                    $price->RtQty1 = empty((float)($price->RtQty1 ?? 0)) ? $product->RtQty1 : $price->RtQty1;
                    $price->RtQty2 = empty((float)($price->RtQty2 ?? 0)) ? $product->RtQty2 : $price->RtQty2;
                    $price->CredQty1 = empty((float)($price->CredQty1 ?? 0)) ? $product->CredQty1 : $price->CredQty1;
                    $price->CredQty2 = empty((float)($price->CredQty2 ?? 0)) ? $product->CredQty2 : $price->CredQty2;

                    $price->RtDis1 = empty((float)($price->RtDis1 ?? 0)) ? $product->RtDis1 : $price->RtDis1;
                    $price->RtDis2 = empty((float)($price->RtDis2 ?? 0)) ? $product->RtDis2 : $price->RtDis2;
                    $price->CredDis1 = empty((float)($price->CredDis1 ?? 0)) ? $product->CredDis1 : $price->CredDis1;
                    $price->CredDis2 = empty((float)($price->CredDis2 ?? 0)) ? $product->CredDis2 : $price->CredDis2;

                    // RtDisType1 fallback: item_price_det -> purchase_det -> product master
                    if (empty($price->RtDisType1)) {
                        $price->RtDisType1 = $purchaseRecord->RtDisType1 ?? $product->RtDisType1 ?? 'fixed';
                    }
                }
            }

            return response()->json($price ?: []);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => 'Failed to fetch prices for batch',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function withCategory()
    {
        return $this->getItemCodesWithCategory();
    }

    public function getItemsForSelection(Request $request)
    {
        $user = Auth::user();
        if (!$user) return response()->json(['error' => 'User not authenticated.'], 401);
        if (!$user->hasPermission('products.view')) return response()->json(['error' => 'Unauthorized'], 403);

        try {
            $search = $request->query('search');
            $supplier = $request->query('supplier');
            $companyCode = $request->query('company_code');

            $query = Product::where('fInAct', false) // Only active items
                ->when(true, function ($query) use ($companyCode) {
                    $user = Auth::user();
                    $companyCode = $companyCode ?: session('company_code') ?: ($user->company_code ?? $user->company_code);
                    if ($companyCode) {
                        return $query->where('itemmaster.company_code', $companyCode);
                    }
                    return $query;
                })
                ->leftJoin(DB::raw('(SELECT catkey, MIN(cname) as cname FROM code_masters WHERE conkey = "CAT" GROUP BY catkey) as category'), 'itemmaster.catkey', '=', 'category.catkey')
                ->leftJoin(DB::raw('(SELECT AccKy, MIN(AccNm) as AccNm FROM acc_mas GROUP BY AccKy) as supplier'), 'itemmaster.SupKey', '=', 'supplier.AccKy')
                ->select(
                    'itemmaster.ItmKy as id',
                    'itemmaster.ItemCode as ItemCode',
                    'itemmaster.ItmNm as ItmNm',
                    'itemmaster.SlsPri as SlsPri',
                    'itemmaster.VehicleSalePrice as VehicleSalePrice',
                    'itemmaster.QuntityDiscount as QuntityDiscount',
                    'itemmaster.BarCode as barcode',
                    'category.cname as category',
                    'supplier.AccNm as supplier'
                );

            // Apply supplier filter if provided
            if ($supplier && $supplier !== '0') {
                $query->where('itemmaster.SupKey', $supplier);
            }

            // Apply search filter if provided
            if ($search) {
                $query->where(function($q) use ($search) {
                    $q->where('itemmaster.ItmNm', 'LIKE', '%' . $search . '%')
                      ->orWhere('itemmaster.ItemCode', 'LIKE', '%' . $search . '%')
                      ->orWhere('itemmaster.BarCode', 'LIKE', '%' . $search . '%');
                });
            }

            $items = $query->orderBy('itemmaster.ItmNm')
                           ->get();

            return response()->json($items);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch items for selection',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    // Get price history for a product
    public function getPriceHistory($itemKey)
    {
        try {
            $priceHistory = ItemPriceDet::where('ItmKy', $itemKey)
                ->orderBy('ChangedDate', 'desc')
                ->get();
                
            return response()->json($priceHistory);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch price history',
                'message' => $e->getMessage()
            ], 500);
        }
    }


    public function getItemsForList(Request $request)
    {
        try {
            Log::info('getItemsForList: Starting query');

            $searchTerm = $request->query('search');
            $priceFilter = $request->query('price');
            $category = $request->query('category');
            $companyCode = $request->query('company_code');
            $sectionCode = $request->query('section_code');
            Log::info('getItemsForList: Search term: ' . ($searchTerm ?? 'none') . ', Price filter: ' . ($priceFilter ?? 'none') . ', Category: ' . ($category ?? 'none') . ', Section code: ' . ($sectionCode ?? 'none'));

            $user = Auth::user();
            if (!$user) {
                return response()->json([
                    'error' => 'Authentication required',
                    'message' => 'You must be logged in to access this resource'
                ], 401);
            }

            if (!$user->hasPermission('products.view')) {
                return response()->json([
                    'error' => 'Unauthorized',
                    'message' => 'You do not have permission to view products'
                ], 403);
            }

            $query = Product::where('fInAct', false) // Only active items
                ->when(!$this->userIsSuperAdmin($user), function ($query) use ($companyCode, $user) {
                    $companyCode = $companyCode ?: ($user->company_code ?? $user->company_code);
                    return $query->where('itemmaster.company_code', $companyCode);
                })
                ->leftJoin(DB::raw('(SELECT catkey, MIN(cname) as cname FROM code_masters WHERE conkey = "CAT" GROUP BY catkey) as category'), 'itemmaster.catkey', '=', 'category.catkey')
                ->leftJoin(DB::raw('(
                    SELECT
                        ItemKy,
                        company_code,
                        section_code,
                        SUM(COALESCE(Qty, 0) + COALESCE(FreeQty, 0)) as total_stock
                    FROM stock_in_hand
                    GROUP BY ItemKy, company_code, section_code
                ) as stock'), function($join) use ($sectionCode) {
                    $join->on('itemmaster.ItmKy', '=', 'stock.ItemKy')
                         ->where('stock.section_code', '=', $sectionCode ?: DB::raw('itemmaster.section_code'));
                })
                ->select(
                    'itemmaster.ItmKy as id',
                    'itemmaster.ItemCode as code',
                    'itemmaster.ItmNm as sinhala_name',
                    'itemmaster.ItmNm as name',
                    'itemmaster.SlsPri as price',
                    'itemmaster.BarCode as barcode',
                    'category.cname as category',
                    DB::raw('COALESCE(stock.total_stock, 0) as stock')
                );

            // Apply search filter if search term is provided
            if ($searchTerm) {
                $query->where(function($q) use ($searchTerm) {
                    $q->where('itemmaster.ItemCode', 'LIKE', '%' . $searchTerm . '%')
                      ->orWhere('itemmaster.ItmNm', 'LIKE', '%' . $searchTerm . '%')
                      ->orWhere('itemmaster.BarCode', 'LIKE', '%' . $searchTerm . '%')
                      ->orWhere('category.cname', 'LIKE', '%' . $searchTerm . '%');
                });
            }

            // Apply price filter if provided
            if ($priceFilter) {
                $query->where('itemmaster.SlsPri', 'LIKE', '%' . $priceFilter . '%');
            }

            // Apply category filter if provided
            if ($category && $category !== 'all') {
                $query->where('category.catkey', $category);
            }

            // Use pagination instead of limit/get to prevent loading all items
            $perPage = $request->input('per_page', 20);
            $items = $query->orderBy('itemmaster.ItmNm')
                          ->paginate($perPage);

            Log::info('getItemsForList: Query completed, items found: ' . $items->count());
            if ($searchTerm || $priceFilter || ($category && $category !== 'all') || $sectionCode) {
                Log::info('getItemsForList: Search results for "' . ($searchTerm ?? '') . '" with price "' . ($priceFilter ?? '') . '" and category "' . ($category ?? '') . '" and section "' . ($sectionCode ?? '') . '": ' . $items->count() . ' items');
            }

            return response()->json($items);
        } catch (\Exception $e) {
            Log::error('getItemsForList: Error - ' . $e->getMessage());
            Log::error('getItemsForList: File: ' . $e->getFile() . ', Line: ' . $e->getLine());
            return response()->json([
                'error' => 'Failed to fetch items for list',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    // Delete a specific price history record
    public function deletePriceHistory($priceHistoryId)
    {
        $user = $this->getAuthenticatedUser();
        if (!$user) return response()->json(['error' => 'User not authenticated.'], 401);
        if (!$user->hasPermission('products.edit')) return response()->json(['error' => 'Unauthorized'], 403);

        try {
            $priceRecord = ItemPriceDet::findOrFail($priceHistoryId);
            $priceRecord->delete();
            
            Log::info('Price history record deleted: ' . $priceHistoryId);
            
            return response()->json([
                'success' => true,
                'message' => 'Price record deleted successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to delete price history: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to delete price record',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get item details with pricing and discount information
     */
    public function getItemWithDiscounts(Request $request)
    {
        $itemCode = $request->query('code');
        $priceType = $request->query('price_type', 'retail');
        $quantity = $request->query('quantity', 1);
        $companyCode = $request->query('company_code');
        $priceRecordId = $request->query('price_record_id'); // New parameter to select specific price record

        // First get the basic item info
        $baseItem = DB::table('itemmaster')
            ->where('itemmaster.ItemCode', $itemCode)
            ->where('itemmaster.fInAct', false)
            ->when(!$this->userIsSuperAdmin(Auth::user()), function ($query) use ($companyCode) {
                $user = Auth::user();
                $companyCode = $companyCode ?: ($user->company_code ?? $user->company_code);
                return $query->where('itemmaster.company_code', $companyCode);
            })
            ->select([
                'itemmaster.ItmKy',
                'itemmaster.ItemCode',
                'itemmaster.BarCode',
                'itemmaster.ItmNm',
                'itemmaster.catkey',
                'itemmaster.SlsPri as default_price',
                'itemmaster.DiscountQty',
                'itemmaster.QuntityDiscount'
            ])
            ->first();

        if (!$baseItem) {
            return response()->json(['error' => 'Item not found'], 404);
        }

        // Get the specific price record or the latest one
        $priceRecord = null;
        if ($priceRecordId) {
            // Get specific price record by ItemPriceKey
            $priceRecord = DB::table('item_price_det')
                ->where('ItmKy', $baseItem->ItmKy)
                ->where('ItemPriceKey', $priceRecordId)
                ->first();
                
            if (!$priceRecord) {
                return response()->json(['error' => 'Specified price record not found'], 404);
            }
        }
        
        if (!$priceRecord) {
            // Get the latest price record if no specific one requested
            $priceRecord = DB::table('item_price_det')
                ->where('ItmKy', $baseItem->ItmKy)
                ->orderBy('ChangedDate', 'desc')
                ->first();
        }
        
        // If still no price record found, return error
        if (!$priceRecord) {
            return response()->json(['error' => 'No price record found for this item'], 404);
        }

        // Combine base item with price record data
        $item = (object) array_merge((array) $baseItem, [
            'retail_price' => $priceRecord->SlsPri ?? null,
            'VehicleSalePrice' => $priceRecord->VehicleSalePrice ?? null,
            'CosPri' => $priceRecord->CosPri ?? null,
            'RtQty1' => $priceRecord->RtQty1 ?? null,
            'RtDis1' => $priceRecord->RtDis1 ?? null,
            'RtQty2' => $priceRecord->RtQty2 ?? null,
            'RtDis2' => $priceRecord->RtDis2 ?? null,
            'CredQty1' => $priceRecord->CredQty1 ?? null,
            'CredQty2' => $priceRecord->CredQty2 ?? null,
            'CredDis1' => $priceRecord->CredDis1 ?? null,
            'CredDis2' => $priceRecord->CredDis2 ?? null,
            'price_record_discount_qty' => $priceRecord->DiscountQty ?? 0,
            'price_record_quantity_discount' => $priceRecord->QuntityDiscount ?? 0
        ]);

        if (!$item) {
            return response()->json(['error' => 'Item not found'], 404);
        }

        // Determine base price based on price type, with proper fallbacks
        $basePrice = null;
        
        // First try to get price from the selected price record
        if ($priceRecord) {
            $basePrice = match($priceType) {
                'retail' => $priceRecord->SlsPri,
                'extra' => $priceRecord->VehicleSalePrice, 
                default => $priceRecord->SlsPri
            };
        }
        
        // If no price from record or price is null/zero, fallback to default from base item
        if (!$basePrice || $basePrice <= 0) {
            $basePrice = $item->default_price;
        }
        
        // Final safety check
        if (!$basePrice || $basePrice <= 0) {
            return response()->json(['error' => 'No valid price found for this item'], 404);
        }

        // Apply discounts with priority: Promotional discounts first, then quantity-based discounts
        $discountAmount = 0;
        $finalPrice = $basePrice;
        $discountType = 'none';
        $promotionalDiscountData = null;

        // First Priority: Check for promotional discounts using PromotionalDiscountController
        $promotionalDiscountController = new PromotionalDiscountController();
        $promotionalDiscountResult = $promotionalDiscountController->calculatePromotionalDiscount($itemCode, $basePrice, $quantity);

        if ($promotionalDiscountResult['has_discount']) {
            // Apply promotional discount (percentage-based)
            $discountAmount = $promotionalDiscountResult['discount_amount'];
            $finalPrice = $promotionalDiscountResult['final_price'];
            $discountType = 'promotional';
            $promotionalDiscountData = $promotionalDiscountResult['promotional_discount'];
        } else {
            // Second Priority: Apply quantity-based discount only if no promotional discount (uses selected price record's discount settings)
            $discountTiers = [
                ['qty' => $priceRecord->DiscountQty, 'discount' => $priceRecord->QuntityDiscount],
                ['qty' => $priceRecord->RtQty2, 'discount' => $priceRecord->RtDis2],
                ['qty' => $priceRecord->RtQty1, 'discount' => $priceRecord->RtDis1],
            ];

            // Check tiers from highest to lowest quantity
            foreach ($discountTiers as $tier) {
                if ($tier['qty'] !== null && $quantity >= $tier['qty'] && $tier['discount'] > 0) {
                    // Apply discount per item (not total discount spread across items)
                    $discountAmount = $tier['discount']; // Discount amount per item
                    $finalPrice = max(0, $basePrice - $discountAmount); // Final price per item after discount
                    $discountType = 'quantity';
                    break; // Apply first matching tier (highest qualifying tier)
                }
            }
        }

        // Calculate free items based on DiscountQty and QuntityDiscount from selected price record
        $freeItems = 0;
        $discountQty = $priceRecord->DiscountQty ?? 0;
        $quantityDiscount = $priceRecord->QuntityDiscount ?? 0;

        // Only apply free items if no promotional discount is active (to match the priority logic above)
        if (!$promotionalDiscountResult['has_discount'] && $discountQty > 0 && $quantityDiscount > 0 && $quantity >= $discountQty) {
            // Calculate how many sets of discount quantity the customer is buying
            $sets = floor($quantity / $discountQty);
            $freeItems = $sets * $quantityDiscount;
            
            // Note: Free items logic - we give free items but don't change the price
            // The price change to VehicleSalePrice should only happen in specific business logic scenarios
            // For now, we keep the calculated price and just provide free items information
        }

        // Debug logging for discount calculation
        Log::info('getItemWithDiscounts Debug', [
            'item_code' => $itemCode,
            'price_record_id' => $priceRecordId,
            'price_type' => $priceType,
            'quantity' => $quantity,
            'selected_record' => [
                'ItemPriceKey' => $priceRecord->ItemPriceKey,
                'SlsPri' => $priceRecord->SlsPri,
                'VehicleSalePrice' => $priceRecord->VehicleSalePrice,
                'CredQty1' => $priceRecord->CredQty1,
                'CredQty2' => $priceRecord->CredQty2,
                'CredDis1' => $priceRecord->CredDis1,
                'CredDis2' => $priceRecord->CredDis2,
                'DiscountQty' => $priceRecord->DiscountQty,
                'QuntityDiscount' => $priceRecord->QuntityDiscount,
            ],
            'calculation' => [
                'base_price' => $basePrice,
                'discount_amount' => $discountAmount,
                'final_price' => $finalPrice,
                'discount_type' => $discountType,
                'free_items' => $freeItems,
            ]
        ]);

        // Get all available price records with discount calculations
        $allPriceRecords = $this->getAllPriceRecordsWithDiscounts($baseItem->ItmKy, $quantity);

        return response()->json([
            'item' => [
                'id' => $item->ItmKy,
                'ItemCode' => $item->ItemCode,
                'BarCode' => $item->BarCode,
                'ItmNm' => $item->ItmNm,
                'category' => $item->catkey,
                'base_price' => $basePrice,
                'unit_price' => $basePrice, // For backward compatibility
                'final_price' => $finalPrice,
                'discount_amount' => $discountAmount, // This is per-item discount amount
                'cost_price' => $priceRecord->CosPri,
                'free_items' => $freeItems, // Number of free items for this quantity
                'selected_price_record' => [
                    'ItemPriceKey' => $priceRecord->ItemPriceKey,
                    'retail_price' => $priceRecord->SlsPri,
                    'extra_price' => $priceRecord->VehicleSalePrice,
                    'cost_price' => $priceRecord->CosPri,
                    'changed_date' => $priceRecord->ChangedDate,
                    'status' => $priceRecord->Status
                ],
                'all_prices' => $allPriceRecords, // All available price records with discounts
            ],
            'discount_info' => [
                'applied' => $discountAmount > 0,
                'type' => $discountType, // 'promotional', 'quantity', or 'none'
                'amount_per_item' => $discountAmount, // Per-item discount amount
                'total_discount' => $discountAmount * $quantity, // Total discount for the quantity
                'promotional_discount' => $promotionalDiscountData,
                'free_items_info' => [
                    'discount_qty' => $discountQty,
                    'quantity_discount' => $quantityDiscount,
                    'free_items' => $freeItems,
                ],
                'tiers' => [
                    'tier1' => ['qty' => $priceRecord->RtQty1, 'discount' => $priceRecord->RtDis1],
                    'tier2' => ['qty' => $priceRecord->RtQty2, 'discount' => $priceRecord->RtDis2],
                    'tier4' => ['qty' => $discountQty, 'discount' => $quantityDiscount],
                ],
                'price_record_id' => $priceRecordId, // Include the selected price record ID
                'available_prices' => $this->getAvailablePricesForItem($baseItem->ItmKy) // Include all available price records
            ]
        ]);
    }

    /**
     * Get all available price records for an item
     */
    private function getAvailablePricesForItem($itemKey)
    {
        return DB::table('item_price_det')
            ->where('ItmKy', $itemKey)
            ->select([
                'ItemPriceKey',
                'SlsPri as retail_price',
                'VehicleSalePrice as extra_price',
                'ChangedDate',
                'Status'
            ])
            ->orderBy('ChangedDate', 'desc')
            ->get();
    }

    /**
     * Get all price records for an item with discount calculations
     */
    private function getAllPriceRecordsWithDiscounts($itemKey, $quantity)
    {
        $priceRecords = DB::table('item_price_det')
            ->where('ItmKy', $itemKey)
            ->select([
                'ItemPriceKey',
                'SlsPri',
                'VehicleSalePrice',
                'CosPri',
                'RtQty1', 'RtDis1', 'RtQty2', 'RtDis2', 'CredQty1', 'CredDis1', 'CredQty2', 'CredDis2',
                'DiscountQty', 'QuntityDiscount',
                'ChangedDate',
                'Status'
            ])
            ->orderBy('ChangedDate', 'desc')
            ->get();

        $processedRecords = [];
        
        foreach ($priceRecords as $record) {
            // Calculate discounts for each price type
            $processedRecord = [
                'ItemPriceKey' => $record->ItemPriceKey,
                'ChangedDate' => $record->ChangedDate,
                'Status' => $record->Status,
                'retail' => $this->calculatePriceWithDiscount($record->SlsPri, $record, $quantity),
                'extra' => $this->calculatePriceWithDiscount($record->VehicleSalePrice, $record, $quantity),
                'cost_price' => $record->CosPri,
            ];
            
            $processedRecords[] = $processedRecord;
        }

        return $processedRecords;
    }

    /**
     * Calculate final price with discount for a specific price and record
     */
    private function calculatePriceWithDiscount($basePrice, $record, $quantity)
    {
        if (!$basePrice || $basePrice <= 0) {
            return [
                'base_price' => $basePrice,
                'final_price' => $basePrice,
                'discount_amount' => 0,
                'discount_type' => 'none'
            ];
        }

        $discountAmount = 0;
        $discountType = 'none';

        // Apply quantity-based discount tiers
        $discountTiers = [
            ['qty' => $record->DiscountQty, 'discount' => $record->QuntityDiscount],
            ['qty' => $record->RtQty2, 'discount' => $record->RtDis2],
            ['qty' => $record->RtQty1, 'discount' => $record->RtDis1],
        ];

            // Check tiers from highest to lowest quantity
            foreach ($discountTiers as $tier) {
                if ($tier['qty'] !== null && $quantity >= $tier['qty'] && $tier['discount'] > 0) {
                    // Apply discount per item (not total discount spread across items)
                    $discountAmount = $tier['discount']; // Discount amount per item
                    $discountType = 'quantity';
                    break; // Apply first matching tier (highest qualifying tier)
                }
            }        $finalPrice = max(0, $basePrice - $discountAmount);

        return [
            'base_price' => $basePrice,
            'final_price' => $finalPrice,
            'discount_amount' => $discountAmount,
            'discount_type' => $discountType
        ];
    }

    /**
     * Generate barcode print batch for newly created product
     */
    private function generateBarcodePrintBatch($product)
    {
        try {
            $user = Auth::user();

            // Create barcode print batch
            $batch = \App\Models\BarcodePrintBatch::create([
                'user_id' => $user->id,
                'note' => 'Product creation: ' . $product->ItmNm,
            ]);

            // Add product to print batch
            \App\Models\BarcodePrintItem::create([
                'batch_id' => $batch->id,
                'item_code' => $product->ItemCode,
                'item_name' => $product->ItmNm,
                'category' => $product->catkey,
                'sales_price' => $product->SlsPri,
                'qty' => 1, // Default quantity for printing
            ]);

            return $batch;

        } catch (\Exception $e) {
            Log::error('Barcode print batch creation error: ' . $e->getMessage());
            // Don't fail the product creation if barcode batch creation fails
            return null;
        }
    }

    public function toggle($id)
    {
        try {
            $product = Product::findOrFail($id);
            
            // Check if user has permission to manage products
            if (!$this->canAccessProduct($product) || !$this->canManageProducts()) {
                return redirect()->back()->with('error', 'Unauthorized action.');
            }

            // Toggle the status
            $product->fInAct = !$product->fInAct;
            // Also update Status for audit tracking
            $product->Status = $product->fInAct ? 'D' : 'U'; // D for Deactivated/Deleted, U for Updated/Active
            $product->save();

            // Also update the latest price detail to reflect the status change if desired, 
            // but usually price details track price changes. 
            // However, we might want to log this status change in item_price_det too if it tracks overall history.
            // For now, let's keep it simple and just update the main product.

            $status = $product->fInAct ? 'inactive' : 'active';
            
            return redirect()->back()->with('success', "Product marked as {$status} successfully.");
            
        } catch (\Exception $e) {
            Log::error('Product toggle error: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to update product status.');
        }
    }

    /**
     * Add products to additional sections
     */
    public function addToSections(Request $request)
    {
        $user = $this->getAuthenticatedUser();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'User not authenticated.'], 401);
        }

        if (!$user->hasPermission('products.edit')) {
            return response()->json(['success' => false, 'message' => 'Unauthorized. You do not have permission to edit products.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'product_ids' => 'required|array',
            'product_ids.*' => 'integer|exists:itemmaster,ItmKy',
            'sections' => 'required|array',
            'sections.*' => 'string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $productIds = $request->product_ids;
        $sections = $request->sections;

        try {
            // Update each product's available_sections by merging
            foreach ($productIds as $productId) {
                $product = Product::findOrFail($productId);
                $currentSections = $product->available_sections ?? [];
                $newSections = array_unique(array_merge($currentSections, $sections));
                $product->update(['available_sections' => $newSections]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Products added to sections successfully.'
            ]);
        } catch (\Exception $e) {
            Log::error('Add to sections error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error occurred while adding products to sections: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Toggle business unit access for a product (vismass <-> malibo)
     * POST /pos/products/{id}/toggle-business-unit
     */
    public function toggleBusinessUnit($id, Request $request)
    {
        $user = $this->getAuthenticatedUser();
        if (!$user) {
            return back()->with('error', 'User not authenticated.');
        }

        // Only company admin and super admin can share products across business units
        if (!$this->userIsCompanyAdmin($user) && !$this->userIsSuperAdmin($user)) {
            return back()->with('error', 'Unauthorized. Only company administrators can share products across business units.');
        }

        $validator = Validator::make($request->all(), [
            'business_unit' => 'required|string|in:vismass,malibo',
            'action' => 'required|string|in:add,remove',
        ]);

        if ($validator->fails()) {
            return back()->withErrors($validator)->with('error', 'Invalid request data.');
        }

        try {
            $product = Product::findOrFail($id);
            
            // Check if user can access this product
            if (!$this->canAccessProduct($product)) {
                return back()->with('error', 'You are not allowed to access this product.');
            }

            $businessUnit = $request->business_unit;
            $action = $request->action;
            
            $currentUnits = $product->available_business_units ?? ['vismass'];
            
            // Get display name for business unit
            $displayName = ucfirst($businessUnit); // Capitalize first letter (Vismass, Malibo)
            
            if ($action === 'add') {
                // Add business unit if not already present
                if (!in_array($businessUnit, $currentUnits)) {
                    $currentUnits[] = $businessUnit;
                }
                $message = "Product '{$product->ItmNm}' is now shared with {$displayName}";
            } else {
                // Remove business unit (but keep at least one)
                $currentUnits = array_values(array_filter($currentUnits, function($unit) use ($businessUnit) {
                    return $unit !== $businessUnit;
                }));
                
                // Ensure at least one business unit remains
                if (empty($currentUnits)) {
                    return back()->with('error', 'Product must be available in at least one business unit.');
                }
                
                $message = "Product '{$product->ItmNm}' is no longer shared with {$displayName}";
            }
            
            $product->update(['available_business_units' => $currentUnits]);

            Log::info("Business unit {$action} for product {$product->ItemCode}: {$businessUnit}", [
                'user_id' => $user->id,
                'product_id' => $product->ItmKy,
                'available_units' => $currentUnits
            ]);

            return back()->with('success', $message);

        } catch (\Exception $e) {
            Log::error('Business unit toggle error: ' . $e->getMessage());
            return back()->with('error', 'Error occurred while updating business unit access: ' . $e->getMessage());
        }
    }

    /**
     * Delete a product and its related price history if no transactions exist
     * DELETE /pos/products/{id}
     */
    public function destroy($id)
    {
        $user = $this->getAuthenticatedUser();
        if (!$user) abort(401, 'User not authenticated.');

        if (!$this->canDeleteProduct()) {
            return redirect()->back()->with('error', 'Unauthorized. Only Super Admins can delete products.');
        }

        $product = Product::findOrFail($id);

        if (!$this->canAccessProduct($product)) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have access to this product.');
        }

        // Check for dependencies
        // Check for stock
        $stockCount = \App\Models\StockInHand::where('ItemKy', $product->ItmKy)->where('Qty', '>', 0)->count();
        if ($stockCount > 0) {
            return redirect()->back()->with('error', 'Cannot delete product with existing stock. Please deactivate it instead.');
        }

        // Check for purchase history
        $purchaseCount = \App\Models\PurchaseDet::where('iTimKy', $product->ItmKy)->count();
        if ($purchaseCount > 0) {
            return redirect()->back()->with('error', 'Cannot delete product with purchase history. Please deactivate it instead.');
        }

        // Check for sales history
        $salesCount = \App\Models\SalesTransactionItem::where('product_id', $product->ItmKy)->count();
        if ($salesCount > 0) {
            return redirect()->back()->with('error', 'Cannot delete product with sales history. Please deactivate it instead.');
        }

        try {
            DB::beginTransaction();
            
            // Delete related price history
            \App\Models\ItemPriceDet::where('ItmKy', $product->ItmKy)->delete();
            
            // Delete reorder levels if any
            DB::table('reorder_levels')->where('item_code', $product->ItemCode)->delete();

            // Delete the product
            $product->delete();

            DB::commit();
            
            Log::info("Product deleted: {$product->ItemCode} by user {$user->id}");
            
            return redirect()->route('pos.products.index')->with('success', 'Product deleted successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Product deletion error: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Error occurred while deleting product: ' . $e->getMessage());
        }
    }
}

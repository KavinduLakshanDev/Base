<?php

namespace App\Http\Controllers\POS;

use App\Http\Controllers\Controller;
use App\Models\CodeMaster;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CategoryController extends Controller
{
    /**
     * Display a listing of categories.
     */
    public function index(Request $request): Response
    {
        if (!$request->user()->hasPermission('categories.view') && !$request->user()->hasPermission('categories.manage')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view categories.');
        }

        $query = CodeMaster::byControl('CAT');

        // Filter by user's company (always) and section (only for non-super-admins).
        // Super admins should be able to see all sections within the selected company.
        $user = $request->user();
        $isSuperAdmin = $user && $user->user_type === 'super_admin';

        if ($user) {
            $query->where('company_code', $user->company_code);

            if (! $isSuperAdmin) {
                if ($user->section_code) {
                    $query->where(function ($q) use ($user) {
                        $q->where('section_code', $user->section_code)
                          ->orWhereNull('section_code');
                    });
                } else {
                    $query->whereNull('section_code');
                }
            }
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                // Check if search matches category name or code
                $q->where('cname', 'like', "%{$search}%")
                  ->orWhere('concode', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            if ($request->status === 'active') {
                $query->where('is_active', true);
            } elseif ($request->status === 'inactive') {
                $query->where('is_active', false);
            }
        }

        $perPage = $request->input('per_page', 10);
        if (!in_array($perPage, [10, 25, 50, 100])) {
            $perPage = 10;
        }

        $categories = $query->with(['brands' => function ($query) {
            $query->with(['products' => function ($query) {
                $query->select('ItmKy', 'brand_id', 'ItmNm', 'ItemCode', 'Status');
            }])->select('id', 'category_id', 'name', 'code', 'is_active');
        }])->orderBy('concode', 'asc')
            ->paginate($perPage)
            ->withQueryString()
            ->through(function ($category) {
                return [
                    'id' => $category->id,
                    'uuid' => $category->uuid,
                    'concode' => $category->concode,
                    'catkey' => $category->catkey,
                    'cname' => $category->cname,
                    'description' => $category->description,
                    'is_active' => $category->is_active,
                    'company_code' => $category->company_code,
                    'section_code' => $category->section_code,
                    'created_at' => $category->created_at->format('Y-m-d H:i:s'),
                    'brands' => $category->brands->map(function ($brand) {
                        return [
                            'id' => $brand->id,
                            'brand_name' => $brand->name,
                            'brand_code' => $brand->code,
                            'is_active' => $brand->is_active,
                            'products_count' => $brand->products->count(),
                            'products' => $brand->products->map(function ($product) {
                                return [
                                    'id' => $product->ItmKy,
                                    'item_name' => $product->ItmNm,
                                    'item_code' => $product->ItemCode,
                                    'is_active' => $product->Status === 'A',
                                ];
                            }),
                        ];
                    }),
                    'brands_count' => $category->brands->count(),
                    'products_count' => $category->brands->sum(function ($brand) {
                        return $brand->products->count();
                    }),
                ];
            });

        // Get counts for stats cards
        $statsQuery = CodeMaster::byControl('CAT');
        if ($user) {
            $statsQuery->where('company_code', $user->company_code);
            if (! $isSuperAdmin) {
                if ($user->section_code) {
                    $statsQuery->where(function ($q) use ($user) {
                        $q->where('section_code', $user->section_code)
                          ->orWhereNull('section_code');
                    });
                } else {
                    $statsQuery->whereNull('section_code');
                }
            }
        }
        
        $activeCount = (clone $statsQuery)->where('is_active', true)->count();
        $inactiveCount = (clone $statsQuery)->where('is_active', false)->count();

        // Get total brands count
        $brandQuery = \App\Models\Brand::query();
        if ($user) {
            $brandQuery->where('company_code', $user->company_code);
            if (! $isSuperAdmin) {
                if ($user->section_code) {
                    $brandQuery->where(function ($q) use ($user) {
                        $q->where('section_code', $user->section_code)
                          ->orWhereNull('section_code');
                    });
                } else {
                    $brandQuery->whereNull('section_code');
                }
            }
        }
        $totalBrands = $brandQuery->count();

        // Get total products count
        $productQuery = \App\Models\ItemMaster::query();
        if ($user) {
            $productQuery->where('company_code', $user->company_code);
            if (! $isSuperAdmin) {
                if ($user->section_code) {
                    $productQuery->where(function ($q) use ($user) {
                        $q->where('section_code', $user->section_code)
                          ->orWhereNull('section_code');
                    });
                } else {
                    $productQuery->whereNull('section_code');
                }
            }
        }
        $totalProducts = $productQuery->count();

        return Inertia::render('pos/categories/index', [
            'categories' => $categories,
            'filters' => $request->only(['search', 'status', 'per_page']),
            'activeCount' => $activeCount,
            'inactiveCount' => $inactiveCount,
            'totalBrands' => $totalBrands,
            'totalProducts' => $totalProducts,
        ]);
    }

    /**
     * Get categories as JSON for API calls.
     */
    public function getCategories(Request $request): JsonResponse
    {
        $user = $request->user();
        $isSuperAdmin = $user && $user->user_type === 'super_admin';
        $query = CodeMaster::byControl('CAT');

        // Filter by authenticated user's company and section (optional).
        if ($user) {
            $query->where('company_code', $user->company_code);
            if (! $isSuperAdmin) {
                if ($user->section_code) {
                    $query->where(function ($q) use ($user) {
                        $q->where('section_code', $user->section_code)
                          ->orWhereNull('section_code');
                    });
                } else {
                    $query->whereNull('section_code');
                }
            }
        }

        $categories = $query->get();

        return response()->json([
            'success' => true,
            'data' => $categories->map(function ($category) {
                return [
                    'id' => $category->id,
                    'uuid' => $category->uuid,
                    'concode' => $category->concode,
                    'catkey' => $category->catkey,
                    'cname' => $category->cname,
                    'description' => $category->description,
                    'company_code' => $category->company_code,
                    'section_code' => $category->section_code,
                ];
            }),
        ]);
    }

    /**
     * Store a newly created category.
     */
    public function store(Request $request)
    {
        if (!$request->user()->hasPermission('categories.manage')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to manage categories.');
        }

        $validated = $request->validate([
            'cname' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:255'],
        ]);

        $user = $request->user();

        // Set company and section codes from authenticated user
        $companyCode = $user->company_code;
        $sectionCode = $user->section_code;

        // Generate next category code for this company
        $lastCategory = CodeMaster::byControl('CAT')
            ->where('company_code', $companyCode)
            ->orderBy('concode', 'desc')
            ->first();

        $nextNumber = 1;
        if ($lastCategory) {
            $lastNumber = (int) substr($lastCategory->concode, 3); // Remove 'CAT' prefix
            $nextNumber = $lastNumber + 1;
        }

        $concode = 'CAT' . str_pad($nextNumber, 3, '0', STR_PAD_LEFT);

        CodeMaster::create([
            'conkey' => 'CAT',
            'concode' => $concode,
            'catkey' => $concode,
            'cname' => $validated['cname'],
            'description' => $validated['description'],
            'company_code' => $companyCode,
            'section_code' => $sectionCode,
            'is_active' => true,
        ]);

        return redirect()->back()->with('success', 'Category created successfully');
    }

    /**
     * Update the specified category.
     */
    public function update(Request $request, CodeMaster $category)
    {
        if (!$request->user()->hasPermission('categories.manage')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to manage categories.');
        }

        // Verify this is a category
        if ($category->conkey !== 'CAT') {
            return back()->withErrors(['error' => 'Invalid category']);
        }

        $validated = $request->validate([
            'cname' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:255'],
            'is_active' => ['boolean'],
        ]);

        $user = $request->user();

        // Set company and section codes from authenticated user
        $companyCode = $user->company_code;
        $sectionCode = $user->section_code;

        $category->update([
            'cname' => $validated['cname'],
            'description' => $validated['description'] ?? $category->description,
            'company_code' => $companyCode,
            'section_code' => $sectionCode,
            'is_active' => $validated['is_active'] ?? $category->is_active,
        ]);

        return redirect()->back()->with('success', 'Category updated successfully');
    }

    /**
     * Toggle the active status of the specified category.
     */
    public function toggle(CodeMaster $category)
    {
        $user = request()->user();

        // Only super admins may activate/deactivate categories.
        if (! $user || $user->user_type !== 'super_admin') {
            return redirect()->back()->with('error', 'Unauthorized. Only super admins can activate or deactivate categories.');
        }

        // Verify this is a category
        if ($category->conkey !== 'CAT') {
            return back()->withErrors(['error' => 'Invalid category']);
        }

        // Toggle the active status
        $category->update(['is_active' => !$category->is_active]);

        $action = $category->is_active ? 'activated' : 'deactivated';

        return back()->with('success', "Category {$action} successfully");
    }
}
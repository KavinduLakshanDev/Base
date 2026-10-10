<?php

namespace App\Http\Controllers\POS;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Database\QueryException;
use Inertia\Inertia;
use Inertia\Response;

class BrandController extends Controller
{
    /**
     * Display a listing of brands.
     */
    public function index(Request $request): Response
    {
        if (!$request->user()->hasPermission('brands.view') && !$request->user()->hasPermission('brands.manage')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view brands.');
        }

        $query = Brand::query();

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

        // Apply filters
        if ($request->filled('search')) {
            $searchTerm = $request->search;
            $query->where(function ($q) use ($searchTerm) {
                $q->where('name', 'like', "%{$searchTerm}%")
                  ->orWhere('code', 'like', "%{$searchTerm}%");
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

        $brands = $query->with('category')->orderBy('code', 'asc')
            ->paginate($perPage)
            ->withQueryString()
            ->through(function ($brand) {
                return [
                    'id' => $brand->id,
                    'uuid' => $brand->uuid,
                    'code' => $brand->code,
                    'name' => $brand->name,
                    'description' => $brand->description,
                    'category_id' => $brand->category_id,
                    'category' => $brand->category ? [
                        'id' => $brand->category->id,
                        'catkey' => $brand->category->catkey,
                        'cname' => $brand->category->cname,
                        'description' => $brand->category->description,
                    ] : null,
                    'is_active' => $brand->is_active,
                    'company_code' => $brand->company_code,
                    'section_code' => $brand->section_code,
                    'created_at' => $brand->created_at->format('Y-m-d H:i:s'),
                ];
            });

        // Get categories for the dropdown
        $categories = \App\Models\CodeMaster::where('conkey', 'CAT')
            ->where('company_code', $user->company_code)
            ->where('is_active', true)
            ->when(! $isSuperAdmin, function ($query) use ($user) {
                $query->when($user->section_code, function ($q) use ($user) {
                    $q->where(function ($q2) use ($user) {
                        $q2->where('section_code', $user->section_code)
                           ->orWhereNull('section_code');
                    });
                }, function ($q) {
                    $q->whereNull('section_code');
                });
            })
            ->select('id', 'catkey', 'cname', 'description')
            ->orderBy('cname')
            ->get();

        // Get counts for stats cards
        $statsQuery = Brand::query();
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

        return Inertia::render('pos/brands/index', [
            'brands' => $brands,
            'categories' => $categories,
            'filters' => $request->only(['search', 'status', 'per_page']),
            'activeCount' => $activeCount,
            'inactiveCount' => $inactiveCount,
        ]);
    }

    /**
     * Get brands as JSON for API calls.
     */
    public function getBrands(Request $request): JsonResponse
    {
        $user = $request->user();
        $isSuperAdmin = $user && $user->user_type === 'super_admin';
        $query = Brand::query();

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

        $brands = $query->get();

        return response()->json([
            'success' => true,
            'data' => $brands->map(function ($brand) {
                return [
                    'id' => $brand->id,
                    'uuid' => $brand->uuid,
                    'code' => $brand->code,
                    'name' => $brand->name,
                    'description' => $brand->description,
                    'company_code' => $brand->company_code,
                    'section_code' => $brand->section_code,
                ];
            }),
        ]);
    }

    /**
     * Store a newly created brand.
     */
    public function store(Request $request)
    {
        if (!$request->user()->hasPermission('brands.manage')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to manage brands.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:255'],
            'category_id' => ['nullable', 'integer', 'exists:code_masters,id'],
        ]);

        $user = $request->user();

        // Set company and section codes from authenticated user
        $companyCode = $user->company_code;
        $sectionCode = $user->section_code;

        $companyPrefix = strtoupper(substr($companyCode, 0, 3));

        // Use 'BRD' for 'VIS' (Vismass) to continue their sequence, otherwise use company prefix (e.g. MAL-BRD)
        $prefix = ($companyPrefix === 'VIS') ? 'BRD' : $companyPrefix . '-BRD';
        $prefixLength = strlen($prefix);

        // Compute next brand numeric suffix for this specific prefix
        $maxNumber = Brand::where('company_code', $companyCode)
            ->where('code', 'LIKE', $prefix . '%')
            ->selectRaw("MAX(CAST(SUBSTR(code, " . ($prefixLength + 1) . ") AS UNSIGNED)) as max_num")
            ->value('max_num');

        $nextNumber = ($maxNumber ?? 0) + 1;

        $code = $prefix . str_pad($nextNumber, 3, '0', STR_PAD_LEFT);

        // Check for duplicate names within the same category (case-insensitive)
        $existingBrand = Brand::where('company_code', $companyCode)
            ->whereRaw('LOWER(name) = ?', [strtolower($validated['name'])])
            ->where('category_id', $validated['category_id'])
            ->first();

        if ($existingBrand) {
            $categoryName = $validated['category_id']
                ? \App\Models\CodeMaster::where('id', $validated['category_id'])->value('cname') ?? 'selected category'
                : 'without a category';
            return back()->withErrors(['name' => "A brand with this name already exists in {$categoryName}."]);
        }

        // Attempt to create, retrying on duplicate-code constraint (race window)
        $attempts = 0;
        $created = false;
        $lastException = null;

        while (!$created && $attempts < 5) {
            $code = $prefix . str_pad($nextNumber, 3, '0', STR_PAD_LEFT);

            try {
                Brand::create([
                    'code' => $code,
                    'name' => $validated['name'],
                    'description' => $validated['description'],
                    'category_id' => $validated['category_id'] ?? null,
                    'company_code' => $companyCode,
                    'section_code' => $sectionCode,
                    'is_active' => true,
                ]);

                $created = true;
            } catch (QueryException $e) {
                $lastException = $e;
                // 23000 is integrity constraint violation; assume duplicate code and retry with next number
                if ($e->getCode() === '23000') {
                    $nextNumber++;
                    $attempts++;
                    continue;
                }

                // Non-unique error – rethrow
                throw $e;
            }
        }

        if (! $created) {
            // If we failed after retries, return a friendly error
            return back()->withErrors(['code' => 'Unable to generate a unique brand code. Please try again.']);
        }

        return redirect()->back()->with('success', 'Brand created successfully');
    }

    /**
     * Update the specified brand.
     */
    public function update(Request $request, Brand $brand)
    {
        if (!$request->user()->hasPermission('brands.manage')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to edit brands.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:255'],
            'category_id' => ['nullable', 'integer', 'exists:code_masters,id'],
            'is_active' => ['boolean'],
        ]);

        $user = $request->user();

        // Set company and section codes from authenticated user
        $companyCode = $user->company_code;
        $sectionCode = $user->section_code;

        // Check for duplicate names within the same category (case-insensitive), excluding the current brand
        $existingBrand = Brand::where('company_code', $companyCode)
            ->where('id', '!=', $brand->id)
            ->whereRaw('LOWER(name) = ?', [strtolower($validated['name'])])
            ->where('category_id', $validated['category_id'])
            ->first();

        if ($existingBrand) {
            $categoryName = $validated['category_id']
                ? \App\Models\CodeMaster::where('id', $validated['category_id'])->value('cname') ?? 'selected category'
                : 'without a category';
            return back()->withErrors(['name' => "A brand with this name already exists in {$categoryName}."]);
        }

        if ($existingBrand) {
            $categoryName = $validated['category_id']
                ? \App\Models\CodeMaster::where('id', $validated['category_id'])->value('cname') ?? 'selected category'
                : 'without a category';
            return back()->withErrors(['name' => "A brand with this name already exists in {$categoryName}."]);
        }

        $brand->update([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? $brand->description,
            'category_id' => $validated['category_id'] ?? $brand->category_id,
            'company_code' => $companyCode,
            'section_code' => $sectionCode,
            'is_active' => $validated['is_active'] ?? $brand->is_active,
        ]);

        return redirect()->back()->with('success', 'Brand updated successfully');
    }

    /**
     * Toggle the active status of the specified brand.
     */
    public function toggle(Brand $brand)
    {
        if (!request()->user()->hasPermission('brands.manage')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to manage brands.');
        }

        // Toggle the active status
        $brand->update(['is_active' => !$brand->is_active]);

        $action = $brand->is_active ? 'activated' : 'deactivated';

        return back()->with('success', "Brand {$action} successfully");
    }
}

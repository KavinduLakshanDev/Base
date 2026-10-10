<?php

namespace App\Http\Controllers\POS;

use App\Http\Controllers\Controller;
use App\Models\ProductModel;
use App\Models\Brand;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Database\QueryException;
use Inertia\Inertia;
use Inertia\Response;

class ModelController extends Controller
{
    /**
     * Display a listing of models.
     */
    public function index(Request $request): Response
    {
        if (!$request->user()->hasPermission('models.view') && !$request->user()->hasPermission('models.manage')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view models.');
        }

        $query = ProductModel::query();

        // Filter by user's company (show all sections)
        $user = $request->user();
        if ($user) {
            $query->where('company_code', $user->company_code);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                // Check if search matches model name, code, or brand name
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhereHas('brand', function ($q) use ($search) {
                      $q->where('name', 'like', "%{$search}%");
                  });
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

        $models = $query->with('brand')->orderBy('code', 'asc')
            ->paginate($perPage)
            ->withQueryString()
            ->through(function ($model) {
                return [
                    'id' => $model->id,
                    'uuid' => $model->uuid,
                    'code' => $model->code,
                    'name' => $model->name,
                    'description' => $model->description,
                    'brand_id' => $model->brand_id,
                    'brand' => $model->brand ? [
                        'id' => $model->brand->id,
                        'code' => $model->brand->code,
                        'name' => $model->brand->name,
                    ] : null,
                    'is_active' => $model->is_active,
                    'company_code' => $model->company_code,
                    'section_code' => $model->section_code,
                    'created_at' => $model->created_at->format('Y-m-d H:i:s'),
                ];
            });

        // Get brands for the dropdown (from all sections in the company)
        $brands = Brand::where('company_code', $user->company_code)
            ->where('is_active', true)
            ->select('id', 'code', 'name')
            ->orderBy('name')
            ->get();

        // Get counts for stats cards
        $statsQuery = ProductModel::query();
        if ($user) {
            $statsQuery->where('company_code', $user->company_code);
        }
        
        $activeCount = (clone $statsQuery)->where('is_active', true)->count();
        $inactiveCount = (clone $statsQuery)->where('is_active', false)->count();

        return Inertia::render('pos/models/index', [
            'models' => $models,
            'brands' => $brands,
            'filters' => $request->only(['search', 'status', 'per_page']),
            'activeCount' => $activeCount,
            'inactiveCount' => $inactiveCount,
        ]);
    }

    /**
     * Get models as JSON for API calls.
     */
    public function getModels(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = ProductModel::query();

        // Filter by authenticated user's company (show all sections)
        if ($user) {
            $query->where('company_code', $user->company_code);
        }

        // Optional: filter by brand
        if ($request->filled('brand_id')) {
            $query->where('brand_id', $request->brand_id);
        }

        $models = $query->with('brand')->get();

        return response()->json([
            'success' => true,
            'data' => $models->map(function ($model) {
                return [
                    'id' => $model->id,
                    'uuid' => $model->uuid,
                    'code' => $model->code,
                    'name' => $model->name,
                    'description' => $model->description,
                    'brand_id' => $model->brand_id,
                    'brand' => $model->brand ? [
                        'id' => $model->brand->id,
                        'name' => $model->brand->name,
                    ] : null,
                    'company_code' => $model->company_code,
                    'section_code' => $model->section_code,
                ];
            }),
        ]);
    }

    /**
     * Store a newly created model.
     */
    public function store(Request $request)
    {
        if (!$request->user()->hasPermission('models.manage')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to manage models.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'description' => 'nullable|string',
            'brand_id' => 'nullable|exists:brands,id',
        ]);

        $user = $request->user();

        // Generate unique code per company (shared across all sections)
        $models = ProductModel::where('company_code', $user->company_code)
            ->where('code', 'LIKE', 'MDL%')
            ->pluck('code');

        $maxNumber = 0;
        foreach ($models as $code) {
            if (preg_match('/^MDL(\d+)$/', $code, $matches)) {
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
            $exists = ProductModel::where('code', $testCode)
                ->where('company_code', $user->company_code)
                ->exists();
            
            if (!$exists) {
                $code = $testCode;
            } else {
                $attempts++;
            }
        }

        if ($code === null) {
            return redirect()->back()->with('error', 'Unable to generate unique model code');
        }

        $model = ProductModel::create([
            'code' => $code,
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'brand_id' => $validated['brand_id'] ?? null,
            'company_code' => $user->company_code,
            'section_code' => $user->section_code,
            'is_active' => true,
        ]);

        return redirect()->back()->with('success', 'Model created successfully');
    }

    /**
     * Update the specified model.
     */
    public function update(Request $request, $id)
    {
        if (!$request->user()->hasPermission('models.manage')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to manage models.');
        }

        $model = ProductModel::findOrFail($id);

        // Authorization check (company-wide access)
        $user = $request->user();
        if ($model->company_code !== $user->company_code) {
            return redirect()->back()->with('error', 'Unauthorized access');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'description' => 'nullable|string',
            'brand_id' => 'nullable|exists:brands,id',
            'is_active' => 'boolean',
        ]);

        $model->update($validated);

        return redirect()->back()->with('success', 'Model updated successfully');
    }

    /**
     * Toggle model active status.
     */
    public function toggle($id)
    {
        if (!request()->user()->hasPermission('models.manage')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to manage models.');
        }

        $model = ProductModel::findOrFail($id);

        // Authorization check (company-wide access)
        $user = request()->user();
        if ($model->company_code !== $user->company_code) {
            return redirect()->back()->with('error', 'Unauthorized access');
        }

        $model->is_active = !$model->is_active;
        $model->save();

        return redirect()->back()->with('success', 'Model status updated successfully');
    }

    /**
     * Remove the specified model.
     */
    public function destroy($id)
    {
        if (!request()->user()->hasPermission('models.manage')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to delete models.');
        }

        $model = ProductModel::findOrFail($id);

        // Authorization check (company-wide access)
        $user = request()->user();
        if ($model->company_code !== $user->company_code) {
            return redirect()->back()->with('error', 'Unauthorized access');
        }

        try {
            $model->delete();
            return redirect()->back()->with('success', 'Model deleted successfully');
        } catch (QueryException $e) {
            return redirect()->back()->with('error', 'Cannot delete model as it is being used');
        }
    }
}

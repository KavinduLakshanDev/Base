<?php

namespace App\Http\Controllers\POS;

use App\Http\Controllers\Controller;
use App\Models\CodeMaster;
use App\Models\ControlMaster;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class UnitController extends Controller
{
    /**
     * Display a listing of units.
     */
    public function index(Request $request): Response
    {
        if (!$request->user()->hasPermission('units.view') && !$request->user()->hasPermission('units.manage')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view units.');
        }

        $user = $request->user();
        $companyCode = $user->company_code;
        $sectionCode = $user->section_code;

        // Ensure ControlMaster exists for 'UNT'
        $controlMaster = ControlMaster::where('conkey', 'UNT')->first();

        if (!$controlMaster) {
            ControlMaster::create([
                'concode' => 'UNT001',
                'conkey' => 'UNT',
                'conname' => 'Unit Controller',
                'company_code' => $companyCode,
                'section_code' => $sectionCode,
                'is_active' => true,
            ]);
        }

        $isSuperAdmin = $user && $user->user_type === 'super_admin';

        $query = CodeMaster::byControl('UNT')
            ->where('company_code', $user->company_code)
            ->when(! $isSuperAdmin, function ($query) use ($user) {
                $query->when($user->section_code, function ($query) use ($user) {
                    $query->where(function ($q) use ($user) {
                        $q->where('section_code', $user->section_code)
                          ->orWhereNull('section_code');
                    });
                }, function ($query) {
                    $query->whereNull('section_code');
                });
            });

        // Search filter
        if ($request->input('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('cname', 'like', "%{$search}%")
                  ->orWhere('concode', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Status filter
        if ($request->has('status') && $request->input('status') !== '') {
            $status = $request->input('status');
            if ($status === 'active') {
                $query->where('is_active', true);
            } elseif ($status === 'inactive') {
                $query->where('is_active', false);
            }
        }

        $perPage = $request->input('per_page', 10);
        
        $units = $query->orderBy('concode', 'asc')
            ->paginate($perPage)
            ->withQueryString()
            ->through(function ($unit) {
                return [
                    'id' => $unit->id,
                    'uuid' => $unit->uuid,
                    'concode' => $unit->concode,
                    'catkey' => $unit->catkey,
                    'cname' => $unit->cname,
                    'description' => $unit->description,
                    'is_active' => $unit->is_active,
                    'company_code' => $unit->company_code,
                    'branch_code' => $unit->branch_code,
                    'created_at' => $unit->created_at->format('Y-m-d H:i:s'),
                ];
            });

        return Inertia::render('pos/units/index', [
            'units' => $units,
            'filters' => $request->only(['search', 'status', 'per_page']),
        ]);
    }

    /**
     * Store a newly created unit.
     */
    public function store(Request $request)
    {
        if (!$request->user()->hasPermission('units.manage')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to manage units.');
        }

        $validated = $request->validate([
            'cname' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:255'],
        ]);

        $user = $request->user();

        // Set company and section codes from authenticated user
        $companyCode = $user->company_code;
        $sectionCode = $user->section_code;

        // Ensure ControlMaster exists for 'UNT'
        $controlMaster = ControlMaster::where('conkey', 'UNT')->first();

        if (!$controlMaster) {
            ControlMaster::create([
                'concode' => 'UNT001',
                'conkey' => 'UNT',
                'conname' => 'Unit Controller',
                'company_code' => $companyCode,
                'section_code' => $sectionCode,
                'is_active' => true,
            ]);
        }

        // Generate next unit code for this company
        $lastUnit = CodeMaster::byControl('UNT')
            ->where('company_code', $companyCode)
            ->orderBy('concode', 'desc')
            ->first();

        $nextNumber = 1;
        if ($lastUnit) {
            $lastNumber = (int) substr($lastUnit->concode, 3); // Remove 'UNT' prefix
            $nextNumber = $lastNumber + 1;
        }

        $concode = 'UNT' . str_pad($nextNumber, 3, '0', STR_PAD_LEFT);

        CodeMaster::create([
            'conkey' => 'UNT',
            'concode' => $concode,
            'catkey' => $concode,
            'cname' => $validated['cname'],
            'description' => $validated['description'],
            'company_code' => $companyCode,
            'section_code' => $sectionCode,
            'branch_code' => $user->branch_code ?? null,
            'is_active' => true,
        ]);

        return redirect()->back()->with('success', 'Unit created successfully');
    }

    /**
     * Update the specified unit.
     */
    public function update(Request $request, CodeMaster $unit)
    {
        if (!$request->user()->hasPermission('units.manage')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to manage units.');
        }

        // Verify this is a unit
        if ($unit->conkey !== 'UNT') {
            return back()->withErrors(['error' => 'Invalid unit']);
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

        $unit->update([
            'cname' => $validated['cname'],
            'description' => $validated['description'] ?? $unit->description,
            'company_code' => $companyCode,
            'section_code' => $sectionCode,
            'branch_code' => $user->branch_code ?? $unit->branch_code,
            'is_active' => $validated['is_active'] ?? $unit->is_active,
        ]);

        return redirect()->back()->with('success', 'Unit updated successfully');
    }

    /**
     * Toggle the active status of the specified unit.
     */
    public function toggle(CodeMaster $unit)
    {
        if (!request()->user()->hasPermission('units.manage')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to manage units.');
        }

        // Verify this is a unit
        if ($unit->conkey !== 'UNT') {
            return back()->withErrors(['error' => 'Invalid unit']);
        }

        // Toggle the active status
        $unit->update(['is_active' => !$unit->is_active]);

        $action = $unit->is_active ? 'activated' : 'deactivated';

        return back()->with('success', "Unit {$action} successfully");
    }

    /**
     * Get units for API
     */
    public function getUnits(Request $request): JsonResponse
    {
        $query = CodeMaster::byControl('UNT')
            ->where('is_active', true);

        // Filter by user's company and section
        $user = $request->user();
        if ($user) {
            $query->where('company_code', $user->company_code);
            // Units might be shared across sections or specific to one
            // For now, let's assume company-wide unless section_code is set on the unit
            // $query->where('section_code', $user->section_code); 
        }

        $units = $query->orderBy('cname', 'asc')
            ->select('id', 'cname as name')
            ->get();

        return response()->json($units);
    }
}
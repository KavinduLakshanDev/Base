<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ControlMaster;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class ControllerMasterController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request)
    {
        $query = ControlMaster::query();

        // Filter by user's company and section
        $user = $request->user();
        if ($user) {
            $query->where('company_code', $user->company_code);
            if ($user->section_code) {
                $query->where('section_code', $user->section_code);
            } else {
                $query->whereNull('section_code');
            }
        }

        // Search functionality
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('conname', 'like', "%{$search}%")
                  ->orWhere('conkey', 'like', "%{$search}%")
                  ->orWhere('concode', 'like', "%{$search}%");
            });
        }

        $controls = $query->orderBy('created_at', 'desc')->paginate(15);

        return Inertia::render('admin/controller-master/index', [
            'controls' => $controls,
            'filters' => [
                'search' => $request->search,
            ]
        ]);
    }

    public function create()
    {
        return Inertia::render('admin/controller-master/create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'conkey' => 'required|string|max:50|unique:control_master,conkey',
            'conname' => 'required|string|max:100'
        ]);

        // Get authenticated user
        $user = Auth::user();

        // Generate unique concode
        $baseKey = strtoupper($validated['conkey']);
        $concode = $baseKey . '001'; // Start with 001

        // Check if concode exists and increment
        $existing = ControlMaster::where('concode', 'like', $baseKey . '%')
            ->where('company_code', $user->company_code)
            ->orderBy('concode', 'desc')
            ->first();

        if ($existing) {
            $lastNumber = (int) substr($existing->concode, strlen($baseKey));
            $newNumber = str_pad($lastNumber + 1, 3, '0', STR_PAD_LEFT);
            $concode = $baseKey . $newNumber;
        }

        ControlMaster::create([
            'conkey' => $validated['conkey'],
            'concode' => $concode,
            'conname' => $validated['conname'],
            'company_code' => $user->company_code,
            'section_code' => $user->section_code,
            'is_active' => true,
        ]);

        return redirect()->route('admin.controller-master.index')
            ->with('success', 'Controller Master created successfully!');
    }

    public function show(ControlMaster $controlMaster)
    {
        return Inertia::render('admin/controller-master/show', [
            'control' => $controlMaster
        ]);
    }

    public function edit(ControlMaster $controlMaster)
    {
        return Inertia::render('admin/controller-master/edit', [
            'control' => $controlMaster
        ]);
    }

    public function update(Request $request, ControlMaster $controlMaster)
    {
        $validated = $request->validate([
            'conkey' => 'required|string|max:50|unique:control_master,conkey,' . $controlMaster->id,
            'conname' => 'required|string|max:100',
            'is_active' => 'boolean'
        ]);

        $controlMaster->update($validated);

        return redirect()->route('admin.controller-master.index')
            ->with('success', 'Controller Master updated successfully!');
    }

    public function destroy(ControlMaster $controlMaster)
    {
        $controlMaster->delete();

        return redirect()->route('admin.controller-master.index')
            ->with('success', 'Controller deleted successfully!');
    }

    public function toggle(ControlMaster $controlMaster)
    {
        $controlMaster->update([
            'is_active' => !$controlMaster->is_active
        ]);

        return back()->with('success', 
            $controlMaster->is_active ? 'Controller activated successfully!' : 'Controller deactivated successfully!'
        );
    }
}
<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CodeMaster;
use App\Models\ControlMaster;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class CodeMasterController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request)
    {
        $query = CodeMaster::with(['controlMaster']);

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

        // Filter by control if provided
        if ($request->filled('control_key')) {
            $query->where('conkey', $request->control_key);
        }

        // Search functionality
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('cname', 'like', "%{$search}%")
                  ->orWhere('catkey', 'like', "%{$search}%")
                  ->orWhere('conkey', 'like', "%{$search}%");
            });
        }

        $codes = $query->orderBy('created_at', 'desc')->paginate(15);

        // Super admin can see all control masters
        $controls = ControlMaster::where('is_active', true)
            ->orderBy('conname')
            ->get();

        return Inertia::render('admin/code-master/index', [
            'codes' => $codes,
            'controls' => $controls,
            'filters' => [
                'search' => $request->search,
                'control_key' => $request->control_key,
            ]
        ]);
    }

    public function create()
    {
        // Super admin can access all control masters
        $controls = ControlMaster::where('is_active', true)
            ->orderBy('conname')
            ->get();

        return Inertia::render('admin/code-master/create', [
            'controls' => $controls
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'conkey' => 'required|exists:control_master,conkey',
            'cname' => 'required|string|max:100'
        ]);

        // Get the control for verification
        $control = ControlMaster::where('conkey', $validated['conkey'])->first();

        // Get authenticated user
        $user = Auth::user();

        // Generate unique concode and catkey within the control for this company
        $baseKey = strtoupper($validated['conkey']);

        // Filter by company and section codes for per-company numbering
        $query = CodeMaster::where('conkey', $validated['conkey'])
            ->where('company_code', $user->company_code);

        if ($user->section_code) {
            $query->where('section_code', $user->section_code);
        } else {
            $query->whereNull('section_code');
        }

        $existingCodes = $query->get();
        $maxNumber = 0;

        foreach ($existingCodes as $code) {
            if (preg_match('/(\d+)$/', $code->concode, $matches)) {
                $maxNumber = max($maxNumber, (int)$matches[1]);
            }
        }

        $newNumber = str_pad($maxNumber + 1, 3, '0', STR_PAD_LEFT);
        $concode = $baseKey . $newNumber;
        $catkey = $concode; // catkey same as concode

        CodeMaster::create([
            'conkey' => $validated['conkey'],
            'concode' => $concode,
            'catkey' => $catkey,
            'cname' => $validated['cname'],
            'company_code' => Auth::user()->company_code,
            'section_code' => Auth::user()->section_code,
            'is_active' => true,
        ]);

        return redirect()->route('admin.code-master.index')
            ->with('success', 'Code Master created successfully!');
    }

    public function show(CodeMaster $codeMaster)
    {
        // Super admin can access all data

        return Inertia::render('admin/code-master/show', [
            'code' => $codeMaster->load('controlMaster')
        ]);
    }

    public function edit(CodeMaster $codeMaster)
    {
        // Super admin can access all data

        $controls = ControlMaster::where('is_active', true)
            ->orderBy('conname')
            ->get();

        return Inertia::render('admin/code-master/edit', [
            'code' => $codeMaster->load('controlMaster'),
            'controls' => $controls
        ]);
    }

    public function update(Request $request, CodeMaster $codeMaster)
    {
        // Super admin can access all data

        $validated = $request->validate([
            'conkey' => 'required|exists:control_master,conkey',
            'cname' => 'required|string|max:100',
            'is_active' => 'boolean'
        ]);

        // If control is changing, generate new concode and catkey for this company
        if ($codeMaster->conkey != $validated['conkey']) {
            $baseKey = strtoupper($validated['conkey']);
            
            // Filter by company and section codes for per-company numbering
            $query = CodeMaster::where('conkey', $validated['conkey'])
                ->where('company_code', $codeMaster->company_code);

            if ($codeMaster->section_code) {
                $query->where('section_code', $codeMaster->section_code);
            } else {
                $query->whereNull('section_code');
            }

            $existingCodes = $query->get();
            $maxNumber = 0;

            foreach ($existingCodes as $code) {
                if (preg_match('/(\d+)$/', $code->concode, $matches)) {
                    $maxNumber = max($maxNumber, (int)$matches[1]);
                }
            }

            $newNumber = str_pad($maxNumber + 1, 3, '0', STR_PAD_LEFT);
            $validated['concode'] = $baseKey . $newNumber;
            $validated['catkey'] = $validated['concode'];
        }

        $codeMaster->update($validated);

        return redirect()->route('admin.code-master.index')
            ->with('success', 'Code Master updated successfully!');
    }

    public function destroy(CodeMaster $codeMaster)
    {
        // Super admin can access all companies' data

        $codeMaster->delete();

        return redirect()->route('admin.code-master.index')
            ->with('success', 'Code deleted successfully!');
    }

    public function toggle(CodeMaster $codeMaster)
    {
        // Super admin can access all companies' data

        $codeMaster->update([
            'is_active' => !$codeMaster->is_active
        ]);

        return back()->with('success', 
            $codeMaster->is_active ? 'Code activated successfully!' : 'Code deactivated successfully!'
        );
    }
}
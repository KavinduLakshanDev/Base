<?php

namespace App\Http\Controllers;

use App\Models\Vehicle;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class VehicleController extends Controller
{
    public function index()
    {
        if (!request()->user()->hasPermission('vehicles.view')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $user = request()->user();
        $companyCode = $user->company_code;
        
        $query = Vehicle::where('company_code', $companyCode)
            ->with('assignedUser');

        if ($user->role && $user->role->level === 'sales_rep') {
            $query->where('assigned_user_id', $user->id);
        }

        if (request()->filled('search')) {
            $search = request()->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('registration_no', 'like', "%{$search}%")
                  ->orWhereHas('assignedUser', function($q2) use ($search) {
                      $q2->where('first_name', 'like', "%{$search}%")
                         ->orWhere('last_name', 'like', "%{$search}%");
                  });
            });
        }

        $perPage = request()->input('per_page', 20);
        $vehicles = $query->paginate($perPage)->withQueryString();

        return Inertia::render('delivery/vehicles/index', [
            'vehicles' => $vehicles,
            'filters' => request()->only(['search', 'per_page']),
        ]);
    }

    public function create()
    {
        if (!request()->user()->hasPermission('vehicles.create')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $companyCode = request()->user()->company_code;

        $salesReps = User::where('company_code', $companyCode)
            ->whereHas('role', fn($q) => $q->where('level', 'sales_rep'))
            ->where('is_active', true)
            ->get(['id', 'first_name', 'last_name']);

        // Fetch current vehicle assignments in a single query and map them by user id
        $assignedVehicles = \App\Models\Vehicle::where('company_code', $companyCode)
            ->whereNotNull('assigned_user_id')
            ->get(['id', 'assigned_user_id', 'name'])
            ->keyBy('assigned_user_id');

        $salesReps = $salesReps->map(function ($r) use ($assignedVehicles) {
            $assigned = $assignedVehicles->get($r->id);
            return [
                'id' => $r->id,
                'first_name' => $r->first_name,
                'last_name' => $r->last_name,
                'assigned_vehicle_id' => $assigned->id ?? null,
                'assigned_vehicle_name' => $assigned->name ?? null,
            ];
        })->values();

        return Inertia::render('delivery/vehicles/create', ['salesReps' => $salesReps]);
    }

    public function store(Request $request)
    {
        if (!request()->user()->hasPermission('vehicles.create')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $companyCode = request()->user()->company_code;
        $request->validate([
            'name' => [
                'required','string','max:255',
                "unique:vehicles,name,NULL,id,company_code,{$companyCode}"
            ],
            'registration_no' => [
                'nullable','string','max:100',
                "unique:vehicles,registration_no,NULL,id,company_code,{$companyCode}"
            ],
            'assigned_user_id' => 'nullable|exists:users,id',
        ]);

        // If an assigned_user_id is provided, ensure the user belongs to the same company
        // and has the sales_rep role (defensive server-side check).
        if ($request->filled('assigned_user_id')) {
            $assigned = \App\Models\User::find($request->assigned_user_id);
            if (!$assigned || $assigned->company_code !== request()->user()->company_code || ($assigned->role?->level ?? null) !== 'sales_rep') {
                return back()->withErrors(['assigned_user_id' => 'Selected user cannot be assigned to this vehicle.'])->withInput();
            }

            // Business rule: a sales rep may not be assigned to more than one vehicle.
            $alreadyAssigned = Vehicle::where('company_code', request()->user()->company_code)
                ->where('assigned_user_id', $request->assigned_user_id)
                ->exists();

            if ($alreadyAssigned) {
                return back()->withErrors(['assigned_user_id' => 'This sales rep is already assigned to another vehicle.'])->withInput();
            }
        }

        Vehicle::create([
            'name' => $request->name,
            'registration_no' => $request->registration_no,
            'assigned_user_id' => $request->assigned_user_id ? (int) $request->assigned_user_id : null,
            'company_code' => request()->user()->company_code,
            'notes' => $request->notes,
        ]);

        return redirect()->route('delivery.vehicles.index')->with('success', 'Vehicle created.');
    }

    public function edit(Vehicle $vehicle)
    {
        if (!request()->user()->hasPermission('vehicles.edit')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        if ($vehicle->company_code !== request()->user()->company_code) abort(404);

        $companyCode = request()->user()->company_code;

        $salesReps = User::where('company_code', $companyCode)
            ->whereHas('role', fn($q) => $q->where('level', 'sales_rep'))
            ->where('is_active', true)
            ->get(['id', 'first_name', 'last_name']);

        $assignedVehicles = \App\Models\Vehicle::where('company_code', $companyCode)
            ->whereNotNull('assigned_user_id')
            ->get(['id', 'assigned_user_id', 'name'])
            ->keyBy('assigned_user_id');

        $salesReps = $salesReps->map(function ($r) use ($assignedVehicles) {
            $assigned = $assignedVehicles->get($r->id);
            return [
                'id' => $r->id,
                'first_name' => $r->first_name,
                'last_name' => $r->last_name,
                'assigned_vehicle_id' => $assigned->id ?? null,
                'assigned_vehicle_name' => $assigned->name ?? null,
            ];
        })->values();

        return Inertia::render('delivery/vehicles/edit', ['vehicle' => $vehicle, 'salesReps' => $salesReps]);
    }

    public function update(Request $request, Vehicle $vehicle)
    {
        if (!request()->user()->hasPermission('vehicles.edit')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        if ($vehicle->company_code !== request()->user()->company_code) abort(404);

        $companyCode = request()->user()->company_code;
        $request->validate([
            'name' => [
                'required','string','max:255',
                "unique:vehicles,name,{$vehicle->id},id,company_code,{$companyCode}"
            ],
            'registration_no' => [
                'nullable','string','max:100',
                "unique:vehicles,registration_no,{$vehicle->id},id,company_code,{$companyCode}"
            ],
            'assigned_user_id' => 'nullable|exists:users,id',
        ]);

        // If an assigned_user_id is provided, ensure the user belongs to the same company
        // and has the sales_rep role (defensive server-side check) — same as store().
        if ($request->filled('assigned_user_id')) {
            $assigned = \App\Models\User::find($request->assigned_user_id);
            if (!$assigned || $assigned->company_code !== request()->user()->company_code || ($assigned->role?->level ?? null) !== 'sales_rep') {
                return back()->withErrors(['assigned_user_id' => 'Selected user cannot be assigned to this vehicle.'])->withInput();
            }

            // Business rule: a sales rep may not be assigned to more than one vehicle. When updating,
            // allow the same vehicle to keep the same rep but prevent assignment if another vehicle already uses them.
            $alreadyAssigned = Vehicle::where('company_code', request()->user()->company_code)
                ->where('assigned_user_id', $request->assigned_user_id)
                ->where('id', '!=', $vehicle->id)
                ->exists();

            if ($alreadyAssigned) {
                return back()->withErrors(['assigned_user_id' => 'This sales rep is already assigned to another vehicle.'])->withInput();
            }
        }

        $vehicle->update([
            'name' => $request->name,
            'registration_no' => $request->registration_no,
            'assigned_user_id' => $request->assigned_user_id,
            'is_active' => $request->has('is_active') ? (bool) $request->is_active : $vehicle->is_active,
            'notes' => $request->notes,
        ]);

        return redirect()->route('delivery.vehicles.index')->with('success', 'Vehicle updated.');
    }

    public function destroy(Vehicle $vehicle)
    {
        if (!request()->user()->hasPermission('vehicles.delete')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        if ($vehicle->company_code !== request()->user()->company_code) abort(404);

        $vehicle->delete();

        return redirect()->route('delivery.vehicles.index')->with('success', 'Vehicle removed.');
    }

    /**
     * Toggle a vehicle's active status.
     */
    public function updateStatus(Request $request, Vehicle $vehicle)
    {
        if (!request()->user()->hasPermission('vehicles.edit')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        if ($vehicle->company_code !== request()->user()->company_code) abort(404);

        $vehicle->update(['is_active' => !$vehicle->is_active]);

        return redirect()->back()->with('success', 'Vehicle status updated.');
    }
}

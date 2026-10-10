<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class DeliveryRouteController extends Controller
{
    public function index()
    {
        if (!request()->user()->hasPermission('delivery_routes.view')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view delivery routes.');
        }

        $user = request()->user();
        $companyCode = $user->company_code;

        $query = \App\Models\DeliveryRoute::where('company_code', $companyCode)
            ->with(['users' => function ($q) {
                $q->select('users.id', 'first_name', 'last_name');
            }]);

        // Filter for Sales Reps: only show assigned routes
        if ($user->role && $user->role->level === 'sales_rep') {
            $query->whereHas('users', function ($q) use ($user) {
                $q->where('users.id', $user->id);
            });
        }

        $routes = $query->get();

        return \Inertia\Inertia::render('delivery/routes/index', [
            'routes' => $routes
        ]);
    }

    public function create()
    {
        if (!request()->user()->hasPermission('delivery_routes.create')) {
             return redirect()->back()->with('error', 'Unauthorized. You do not have permission to create delivery routes.');
        }

        $salesReps = \App\Models\User::where('company_code', request()->user()->company_code)
            ->whereHas('role', fn($q) => $q->where('level', 'sales_rep'))
            ->where('is_active', true)
            ->get(['id', 'first_name', 'last_name']);

        return \Inertia\Inertia::render('delivery/routes/create', [
            'salesReps' => $salesReps,
        ]);
    }

    public function store(Request $request)
    {
        if (!request()->user()->hasPermission('delivery_routes.create')) {
             return redirect()->back()->with('error', 'Unauthorized. You do not have permission to create delivery routes.');
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'areas' => 'nullable|array',
            'description' => 'nullable|string',
            'user_ids' => 'nullable|array',
            'user_ids.*' => 'exists:users,id',
        ]);

        // If user_ids provided, validate they belong to the same company and are sales reps
        if ($request->filled('user_ids')) {
            $invalidExists = \App\Models\User::whereIn('id', $request->user_ids)
                ->where(function ($q) {
                    $q->where('company_code', '!=', request()->user()->company_code)
                      ->orWhereDoesntHave('role', fn($r) => $r->where('level', 'sales_rep'));
                })->exists();

            if ($invalidExists) {
                return back()->withErrors(['user_ids' => 'One or more selected users cannot be assigned to this route.'])->withInput();
            }
        }

        $route = \App\Models\DeliveryRoute::create([
            'name' => $request->name,
            'areas' => $request->areas,
            'description' => $request->description,
            'company_code' => request()->user()->company_code,
        ]);

        if ($request->filled('user_ids')) {
            $route->users()->sync($request->user_ids);
        }

        return redirect()->route('delivery.routes.index');
    }

    public function show(\App\Models\DeliveryRoute $route)
    {
        if (!request()->user()->hasPermission('delivery_routes.view')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view delivery routes.');
        }

        // Ensure the route belongs to the current company
        if ($route->company_code !== request()->user()->company_code) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view this delivery route.');
        }

        $route->load('users');

        return \Inertia\Inertia::render('delivery/routes/show', [
            'route' => $route
        ]);
    }

    public function edit(\App\Models\DeliveryRoute $route)
    {
        if (!request()->user()->hasPermission('delivery_routes.edit')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to edit delivery routes.');
        }

        // Ensure the route belongs to the current company
        if ($route->company_code !== request()->user()->company_code) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to edit this delivery route.');
        }

        $salesReps = \App\Models\User::where('company_code', request()->user()->company_code)
            ->whereHas('role', fn($q) => $q->where('level', 'sales_rep'))
            ->where('is_active', true)
            ->get(['id', 'first_name', 'last_name']);

        // Qualify column to avoid ambiguity with pivot table 'id' column on MySQL
        $assigned = $route->users()->pluck('users.id')->toArray();

        return \Inertia\Inertia::render('delivery/routes/edit', [
            'route' => $route,
            'salesReps' => $salesReps,
            'assignedUserIds' => $assigned,
        ]);
    }

    public function update(Request $request, \App\Models\DeliveryRoute $route)
    {
        if (!request()->user()->hasPermission('delivery_routes.edit')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to edit delivery routes.');
        }

        // Ensure the route belongs to the current company
        if ($route->company_code !== request()->user()->company_code) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to edit this delivery route.');
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'areas' => 'nullable|array',
            'description' => 'nullable|string',
            'user_ids' => 'nullable|array',
            'user_ids.*' => 'exists:users,id',
        ]);

        $route->update([
            'name' => $request->name,
            'areas' => $request->areas,
            'description' => $request->description,
        ]);

        // Validate & sync assigned sales reps
        if ($request->filled('user_ids')) {
            $invalidExists = \App\Models\User::whereIn('id', $request->user_ids)
                ->where(function ($q) {
                    $q->where('company_code', '!=', request()->user()->company_code)
                      ->orWhereDoesntHave('role', fn($r) => $r->where('level', 'sales_rep'));
                })->exists();

            if ($invalidExists) {
                return back()->withErrors(['user_ids' => 'One or more selected users cannot be assigned to this route.'])->withInput();
            }

            $route->users()->sync($request->user_ids);
        } else {
            // If empty, remove any existing assignments
            $route->users()->detach();
        }

        return redirect()->route('delivery.routes.show', $route);
    }

    public function destroy(\App\Models\DeliveryRoute $route)
    {
        if (!request()->user()->hasPermission('delivery_routes.delete')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to delete delivery routes.');
        }

        // Ensure the route belongs to the current company
        if ($route->company_code !== request()->user()->company_code) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to delete this delivery route.');
        }

        $route->delete();

        return redirect()->route('delivery.routes.index');
    }

    public function updateStatus(Request $request, \App\Models\DeliveryRoute $route)
    {
        if (!request()->user()->hasPermission('delivery_routes.edit')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to update delivery route status.');
        }

        // Ensure the route belongs to the current company
        if ($route->company_code !== request()->user()->company_code) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to update this delivery route.');
        }

        $route->update(['is_active' => !$route->is_active]);

        return redirect()->back()->with('success', 'Route status updated successfully!');
    }
}
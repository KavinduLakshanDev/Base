<?php

namespace App\Http\Controllers;

use App\Models\Shop;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ShopController extends Controller
{
    public function index(Request $request)
    {
        if (!request()->user()->hasPermission('shops.view')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $user = request()->user();
        $companyCode = $user->company_code;

        $query = Shop::where('company_code', $companyCode)->with('deliveryRoute');

        // Filter for Sales Reps: only show shops in their assigned routes
        if ($user->role && $user->role->level === 'sales_rep') {
            $assignedRouteIds = $user->routes()->pluck('delivery_routes.id');
            $query->whereIn('delivery_route_id', $assignedRouteIds);
        }

        // Apply filters
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('address', 'like', "%{$search}%")
                  ->orWhere('contact_phone', 'like', "%{$search}%");
            });
        }

        if ($request->filled('route_id')) {
            $query->where('delivery_route_id', $request->input('route_id'));
        }

        if ($request->filled('status')) {
            $query->where('is_active', $request->input('status') === 'active');
        }

        $shops = $query->get();
        $routes = \App\Models\DeliveryRoute::where('company_code', $companyCode)->where('is_active', true)->get(['id', 'name']);

        return Inertia::render('delivery/shops/index', [
            'shops' => $shops,
            'filters' => $request->only(['search', 'route_id', 'status']),
            'routes' => $routes
        ]);
    }

    public function show(Shop $shop)
    {
        if (!request()->user()->hasPermission('shops.view')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        if ($shop->company_code !== request()->user()->company_code) abort(404);

        $shop->load('deliveryRoute');

        return Inertia::render('delivery/shops/show', ['shop' => $shop]);
    }

    public function create()
    {
        if (!request()->user()->hasPermission('shops.create')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $companyCode = request()->user()->company_code;
        $routes = \App\Models\DeliveryRoute::where('company_code', $companyCode)->where('is_active', true)->get(['id', 'name']);

        return Inertia::render('delivery/shops/create', ['routes' => $routes]);
    }

    public function store(Request $request)
    {
        if (!request()->user()->hasPermission('shops.create')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'address' => 'nullable|string|max:500',
            'contact_phone' => ['nullable', 'string', 'regex:/^\d{10}$/'],
            'external_customer_id' => 'nullable|exists:customers,id',
            'delivery_route_id' => 'required|exists:delivery_routes,id',
            'first_name' => 'nullable|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'br_number' => 'nullable|string|max:255',
            'tin_number' => 'nullable|string|max:255',
            'address_line_1' => 'nullable|string|max:255',
            'address_line_2' => 'nullable|string|max:255',
            'locality' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:255',
            'phone_2' => ['nullable', 'string', 'regex:/^\d{10}$/'],
            'email' => 'nullable|email|max:255',
            'current_balance' => 'nullable|numeric',
            'credit_limit' => 'nullable|numeric',
        ]);

        // If a route is provided, ensure it belongs to the same company
        if ($request->filled('delivery_route_id')) {
            $route = \App\Models\DeliveryRoute::find($request->delivery_route_id);
            if (!$route || $route->company_code !== request()->user()->company_code) {
                return back()->withErrors(['delivery_route_id' => 'Selected route is invalid for your company.'])->withInput();
            }
        }

        $fullAddress = collect([$request->address_line_1, $request->address_line_2, $request->locality, $request->city])
            ->filter()
            ->implode(', ');

        Shop::create([
            'name' => $request->name,
            'address' => $fullAddress,
            'contact_phone' => $request->contact_phone,
            'external_customer_id' => $request->external_customer_id,
            'delivery_route_id' => $request->delivery_route_id,
            'company_code' => request()->user()->company_code,
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'br_number' => $request->br_number,
            'tin_number' => $request->tin_number,
            'address_line_1' => $request->address_line_1,
            'address_line_2' => $request->address_line_2,
            'locality' => $request->locality,
            'city' => $request->city,
            'phone_2' => $request->phone_2,
            'email' => $request->email,
            'current_balance' => $request->current_balance ?? 0,
            'credit_limit' => $request->credit_limit ?? 0,
        ]);

        return redirect()->route('delivery.shops.index')->with('success', 'Shop created.');
    }

    public function edit(Shop $shop)
    {
        if (!request()->user()->hasPermission('shops.edit')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        if ($shop->company_code !== request()->user()->company_code) abort(404);

        $companyCode = request()->user()->company_code;
        $routes = \App\Models\DeliveryRoute::where('company_code', $companyCode)->where('is_active', true)->get(['id', 'name']);

        return Inertia::render('delivery/shops/edit', ['shop' => $shop, 'routes' => $routes]);
    }

    public function update(Request $request, Shop $shop)
    {
        if (!request()->user()->hasPermission('shops.edit')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        if ($shop->company_code !== request()->user()->company_code) abort(404);

        $request->validate([
            'name' => 'required|string|max:255',
            'address' => 'nullable|string|max:500',
            'contact_phone' => ['nullable', 'string', 'regex:/^\d{10}$/'],
            'external_customer_id' => 'nullable|exists:customers,id',
            'delivery_route_id' => 'required|exists:delivery_routes,id',
            'first_name' => 'nullable|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'br_number' => 'nullable|string|max:255',
            'tin_number' => 'nullable|string|max:255',
            'address_line_1' => 'nullable|string|max:255',
            'address_line_2' => 'nullable|string|max:255',
            'locality' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:255',
            'phone_2' => ['nullable', 'string', 'regex:/^\d{10}$/'],
            'email' => 'nullable|email|max:255',
            'current_balance' => 'nullable|numeric',
            'credit_limit' => 'nullable|numeric',
        ]);

        if ($request->filled('delivery_route_id')) {
            $route = \App\Models\DeliveryRoute::find($request->delivery_route_id);
            if (!$route || $route->company_code !== request()->user()->company_code) {
                return back()->withErrors(['delivery_route_id' => 'Selected route is invalid for your company.'])->withInput();
            }
        }

        $updateData = $request->only([
            'name', 'contact_phone', 'external_customer_id', 'delivery_route_id', 'is_active',
            'first_name', 'last_name', 'br_number', 'tin_number', 'address_line_1', 'address_line_2',
            'locality', 'city', 'phone_2', 'email', 'current_balance', 'credit_limit'
        ]);

        $updateData['address'] = collect([$request->address_line_1, $request->address_line_2, $request->locality, $request->city])
            ->filter()
            ->implode(', ');

        $shop->update($updateData);

        return redirect()->route('delivery.shops.index')->with('success', 'Shop updated.');
    }

    public function destroy(Shop $shop)
    {
        if (!request()->user()->hasPermission('shops.delete')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        if ($shop->company_code !== request()->user()->company_code) abort(404);

        $shop->delete();

        return redirect()->route('delivery.shops.index')->with('success', 'Shop deleted.');
    }

    /**
     * Toggle the active state of a shop.
     */
    public function updateStatus(Request $request, Shop $shop)
    {
        if (!request()->user()->hasPermission('shops.edit')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        if ($shop->company_code !== request()->user()->company_code) abort(404);

        $shop->update(['is_active' => !$shop->is_active]);

        return redirect()->back()->with('success', 'Shop status updated.');
    }
}

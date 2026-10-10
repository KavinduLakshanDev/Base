<?php

namespace App\Http\Controllers;

use App\Models\DeliveryRoute;
use App\Models\Shop;
use Illuminate\Http\Request;

class RouteShopController extends Controller
{
    public function attach(Request $request, DeliveryRoute $route)
    {
        if (!request()->user()->hasPermission('routes.assign_shops')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        if ($route->company_code !== request()->user()->company_code) abort(404);

        $request->validate([
            'shop_id' => 'required|exists:shops,id',
            'sort_order' => 'nullable|integer',
        ]);

        $shop = Shop::findOrFail($request->shop_id);
        if ($shop->company_code !== request()->user()->company_code) abort(404);

        $route->shops()->syncWithoutDetaching([
            $shop->id => ['sort_order' => $request->sort_order ?? 0]
        ]);

        return redirect()->back()->with('success', 'Shop assigned to route.');
    }

    public function detach(DeliveryRoute $route, Shop $shop)
    {
        if (!request()->user()->hasPermission('routes.assign_shops')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        if ($route->company_code !== request()->user()->company_code || $shop->company_code !== request()->user()->company_code) abort(404);

        $route->shops()->detach($shop->id);

        return redirect()->back()->with('success', 'Shop removed from route.');
    }
}

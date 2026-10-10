<?php

namespace App\Http\Controllers;

use App\Models\PointsRule;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class PointsRulesController extends Controller
{
    public function __construct()
    {
        // Middleware is already applied at the route level via company_admin group
        // TODO: Add middleware to check if user is company admin
    }

    /**
     * Display the points rule for the user's company.
     */
    public function index(): Response
    {
        $rule = PointsRule::where('company_code', auth()->user()->company_code)->first();

        return Inertia::render('admin/PointsRules', [
            'rule' => $rule,
        ]);
    }

    /**
     * Store or update the points rule for the user's company.
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'currency_amount' => 'required|numeric|min:0.01',
            'points_earned' => 'required|integer|min:1',
        ]);

        PointsRule::updateOrCreate(
            ['company_code' => auth()->user()->company_code],
            [
                'currency_amount' => $request->currency_amount,
                'points_earned' => $request->points_earned,
            ]
        );

        return redirect()->back()->with('success', 'Points rule updated successfully.');
    }

    // Other methods not needed for this feature, but keep for completeness
    public function create() {}
    public function show(string $id) {}
    public function edit(string $id) {}
    public function update(Request $request, string $id) {}
    public function destroy(string $id) {}
}
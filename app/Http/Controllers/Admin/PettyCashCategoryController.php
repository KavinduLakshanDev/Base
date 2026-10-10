<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PettyCashCategory;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PettyCashCategoryController extends Controller
{
    // public function index(Request $request)
    // {
    //     if (! request()->user()->hasPermission('petty_cash.view')) {
    //         return redirect()->back()->with('error', 'Unauthorized.');
    //     }
    //     $query = PettyCashCategory::query();
    //     if ($request->search) {
    //         $query->where('name', 'like', "%{$request->search}%");
    //     }
    //     if ($request->status && in_array($request->status, ['active', 'inactive'])) {
    //         $query->where('status', $request->status);
    //     }
    //     // scope by company/section if user not super
    //     if ($user = $request->user()) {
    //         if ($user->role_id !== 1) {
    //             if ($user->role_id === 3) {
    //                 $query->where('section_code', $user->section_code);
    //             } else {
    //                 $query->where('company_code', $user->company_code);
    //             }
    //         }
    //     }
    //     $categories = $query->orderBy('name')->paginate(20)->withQueryString();

    //     return Inertia::render('admin/PettyCashCategories/Index', [
    //         'categories' => $categories,
    //         'filters' => $request->only('search', 'status'),
    //     ]);
    // }

    // public function create(Request $request)
    // {
    //     if (! request()->user()->hasPermission('petty_cash.create')) {
    //         return redirect()->back()->with('error', 'Unauthorized.');
    //     }
    //     return Inertia::render('admin/PettyCashCategories/Create');
    // }

    // public function store(Request $request)
    // {
    //     if (! request()->user()->hasPermission('petty_cash.create')) {
    //         return redirect()->back()->with('error', 'Unauthorized.');
    //     }
    //     $data = $request->validate([
    //         'name' => 'required|string|max:255',
    //         'description' => 'nullable|string',
    //         'status' => 'nullable|in:active,inactive',
    //     ]);

    //     if ($user = $request->user()) {
    //         $data['company_code'] = $user->company_code;
    //         $data['section_code'] = $user->section_code;
    //     }

    //     PettyCashCategory::create($data);

    //     return redirect()->route('admin.petty-cash-categories.index')->with('success', 'Petty cash category created successfully.');
    // }

    // public function toggleStatus(PettyCashCategory $petty_cash_category)
    // {
    //     if (! request()->user()->hasPermission('petty_cash.edit')) {
    //         return redirect()->back()->with('error', 'Unauthorized.');
    //     }
    //     $petty_cash_category->status = $petty_cash_category->status === 'active' ? 'inactive' : 'active';
    //     $petty_cash_category->save();

    //     return redirect()->back()->with('success', "Petty cash category set to {$petty_cash_category->status}.");
    // }

    // public function edit(Request $request, PettyCashCategory $petty_cash_category)
    // {
    //     if (! request()->user()->hasPermission('petty_cash.edit')) {
    //         return redirect()->back()->with('error', 'Unauthorized.');
    //     }
    //     return Inertia::render('admin/PettyCashCategories/Edit', [
    //         'category' => $petty_cash_category->only('id', 'name', 'description', 'status'),
    //     ]);
    // }

    // public function update(Request $request, PettyCashCategory $petty_cash_category)
    // {
    //     if (! request()->user()->hasPermission('petty_cash.edit')) {
    //         return redirect()->back()->with('error', 'Unauthorized.');
    //     }
    //     $data = $request->validate([
    //         'name' => 'required|string|max:255',
    //         'description' => 'nullable|string',
    //         'status' => 'nullable|in:active,inactive',
    //     ]);

    //     $petty_cash_category->update($data);

    //     return redirect()->route('admin.petty-cash-categories.index')->with('success', 'Petty cash category updated successfully.');
    // }

    // public function destroy(PettyCashCategory $petty_cash_category)
    // {
    //     if (! request()->user()->hasPermission('petty_cash.delete')) {
    //         return redirect()->back()->with('error', 'Unauthorized.');
    //     }
    //     $petty_cash_category->delete();
    //     return redirect()->back()->with('success', 'Petty cash category deleted.');
    // }
}

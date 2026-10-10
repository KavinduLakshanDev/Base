<?php

namespace App\Http\Controllers;

use App\Models\Section;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class SectionController extends Controller
{
    public function index()
    {
        if (! request()->user() || ! request()->user()->hasPermission('sections.view')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view sections.');
        }
        $user = request()->user();
        
        if ($user instanceof \App\Models\User) {
            $company = $user->company;
            $sections = $company ? $company->accessible_sections : collect([]);
        } else {
            /** @var \App\Models\Company $company */
            $company = $user;
            $sections = $company->accessible_sections;
        }

        return Inertia::render('sections/index', [
            'sections' => $sections
        ]);
    }

    // public function create()
    // {
    //     if (! request()->user() || ! request()->user()->hasPermission('sections.create')) {
    //         return redirect()->back()->with('error', 'Unauthorized. You do not have permission to create sections.');
    //     }
    //     return Inertia::render('sections/create');
    // }

    public function store(Request $request)
    {
        if (! request()->user() || ! request()->user()->hasPermission('sections.create')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to create sections.');
        }
        $validated = $request->validate([
            'section_code' => 'required|string|unique:sections,section_code',
            'name' => 'required|string|max:255',

            'section_type' => 'required|in:warehouse,store,office,other',
            'is_main_stock' => 'boolean',
        ]);

        $validated['uuid'] = Str::uuid();
        $validated['company_code'] = $request->user()->company_code;
        $validated['is_active'] = true;

        Section::create($validated);

        return redirect()->route('sections.index')->with('success', 'Section created successfully.');
    }

    public function show(Section $section)
    {
        if (! request()->user() || ! request()->user()->hasPermission('sections.view')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view sections.');
        }
        $user = request()->user();

        if ($user instanceof \App\Models\User) {
            $company = $user->company;
            $accessibleSections = $company ? $company->accessible_sections : collect([]);
        } else {
            /** @var \App\Models\Company $company */
            $company = $user;
            $accessibleSections = $company->accessible_sections;
        }

        if (!$accessibleSections->contains('id', $section->id)) {
            return redirect()->back()->with('error', 'Unauthorized access to section.');
        }

        return Inertia::render('sections/show', [
            'section' => $section
        ]);
    }

    // public function edit(Section $section)
    // {
    //     if (! request()->user() || ! request()->user()->hasPermission('sections.edit')) {
    //         return redirect()->back()->with('error', 'Unauthorized. You do not have permission to edit sections.');
    //     }
    //     $user = request()->user();

    //     if ($user instanceof \App\Models\User) {
    //         $company = $user->company;
    //         $accessibleSections = $company ? $company->accessible_sections : collect([]);
    //     } else {
    //         /** @var \App\Models\Company $company */
    //         $company = $user;
    //         $accessibleSections = $company->accessible_sections;
    //     }

    //     if (!$accessibleSections->contains('id', $section->id)) {
    //         return redirect()->back()->with('error', 'Unauthorized access to section.');
    //     }

    //     return Inertia::render('sections/edit', [
    //         'section' => $section
    //     ]);
    // }

    // public function update(Request $request, Section $section)
    // {
    //     if (! request()->user() || ! request()->user()->hasPermission('sections.edit')) {
    //         return redirect()->back()->with('error', 'Unauthorized. You do not have permission to edit sections.');
    //     }
    //     $user = request()->user();

    //     if ($user instanceof \App\Models\User) {
    //         $company = $user->company;
    //         $accessibleSections = $company ? $company->accessible_sections : collect([]);
    //     } else {
    //         /** @var \App\Models\Company $company */
    //         $company = $user;
    //         $accessibleSections = $company->accessible_sections;
    //     }

    //     if (!$accessibleSections->contains('id', $section->id)) {
    //         return redirect()->back()->with('error', 'Unauthorized access to section.');
    //     }

    //     $validated = $request->validate([
    //         'section_code' => 'nullable|string', // Read-only field, no need for uniqueness validation
    //         'name' => 'required|string|max:255',

    //         'section_type' => 'required|in:warehouse,store,office,other',
    //         'is_main_stock' => 'boolean',
    //     ]);

    //     $section->update($validated);

    //     return redirect()->route('sections.show', $section)->with('success', 'Section updated successfully.');
    // }

    public function apiIndex(Request $request)
    {
        if (! $request->user() || ! $request->user()->hasPermission('sections.view')) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }
        $query = Section::with('company');

        $user = $request->user('company');
        
        if (!$user) {
            // Try getting regular user if company user not found
            $user = $request->user();
        }

        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // Super Admin can see all sections
        if ($user->role_id === 1) {
            if ($request->has('company_code')) {
                $query->where('company_code', $request->company_code);
            }
            return response()->json($query->get());
        }

        // Vismass Company Admin can see Vismass and Malibu sections
        if ($user->company_code === 'VIS001') {
            $query->whereIn('company_code', ['VIS001', 'MAL001']);
        } else {
            // Other Company Admins can only see their own sections
            $query->where('company_code', $user->company_code);
        }

        return response()->json($query->get());
    }
}

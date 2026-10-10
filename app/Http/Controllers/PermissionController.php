<?php

namespace App\Http\Controllers;

use App\Models\Permission;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Validator;

class PermissionController extends Controller
{
    /**
     * Display a listing of the permissions.
     */
    public function index(Request $request): Response
    {
        if (!$request->user()->hasPermission('permissions.view')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view permissions.');
        }

        $query = Permission::query();

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('slug', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $permissions = $query->orderBy('name')->paginate(20)->withQueryString();

        return Inertia::render('Permissions/Index', [
            'permissions' => $permissions,
            'filters' => $request->only(['search']),
            'success' => session('success'),
            'error' => session('error'),
        ]);
    }

    /**
     * Show the form for creating a new permission.
     */
    public function create(): Response
    {
        if (!request()->user()->hasPermission('permissions.create')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to create permissions.');
        }
        return Inertia::render('Permissions/Create');
    }

    /**
     * Store a newly created permission in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        if (!$request->user()->hasPermission('permissions.create')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to create permissions.');
        }
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:permissions,name',
            'slug' => 'nullable|string|max:255|unique:permissions,slug',
            'description' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return redirect()->back()
                ->withErrors($validator)
                ->withInput();
        }

        $data = $validator->validated();

        // Auto-generate slug if not provided
        if (empty($data['slug'])) {
            $data['slug'] = Str::slug($data['name'], '_');
        }

        // Ensure slug is unique
        $originalSlug = $data['slug'];
        $counter = 1;
        while (Permission::where('slug', $data['slug'])->exists()) {
            $data['slug'] = $originalSlug . '_' . $counter;
            $counter++;
        }

        Permission::create($data);

        return redirect()->route('permissions.index')
            ->with('success', 'Permission created successfully.');
    }

    /**
     * Display the specified permission.
     */
    public function show(Permission $permission): Response
    {
        if (!request()->user()->hasPermission('permissions.view')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view permissions.');
        }
        $permission->load('roles');

        return Inertia::render('Permissions/Show', [
            'permission' => $permission,
        ]);
    }

    /**
     * Show the form for editing the specified permission.
     */
    public function edit(Permission $permission): Response
    {
        if (!request()->user()->hasPermission('permissions.edit')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to edit permissions.');
        }
        return Inertia::render('Permissions/Edit', [
            'permission' => $permission,
        ]);
    }

    /**
     * Update the specified permission in storage.
     */
    public function update(Request $request, Permission $permission): RedirectResponse
    {
        if (!$request->user()->hasPermission('permissions.edit')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to edit permissions.');
        }
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:permissions,name,' . $permission->id,
            'slug' => 'nullable|string|max:255|unique:permissions,slug,' . $permission->id,
            'description' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return redirect()->back()
                ->withErrors($validator)
                ->withInput();
        }

        $data = $validator->validated();

        // Auto-generate slug if not provided
        if (empty($data['slug'])) {
            $data['slug'] = Str::slug($data['name'], '_');
        }

        // Ensure slug is unique (excluding current permission)
        $originalSlug = $data['slug'];
        $counter = 1;
        while (Permission::where('slug', $data['slug'])->where('id', '!=', $permission->id)->exists()) {
            $data['slug'] = $originalSlug . '_' . $counter;
            $counter++;
        }

        $permission->update($data);

        return redirect()->route('permissions.index')
            ->with('success', 'Permission updated successfully.');
    }

    /**
     * Remove the specified permission from storage.
     */
    public function destroy(Request $request, Permission $permission): RedirectResponse
    {
        if (!$request->user()->hasPermission('permissions.delete')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to delete permissions.');
        }
        $force = (bool) $request->get('force', false);

        // If not forcing deletion and permission is used by roles, block
        if (!$force && $permission->roles()->exists()) {
            return redirect()->back()->with('error', 'Cannot delete permission. It is currently assigned to one or more roles.');
        }

        // If forcing deletion, restrict to super_admin only
        if ($force) {
            $user = request()->user();
            if (!$user || !$user->isSuperAdmin()) {
                return redirect()->back()->with('error', 'Only super_admins can force delete permissions.');
            }

            // Detach from all roles, then delete
            $permission->roles()->detach();
            \Illuminate\Support\Facades\Log::info("Permission {$permission->id} force-deleted by user " . ($user?->id ?? 'unknown'));
            $permission->delete();

            return redirect()->route('permissions.index')->with('success', 'Permission force-deleted successfully.');
        }

        $permission->delete();

        return redirect()->route('permissions.index')->with('success', 'Permission deleted successfully.');
    }

    /**
     * Get all permissions for API use (used in dropdowns, etc.)
     */
    public function getAllPermissions(): \Illuminate\Http\JsonResponse
    {
        $permissions = Permission::select('id', 'name', 'slug', 'description')
            ->orderBy('name')
            ->get();

        return response()->json($permissions);
    }

    /**
     * Search permissions
     */
    public function search(Request $request): \Illuminate\Http\JsonResponse
    {
        $query = $request->get('query', '');

        $permissions = Permission::where('name', 'like', "%{$query}%")
            ->orWhere('slug', 'like', "%{$query}%")
            ->orWhere('description', 'like', "%{$query}%")
            ->orderBy('name')
            ->limit(20)
            ->get();

        return response()->json($permissions);
    }
}
<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\AdminBarcodeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class UserController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('auth:web,company'),
        ];
    }

    public function index(Request $request)
    {
        $query = User::with(['company', 'section', 'role']);
        $user = $request->user();

        // If not super admin, filter by the user's company
        if ($user && $user->user_type !== 'super_admin') {
            $query->where('company_code', $user->company_code);
        }

        // Filter by section
        if ($request->has('section_code')) {
            $query->where('section_code', $request->section_code);
        }

        // Filter by role
        if ($request->has('role_id')) {
            $query->where('role_id', $request->role_id);
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'username' => 'required|string|max:255|unique:users',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'user_type' => 'required|in:super_admin,company_admin,company_user',
            'company_code' => 'nullable|string|exists:companies,company_code',
            'section_code' => 'nullable|string|exists:sections,section_code',
            'delivery_section_code' => 'nullable|string|exists:sections,section_code',
            'role_id' => 'required|exists:roles,id',
            'is_active' => 'boolean',
        ]);

        $validated['password'] = Hash::make($validated['password']);
        $validated['uuid'] = Str::uuid();

        $user = User::create($validated);

        // No auto-generation — admin barcode must be set manually via edit modal

        return response()->json($user->load(['company', 'section', 'role']), 201);
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'username' => ['required', 'string', 'max:255', Rule::unique('users')->ignore($user->id)],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'user_type' => 'required|in:super_admin,company_admin,company_user',
            'company_code' => 'nullable|string|exists:companies,company_code',
            'section_code' => 'nullable|string|exists:sections,section_code',
            'delivery_section_code' => 'nullable|string|exists:sections,section_code',
            'role_id' => 'required|exists:roles,id',
            'is_active' => 'boolean',
        ]);

        $user->update($validated);

        // Handle barcode based on role change
        $role = \App\Models\Role::find($validated['role_id']);
        if ($role && ($role->level === 'company_admin' || $role->slug === 'accounts_manager')) {
            // No auto-generation - user must manually enter barcode
        } else {
            // Role changed away from allowed roles - clear barcode
            if ($user->admin_barcode) {
                \App\Models\AdminBarcodeHistory::create([
                    'user_id'              => $user->id,
                    'admin_barcode'        => $user->admin_barcode,
                    'admin_barcode_token'  => $user->admin_barcode_token,
                    'barcode_month'        => $user->admin_barcode_month,
                    'company_code'         => $user->company_code,
                    'is_revoked'           => true,
                    'revoked_at'           => now(),
                ]);
                $user->update([
                    'admin_barcode'       => null,
                    'admin_barcode_token' => null,
                    'admin_barcode_month' => null,
                ]);
            }
        }

        return response()->json($user->load(['company', 'section', 'role']));
    }

    public function regenerateBarcode(User $user)
    {
        $barcodeService = new AdminBarcodeService();
        $barcode = $barcodeService->regenerateForUser($user);

        return response()->json([
            'admin_barcode' => $barcode,
            'message' => 'Barcode regenerated successfully.',
        ]);
    }

    public function saveBarcode(Request $request, User $user)
    {
        $validated = $request->validate([
            'admin_barcode' => 'required|string|max:100',
        ]);

        $barcodeValue = $validated['admin_barcode'];

        // Check if barcode is currently used by another user
        $usedByOther = User::where('admin_barcode', $barcodeValue)
            ->where('id', '!=', $user->id)
            ->exists();

        if ($usedByOther) {
            return response()->json([
                'message' => 'This barcode is already in use by another user.',
            ], 422);
        }

        // Check if barcode was used previously (in history)
        $usedInHistory = \App\Models\AdminBarcodeHistory::where('admin_barcode', $barcodeValue)
            ->exists();

        if ($usedInHistory) {
            return response()->json([
                'message' => 'This barcode was used before and cannot be reused. Please enter a different barcode.',
            ], 422);
        }

        $barcodeService = new AdminBarcodeService();
        $barcode = $barcodeService->saveManualBarcode($user, $barcodeValue);

        return response()->json([
            'admin_barcode' => $barcode,
            'message' => 'Barcode saved successfully.',
        ]);
    }

    public function barcodeHistory(User $user)
    {
        return response()->json($user->barcodeHistory);
    }

    public function destroy(User $user)
    {
        $user->delete();
        return response()->json(['message' => 'User deleted successfully']);
    }
}

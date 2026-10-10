<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DayOpeningBalance;
use App\Models\User;
use App\Models\Role;
use App\Models\Company;
use App\Models\Section;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class DayOpeningBalanceController extends Controller
{
    /**
     * Display a listing of day opening balances.
     */
    public function index(Request $request)
    {
        if (! request()->user()->hasPermission('day_opening_balances.view')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $user = Auth::user();

        // Base query with authorization
        $query = DayOpeningBalance::with(['user.role', 'creator', 'approver', 'company', 'section']);

        // Apply role-based filtering
        if ($user->role_id !== 1) { // Not a Superadmin
            $query->where('company_code', $user->company_code);

            // Determine if the user is a cashier
            $isCashier = $user->role?->slug === 'cashier' ||
                        Str::endsWith($user->role?->slug ?? '', '_cashier');

            if ($isCashier) {
                // Cashiers only see their own balances
                $query->where('user_id', $user->id);
            } else if ($user->role_id === 3 || $user->role_id === 4 || $user->role_id === 5) {
                // Further restrict for section admins or staff
                if ($user->section_code) {
                    $query->where('section_code', $user->section_code);
                }
            }
        }

        // Apply filters
        if ($request->filled('date')) {
            $query->where('balance_date', $request->date);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        $perPage = $request->input('per_page', 15);
        $balances = $query->orderBy('balance_date', 'desc')
                          ->orderBy('created_at', 'desc')
                          ->paginate($perPage)
                          ->withQueryString();

        $isCashier = $user->role?->slug === 'cashier' ||
                    Str::endsWith($user->role?->slug ?? '', '_cashier');

        $users = [];
        if (!$isCashier) {
            $users = User::when($user->role_id !== 1, function($q) use ($user) {
                            return $q->where('company_code', $user->company_code);
                        })
                        ->when($user->role_id === 3 || $user->role_id === 4 || $user->role_id === 5, function($q) use ($user) {
                            if ($user->section_code) {
                                return $q->where('section_code', $user->section_code);
                            }
                            return $q;
                        })
                        ->with('role:id,slug,name')
                        ->select('id', 'first_name', 'last_name', 'role_id')
                        ->get()
                        ->map(function ($user) {
                            return [
                                'id' => $user->id,
                                'name' => trim($user->first_name . ' ' . $user->last_name),
                                'role' => $user->role ? [
                                    'id' => $user->role->id,
                                    'slug' => $user->role->slug,
                                    'name' => $user->role->name,
                                ] : null,
                            ];
                        });
        }
        return Inertia::render('admin/day-opening-balances/index', [
            'balances' => $balances,
            'users' => $users,
            'filters' => $request->only(['date', 'status', 'user_id', 'per_page']),
            'auth' => [
                'user' => [
                    'id' => $user->id,
                    'name' => trim($user->first_name . ' ' . $user->last_name),
                    'role' => $user->role ? [
                        'id' => $user->role->id,
                        'slug' => $user->role->slug,
                        'name' => $user->role->name,
                    ] : null,
                ],
            ],
            'flash' => [
                'success' => session('success'),
                'error' => session('error'),
            ],
        ]);
    }

    /**
     * Show the form for creating a new day opening balance.
     */
    public function create()
    {
        if (! request()->user()->hasPermission('day_opening_balances.create')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $user = Auth::user();

        // determine role flags used by frontend
        $isCashier = $user->role?->slug === 'cashier' || 
            \Illuminate\Support\Str::endsWith($user->role?->slug ?? '', '_cashier') ||
            $user->role?->slug === 'sales_rep' ||
            \Illuminate\Support\Str::endsWith($user->role?->slug ?? '', '_sales_rep') ||
            $user->delivery_section_code !== null;
        // company admins may have plain slug or company-prefixed variant (e.g. vis001_company_admin)
        $isCompanyAdmin = $user->role?->slug === 'company_admin' ||
            \Illuminate\Support\Str::endsWith($user->role?->slug ?? '', '_company_admin') ||
            $user->role_id === 2; // fallback on role_id classification

        // build user list depending on the acting user's role
        if ($isCashier) {
            // cashier only needs their own record; the form will hide the selector
            $users = collect([[
                'id' => $user->id,
                'name' => trim($user->first_name . ' ' . $user->last_name),
                'role' => $user->role ? [
                    'id' => $user->role->id,
                    'slug' => $user->role->slug,
                    'name' => $user->role->name,
                ] : null,
            ]]);
        } elseif ($isCompanyAdmin) {
            // company admins should be able to pick any user in their company
            $users = User::where('company_code', $user->company_code)
                        ->with(['role:id,slug,name'])
                        ->select('id', 'first_name', 'last_name', 'role_id')
                        ->get()
                        ->map(function ($u) {
                            return [
                                'id' => $u->id,
                                'name' => trim($u->first_name . ' ' . $u->last_name),
                                'role' => $u->role ? [
                                    'id' => $u->role->id,
                                    'slug' => $u->role->slug,
                                    'name' => $u->role->name,
                                ] : null,
                            ];
                        });
        } else {
            // default behaviour for super‑admins/others: only cashiers and company admins
            $roleSlugs = ['cashier', 'company_admin'];
            $roleIds = Role::whereIn('slug', $roleSlugs)->pluck('id');

            $users = User::whereIn('role_id', $roleIds)
                        ->when($user->role_id === 2, fn($q) => $q->where('company_code', $user->company_code))
                        ->when($user->role_id === 3, fn($q) => $q->where('section_code', $user->section_code))
                        ->with(['role:id,slug,name'])
                        ->select('id', 'first_name', 'last_name', 'role_id')
                        ->get()
                        ->map(function ($u) {
                            return [
                                'id' => $u->id,
                                'name' => trim($u->first_name . ' ' . $u->last_name),
                                'role' => $u->role ? [
                                    'id' => $u->role->id,
                                    'slug' => $u->role->slug,
                                    'name' => $u->role->name,
                                ] : null,
                            ];
                        });
        }

        // pass current user details as well so frontend can default/hide selector
        $currentUser = [
            'id' => $user->id,
            'name' => trim($user->first_name . ' ' . $user->last_name),
            'role' => $user->role ? [
                'id' => $user->role->id,
                'slug' => $user->role->slug,
                'name' => $user->role->name,
            ] : null,
        ];

        // Add previous day's closing BBF for each user
        $users = $users->map(function ($u) {
            $latestReconciliation = \App\Models\CashReconciliation::where('user_id', $u['id'])
                ->orderBy('reconciliation_date', 'desc')
                ->first();
            
            $closingBbf = 0;
            if ($latestReconciliation) {
                $closingBbf = $latestReconciliation->actual_cash - $latestReconciliation->transfers;
            }
            
            $u['closing_bbf'] = $closingBbf;
            return $u;
        });

        return Inertia::render('admin/day-opening-balances/create', [
            'users' => $users,
            'currentUser' => $currentUser,
            'isCashier' => $isCashier,
            'isCompanyAdmin' => $isCompanyAdmin,
            'flash' => [
                'success' => session('success'),
                'error' => session('error'),
            ],
        ]);
    }

    /**
     * Store a newly created day opening balance.
     */
    public function store(Request $request): RedirectResponse
    {
        if (! request()->user()->hasPermission('day_opening_balances.create')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $validated = $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'balance_date' => ['required', 'date', 'before_or_equal:today'],
            'opening_balance' => ['required', 'numeric', 'min:0'],
            'currency' => ['required', 'string', 'size:3'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $user = Auth::user();

        // If the acting user is a cashier (including company-specific slug)
        // we silently ignore whatever was sent and always make the balance for
        // the current account.
        $isCashier = $user->role?->slug === 'cashier' ||
            \Illuminate\Support\Str::endsWith($user->role?->slug ?? '', '_cashier') ||
            $user->role?->slug === 'sales_rep' ||
            \Illuminate\Support\Str::endsWith($user->role?->slug ?? '', '_sales_rep') ||
            $user->delivery_section_code !== null;
        if ($isCashier) {
            $validated['user_id'] = $user->id;
        }

        $selectedUser = User::with('role')->findOrFail($validated['user_id']);

        // ensure selected user is either a cashier, company admin, or sales rep
        // allow company-specific variants (e.g. vis001_cashier, mal001_company_admin)
        $slug = $selectedUser->role?->slug;
        $isEligible = false;
        if ($slug) {
            $isEligible = $slug === 'cashier' || Str::endsWith($slug, '_cashier')
                        || $slug === 'company_admin' || Str::endsWith($slug, '_company_admin')
                        || $slug === 'sales_rep' || Str::endsWith($slug, '_sales_rep')
                        || $selectedUser->delivery_section_code !== null;
        }
        if (! $isEligible) {
            abort(403, 'Selected user is not eligible for an opening balance.');
        }

        // Authorization check
        if ($user->role_id === 3 && $selectedUser->section_code !== $user->section_code) {
            abort(403, 'Unauthorized access.');
        }

        if ($user->role_id === 2 && $selectedUser->company_code !== $user->company_code) {
            abort(403, 'Unauthorized access.');
        }

        // Check if balance already exists for this user and date
        $existing = DayOpeningBalance::where('user_id', $validated['user_id'])
                                    ->where('balance_date', $validated['balance_date'])
                                    ->where('company_code', $selectedUser->company_code)
                                    ->where('section_code', $selectedUser->section_code)
                                    ->first();

        if ($existing) {
            return redirect()->back()
                ->withInput()
                ->with('error', 'Opening balance already exists for this user and date.');
        }

        try {
            DB::beginTransaction();

            DayOpeningBalance::create([
                ...$validated,
                'company_code' => $selectedUser->company_code,
                'section_code' => $selectedUser->section_code,
                'created_by' => $user->id,
                'status' => 'active',
            ]);

            DB::commit();

            return redirect()->route('admin.day-opening-balances.index')
                ->with('success', 'Day opening balance created successfully.');

        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()
                ->withInput()
                ->with('error', 'Failed to create day opening balance: ' . $e->getMessage());
        }
    }

    /**
     * Display the specified day opening balance.
     */
    public function show(DayOpeningBalance $dayOpeningBalance)
    {
        if (! request()->user()->hasPermission('day_opening_balances.view')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $user = Auth::user();

        // Authorization check
        $isCashier = Auth::user()->role?->slug === 'cashier' || Str::endsWith(Auth::user()->role?->slug ?? '', '_cashier') || Auth::user()->role?->slug === 'sales_rep' || Str::endsWith(Auth::user()->role?->slug ?? '', '_sales_rep') || Auth::user()->delivery_section_code !== null;
        if ($isCashier && $dayOpeningBalance->user_id !== Auth::user()->id) abort(403);

        if ($user->role_id === 3 && $dayOpeningBalance->section_code !== $user->section_code) {
            abort(403, 'Unauthorized access.');
        }

        if ($user->role_id === 2 && $dayOpeningBalance->company_code !== $user->company_code) {
            abort(403, 'Unauthorized access.');
        }

        $dayOpeningBalance->load(['user.role', 'user.company', 'user.section', 'creator', 'approver', 'company', 'section']);

        return Inertia::render('admin/day-opening-balances/show', [
            'balance' => $dayOpeningBalance,
            'flash' => [
                'success' => session('success'),
                'error' => session('error'),
            ],
        ]);
    }

    /**
     * Show the form for editing the specified day opening balance.
     */
    public function edit(DayOpeningBalance $dayOpeningBalance)
    {
        if (! request()->user()->hasPermission('day_opening_balances.edit')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $user = Auth::user();

        // Authorization check
        $isCashier = Auth::user()->role?->slug === 'cashier' || Str::endsWith(Auth::user()->role?->slug ?? '', '_cashier') || Auth::user()->role?->slug === 'sales_rep' || Str::endsWith(Auth::user()->role?->slug ?? '', '_sales_rep') || Auth::user()->delivery_section_code !== null;
        if ($isCashier && $dayOpeningBalance->user_id !== Auth::user()->id) abort(403);

        if ($user->role_id === 3 && $dayOpeningBalance->section_code !== $user->section_code) {
            abort(403, 'Unauthorized access.');
        }

        if ($user->role_id === 2 && $dayOpeningBalance->company_code !== $user->company_code) {
            abort(403, 'Unauthorized access.');
        }

        // Cashiers cannot edit their own balances without admin approval
        $canEditDirectly = $user->role_id <= 2 || // Super admin or Company admin
                          ($user->id !== $dayOpeningBalance->user_id); // Not editing own balance

        $dayOpeningBalance->load(['user.role', 'user.company', 'user.section', 'creator', 'approver']);

        return Inertia::render('admin/day-opening-balances/edit', [
            'balance' => $dayOpeningBalance,
            'canEditDirectly' => $canEditDirectly,
            'flash' => [
                'success' => session('success'),
                'error' => session('error'),
            ],
        ]);
    }

    /**
     * Update the specified day opening balance.
     */
    public function update(Request $request, DayOpeningBalance $dayOpeningBalance): RedirectResponse
    {
        if (! request()->user()->hasPermission('day_opening_balances.edit')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $user = Auth::user();

        // Authorization check
        $isCashier = Auth::user()->role?->slug === 'cashier' || Str::endsWith(Auth::user()->role?->slug ?? '', '_cashier') || Auth::user()->role?->slug === 'sales_rep' || Str::endsWith(Auth::user()->role?->slug ?? '', '_sales_rep') || Auth::user()->delivery_section_code !== null;
        if ($isCashier && $dayOpeningBalance->user_id !== Auth::user()->id) abort(403);

        if ($user->role_id === 3 && $dayOpeningBalance->section_code !== $user->section_code) {
            abort(403, 'Unauthorized access.');
        }

        if ($user->role_id === 2 && $dayOpeningBalance->company_code !== $user->company_code) {
            abort(403, 'Unauthorized access.');
        }

        $validated = $request->validate([
            'opening_balance' => ['required', 'numeric', 'min:0'],
            'currency' => ['required', 'string', 'size:3'],
            'notes' => ['nullable', 'string', 'max:500'],
            'admin_username' => ['nullable', 'string'],
            'admin_password' => ['nullable', 'string'],
        ]);

        // Check if admin approval is required
        $requiresApproval = $user->role_id === 3 && $user->id === $dayOpeningBalance->user_id;

        if ($requiresApproval) {
            // Validate admin credentials
            if (!$validated['admin_username'] || !$validated['admin_password']) {
                return redirect()->back()
                    ->withInput()
                    ->with('error', 'Admin approval required for editing your own opening balance.');
            }

            $admin = User::where('email', $validated['admin_username'])
                        ->whereIn('role_id', [1, 2]) // Super admin or Company admin
                        ->where('company_code', $user->company_code)
                        ->first();

            if (!$admin || !\Illuminate\Support\Facades\Hash::check($validated['admin_password'], $admin->password)) {
                return redirect()->back()
                    ->withInput()
                    ->with('error', 'Invalid admin credentials.');
            }

            $validated['approved_by'] = $admin->id;
            $validated['approved_at'] = now();
        }

        try {
            DB::beginTransaction();

            $dayOpeningBalance->update($validated);

            DB::commit();

            return redirect()->route('admin.day-opening-balances.index')
                ->with('success', 'Day opening balance updated successfully.');

        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()
                ->withInput()
                ->with('error', 'Failed to update day opening balance: ' . $e->getMessage());
        }
    }

    /**
     * Remove the specified day opening balance.
     */
    public function destroy(DayOpeningBalance $dayOpeningBalance): RedirectResponse
    {
        if (! request()->user()->hasPermission('day_opening_balances.delete')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $user = Auth::user();

        // Authorization check
        $isCashier = Auth::user()->role?->slug === 'cashier' || Str::endsWith(Auth::user()->role?->slug ?? '', '_cashier');
        if ($isCashier && $dayOpeningBalance->user_id !== Auth::user()->id) abort(403);

        if ($user->role_id === 3 && $dayOpeningBalance->section_code !== $user->section_code) {
            abort(403, 'Unauthorized access.');
        }

        if ($user->role_id === 2 && $dayOpeningBalance->company_code !== $user->company_code) {
            abort(403, 'Unauthorized access.');
        }

        try {
            $dayOpeningBalance->delete();

            return redirect()->route('admin.day-opening-balances.index')
                ->with('success', 'Day opening balance deleted successfully.');

        } catch (\Exception $e) {
            return redirect()->back()
                ->with('error', 'Failed to delete day opening balance: ' . $e->getMessage());
        }
    }
}

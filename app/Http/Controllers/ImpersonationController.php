<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Lab404\Impersonate\Services\ImpersonateManager;

class ImpersonationController extends Controller
{
    protected ImpersonateManager $manager;

    public function __construct(ImpersonateManager $manager)
    {
        $this->manager = $manager;
    }

    /**
     * Start impersonating a user.
     *
     * Super Admin (web guard) impersonates directly on web guard via the package.
     * Company Admin (company guard) is handled manually: logout from company,
     * store restoration data, login as impersonated user on web guard.
     */
    public function impersonate(Request $request, User $user)
    {
        $impersonator = $request->user() ?? $request->user('company');

        if (!$impersonator) {
            return back()->withErrors(['message' => 'Unauthenticated.']);
        }

        if ($this->manager->isImpersonating()) {
            return back()->withErrors(['message' => 'You are already impersonating a user.']);
        }

        if (!$user->canBeImpersonated()) {
            return back()->withErrors(['message' => 'This user cannot be impersonated.']);
        }

        $currentGuard = $this->manager->getCurrentAuthGuardName();

        // Super Admin impersonation (already on web guard)
        if ($currentGuard === 'web' && $impersonator->isSuperAdmin()) {
            if ($user->id === $impersonator->id) {
                return back()->withErrors(['message' => 'You cannot impersonate yourself.']);
            }

            $this->manager->take($impersonator, $user, 'web');

            return redirect()->route('dashboard')
                ->with('success', 'You are now impersonating ' . $user->first_name . ' ' . $user->last_name . '.');
        }

        // Company-level roles on web guard (logged in via /login form, not /company/login)
        if ($currentGuard === 'web' && !$impersonator->isSuperAdmin()) {
            if ($user->id === $impersonator->id) {
                return back()->withErrors(['message' => 'You cannot impersonate yourself.']);
            }

            if ($user->company_code !== $impersonator->company_code) {
                return back()->withErrors([
                    'message' => 'You can only impersonate users within your own company.',
                ]);
            }

            $targetRole = $user->role;
            if ($targetRole && $targetRole->level === 'company_admin') {
                return back()->withErrors(['message' => 'Cannot impersonate another company admin.']);
            }

            $this->manager->take($impersonator, $user, 'web');

            return redirect()->route('dashboard')
                ->with('success', 'You are now impersonating ' . $user->first_name . ' ' . $user->last_name . '.');
        }

        // Company Admin impersonation (on company guard -> switch to web guard)
        if ($currentGuard === 'company') {
            $companyAdminUser = User::where('email', $impersonator->email)->first();

            if (!$companyAdminUser) {
                return back()->withErrors([
                    'message' => 'No user account found for this company admin. Please contact support.',
                ]);
            }

            if ($user->company_code !== $impersonator->company_code) {
                return back()->withErrors([
                    'message' => 'You can only impersonate users within your own company.',
                ]);
            }

            $targetRole = $user->role;
            if ($targetRole && $targetRole->level === 'company_admin') {
                return back()->withErrors(['message' => 'Cannot impersonate another company admin.']);
            }

            // Store Company Admin info for restoration before switching guards
            session()->put('impersonate_original_user_id', $impersonator->id);
            session()->put('impersonate_original_guard', 'company');
            session()->put('impersonate_company_code', $impersonator->company_code);

            // Logout from company guard
            Auth::guard('company')->quietLogout();

            // Manually set impersonation session keys
            session()->put($this->manager->getSessionKey(), $companyAdminUser->id);
            session()->put($this->manager->getSessionGuard(), 'web');
            session()->put($this->manager->getSessionGuardUsing(), 'web');

            // Login as the impersonated user on web guard
            Auth::guard('web')->quietLogin($user);

            return redirect()->route('dashboard')
                ->with('success', 'You are now impersonating ' . $user->first_name . ' ' . $user->last_name . '.');
        }

        return back()->withErrors(['message' => 'Unauthorized to impersonate.']);
    }

    /**
     * Leave the current impersonation and restore the original user.
     */
    public function leave(Request $request)
    {
        if (!$this->manager->isImpersonating()) {
            return back()->withErrors(['message' => 'No active impersonation.']);
        }

        $originalGuard = session('impersonate_original_guard', 'web');

        if ($originalGuard === 'company') {
            $companyCode = session('impersonate_company_code');

            // Logout from web guard (impersonated user)
            Auth::guard('web')->quietLogout();

            // Restore Company Admin session
            if ($companyCode) {
                $company = Company::where('company_code', $companyCode)->first();
                if ($company) {
                    Auth::guard('company')->login($company);
                }
            }

            // Clear all impersonation session data
            session()->forget('impersonate_original_user_id');
            session()->forget('impersonate_original_guard');
            session()->forget('impersonate_company_code');
            $this->manager->clear();

            return redirect()->route('dashboard')
                ->with('success', 'You are back to your original account.');
        }

        // Standard web guard impersonation (Super Admin)
        $this->manager->leave();

        return redirect()->route('dashboard')
            ->with('success', 'You are back to your original account.');
    }
}

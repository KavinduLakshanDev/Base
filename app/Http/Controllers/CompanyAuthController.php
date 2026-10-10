<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class CompanyAuthController extends Controller
{
    public function create()
    {
        return Inertia::render('auth/company-login', [
            'status' => session('status'),
        ]);
    }

    public function store(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        $key = 'company_login|'.$request->ip();

        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);
            throw ValidationException::withMessages([
                'email' => trans('auth.throttle', [
                    'seconds' => $seconds,
                    'minutes' => ceil($seconds / 60),
                ]),
            ]);
        }

        if (Auth::guard('company')->attempt($credentials, $request->boolean('remember'))) {
            $company = Auth::guard('company')->user();
            
            if (!$company->is_active) {
                Auth::guard('company')->logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();
                
                return back()->withErrors([
                    'email' => 'This company has been disabled. Please contact the administrator.',
                ])->onlyInput('email');
            }

            RateLimiter::clear($key);
            $request->session()->regenerate();

            return redirect()->intended(route('company.dashboard'));
        }

        RateLimiter::hit($key);

        return back()->withErrors([
            'email' => 'The provided credentials do not match our records.',
        ])->onlyInput('email');
    }

    public function destroy(Request $request)
    {
        Auth::guard('company')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect('/');
    }
}

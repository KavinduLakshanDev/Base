<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CheckCompanyStatus
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle(Request $request, Closure $next)
    {
        // For regular users (web guard)
        if (Auth::guard('web')->check()) {
            $user = Auth::guard('web')->user();
            
            // Super admins are never blocked
            if ($user && $user->user_type !== 'super_admin' && $user->company) {
                if (!$user->company->is_active) {
                    Auth::guard('web')->logout();
                    $request->session()->invalidate();
                    $request->session()->regenerateToken();
                    
                    return redirect()->route('login')->withErrors([
                        'email' => 'This company has been disabled. Please contact the administrator.',
                    ]);
                }
            }
        }

        // For company admins (company guard)
        if (Auth::guard('company')->check()) {
            $company = Auth::guard('company')->user();
            
            if ($company && !$company->is_active) {
                Auth::guard('company')->logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();
                
                return redirect()->route('company.login')->withErrors([
                    'email' => 'This company has been disabled. Please contact the administrator.',
                ]);
            }
        }

        return $next($request);
    }
}

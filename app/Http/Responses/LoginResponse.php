<?php

namespace App\Http\Responses;

use Illuminate\Support\Facades\Auth;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;

class LoginResponse implements LoginResponseContract
{
    public function toResponse($request)
    {
        $user = Auth::user();

        // Super admins must pick a company before proceeding
        if ($user && $user->user_type === 'super_admin') {
            return redirect()->route('superadmin.choose-company');
        }

        if ($user && ($user->user_type === 'technician' || ($user->role && $user->role->level === 'technician'))) {
            return redirect()->route('service-jobs.index', [
                'search' => '',
                'status' => 'all',
            ]);
        }

        return redirect()->intended(route('dashboard'));
    }
}

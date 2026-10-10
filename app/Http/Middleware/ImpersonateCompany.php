<?php

namespace App\Http\Middleware;

use App\Models\Section;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class ImpersonateCompany
{
    /**
     * For super_admin users who have chosen a company via the picker,
     * set company_code and section_code on the User model instance so
     * every controller that calls $user->company_code gets the right value.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::user();

        if ($user && $user->user_type === 'super_admin') {
            $selected = $request->session()->get('selected_company');

            if ($selected) {
                // Override company_code on the in-memory model instance.
                // This does NOT persist to the database.
                $user->company_code = $selected;

                // Always set section_code to the first section of the chosen company
                // so switching companies doesn't leave a stale section from a prior selection.
                $section = Section::where('company_code', $selected)
                    ->orderBy('id')
                    ->first();

                if ($section) {
                    $user->section_code = $section->section_code;
                }
            }
        }

        return $next($request);
    }
}

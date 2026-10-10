<?php

namespace App\Http\Controllers;

use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class UserRoleController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('auth:web,company'),
        ];
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $query = Role::query();

        // If not super admin, filter roles by the user's company or global roles
        if ($user && $user->user_type !== 'super_admin') {
            $query->where(function($q) use ($user) {
                $q->where('company_code', $user->company_code)
                  ->orWhereNull('company_code');
            });
        }

        return response()->json($query->get());
    }
}

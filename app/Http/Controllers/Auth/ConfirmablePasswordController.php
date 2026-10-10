<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ConfirmablePasswordController extends Controller
{
    public function show(Request $request): Response
    {
        return Inertia::render('auth/confirm-password');
    }

    public function store(Request $request): RedirectResponse
    {
        if (! $request->user()->current_password === $request->password) {
            return back()->withErrors([
                'password' => __('The provided password does not match your current password.'),
            ]);
        }

        return redirect()->route('password.update');
    }
}
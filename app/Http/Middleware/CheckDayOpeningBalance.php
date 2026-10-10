<?php

namespace App\Http\Middleware;

use App\Models\DayOpeningBalance;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class CheckDayOpeningBalance
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::user();

        // Only apply this check for cashiers
        $roleSlug = $user?->role?->slug;
        if ($user && $user->role_id && (
            $roleSlug === 'cashier' || 
            Str::endsWith($roleSlug ?? '', '_cashier')
        )) {
            
            // 1. Check for ANY unreconciled days in the past
            // We look for DayOpeningBalance entries that don't have a record in cash_reconciliations
            $unreconciledDay = \App\Models\DayOpeningBalance::where('user_id', $user->id)
                ->where('balance_date', '<', today())
                ->whereNotExists(function ($query) {
                    $query->select(\Illuminate\Support\Facades\DB::raw(1))
                        ->from('cash_reconciliations')
                        ->whereColumn('cash_reconciliations.user_id', 'day_opening_balances.user_id')
                        ->whereColumn('cash_reconciliations.reconciliation_date', 'day_opening_balances.balance_date');
                })
                ->orderBy('balance_date', 'desc')
                ->first();

            if ($unreconciledDay) {
                // If they are not already on the reconciliation pages, redirect them
                if (!$request->routeIs(
                    'reports.cash-reconciliation',
                    'reports.cash-reconciliation.store',
                    'reports.cash-reconciliation.update',
                    'reports.cash-reconciliation.destroy',
                    'reports.cash-reconciliation.expected-data',
                    'reports.cash-reconciliation.history',
                    'reports.cash-reconciliation.show'
                )) {
                    return redirect()->route('reports.cash-reconciliation', ['date' => $unreconciledDay->balance_date->format('Y-m-d')])
                        ->with('info', 'Please complete the cash reconciliation for ' . $unreconciledDay->balance_date->format('Y-m-d') . ' before starting today.');
                }
                // If they are on the reconciliation page, let them proceed
                if ($request->routeIs(
                    'reports.cash-reconciliation',
                    'reports.cash-reconciliation.store',
                    'reports.cash-reconciliation.update',
                    'reports.cash-reconciliation.destroy',
                    'reports.cash-reconciliation.expected-data',
                    'reports.cash-reconciliation.history',
                    'reports.cash-reconciliation.show'
                )) {
                    return $next($request);
                }
            }

            // 2. Check if cashier has already added a day opening balance for today
            $hasTodayBalance = \App\Models\DayOpeningBalance::where('user_id', $user->id)
                ->whereDate('balance_date', today())
                ->exists();

            // If they don't have a balance for today and they're not already on the create page, redirect them
            if (!$hasTodayBalance && !$request->routeIs('admin.day-opening-balances.create', 'admin.day-opening-balances.store')) {
                return redirect()->route('admin.day-opening-balances.create')
                    ->with('info', 'Please add your day opening balance first.');
            }
        }

        return $next($request);
    }
}

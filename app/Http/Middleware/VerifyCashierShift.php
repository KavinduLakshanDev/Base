<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Auth;
use App\Models\DayOpeningBalance;
use App\Models\CashReconciliation;
use Carbon\Carbon;

class VerifyCashierShift
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::user();

        // Only enforce cashier shift verification for cashiers
        if ($user) {
            $roleSlug = $user->role->slug ?? '';
            
            if ($roleSlug !== 'cashier' && !str_ends_with($roleSlug, '_cashier')) {
                return $next($request);
            }

            // Usually we enforce this by today's date
            $targetDate = $request->input('date', $request->input('transaction_date', Carbon::today()->toDateString()));
            $parsedDate = Carbon::parse($targetDate)->toDateString();

            // 1. Check if the day is closed (CashReconciliation exists)
            $isReconciled = CashReconciliation::where('user_id', $user->id)
                ->where('company_code', $user->company_code)
                ->whereDate('reconciliation_date', $parsedDate)
                ->exists();

            if ($isReconciled) {
                if ($request->expectsJson() && !$request->header('X-Inertia')) {
                    return response()->json([
                        'error' => 'Shift Closed: You have already completed the Cash Reconciliation for ' . $parsedDate . '. No further transactions can be created for this date.'
                    ], 403);
                }
                return redirect()->route('dashboard')->with('error', 'Shift Closed: You have already completed the Cash Reconciliation for ' . $parsedDate . '. No further transactions can be created for this date.');
            }

            // 2. Check if the day is opened (DayOpeningBalance exists)
            $isOpened = DayOpeningBalance::where('user_id', $user->id)
                ->where('company_code', $user->company_code)
                ->whereDate('balance_date', $parsedDate)
                ->exists();

            if (!$isOpened) {
                if ($request->expectsJson() && !$request->header('X-Inertia')) {
                    return response()->json([
                        'error' => 'Shift Not Started: You must add a Day Opening Balance for ' . $parsedDate . ' before creating transactions.'
                    ], 403);
                }
                return redirect()->route('admin.day-opening-balances.create')->with('error', 'Shift Not Started: You must add a Day Opening Balance for ' . $parsedDate . ' before creating transactions.');
            }
        }

        return $next($request);
    }
}

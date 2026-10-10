<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class BusinessUnitMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string $businessUnit): Response
    {
        $user = Auth::user();
        
        if (!$user) {
            if ($request->expectsJson()) {
                return response()->json(['error' => 'Unauthorized'], 401);
            }
            return redirect()->route('login');
        }

        // Get user's company code to determine business unit access
        $companyCode = $user->company_code ?? '';
        
        // Define business unit access rules
        $businessUnitAccess = $this->getBusinessUnitAccess($companyCode, $user);
        
        // Check if user has access to requested business unit
        if (!in_array($businessUnit, $businessUnitAccess)) {
            if ($request->expectsJson()) {
                return response()->json([
                    'error' => 'Access denied to ' . strtoupper($businessUnit) . ' operations',
                    'business_unit' => $businessUnit,
                    'user_access' => $businessUnitAccess
                ], 403);
            }
            
            return redirect()->route('dashboard')->with('error', 
                'Access denied to ' . strtoupper($businessUnit) . ' operations');
        }

        // Add business unit context to request
        $request->merge(['business_unit' => $businessUnit]);
        
        return $next($request);
    }

    /**
     * Determine which business units a user has access to
     */
    private function getBusinessUnitAccess(string $companyCode, $user): array
    {
        $access = [];
        
        // VISMASS business unit (VAT operations)
        // Handles: Import/Buying/Selling, Services, Main Stock
        if ($this->hasVismassAccess($companyCode, $user)) {
            $access[] = 'vismass';
        }
        
        // MALIBO business unit (Non-VAT operations) 
        // Handles: Delivery, Printing
        if ($this->hasMaliboAccess($companyCode, $user)) {
            $access[] = 'malibo';
        }
        
        return $access;
    }

    /**
     * Check if user has VISMASS access
     */
    private function hasVismassAccess(string $companyCode, $user): bool
    {
        // Allow superadmin or users with role_id 1
        if ($user->user_type === 'super_admin' || $user->role_id === 1) {
            return true;
        }
        
        // Company admins have access to all business units in their company
        if ($user->user_type === 'company_admin' || 
            $user->role?->slug === 'company_admin' ||
            $user->role?->slug === 'companyadmin') {
            return true;
        }
        
        // VISMASS company code pattern or specific logic
        if ($companyCode === 'VIS001' || str_starts_with($companyCode, 'VIS')) {
            return true;
        }
        
        // Check if user has VISMASS-related sections
        if ($user->sections()->where('is_main_stock', true)->exists()) {
            return true;
        }
        
        // Check if user has VAT-related permissions
        $vatPermissions = ['manage_purchases', 'manage_sales', 'manage_services', 'manage_stock'];
        if ($user->hasAnyPermission($vatPermissions)) {
            return true;
        }
        
        return false;
    }

    /**
     * Check if user has MALIBO access
     */
    private function hasMaliboAccess(string $companyCode, $user): bool
    {
        // Allow superadmin
        if ($user->user_type === 'super_admin' || $user->role_id === 1) {
            return true;
        }
        
        // Company admins have access to all business units in their company
        if ($user->user_type === 'company_admin' || 
            $user->role?->slug === 'company_admin' ||
            $user->role?->slug === 'companyadmin') {
            return true;
        }
        
        // MALIBO company code pattern or specific logic
        if ($companyCode === 'MAL001' || str_starts_with($companyCode, 'MAL')) {
            return true;
        }
        
        // Vismass companies can also access Malibo for shared products
        if ($companyCode === 'VIS001' || str_starts_with($companyCode, 'VIS')) {
            return true;
        }
        
        // Check if user has delivery/printing related permissions
        $maliboPermissions = ['manage_deliveries', 'manage_printing', 'manage_routes'];
        if ($user->hasAnyPermission($maliboPermissions)) {
            return true;
        }
        
        // Check if user is assigned to non-main-stock sections (printing/delivery)
        if ($user->sections()->where('is_main_stock', false)->exists()) {
            return true;
        }
        
        return false;
    }
}
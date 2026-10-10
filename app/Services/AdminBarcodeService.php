<?php

namespace App\Services;

use App\Models\AdminBarcodeHistory;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AdminBarcodeService
{
    /**
     * Generate a new barcode for a user for the current month.
     * Archives the old barcode to history if one exists.
     */
    public function generateForUser(User $user): string
    {
        $currentMonth = now()->format('Y-m');

        // If user already has a valid barcode for this month, return it
        if ($user->admin_barcode_month === $currentMonth && $user->admin_barcode) {
            return $user->admin_barcode;
        }

        // Archive old barcode if exists
        if ($user->admin_barcode) {
            AdminBarcodeHistory::create([
                'user_id'              => $user->id,
                'admin_barcode'        => $user->admin_barcode,
                'admin_barcode_token'  => $user->admin_barcode_token,
                'barcode_month'        => $user->admin_barcode_month,
                'company_code'         => $user->company_code,
            ]);
        }

        // Generate new barcode: ADM-{COMPANY_CODE}-{YYYYMM}-{RANDOM6}
        $companyCode = $user->company_code ?? 'SYS';
        $barcode = 'ADM-' . $companyCode . '-' . now()->format('Ym') . '-' . strtoupper(Str::random(6));
        $token = Str::random(32);

        $user->update([
            'admin_barcode'       => $barcode,
            'admin_barcode_token' => Hash::make($token),
            'admin_barcode_month' => $currentMonth,
        ]);

        return $barcode;
    }

    /**
     * Force-regenerate a barcode (invalidates the current one).
     */
    public function regenerateForUser(User $user): string
    {
        $currentMonth = now()->format('Y-m');

        // Archive current barcode if exists
        if ($user->admin_barcode) {
            AdminBarcodeHistory::create([
                'user_id'              => $user->id,
                'admin_barcode'        => $user->admin_barcode,
                'admin_barcode_token'  => $user->admin_barcode_token,
                'barcode_month'        => $user->admin_barcode_month,
                'company_code'         => $user->company_code,
                'is_revoked'           => true,
                'revoked_at'           => now(),
            ]);
        }

        // Generate new barcode
        $companyCode = $user->company_code ?? 'SYS';
        $barcode = 'ADM-' . $companyCode . '-' . now()->format('Ym') . '-' . strtoupper(Str::random(6));
        $token = Str::random(32);

        $user->update([
            'admin_barcode'       => $barcode,
            'admin_barcode_token' => Hash::make($token),
            'admin_barcode_month' => $currentMonth,
        ]);

        return $barcode;
    }

    /**
     * Verify a scanned barcode against valid current-month barcodes.
     * Returns the User if valid, null otherwise.
     */
    public function verify(string $barcode): ?User
    {
        $user = User::where('admin_barcode', $barcode)
            ->where('is_active', true)
            ->first();

        if (!$user) {
            return null;
        }

        // Check if the barcode is for the current month
        if ($user->admin_barcode_month !== now()->format('Y-m')) {
            return null; // Expired
        }

        return $user;
    }

    /**
     * Save a manually entered barcode for a user.
     * Archives the old barcode if one exists.
     */
    public function saveManualBarcode(User $user, string $barcode): string
    {
        $currentMonth = now()->format('Y-m');

        // Archive old barcode if exists and is different
        if ($user->admin_barcode && $user->admin_barcode !== $barcode) {
            AdminBarcodeHistory::create([
                'user_id'              => $user->id,
                'admin_barcode'        => $user->admin_barcode,
                'admin_barcode_token'  => $user->admin_barcode_token,
                'barcode_month'        => $user->admin_barcode_month,
                'company_code'         => $user->company_code,
                'is_revoked'           => true,
                'revoked_at'           => now(),
            ]);
        }

        $token = Str::random(32);

        $user->update([
            'admin_barcode'       => $barcode,
            'admin_barcode_token' => Hash::make($token),
            'admin_barcode_month' => $currentMonth,
        ]);

        return $barcode;
    }
}

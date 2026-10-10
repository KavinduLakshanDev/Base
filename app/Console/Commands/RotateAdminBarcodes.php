<?php

namespace App\Console\Commands;

use App\Models\AdminBarcodeHistory;
use App\Models\User;
use Illuminate\Console\Command;

class RotateAdminBarcodes extends Command
{
    protected $signature = 'barcodes:rotate-monthly';

    protected $description = 'Expire previous month admin barcodes so users must manually enter new ones';

    public function handle(): int
    {
        $currentMonth = now()->format('Y-m');

        // Find all active Company Admin users whose barcode is from a previous month
        $users = User::where('is_active', true)
            ->whereHas('role', fn ($q) => $q->where('level', 'company_admin'))
            ->whereNotNull('admin_barcode')
            ->where(function ($q) use ($currentMonth) {
                $q->where('admin_barcode_month', '!=', $currentMonth)
                    ->orWhereNull('admin_barcode_month');
            })
            ->get();

        if ($users->isEmpty()) {
            $this->info('No expired barcodes to rotate.');
            return Command::SUCCESS;
        }

        foreach ($users as $user) {
            // Archive the old barcode to history
            AdminBarcodeHistory::create([
                'user_id'              => $user->id,
                'admin_barcode'        => $user->admin_barcode,
                'admin_barcode_token'  => $user->admin_barcode_token,
                'barcode_month'        => $user->admin_barcode_month,
                'company_code'         => $user->company_code,
                'is_revoked'           => true,
                'revoked_at'           => now(),
            ]);

            // Clear the barcode — user must manually enter a new one
            $user->update([
                'admin_barcode'       => null,
                'admin_barcode_token' => null,
                'admin_barcode_month' => null,
            ]);

            $this->info("Expired barcode for: {$user->first_name} {$user->last_name}");
        }

        $this->info("Total expired: {$users->count()}. Users must manually enter new barcodes.");
        return Command::SUCCESS;
    }
}

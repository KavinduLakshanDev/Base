<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Update existing suppliers that have VAT numbers but fVATRegistered is not set
        DB::table('address')
            ->where('AdrTypKy', 4) // Suppliers
            ->whereNotNull('VATNo')
            ->where('VATNo', '!=', '')
            ->where(function ($query) {
                $query->whereNull('fVATRegistered')
                      ->orWhere('fVATRegistered', false)
                      ->orWhere('fVATRegistered', 0);
            })
            ->update(['fVATRegistered' => true]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Optionally reverse by setting fVATRegistered to false for suppliers with VAT numbers
        // But this might not be desired as it could lose data
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Update existing suppliers from AdrTypKy = 2 to AdrTypKy = 4
        // Only update records that have corresponding acc_mas records with AccTyp = 'SUPPLIER'
        DB::statement("
            UPDATE address
            SET AdrTypKy = 4
            WHERE AdrTypKy = 2
            AND EXISTS (
                SELECT 1 FROM acc_mas
                WHERE acc_mas.AccKy = address.AccKy
                AND acc_mas.AccTyp = 'SUPPLIER'
            )
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert suppliers back from AdrTypKy = 4 to AdrTypKy = 2
        DB::statement("
            UPDATE address
            SET AdrTypKy = 2
            WHERE AdrTypKy = 4
            AND EXISTS (
                SELECT 1 FROM acc_mas
                WHERE acc_mas.AccKy = address.AccKy
                AND acc_mas.AccTyp = 'SUPPLIER'
            )
        ");
    }
};

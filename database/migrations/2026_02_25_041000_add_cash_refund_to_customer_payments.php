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
        // Update method column to allow cash_refund
        // This is done via raw SQL to modify the ENUM
        DB::statement("ALTER TABLE customer_payments MODIFY COLUMN method VARCHAR(50)");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Rollback not needed as we just changed to VARCHAR
    }
};

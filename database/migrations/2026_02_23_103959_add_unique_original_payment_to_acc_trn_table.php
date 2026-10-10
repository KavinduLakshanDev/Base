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
        // Remove duplicate return entries, keeping only the latest per original_payment_id.
        // Duplicates can occur from previous test data before this constraint existed.
        DB::statement("
            DELETE a FROM acc_trn a
            INNER JOIN acc_trn b
                ON  a.original_payment_id = b.original_payment_id
                AND a.original_payment_id IS NOT NULL
                AND a.AccTrnKy < b.AccTrnKy
        ");

        // MySQL allows multiple NULLs in a UNIQUE index, so this safely
        // constrains non-null values: only one return entry per original cheque.
        Schema::table('acc_trn', function (Blueprint $table) {
            $table->unique('original_payment_id', 'uq_acc_trn_original_payment_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('acc_trn', function (Blueprint $table) {
            $table->dropUnique('uq_acc_trn_original_payment_id');
        });
    }
};

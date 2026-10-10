<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('stock_in_hand', function (Blueprint $table) {
            if (!Schema::hasColumn('stock_in_hand', 'batch_no')) {
                $table->string('batch_no', 50)->nullable()->after('CounterID');
            }
            // Only create index if it doesn't exist
            try {
                $table->index(['company_code', 'section_code', 'batch_no'], 'idx_stock_company_section_batch');
            } catch (\Exception $e) {
                // Index might already exist, skip silently
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stock_in_hand', function (Blueprint $table) {
            $table->dropIndex('idx_stock_company_section_batch');
            $table->dropColumn('batch_no');
        });
    }
};

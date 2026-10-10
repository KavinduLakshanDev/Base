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
        // Temporarily disabled to avoid index conflicts during testing
        // Remove batch_no from itemmaster only (keep it in item_price_det)
        // Schema::table('itemmaster', function (Blueprint $table) {
        //     // Drop batch_no column if it exists
        //     if (Schema::hasColumn('itemmaster', 'batch_no')) {
        //         $table->dropColumn('batch_no');
        //     }
        // });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Add back batch_no to itemmaster
        Schema::table('itemmaster', function (Blueprint $table) {
            // Add batch_no column if it doesn't exist
            if (!Schema::hasColumn('itemmaster', 'batch_no')) {
                $table->string('batch_no', 50)->nullable()->after('BatchNo');
            }
            
            // Add indexes
            try {
                $table->index(['ItemCode', 'batch_no'], 'idx_itemcode_batch');
                $table->index(['company_code', 'section_code', 'batch_no'], 'idx_company_section_batch');
            } catch (\Exception $e) {
                // Index might already exist, skip
            }
        });
    }
};

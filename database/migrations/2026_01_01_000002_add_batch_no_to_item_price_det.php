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
        // Check if table exists, if not skip this migration
        if (!Schema::hasTable('item_price_det')) {
            echo "Table 'item_price_det' does not exist. Skipping migration.\n";
            return;
        }

        Schema::table('item_price_det', function (Blueprint $table) {
            // Rename branch_code to section_code
            if (Schema::hasColumn('item_price_det', 'branch_code')) {
                $table->renameColumn('branch_code', 'section_code');
            }
            
            // Add batch_no column
            if (!Schema::hasColumn('item_price_det', 'batch_no')) {
                $table->string('batch_no', 50)->nullable()->after('ItmKy');
            }
        });
        
        // Add indexes separately to catch any errors
        try {
            Schema::table('item_price_det', function (Blueprint $table) {
                // Add composite index for ItmKy + batch_no
                $table->index(['ItmKy', 'batch_no'], 'idx_itmky_batch');
                $table->index(['company_code', 'section_code', 'batch_no'], 'idx_company_section_batch_price');
            });
        } catch (\Exception $e) {
            echo "Index creation skipped: " . $e->getMessage() . "\n";
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('item_price_det', function (Blueprint $table) {
            // Drop indexes
            $table->dropIndex('idx_itmky_batch');
            $table->dropIndex('idx_company_section_batch_price');
            
            // Drop batch_no column
            if (Schema::hasColumn('item_price_det', 'batch_no')) {
                $table->dropColumn('batch_no');
            }
            
            // Rename section_code back to branch_code
            if (Schema::hasColumn('item_price_det', 'section_code')) {
                $table->renameColumn('section_code', 'branch_code');
            }
        });
    }
};

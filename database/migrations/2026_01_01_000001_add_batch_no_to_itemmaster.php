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
        if (!Schema::hasTable('itemmaster')) {
            echo "Table 'itemmaster' does not exist. Skipping migration.\n";
            return;
        }

        Schema::table('itemmaster', function (Blueprint $table) {
            // Rename branch_code to section_code
            if (Schema::hasColumn('itemmaster', 'branch_code')) {
                $table->renameColumn('branch_code', 'section_code');
            }
            
            // Add batch_no if it doesn't exist or ensure it's properly configured
            if (!Schema::hasColumn('itemmaster', 'batch_no')) {
                $table->string('batch_no', 50)->nullable()->after('BatchNo');
            }
        });
        
        // Only modify primary key if table exists and has the old structure
        if (Schema::hasTable('itemmaster')) {
            try {
                Schema::table('itemmaster', function (Blueprint $table) {
                    // Drop existing primary key
                    $table->dropPrimary(['ItmKy']);
                });
            } catch (\Exception $e) {
                // Primary key might not exist or already modified
                echo "Primary key modification skipped: " . $e->getMessage() . "\n";
            }
            
            try {
                Schema::table('itemmaster', function (Blueprint $table) {
                    // Add composite primary key (ItmKy + batch_no)
                    $table->primary(['ItmKy', 'batch_no']);
                });
            } catch (\Exception $e) {
                echo "Composite primary key creation skipped: " . $e->getMessage() . "\n";
            }
            
            try {
                Schema::table('itemmaster', function (Blueprint $table) {
                    // Add index for better performance
                    $table->index(['ItemCode', 'batch_no'], 'idx_itemcode_batch');
                    $table->index(['company_code', 'section_code', 'batch_no'], 'idx_company_section_batch');
                });
            } catch (\Exception $e) {
                echo "Index creation skipped: " . $e->getMessage() . "\n";
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('itemmaster', function (Blueprint $table) {
            // Drop composite primary key
            $table->dropPrimary(['ItmKy', 'batch_no']);
            
            // Restore original primary key
            $table->primary('ItmKy');
            
            // Drop indexes
            $table->dropIndex('idx_itemcode_batch');
            $table->dropIndex('idx_company_section_batch');
            
            // Rename section_code back to branch_code
            if (Schema::hasColumn('itemmaster', 'section_code')) {
                $table->renameColumn('section_code', 'branch_code');
            }
        });
    }
};

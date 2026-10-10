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
        // 1. Drop indexes (database-agnostic)
        $indexes = ['idx_itemcode_batch', 'idx_company_section_batch', 'idx_itmgrp'];
        foreach ($indexes as $index) {
            try {
                Schema::table('itemmaster', function (Blueprint $table) use ($index) {
                    $table->dropIndex($index);
                });
            } catch (\Exception $e) {
                // Index doesn't exist, continue
            }
        }

        // 2. Drop primary key (database-agnostic)
        try {
            Schema::table('itemmaster', function (Blueprint $table) {
                $table->dropPrimary();
            });
        } catch (\Exception $e) {
            // Primary key doesn't exist or can't be dropped, continue
        }

        // 3. Drop unwanted columns
        Schema::table('itemmaster', function (Blueprint $table) {
            $columnsToDrop = [
                'batch_no',
                'PartNo',
                'ItmGrp',
                'BatchNo',
                'MfgDate',
                'ExpDate',
                'BalQty',
                'InUse',
                'WithDates',
                'DoProcess',
                'DoRound',
                'ProcessRatio',
                'OrderNo'
            ];
            
            // Only drop columns that actually exist
            $existingColumns = Schema::getColumnListing('itemmaster');
            $dropList = array_intersect($columnsToDrop, $existingColumns);
            
            if (!empty($dropList)) {
                $table->dropColumn($dropList);
            }
        });

        // 4. Set ItmKy as Primary Key
        // Ensure ItmKy exists first (it should)
        if (Schema::hasColumn('itemmaster', 'ItmKy')) {
            Schema::table('itemmaster', function (Blueprint $table) {
                $table->primary('ItmKy');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('itemmaster', function (Blueprint $table) {
            // Add back the columns
            if (!Schema::hasColumn('itemmaster', 'batch_no')) $table->string('batch_no', 50)->nullable();
            if (!Schema::hasColumn('itemmaster', 'PartNo')) $table->string('PartNo', 100)->nullable();
            if (!Schema::hasColumn('itemmaster', 'ItmGrp')) $table->string('ItmGrp', 50)->nullable();
            if (!Schema::hasColumn('itemmaster', 'BatchNo')) $table->string('BatchNo', 50)->nullable();
            if (!Schema::hasColumn('itemmaster', 'MfgDate')) $table->date('MfgDate')->nullable();
            if (!Schema::hasColumn('itemmaster', 'ExpDate')) $table->date('ExpDate')->nullable();
            if (!Schema::hasColumn('itemmaster', 'BalQty')) $table->decimal('BalQty', 15, 4)->default(0);
            if (!Schema::hasColumn('itemmaster', 'InUse')) $table->string('InUse', 1)->default('Y');
            if (!Schema::hasColumn('itemmaster', 'WithDates')) $table->boolean('WithDates')->default(false);
            if (!Schema::hasColumn('itemmaster', 'DoProcess')) $table->boolean('DoProcess')->default(false);
            if (!Schema::hasColumn('itemmaster', 'DoRound')) $table->boolean('DoRound')->default(false);
            if (!Schema::hasColumn('itemmaster', 'ProcessRatio')) $table->decimal('ProcessRatio', 15, 4)->default(0);
            if (!Schema::hasColumn('itemmaster', 'OrderNo')) $table->integer('OrderNo')->default(0);

            // Revert PK
            $table->dropPrimary();
            $table->primary(['ItmKy', 'batch_no']);
            
            // Revert Indexes
            $table->index(['ItemCode', 'batch_no'], 'idx_itemcode_batch');
            $table->index(['company_code', 'section_code', 'batch_no'], 'idx_company_section_batch');
            $table->index('ItmGrp', 'idx_itmgrp');
        });
    }
};

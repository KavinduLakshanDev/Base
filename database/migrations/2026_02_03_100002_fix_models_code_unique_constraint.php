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
        // Check if the models table exists before trying to modify it
        if (Schema::hasTable('models')) {
            $indexes = Schema::getIndexes('models');
            $indexNames = collect($indexes)->pluck('name')->toArray();

            Schema::table('models', function (Blueprint $table) use ($indexNames) {
                
                if (in_array('models_code_unique', $indexNames)) {
                    // Drop the global unique constraint on code
                    $table->dropUnique('models_code_unique');
                }
                
                // Add composite unique constraint (code must be unique within company_code only)
                // All sections in a company share the same model sequence
                if (!in_array('models_code_company_unique', $indexNames)) {
                    $table->unique(['code', 'company_code'], 'models_code_company_unique');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('models')) {
            $indexes = Schema::getIndexes('models');
            $indexNames = collect($indexes)->pluck('name')->toArray();

            Schema::table('models', function (Blueprint $table) use ($indexNames) {
                if (in_array('models_code_company_unique', $indexNames)) {
                    // Drop the composite unique constraint
                    $table->dropUnique('models_code_company_unique');
                }
                
                if (!in_array('models_code_unique', $indexNames)) {
                    // Restore the global unique constraint on code
                    $table->unique('code', 'models_code_unique');
                }
            });
        }
    }
};

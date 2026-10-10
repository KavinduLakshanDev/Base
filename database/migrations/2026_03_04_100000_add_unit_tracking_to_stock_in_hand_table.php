<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations - add UnitKy to track unit per stock record.
     * This enables proper reporting after stock conversions.
     */
    public function up(): void
    {
        Schema::table('stock_in_hand', function (Blueprint $table) {
            // Add UnitKy column to track which unit this stock record represents
            // Nullable because existing records don't have this - they'll use item's primary unit
            $table->unsignedInteger('UnitKy')->nullable()->after('ItemKy')
                ->comment('Unit of measure for this stock record. Null = use item primary unit');
            
            // Add index for better query performance when grouping by unit
            $table->index(['ItemKy', 'UnitKy']);
        });

        // Backfill existing records with item's primary unit where available
        DB::statement('
            UPDATE stock_in_hand sih
            INNER JOIN itemmaster im ON sih.ItemKy = im.ItmKy
            SET sih.UnitKy = im.UnitKy
            WHERE sih.UnitKy IS NULL AND im.UnitKy IS NOT NULL
        ');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stock_in_hand', function (Blueprint $table) {
            $table->dropIndex(['ItemKy', 'UnitKy']);
            $table->dropColumn('UnitKy');
        });
    }
};

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
        Schema::table('stock_transfers', function (Blueprint $table) {
            $table->string('item_code', 50)->nullable()->after('item_id')->index();
            $table->string('item_name', 255)->nullable()->after('item_code');
        });

        // Backfill existing transfers with product details
        // Use SQLite-compatible syntax
        DB::statement("
            UPDATE stock_transfers
            SET item_code = (
                SELECT im.ItemCode
                FROM itemmaster im
                WHERE im.ItmKy = stock_transfers.item_id
            ),
            item_name = (
                SELECT im.ItmNm
                FROM itemmaster im
                WHERE im.ItmKy = stock_transfers.item_id
            )
            WHERE item_code IS NULL OR item_name IS NULL
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stock_transfers', function (Blueprint $table) {
            $table->dropIndex(['item_code']);
            $table->dropColumn(['item_code', 'item_name']);
        });
    }
};
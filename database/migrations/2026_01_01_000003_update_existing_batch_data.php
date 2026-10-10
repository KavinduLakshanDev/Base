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
        // Check if tables exist before updating data
        if (!Schema::hasTable('itemmaster') || !Schema::hasTable('item_price_det')) {
            echo "Required tables do not exist. Skipping data migration.\n";
            return;
        }
        
        // Update existing records in itemmaster to have a default batch_no
        DB::table('itemmaster')
            ->whereNull('batch_no')
            ->orWhere('batch_no', '')
            ->update(['batch_no' => 'DEFAULT']);
        
        // Update existing records in item_price_det to match their parent item's batch_no
        // Use SQLite-compatible syntax
        $items = DB::table('item_price_det')
            ->whereNull('batch_no')
            ->orWhere('batch_no', '')
            ->get();

        foreach ($items as $item) {
            $parentBatchNo = DB::table('itemmaster')
                ->where('ItmKy', $item->ItmKy)
                ->value('batch_no');

            if ($parentBatchNo) {
                DB::table('item_price_det')
                    ->where('id', $item->id)
                    ->update(['batch_no' => $parentBatchNo]);
            } else {
                DB::table('item_price_det')
                    ->where('id', $item->id)
                    ->update(['batch_no' => 'DEFAULT']);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No need to reverse - data migration
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Backfill item_type based on ItemCode prefix
        
        // Set all items with PRN- prefix to 'printer'
        DB::table('itemmaster')
            ->where('ItemCode', 'LIKE', 'PRN-%')
            ->update(['item_type' => 'printer']);

        // All others remain 'product' (default already set)
        
        // Log the operation for verification
        $printerCount = DB::table('itemmaster')
            ->where('item_type', 'printer')
            ->count();
        
        $productCount = DB::table('itemmaster')
            ->where('item_type', 'product')
            ->count();

        \Log::info('Item type backfill completed', [
            'printers' => $printerCount,
            'products' => $productCount,
            'total' => $printerCount + $productCount,
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Reset all item_type values to default
        DB::table('itemmaster')
            ->update(['item_type' => 'product']);
    }
};

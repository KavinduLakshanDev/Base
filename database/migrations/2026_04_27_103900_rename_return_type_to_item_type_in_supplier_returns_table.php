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
        Schema::table('supplier_returns', function (Blueprint $table) {
            $table->renameColumn('return_type', 'item_type');
        });

        // Update existing data: 'item' -> 'product'
        DB::table('supplier_returns')
            ->where('item_type', 'item')
            ->update(['item_type' => 'product']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Restore data: 'product' -> 'item'
        DB::table('supplier_returns')
            ->where('item_type', 'product')
            ->update(['item_type' => 'item']);

        Schema::table('supplier_returns', function (Blueprint $table) {
            $table->renameColumn('item_type', 'return_type');
        });
    }
};

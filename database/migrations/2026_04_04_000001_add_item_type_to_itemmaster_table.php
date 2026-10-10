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
        Schema::table('itemmaster', function (Blueprint $table) {
            // Add item_type column after Status column
            // Default to 'product' for backward compatibility
            $table->enum('item_type', ['product', 'printer', 'service'])
                ->default('product')
                ->after('Status')
                ->comment('Type of item: product (regular items), printer (PRN- prefix), or service');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('itemmaster', function (Blueprint $table) {
            $table->dropColumn('item_type');
        });
    }
};

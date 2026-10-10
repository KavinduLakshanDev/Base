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
        Schema::table('customer_returns', function (Blueprint $table) {
            // Remove quantity column if it exists (it belongs to customer_return_items table, not here)
            if (Schema::hasColumn('customer_returns', 'quantity')) {
                $table->dropColumn('quantity');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('customer_returns', function (Blueprint $table) {
            // Don't add it back - it shouldn't be here
        });
    }
};

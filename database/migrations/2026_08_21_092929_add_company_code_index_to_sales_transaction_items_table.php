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
        Schema::table('sales_transaction_items', function (Blueprint $table) {
            $table->index('company_code');
            $table->index('product_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sales_transaction_items', function (Blueprint $table) {
            $table->dropIndex(['company_code']);
            $table->dropIndex(['product_id']);
        });
    }
};

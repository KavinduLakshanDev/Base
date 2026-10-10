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
            if (!Schema::hasColumn('sales_transaction_items', 'cus_discount_rate')) {
                $table->decimal('cus_discount_rate', 12, 2)->default(0)->after('discount_amount');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sales_transaction_items', function (Blueprint $table) {
            if (Schema::hasColumn('sales_transaction_items', 'cus_discount_rate')) {
                $table->dropColumn('cus_discount_rate');
            }
        });
    }
};

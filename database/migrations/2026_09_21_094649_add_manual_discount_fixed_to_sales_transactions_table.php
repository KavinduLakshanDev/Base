<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales_transactions', function (Blueprint $table) {
            $table->decimal('manual_discount_fixed', 15, 2)->default(0)->after('discount_percentage')
                ->comment('Fixed amount manual discount (Rs) given to customer, separate from percentage discount');
        });
    }

    public function down(): void
    {
        Schema::table('sales_transactions', function (Blueprint $table) {
            $table->dropColumn('manual_discount_fixed');
        });
    }
};

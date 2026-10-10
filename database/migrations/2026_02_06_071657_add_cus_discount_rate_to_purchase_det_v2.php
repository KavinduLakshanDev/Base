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
        Schema::table('purchase_det', function (Blueprint $table) {
            if (!Schema::hasColumn('purchase_det', 'CusDiscountRate')) {
                $table->decimal('CusDiscountRate', 8, 2)->nullable()->default(0)->after('DiscountRate');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('purchase_det', function (Blueprint $table) {
            if (Schema::hasColumn('purchase_det', 'CusDiscountRate')) {
                $table->dropColumn('CusDiscountRate');
            }
        });
    }
};

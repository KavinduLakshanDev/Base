<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds a wholesale_min_qty threshold column to itemmaster.
 * When a cashier adds/updates a sale-line and the quantity reaches or exceeds
 * this value, the sales UI automatically applies Wholesale pricing for that
 * line instead of Retail, without the cashier having to manually switch the
 * price-type selector.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('itemmaster', function (Blueprint $table) {
            if (! Schema::hasColumn('itemmaster', 'wholesale_min_qty')) {
                $table->unsignedInteger('wholesale_min_qty')
                      ->nullable()
                      ->after('free_issue_scheme_get_qty')
                      ->comment('Minimum quantity at which wholesale price is auto-applied on the sales screen');
            }
        });
    }

    public function down(): void
    {
        Schema::table('itemmaster', function (Blueprint $table) {
            if (Schema::hasColumn('itemmaster', 'wholesale_min_qty')) {
                $table->dropColumn('wholesale_min_qty');
            }
        });
    }
};

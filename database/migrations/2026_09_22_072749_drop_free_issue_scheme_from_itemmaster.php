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
            if (Schema::hasColumn('itemmaster', 'free_issue_scheme_buy_qty')) {
                $table->dropColumn('free_issue_scheme_buy_qty');
            }
            if (Schema::hasColumn('itemmaster', 'free_issue_scheme_get_qty')) {
                $table->dropColumn('free_issue_scheme_get_qty');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('itemmaster', function (Blueprint $table) {
            //
        });
    }
};

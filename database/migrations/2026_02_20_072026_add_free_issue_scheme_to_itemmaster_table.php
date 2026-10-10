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
            $table->integer('free_issue_scheme_buy_qty')->nullable()->after('VATItem')->comment('Buy X quantity for free issue scheme');
            $table->integer('free_issue_scheme_get_qty')->nullable()->after('free_issue_scheme_buy_qty')->comment('Get Y free quantity for free issue scheme');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('itemmaster', function (Blueprint $table) {
            $table->dropColumn(['free_issue_scheme_buy_qty', 'free_issue_scheme_get_qty']);
        });
    }
};

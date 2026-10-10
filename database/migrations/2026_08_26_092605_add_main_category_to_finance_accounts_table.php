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
        Schema::table('finance_accounts', function (Blueprint $table) {
            $table->string('main_category')->default('assets')->after('account_name')->comment('assets, liabilities, equity, revenue, expenses');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('finance_accounts', function (Blueprint $table) {
            $table->dropColumn('main_category');
        });
    }
};

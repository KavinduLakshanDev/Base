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
        Schema::table('expenses', function (Blueprint $table) {
            // increase section_code length to accommodate codes like VIS-SEC-002
            $table->string('section_code', 50)->nullable()->change();
            // company_code might also be longer; just in case
            $table->string('company_code', 50)->nullable()->change();
        });

        Schema::table('expense_transactions', function (Blueprint $table) {
            $table->string('section_code', 50)->nullable()->change();
            $table->string('company_code', 50)->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('expense_transactions', function (Blueprint $table) {
            $table->string('section_code', 10)->nullable()->change();
            $table->string('company_code', 10)->nullable()->change();
        });

        Schema::table('expenses', function (Blueprint $table) {
            $table->string('section_code', 10)->nullable()->change();
            $table->string('company_code', 10)->nullable()->change();
        });
    }
};

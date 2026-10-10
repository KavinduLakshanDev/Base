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
        Schema::table('code_masters', function (Blueprint $table) {
            $table->boolean('is_printer_category')->default(false)->after('is_active')
                ->comment('Flag to identify if category is for printers (applies per company)');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('code_masters', function (Blueprint $table) {
            $table->dropColumn('is_printer_category');
        });
    }
};

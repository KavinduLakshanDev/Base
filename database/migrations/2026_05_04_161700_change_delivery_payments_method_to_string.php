<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Change enum to string for more flexibility (like service_charge)
        Schema::table('delivery_payments', function (Blueprint $table) {
            $table->string('method', 50)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('delivery_payments', function (Blueprint $table) {
            $table->enum('method', ['cash', 'cheque', 'transfer'])->default('cash')->change();
        });
    }
};

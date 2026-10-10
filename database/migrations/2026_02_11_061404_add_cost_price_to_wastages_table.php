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
        Schema::table('wastages', function (Blueprint $table) {
            $table->decimal('cost_price', 10, 2)->after('unit')->default(0);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('wastages', function (Blueprint $table) {
            $table->dropColumn('cost_price');
        });
    }
};

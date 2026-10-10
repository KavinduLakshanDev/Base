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
        Schema::table('purchase', function (Blueprint $table) {
            $table->decimal('balance_amount', 15, 2)->default(0)->after('TotalVal');
        });

        // Backfill balance_amount with TotalVal for existing records
        DB::table('purchase')->update([
            'balance_amount' => DB::raw('TotalVal')
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('purchase', function (Blueprint $table) {
            $table->dropColumn('balance_amount');
        });
    }
};

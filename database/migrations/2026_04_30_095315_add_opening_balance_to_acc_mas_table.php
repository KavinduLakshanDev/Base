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
        Schema::table('acc_mas', function (Blueprint $table) {
            $table->decimal('opening_balance', 18, 2)->default(0)->after('section_code');
        });

        // Backfill existing opening balances from CurBal for consistency
        DB::table('acc_mas')->update([
            'opening_balance' => DB::raw('COALESCE(CurBal, 0)')
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('acc_mas', function (Blueprint $table) {
            $table->dropColumn('opening_balance');
        });
    }
};

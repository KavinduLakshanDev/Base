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
        $connection = Schema::getConnection()->getDriverName();

        if ($connection === 'mysql') {
            // Increase TrnTyp length to accommodate values like "DELIVERY-RESTORE"
            DB::statement('ALTER TABLE `stock_in_hand` MODIFY `TrnTyp` VARCHAR(32) NULL');
        } elseif ($connection === 'sqlite') {
            // SQLite does not enforce VARCHAR length; nothing required.
        } else {
            // Fallback: try a generic change if doctrine/dbal is available
            if (Schema::hasColumn('stock_in_hand', 'TrnTyp')) {
                Schema::table('stock_in_hand', function (Blueprint $table) {
                    $table->string('TrnTyp', 32)->nullable()->change();
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $connection = Schema::getConnection()->getDriverName();

        if ($connection === 'mysql') {
            DB::statement('ALTER TABLE `stock_in_hand` MODIFY `TrnTyp` VARCHAR(10) NULL');
        } elseif ($connection === 'sqlite') {
            // nothing to do
        } else {
            if (Schema::hasColumn('stock_in_hand', 'TrnTyp')) {
                Schema::table('stock_in_hand', function (Blueprint $table) {
                    $table->string('TrnTyp', 10)->nullable()->change();
                });
            }
        }
    }
};
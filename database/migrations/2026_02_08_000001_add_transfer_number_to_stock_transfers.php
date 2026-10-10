<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('stock_transfers', function (Blueprint $table) {
            $table->string('transfer_number')->nullable()->after('id');
            // We make it nullable first to backfill, then we can make it unique/not null locally if desired, 
            // but for safety in SQLite/MySQL strict modes with existing data, we handle backfill carefully.
        });

        // Backfill existing records
        $transfers = DB::table('stock_transfers')->orderBy('id')->get();
        $count = 0;
        foreach ($transfers as $transfer) {
            $count++;
            $year = substr($transfer->transfer_date, 0, 4);
            $number = 'TRF-' . $year . '-' . str_pad($count, 5, '0', STR_PAD_LEFT);
            
            DB::table('stock_transfers')
                ->where('id', $transfer->id)
                ->update(['transfer_number' => $number]);
        }

        // Update the sequence table to reflect the backfilled count
        DB::table('sequences')
            ->where('name', 'stock_transfer')
            ->update(['value' => $count]);

        // Now add the unique constraint and make it not null
        Schema::table('stock_transfers', function (Blueprint $table) {
            $table->string('transfer_number')->nullable(false)->change();
            $table->unique('transfer_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stock_transfers', function (Blueprint $table) {
            $table->dropUnique(['transfer_number']);
            $table->dropColumn('transfer_number');
        });
    }
};

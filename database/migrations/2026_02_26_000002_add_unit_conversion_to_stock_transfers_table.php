<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add unit-conversion audit columns to stock_transfers.
     *
     * sent_unit_id      – snapshot of the sending unit at transfer time
     * received_unit_id  – snapshot of the receiving unit at transfer time
     * conversion_factor – snapshot of the factor at transfer time (immutable audit record)
     * received_quantity – actual quantity added to the destination stock (after conversion)
     *
     * If received_quantity IS NULL, executeTransfer() falls back to quantity (safe for existing records).
     */
    public function up(): void
    {
        Schema::table('stock_transfers', function (Blueprint $table) {
            if (!Schema::hasColumn('stock_transfers', 'sent_unit_id')) {
                $table->unsignedInteger('sent_unit_id')->nullable()->after('quantity')
                    ->comment('Unit used by sender – snapshot at transfer time');
            }

            if (!Schema::hasColumn('stock_transfers', 'received_unit_id')) {
                $table->unsignedInteger('received_unit_id')->nullable()->after('sent_unit_id')
                    ->comment('Unit used by receiver – snapshot at transfer time');
            }

            if (!Schema::hasColumn('stock_transfers', 'conversion_factor')) {
                $table->decimal('conversion_factor', 15, 4)->default(1.0000)->after('received_unit_id')
                    ->comment('Snapshot of conversion factor at time of transfer');
            }

            if (!Schema::hasColumn('stock_transfers', 'received_quantity')) {
                $table->decimal('received_quantity', 15, 4)->nullable()->after('conversion_factor')
                    ->comment('Actual quantity credited to the destination section (after conversion)');
            }
        });
    }

    public function down(): void
    {
        Schema::table('stock_transfers', function (Blueprint $table) {
            $table->dropColumn(['sent_unit_id', 'received_unit_id', 'conversion_factor', 'received_quantity']);
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add three unit-conversion columns to itemmaster.
     *
     * transfer_unit_id           – the unit Vismass sends in   (FK → code_masters.id, conkey='UNT')
     * receiving_unit_id          – the unit Malibo receives in (FK → code_masters.id, conkey='UNT')
     * transfer_conversion_factor – how many receiving-units = 1 sending-unit  (default 1 = no conversion)
     *
     * When transfer_conversion_factor = 1 OR receiving_unit_id IS NULL, no conversion is applied.
     * This is fully backward-compatible with all existing products.
     */
    public function up(): void
    {
        Schema::table('itemmaster', function (Blueprint $table) {
            if (!Schema::hasColumn('itemmaster', 'transfer_unit_id')) {
                $table->unsignedInteger('transfer_unit_id')->nullable()->after('UnitKy')
                    ->comment('Unit used when sending to another company (FK code_masters.id)');
            }

            if (!Schema::hasColumn('itemmaster', 'receiving_unit_id')) {
                $table->unsignedInteger('receiving_unit_id')->nullable()->after('transfer_unit_id')
                    ->comment('Unit used when receiving in another company (FK code_masters.id)');
            }

            if (!Schema::hasColumn('itemmaster', 'transfer_conversion_factor')) {
                $table->decimal('transfer_conversion_factor', 15, 4)->default(1.0000)->after('receiving_unit_id')
                    ->comment('How many receiving_units equal 1 transfer_unit. 1 = no conversion.');
            }
        });
    }

    public function down(): void
    {
        Schema::table('itemmaster', function (Blueprint $table) {
            $table->dropColumn(['transfer_unit_id', 'receiving_unit_id', 'transfer_conversion_factor']);
        });
    }
};

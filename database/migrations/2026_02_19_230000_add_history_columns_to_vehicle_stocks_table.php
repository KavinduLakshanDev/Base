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
        Schema::table('vehicle_stocks', function (Blueprint $table) {
            if (!Schema::hasColumn('vehicle_stocks', 'loaded_quantity')) {
                $table->decimal('loaded_quantity', 15, 3)->default(0)->after('quantity');
            }
            if (!Schema::hasColumn('vehicle_stocks', 'delivered_quantity')) {
                $table->decimal('delivered_quantity', 15, 3)->default(0)->after('loaded_quantity');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('vehicle_stocks', function (Blueprint $table) {
            $table->dropColumn(['loaded_quantity', 'delivered_quantity']);
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add item_direction to customer_return_items.
     *
     * 'in'  = item received back from customer (normal returned item)
     * 'out' = item given to customer in exchange
     *
     * Default 'in' keeps all existing rows unchanged.
     */
    public function up(): void
    {
        Schema::table('customer_return_items', function (Blueprint $table) {
            $table->enum('item_direction', ['in', 'out'])
                  ->default('in')
                  ->after('customer_return_id');
        });
    }

    public function down(): void
    {
        Schema::table('customer_return_items', function (Blueprint $table) {
            $table->dropColumn('item_direction');
        });
    }
};

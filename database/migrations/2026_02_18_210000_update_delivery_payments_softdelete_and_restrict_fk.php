<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Changes made:
     *  1. Add `deleted_at` for soft-deletes (audit trail preserved).
     *  2. Change `delivery_id` FK from cascadeOnDelete → restrictOnDelete so that
     *     a delivery with payments cannot be silently deleted; finance records are protected.
     */
    public function up(): void
    {
        Schema::table('delivery_payments', function (Blueprint $table) {
            // 1. Soft-deletes column
            $table->softDeletes();

            // 2. Drop the existing cascade FK and re-add as restrict
            $table->dropForeign(['delivery_id']);
            $table->foreign('delivery_id')
                  ->references('id')
                  ->on('deliveries')
                  ->restrictOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('delivery_payments', function (Blueprint $table) {
            $table->dropSoftDeletes();

            $table->dropForeign(['delivery_id']);
            $table->foreign('delivery_id')
                  ->references('id')
                  ->on('deliveries')
                  ->cascadeOnDelete();
        });
    }
};

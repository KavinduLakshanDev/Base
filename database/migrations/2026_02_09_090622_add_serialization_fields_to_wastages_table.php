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
            $table->string('serial_number')->nullable()->after('unit');
            $table->string('batch_no')->nullable()->after('serial_number');
            $table->string('warranty')->nullable()->after('batch_no');
            $table->unsignedBigInteger('purchase_det_id')->nullable()->after('warranty');
            $table->unsignedBigInteger('stock_in_hand_id')->nullable()->after('purchase_det_id');
            
            $table->index('serial_number');
            $table->index('batch_no');
            $table->index('purchase_det_id');
            $table->index('stock_in_hand_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('wastages', function (Blueprint $table) {
            $table->dropIndex(['serial_number']);
            $table->dropIndex(['batch_no']);
            $table->dropIndex(['purchase_det_id']);
            $table->dropIndex(['stock_in_hand_id']);
            
            $table->dropColumn(['serial_number', 'batch_no', 'warranty', 'purchase_det_id', 'stock_in_hand_id']);
        });
    }
};

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
        // First, check if we need to rename 'id' to 'ItemPriceKey'
        if (Schema::hasColumn('item_price_det', 'id') && !Schema::hasColumn('item_price_det', 'ItemPriceKey')) {
            Schema::table('item_price_det', function (Blueprint $table) {
                $table->renameColumn('id', 'ItemPriceKey');
            });
        }

        Schema::table('item_price_det', function (Blueprint $table) {
            // Add missing columns
            if (!Schema::hasColumn('item_price_det', 'fInAct')) {
                $table->boolean('fInAct')->default(false);
            }
            if (!Schema::hasColumn('item_price_det', 'CosPri')) {
                $table->decimal('CosPri', 15, 4)->default(0);
            }
            if (!Schema::hasColumn('item_price_det', 'NCostPrice')) {
                $table->decimal('NCostPrice', 15, 4)->default(0);
            }
            if (!Schema::hasColumn('item_price_det', 'SlsPri')) {
                $table->decimal('SlsPri', 15, 4)->default(0);
            }
            if (!Schema::hasColumn('item_price_det', 'WholePrice')) {
                $table->decimal('WholePrice', 15, 4)->default(0);
            }
            if (!Schema::hasColumn('item_price_det', 'RtQty1')) {
                $table->decimal('RtQty1', 15, 4)->default(0);
            }
            if (!Schema::hasColumn('item_price_det', 'RtDis1')) {
                $table->decimal('RtDis1', 15, 4)->default(0);
            }
            if (!Schema::hasColumn('item_price_det', 'RtQty2')) {
                $table->decimal('RtQty2', 15, 4)->default(0);
            }
            if (!Schema::hasColumn('item_price_det', 'RtDis2')) {
                $table->decimal('RtDis2', 15, 4)->default(0);
            }
            if (!Schema::hasColumn('item_price_det', 'RtQty3')) {
                $table->decimal('RtQty3', 15, 4)->default(0);
            }
            if (!Schema::hasColumn('item_price_det', 'RtDis3')) {
                $table->decimal('RtDis3', 15, 4)->default(0);
            }
            if (!Schema::hasColumn('item_price_det', 'RtQty4')) {
                $table->decimal('RtQty4', 15, 4)->default(0);
            }
            if (!Schema::hasColumn('item_price_det', 'RtDis4')) {
                $table->decimal('RtDis4', 15, 4)->default(0);
            }
            if (!Schema::hasColumn('item_price_det', 'DiscountQty')) {
                $table->decimal('DiscountQty', 15, 4)->default(0);
            }
            if (!Schema::hasColumn('item_price_det', 'QuntityDiscount')) {
                $table->decimal('QuntityDiscount', 15, 4)->default(0);
            }
            if (!Schema::hasColumn('item_price_det', 'CCPrice')) {
                $table->decimal('CCPrice', 15, 4)->default(0);
            }
            if (!Schema::hasColumn('item_price_det', 'ExtraPrice')) {
                $table->decimal('ExtraPrice', 15, 4)->default(0);
            }
            if (!Schema::hasColumn('item_price_det', 'ChangedDate')) {
                $table->dateTime('ChangedDate')->nullable();
            }
            if (!Schema::hasColumn('item_price_det', 'uuid')) {
                $table->string('uuid', 36)->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('item_price_det', function (Blueprint $table) {
            $table->dropColumn([
                'fInAct', 'CosPri', 'NCostPrice', 'SlsPri', 'WholePrice',
                'RtQty1', 'RtDis1', 'RtQty2', 'RtDis2', 'RtQty3', 'RtDis3', 'RtQty4', 'RtDis4',
                'DiscountQty', 'QuntityDiscount', 'CCPrice', 'ExtraPrice', 'ChangedDate', 'uuid'
            ]);
            
            if (Schema::hasColumn('item_price_det', 'ItemPriceKey')) {
                $table->renameColumn('ItemPriceKey', 'id');
            }
        });
    }
};

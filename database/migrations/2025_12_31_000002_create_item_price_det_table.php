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
        Schema::create('item_price_det', function (Blueprint $table) {
            $table->id();
            $table->string('ItmKy', 50);
            $table->string('ItemCode', 50);
            $table->decimal('Price', 15, 4)->default(0);
            $table->decimal('PrevPrice', 15, 4)->default(0);
            $table->date('EffectiveDate')->nullable();
            $table->date('PriceDate')->nullable();
            $table->string('PriceType', 20)->default('RETAIL');
            $table->string('company_code', 20);
            $table->string('section_code', 20);
            $table->string('Status', 1)->default('A');
            $table->string('InUse', 1)->default('Y');
            $table->timestamps();
            
            // Indexes for performance
            $table->index('EffectiveDate', 'idx_effective_date');
            $table->index(['ItemCode', 'PriceType'], 'idx_itemcode_pricetype');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('item_price_det');
    }
};

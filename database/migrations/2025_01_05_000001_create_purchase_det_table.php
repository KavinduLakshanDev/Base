<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Based on CHAMI-LAPTOP-Sh... - dbo.PurchaseDet table structure from PurchaseDet.jpg
     */
    public function up(): void
    {
        Schema::create('purchase_det', function (Blueprint $table) {
            // Company and Branch foreign keys (constraints added later)
            $table->foreignId('company_id'); // ->constrained('companies')->onDelete('cascade');
            $table->foreignId('section_id'); // ->constrained('sections')->onDelete('cascade');
            
            $table->integer('PerchaseDetKy')->primary()->comment('Purchase Detail Key');
            $table->boolean('flnAct')->nullable()->comment('Inactive flag');
            $table->string('Status', 2)->nullable()->comment('Status');
            $table->integer('PurchaseKey')->comment('Purchase Key - FK to purchase table');
            $table->integer('iTimKy')->comment('Item Key');
            $table->float('Qty')->nullable()->comment('Quantity');
            $table->decimal('iTimDiscount', 18, 0)->nullable()->comment('Item Discount');
            $table->decimal('CostPrice', 19, 4)->nullable()->comment('Cost Price');
            $table->decimal('SalePrice', 19, 4)->nullable()->comment('Sale Price');
            $table->float('DiscountRate')->nullable()->comment('Discount Rate');
            $table->decimal('Free', 18, 0)->nullable()->comment('Free Quantity');
            $table->decimal('AmountF', 19, 4)->nullable()->comment('Amount');
            $table->decimal('NormalCost', 19, 4)->nullable()->comment('Normal Cost');
            $table->decimal('WholePrice', 19, 4)->nullable()->comment('Wholesale Price');
            $table->decimal('ExtraPrice', 19, 4)->nullable()->comment('Extra Price');
            $table->decimal('NewCostPrice', 19, 4)->nullable()->comment('New Cost Price');
            $table->decimal('CCPrice', 19, 4)->nullable()->comment('CC Price');
            $table->timestamps();

            // Foreign key constraint
            $table->foreign('PurchaseKey')->references('PurchaseKey')->on('purchase')->onDelete('cascade');
            
            // Indexes for better query performance
            $table->index('PurchaseKey');
            $table->index('iTimKy');
            $table->index(['Status', 'flnAct']);
            $table->index(['company_id', 'section_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_det');
    }
};
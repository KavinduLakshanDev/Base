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
        Schema::create('purchase_orders', function (Blueprint $table) {
            $table->string('company_code', 20)->nullable();
            $table->string('section_code', 20)->nullable();
            
            $table->integer('PurchaseOrderKey')->primary()->comment('Purchase Order Key (int)');
            $table->boolean('flnact')->nullable()->comment('Inactive flag')->default(false);
            $table->string('Status', 20)->nullable()->comment('Status')->default('Pending');
            $table->integer('PurchaseOrderNo')->comment('Purchase Order Number');
            $table->dateTime('PODate')->nullable()->comment('PO Date');
            $table->string('SuppCode', 50)->nullable()->comment('Supplier Code');
            $table->decimal('CostTotal', 19, 4)->nullable()->comment('Cost Total');
            $table->decimal('TotalVal', 19, 4)->nullable()->comment('Total Value');
            $table->decimal('ToIDscount', 19, 4)->nullable()->comment('Total Discount');
            $table->boolean('flused')->nullable()->comment('Used flag')->default(false);
            $table->string('AddUser', 15)->nullable()->comment('User who added');
            $table->integer('AccKy')->nullable()->comment('Account Key');
            $table->string('Des', 100)->nullable()->comment('Description');
            $table->decimal('TaxAmount', 19, 4)->nullable()->comment('Tax Amount');
            $table->string('type', 20)->nullable()->comment('Type');
            $table->timestamps();

            $table->index('PurchaseOrderNo');
            $table->index('PODate');
            $table->index('SuppCode');
            $table->index(['Status', 'flnact']);
            $table->index(['company_code', 'section_code']);
        });

        Schema::create('purchase_order_det', function (Blueprint $table) {
            $table->string('company_code', 20)->nullable();
            $table->string('section_code', 20)->nullable();
            
            $table->integer('PurchaseOrderDetKy')->primary()->comment('PO Detail Key');
            $table->boolean('flnAct')->nullable()->comment('Inactive flag')->default(false);
            $table->string('Status', 20)->nullable()->comment('Status');
            $table->integer('PurchaseOrderKey')->comment('Purchase Order Key - FK');
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
            $table->decimal('VehicleSalePrice', 19, 4)->nullable()->comment('Vehicle Sale Price');
            $table->decimal('NewCostPrice', 19, 4)->nullable()->comment('New Cost Price');
            $table->float('CusDiscountRate')->nullable()->comment('Customer Discount Rate');
            $table->string('remark', 255)->nullable()->comment('Remark');
            $table->string('discount_type', 20)->nullable()->comment('Discount Type');
            $table->timestamps();

            $table->foreign('PurchaseOrderKey')->references('PurchaseOrderKey')->on('purchase_orders')->onDelete('cascade');
            
            $table->index('PurchaseOrderKey');
            $table->index('iTimKy');
            $table->index(['Status', 'flnAct']);
            $table->index(['company_code', 'section_code']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_orders_tables');
    }
};

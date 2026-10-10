<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Based on CHAMI-LAPTOP-Sh... - dbo.Perchase table structure from GRNMaster.jpg
     */
    public function up(): void
    {
        if (!Schema::hasTable('purchase')) {
            Schema::create('purchase', function (Blueprint $table) {
                // Company and Branch foreign keys (constraints added later)
                $table->foreignId('company_id'); // ->constrained('companies')->onDelete('cascade');
                $table->foreignId('section_id'); // ->constrained('sections')->onDelete('cascade');
                
                $table->integer('PurchaseKey')->primary()->comment('Purchase Key (int)');
                $table->boolean('flnact')->nullable()->comment('Inactive flag');
                $table->string('Status', 2)->nullable()->comment('Status');
                $table->integer('PurchaseNo')->comment('Purchase Number');
                $table->dateTime('GRNDate')->nullable()->comment('GRN Date (renamed from Date)');
                $table->string('SuppCode', 50)->nullable()->comment('Supplier Code');
                $table->decimal('CostTotal', 19, 4)->nullable()->comment('Cost Total');
                $table->decimal('TotalVal', 19, 4)->nullable()->comment('Total Value');
                $table->decimal('ToIDscount', 19, 4)->nullable()->comment('Total Discount');
                $table->boolean('flused')->nullable()->comment('Used flag');
                $table->string('AddUser', 15)->nullable()->comment('User who added');
                $table->integer('OrdTypKy')->nullable()->comment('Order Type Key');
                $table->integer('AccKy')->nullable()->comment('Account Key');
                $table->string('Des', 100)->nullable()->comment('Description');
                $table->integer('ExtOrdKy')->nullable()->comment('External Order Key');
                $table->integer('CounterID')->nullable()->comment('Counter ID');
                $table->string('PayTrmKy', 50)->nullable()->comment('Payment Term Key');
                $table->decimal('TaxAmount', 19, 4)->nullable()->comment('Tax Amount');
                $table->string('CusOrdNo', 20)->nullable()->comment('Customer Order No');
                $table->string('SuppInvNo', 25)->nullable()->comment('Supplier Invoice No');
                $table->timestamps();

                // Indexes for better query performance
                $table->index('PurchaseNo');
                $table->index('GRNDate');
                $table->index('SuppCode');
                $table->index(['Status', 'flnact']);
                $table->index(['company_id', 'section_id']);
            });
        } else {
            Schema::table('purchase', function (Blueprint $table) {
                if (Schema::hasColumn('purchase', 'Purchase_Type')) {
                    $table->dropColumn('Purchase_Type');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase');
    }
};
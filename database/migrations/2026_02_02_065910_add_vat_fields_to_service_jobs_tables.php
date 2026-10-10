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
        // Add VAT fields to service_jobs table
        Schema::table('service_jobs', function (Blueprint $table) {
            $table->boolean('is_vat_invoice')->default(false)->after('total_amount');
            $table->decimal('vat_rate', 5, 2)->nullable()->after('is_vat_invoice');
            $table->decimal('subtotal_before_vat', 10, 2)->default(0)->after('vat_rate');
            $table->decimal('vat_amount', 10, 2)->default(0)->after('subtotal_before_vat');
            $table->string('customer_vat_no', 50)->nullable()->after('customer_address');
            $table->string('company_vat_no', 50)->nullable()->after('section_code');
        });

        // Add VAT fields to service_job_items table
        Schema::table('service_job_items', function (Blueprint $table) {
            $table->boolean('vat_inclusive')->default(false)->after('unit_price');
            $table->decimal('vat_rate', 5, 2)->nullable()->after('vat_inclusive');
            $table->decimal('price_before_vat', 10, 2)->default(0)->after('vat_rate');
            $table->decimal('vat_amount', 10, 2)->default(0)->after('price_before_vat');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('service_jobs', function (Blueprint $table) {
            $table->dropColumn([
                'is_vat_invoice',
                'vat_rate',
                'subtotal_before_vat',
                'vat_amount',
                'customer_vat_no',
                'company_vat_no',
            ]);
        });

        Schema::table('service_job_items', function (Blueprint $table) {
            $table->dropColumn([
                'vat_inclusive',
                'vat_rate',
                'price_before_vat',
                'vat_amount',
            ]);
        });
    }
};

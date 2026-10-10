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
        Schema::table('sales_transactions', function (Blueprint $table) {
            $table->decimal('balance_amount', 15, 2)->default(0)->after('total_amount');
        });

        Schema::table('customer_payments', function (Blueprint $table) {
            $table->unsignedBigInteger('sales_transaction_id')->nullable()->after('service_job_id');
            $table->foreign('sales_transaction_id')->references('id')->on('sales_transactions')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sales_transactions', function (Blueprint $table) {
            $table->dropColumn('balance_amount');
        });

        Schema::table('customer_payments', function (Blueprint $table) {
            $table->dropForeign(['sales_transaction_id']);
            $table->dropColumn('sales_transaction_id');
        });
    }
};

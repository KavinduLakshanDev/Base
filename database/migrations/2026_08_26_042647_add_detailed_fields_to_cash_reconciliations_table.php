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
        Schema::table('cash_reconciliations', function (Blueprint $table) {
            $table->decimal('sales_cash', 12, 2)->default(0)->after('cash_sales');
            $table->decimal('sales_card', 12, 2)->default(0)->after('sales_cash');
            $table->decimal('sales_bank', 12, 2)->default(0)->after('sales_card');
            $table->decimal('sales_cheque', 12, 2)->default(0)->after('sales_bank');
            $table->decimal('sales_credit', 12, 2)->default(0)->after('sales_cheque');
            $table->decimal('sales_returns', 12, 2)->default(0)->after('sales_credit');
            
            $table->decimal('collections_cash', 12, 2)->default(0)->after('credit_payments');
            $table->decimal('collections_card', 12, 2)->default(0)->after('collections_cash');
            $table->decimal('collections_bank', 12, 2)->default(0)->after('collections_card');
            $table->decimal('collections_cheque', 12, 2)->default(0)->after('collections_bank');
            
            $table->decimal('transfers', 12, 2)->default(0)->after('collections_cheque');
            $table->decimal('bbf', 12, 2)->default(0)->after('transfers');
            
            $table->integer('actual_cheques')->default(0)->after('actual_cash');
            $table->decimal('actual_cheques_amount', 12, 2)->default(0)->after('actual_cheques');
            $table->decimal('expected_cheques', 12, 2)->default(0)->after('expected_closing');
            $table->decimal('cheque_variance', 12, 2)->default(0)->after('variance');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cash_reconciliations', function (Blueprint $table) {
            $table->dropColumn([
                'sales_cash', 'sales_card', 'sales_bank', 'sales_cheque', 'sales_credit', 'sales_returns',
                'collections_cash', 'collections_card', 'collections_bank', 'collections_cheque',
                'transfers', 'bbf',
                'actual_cheques', 'actual_cheques_amount', 'expected_cheques', 'cheque_variance'
            ]);
        });
    }
};

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
        Schema::create('delivery_petty_cash_transactions', function (Blueprint $table) {
            $table->id();
            $table->string('transaction_no')->unique()->nullable();
            $table->foreignId('delivery_petty_cash_category_id')
                  ->nullable()
                  ->constrained('delivery_petty_cash_categories', 'id', 'del_pc_cat_id_foreign');
            $table->string('type', 20)->default('usage')->index();
            $table->decimal('amount', 15, 2);
            $table->date('transaction_date');
            $table->text('notes')->nullable();
            $table->string('slip_path')->nullable();
            $table->string('company_code')->nullable();
            $table->string('section_code')->nullable();
            $table->foreignId('created_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('delivery_petty_cash_transactions');
    }
};

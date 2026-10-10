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
        Schema::create('expense_accounts', function (Blueprint $table) {
            $table->id();
            $table->string('account_name');
            $table->text('description')->nullable();
            $table->decimal('current_balance', 15, 2)->default(0);
            $table->string('company_code')->nullable();
            $table->string('section_code')->nullable();
            $table->boolean('status')->default(1);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('expense_accounts');
    }
};

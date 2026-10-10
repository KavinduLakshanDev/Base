<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_conversions', function (Blueprint $table) {
            $table->id();
            $table->string('conversion_number', 50)->unique();
            $table->string('company_code', 50);
            $table->string('section_code', 50);
            $table->unsignedBigInteger('item_id');
            $table->string('item_code', 100)->nullable();
            $table->string('item_name', 255)->nullable();
            $table->unsignedBigInteger('stock_id')->nullable();   // source stock_in_hand TableKy
            $table->decimal('input_quantity', 15, 4);             // qty in "from" unit  (e.g. 5 bundles)
            $table->decimal('output_quantity', 15, 4);            // qty in "to" unit    (e.g. 50 sheets)
            $table->decimal('conversion_factor', 15, 4)->default(1.0000);
            $table->unsignedBigInteger('from_unit_id')->nullable();  // code_masters.id
            $table->unsignedBigInteger('to_unit_id')->nullable();    // code_masters.id
            $table->string('from_unit_name', 100)->nullable();
            $table->string('to_unit_name', 100)->nullable();
            $table->date('conversion_date');
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->index('company_code');
            $table->index('section_code');
            $table->index('item_id');
            $table->index('conversion_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_conversions');
    }
};

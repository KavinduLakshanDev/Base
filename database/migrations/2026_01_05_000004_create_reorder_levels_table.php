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
        Schema::create('reorder_levels', function (Blueprint $table) {
            $table->id();
            $table->string('item_code', 50);
            $table->string('company_code', 20);
            $table->string('section_code', 20);
            $table->decimal('reorder_level', 15, 4)->default(0);
            $table->timestamps();

            $table->index(['item_code', 'company_code', 'section_code'], 'idx_reorder_item_loc');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reorder_levels');
    }
};

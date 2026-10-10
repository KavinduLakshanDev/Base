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
        Schema::create('reorder_level_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reorder_level_id')->nullable()->constrained('reorder_levels')->nullOnDelete();
            $table->string('company_code', 20);
            $table->string('section_code', 20);
            $table->string('item_code', 50);
            $table->decimal('old_level', 15, 4)->nullable();
            $table->decimal('new_level', 15, 4)->nullable();
            $table->enum('action', ['created', 'updated', 'deleted']);
            $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['company_code', 'section_code'], 'idx_reorder_level_logs_loc');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reorder_level_logs');
    }
};
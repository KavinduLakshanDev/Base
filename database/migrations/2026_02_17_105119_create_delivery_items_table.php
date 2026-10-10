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
        Schema::dropIfExists('delivery_items');
        
        Schema::create('delivery_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('delivery_id')->constrained('deliveries')->onDelete('cascade');
            $table->string('ItmKy', 50);
            $table->string('batch_no', 50)->default('DEFAULT');
            $table->string('section_code', 20);
            $table->string('ItemCode', 50);
            $table->string('ItemName', 200);
            $table->string('Unit', 20)->nullable();
            $table->decimal('quantity', 15, 4)->default(0);
            $table->decimal('unit_price', 15, 4)->default(0);
            $table->decimal('total_amount', 15, 4)->default(0);
            $table->timestamps();

            // Foreign key constraint to itemmaster (composite key)
            // Note: Foreign key removed due to composite key constraint issues
            // Relationship will be handled at application level
            // $table->foreign(['ItmKy', 'batch_no'])->references(['ItmKy', 'batch_no'])->on('itemmaster')->onDelete('cascade');
            
            // Index for performance
            $table->index(['delivery_id', 'ItmKy', 'batch_no'], 'idx_delivery_item');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('delivery_items');
    }
};

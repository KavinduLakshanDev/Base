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
        Schema::create('deliveries', function (Blueprint $table) {
            $table->id();
            $table->string('delivery_number')->unique();
            $table->foreignId('delivery_route_id')->constrained('delivery_routes');
            $table->foreignId('distributor_id')->nullable()->constrained('users');
            $table->string('status')->default('pending'); // pending, assigned, delivering, delivered, cancelled
            $table->string('company_code');
            
            $table->string('customer_name');
            $table->string('customer_address');
            $table->string('customer_phone');
            
            $table->timestamps();

            $table->foreign('company_code')->references('company_code')->on('companies')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('deliveries');
    }
};
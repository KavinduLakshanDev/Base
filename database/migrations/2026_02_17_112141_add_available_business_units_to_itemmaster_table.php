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
        Schema::table('itemmaster', function (Blueprint $table) {
            // Add JSON column to store which business units can access this product
            // Example: ["vismass", "malibo"] means product is available in both
            // Default to ["vismass"] for existing products
            $table->json('available_business_units')->nullable()->after('available_sections');
        });
        
        // Set default value for existing products to include only vismass
        DB::table('itemmaster')->whereNull('available_business_units')->update([
            'available_business_units' => json_encode(['vismass'])
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('itemmaster', function (Blueprint $table) {
            $table->dropColumn('available_business_units');
        });
    }
};

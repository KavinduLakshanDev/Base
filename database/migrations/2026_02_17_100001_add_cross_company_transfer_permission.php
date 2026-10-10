<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add new permission for cross-company stock transfers
        DB::table('permissions')->insert([
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
            'name' => 'Cross-Company Stock Transfer',
            'slug' => 'stock.cross_company_transfer',
            'description' => 'Allows transferring stock between sections belonging to different companies',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('permissions')->where('slug', 'stock.cross_company_transfer')->delete();
    }
};

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
        Schema::table('code_masters', function (Blueprint $table) {
            $table->string('branch_code', 255)->nullable()->after('company_code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('code_masters', function (Blueprint $table) {
            $table->dropColumn('branch_code');
        });
    }
};

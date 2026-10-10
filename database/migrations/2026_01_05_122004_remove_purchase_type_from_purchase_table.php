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
        Schema::table('purchase', function (Blueprint $table) {
            if (Schema::hasColumn('purchase', 'Purchase_Type')) {
                $table->dropColumn('Purchase_Type');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('purchase', function (Blueprint $table) {
            $table->string('Purchase_Type', 50)->default('PT001')->comment('Purchase Type from code_master (PT001=TAC, PT002=Non TAC)');
        });
    }
};

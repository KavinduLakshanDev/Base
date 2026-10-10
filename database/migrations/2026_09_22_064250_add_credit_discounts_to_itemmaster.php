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
            $table->decimal('CredQty1', 10, 4)->nullable();
            $table->decimal('CredDis1', 10, 4)->nullable();
            $table->decimal('CredQty2', 10, 4)->nullable();
            $table->decimal('CredDis2', 10, 4)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('itemmaster', function (Blueprint $table) {
            $table->dropColumn(['CredQty1', 'CredDis1', 'CredQty2', 'CredDis2']);
        });
    }
};

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
            $table->unsignedBigInteger('models_id')->nullable()->after('brand_id');
            $table->foreign('models_id')->references('id')->on('models')->onDelete('set null');
            $table->index('models_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('itemmaster', function (Blueprint $table) {
            $table->dropForeign(['models_id']);
            $table->dropIndex(['models_id']);
            $table->dropColumn('models_id');
        });
    }
};

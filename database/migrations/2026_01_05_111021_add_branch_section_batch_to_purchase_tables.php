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
            if (!Schema::hasColumn('purchase', 'batch_no')) {
                $table->string('batch_no', 50)->nullable()->comment('Batch Number');
            }
        });

        Schema::table('purchase_det', function (Blueprint $table) {
            if (!Schema::hasColumn('purchase_det', 'batch_no')) {
                $table->string('batch_no', 50)->nullable()->comment('Batch Number');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('purchase', function (Blueprint $table) {
            $table->dropColumn(['batch_no']);
        });

        Schema::table('purchase_det', function (Blueprint $table) {
            $table->dropColumn(['batch_no']);
        });
    }
};

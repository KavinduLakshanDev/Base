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
        Schema::table('customer_returns', function (Blueprint $table) {
            if (!Schema::hasColumn('customer_returns', 'customer_id')) {
                $table->unsignedBigInteger('customer_id')->nullable()->after('return_date');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('customer_returns', function (Blueprint $table) {
            if (Schema::hasColumn('customer_returns', 'customer_id')) {
                $table->dropColumn('customer_id');
            }
        });
    }
};

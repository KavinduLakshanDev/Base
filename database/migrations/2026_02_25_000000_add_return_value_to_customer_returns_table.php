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
        if (!Schema::hasColumn('customer_returns', 'return_value')) {
            Schema::table('customer_returns', function (Blueprint $table) {
                $table->decimal('return_value', 15, 2)->default(0)->after('total_return_amount');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('customer_returns', 'return_value')) {
            Schema::table('customer_returns', function (Blueprint $table) {
                $table->dropColumn('return_value');
            });
        }
    }
};

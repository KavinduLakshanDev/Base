<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('delivery_items', 'section_code')) {
            Schema::table('delivery_items', function (Blueprint $table) {
                $table->string('section_code', 20)->after('batch_no')->default('');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('delivery_items', 'section_code')) {
            Schema::table('delivery_items', function (Blueprint $table) {
                $table->dropColumn('section_code');
            });
        }
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('service_job_items', function (Blueprint $table) {
            // store batch number for inventory/tracking purposes
            $table->string('batch_no')->nullable()->after('item_name');
        });
    }

    public function down(): void
    {
        Schema::table('service_job_items', function (Blueprint $table) {
            $table->dropColumn('batch_no');
        });
    }
};
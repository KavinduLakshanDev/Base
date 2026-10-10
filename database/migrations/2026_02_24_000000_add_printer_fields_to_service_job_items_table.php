<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('service_job_items', function (Blueprint $table) {
            // Add printer/part identification fields for proper stock tracking
            $table->string('serial_number')->nullable()->after('batch_no');
            $table->string('brand')->nullable()->after('serial_number');
            $table->string('model')->nullable()->after('brand');
        });
    }

    public function down(): void
    {
        Schema::table('service_job_items', function (Blueprint $table) {
            $table->dropColumn(['serial_number', 'brand', 'model']);
        });
    }
};

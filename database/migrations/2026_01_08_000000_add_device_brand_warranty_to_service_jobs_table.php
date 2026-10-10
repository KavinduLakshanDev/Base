<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('service_jobs', function (Blueprint $table) {
            if (!Schema::hasColumn('service_jobs', 'device_brand')) {
                $table->string('device_brand')->nullable()->after('device_name');
            }
            if (!Schema::hasColumn('service_jobs', 'device_warranty')) {
                $table->string('device_warranty')->nullable()->after('device_barcode');
            }
        });
    }

    public function down(): void
    {
        Schema::table('service_jobs', function (Blueprint $table) {
            if (Schema::hasColumn('service_jobs', 'device_brand')) {
                $table->dropColumn('device_brand');
            }
            if (Schema::hasColumn('service_jobs', 'device_warranty')) {
                $table->dropColumn('device_warranty');
            }
        });
    }
};

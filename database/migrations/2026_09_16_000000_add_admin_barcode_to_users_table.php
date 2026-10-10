<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('admin_barcode')->nullable()->unique()->after('role_id');
            $table->string('admin_barcode_token')->nullable()->after('admin_barcode');
            $table->string('admin_barcode_month')->nullable()->after('admin_barcode_token');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['admin_barcode', 'admin_barcode_token', 'admin_barcode_month']);
        });
    }
};

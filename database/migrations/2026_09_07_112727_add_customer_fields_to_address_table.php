<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('address', function (Blueprint $table) {
            $table->string('TP2', 20)->nullable()->after('TP1');
            $table->string('BRNo', 50)->nullable()->after('IDNo');
            $table->string('TINNo', 50)->nullable()->after('BRNo');
            $table->string('AddressLine2', 250)->nullable()->after('Address');
            $table->string('Locality', 100)->nullable()->after('AddressLine2');
            $table->string('PostalCode', 20)->nullable()->after('City');
        });
    }

    public function down(): void
    {
        Schema::table('address', function (Blueprint $table) {
            $table->dropColumn(['TP2', 'BRNo', 'TINNo', 'AddressLine2', 'Locality', 'PostalCode']);
        });
    }
};

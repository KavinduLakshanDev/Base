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
        Schema::table('address', function (Blueprint $table) {
            if (Schema::hasColumn('address', 'is_vat_registered') && !Schema::hasColumn('address', 'fVATRegistered')) {
                $table->renameColumn('is_vat_registered', 'fVATRegistered');
            }
            if (Schema::hasColumn('address', 'vat_no') && !Schema::hasColumn('address', 'VATNo')) {
                $table->renameColumn('vat_no', 'VATNo');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('address', function (Blueprint $table) {
            if (Schema::hasColumn('address', 'fVATRegistered')) {
                $table->renameColumn('fVATRegistered', 'is_vat_registered');
            }
            if (Schema::hasColumn('address', 'VATNo')) {
                $table->renameColumn('VATNo', 'vat_no');
            }
        });
    }
};

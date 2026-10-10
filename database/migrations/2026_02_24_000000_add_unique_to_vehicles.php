<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('vehicles', function (Blueprint $table) {
            // add composite unique to prevent duplicates within company
            $table->unique(['company_code', 'name'], 'vehicles_company_name_unique');
            $table->unique(['company_code', 'registration_no'], 'vehicles_company_reg_unique');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('vehicles', function (Blueprint $table) {
            $table->dropUnique('vehicles_company_name_unique');
            $table->dropUnique('vehicles_company_reg_unique');
        });
    }
};

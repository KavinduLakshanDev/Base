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
        // For SQLite compatibility, skip complex foreign key operations
        // Just rename columns if needed
        if (Schema::hasColumn('purchase', 'company_id')) {
            Schema::table('purchase', function (Blueprint $table) {
                $table->renameColumn('company_id', 'company_code');
                $table->string('company_code')->change();
            });
        }
        
        if (Schema::hasColumn('purchase', 'section_id')) {
            Schema::table('purchase', function (Blueprint $table) {
                $table->renameColumn('section_id', 'section_code');
                $table->string('section_code')->change();
            });
        }

        if (Schema::hasColumn('purchase_det', 'company_id')) {
            Schema::table('purchase_det', function (Blueprint $table) {
                $table->renameColumn('company_id', 'company_code');
                $table->string('company_code')->change();
            });
        }
        
        if (Schema::hasColumn('purchase_det', 'section_id')) {
            Schema::table('purchase_det', function (Blueprint $table) {
                $table->renameColumn('section_id', 'section_code');
                $table->string('section_code')->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // For SQLite compatibility, skip complex foreign key operations
        // Just rename columns back if needed
        if (Schema::hasColumn('purchase', 'company_code')) {
            Schema::table('purchase', function (Blueprint $table) {
                $table->renameColumn('company_code', 'company_id');
                $table->unsignedBigInteger('company_id')->change();
            });
        }
        
        if (Schema::hasColumn('purchase', 'section_code')) {
            Schema::table('purchase', function (Blueprint $table) {
                $table->renameColumn('section_code', 'section_id');
                $table->unsignedBigInteger('section_id')->change();
            });
        }

        if (Schema::hasColumn('purchase_det', 'company_code')) {
            Schema::table('purchase_det', function (Blueprint $table) {
                $table->renameColumn('company_code', 'company_id');
                $table->unsignedBigInteger('company_id')->change();
            });
        }
        
        if (Schema::hasColumn('purchase_det', 'section_code')) {
            Schema::table('purchase_det', function (Blueprint $table) {
                $table->renameColumn('section_code', 'section_id');
                $table->unsignedBigInteger('section_id')->change();
            });
        }
    }
};

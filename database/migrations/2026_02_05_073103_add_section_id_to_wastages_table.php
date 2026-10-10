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
        Schema::table('wastages', function (Blueprint $table) {
            $table->unsignedBigInteger('section_id')->nullable()->after('recorded_by');
            $table->foreign('section_id')->references('id')->on('sections')->onDelete('set null');
            $table->index('section_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('wastages', function (Blueprint $table) {
            $table->dropForeign(['section_id']);
            $table->dropIndex(['section_id']);
            $table->dropColumn('section_id');
        });
    }
};

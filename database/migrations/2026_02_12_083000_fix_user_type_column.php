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
        Schema::table('users', function (Blueprint $table) {
            // Ensure user_type is a string and has enough length
            $table->string('user_type', 50)->default('company_user')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No specific rollback needed as string is generic enough
    }
};

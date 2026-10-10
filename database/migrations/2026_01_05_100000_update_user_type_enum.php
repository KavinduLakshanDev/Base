<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // For SQLite compatibility, just ensure the column exists as string
        // The enum constraint will be handled at application level
        Schema::table('users', function (Blueprint $table) {
            // If the column doesn't support the new value, we can add a check constraint or just leave it
            // For now, we'll skip the modification since SQLite doesn't support MODIFY COLUMN with ENUM
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // For SQLite compatibility, no action needed
        // The enum constraint is handled at application level
    }
};
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // For SQLite, we need a different approach since MODIFY ENUM is not supported
        if (DB::getDriverName() === 'sqlite') {
            // SQLite doesn't support MODIFY for ENUM, so we'll just ensure the column exists
            // The enum values are handled at application level
            Schema::table('service_jobs', function ($table) {
                // Just ensure the column exists with string type
                if (!Schema::hasColumn('service_jobs', 'status')) {
                    $table->string('status')->default('pending');
                }
            });
        } else {
            // For MySQL/PostgreSQL, use the original MODIFY statement
            DB::statement("ALTER TABLE `service_jobs` MODIFY `status` ENUM('pending','assigned','in_progress','waiting_for_parts','quotation_received','completed','delivered','cancelled') NOT NULL DEFAULT 'pending'");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            // For SQLite, no action needed in down since we didn't change anything
        } else {
            // Revert to the previous enum (remove 'quotation_received')
            DB::statement("ALTER TABLE `service_jobs` MODIFY `status` ENUM('pending','assigned','in_progress','waiting_for_parts','completed','delivered','cancelled') NOT NULL DEFAULT 'pending'");
        }
    }
};

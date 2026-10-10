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
            // Drop existing name column if it exists (it does in default)
            if (Schema::hasColumn('users', 'name')) {
                $table->dropColumn('name');
            }
            
            // Add new columns
            if (!Schema::hasColumn('users', 'uuid')) {
                $table->uuid('uuid')->after('id')->nullable();
            }
            if (!Schema::hasColumn('users', 'username')) {
                $table->string('username')->after('uuid')->nullable();
            }
            // email is already there
            // password is already there
            
            $table->string('previous_password1')->nullable();
            $table->string('previous_password2')->nullable();
            $table->string('previous_password3')->nullable();
            
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('phone')->nullable();
            
            $table->string('user_type')->default('company_user');
            $table->string('company_code')->nullable();
            $table->string('section_code')->nullable(); // Replaces branch_code/selection_code
            $table->foreignId('role_id')->nullable();
            
            $table->string('avatar_url')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_verified')->default(false);
            
            // email_verified_at is already there
            
            $table->timestamp('last_login_at')->nullable();
            $table->string('last_login_ip', 45)->nullable();
            $table->integer('failed_login_attempts')->default(0);
            $table->timestamp('locked_until')->nullable();
            
            $table->string('password_reset_token')->nullable();
            $table->timestamp('password_reset_expires')->nullable();
            
            // two_factor columns might be added by Fortify migration, but user asked for them.
            // Checking existing migrations: 2025_08_26_100418_add_two_factor_columns_to_users_table.php exists.
            // So I won't add them here to avoid duplication error.
            
            $table->json('preferences_json')->nullable();
            
            // remember_token is already there
            // timestamps are already there
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('name');
            $table->dropColumn([
                'uuid', 'username', 'previous_password1', 'previous_password2', 'previous_password3',
                'first_name', 'last_name', 'phone', 'user_type', 'company_code', 'section_code',
                'role_id', 'avatar_url', 'is_active', 'is_verified', 'last_login_at', 'last_login_ip',
                'failed_login_attempts', 'locked_until', 'password_reset_token', 'password_reset_expires',
                'preferences_json'
            ]);
        });
    }
};

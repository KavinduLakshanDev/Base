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
        Schema::table('shops', function (Blueprint $table) {
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('br_number')->nullable();
            $table->string('tin_number')->nullable();
            $table->string('address_line_1')->nullable();
            $table->string('address_line_2')->nullable();
            $table->string('locality')->nullable();
            $table->string('city')->nullable();
            $table->string('phone_2')->nullable();
            $table->string('email')->nullable();
            $table->decimal('current_balance', 15, 2)->default(0);
            $table->decimal('credit_limit', 15, 2)->default(0);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('shops', function (Blueprint $table) {
            $table->dropColumn([
                'first_name',
                'last_name',
                'br_number',
                'tin_number',
                'address_line_1',
                'address_line_2',
                'locality',
                'city',
                'phone_2',
                'email',
                'current_balance',
                'credit_limit'
            ]);
        });
    }
};

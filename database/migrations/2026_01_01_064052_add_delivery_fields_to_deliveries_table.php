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
        Schema::table('deliveries', function (Blueprint $table) {
            $table->date('delivery_date')->nullable()->after('customer_phone');
            $table->string('delivery_time')->nullable()->after('delivery_date');
            $table->enum('priority', ['low', 'normal', 'high', 'urgent'])->default('normal')->after('delivery_time');
            $table->text('notes')->nullable()->after('priority');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('deliveries', function (Blueprint $table) {
            $table->dropColumn(['delivery_date', 'delivery_time', 'priority', 'notes']);
        });
    }
};

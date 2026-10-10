<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('delivery_payments', function (Blueprint $table) {
            // Lifecycle status for cheque payments (cash/transfer default to 'cleared')
            $table->enum('status', ['pending', 'cleared', 'bounced'])
                  ->default('cleared')
                  ->after('method');

            // Bank service charge recorded when a cheque bounces
            $table->decimal('service_charge', 15, 4)->nullable()->after('status');

            // Points back to the original cheque payment when this row is
            // a bounce-reversal or service-charge record
            $table->foreignId('related_payment_id')
                  ->nullable()
                  ->constrained('delivery_payments')
                  ->nullOnDelete()
                  ->after('service_charge');

            $table->timestamp('bounced_at')->nullable()->after('related_payment_id');
        });

        // Cheques collected before this migration are assumed pending (unreconciled)
        \DB::table('delivery_payments')
            ->where('method', 'cheque')
            ->whereNull('status')
            ->update(['status' => 'pending']);
    }

    public function down(): void
    {
        Schema::table('delivery_payments', function (Blueprint $table) {
            $table->dropForeign(['related_payment_id']);
            $table->dropColumn(['status', 'service_charge', 'related_payment_id', 'bounced_at']);
        });
    }
};

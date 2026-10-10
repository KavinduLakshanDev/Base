<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admin_barcode_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('admin_barcode');
            $table->string('admin_barcode_token');
            $table->string('barcode_month');
            $table->string('company_code');
            $table->boolean('is_revoked')->default(false);
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'barcode_month']);
            $table->index('admin_barcode');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_barcode_history');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_job_statuses', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('service_job_id');
            $table->string('status');
            $table->text('notes')->nullable();
            $table->integer('changed_by')->nullable()->comment('User ID who changed status');
            $table->timestamps();
            
            $table->foreign('service_job_id')
                  ->references('id')
                  ->on('service_jobs')
                  ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_job_statuses');
    }
};
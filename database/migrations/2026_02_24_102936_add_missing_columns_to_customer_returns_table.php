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
        Schema::table('customer_returns', function (Blueprint $table) {
            // Ensure customer_id has the correct type if the table already exists.
            // This will only work if doctrine/dbal is installed; if not you'll
            // need to drop and recreate the table manually.
            if (Schema::hasColumn('customer_returns', 'customer_id')) {
                try {
                    $table->integer('customer_id')->unsigned()->nullable()->change();
                } catch (\Exception $e) {
                    // ignore if the change cannot be performed
                }
            }
            // Add missing columns if they don't exist
            if (!Schema::hasColumn('customer_returns', 'return_no')) {
                $table->string('return_no')->after('id');
            }
            if (!Schema::hasColumn('customer_returns', 'return_date')) {
                $table->date('return_date')->after('return_no');
            }
            if (!Schema::hasColumn('customer_returns', 'customer_code')) {
                $table->string('customer_code')->nullable()->after('customer_id');
            }
            if (!Schema::hasColumn('customer_returns', 'customer_name')) {
                $table->string('customer_name')->after('customer_code');
            }
            if (!Schema::hasColumn('customer_returns', 'sales_transaction_id')) {
                $table->unsignedBigInteger('sales_transaction_id')->nullable()->after('customer_name');
            }
            if (!Schema::hasColumn('customer_returns', 'original_invoice_no')) {
                $table->string('original_invoice_no')->nullable()->after('sales_transaction_id');
            }
            if (!Schema::hasColumn('customer_returns', 'section_code')) {
                $table->string('section_code', 10)->after('original_invoice_no');
            }
            if (!Schema::hasColumn('customer_returns', 'company_code')) {
                $table->string('company_code', 10)->after('section_code');
            }
            if (!Schema::hasColumn('customer_returns', 'return_type')) {
                $table->enum('return_type', ['item', 'printer', 'mixed'])->default('item')->after('company_code');
            }
            if (!Schema::hasColumn('customer_returns', 'total_return_amount')) {
                $table->decimal('total_return_amount', 15, 2)->default(0)->after('return_type');
            }
            if (!Schema::hasColumn('customer_returns', 'return_value')) {
                // the amount actually used for refund/exchange; usually equals total_return_amount
                $table->decimal('return_value', 15, 2)->default(0)->after('total_return_amount');
            }
            if (!Schema::hasColumn('customer_returns', 'refund_amount')) {
                $table->decimal('refund_amount', 15, 2)->default(0)->after('return_value');
            }
            if (!Schema::hasColumn('customer_returns', 'exchange_amount')) {
                $table->decimal('exchange_amount', 15, 2)->default(0)->after('refund_amount');
            }
            if (!Schema::hasColumn('customer_returns', 'refund_method')) {
                $table->enum('refund_method', ['cash', 'exchange', 'credit', 'partial'])->default('cash')->after('exchange_amount');
            }
            if (!Schema::hasColumn('customer_returns', 'refund_details')) {
                $table->json('refund_details')->nullable()->after('refund_method');
            }
            if (!Schema::hasColumn('customer_returns', 'status')) {
                $table->enum('status', ['pending', 'processed', 'completed', 'cancelled'])->default('pending')->after('refund_details');
            }
            if (!Schema::hasColumn('customer_returns', 'notes')) {
                $table->text('notes')->nullable()->after('status');
            }
            if (!Schema::hasColumn('customer_returns', 'reason')) {
                $table->text('reason')->nullable()->after('notes');
            }
            if (!Schema::hasColumn('customer_returns', 'processed_by')) {
                $table->unsignedBigInteger('processed_by')->nullable()->after('reason');
            }
            if (!Schema::hasColumn('customer_returns', 'processed_at')) {
                $table->timestamp('processed_at')->nullable()->after('processed_by');
            }
        });
        
        // Add unique index for return_no
        try {
            Schema::table('customer_returns', function (Blueprint $table) {
                $table->unique('return_no');
            });
        } catch (\Exception $e) {
            // Index already exists
        }
        
        // Add indexes
        try {
            Schema::table('customer_returns', function (Blueprint $table) {
                $table->index('return_date');
                $table->index('customer_id');
                $table->index('section_code');
                $table->index('company_code');
                $table->index('status');
            });
        } catch (\Exception $e) {
            // Indexes already exist
        }
        
        // Add foreign keys
        try {
            Schema::table('customer_returns', function (Blueprint $table) {
                $table->foreign('customer_id')->references('AdrKy')->on('address')->onDelete('set null');
                $table->foreign('sales_transaction_id')->references('id')->on('sales_transactions')->onDelete('set null');
                $table->foreign('processed_by')->references('id')->on('users')->onDelete('set null');
            });
        } catch (\Exception $e) {
            // Foreign keys already exist
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('customer_returns', function (Blueprint $table) {
            // Drop foreign keys first
            $table->dropForeign(['customer_id']);
            $table->dropForeign(['sales_transaction_id']);
            $table->dropForeign(['processed_by']);
            
            // Drop columns
            $table->dropColumn([
                'return_no',
                'return_date',
                'customer_code',
                'customer_name',
                'sales_transaction_id',
                'original_invoice_no',
                'section_code',
                'company_code',
                'return_type',
                'total_return_amount',
                'refund_amount',
                'exchange_amount',
                'refund_method',
                'refund_details',
                'status',
                'notes',
                'reason',
                'processed_by',
                'processed_at',
                'return_value',
            ]);
        });
    }
};

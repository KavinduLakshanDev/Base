<?php

use App\Http\Controllers\Admin\CodeMasterController;
use App\Http\Controllers\Admin\CustomerController as AdminCustomerController;
use App\Http\Controllers\Admin\SupplierPaymentController;
use App\Http\Controllers\POS\ProductController;
use App\Http\Controllers\POS\PurchaseController;
use App\Http\Controllers\SalesController;
use App\Http\Controllers\ServiceJobController;
use App\Http\Controllers\StockTransferController;
use App\Http\Controllers\Reports\StockInHandReportController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| VISMASS Business Unit Routes (VAT Operations)
|--------------------------------------------------------------------------
| Routes for VISMASS operations including:
| - Import/Buying/Selling
| - Services 
| - Main Stock Management
| - VAT-compliant operations
*/

Route::middleware(['auth:web,company', 'verified', 'business.unit:vismass'])->prefix('vismass')->name('vismass.')->group(function () {
    
    // Purchase Management (Import/Buying)
    Route::prefix('purchases')->name('purchases.')->group(function () {
        Route::get('/', [PurchaseController::class, 'index'])->name('index');
        Route::get('/create', [PurchaseController::class, 'create'])->name('create');
        Route::post('/', [PurchaseController::class, 'store'])->name('store');
        Route::get('/{purchase}', [PurchaseController::class, 'show'])->name('show');
        Route::get('/{purchase}/edit', [PurchaseController::class, 'edit'])->name('edit');
        Route::put('/{purchase}', [PurchaseController::class, 'update'])->name('update');
        Route::delete('/{purchase}', [PurchaseController::class, 'destroy'])->name('destroy');
        
        // Purchase-specific routes
        Route::get('/search/suppliers', [PurchaseController::class, 'searchSuppliers'])->name('search-suppliers');
        Route::get('/search/items', [PurchaseController::class, 'searchItems'])->name('search-items');
        Route::get('/{purchase}/receipt', [PurchaseController::class, 'generateReceipt'])->name('receipt');
    });

    // Sales Management (Selling)
    Route::prefix('sales')->name('sales.')->group(function () {
        Route::get('/', [SalesController::class, 'index'])->name('index');
        Route::get('/create', [SalesController::class, 'create'])->name('create');
        Route::post('/', [SalesController::class, 'store'])->name('store');
        Route::get('/{sale}', [SalesController::class, 'show'])->name('show');
        Route::get('/{sale}/edit', [SalesController::class, 'edit'])->name('edit');
        Route::put('/{sale}', [SalesController::class, 'update'])->name('update');
        Route::delete('/{sale}', [SalesController::class, 'destroy'])->name('destroy');
        
        // Sales-specific routes
        Route::get('/api/transactions', [SalesController::class, 'getTransactions'])->name('api.transactions');
        Route::get('/search/customers', [SalesController::class, 'searchCustomers'])->name('search-customers');
        Route::get('/search/items', [SalesController::class, 'searchItems'])->name('search-items');
        Route::get('/{sale}/receipt', [SalesController::class, 'generateReceipt'])->name('receipt');
        Route::post('/preview-receipt', [SalesController::class, 'previewReceipt'])->name('preview-receipt');
    });

    // Service Job Management
    Route::prefix('services')->name('services.')->group(function () {
        Route::get('/', [ServiceJobController::class, 'index'])->name('index');
        Route::get('/create', [ServiceJobController::class, 'create'])->name('create');
        Route::post('/', [ServiceJobController::class, 'store'])->name('store');
        Route::get('/{serviceJob}', [ServiceJobController::class, 'show'])->name('show');
        Route::get('/{serviceJob}/edit', [ServiceJobController::class, 'edit'])->name('edit');
        Route::put('/{serviceJob}', [ServiceJobController::class, 'update'])->name('update');
        Route::delete('/{serviceJob}', [ServiceJobController::class, 'destroy'])->name('destroy');
        
        // Service-specific routes
        Route::get('/history', [ServiceJobController::class, 'history'])->name('history');
        Route::get('/search/customers', [ServiceJobController::class, 'searchCustomers'])->name('search-customers');
        Route::get('/search/items', [ServiceJobController::class, 'searchItems'])->name('search-items');
        Route::get('/customer-details/{customer}', [ServiceJobController::class, 'getCustomerDetails'])->name('get-customer-details');
        Route::get('/get-customer-by-device', [ServiceJobController::class, 'getCustomerByDevice'])->name('get-customer-by-device');
    });

    // Stock Management (Main Stock)
    Route::prefix('stock')->name('stock.')->group(function () {
        Route::get('/', [StockInHandReportController::class, 'index'])->name('index');
        Route::get('/transfers', [StockTransferController::class, 'index'])->name('transfers.index');
        Route::get('/transfers/create', [StockTransferController::class, 'create'])->name('transfers.create');
        Route::post('/transfers', [StockTransferController::class, 'store'])->name('transfers.store');
        Route::get('/transfers/{transfer}', [StockTransferController::class, 'show'])->name('transfers.show');
        Route::delete('/transfers/{transfer}', [StockTransferController::class, 'destroy'])->name('transfers.destroy');
        
        // Stock-specific routes
        Route::get('/search', [StockInHandReportController::class, 'search'])->name('search');
        Route::get('/low-stock', [StockInHandReportController::class, 'lowStock'])->name('low-stock');
        Route::get('/export', [StockInHandReportController::class, 'export'])->name('export');
    });

    // Master Data Management (VAT-related)
    Route::prefix('admin')->name('admin.')->group(function () {
        // Categories and Items
        Route::resource('categories', CodeMasterController::class)->only(['index', 'create', 'store', 'edit', 'update', 'destroy']);
        Route::post('categories/{codeMaster}/toggle', [CodeMasterController::class, 'toggle'])->name('categories.toggle');
        
        // Products
        Route::post('products/add-to-sections', [ProductController::class, 'addToSections'])->name('products.add-to-sections');
        Route::post('products/{id}/toggle-business-unit', [ProductController::class, 'toggleBusinessUnit'])->name('products.toggle-business-unit');
        
        // Customers (VAT customers)
        Route::resource('customers', AdminCustomerController::class);
        Route::post('customers/{customer}/toggle', [AdminCustomerController::class, 'toggle'])->name('customers.toggle');
    });

    // VAT Management
    Route::prefix('vat')->name('vat.')->group(function () {
        Route::get('/rates', [\App\Http\Controllers\VatRateController::class, 'index'])->name('rates.index');
        Route::post('/rates', [\App\Http\Controllers\VatRateController::class, 'store'])->name('rates.store');
        Route::put('/rates/{vatRate}', [\App\Http\Controllers\VatRateController::class, 'update'])->name('rates.update');
        Route::delete('/rates/{vatRate}', [\App\Http\Controllers\VatRateController::class, 'destroy'])->name('rates.destroy');
    });

    // Reports (VISMASS-specific)
    Route::prefix('reports')->name('reports.')->group(function () {
        Route::get('/stock', [StockInHandReportController::class, 'index'])->name('stock');
        // Route::get('/sales', [\App\Http\Controllers\Reports\SalesReportController::class, 'index'])->name('sales');
        // Route::get('/purchases', [\App\Http\Controllers\Reports\PurchaseReportController::class, 'index'])->name('purchases');
        // Route::get('/services', [\App\Http\Controllers\Reports\ServiceReportController::class, 'index'])->name('services');
        // Route::get('/vat', [\App\Http\Controllers\Reports\VatReportController::class, 'index'])->name('vat');
    });
});
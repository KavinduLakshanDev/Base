<?php
use App\Http\Controllers\CompanyAuthController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DeliveryController;
use App\Http\Controllers\DeliveryRouteController;
use App\Http\Controllers\ImpersonationController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\UserRoleController;
use App\Http\Controllers\SectionController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\Api\CompanyController;
use App\Http\Controllers\Reports\StockInHandReportController;
use App\Http\Controllers\Reports\PrinterStockReportController;
use App\Http\Controllers\Reports\CollectionReportController;
use App\Http\Controllers\Reports\ItemListReportController;
use App\Http\Controllers\Reports\WastageReportController;
use App\Http\Controllers\Reports\SalesReportController;
use App\Http\Controllers\Reports\PurchaseOrderReportController;
use App\Http\Controllers\Reports\ServiceRevenueReportController;
use App\Http\Controllers\Reports\ServiceChargesReportController;
use App\Http\Controllers\Reports\CashReconciliationController;
use App\Http\Controllers\StockTransferController;
use App\Http\Controllers\StockConversionController;
use App\Http\Controllers\PrinterTransferController;
use App\Http\Controllers\StockAdjustmentController;
use App\Http\Controllers\StockTakingController;
use App\Http\Controllers\CustomerReturnController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;
use App\Http\Controllers\POS\ChequeReturnController;
use App\Http\Controllers\POS\PrinterController;
use App\Http\Controllers\ServiceJobController;
use App\Http\Controllers\SalesController;
use App\Http\Controllers\Admin\FinanceTransferController;
use App\Models\AccMas;

// Group for Service Jobs and related search routes
Route::middleware(['auth:web,company', 'check.day.opening.balance'])->group(function () {
    // Sales Routes
    Route::post('sales/verify-admin', [SalesController::class, 'verifyAdmin'])->name('sales.verify-admin');
    Route::post('sales/verify-admin-barcode', [SalesController::class, 'verifyAdminBarcode'])->name('sales.verify-admin-barcode');
    Route::get('sales/search/customers', [SalesController::class, 'searchCustomers'])->name('sales.search-customers');
    Route::get('sales/search/items', [SalesController::class, 'searchItems'])->name('sales.search-items');
    Route::get('sales/search/categories', [SalesController::class, 'getCategories'])->name('sales.search-categories');
    Route::get('sales/search/suppliers', [SalesController::class, 'getSuppliers'])->name('sales.search-suppliers');
    Route::get('sales/search/printers', [SalesController::class, 'searchPrinters'])->name('sales.search-printers');
    Route::get('sales/cash-balance', [SalesController::class, 'cashBalance'])->name('sales.cash-balance');
    Route::get('sales/next-invoice', [SalesController::class, 'getNextInvoiceNumber'])->name('sales.next-invoice');
    Route::get('sales/validate-cheque', [SalesController::class, 'validateCheque'])->name('sales.validate-cheque');
    Route::resource('sales', SalesController::class);
    Route::get('sales/{sale}/receipt', [SalesController::class, 'generateReceipt'])->name('sales.receipt');
    Route::get('sales/{sale}/invoice', [SalesController::class, 'generateInvoice'])->name('sales.invoice');
    Route::post('sales/preview-receipt', [SalesController::class, 'previewReceipt'])->name('sales.preview-receipt');

    // Customer Returns Routes
    Route::get('customer-returns/search-customers', [CustomerReturnController::class, 'searchCustomers'])->name('customer-returns.search-customers');
    Route::get('customer-returns/search-items', [CustomerReturnController::class, 'searchItems'])->name('customer-returns.search-items');
    Route::get('customer-returns/search-printers', [CustomerReturnController::class, 'searchPrinters'])->name('customer-returns.search-printers');
    Route::get('customer-returns/search-invoice', [CustomerReturnController::class, 'getSalesByInvoice'])->name('customer-returns.search-invoice');
    // Receipt route MUST come before resource() to avoid route parameter conflicts
    Route::get('customer-returns/{customerReturn}/receipt', [CustomerReturnController::class, 'generateReceipt'])->name('customer-returns.receipt');
    Route::resource('customer-returns', CustomerReturnController::class);

    // Service Jobs Specific Routes (MUST come before resource)
    Route::get('service-jobs/history', [ServiceJobController::class, 'history'])->name('service-jobs.history');
    Route::get('service-jobs/search/customers', [ServiceJobController::class, 'searchCustomers'])
        ->name('service-jobs.search-customers');
    
    Route::get('service-jobs/search/items', [ServiceJobController::class, 'searchItems'])
        ->name('service-jobs.search-items');
    
    // Debug endpoint to check stock in service section
    Route::get('service-jobs/debug/stock-check', [ServiceJobController::class, 'debugStockCheck'])
        ->name('service-jobs.debug-stock-check');
    
    Route::get('service-jobs/customer-details/{customer}', [ServiceJobController::class, 'getCustomerDetails'])
        ->name('service-jobs.get-customer-details');
    
    Route::get('service-jobs/get-customer-by-device', [ServiceJobController::class, 'getCustomerByDevice'])
        ->name('service-jobs.get-customer-by-device');

    // Main Resource Route
    Route::resource('service-jobs', ServiceJobController::class);
    
    // Additional Member Routes
    Route::post('service-jobs/{service_job}/add-item', [ServiceJobController::class, 'addItem'])
        ->name('service-jobs.add-item');
    
    Route::delete('service-jobs/{service_job}/items/{item}', [ServiceJobController::class, 'removeItem'])
        ->name('service-jobs.remove-item');
    
    Route::post('service-jobs/{service_job}/update-status', [ServiceJobController::class, 'updateStatus'])
        ->name('service-jobs.update-status');

    Route::post('service-jobs/{service_job}/upload-photos', [ServiceJobController::class, 'uploadPhotos'])
        ->name('service-jobs.upload-photos');

    Route::delete('service-jobs/{service_job}/delete-photo/{photo}', [ServiceJobController::class, 'deletePhoto'])
        ->name('service-jobs.delete-photo');

    Route::post('service-jobs/{service_job}/send-message', [ServiceJobController::class, 'sendMessage'])
        ->name('service-jobs.send-message');

    Route::get('service-jobs/{service_job}/invoice', [ServiceJobController::class, 'generateInvoice'])
        ->name('service-jobs.invoice');
    
    Route::get('service-jobs/{service_job}/receipt', [ServiceJobController::class, 'generateReceipt'])
        ->name('service-jobs.receipt');
        
    Route::get('service-jobs/{service_job}/parts-receipt', [ServiceJobController::class, 'generatePartsReceipt'])
        ->name('service-jobs.parts-receipt');
    
    // Quotation Routes
    Route::get('quotations', [ServiceJobController::class, 'quotationsIndex'])
        ->name('quotations.index');
    
    Route::get('quotations/{quotation}', [ServiceJobController::class, 'viewQuotation'])
        ->name('quotations.show');
    
    Route::get('service-jobs/{service_job}/quotations/create', [ServiceJobController::class, 'createQuotationPage'])
        ->name('quotations.create');
    
    Route::post('quotations', [ServiceJobController::class, 'createQuotation'])
        ->name('quotations.store');
    
    Route::get('quotations/{quotation}/edit', [ServiceJobController::class, 'editQuotation'])
        ->name('quotations.edit');
    
    Route::put('quotations/{quotation}', [ServiceJobController::class, 'updateQuotation'])
        ->name('quotations.update');

    Route::get('quotations/{quotation}/print', [ServiceJobController::class, 'printQuotation'])
        ->name('quotations.print');

    Route::delete('quotations/{quotation}', [ServiceJobController::class, 'deleteQuotation'])
        ->name('quotations.destroy');

    Route::prefix('api')->group(function () {
        Route::get('device-serial-numbers', [ServiceJobController::class, 'getDeviceSerialNumbers']);
        Route::get('device-details', [ServiceJobController::class, 'getDeviceDetails']);
        Route::get('printer-brands', [ServiceJobController::class, 'getPrinterBrands']);
        Route::get('printer-models', [ServiceJobController::class, 'getPrinterModels']);
        Route::post('printer-models', [ServiceJobController::class, 'createPrinterModel']);
    });
    
    // Customer routes (often needed in the same context)
    Route::post('customers', [CustomerController::class, 'store'])
        ->name('customers.store');

    // Privilege System Routes (Moved from api.php to use web session)
    Route::prefix('api')->group(function () {
        Route::post('privilege-users/search', [\App\Http\Controllers\Api\PrivilegeUserController::class, 'search']);
        Route::post('privilege-points/generate', [\App\Http\Controllers\TempPrivilegePointController::class, 'store']);
        Route::post('privilege-points/redeem', [\App\Http\Controllers\TempPrivilegePointController::class, 'redeemPoints']);
        Route::post('privilege-points/redeem-permanent', [\App\Http\Controllers\TempPrivilegePointController::class, 'redeemPointsToPermanent']);
        Route::post('privilege-points/transfer', [\App\Http\Controllers\TempPrivilegePointController::class, 'transferToPermanentPoints']);
        Route::get('privilege-points/transaction-number', [\App\Http\Controllers\TempPrivilegePointController::class, 'generateTransactionNumber']);

    });
});
Route::get('/', function () {
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

Route::middleware(['auth:web,company', 'check.day.opening.balance'])->group(function () {
    Route::get('dashboard', [\App\Http\Controllers\DashboardController::class, 'index'])->name('dashboard');
    Route::get('dashboard/sales-rep', [\App\Http\Controllers\DashboardController::class, 'salesRep'])->name('dashboard.sales-rep');
});

// Super-admin company picker
Route::middleware(['auth:web'])->group(function () {
    Route::get('superadmin/choose-company', [\App\Http\Controllers\SuperAdminController::class, 'chooseCompany'])->name('superadmin.choose-company');
    Route::post('superadmin/choose-company', [\App\Http\Controllers\SuperAdminController::class, 'storeCompany'])->name('superadmin.store-company');
    Route::post('superadmin/clear-company', [\App\Http\Controllers\SuperAdminController::class, 'clearCompany'])->name('superadmin.clear-company');
    Route::post('superadmin/toggle-company', [\App\Http\Controllers\SuperAdminController::class, 'toggleCompanyStatus'])->name('superadmin.toggle-company');
});


Route::middleware('guest:company')->group(function () {
    Route::get('company/login', [CompanyAuthController::class, 'create'])->name('company.login');
    Route::post('company/login', [CompanyAuthController::class, 'store']);
});

Route::middleware([])->group(function () {
    Route::get('company/dashboard', [\App\Http\Controllers\CompanyDashboardController::class, 'index'])->name('company.dashboard');

    Route::resource('sections', SectionController::class);
    
    // Stock Adjustment Routes
    Route::post('stock-adjustments/{stock_adjustment}/status', [StockAdjustmentController::class, 'updateStatus'])->name('stock-adjustments.update-status');
    Route::post('stock-adjustments/{stock_adjustment}/approve', [StockAdjustmentController::class, 'approve'])->name('stock-adjustments.approve');
    Route::post('stock-adjustments/{stock_adjustment}/reject', [StockAdjustmentController::class, 'reject'])->name('stock-adjustments.reject');
    Route::get('stock-adjustments/notifications', [StockAdjustmentController::class, 'getNotifications'])->name('stock-adjustments.notifications');
    Route::post('stock-adjustments/notifications/read', [StockAdjustmentController::class, 'markNotificationRead'])->name('stock-adjustments.notifications.read');
    Route::get('stock-adjustments/product-details', [StockAdjustmentController::class, 'getProductDetails'])->name('stock-adjustments.product-details');
    Route::get('stock-adjustments/next-batch', [StockAdjustmentController::class, 'getNextBatchNumber'])->name('stock-adjustments.next-batch');
    Route::get('stock-adjustments/taking-items', [StockAdjustmentController::class, 'getTakingItems'])->name('stock-adjustments.taking-items');
    Route::resource('stock-adjustments', StockAdjustmentController::class);

    // Stock Taking routes
    Route::get('stock-takings/stock', [StockTakingController::class, 'getStock'])->name('stock-takings.stock');
    Route::get('stock-takings/{stockTaking}/print', [StockTakingController::class, 'printPdf'])->name('stock-takings.print');
    Route::get('stock-takings/{stockTaking}/download', [StockTakingController::class, 'download'])->name('stock-takings.download');
    Route::get('stock-takings/{stockTaking}/download-csv', [StockTakingController::class, 'downloadCsv'])->name('stock-takings.download-csv');
    Route::resource('stock-takings', StockTakingController::class)->except(['edit', 'update', 'destroy']);

    Route::post('company/logout', [CompanyAuthController::class, 'destroy'])->name('company.logout');
});

Route::middleware(['auth:web,company', 'check.day.opening.balance'])->group(function () {
    Route::get('company/profile', [\App\Http\Controllers\CompanyProfileController::class, 'show'])->name('company.profile');
    Route::put('company/profile', [\App\Http\Controllers\CompanyProfileController::class, 'update'])->name('company.profile.update');

    Route::get('company/vat-rates', [\App\Http\Controllers\VatRateController::class, 'index'])->name('company.vat-rates.index');
    Route::post('company/vat-rates', [\App\Http\Controllers\VatRateController::class, 'store'])->name('company.vat-rates.store');
    // Route::get('company/vat-rates/{vat_rate}', [\App\Http\Controllers\VatRateController::class, 'show'])->name('company.vat-rates.show');
    Route::put('company/vat-rates/{vatRate}', [\App\Http\Controllers\VatRateController::class, 'update'])->name('company.vat-rates.update');
    Route::delete('company/vat-rates/{vatRate}', [\App\Http\Controllers\VatRateController::class, 'destroy'])->name('company.vat-rates.destroy');

    Route::get('api/company-data', function() {
        $user = auth()->user();
        if ($user && $user->company_code) {
            return \App\Models\Company::where('company_code', $user->company_code)->first() ?? \App\Models\Company::first();
        }
        return \App\Models\Company::first();
    });

    Route::get('api/points-rule', [\App\Http\Controllers\Api\PointsRuleController::class, 'getCurrentUserPointsRule']);

    Route::get('/user-management', function () {
        return Inertia::render('user-management');
    })->name('user-management');

    // Admin routes
    Route::prefix('admin')->name('admin.')->group(function () {
        Route::resource('controller-master', \App\Http\Controllers\Admin\ControllerMasterController::class);
        Route::post('controller-master/{controlMaster}/toggle', [\App\Http\Controllers\Admin\ControllerMasterController::class, 'toggle'])->name('controller-master.toggle');
        
        Route::resource('code-master', \App\Http\Controllers\Admin\CodeMasterController::class);
        Route::post('code-master/{codeMaster}/toggle', [\App\Http\Controllers\Admin\CodeMasterController::class, 'toggle'])->name('code-master.toggle');

        // Finance Transactions (handles deposits, withdrawals, transfers)
        Route::get('finance-transfers/export', [FinanceTransferController::class, 'exportCsv'])->name('finance-transfers.export');
        Route::get('finance-transfers', [FinanceTransferController::class, 'index'])->name('finance-transfers.index');
        Route::get('finance-transfers/create', [FinanceTransferController::class, 'create'])->name('finance-transfers.create');
        Route::post('finance-transfers', [FinanceTransferController::class, 'store'])->name('finance-transfers.store');
        Route::get('finance-transfers/{id}', [FinanceTransferController::class, 'show'])->name('finance-transfers.show');
        Route::get('finance-transfers/{id}/receipt', [FinanceTransferController::class, 'generateReceipt'])->name('finance-transfers.receipt');

        // Customer Routes
        Route::get('customers/export', [\App\Http\Controllers\Admin\CustomerController::class, 'export'])->name('customers.export');
        Route::resource('customers', \App\Http\Controllers\Admin\CustomerController::class);
        Route::post('customers/{customer}/toggle', [\App\Http\Controllers\Admin\CustomerController::class, 'toggle'])->name('customers.toggle');

        // Customer Payment Routes
        Route::get('customer-payments', [\App\Http\Controllers\Admin\CustomerController::class, 'paymentsIndex'])->name('customer-payments.index');
        Route::post('customer-payments', [\App\Http\Controllers\Admin\CustomerController::class, 'storePayment'])->name('customer-payments.store');
        Route::get('customer-payments/search-customers', [\App\Http\Controllers\Admin\CustomerController::class, 'searchCustomers'])->name('customer-payments.search-customers');
        Route::get('customer-payments/{customer}/outstanding', [\App\Http\Controllers\Admin\CustomerController::class, 'getOutstandingBalance'])->name('customer-payments.outstanding');



        // Privilege User Routes
        Route::resource('privilege-users', \App\Http\Controllers\Admin\PrivilegeUserController::class);
        Route::post('privilege-users/{privilegeUser}/toggle', [\App\Http\Controllers\Admin\PrivilegeUserController::class, 'toggle'])->name('privilege-users.toggle');
        Route::get('privilege-users/search/sections', [\App\Http\Controllers\Admin\PrivilegeUserController::class, 'search'])->name('privilege-users.search');
        Route::post('privilege-users/send-otp', [\App\Http\Controllers\Admin\PrivilegeUserController::class, 'sendOtp'])->name('privilege-users.send-otp');
        Route::post('privilege-users/verify-otp', [\App\Http\Controllers\Admin\PrivilegeUserController::class, 'verifyOtp'])->name('privilege-users.verify-otp');

        // Customer Payment Routes
        Route::get('customer-payments/pending-service-jobs', [\App\Http\Controllers\Admin\CustomerPaymentController::class, 'getPendingServiceJobs'])->name('customer-payments.pending-service-jobs');
        Route::get('customer-payments/pending-invoices', [\App\Http\Controllers\Admin\CustomerPaymentController::class, 'getPendingInvoices'])->name('customer-payments.pending-invoices');
        Route::get('customer-payments/payment-history', [\App\Http\Controllers\Admin\CustomerPaymentController::class, 'getPaymentHistory'])->name('customer-payments.payment-history');
        Route::get('customer-payments/export', [\App\Http\Controllers\Admin\CustomerPaymentController::class, 'export'])->name('customer-payments.export');
        Route::get('customer-payments/{customerPayment}/receipt', [\App\Http\Controllers\Admin\CustomerPaymentController::class, 'generateReceipt'])->name('customer-payments.receipt');
        Route::resource('customer-payments', \App\Http\Controllers\Admin\CustomerPaymentController::class)->except(['store']);

        // Supplier Payment Routes
        Route::get('supplier-payments/search-suppliers', [\App\Http\Controllers\Admin\SupplierPaymentController::class, 'searchSuppliers'])->name('supplier-payments.search-suppliers');
        Route::get('supplier-payments/pending-invoices', [\App\Http\Controllers\Admin\SupplierPaymentController::class, 'getPendingInvoices'])->name('supplier-payments.pending-invoices');
        Route::get('supplier-details', [\App\Http\Controllers\Admin\SupplierPaymentController::class, 'getSupplierDetails'])->name('supplier-details');
        Route::get('supplier-payments/{supplierPayment}/receipt', [\App\Http\Controllers\Admin\SupplierPaymentController::class, 'generateReceipt'])->name('supplier-payments.receipt');
        Route::resource('supplier-payments', \App\Http\Controllers\Admin\SupplierPaymentController::class)->except(['update']);

        // Petty cash category routes (company petty cash category definitions)
        Route::patch('petty-cash-categories/{petty_cash_category}/toggle-status', [\App\Http\Controllers\Admin\PettyCashCategoryController::class, 'toggleStatus'])
            ->name('petty-cash-categories.toggle-status');
        Route::resource('petty-cash-categories', \App\Http\Controllers\Admin\PettyCashCategoryController::class)->only(['index','create','store','edit','update','destroy']);

        // Petty cash transactions (daily petty cash entries)
        Route::resource('petty-cash-transactions', \App\Http\Controllers\Admin\PettyCashTransactionController::class)->only(['index','store','destroy']);

        // Delivery petty cash category routes
        Route::patch('delivery-petty-cash-categories/{delivery_petty_cash_category}/toggle-status', [\App\Http\Controllers\Admin\DeliveryPettyCashCategoryController::class, 'toggleStatus'])
            ->name('delivery-petty-cash-categories.toggle-status');
        Route::resource('delivery-petty-cash-categories', \App\Http\Controllers\Admin\DeliveryPettyCashCategoryController::class)->only(['index','create','store','edit','update','destroy']);

        // Delivery petty cash transactions
        Route::resource('delivery-petty-cash-transactions', \App\Http\Controllers\Admin\DeliveryPettyCashTransactionController::class)->only(['index','store','destroy']);

        // Bank Account Routes
        Route::get('bank-accounts/{bankAccount}/export-csv', [\App\Http\Controllers\Admin\BankAccountController::class, 'exportCsv'])->name('bank-accounts.export-csv');
        Route::get('bank-accounts/{bankAccount}/download-pdf', [\App\Http\Controllers\Admin\BankAccountController::class, 'downloadPdf'])->name('bank-accounts.download-pdf');
        Route::patch('bank-accounts/{bankAccount}/toggle-status', [\App\Http\Controllers\Admin\BankAccountController::class, 'toggleStatus'])
            ->name('bank-accounts.toggle-status');

        Route::resource('bank-accounts', \App\Http\Controllers\Admin\BankAccountController::class);

        // Finance Account Routes
        Route::patch('finance-accounts/{financeAccount}/toggle-status', [\App\Http\Controllers\Admin\FinanceAccountController::class, 'toggleStatus'])
            ->name('finance-accounts.toggle-status');
        Route::get('finance-accounts/{financeAccount}/export-csv', [\App\Http\Controllers\Admin\FinanceAccountController::class, 'exportCsv'])
            ->name('finance-accounts.export-csv');
        Route::get('finance-accounts/{financeAccount}/download-pdf', [\App\Http\Controllers\Admin\FinanceAccountController::class, 'downloadPdf'])
            ->name('finance-accounts.download-pdf');
        Route::resource('finance-accounts', \App\Http\Controllers\Admin\FinanceAccountController::class);

        // Route::patch('expense-accounts/{expenseAccount}/toggle-status', [\App\Http\Controllers\Admin\ExpenseAccountController::class, 'toggleStatus'])
        //     ->name('expense-accounts.toggle-status');
        // Route::resource('expense-accounts', \App\Http\Controllers\Admin\ExpenseAccountController::class);

        // Day Opening Balance Routes
        Route::resource('day-opening-balances', \App\Http\Controllers\Admin\DayOpeningBalanceController::class);
    });


// Redirect shortcuts so users typing the non-admin path don’t hit a 404
Route::redirect('petty-cash-categories', 'admin/petty-cash-categories');
Route::redirect('petty-cash-transactions', 'admin/petty-cash-transactions');
Route::redirect('delivery-petty-cash-categories', 'admin/delivery-petty-cash-categories');
Route::redirect('delivery-petty-cash-transactions', 'admin/delivery-petty-cash-transactions');

    // Role and Permission Routes
    Route::resource('roles', \App\Http\Controllers\RoleController::class);
    Route::resource('permissions', \App\Http\Controllers\PermissionController::class);

    // API routes for user management
    Route::prefix('api')->group(function () {
        Route::apiResource('users', UserController::class);
        Route::post('users/{user}/regenerate-barcode', [UserController::class, 'regenerateBarcode']);
        Route::post('users/{user}/save-barcode', [UserController::class, 'saveBarcode']);
        Route::get('users/{user}/barcode-history', [UserController::class, 'barcodeHistory']);
        Route::get('user-roles', [UserRoleController::class, 'index']);
        Route::get('sections', [SectionController::class, 'apiIndex']);
        Route::get('companies', [CompanyController::class, 'index']);
    });

    // Impersonation routes
    Route::post('impersonate/leave', [ImpersonationController::class, 'leave'])->name('impersonate.leave');
    Route::post('impersonate/{user}', [ImpersonationController::class, 'impersonate'])->name('impersonate.start');

    // POS routes
    Route::middleware(['auth:web,company'])->prefix('pos')->name('pos.')->group(function () {
        // API Routes - Map to ProductController for simple array response
        Route::get('api/categories', [\App\Http\Controllers\POS\ProductController::class, 'getCategories'])->name('api.categories');
        Route::get('api/units', [\App\Http\Controllers\POS\ProductController::class, 'getUnits'])->name('api.units');
        Route::get('api/price-history/{itemKey}', [\App\Http\Controllers\POS\ProductController::class, 'getPriceHistory'])->name('api.price-history');

        Route::resource('categories', \App\Http\Controllers\POS\CategoryController::class);
        Route::post('categories/{category}/toggle', [\App\Http\Controllers\POS\CategoryController::class, 'toggle'])->name('categories.toggle');
        Route::get('categories-api', [\App\Http\Controllers\POS\CategoryController::class, 'getCategories'])->name('categories.api');
        
        Route::resource('brands', \App\Http\Controllers\POS\BrandController::class);
        Route::post('brands/{brand}/toggle', [\App\Http\Controllers\POS\BrandController::class, 'toggle'])->name('brands.toggle');
        Route::get('brands-api', [\App\Http\Controllers\POS\BrandController::class, 'getBrands'])->name('brands.api');
        
        Route::resource('models', \App\Http\Controllers\POS\ModelController::class);
        Route::post('models/{model}/toggle', [\App\Http\Controllers\POS\ModelController::class, 'toggle'])->name('models.toggle');
        Route::get('models-api', [\App\Http\Controllers\POS\ModelController::class, 'getModels'])->name('models.api');
        
        Route::resource('units', \App\Http\Controllers\POS\UnitController::class);
        Route::post('units/{unit}/toggle', [\App\Http\Controllers\POS\UnitController::class, 'toggle'])->name('units.toggle');

        // Product specific routes - MUST be before resource route to avoid conflicts
        Route::post('products/{product}/toggle', [\App\Http\Controllers\POS\ProductController::class, 'toggle'])->name('products.toggle');
        Route::post('products/{id}/toggle-business-unit', [\App\Http\Controllers\POS\ProductController::class, 'toggleBusinessUnit'])->name('products.toggle-business-unit');
        Route::post('products/quick-create', [\App\Http\Controllers\POS\ProductController::class, 'quickCreate'])->name('products.quick-create');
        Route::get('products/search', [\App\Http\Controllers\POS\ProductController::class, 'search'])->name('products.search');
        Route::get('products/get-item-details/{itemCode}', [\App\Http\Controllers\POS\ProductController::class, 'getItemDetails'])->name('products.get-item-details');
        Route::get('products/get-item-codes-with-category', [\App\Http\Controllers\POS\ProductController::class, 'getItemCodesWithCategory'])->name('products.get-item-codes-with-category');
        Route::get('products/get-suppliers', [\App\Http\Controllers\POS\ProductController::class, 'getSuppliers'])->name('products.get-suppliers');
        Route::get('products/get-categories', [\App\Http\Controllers\POS\ProductController::class, 'getCategories'])->name('products.get-categories');
        Route::get('products/get-units', [\App\Http\Controllers\POS\ProductController::class, 'getUnits'])->name('products.get-units');
        Route::get('products/get-items-for-selection', [\App\Http\Controllers\POS\ProductController::class, 'getItemsForSelection'])->name('products.get-items-for-selection');
        Route::get('products/get-price-history/{itemKey}', [\App\Http\Controllers\POS\ProductController::class, 'getPriceHistory'])->name('products.get-price-history');
        Route::get('products/get-items-for-list', [\App\Http\Controllers\POS\ProductController::class, 'getItemsForList'])->name('products.get-items-for-list');
        Route::get('products/get-item-with-discounts', [\App\Http\Controllers\POS\ProductController::class, 'getItemWithDiscounts'])->name('products.get-item-with-discounts');
        Route::get('products/get-batches', [\App\Http\Controllers\POS\ProductController::class, 'getBatches'])->name('products.get-batches');
        Route::get('products/get-prices-for-batch', [\App\Http\Controllers\POS\ProductController::class, 'getPricesForBatch'])->name('products.get-prices-for-batch');
        Route::delete('products/delete-price-history/{priceHistoryId}', [\App\Http\Controllers\POS\ProductController::class, 'deletePriceHistory'])->name('products.delete-price-history');
        
        // Item Search routes
        Route::get('items/search-by-code', [\App\Http\Controllers\POS\ItemSearchController::class, 'searchByItemCode'])->name('items.search-by-code');
        Route::get('items/search-by-name', [\App\Http\Controllers\POS\ItemSearchController::class, 'searchByItemName'])->name('items.search-by-name');
        Route::get('items/get-by-code', [\App\Http\Controllers\POS\ItemSearchController::class, 'getItemByCode'])->name('items.get-by-code');
        Route::get('items/get-prices', [\App\Http\Controllers\POS\ItemSearchController::class, 'getItemPrices'])->name('items.get-prices');
        Route::get('items/get-prices-for-modal', [\App\Http\Controllers\POS\ItemSearchController::class, 'getItemPricesForModal'])->name('items.get-prices-for-modal');
        Route::get('items/get-cc-price', [\App\Http\Controllers\POS\ItemSearchController::class, 'getCCPrice'])->name('items.get-cc-price');
        
        // Resource route MUST be last
        Route::resource('products', \App\Http\Controllers\POS\ProductController::class);

        // Printer registration routes
        Route::resource('printers', PrinterController::class, ['only' => ['index', 'create', 'store', 'show', 'edit', 'update']]);
        Route::post('printers/{id}/toggle', [PrinterController::class, 'toggle'])->name('printers.toggle');
        Route::get('printers/api/models-by-brand/{brandId}', [PrinterController::class, 'getModelsByBrand'])->name('printers.api.models-by-brand');

        // Purchase routes - API routes MUST come before resource routes
        Route::get('api/purchases/products-by-branch', [\App\Http\Controllers\POS\PurchaseController::class, 'getProductsByBranch'])->name('api.purchases.products-by-branch');
        Route::get('api/purchases/search-barcode', [\App\Http\Controllers\POS\PurchaseController::class, 'searchByBarcode'])->name('api.purchases.search-barcode');
        Route::post('api/purchases/check-serial-number', [\App\Http\Controllers\POS\PurchaseController::class, 'checkSerialNumber'])->name('api.purchases.check-serial-number');
        Route::get('purchases/{purchase}/download-pdf', [\App\Http\Controllers\POS\PurchaseController::class, 'downloadPdf'])->name('purchases.download-pdf');
        Route::get('purchases/{purchase}/print-barcodes', [\App\Http\Controllers\POS\PurchaseController::class, 'printBarcodes'])->name('purchases.print-barcodes');
        Route::get('printing-section-products', [\App\Http\Controllers\POS\PurchaseController::class, 'printingSectionProducts'])->name('printing-section-products');
        Route::resource('purchases', \App\Http\Controllers\POS\PurchaseController::class);
        Route::get('purchase-orders/{purchaseOrder}/download-pdf', [\App\Http\Controllers\POS\PurchaseOrderController::class, 'downloadPdf'])->name('purchase-orders.download-pdf');
        Route::resource('purchase-orders', \App\Http\Controllers\POS\PurchaseOrderController::class);

        // Cheque Return Routes
        Route::prefix('cheque-return')->name('cheque-return.')->group(function () {
            Route::get('/', [ChequeReturnController::class, 'index'])->name('index');
            Route::get('/create', [ChequeReturnController::class, 'create'])->name('create');
            Route::post('/search', [ChequeReturnController::class, 'searchCheque'])->name('search');
            Route::post('/process', [ChequeReturnController::class, 'returnCheque'])->name('process');
        });

        // Cheque Deposit Routes
        Route::prefix('cheque-deposit')->name('cheque-deposit.')->group(function () {
            Route::get('/', [\App\Http\Controllers\POS\ChequeDepositController::class, 'index'])->name('index');
            Route::get('/create', [\App\Http\Controllers\POS\ChequeDepositController::class, 'create'])->name('create');
            Route::get('/pending', [\App\Http\Controllers\POS\ChequeDepositController::class, 'getPendingCheques'])->name('pending');
            Route::post('/process', [\App\Http\Controllers\POS\ChequeDepositController::class, 'deposit'])->name('process');
        });

        // Cheque Ledger Routes
        Route::get('cheque-ledger', [\App\Http\Controllers\POS\ChequeLedgerController::class, 'index'])->name('cheque-ledger.index');
        Route::get('cheque-ledger/export-csv', [\App\Http\Controllers\POS\ChequeLedgerController::class, 'exportCsv'])->name('cheque-ledger.export-csv');
        Route::get('cheque-ledger/download-pdf', [\App\Http\Controllers\POS\ChequeLedgerController::class, 'exportPdf'])->name('cheque-ledger.download-pdf');

        // API endpoint used by product detail page to fetch branch-specific reorder levels
        Route::get('api/reorder-level/{itemCode}', [\App\Http\Controllers\ReorderLevelController::class, 'getForItem'])
            ->name('api.reorder-level.get');

        // logs for a particular reorder level
        Route::get('reorder-levels/{reorderLevel}/logs', [\App\Http\Controllers\ReorderLevelController::class, 'logs'])
            ->name('reorder-levels.logs');

        // Reorder Levels Routes
        Route::resource('reorder-levels', \App\Http\Controllers\ReorderLevelController::class);
    });

    // Delivery routes
    Route::prefix('deliveries')->name('delivery.')->group(function () {
        Route::get('/', [DeliveryController::class, 'index'])->name('index');
        Route::get('/create', [DeliveryController::class, 'create'])->name('create');
        Route::post('/', [DeliveryController::class, 'store'])->name('store');
        Route::get('/product-batches', [DeliveryController::class, 'getProductBatches'])->name('product-batches');
        Route::get('/unified-search', [DeliveryController::class, 'unifiedSearch'])->name('unified-search');
        Route::get('/vehicle-availability', [DeliveryController::class, 'checkVehicleAvailability'])->name('vehicle-availability');
        
        Route::prefix('routes')->name('routes.')->group(function () {
            Route::get('/', [DeliveryRouteController::class, 'index'])->name('index');
            Route::get('/create', [DeliveryRouteController::class, 'create'])->name('create');
            Route::post('/', [DeliveryRouteController::class, 'store'])->name('store');
            Route::get('/{route}', [DeliveryRouteController::class, 'show'])->name('show');
            Route::get('/{route}/edit', [DeliveryRouteController::class, 'edit'])->name('edit');
            Route::put('/{route}', [DeliveryRouteController::class, 'update'])->name('update');
            Route::patch('/{route}/status', [DeliveryRouteController::class, 'updateStatus'])->name('update-status');
            Route::delete('/{route}', [DeliveryRouteController::class, 'destroy'])->name('destroy');

            // Route <-> Shop assignment
            Route::post('/{route}/shops', [\App\Http\Controllers\RouteShopController::class, 'attach'])->name('shops.attach');
            Route::delete('/{route}/shops/{shop}', [\App\Http\Controllers\RouteShopController::class, 'detach'])->name('shops.detach');
        });
        
        Route::get('/{delivery}/receipt', [DeliveryController::class, 'generateReceipt'])->name('receipt');
        Route::post('/{delivery}/payments', [\App\Http\Controllers\DeliveryPaymentController::class, 'store'])->name('payments.store');
        Route::delete('/{delivery}/payments/{payment}', [\App\Http\Controllers\DeliveryPaymentController::class, 'destroy'])->name('payments.destroy');
        Route::get('/{delivery}/payments/{payment}/receipt', [\App\Http\Controllers\DeliveryPaymentController::class, 'receipt'])->name('payments.receipt');
        Route::patch('/{delivery}/payments/{payment}/clear', [\App\Http\Controllers\DeliveryPaymentController::class, 'clear'])->name('payments.clear');
        Route::post('/{delivery}/payments/{payment}/bounce', [\App\Http\Controllers\DeliveryPaymentController::class, 'bounce'])->name('payments.bounce');

        // Van / per-customer report (shop-wise consolidated deliveries + items + payments)
        Route::get('/van-report', [\App\Http\Controllers\DeliveryReportController::class, 'index'])->name('van-report.index');

        // Vehicles, vehicle stock, shops and returns
        Route::resource('vehicles', \App\Http\Controllers\VehicleController::class)->only(['index','create','store','edit','update','destroy']);
        Route::patch('vehicles/{vehicle}/status', [\App\Http\Controllers\VehicleController::class, 'updateStatus'])->name('vehicles.update-status');
        Route::get('vehicles/{vehicle}/stock', [\App\Http\Controllers\VehicleStockController::class, 'index'])->name('vehicles.stock.index');
        Route::post('vehicles/{vehicle}/load', [\App\Http\Controllers\VehicleStockController::class, 'load'])->name('vehicles.stock.load');
        Route::post('vehicles/{vehicle}/unload', [\App\Http\Controllers\VehicleStockController::class, 'unload'])->name('vehicles.stock.unload');
        Route::get('vehicles/{vehicle}/stock/{item_ky}/{batch_no}/history', [\App\Http\Controllers\VehicleStockController::class, 'history'])->name('vehicles.stock.history');

        Route::resource('shops', \App\Http\Controllers\ShopController::class)->only(['index','create','store','show','edit','update','destroy']);
        Route::patch('shops/{shop}/status', [\App\Http\Controllers\ShopController::class, 'updateStatus'])->name('shops.update-status');

        // Route <-> Shop assign/detach handled under routes.* (see routes.group above)

        // Shop returns (sales-rep / admin)
        Route::get('returns', [\App\Http\Controllers\ShopReturnController::class, 'index'])->name('returns.index');
        Route::get('returns/shop-deliveries', [\App\Http\Controllers\ShopReturnController::class, 'shopDeliveries'])->name('returns.shop-deliveries');
        Route::get('returns/delivery-items', [\App\Http\Controllers\ShopReturnController::class, 'deliveryItems'])->name('returns.delivery-items');
        Route::get('returns/create', [\App\Http\Controllers\ShopReturnController::class, 'create'])->name('returns.create');
        Route::post('returns', [\App\Http\Controllers\ShopReturnController::class, 'store'])->name('returns.store');
        Route::get('returns/{shopReturn}/pdf', [\App\Http\Controllers\ShopReturnController::class, 'downloadPdf'])->name('returns.pdf');
        Route::get('returns/{shopReturn}', [\App\Http\Controllers\ShopReturnController::class, 'show'])->name('returns.show');

        // Delivery Sales (Direct Sales from Vehicles)
        Route::prefix('delivery-sales')->name('delivery-sales.')->group(function () {
            Route::get('/', [\App\Http\Controllers\DeliverySaleController::class, 'index'])->name('index');
            Route::get('/create', [\App\Http\Controllers\DeliverySaleController::class, 'create'])->name('create');
            Route::get('/{delivery}/edit', [\App\Http\Controllers\DeliverySaleController::class, 'edit'])->name('edit');
            Route::put('/{delivery}', [\App\Http\Controllers\DeliverySaleController::class, 'update'])->name('update');
            Route::post('/', [\App\Http\Controllers\DeliverySaleController::class, 'store'])->name('store');
            Route::get('/search-products', [\App\Http\Controllers\DeliverySaleController::class, 'searchProducts'])->name('search-products');
            Route::get('/search-printers', [\App\Http\Controllers\DeliverySaleController::class, 'searchPrinters'])->name('search-printers');
            Route::get('/shop-outstanding/{shopId}', [\App\Http\Controllers\DeliverySaleController::class, 'getShopOutstanding'])->name('shop-outstanding');
        });

        Route::get('/{delivery}', [DeliveryController::class, 'show'])->name('show');
        Route::get('/{delivery}/edit', [DeliveryController::class, 'edit'])->name('edit');
        Route::put('/{delivery}', [DeliveryController::class, 'update'])->name('update');
        Route::patch('/{delivery}/status', [DeliveryController::class, 'updateStatus'])->name('update-status');
        Route::delete('/{delivery}', [DeliveryController::class, 'destroy'])->name('destroy');
    });

    // Customer routes
    Route::resource('customers', CustomerController::class);
    Route::get('/customers/search', [CustomerController::class, 'search'])->name('customers.search');

    // Supplier routes
    Route::resource('suppliers', SupplierController::class);
    Route::patch('suppliers/{id}/toggle-status', [SupplierController::class, 'toggleStatus'])->name('suppliers.toggle-status');

    // Delivery Payments (Global)
    Route::get('delivery-payments', [\App\Http\Controllers\Admin\DeliveryPaymentController::class, 'index'])->name('delivery-payments.index');
    Route::get('delivery-payments/create', [\App\Http\Controllers\Admin\DeliveryPaymentController::class, 'create'])->name('delivery-payments.create');
    Route::post('delivery-payments', [\App\Http\Controllers\Admin\DeliveryPaymentController::class, 'store'])->name('delivery-payments.store');
    Route::get('delivery-payments/search-shops', [\App\Http\Controllers\Admin\DeliveryPaymentController::class, 'searchShops'])->name('delivery-payments.search-shops');
    Route::get('delivery-payments/pending-invoices', [\App\Http\Controllers\Admin\DeliveryPaymentController::class, 'pendingInvoices'])->name('delivery-payments.pending-invoices');
    Route::get('delivery-payments/history', [\App\Http\Controllers\Admin\DeliveryPaymentController::class, 'history'])->name('delivery-payments.history');
    Route::get('delivery-payments/export', [\App\Http\Controllers\Admin\DeliveryPaymentController::class, 'export'])->name('delivery-payments.export');
    Route::get('delivery-payments/{payment}/receipt', [\App\Http\Controllers\Admin\DeliveryPaymentController::class, 'generateReceipt'])->name('delivery-payments.receipt');

    // Reports routes
    Route::prefix('reports')->name('reports.')->group(function () {
        Route::get('stock-in-hand', [StockInHandReportController::class, 'index'])->name('stock-in-hand.index');
        Route::get('stock-in-hand/download', [StockInHandReportController::class, 'generateReport'])->name('stock-in-hand.download');
        
        // Printer Stock Report
        Route::get('printer-stock', [PrinterStockReportController::class, 'index'])->name('printer-stock.index');
        Route::get('printer-stock/download', [PrinterStockReportController::class, 'generateReport'])->name('printer-stock.download');

        // Delivery Summary Report
        Route::get('delivery-summary', [\App\Http\Controllers\Reports\DeliverySummaryReportController::class, 'index'])->name('delivery-summary.index');
        Route::get('delivery-summary/export', [\App\Http\Controllers\Reports\DeliverySummaryReportController::class, 'export'])->name('delivery-summary.export');


        // Fast/Slow Moving Items Report
        Route::get('delivery-item-movement', [\App\Http\Controllers\Reports\DeliveryItemMovementReportController::class, 'index'])->name('delivery-item-movement.index');
        Route::get('delivery-item-movement/export', [\App\Http\Controllers\Reports\DeliveryItemMovementReportController::class, 'export'])->name('delivery-item-movement.export');

        // Delivery Sales Report (route-wise / rep-wise)
        Route::get('delivery-sales', [\App\Http\Controllers\Reports\DeliverySalesReportController::class, 'index'])->name('delivery-sales.index');
        Route::get('delivery-sales/export', [\App\Http\Controllers\Reports\DeliverySalesReportController::class, 'export'])->name('delivery-sales.export');
        Route::get('delivery-sales/items', [\App\Http\Controllers\Reports\DeliverySalesReportController::class, 'items'])->name('delivery-sales.items');

        Route::get('delivery-sale-items', [\App\Http\Controllers\Reports\DeliverySaleItemsReportController::class, 'index'])->name('delivery-sale-items.index');
        Route::get('delivery-sale-items/export', [\App\Http\Controllers\Reports\DeliverySaleItemsReportController::class, 'export'])->name('delivery-sale-items.export');

        Route::get('delivery-sale-invoices', [\App\Http\Controllers\Reports\DeliverySaleInvoiceReportController::class, 'index'])->name('delivery-sale-invoices.index');
        Route::get('delivery-sale-invoices/export', [\App\Http\Controllers\Reports\DeliverySaleInvoiceReportController::class, 'export'])->name('delivery-sale-invoices.export');

        // Delivery Collections (payment-method & rep-wise comparison)
        Route::get('delivery-collections', [\App\Http\Controllers\Reports\DeliveryCollectionReportController::class, 'index'])->name('delivery-collections.index');
        Route::get('delivery-collections/export', [\App\Http\Controllers\Reports\DeliveryCollectionReportController::class, 'export'])->name('delivery-collections.export');

        // Delivery Graph / Analysis Report (time-series + leaderboards)
        Route::get('delivery-graph-analysis', [\App\Http\Controllers\Reports\DeliveryGraphAnalysisReportController::class, 'index'])->name('delivery-graph-analysis.index');
        Route::get('delivery-graph-analysis/export', [\App\Http\Controllers\Reports\DeliveryGraphAnalysisReportController::class, 'export'])->name('delivery-graph-analysis.export');

        // Vehicle Stock Report (snapshot by vehicle & date)
        Route::get('vehicle-stock', [\App\Http\Controllers\Reports\VehicleStockReportController::class, 'index'])->name('vehicle-stock.index');
        Route::get('vehicle-stock/export', [\App\Http\Controllers\Reports\VehicleStockReportController::class, 'export'])->name('vehicle-stock.export');

        // Wastage Report
        Route::get('wastage', [WastageReportController::class, 'index'])->name('wastage.index');

        // Sales Report
        Route::get('sales', [SalesReportController::class, 'index'])->name('sales.index');
        Route::get('sales/pdf', [SalesReportController::class, 'pdf'])->name('sales.pdf');
        
        // Purchase Order Report
        Route::get('purchase-orders', [PurchaseOrderReportController::class, 'index'])->name('purchase-orders.index');
        Route::get('purchase-orders/pdf', [PurchaseOrderReportController::class, 'pdf'])->name('purchase-orders.pdf');

        // Service Revenue Report
        Route::get('service-revenue', [ServiceRevenueReportController::class, 'index'])->name('service-revenue.index');
        Route::get('service-revenue/export', [ServiceRevenueReportController::class, 'export'])->name('service-revenue.export');

        // Service Charges Report
        Route::get('service-charges', [ServiceChargesReportController::class, 'index'])->name('service-charges.index');
        Route::get('service-charges/export', [ServiceChargesReportController::class, 'export'])->name('service-charges.export');

        // Service Jobs Report
        Route::get('service-jobs-report', [\App\Http\Controllers\Reports\ServiceJobsReportController::class, 'index'])->name('service-jobs-report.index');
        Route::get('service-jobs-report/export', [\App\Http\Controllers\Reports\ServiceJobsReportController::class, 'export'])->name('service-jobs-report.export');

        // Service Jobs Item Usage Report
        Route::get('service-job-item-usage', [\App\Http\Controllers\Reports\ServiceJobItemUsageReportController::class, 'index'])->name('service-job-item-usage.index');
        Route::get('service-job-item-usage/export', [\App\Http\Controllers\Reports\ServiceJobItemUsageReportController::class, 'export'])->name('service-job-item-usage.export');

        // Device Service History Report
        Route::get('device-service-history', [\App\Http\Controllers\Reports\DeviceServiceHistoryReportController::class, 'index'])->name('device-service-history.index');
        Route::get('device-service-history/search', [\App\Http\Controllers\Reports\DeviceServiceHistoryReportController::class, 'search'])->name('device-service-history.search');
        Route::get('device-service-history/export', [\App\Http\Controllers\Reports\DeviceServiceHistoryReportController::class, 'export'])->name('device-service-history.export');

        // Profit Report
        Route::get('profit-report', [\App\Http\Controllers\Reports\ProfitReportController::class, 'index'])->name('profit-report.index');

        // Delivery Profit Report
        Route::get('delivery-profit', [\App\Http\Controllers\Reports\DeliveryProfitReportController::class, 'index'])->name('delivery-profit.index');
        Route::get('delivery-profit/export', [\App\Http\Controllers\Reports\DeliveryProfitReportController::class, 'export'])->name('delivery-profit.export');

        // Delivery Outstanding / Aging Report
        Route::get('delivery-outstanding', [\App\Http\Controllers\Reports\DeliveryOutstandingAgingReportController::class, 'index'])->name('delivery-outstanding.index');
        Route::get('delivery-outstanding/export', [\App\Http\Controllers\Reports\DeliveryOutstandingAgingReportController::class, 'export'])->name('delivery-outstanding.export');
        Route::post('delivery-outstanding/{delivery}/send-reminder', [\App\Http\Controllers\Reports\DeliveryOutstandingAgingReportController::class, 'sendReminder'])->name('delivery-outstanding.send-reminder');

        // Customer and Supplier Details Reports
        Route::get('customer-details', [\App\Http\Controllers\Reports\CustomerDetailsController::class, 'index'])->name('customer-details');
        Route::get('supplier-details', [\App\Http\Controllers\Reports\SupplierDetailsController::class, 'index'])->name('supplier-details');
        
        // Customer Ledger Card
        Route::get('customer-ledger', [\App\Http\Controllers\Reports\CustomerLedgerController::class, 'index'])->name('customer-ledger');
        
        // Shop Ledger Card
        Route::get('shop-ledger', [\App\Http\Controllers\Reports\ShopLedgerController::class, 'index'])->name('shop-ledger');
        
        // Customer Outstandings Report
        Route::get('customer-outstandings', [\App\Http\Controllers\Reports\CustomerOutstandingReportController::class, 'index'])->name('customer-outstandings.index');
        Route::get('customer-outstandings/export', [\App\Http\Controllers\Reports\CustomerOutstandingReportController::class, 'export'])->name('customer-outstandings.export');
        
        Route::get('supplier-ledger', [\App\Http\Controllers\Reports\SupplierLedgerController::class, 'index'])->name('supplier-ledger');
        
        Route::get('stock-bin-card', [\App\Http\Controllers\Reports\StockBinCardController::class, 'index'])->name('stock-bin-card');


        
        Route::get('supplier-details', [\App\Http\Controllers\Reports\SupplierDetailsController::class, 'index'])->name('supplier-details');


        Route::get('sale-items', [\App\Http\Controllers\Reports\SaleItemsController::class, 'index'])->name('sale-items');
        Route::get('sale-items/export', [\App\Http\Controllers\Reports\SaleItemsController::class, 'exportCsv'])->name('sale-items.export');
        Route::get('item-wise-sales', [\App\Http\Controllers\Reports\ItemWiseSalesController::class, 'index'])->name('item-wise-sales');
        
        Route::get('printer-sales', [\App\Http\Controllers\Reports\PrinterSalesController::class, 'index'])->name('printer-sales');

        // Printer Stock Bin Card
        Route::get('printer-stock-bin-card', [\App\Http\Controllers\Reports\PrinterStockBinCardController::class, 'index'])->name('printer-stock-bin-card');

        // Collection Report
        Route::get('collection-report', [CollectionReportController::class, 'index'])->name('collection-report');

        // Cash Collection Report (uses opening balances for start date)
        Route::get('cash-collection-report', [\App\Http\Controllers\Reports\CashCollectionReportController::class, 'index'])->name('cash-collection-report');
        Route::get('cash-collection-report/export', [\App\Http\Controllers\Reports\CashCollectionReportController::class, 'export'])->name('cash-collection-report.export');

        // Petty Cash Analysis Report (category-wise outflow analysis)
        Route::get('petty-cash-analysis', [\App\Http\Controllers\Reports\PettyCashAnalysisController::class, 'index'])->name('petty-cash-analysis.index');
        Route::get('petty-cash-analysis/export', [\App\Http\Controllers\Reports\PettyCashAnalysisController::class, 'export'])->name('petty-cash-analysis.export');

        // Cash Reconciliation
        Route::get('cash-reconciliation', [CashReconciliationController::class, 'index'])->name('cash-reconciliation');
        Route::get('cash-reconciliation/expected-data', [CashReconciliationController::class, 'getExpectedData'])->name('cash-reconciliation.expected-data');
        Route::get('cash-reconciliation/download-pdf', [CashReconciliationController::class, 'downloadPdf'])->name('cash-reconciliation.download-pdf');
        Route::get('cash-reconciliation/export', [CashReconciliationController::class, 'export'])->name('cash-reconciliation.export');
        Route::get('cash-reconciliation/history', [CashReconciliationController::class, 'history'])->name('cash-reconciliation.history');
        Route::post('cash-reconciliation', [CashReconciliationController::class, 'store'])->name('cash-reconciliation.store');
        Route::put('cash-reconciliation/{id}', [CashReconciliationController::class, 'update'])->name('cash-reconciliation.update');
        Route::delete('cash-reconciliation/{id}', [CashReconciliationController::class, 'destroy'])->name('cash-reconciliation.destroy');
        Route::get('cash-reconciliation/{id}', [CashReconciliationController::class, 'show'])->name('cash-reconciliation.show');

        // Item List Report
        Route::get('item-list', [ItemListReportController::class, 'index'])->name('item-list');

        Route::get('stock-in-hand/chart-data/{itemId}', [StockInHandReportController::class, 'getStockChartData'])->name('stock-in-hand.chart-data');
        Route::get('stock-in-hand/sales-chart-data/{itemId}', [StockInHandReportController::class, 'getSalesChartData'])->name('stock-in-hand.sales-chart-data');
        Route::get('stock-charts', [StockInHandReportController::class, 'charts'])->name('stock-charts');
        Route::get('sales-history', [StockInHandReportController::class, 'salesHistory'])->name('sales-history');
        Route::get('sales-history-data', [StockInHandReportController::class, 'getSalesHistory'])->name('sales-history-data');
        Route::get('item-sales-transactions/{itemId}', [StockInHandReportController::class, 'getItemSalesTransactions'])->name('item-sales-transactions');
    });

    // Stock Transfer routes
    Route::get('stock-transfers/get-product-stock', [StockTransferController::class, 'getProductStock'])->name('stock-transfers.get-product-stock');
    Route::resource('stock-transfers', StockTransferController::class)->only(['index', 'create', 'store', 'show']);
    Route::post('stock-transfers/download-pdf', [StockTransferController::class, 'downloadPdf'])->name('stock-transfers.download-pdf');
    Route::get('stock-transfers/{stockTransfer}/download-pdf', [StockTransferController::class, 'downloadPdfById'])->name('stock-transfers.download-pdf-id');

    // Stock Conversion routes
    Route::get('stock-conversions/get-item-stock', [StockConversionController::class, 'getItemStock'])->name('stock-conversions.get-item-stock');
    Route::get('stock-conversions/next-batch', [StockConversionController::class, 'getNextBatchNumber'])->name('stock-conversions.next-batch');
    Route::resource('stock-conversions', StockConversionController::class)->only(['index', 'create', 'store', 'show']);

    // Printer Transfer routes
    Route::get('printer-transfers/download-pdf-batch', [PrinterTransferController::class, 'downloadPdfBatch'])->name('printer-transfers.download-pdf-batch');
    Route::post('printer-transfers/preview-pdf', [PrinterTransferController::class, 'previewPdf'])->name('printer-transfers.preview-pdf');
    Route::get('printer-transfers/search-printers', [PrinterTransferController::class, 'searchPrinters'])->name('printer-transfers.search-printers');
    Route::get('printer-transfers/section-trf-in-stock', [PrinterTransferController::class, 'getSectionTrfInStock'])->name('printer-transfers.section-trf-in-stock');
    Route::resource('printer-transfers', PrinterTransferController::class)->only(['index', 'create', 'store']);

    // Wastage Management routes (Item Wastage - ItemPriceDet)
    Route::get('wastages/search-serial', [\App\Http\Controllers\WastageController::class, 'searchBySerial'])->name('wastages.search-serial');
    Route::get('wastages/unified-search', [\App\Http\Controllers\WastageController::class, 'unifiedSearch'])->name('wastages.unified-search');
    Route::get('wastages/product-batches', [\App\Http\Controllers\WastageController::class, 'getProductBatches'])->name('wastages.product-batches');
    Route::resource('wastages', \App\Http\Controllers\WastageController::class);

    // Printer Wastage Management routes (Printer Wastage - PurchasesDet)
    Route::get('printer-wastages/search-printers', [\App\Http\Controllers\PrinterWastageController::class, 'searchPrinters'])->name('printer-wastages.search-printers');
    Route::resource('printer-wastages', \App\Http\Controllers\PrinterWastageController::class);

    // Supplier Returns routes
    Route::get('supplier-returns/search-suppliers', [\App\Http\Controllers\SupplierReturnController::class, 'searchSuppliers'])->name('supplier-returns.search-suppliers');
    Route::get('supplier-returns/search-invoices', [\App\Http\Controllers\SupplierReturnController::class, 'searchInvoices'])->name('supplier-returns.search-invoices');
    Route::get('supplier-returns/get-invoice-items', [\App\Http\Controllers\SupplierReturnController::class, 'getInvoiceItems'])->name('supplier-returns.get-invoice-items');
    Route::get('supplier-returns/search-items', [\App\Http\Controllers\SupplierReturnController::class, 'searchItems'])->name('supplier-returns.search-items');
    Route::get('supplier-returns/search-printers', [\App\Http\Controllers\SupplierReturnController::class, 'searchPrinters'])->name('supplier-returns.search-printers');
    Route::resource('supplier-returns', \App\Http\Controllers\SupplierReturnController::class);

    // Privilege Points
    Route::resource('points-rules', \App\Http\Controllers\PointsRulesController::class);
    Route::get('privilege-points', [\App\Http\Controllers\PrivilegePointsController::class, 'index'])->name('privilege-points.index');
    Route::get('privilege-points/{companyCode}/{sectionCode}/{customerCode}', [\App\Http\Controllers\PrivilegePointsController::class, 'show'])->name('privilege-points.show');
});



require __DIR__.'/settings.php';

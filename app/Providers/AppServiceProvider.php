<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Redundant with manual handling in controllers (ProductController, PrinterController, PurchaseController)
        // \App\Models\Product::observe(\App\Observers\ProductObserver::class);
        // \App\Models\ItemMaster::observe(\App\Observers\ProductObserver::class);

        // Keeps SalesTransaction.balance_amount always in sync with actual payments.
        // Fires after every CustomerPayment create/update/delete.
        \App\Models\CustomerPayment::observe(\App\Observers\CustomerPaymentObserver::class);
    }
}

<?php

use App\Http\Middleware\BusinessUnitMiddleware;
use App\Http\Middleware\CheckDayOpeningBalance;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\ImpersonateCompany;
use App\Http\Middleware\CheckCompanyStatus;
use App\Http\Middleware\VerifyCashierShift;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Support\Facades\Route;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        then: function () {
            // Business Unit Routes
            Route::middleware('web')
                ->group(base_path('routes/vismass.php'));
            Route::middleware('web')
                ->group(base_path('routes/malibo.php'));
        },
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            ImpersonateCompany::class,
            CheckCompanyStatus::class,
        ]);
        
        $middleware->api(append: [
            StartSession::class,
            CheckCompanyStatus::class,
        ]);
        
        // Register business unit middleware
        $middleware->alias([
            'business.unit' => BusinessUnitMiddleware::class,
            'check.day.opening.balance' => CheckDayOpeningBalance::class,
            'cashier.shift' => VerifyCashierShift::class,
            'check.company.status' => CheckCompanyStatus::class,
            'impersonate' => \Lab404\Impersonate\Middleware\ProtectFromImpersonation::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->respond(function (\Symfony\Component\HttpFoundation\Response $response, \Throwable $exception, \Illuminate\Http\Request $request) {
            if ($response->getStatusCode() === 419) {
                return back()->with([
                    'message' => 'The page expired, please try again.',
                ]);
            }
            return $response;
        });
    })->create();

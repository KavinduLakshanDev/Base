<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make('Illuminate\Contracts\Console\Kernel');
$kernel->bootstrap();

use Illuminate\Support\Facades\Route;

echo "=== MALIBO ROUTES DEBUG ===\n\n";

// Get all registered routes
$routes = Route::getRoutes();

echo "1. Malibo Product Routes:\n";
foreach ($routes as $route) {
    $name = $route->getName();
    if ($name && str_contains($name, 'malibo.products')) {
        echo "  - Name: {$name}\n";
        echo "    URI: {$route->uri()}\n";
        echo "    Methods: " . implode('|', $route->methods()) . "\n";
        echo "    Controller: " . $route->getActionName() . "\n";
        $middleware = $route->middleware();
        echo "    Middleware: " . implode(', ', $middleware) . "\n";
        echo "\n";
    }
}

echo "2. POS Product Routes (for comparison):\n";
foreach ($routes as $route) {
    $name = $route->getName();
    if ($name && str_contains($name, 'pos.products.index')) {
        echo "  - Name: {$name}\n";
        echo "    URI: {$route->uri()}\n";
        echo "    Methods: " . implode('|', $route->methods()) . "\n";
        echo "    Controller: " . $route->getActionName() . "\n";
        echo "\n";
    }
}

echo "3. Testing route name detection:\n";
$maliboRoute = $routes->getByName('malibo.products.index');
if ($maliboRoute) {
    echo "  ✓ malibo.products.index route exists\n";
    echo "  URI: {$maliboRoute->uri()}\n";
    $name = $maliboRoute->getName();
    echo "  Name: {$name}\n";
    echo "  Contains 'malibo.': " . (str_contains($name, 'malibo.') ? 'YES' : 'NO') . "\n";
} else {
    echo "  ✗ malibo.products.index route NOT FOUND\n";
}

echo "\n=== END DEBUG ===\n";

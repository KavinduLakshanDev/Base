<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$shops = \App\Models\Shop::all();
foreach ($shops as $shop) {
    $shop->updateCurrentBalance();
    echo "Shop {$shop->id}: {$shop->current_balance}\n";
}

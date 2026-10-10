<?php
$lines = file(__DIR__ . '/app/Http/Controllers/DeliveryController.php');
for ($i = 294; $i < 306; $i++) {
    echo ($i+1) . ': ' . $lines[$i];
}

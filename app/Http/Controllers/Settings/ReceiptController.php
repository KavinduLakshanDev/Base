<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Inertia\Inertia;

class ReceiptController extends Controller
{
    public function edit()
    {
        return Inertia::render('settings/receipt', [
            'receipt_width_mm' => config('app.receipt_width_mm', 80),
        ]);
    }

    public function update(Request $request)
    {
        $request->validate([
            'receipt_width_mm' => 'required|numeric|min|58|max|100',
        ]);

        // Update the .env file
        $this->updateEnvFile('RECEIPT_WIDTH_MM', $request->receipt_width_mm);

        return redirect()->back()->with('success', 'Receipt settings updated successfully.');
    }

    private function updateEnvFile($key, $value)
    {
        $envFile = base_path('.env');
        $contents = file_get_contents($envFile);

        // Check if the key exists
        if (preg_match("/^{$key}=.*$/m", $contents)) {
            // Update existing key
            $contents = preg_replace("/^{$key}=.*$/m", "{$key}={$value}", $contents);
        } else {
            // Add new key
            $contents .= "\n{$key}={$value}";
        }

        file_put_contents($envFile, $contents);
    }
}
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Stock In Hand Report</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@100..900&display=swap');
        body {
            font-family: 'Noto Sans Sinhala', 'DejaVu Sans', Arial, sans-serif;
            margin: 0;
            padding: 20px;
            font-size: 12px;
            background-color: #fff;
        }
        
        .container {
            max-width: 750px;
            margin: 0 auto;
        }
        
        .header {
            text-align: center;
            margin-bottom: 5px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
        }
        
        .title {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .company-info-table {
            width: 85%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 11px;
        }
        
        .company-info-table td {
            border: none;
            padding: 2px 4px;
            vertical-align: top;
        }
        
        .company-info-table td:nth-child(odd) {
            font-weight: bold;
            width: 15%;
        }
        
        .company-info-table td:nth-child(even) {
            width: 25%;
        }
        h1 {
            text-align: center;
            margin-bottom: 20px;
            font-family: 'DejaVu Sans', Arial, sans-serif;
            font-weight: 700;
            font-size: 18px;
        }
        h2 {
            margin-top: 5px;
            margin-bottom: 10px;
            font-family: 'DejaVu Sans', Arial, sans-serif;
            font-weight: 600;
            font-size: 14px;
            padding: 10px;
            background-color: #f8f9fa;
            border-left: 4px solid #007bff;
            color: #495057;
        }
        .stock-table {
            width: 100%;
            border-collapse: collapse;
            margin: 5px 0;
        }
        .stock-table th {
            background-color: #f0f0f0;
            padding: 6px;
            text-align: left;
            font-weight: bold;
            border: 1px solid #ddd;
            font-family: 'noto sans sinhala', 'DejaVu Sans', Arial, sans-serif;
            font-size: 9px;
        }
        .stock-table td {
            padding: 4px 6px;
            border: 1px solid #ddd;
            font-family: 'noto sans sinhala', 'DejaVu Sans', Arial, sans-serif;
            font-size: 8px;
        }
        .category-total {
            background-color: #f9f9f9;
            font-weight: bold;
        }
        .grand-total-table {
            background-color: #f0f8ff;
            border: 1px solid #ddd;
            margin-top:5px;
        }
        .grand-total-table td {
            padding: 10px;
            font-weight: bold;
            font-family: 'noto sans sinhala', 'DejaVu Sans', Arial, sans-serif;
            font-size: 11px;
        }
        .summary-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 5px;
            font-size: 9px;
        }
        .summary-table th {
            border: 1px solid #000;
            padding: 8px 4px;
            background-color: #f0f0f0;
            font-weight: bold;
            text-align: center;
            font-family: 'noto sans sinhala', 'DejaVu Sans', Arial, sans-serif;
        }
        .summary-table td {
            border: 1px solid #000;
            padding: 10px 4px;
            text-align: center;
            font-weight: bold;
            font-size: 10px;
            font-family: 'noto sans sinhala', 'DejaVu Sans', Arial, sans-serif;
        }
        .footer {
            margin-top: 5px;
            font-size: 10px;
            text-align: center;
            border-top: 1px solid #000;
            padding-top: 10px;
        }
        /* Unicode support styles */
        .unicode-text {
            font-family: 'noto sans sinhala', 'DejaVu Sans', 'Liberation Sans', Arial, sans-serif;
        }
        /* Column widths for A4 portrait */
        .col-number { width: 10px; text-align: center; }
        .col-item-code { width: 80px; }
        .col-item-name { width: 180px; }
        .col-price { width: 20px; text-align: right; }
        .col-stock { width: 20px; text-align: right; }
        .col-value { width: 50px; text-align: right; }
    </style>
</head>
<body>
    @php
        // Determine company for report (fall back to auth user's company or first record)
        $company = $company ?? null;
        if (function_exists('auth') && auth()->check()) {
            $company = $company ?? \App\Models\Company::where('company_code', auth()->user()->company_code)->first();
        }
        $company = $company ?? \App\Models\Company::first();

        $companyObj = is_array($company) ? (object) $company : $company;

        // Prefer PNG versions when available; create placeholder if missing to avoid DOMPDF missing image errors
        $companyCode = strtoupper($companyObj->company_code ?? 'VIS001');
        $vismassPng = public_path('images/vismass-logo.png');
        $malibuPng  = public_path('images/malibu-logo.png');
        $placeholderPng = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAQAAAAAYLlVAAAAHklEQVR4nO3BMQEAAADCoPVPbQ0PoAAAAAAAAAAA4BsMCgABxIoV2AAAAAElFTkSuQmCC');
        if (!file_exists($vismassPng)) {
            @file_put_contents($vismassPng, $placeholderPng);
        }
        if (!file_exists($malibuPng)) {
            @file_put_contents($malibuPng, $placeholderPng);
        }

        $logoUrl = asset('images/vismass-logo.png');
        if ($companyCode === 'MAL001') {
            $logoUrl = asset('images/malibu-logo.png');
        }

        $companyName = $companyObj->name ?? 'Company';
        $companySection = $companyObj->section ?? 'N/A';
    @endphp

    <div class="container">
        <!-- Debug Info (remove after testing) -->
       
        <!-- Header -->
        <div class="header">
            <div style="margin-bottom: 8px;">
                <img src="{{ $logoUrl }}" alt="{{ $companyName }}" style="height: 40px;" />
            </div>
            <div class="title">Stock In Hand Report</div>
            <div style="font-size: 14px; margin-top: 4px;">{{ $companyName }}</div>
        </div>

        <!-- Company Information -->
        <table class="company-info-table">
            <tbody>
                <tr>
                    <td><strong>Company:</strong></td>
                    <td>{{ $company['name'] ?? 'N/A' }}</td>
                    <td><strong>Section:</strong></td>
                    <td>{{ $company['section'] ?? 'N/A' }}</td>
                </tr>
                <tr>
                    <td><strong>Generated at:</strong></td>
                    <td>{{ $generated_at }}</td>
                    <td><strong>Generated by:</strong></td>
                    <td>{{ $generated_by }}</td>
                </tr>
            </tbody>
        </table>

 
    @if(isset($groupedStock) && count($groupedStock) > 0)
        @foreach($groupedStock as $categoryData)
            <h2 class="unicode-text">{{ $categoryData['category_name'] ?? 'Unknown Category' }}</h2>
            <table class="stock-table">
                <thead>
                    <tr>
                        <th class="col-number unicode-text">#</th>
                        <th class="col-item-code unicode-text">Item Code</th>
                        <th class="col-item-name unicode-text">Item Name</th>
                        @if($itemType !== 'product')
                            <th class="col-item-name unicode-text">Serial Number</th>
                            <th class="col-item-code unicode-text">Batch</th>
                        @else
                            <th class="col-item-code unicode-text">Batch</th>
                        @endif
                        <th class="col-stock unicode-text">Stock</th>
                        <th class="col-price unicode-text">Cost</th>
                        <th class="col-price unicode-text">Sales Price</th>
                        <th class="col-value unicode-text">Cost Val</th>
                        <th class="col-value unicode-text">Sales Val</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($categoryData['items'] ?? [] as $item)
                        <tr>
                            <td class="col-number unicode-text">{{ $loop->iteration }}</td>
                            <td class="col-item-code unicode-text">{{ $item['item_code'] ?? 'N/A' }}</td>
                            <td class="col-item-name unicode-text">{{ $item['item_name'] ?? 'N/A' }}</td>
                            @if($itemType !== 'product')
                                <td class="col-item-name unicode-text">{{ $item['serial_number'] ?? '-' }}</td>
                            @endif
                            <td class="col-item-code unicode-text">{{ $item['batch_no'] ?? 'N/A' }}</td>
                            <td class="col-stock unicode-text">{{ number_format($item['current_stock'] ?? 0, 2) }}</td>
                            <td class="col-price unicode-text">{{ number_format($item['cost_price'] ?? 0, 2) }}</td>
                            <td class="col-price unicode-text">{{ number_format($item['retail_price'] ?? 0, 2) }}</td>
                            <td class="col-value unicode-text">{{ number_format(($item['cost_price'] ?? 0) * ($item['current_stock'] ?? 0), 2) }}</td>
                            <td class="col-value unicode-text">{{ number_format(($item['retail_price'] ?? 0) * ($item['current_stock'] ?? 0), 2) }}</td>
                        </tr>
                    @endforeach
                    <tr class="category-total">
                        <td colspan="{{ $itemType !== 'product' ? 9 : 8 }}" class="unicode-text" style="text-align: right; font-weight: bold;">Category Total:</td>
                        <td class="col-value unicode-text">{{ number_format(collect($categoryData['items'] ?? [])->sum(function($item) { return ($item['cost_price'] ?? 0) * ($item['current_stock'] ?? 0); }), 2) }}</td>
                        <td class="col-value unicode-text">{{ number_format(collect($categoryData['items'] ?? [])->sum(function($item) { return ($item['retail_price'] ?? 0) * ($item['current_stock'] ?? 0); }), 2) }}</td>
                    </tr>
                </tbody>
            </table>
            <br>
        @endforeach

        <h2 class="unicode-text" style="margin-top: 1px;">Grand Total</h2>
        <table class="summary-table">
            <thead>
                <tr>
                    <th>Total Cost Value (Rs)</th>
                    <th>Total Sales Value (Rs)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td class="summary-value">{{ number_format($overallTotalCostValue ?? 0, 2) }}</td>
                    <td class="summary-value">{{ number_format($overallTotalRetailValue ?? 0, 2) }}</td>
                </tr>
            </tbody>
        </table>

    @else
        <p class="unicode-text">No stock data found.</p>
    @endif

    <!-- Footer -->
    <div class="footer">
        <div>Report generated by: {{ $generated_by }}</div>
        <div>Generated on: {{ $generated_at }}</div>
        <div>Developed by: Unitec Software Solution</div>
    </div>
    </div>
</body>
</html>
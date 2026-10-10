<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Stock Taking Report</title>
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
            margin-bottom: 0;
            border-bottom: 2px solid #000;
            padding-bottom: 8px;
            height: 60px;
        }
        .header img {
            height: 35px;
        }
        .title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 2px;
        }
        .company-info-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
            font-size: 11px;
            height: 55px;
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
            width: 35%;
        }
        .stock-table {
            width: 100%;
            border-collapse: collapse;
            margin: 5px 0;
        }
        .stock-table th {
            background-color: #e8e8e8;
            padding: 6px;
            text-align: left;
            font-weight: bold;
            border: 1px solid #999;
            font-size: 9px;
        }
        .stock-table td {
            padding: 5px 6px;
            border: 1px solid #ccc;
            font-size: 9px;
        }
        .category-header {
            background-color: #dbeafe;
            font-weight: bold;
            font-size: 10px;
        }
        .category-total {
            background-color: #f3f4f6;
            font-weight: bold;
        }
        .variance-positive {
            color: #16a34a;
            font-weight: bold;
        }
        .variance-negative {
            color: #dc2626;
            font-weight: bold;
        }
        .variance-zero {
            color: #6b7280;
        }
        .grand-total-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        .grand-total-table th {
            background-color: #e8e8e8;
            border: 1px solid #999;
            padding: 8px 4px;
            font-weight: bold;
            text-align: center;
            font-size: 10px;
        }
        .grand-total-table td {
            border: 1px solid #999;
            padding: 8px 4px;
            text-align: center;
            font-weight: bold;
            font-size: 11px;
        }
        .footer {
            margin-top: 15px;
            font-size: 10px;
            text-align: center;
            border-top: 1px solid #000;
            padding-top: 10px;
        }
        .col-number { width: 8%; text-align: center; }
        .col-item-code { width: 18%; }
        .col-item-name { width: 30%; }
        .col-stock { width: 14%; text-align: right; }
        .col-actual { width: 14%; text-align: right; background-color: #eff6ff; }
        .col-variance { width: 16%; text-align: right; }
    </style>
</head>
<body>
    @php
        $company = $company ?? null;
        if (function_exists('auth') && auth()->check()) {
            $company = $company ?? \App\Models\Company::where('company_code', auth()->user()->company_code)->first();
        }
        $company = $company ?? \App\Models\Company::first();
        $companyObj = is_array($company) ? (object) $company : $company;

        $companyCode = strtoupper($companyObj->company_code ?? 'VIS001');
        $vismassPng = public_path('images/vismass-logo.png');
        $malibuPng = public_path('images/malibu-logo.png');
        $placeholderPng = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAQAAAAAYLlVAAAAHklEQVR4nO3BMQEAAADCoPVPbQ0PoAAAAAAAAAAA4BsMCgABxIoV2AAAAAElFTkSuQmCC');
        if (!file_exists($vismassPng)) { @file_put_contents($vismassPng, $placeholderPng); }
        if (!file_exists($malibuPng)) { @file_put_contents($malibuPng, $placeholderPng); }

        $logoPath = $vismassPng;
        if ($companyCode === 'MAL001') { $logoPath = $malibuPng; }

        $logoData = @file_get_contents($logoPath);
        $logoUrl = $logoData ? 'data:image/png;base64,' . base64_encode($logoData) : '';

        $companyName = $companyObj->name ?? 'Company';
    @endphp

    <div class="container">
        <div class="header">
            <img src="{{ $logoUrl }}" alt="{{ $companyName }}" />
            <div class="title">Stock Taking Report</div>
            <!-- <div style="font-size: 12px;">{{ $companyName }}</div> -->
        </div>

        @php
            $reportType = $reportType ?? 'full';
            $reportItems = $taking->items->filter(function($item) use ($reportType) {
                if ($reportType === 'variance') {
                    return abs($item->actual_stock - $item->system_stock) > 0.001;
                }
                return $item->system_stock > 0 || $item->actual_stock > 0;
            });
        @endphp

        <table class="company-info-table">
            <tbody>
                <tr>
                    <td><strong>Section:</strong></td>
                    <td>{{ $taking->section->name ?? 'N/A' }}</td>
                    <td><strong>Taking Number:</strong></td>
                    <td>{{ $taking->taking_number }}</td>
                </tr>
                <tr>
                    <td><strong>Date:</strong></td>
                    <td>{{ \Carbon\Carbon::parse($taking->taking_date)->format('d/m/Y') }}</td>
                    <td><strong>Status:</strong></td>
                    <td>{{ ucfirst($taking->status) }}</td>
                </tr>
                <tr>
                    <td><strong>Recorded By:</strong></td>
                    <td>{{ $taking->recorder->name ?? 'N/A' }}</td>
                    <td><strong>Total Items:</strong></td>
                    <td>{{ $reportItems->count() }}</td>
                </tr>
            </tbody>
        </table>

        @if($reportType === 'variance')
            <h3 style="text-align: center; margin-top: 5px; margin-bottom: 5px;">Variance Items Only</h3>
        @endif

        @if($reportItems->count() > 0)
            <table class="stock-table">
                <thead>
                    <tr>
                        <th class="col-number">#</th>
                        <th class="col-item-code">Item Code</th>
                        <th class="col-item-name">Item Name</th>
                        <th class="col-stock">System Stock</th>
                        <th class="col-actual">Actual Stock</th>
                        <th class="col-variance">Variance</th>
                    </tr>
                </thead>
                <tbody>
                    @php
                        $totalSystem = 0;
                        $totalActual = 0;
                        $totalVariance = 0;
                        $counter = 1;
                    @endphp
                    @foreach($reportItems as $item)
                        @php
                            $variance = $item->actual_stock - $item->system_stock;
                            $totalSystem += $item->system_stock;
                            $totalActual += $item->actual_stock;
                            $totalVariance += $variance;
                            $varianceClass = $variance > 0 ? 'variance-positive' : ($variance < 0 ? 'variance-negative' : 'variance-zero');
                            $variancePrefix = $variance > 0 ? '+' : '';
                        @endphp
                        <tr>
                            <td class="col-number" style="text-align: center;">{{ $counter++ }}</td>
                            <td class="col-item-code">{{ $item->product->ItemCode ?? 'N/A' }}</td>
                            <td class="col-item-name">{{ $item->product->ItmNm ?? 'N/A' }}</td>
                            <td class="col-stock" style="text-align: right;">{{ number_format($item->system_stock, 2) }}</td>
                            <td class="col-actual" style="text-align: right; background-color: #eff6ff; font-weight: bold;">{{ number_format($item->actual_stock, 2) }}</td>
                            <td class="col-variance {{ $varianceClass }}" style="text-align: right;">{{ $variancePrefix }}{{ number_format($variance, 2) }}</td>
                        </tr>
                    @endforeach
                    <tr class="category-total">
                        <td colspan="3" style="text-align: right; font-weight: bold;">Total:</td>
                        <td class="col-stock" style="text-align: right; font-weight: bold;">{{ number_format($totalSystem, 2) }}</td>
                        <td class="col-actual" style="text-align: right; font-weight: bold; background-color: #eff6ff;">{{ number_format($totalActual, 2) }}</td>
                        <td class="col-variance {{ $totalVariance > 0 ? 'variance-positive' : ($totalVariance < 0 ? 'variance-negative' : 'variance-zero') }}" style="text-align: right; font-weight: bold;">
                            {{ $totalVariance > 0 ? '+' : '' }}{{ number_format($totalVariance, 2) }}
                        </td>
                    </tr>
                </tbody>
            </table>
        @else
            <p>No stock items with system stock > 0 found.</p>
        @endif

        <div class="footer">
            <div>Report generated by: {{ $taking->recorder->name ?? 'N/A' }}</div>
            <div>Generated on: {{ now()->format('d/m/Y h:i A') }}</div>
            <div>Developed by: Unitec Software Solution</div>
        </div>
    </div>
</body>
</html>

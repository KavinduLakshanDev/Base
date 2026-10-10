<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Purchase Orders Report</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #000;
            background-color: #fff;
            margin: 0;
            padding: 20px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
        }
        
        .header h1 {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .company-info {
            display: table;
            width: 100%;
            margin-bottom: 20px;
            font-size: 11px;
        }
        
        .company-info .left,
        .company-info .right {
            display: table-cell;
            width: 50%;
        }
        
        .company-info .right {
            text-align: right;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 12px;
        }
        
        th {
            border: 1px solid #000;
            padding: 8px;
            background-color: #f0f0f0;
            font-weight: bold;
            text-align: center;
        }
        
        td {
            border: 1px solid #000;
            padding: 6px;
        }
        
        .text-right {
            text-align: right;
        }
        
        .text-center {
            text-align: center;
        }
        
        .total-row {
            background-color: #e8f5e8;
            font-weight: bold;
        }
        
        .summary-box {
            display: inline-block;
            border: 1px solid #000;
            padding: 10px;
            text-align: center;
            width: 23%;
            margin-right: 1%;
        }
        
        .footer {
            margin-top: 30px;
            font-size: 10px;
            text-align: center;
            border-top: 1px solid #000;
            padding-top: 10px;
        }
    </style>
</head>
<body>
    @php
        // Determine company (fall back to auth user's company or first record)
        $company = $company ?? null;
        if (function_exists('auth') && auth()->check()) {
            $company = $company ?? \App\Models\Company::where('company_code', auth()->user()->company_code)->first();
        }
        $company = $company ?? \App\Models\Company::first();

        // Normalize company access (array or object)
        $companyObj = is_array($company) ? (object) $company : $company;

        // Prefer PNG versions when available; create placeholder if missing.
        $companyCode = strtoupper($companyObj->company_code ?? 'VIS001');

        $vismassPngCandidates = [
            public_path('images/Vismass-logo.png'),
            public_path('images/vismass-logo.png'),
        ];
        $malibuPngCandidates = [
            public_path('images/Malibu-logo.png'),
            public_path('images/malibu-logo.png'),
        ];

        $vismassPng = null;
        foreach ($vismassPngCandidates as $candidate) {
            if (file_exists($candidate)) {
                $vismassPng = $candidate;
                break;
            }
        }
        $vismassPng = $vismassPng ?? $vismassPngCandidates[0];

        $malibuPng = null;
        foreach ($malibuPngCandidates as $candidate) {
            if (file_exists($candidate)) {
                $malibuPng = $candidate;
                break;
            }
        }
        $malibuPng = $malibuPng ?? $malibuPngCandidates[0];

        $placeholderPng = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAQAAAAAYLlVAAAAHklEQVR4nO3BMQEAAADCoPVPbQ0PoAAAAAAAAAAA4BsMCgABxIoV2AAAAAElFTkSuQmCC');
        if (!file_exists($vismassPng)) {
            @file_put_contents($vismassPng, $placeholderPng);
        }
        if (!file_exists($malibuPng)) {
            @file_put_contents($malibuPng, $placeholderPng);
        }

        $logoPath = $vismassPng;
        if ($companyCode === 'MAL001') {
            $logoPath = $malibuPng;
        }

        $logoData = @file_get_contents($logoPath);
        $logoUrl = $logoData ? 'data:image/png;base64,' . base64_encode($logoData) : '';

        $companyName = $companyObj->name ?? 'Company';
    @endphp

    <!-- Header -->
    <div class="header">
        <div style="margin-bottom: 8px;">
            <img src="{{ $logoUrl }}" alt="{{ $companyName }}" style="height: 40px;" />
        </div>
        <h1>Purchase Orders Report</h1>
        <div>{{ $companyName }}</div>
    <!-- Company / Report Info -->
    <div class="company-info">
        <div class="left">
            <strong>Company:</strong> {{ $companyName }}<br />
        </div>
        <div class="right">
            <strong>Date Range:</strong> {{ \Carbon\Carbon::parse($fromDate)->format('d/m/Y') }} - {{ \Carbon\Carbon::parse($toDate)->format('d/m/Y') }}<br />
            <strong>Supplier:</strong> {{ $filters['supplier_id'] === 'all' ? 'All Suppliers' : $filters['supplier_id'] }}<br />
            <strong>Section:</strong> {{ $filters['section'] === 'all' ? 'All Sections' : $filters['section'] }}<br />
            <strong>Generated:</strong> {{ now()->format('d/m/Y H:i:s') }}
        </div>
    </div>

    <!-- Data Table -->
    <table>
        <thead>
            <tr>
                <th>Order #</th>
                <th>Date</th>
                <th>Supplier</th>
                <th>Section</th>
                <th>Items</th>
                <th>Total Qty</th>
                <th>Total Value (Rs)</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            @foreach($reportData as $item)
                <tr>
                    <td class="text-center">{{ $item['order_number'] }}</td>
                    <td class="text-center">{{ \Carbon\Carbon::parse($item['order_date'])->format('d/m/Y') }}</td>
                    <td>{{ $item['supplier_name'] }}</td>
                    <td>{{ $item['branch_name'] }}</td> <!-- still using branch_name as section label -->
                    <td class="text-right">{{ $item['total_items'] }}</td>
                    <td class="text-right">{{ number_format($item['total_quantity'], 2) }}</td>
                    <td class="text-right">{{ number_format($item['total_value'], 2) }}</td>
                    <td class="text-center">{{ $item['status'] }}</td>
                </tr>
            @endforeach
            <tr class="total-row">
                <td colspan="4" class="text-center">Total</td> <!-- column colspan unaffected -->
                <td class="text-right"></td>
                <td class="text-right">{{ number_format($totals['total_items'], 2) }}</td>
                <td class="text-right">Rs. {{ number_format($totals['total_value'], 2) }}</td>
                <td></td>
            </tr>
        </tbody>
    </table>

    <!-- Summary -->
    <div style="margin-top: 20px;">
        <div class="summary-box">
            <strong>Total Orders</strong><br />
            {{ $totals['orders_count'] }}
        </div>
        <div class="summary-box">
            <strong>Total Value (Rs)</strong><br />
            Rs. {{ number_format($totals['total_value'], 2) }}
        </div>
        <div class="summary-box">
            <strong>Received Value (Rs)</strong><br />
            Rs. {{ number_format($totals['received_value'], 2) }}
        </div>
        <div class="summary-box">
            <strong>Total Items</strong><br />
            {{ number_format($totals['total_items'], 2) }}
        </div>
    </div>

    <!-- Footer -->
    <div class="footer">
        <p>Generated on {{ now()->format('d/m/Y') }} at {{ now()->format('H:i:s') }}</p>
        <p>This is a computer-generated report.</p>
    </div>
</body>
</html>

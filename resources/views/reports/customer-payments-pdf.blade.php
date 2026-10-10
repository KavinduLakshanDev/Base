<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Customer Payments Report</title>
    <style>
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            font-size: 10px;
            color: #333;
            line-height: 1.4;
            margin: 0;
            padding: 10px;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #2d3748;
            padding-bottom: 10px;
        }
        .report-title {
            font-size: 14px;
            font-weight: bold;
            color: #4a5568;
            text-transform: uppercase;
        }
        .summary-section {
            margin-bottom: 20px;
        }
        .summary-table {
            width: 100%;
            margin-bottom: 20px;
        }
        .summary-table td {
            width: 50%;
            padding: 5px;
            border: none;
        }
        .summary-card {
            border: 1px solid #ddd;
            padding: 10px;
            border-radius: 4px;
            background-color: #f7fafc;
        }
        .summary-label {
            font-size: 10px;
            color: #718096;
            text-transform: uppercase;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .summary-value {
            font-size: 16px;
            font-weight: bold;
            color: #2d3748;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        th, td {
            border: 1px solid #e2e8f0;
            padding: 6px 8px;
            text-align: left;
        }
        th {
            background-color: #4a5568;
            color: white;
            font-weight: bold;
            font-size: 10px;
            text-transform: uppercase;
        }
        tr:nth-child(even) {
            background-color: #f8fafc;
        }
        .text-right {
            text-align: right;
        }
        .text-center {
            text-align: center;
        }
        .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 10px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 10px;
        }
    </style>
</head>
<body>
    @php
        $companyObj = is_array($company) ? (object) $company : $company;
        $companyCode = strtoupper($companyObj->code ?? 'VIS001');
        
        $vismassPng = public_path('images/vismass-logo.png');
        $malibuPng  = public_path('images/malibu-logo.png');
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
        
        $companyName = $companyObj->name ?? '';
    @endphp

    <!-- Header -->
    <div class="header">
        <div style="text-align: center; margin-bottom: 8px;">
            <img src="{{ $logoUrl }}" alt="{{ $companyName }}" style="height: 40px;" />
        </div>
        <div class="report-title">Customer Payments Report</div>
        <div style="font-size: 10px; margin-top: 5px;">
            Generated on: {{ date('d/m/Y H:i:s') }}
        </div>
    </div>

    <!-- Summary Section -->
    <div class="summary-section">
        <table class="summary-table">
            <tr>
                <td>
                    <div class="summary-card">
                        <div class="summary-label">Total Transactions</div>
                        <div class="summary-value">{{ count($reportData) }}</div>
                    </div>
                </td>
                <td>
                    <div class="summary-card">
                        <div class="summary-label">Total Collected</div>
                        <div class="summary-value">Rs {{ number_format($totalCollected, 2) }}</div>
                    </div>
                </td>
            </tr>
        </table>
    </div>

    <!-- Detailed List -->
    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Receipt No</th>
                <th>Customer</th>
                <th>Paid Invoices</th>
                <th>Method</th>
                <th>Cashier</th>
                <th>Status</th>
                <th class="text-right">Amount (Rs)</th>
            </tr>
        </thead>
        <tbody>
            @foreach($reportData as $item)
            <tr>
                <td>{{ $item['date'] }}</td>
                <td>{{ $item['receipt_no'] }}</td>
                <td>{{ $item['customer_name'] }}<br/><small style="color: #666;">{{ $item['customer_code'] }}</small></td>
                <td>{{ $item['paid_invoices'] }}</td>
                <td>
                    {{ $item['method'] }}<br/>
                    @if($item['reference'])
                        <small style="color: #666;">{{ $item['reference'] }}</small>
                    @endif
                </td>
                <td>{{ $item['cashier'] ?? 'N/A' }}</td>
                <td>{{ $item['status'] }}</td>
                <td class="text-right">{{ number_format((float)$item['amount'], 2) }}</td>
            </tr>
            @endforeach
        </tbody>
        <tfoot>
            <tr style="background-color: #e2e8f0; font-weight: bold;">
                <td colspan="7" class="text-right">TOTAL</td>
                <td class="text-right">Rs {{ number_format($totalCollected, 2) }}</td>
            </tr>
        </tfoot>
    </table>

    <!-- Footer -->
    <div class="footer">
        <div>{{ $companyName }} - Customer Payments Report</div>
        <div>This is a system generated report</div>
    </div>
</body>
</html>

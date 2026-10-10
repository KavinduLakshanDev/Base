<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Sales Report - {{ $reportType === 'daily' ? 'Daily' : 'Monthly' }}</title>
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
            font-size: 16px;
            font-weight: bold;
            margin: 5px 0;
        }
        .header .company-name {
            font-size: 20px;
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
        
        .summary {
            display: table;
            width: 100%;
            margin-top: 20px;
            font-size: 11px;
        }
        
        .summary-box {
            display: table-cell;
            border: 1px solid #000;
            padding: 10px;
            text-align: center;
            width: 33.33%;
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
        // Determine company for report (fall back to auth user's company or first record)
        $company = $company ?? null;
        if (function_exists('auth') && auth()->check()) {
            $company = $company ?? \App\Models\Company::where('company_code', auth()->user()->company_code)->first();
        }
        $company = $company ?? \App\Models\Company::first();

        $companyObj = is_array($company) ? (object) $company : $company;

        // Prefer PNG logos; create placeholder if missing to avoid DOMPDF missing file errors
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
    @endphp

    <!-- Header -->
    <div class="header">
        <div style="margin-bottom: 8px;">
            <img src="{{ $logoUrl }}" alt="{{ $companyName }}" style="height: 40px;" />
        </div>
        <div class="company-name">{{ $companyName }}</div>
        <h1>
            @if($reportType === 'daily')
                Daily Sales Report - {{ \Carbon\Carbon::parse($fromDate)->format('d/m/Y') }} to {{ \Carbon\Carbon::parse($toDate)->format('d/m/Y') }}
            @else
                Monthly Sales Report - {{ \Carbon\Carbon::parse($fromDate)->format('d/m/Y') }} to {{ \Carbon\Carbon::parse($toDate)->format('d/m/Y') }}
            @endif
        </h1>
    </div>

    <!-- Company Information -->
    <div class="company-info">
        <div class="left">
            <strong>Company:</strong> {{ $company['name'] }}<br />
            <strong>Report Type:</strong> {{ $reportType === 'daily' ? 'Daily' : 'Monthly' }}<br />
            @if(!empty($sectionName))
                <strong>Section:</strong> {{ $sectionName }}<br />
            @endif
            @if(!empty($cashierName))
                <strong>Cashier:</strong> {{ $cashierName }}<br />
            @endif
            <strong>Generated:</strong> {{ now()->format('d/m/Y H:i:s') }}
        </div>
    </div>

    {{-- table differs based on reportType, so wrap inside a conditional --}}
    @if($reportType === 'daily')
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Invoice No</th>
                    <th class="text-right">Total Amount (Rs)</th>
                    <th class="text-right">Cash (Rs)</th>
                    <th class="text-right">Credit (Rs)</th>
                    <th class="text-right">Card (Rs)</th>
                    <th class="text-right">Cheque (Rs)</th>
                    <th class="text-right">Bank (Rs)</th>
                </tr>
            </thead>
            <tbody>
                @foreach($salesData['daily_summaries'] ?? [] as $summary)
                    @foreach($summary['transactions'] ?? [] as $index => $transaction)
                        <tr>
                            <td class="text-center">
                                @if($index === 0)
                                    {{ \Carbon\Carbon::parse($summary['date'])->format('d/m/Y') }}
                                @endif
                            </td>
                            <td class="text-center">{{ $transaction['invoice_no'] }}</td>
                            <td class="text-right">{{ number_format($transaction['total_amount'], 2) }}</td>
                            <td class="text-right">{{ number_format($transaction['cash_payment'], 2) }}</td>
                            <td class="text-right">{{ number_format($transaction['voucher_amount'], 2) }}</td>
                            <td class="text-right">{{ number_format($transaction['credit_card_amount'], 2) }}</td>
                            <td class="text-right">{{ number_format($transaction['cheque_payment'] ?? 0, 2) }}</td>
                            <td class="text-right">{{ number_format($transaction['bank_transfer_payment'] ?? 0, 2) }}</td>
                        </tr>
                    @endforeach
                @endforeach
                <tr class="total-row">
                    <td class="text-center"></td>
                    <td class="text-center">Total</td>
                    <td class="text-right">Rs. {{ number_format($salesData['total_amount'], 2) }}</td>
                    <td class="text-right">Rs. {{ number_format($salesData['total_cash'], 2) }}</td>
                    <td class="text-right">Rs. {{ number_format($salesData['total_credit'], 2) }}</td>
                    <td class="text-right">Rs. {{ number_format($salesData['total_card'], 2) }}</td>
                    <td class="text-right">Rs. {{ number_format($salesData['total_cheque'], 2) }}</td>
                    <td class="text-right">Rs. {{ number_format($salesData['total_bank_transfer'], 2) }}</td>
                </tr>
            </tbody>
        </table>
    @else
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Start Invoice</th>
                    <th>End Invoice</th>
                    <th class="text-right">Total Amount (Rs)</th>
                    <th class="text-right">Cash (Rs)</th>
                    <th class="text-right">Credit (Rs)</th>
                    <th class="text-right">Card (Rs)</th>
                    <th class="text-right">Cheque (Rs)</th>
                    <th class="text-right">Bank (Rs)</th>
                </tr>
            </thead>
            <tbody>
                @foreach($salesData['daily_summaries'] ?? [] as $summary)
                    <tr>
                        <td class="text-center">{{ \Carbon\Carbon::parse($summary['date'])->format('d/m/Y') }}</td>
                        <td class="text-center">{{ $summary['start_invoice'] }}</td>
                        <td class="text-center">{{ $summary['end_invoice'] }}</td>
                        <td class="text-right">Rs. {{ number_format($summary['total_amount'], 2) }}</td>
                        <td class="text-right">Rs. {{ number_format($summary['total_cash'], 2) }}</td>
                        <td class="text-right">Rs. {{ number_format($summary['total_credit'], 2) }}</td>
                        <td class="text-right">Rs. {{ number_format($summary['total_card'], 2) }}</td>
                        <td class="text-right">Rs. {{ number_format($summary['total_cheque'] ?? 0, 2) }}</td>
                        <td class="text-right">Rs. {{ number_format($summary['total_bank_transfer'] ?? 0, 2) }}</td>
                    </tr>
                @endforeach
                <tr class="total-row">
                    <td colspan="3" class="text-center">Total</td>
                    <td class="text-right">Rs. {{ number_format($salesData['total_amount'], 2) }}</td>
                    <td class="text-right">Rs. {{ number_format($salesData['total_cash'], 2) }}</td>
                    <td class="text-right">Rs. {{ number_format($salesData['total_credit'], 2) }}</td>
                    <td class="text-right">Rs. {{ number_format($salesData['total_card'], 2) }}</td>
                    <td class="text-right">Rs. {{ number_format($salesData['total_cheque'] ?? 0, 2) }}</td>
                    <td class="text-right">Rs. {{ number_format($salesData['total_bank_transfer'] ?? 0, 2) }}</td>
                </tr>
            </tbody>
        </table>
    @endif

    <!-- Summary -->
    <div class="summary">
        <div class="summary-box">
            <strong>Total Amount (Rs)</strong><br />
            Rs. {{ number_format($salesData['total_amount'], 2) }}
        </div>
        <div class="summary-box">
            <strong>Total Cash (Rs)</strong><br />
            Rs. {{ number_format($salesData['total_cash'], 2) }}
        </div>
        <div class="summary-box">
            <strong>Transaction Count</strong><br />
            {{ $salesData['transaction_count'] ?? 0 }}
        </div>
    </div>

    <!-- Footer -->
    <div class="footer">
        <p>Generated on {{ now()->format('d/m/Y') }} at {{ now()->format('H:i:s') }}</p>
        <p>This is a computer-generated report.</p>
    </div>
</body>
</html>

<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Bank Account Ledger - {{ $bankAccount->account_name }}</title>
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
        .company-name {
            font-size: 18px;
            font-weight: bold;
            color: #1a202c;
            margin-bottom: 5px;
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
            width: 25%;
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
            font-size: 14px;
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
        .text-success { color: #38a169; }
        .text-danger { color: #e53e3e; }
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
        $companyObj = is_array($bankAccount->company) ? (object) $bankAccount->company : clone $bankAccount->company;
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
        <!-- <div class="company-name">{{ $companyName }}</div> -->
        <div class="report-title">Bank Account Ledger</div>
        <div style="font-size: 12px; margin-top: 5px;">
            <strong>Account:</strong> {{ $bankAccount->account_name }} - {{ $bankAccount->account_number }} ({{ str_replace('_', ' ', Str::title($bankAccount->account_type)) }})
        </div>
        <div style="font-size: 10px; margin-top: 5px;">
            <strong>Period:</strong> {{ $fromDate ? \Carbon\Carbon::parse($fromDate)->format('d M Y') : 'Start' }} to {{ $toDate ? \Carbon\Carbon::parse($toDate)->format('d M Y') : 'Present' }}
            <br>
            Generated on: {{ date('d/m/Y H:i:s') }}
        </div>
    </div>

    <!-- Summary Section -->
    <div class="summary-section">
        <table class="summary-table">
            <tr>
                <td>
                    <div class="summary-card">
                        <div class="summary-label">Opening Balance</div>
                        <div class="summary-value">Rs {{ number_format($stats['openingBalance'], 2) }}</div>
                    </div>
                </td>
                <td>
                    <div class="summary-card">
                        <div class="summary-label">Total Credits (Out)</div>
                        <div class="summary-value text-danger">Rs {{ number_format($stats['totalCredits'], 2) }}</div>
                    </div>
                </td>
                <td>
                    <div class="summary-card">
                        <div class="summary-label">Total Debits (In)</div>
                        <div class="summary-value text-success">Rs {{ number_format($stats['totalDebits'], 2) }}</div>
                    </div>
                </td>
                <td>
                    <div class="summary-card">
                        <div class="summary-label">Closing Balance</div>
                        <div class="summary-value">Rs {{ number_format($stats['closingBalance'], 2) }}</div>
                    </div>
                </td>
            </tr>
        </table>
    </div>

    <!-- Details Table -->
    <table>
        <thead>
            <tr>
                <th width="15%">Date</th>
                <th width="10%">Ref</th>
                <th width="35%">Description</th>
                <th width="10%">Method</th>
                <th width="10%" class="text-right">Debit (In)</th>
                <th width="10%" class="text-right">Credit (Out)</th>
                <th width="10%" class="text-right">Balance</th>
            </tr>
        </thead>
        <tbody>
            @foreach($transactions as $t)
                <tr>
                    <td>{{ \Carbon\Carbon::parse($t['date'])->format('d/m/Y, H:i') }}</td>
                    <td>{{ $t['ref'] }}</td>
                    <td>{{ $t['description'] }}</td>
                    <td>{{ $t['method'] }}</td>
                    <td class="text-right {{ $t['type'] === 'debit' ? 'text-success' : '' }}">
                        {{ $t['type'] === 'debit' ? number_format((float)$t['amount'], 2) : '' }}
                    </td>
                    <td class="text-right {{ $t['type'] === 'credit' ? 'text-danger' : '' }}">
                        {{ $t['type'] === 'credit' ? number_format((float)$t['amount'], 2) : '' }}
                    </td>
                    <td class="text-right">
                        <strong>{{ number_format((float)$t['running_balance'], 2) }}</strong>
                    </td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="footer">
        Generated by {{ config('app.name', 'Distribution System') }}
    </div>
</body>
</html>

<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Cheque Ledger</title>
    <style>
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            font-size: 9px;
            color: #333;
            line-height: 1.4;
            margin: 0;
            padding: 10px;
        }
        .header {
            text-align: center;
            margin-bottom: 15px;
            border-bottom: 2px solid #2d3748;
            padding-bottom: 10px;
        }
        .report-title {
            font-size: 14px;
            font-weight: bold;
            color: #4a5568;
            text-transform: uppercase;
        }
        .summary-table {
            width: 100%;
            margin-bottom: 15px;
        }
        .summary-table td {
            width: 25%;
            padding: 5px;
        }
        .summary-card {
            border: 1px solid #ddd;
            padding: 8px;
            border-radius: 4px;
            background-color: #f7fafc;
        }
        .summary-label {
            font-size: 9px;
            color: #718096;
            text-transform: uppercase;
            font-weight: bold;
            margin-bottom: 3px;
        }
        .summary-value {
            font-size: 12px;
            font-weight: bold;
            color: #2d3748;
        }
        .text-amber { color: #d69e2e; }
        .text-green { color: #38a169; }
        .text-red { color: #e53e3e; }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }
        th, td {
            border: 1px solid #e2e8f0;
            padding: 4px 6px;
            text-align: left;
            font-size: 8px;
        }
        th {
            background-color: #4a5568;
            color: white;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 7px;
        }
        tr:nth-child(even) {
            background-color: #f8fafc;
        }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .badge {
            display: inline-block;
            padding: 1px 5px;
            border-radius: 8px;
            font-size: 7px;
            font-weight: bold;
        }
        .badge-pending { background: #fefcbf; color: #975a16; border: 1px solid #f6e05e; }
        .badge-deposited { background: #c6f6d5; color: #276749; border: 1px solid #68d391; }
        .badge-returned { background: #fed7d7; color: #9b2c2c; border: 1px solid #fc8181; }
        .badge-dlv { background: #fefcbf; color: #975a16; border: 1px solid #f6e05e; font-size: 6px; }
        .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 8px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 8px;
        }
    </style>
</head>
<body>
    <?php
        $companyName = $company['name'] ?? config('app.name', 'Distribution System');
        $companyCode = strtoupper($company['code'] ?? 'VIS001');
        $statusLabel = $status === 'all' ? 'All Statuses' : ucfirst($status);

        $vismassPng = public_path('images/vismass-logo.png');
        $malibuPng  = public_path('images/malibu-logo.png');
        $logoUrl = '';
        $logoPath = $vismassPng;
        if ($companyCode === 'MAL001') {
            $logoPath = $malibuPng;
        }
        if (file_exists($logoPath)) {
            $logoData = file_get_contents($logoPath);
            $logoUrl = 'data:image/png;base64,' . base64_encode($logoData);
        }

        $periodText = 'All dates';
        if ($dateFrom || $dateTo) {
            $from = $dateFrom ? \Carbon\Carbon::parse($dateFrom)->format('d M Y') : 'Start';
            $to = $dateTo ? \Carbon\Carbon::parse($dateTo)->format('d M Y') : 'Present';
            $periodText = $from . ' to ' . $to;
        }
    ?>

    <div class="header">
        @if($logoUrl)
            <div style="text-align: center; margin-bottom: 8px;">
                <img src="{{ $logoUrl }}" alt="{{ $companyName }}" style="height: 35px;" />
            </div>
        @endif
        <div class="report-title">Cheque Ledger</div>
        <div style="font-size: 10px; margin-top: 5px;">
            <strong>Filter:</strong> {{ $statusLabel }} &nbsp;|&nbsp; <strong>Period:</strong> {{ $periodText }}
        </div>
        <div style="font-size: 9px; margin-top: 3px; color: #718096;">
            Generated on: {{ date('d/m/Y H:i:s') }}
        </div>
    </div>

    <div>
        <table class="summary-table">
            <tr>
                <td>
                    <div class="summary-card">
                        <div class="summary-label">Total Cheques</div>
                        <div class="summary-value">{{ $summary['total_count'] }} &nbsp; Rs.{{ number_format($summary['total_amount'], 2) }}</div>
                    </div>
                </td>
                <td>
                    <div class="summary-card">
                        <div class="summary-label">Pending</div>
                        <div class="summary-value text-amber">{{ $summary['pending_count'] }} &nbsp; Rs.{{ number_format($summary['pending_amount'], 2) }}</div>
                    </div>
                </td>
                <td>
                    <div class="summary-card">
                        <div class="summary-label">Deposited</div>
                        <div class="summary-value text-green">{{ $summary['deposited_count'] }} &nbsp; Rs.{{ number_format($summary['deposited_amount'], 2) }}</div>
                    </div>
                </td>
                <td>
                    <div class="summary-card">
                        <div class="summary-label">Returned</div>
                        <div class="summary-value text-red">{{ $summary['returned_count'] }} &nbsp; Rs.{{ number_format($summary['returned_amount'], 2) }}</div>
                    </div>
                </td>
            </tr>
        </table>
    </div>

    <table>
        <thead>
            <tr>
                <th width="5%">#</th>
                <th width="7%">Type</th>
                <th width="11%">Cheque No</th>
                <th width="18%">Customer / Shop</th>
                <th width="12%">Bank</th>
                <th width="9%">Chq Date</th>
                <th width="9%" class="text-right">Amount</th>
                <th width="8%">Status</th>
                <th width="12%">Deposit Bank</th>
                <th width="9%">Deposited At</th>
            </tr>
        </thead>
        <tbody>
            @php $i = 1; @endphp
            @forelse($ledger as $item)
                @php
                    $chequeDate = $item['cheque_date'] ? \Carbon\Carbon::parse($item['cheque_date'])->format('d/m/Y') : '-';
                    $depositedAt = $item['deposited_at'] ? \Carbon\Carbon::parse($item['deposited_at'])->format('d/m/Y H:i') : '-';
                    $amount = number_format($item['amount'], 2);
                    $typeLabel = ucfirst($item['type']);
                    $statusText = ucfirst($item['status']);
                    $bankDisplay = $item['bank_name'];
                    if ($item['branch']) {
                        $bankDisplay .= ' / ' . $item['branch'];
                    }
                @endphp
                <tr>
                    <td class="text-center">{{ $i }}</td>
                    <td>{{ $typeLabel }}</td>
                    <td>{{ $item['cheque_no'] ?: '-' }}</td>
                    <td>{{ $item['customer_name'] }}</td>
                    <td>{{ $bankDisplay }}</td>
                    <td>{{ $chequeDate }}</td>
                    <td class="text-right"><strong>Rs.{{ $amount }}</strong></td>
                    <td class="text-center">
                        @if($item['status'] === 'returned')
                            <span class="badge badge-returned">Returned</span>
                        @elseif($item['status'] === 'deposited')
                            <span class="badge badge-deposited">Deposited</span>
                        @else
                            <span class="badge badge-pending">Pending</span>
                        @endif
                    </td>
                    <td>{{ $item['deposit_bank'] ?: '-' }}</td>
                    <td>{{ $depositedAt }}</td>
                </tr>
                @php $i++; @endphp
            @empty
                <tr>
                    <td colspan="10" class="text-center" style="padding: 20px; color: #718096;">
                        No cheques found matching the filter criteria.
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <div class="footer">
        Generated by {{ config('app.name', 'Distribution System') }}
    </div>
</body>
</html>

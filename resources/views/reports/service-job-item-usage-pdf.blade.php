<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Service Jobs Item Usage Report</title>
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
        .report-period {
            font-size: 11px;
            color: #718096;
            margin-top: 5px;
        }
        .summary-section {
            margin-bottom: 20px;
        }
        .summary-table {
            width: 100%;
            margin-bottom: 20px;
        }
        .summary-table td {
            width: 33.33%;
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
        $companyBranch = $companyObj->branch ?? '';
    @endphp

    <!-- Header -->
    <div class="header">
        <div style="text-align: center; margin-bottom: 8px;">
            <img src="{{ $logoUrl }}" alt="{{ $companyName }}" style="height: 40px;" />
        </div>
        <div class="report-title">Service Jobs Item Usage Report</div>
        <div class="report-period">
            All Time Usage
        </div>
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
                        <div class="summary-label">Total Records</div>
                        <div class="summary-value">{{ $reportData['summary']['total_records'] }}</div>
                    </div>
                </td>
                <td>
                    <div class="summary-card">
                        <div class="summary-label">Total Quantity Used</div>
                        <div class="summary-value" style="color: #e53e3e;">{{ $reportData['summary']['total_quantity'] }}</div>
                    </div>
                </td>
                <td>
                    <div class="summary-card">
                        <div class="summary-label">Total Value</div>
                        <div class="summary-value">Rs {{ number_format($reportData['summary']['total_amount'], 2) }}</div>
                    </div>
                </td>
            </tr>
        </table>
    </div>

    <!-- Detailed List -->
    <table>
        <thead>
            <tr>
                @if(($groupBy ?? 'job') === 'item')
                    <th>Item Code</th>
                    <th>Item Name</th>
                    <th class="text-center" width="10%">Qty Used</th>
                @else
                    <th>Date</th>
                    <th>Job Number</th>
                    <th>Customer</th>
                    <th>Item Code</th>
                    <th>Item Name</th>
                    <th class="text-center" width="10%">Qty Used</th>
                @endif
            </tr>
        </thead>
        <tbody>
            @if(($groupBy ?? 'job') === 'item')
                @foreach($reportData['items'] as $item)
                <tr style="border-top: 2px solid #e2e8f0;">
                    <td>{{ $item['item_code'] }}</td>
                    <td>
                        {{ $item['item_name'] }}
                        @if($item['item_type'] === 'service')
                            <span style="font-size: 8px; background-color: #f3e8ff; color: #7e22ce; padding: 2px 4px; border-radius: 4px; margin-left: 4px;">Service</span>
                        @endif
                    </td>
                    <td class="text-center font-bold" style="color: #dc2626;">{{ number_format((float)$item['quantity'], 2) }}</td>
                </tr>
                @endforeach
            @else
                @php $prevJobId = null; @endphp
                @foreach($reportData['items'] as $index => $item)
                @php 
                    $isSameJobAsPrev = $prevJobId === $item['job_id'];
                    $prevJobId = $item['job_id'];
                @endphp
                <tr style="{{ $isSameJobAsPrev ? 'border-top: none;' : 'border-top: 2px solid #e2e8f0;' }}">
                    <td style="vertical-align: top; {{ $isSameJobAsPrev ? 'border-top: none;' : '' }}">{{ $isSameJobAsPrev ? '' : $item['received_date'] }}</td>
                    <td style="vertical-align: top; {{ $isSameJobAsPrev ? 'border-top: none;' : '' }}">{{ $isSameJobAsPrev ? '' : $item['job_number'] }}</td>
                    <td style="vertical-align: top; {{ $isSameJobAsPrev ? 'border-top: none;' : '' }}">{{ $isSameJobAsPrev ? '' : $item['customer_name'] }}</td>
                    <td style="{{ $isSameJobAsPrev ? 'border-top: none;' : '' }}">{{ $item['item_code'] }}</td>
                    <td style="{{ $isSameJobAsPrev ? 'border-top: none;' : '' }}">
                        {{ $item['item_name'] }}
                        @if($item['item_type'] === 'service')
                            <span style="font-size: 8px; background-color: #f3e8ff; color: #7e22ce; padding: 2px 4px; border-radius: 4px; margin-left: 4px;">Service</span>
                        @endif
                    </td>
                    <td class="text-center font-bold" style="color: #dc2626; {{ $isSameJobAsPrev ? 'border-top: none;' : '' }}">{{ number_format((float)$item['quantity'], 2) }}</td>
                </tr>
                @endforeach
            @endif
        </tbody>
        <tfoot>
            <tr>
                <td colspan="{{ ($groupBy ?? 'job') === 'item' ? 2 : 5 }}" class="text-right" style="font-weight: bold;">Total</td>
                <td class="text-center" style="font-weight: bold; color: #e53e3e;">{{ number_format($reportData['summary']['total_quantity'], 2) }}</td>
            </tr>
        </tfoot>
    </table>

    <!-- Footer -->
    <div class="footer">
        <div>{{ $companyName }} - Service Jobs Item Usage Report</div>
        <div>This is a system generated report</div>
    </div>
</body>
</html>

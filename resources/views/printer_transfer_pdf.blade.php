<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Printer Transfer Report</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
        }

        .container {
            max-width: 900px;
            margin: 0 auto;
        }

        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #1e40af;
            padding-bottom: 20px;
        }

        .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 5px;
        }

        .document-title {
            font-size: 18px;
            font-weight: bold;
            color: #333;
            margin-top: 10px;
        }

        .info-section {
            display: table;
            width: 100%;
            margin-bottom: 25px;
        }

        .info-column {
            display: table-cell;
            width: 50%;
            vertical-align: top;
            padding: 10px;
        }

        .info-label {
            font-weight: bold;
            color: #1e40af;
            font-size: 12px;
            text-transform: uppercase;
            margin-bottom: 5px;
        }

        .info-value {
            font-size: 14px;
            margin-bottom: 15px;
            color: #333;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
        }

        th {
            background-color: #1e40af;
            color: white;
            padding: 8px;
            text-align: left;
            font-weight: bold;
            font-size: 11px;
            text-transform: uppercase;
            border: 1px solid #1e40af;
        }

        td {
            padding: 8px;
            border: 1px solid #ddd;
            font-size: 12px;
        }

        tr:nth-child(even) {
            background-color: #f9fafb;
        }

        tr:hover {
            background-color: #f0f4ff;
        }

        .text-right {
            text-align: right;
        }

        .text-center {
            text-align: center;
        }

        .total-row {
            background-color: #eff6ff;
            font-weight: bold;
            border-top: 2px solid #1e40af;
        }

        .total-label {
            color: #1e40af;
        }

        .total-value {
            color: #1e40af;
            font-weight: bold;
        }

        .notes-section {
            margin-top: 25px;
            padding: 15px;
            background-color: #f9fafb;
            border-left: 4px solid #1e40af;
            border-radius: 4px;
        }

        .notes-label {
            font-weight: bold;
            color: #1e40af;
            font-size: 12px;
            text-transform: uppercase;
            margin-bottom: 8px;
        }

        .notes-value {
            color: #333;
            font-size: 13px;
            line-height: 1.6;
            white-space: pre-wrap;
        }

        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 11px;
            color: #666;
            display: table;
            width: 100%;
        }

        .footer-column {
            display: table-cell;
            width: 33.33%;
            text-align: center;
            vertical-align: top;
            padding: 10px;
        }

        .section-header {
            font-weight: bold;
            color: #1e40af;
            font-size: 12px;
            margin-top: 20px;
            margin-bottom: 10px;
            padding: 10px 0;
            border-bottom: 2px solid #dbeafe;
        }

        .empty-state {
            padding: 40px;
            text-align: center;
            color: #999;
            font-size: 14px;
        }

        .transfer-arrow {
            text-align: center;
            color: #1e40af;
            font-size: 16px;
            font-weight: bold;
            margin: 10px 0;
        }

        .preview-badge {
            background-color: #fef3c7;
            color: #92400e;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            display: inline-block;
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    @php
        // Determine company for report (fall back to auth user's company or first record)
        $company = null;
        if (function_exists('auth') && auth()->check()) {
            $company = \App\Models\Company::where('company_code', auth()->user()->company_code)->first();
        }
        $company = $company ?? \App\Models\Company::first();

        $companyCode = strtoupper($company->company_code ?? 'VIS001');
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

        $logoData = base64_encode(@file_get_contents($logoPath));
        $logoSrc  = $logoData ? 'data:image/png;base64,' . $logoData : '';

        $companyName = $company_name ?? ($company->name ?? 'Company');
    @endphp

    <div class="container">
        @if(isset($is_preview) && $is_preview)
            <div class="preview-badge">PREVIEW MODE - Not Yet Executed</div>
        @endif

        <!-- Header -->
        <div class="header">
            <div style="margin-bottom: 8px;">
                <img src="{{ $logoSrc }}" alt="{{ $companyName }}" style="height: 40px;" />
            </div>
            <!-- <div class="company-name">{{ $companyName }}</div> -->
            <div class="document-title">PRINTER TRANSFER REPORT</div>
        </div>

        <!-- Transfer Information -->
        <div class="info-section">
            <div class="info-column">
                <div class="info-label">Transaction No</div>
                <div class="info-value">{{ $transfer_number ?? 'N/A' }}</div>

                <div class="info-label">From Section</div>
                <div class="info-value">{{ $from_section }}</div>
            </div>
            <div class="info-column">
               
                <div class="info-label">Transfer Date</div>
                <div class="info-value">
                    {{ \Carbon\Carbon::parse($transfer_date)->format('d M Y') }}
                </div>

                <div class="info-label">To Section</div>
                <div class="info-value">{{ $to_section }}</div>
            </div>
        </div>

        <!-- Printers Section -->
        @if(count($items) > 0)
            <div class="section-header">Transfer Printers</div>
            <table>
                <thead>
                    <tr>
                        <!-- <th style="width: 12%;">Trans No</th> -->
                        <th style="width: 15%; text-align: center;">Serial No</th>
                        <th style="width: 10%; text-align: center;">Brand</th>
                        <th style="width: 10%; text-align: center;">Model</th>
                        <!-- <th style="width: 8%;">Transfer Serial</th>
                        <th style="width: 6%;">Transfer Brand</th>
                        <th style="width: 6%;">Transfer Model</th> -->
                        <th style="width: 10%; text-align: center;">Batch No</th>
                        <th style="width: 8%; text-align: center;">Warranty</th>
                        <!-- <th style="width: 10%; text-align: right;">Cost Price</th> -->
                    </tr>
                </thead>
                <tbody>
                    @foreach($items as $item)
                        <tr>
                            <!-- <td>{{ $item['transfer_number'] ?? '-' }}</td> -->
                            <td>{{ $item['original_serial_number'] ?: '-' }}</td>
                            <td>{{ $item['original_brand'] ?: '-' }}</td>
                            <td>{{ $item['original_model'] ?: '-' }}</td>
                            {{-- <td>{{ $item['serial_number'] ?: '-' }}</td>
                            <td>{{ $item['brand'] ?: '-' }}</td>
                            <td>{{ $item['model'] ?: '-' }}</td> --}}
                            <td>{{ $item['batch_no'] ?: '-' }}</td>
                            <td>{{ $item['warranty'] ?: '-' }}</td>
                            <!-- <td style="text-align: right;">{{ number_format($item['cost_price'], 2) }}</td> -->
                        </tr>
                    @endforeach
                    <!-- <tr class="total-row">
                        <td colspan="5" class="text-right total-label">Grand Total</td>
                        <td class="text-right total-value">{{ number_format($total_cost_value, 2) }}</td>
                    </tr> -->
                </tbody>
            </table>
        @else
            <div class="empty-state">
                No printers in this transfer
            </div>
        @endif

        <!-- Notes Section -->
        @if($notes)
            <div class="notes-section">
                <div class="notes-label">Notes</div>
                <div class="notes-value">{{ $notes }}</div>
            </div>
        @endif

        <!-- Signature/approval section -->
        <div class="approval-section" style="margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px;">
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <tr>
                    <td style="width: 33.33%; padding: 8px; vertical-align: top;">
                        <div style="font-weight: bold; margin-bottom: 20px;">Prepared By:</div>
                        <div style="height: 45px; border-bottom: 1px solid #999; margin-bottom: 4px;"></div>
                        <div style="font-size: 11px; color: #666;">Name / Signature / Date</div>
                    </td>
                    <td style="width: 33.33%; padding: 8px; vertical-align: top;">
                        <div style="font-weight: bold; margin-bottom: 20px;">Authorised By:</div>
                        <div style="height: 45px; border-bottom: 1px solid #999; margin-bottom: 4px;"></div>
                        <div style="font-size: 11px; color: #666;">Name / Signature / Date</div>
                    </td>
                    <td style="width: 33.33%; padding: 8px; vertical-align: top;">
                        <div style="font-weight: bold; margin-bottom: 20px;">Check By:</div>
                        <div style="height: 45px; border-bottom: 1px solid #999; margin-bottom: 4px;"></div>
                        <div style="font-size: 11px; color: #666;">Name / Signature / Date</div>
                    </td>
                </tr>
            </table>
        </div>

        <!-- Footer -->
        <!-- <div class="footer">
            <div class="footer-column">
                <strong>Generated By:</strong><br>
                {{ $generated_by }}
            </div>
            <div class="footer-column">
                <strong>Generated On:</strong><br>
                {{ $generated_at }}
            </div>
            <div class="footer-column">
                <strong>Status:</strong><br>
                @if(isset($is_preview) && $is_preview)
                    Preview Mode
                @else
                    Official Record
                @endif
            </div>
        </div> -->
    </div>
</body>
</html>
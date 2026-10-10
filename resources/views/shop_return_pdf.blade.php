<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Shop Return Report</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 10px;
            color: #333;
        }

        .container {
            max-width: 900px;
            margin: 0 auto;
            padding: 0;
        }

        .header {
            text-align: center;
            margin-bottom: 12px;
            border-bottom: 2px solid #1e40af;
            padding-bottom: 10px;
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
            margin-bottom: 12px;
        }

        .info-column {
            display: table-cell;
            width: 50%;
            vertical-align: top;
            padding: 6px;
        }

        .info-label {
            font-weight: bold;
            color: #1e40af;
            font-size: 11px;
            text-transform: uppercase;
            margin-bottom: 3px;
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
            font-size: 11px;
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
            margin-top: 12px;
            padding: 10px;
            background-color: #f9fafb;
            border-left: 4px solid #1e40af;
            border-radius: 3px;
        }

        .notes-label {
            font-weight: bold;
            color: #1e40af;
            font-size: 11px;
            text-transform: uppercase;
            margin-bottom: 5px;
        }

        .notes-value {
            color: #333;
            font-size: 13px;
            line-height: 1.6;
            white-space: pre-wrap;
        }

        .footer {
            margin-top: 15px;
            padding-top: 8px;
            border-top: 1px solid #ddd;
            font-size: 10px;
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
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        @php
            $companyCode = strtoupper($company->company_code ?? 'VIS001');

            // Ensure we use the correct case-sensitive filenames (Linux) when available.
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
            $logoSrc = $logoData ? 'data:image/png;base64,' . base64_encode($logoData) : '';

            $companyName = $company->name ?? 'Company';
        @endphp

        <div class="header">
            <div style="margin-bottom: 8px;">
                <img src="{{ $logoSrc }}" alt="{{ $companyName }}" style="height: 40px;" />
            </div>
            <div class="document-title">SHOP RETURN REPORT</div>
            <div style="font-size: 14px; margin-top: 5px; color: #555;">Reference No: SR-{{ str_pad($shopReturn->id, 6, '0', STR_PAD_LEFT) }}</div>
        </div>

        <!-- Info Information -->
        <div class="info-section">
            <div class="info-column">
                <div class="info-label">Return Date</div>
                <div class="info-value">
                    {{ \Carbon\Carbon::parse($shopReturn->return_date)->format('d M Y') }}
                </div>

                <div class="info-label">Shop</div>
                <div class="info-value">{{ $shopReturn->shop->name ?? 'N/A' }}</div>
                
                <div class="info-label">Vehicle</div>
                <div class="info-value">{{ $shopReturn->vehicle->registration_no ?? 'Direct to Stock' }}</div>
            </div>
            <div class="info-column">
                <div class="info-label">Status</div>
                <div class="info-value" style="text-transform: uppercase;">{{ $shopReturn->status ?? 'Completed' }}</div>

                <div class="info-label">Recorded By</div>
                <div class="info-value">{{ $shopReturn->user->name ?? 'System' }}</div>

                <div class="info-label">Document Generated</div>
                <div class="info-value">{{ $generated_at }}</div>
            </div>
        </div>

        <!-- Items Section -->
        @if(count($shopReturn->items) > 0)
            <div class="section-header">Returned Items</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 5%;">#</th>
                        <th class="text-center" style="width: 15%;">Item Code</th>
                        <th class="text-center" style="width: 30%;">Item Name</th>
                        <th class="text-center" style="width: 15%;">Batch No</th>
                        <th class="text-center" style="width: 10%;">Quantity</th>
                        <th class="text-right" style="width: 10%;">Unit Price (Rs)</th>
                        <th class="text-right" style="width: 15%;">Subtotal (Rs)</th>
                    </tr>
                </thead>
                <tbody>
                    @php $totalReturn = 0; @endphp
                    @foreach($shopReturn->items as $item)
                        @php 
                            $subtotal = $item->quantity * $item->unit_price; 
                            $totalReturn += $subtotal;
                        @endphp
                        <tr>
                            <td>{{ $loop->iteration }}</td>
                            <td>{{ $item->ItemCode ?? $item->item_code }}</td>
                            <td>{{ $item->item_name ?? 'Unknown Item' }}</td>
                            <td class="text-center">{{ $item->batch_no ?? 'N/A' }}</td>
                            <td class="text-center">{{ number_format($item->quantity, 2) }}</td>
                            <td class="text-right">{{ number_format($item->unit_price, 2) }}</td>
                            <td class="text-right">{{ number_format($subtotal, 2) }}</td>
                        </tr>
                    @endforeach
                    <tr class="total-row">
                        <td colspan="6" class="text-right total-label">Total Return Value</td>
                        <td class="text-right total-value">{{ number_format($totalReturn, 2) }}</td>
                    </tr>
                    @if($shopReturn->refund_method)
                    <tr class="total-row">
                        <td colspan="6" class="text-right total-label">Refund Method</td>
                        <td class="text-right total-value" style="text-transform: uppercase;">{{ $shopReturn->refund_method }}</td>
                    </tr>
                    <tr class="total-row">
                        <td colspan="6" class="text-right total-label">Refund Amount</td>
                        <td class="text-right total-value">{{ number_format($shopReturn->refund_amount, 2) }}</td>
                    </tr>
                    @endif
                </tbody>
            </table>
        @else
            <div class="empty-state">
                No items in this return
            </div>
        @endif

        <!-- Notes Section -->
        @if($shopReturn->notes)
            <div class="notes-section">
                <div class="notes-label">Internal Notes</div>
                <div class="notes-value">{{ $shopReturn->notes }}</div>
            </div>
        @endif

        <!-- Signature/approval section -->
        <div class="approval-section" style="margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px;">
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 0;">
                <tr>
                    <td style="width: 50%; padding: 8px; vertical-align: top; border: none;">
                        <div style="font-weight: bold; margin-bottom: 20px;">Prepared By:</div>
                        <div style="height: 45px; border-bottom: 1px solid #999; margin-bottom: 4px; width: 80%;"></div>
                        <div style="font-size: 11px; color: #666;">Name / Signature / Date</div>
                    </td>
                    <td style="width: 50%; padding: 8px; vertical-align: top; border: none;">
                        <div style="font-weight: bold; margin-bottom: 20px;">Authorized By:</div>
                        <div style="height: 45px; border-bottom: 1px solid #999; margin-bottom: 4px; width: 80%;"></div>
                        <div style="font-size: 11px; color: #666;">Name / Signature / Date</div>
                    </td>
                </tr>
            </table>
        </div>

    </div>
</body>
</html>

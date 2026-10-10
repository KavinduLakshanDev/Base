<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Cash Reconciliation Report</title>
    <style>
        /* POS Receipt Styles - Optimized for 80mm roll */
        @page {
            margin: 0;
        }
        
        body {
            font-family: 'Courier', 'Arial', sans-serif;
            font-size: 9pt;
            line-height: 1.1;
            color: #000;
            margin: 0;
            padding: 2mm;
            width: 74mm; /* Leave small margin for 80mm roll */
            font-weight: bold;
        }

        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .mb-1 { margin-bottom: 2pt; }
        .mb-2 { margin-bottom: 4pt; }
        .dotted-line { border-top: 1pt dashed #000; margin: 4pt 0; }
        .solid-line { border-top: 1pt solid #000; margin: 4pt 0; }

        .header h1 {
            font-size: 11pt;
            margin: 0;
            text-transform: uppercase;
        }

        .section-title {
            font-size: 9pt;
            font-weight: bold;
            text-transform: uppercase;
            margin: 4pt 0 2pt 0;
            text-decoration: underline;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9pt;
        }

        .summary-table td {
            padding: 1pt 0;
        }

        .denom-table th {
            border-bottom: 0.5pt solid #000;
            padding-bottom: 1pt;
            font-size: 8pt;
        }

        .denom-table td {
            padding: 1.5pt 0;
        }

        .status-box {
            margin: 4pt 0;
            padding: 2pt;
            border: 1pt solid #000;
            text-align: center;
            font-weight: bold;
        }

        .signature-section {
            margin-top: 10pt;
        }

        .sig-box {
            margin-top: 10pt;
            text-align: center;
        }

        .sig-line {
            border-top: 0.5pt solid #000;
            width: 80%;
            margin: 0 auto 2pt auto;
        }

        .footer {
            margin-top: 10pt;
            text-align: center;
            font-size: 8pt;
        }
        
        .indent {
            padding-left: 10px;
            font-weight: normal;
        }
    </style>
</head>
<body>
    @php
        $logoBase64 = '';
        $companyCode = strtoupper($company['code'] ?? 'VIS');
        
        $logoPath = null;
        if (str_contains($companyCode, 'MAL')) {
            $logoPath = public_path('images/malibu-logo.png');
        } else {
            $logoPath = public_path('images/Vismass-logo.png');
        }

        if ($logoPath && file_exists($logoPath)) {
            $type = pathinfo($logoPath, PATHINFO_EXTENSION);
            $data = file_get_contents($logoPath);
            $logoBase64 = 'data:image/' . ($type === 'svg' ? 'svg+xml' : $type) . ';base64,' . base64_encode($data);
        }
    @endphp

    <div class="header text-center">
        @if($logoBase64)
            <img src="{{ $logoBase64 }}" alt="Logo" style="height: 35px; margin-bottom: 2pt;" />
        @endif
        <div class="font-bold">CASH RECONCILIATION</div>
        <div style="font-size: 8pt;">{{ $company['section'] ?? '' }}</div>
    </div>

    <div class="dotted-line"></div>

    <div class="mb-2">
        <div><strong>Date:</strong> {{ $reconciliation->reconciliation_date->format('Y-m-d') }}</div>
        <div><strong>User:</strong> {{ trim(($reconciliation->user->first_name ?? '') . ' ' . ($reconciliation->user->last_name ?? '')) ?: $reconciliation->username }}</div>
        <div><strong>Time:</strong> {{ $generated_at }}</div>
    </div>

    <div class="dotted-line"></div>

    <div class="section-title">Day Sales Summery</div>
    <table class="summary-table">
        <tr>
            <td class="indent">Cash Payments</td>
            <td class="text-right">{{ number_format($reconciliation->sales_cash ?? 0, 2) }}</td>
        </tr>
        <tr>
            <td class="indent">Card Payments</td>
            <td class="text-right">{{ number_format($reconciliation->sales_card ?? 0, 2) }}</td>
        </tr>
        <tr>
            <td class="indent">Bank Transfer</td>
            <td class="text-right">{{ number_format($reconciliation->sales_bank ?? 0, 2) }}</td>
        </tr>
        <tr>
            <td class="indent">Chq Payments</td>
            <td class="text-right">{{ number_format($reconciliation->sales_cheque ?? 0, 2) }}</td>
        </tr>
        <tr><td colspan="2"><div class="dotted-line" style="margin: 2pt 0;"></div></td></tr>
        <tr class="font-bold">
            @php
                $saleForTheDay = ($reconciliation->sales_cash ?? 0) + ($reconciliation->sales_card ?? 0) + ($reconciliation->sales_bank ?? 0) + ($reconciliation->sales_cheque ?? 0);
            @endphp
            <td>Sales for the Day</td>
            <td class="text-right">{{ number_format($saleForTheDay, 2) }}</td>
        </tr>
        <tr>
            <td class="indent">Credit Sales (Unpaid)</td>
            <td class="text-right">{{ number_format($reconciliation->sales_credit ?? 0, 2) }}</td>
        </tr>
        <tr>
            <td class="indent">Cr Applied (Adv)</td>
            <td class="text-right">{{ number_format($reconciliation->sales_credit_applied ?? 0, 2) }}</td>
        </tr>
        <tr><td colspan="2"><div class="dotted-line" style="margin: 2pt 0;"></div></td></tr>
        <tr class="font-bold">
            <td>Sale with Credit Sales</td>
            <td class="text-right">{{ number_format($saleForTheDay + ($reconciliation->sales_credit ?? 0), 2) }}</td>
        </tr>
        <tr>
            <td>Sales Returns</td>
            <td class="text-right">({{ number_format($reconciliation->sales_returns ?? 0, 2) }})</td>
        </tr>
    </table>

    <div class="section-title">Credit Sale Paymentss</div>
    <table class="summary-table">
        <tr>
            <td class="indent">Cash</td>
            <td class="text-right">{{ number_format($reconciliation->collections_cash ?? 0, 2) }}</td>
        </tr>
        <tr>
            <td class="indent">Card</td>
            <td class="text-right">{{ number_format($reconciliation->collections_card ?? 0, 2) }}</td>
        </tr>
        <tr>
            <td class="indent">Bank</td>
            <td class="text-right">{{ number_format($reconciliation->collections_bank ?? 0, 2) }}</td>
        </tr>
        <tr>
            <td class="indent">Chq</td>
            <td class="text-right">{{ number_format($reconciliation->collections_cheque ?? 0, 2) }}</td>
        </tr>
        <tr>
            <td class="indent">Cr Applied (Adv)</td>
            <td class="text-right">{{ number_format($reconciliation->collections_credit_applied ?? 0, 2) }}</td>
        </tr>
        <tr><td colspan="2"><div class="dotted-line" style="margin: 2pt 0;"></div></td></tr>
        <tr class="font-bold">
            @php
                $totalCollections = ($reconciliation->collections_cash ?? 0) + ($reconciliation->collections_card ?? 0) + ($reconciliation->collections_bank ?? 0) + ($reconciliation->collections_cheque ?? 0);
            @endphp
            <td>Total Payments</td>
            <td class="text-right">{{ number_format($totalCollections, 2) }}</td>
        </tr>
    </table>

    <div class="dotted-line"></div>

    <div class="section-title">Physical Denominations</div>
    <table class="denom-table">
        <thead>
            <tr>
                <th class="text-left" style="width: 30%;">Denom</th>
                <th class="text-center" style="width: 25%;">Qty</th>
                <th class="text-right" style="width: 45%;">Amount</th>
            </tr>
        </thead>
        <tbody>
            <tr><td class="text-left">5000</td><td class="text-center">{{ $reconciliation->notes_5000 ?? 0 }}</td><td class="text-right">{{ number_format(($reconciliation->notes_5000 ?? 0) * 5000, 2) }}</td></tr>
            <tr><td class="text-left">2000</td><td class="text-center">{{ $reconciliation->notes_2000 ?? 0 }}</td><td class="text-right">{{ number_format(($reconciliation->notes_2000 ?? 0) * 2000, 2) }}</td></tr>
            <tr><td class="text-left">1000</td><td class="text-center">{{ $reconciliation->notes_1000 ?? 0 }}</td><td class="text-right">{{ number_format(($reconciliation->notes_1000 ?? 0) * 1000, 2) }}</td></tr>
            <tr><td class="text-left">500</td><td class="text-center">{{ $reconciliation->notes_500 ?? 0 }}</td><td class="text-right">{{ number_format(($reconciliation->notes_500 ?? 0) * 500, 2) }}</td></tr>
            <tr><td class="text-left">100</td><td class="text-center">{{ $reconciliation->notes_100 ?? 0 }}</td><td class="text-right">{{ number_format(($reconciliation->notes_100 ?? 0) * 100, 2) }}</td></tr>
            <tr><td class="text-left">50</td><td class="text-center">{{ $reconciliation->notes_50 ?? 0 }}</td><td class="text-right">{{ number_format(($reconciliation->notes_50 ?? 0) * 50, 2) }}</td></tr>
            <tr><td class="text-left">20</td><td class="text-center">{{ $reconciliation->notes_20 ?? 0 }}</td><td class="text-right">{{ number_format(($reconciliation->notes_20 ?? 0) * 20, 2) }}</td></tr>
            <tr><td class="text-left">Coins</td><td class="text-center">-</td><td class="text-right">{{ number_format($reconciliation->coins ?? 0, 2) }}</td></tr>
            <tr><td colspan="3"><div class="dotted-line" style="margin: 2pt 0;"></div></td></tr>
            <tr class="font-bold">
                <td colspan="2">Cash Total</td>
                <td class="text-right">{{ number_format($reconciliation->actual_cash, 2) }}</td>
            </tr>
            <tr class="font-bold">
                <td colspan="2">Opening B/B/F</td>
                <td class="text-right">{{ number_format($reconciliation->opening_balance, 2) }}</td>
            </tr>
            <tr class="font-bold">
                <td colspan="2">Transfers (Out)</td>
                <td class="text-right">({{ number_format($reconciliation->transfers ?? 0, 2) }})</td>
            </tr>
            <tr><td colspan="3"><div class="dotted-line" style="margin: 2pt 0;"></div></td></tr>
            <tr class="font-bold" style="font-size: 11pt;">
                <td colspan="2">Closing B/B/F</td>
                <td class="text-right">{{ number_format($reconciliation->bbf ?? 0, 2) }}</td>
            </tr>
        </tbody>
    </table>

    <div class="solid-line"></div>

    <table class="summary-table">
        <tr>
            <td>Expenses</td>
            <td class="text-right">({{ number_format($reconciliation->expenses, 2) }})</td>
        </tr>
        <tr class="font-bold" style="font-size: 11pt;">
            <td style="padding-top: 4pt;">Cash Count</td>
            <td class="text-right" style="padding-top: 4pt;">{{ number_format($reconciliation->expected_closing, 2) }}</td>
        </tr>
        <tr class="font-bold" style="font-size: 11pt;">
            <td>CASH VARIANCE</td>
            <td class="text-right">{{ number_format($reconciliation->variance, 2) }}</td>
        </tr>
    </table>
    
    <div class="solid-line"></div>
    
    <table class="summary-table">
        <tr>
            <td>Expected Cheques</td>
            <td class="text-right">{{ number_format($reconciliation->expected_cheques ?? 0, 2) }}</td>
        </tr>
        <tr>
            <td>Actual Cheques</td>
            <td class="text-right">{{ number_format($reconciliation->actual_cheques_amount ?? 0, 2) }}</td>
        </tr>
        <tr class="font-bold">
            <td>CHQ VARIANCE</td>
            <td class="text-right">{{ number_format($reconciliation->cheque_variance ?? 0, 2) }}</td>
        </tr>
    </table>

    @php
        $var = (float)$reconciliation->variance;
        $statusText = 'BALANCED';
        if ($var < -0.01) $statusText = 'SHORTAGE';
        elseif ($var > 0.01) $statusText = 'SURPLUS';
    @endphp
    <div class="status-box">
        STATUS: {{ $statusText }}
    </div>

    @if($reconciliation->notes)
    <div class="mb-2" style="font-size: 8pt;">
        <strong>Notes:</strong> {{ $reconciliation->notes }}
    </div>
    @endif

    <div class="signature-section">
        <div class="sig-box">
            <div class="sig-line"></div>
            <div style="font-size: 8pt;">Prepared By</div>
            <div style="font-size: 7pt;">{{ $reconciliation->username ?? '' }}</div>
        </div>
        <div class="sig-box">
            <div class="sig-line"></div>
            <div style="font-size: 8pt;">Checked By</div>
        </div>
    </div>

    <div class="footer">
        <div>Generated by: {{ $generated_by }}</div>
        <div class="font-bold" style="margin-top: 4pt;">Powered by UNITEC Software Solutions</div>
    </div>
</body>
</html>

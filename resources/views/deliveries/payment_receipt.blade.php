<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Payment Receipt - {{ $delivery->delivery_number }}</title>
    <style>
        /* Paper setup for 80mm POS roll */
        @page {
            size: 80mm auto;
            margin: 0;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        /* Body layout exactly as per sales invoice */
        body {
            font-family: "Courier New", monospace;
            font-size: 14px;
            width: 70mm;
            margin: 0 auto;
            padding: 2mm;
            background: #fff;
            color: #000;
            line-height: 1.35;
            font-weight: 600;
        }

        .center { text-align: center; }
        .right  { text-align: right; }
        .bold   { font-weight: bold; }

        /* Sub text */
        .sub {
            font-size: 14px;
            text-align: center;
            margin: 1px 0;
            font-weight: 600;
        }

        /* Bill title exactly as per sales invoice */
        .bill-title {
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 2px 0;
            font-size: 14px;
            font-weight: bold;
            text-align: center;
            margin: 3px 0;
        }

        /* Separator line exactly as per sales invoice */
        .sep {
            border-top: 1px dashed #000;
            margin: 3px 0;
        }

        /* Info table exactly as per sales invoice */
        .info-tbl {
            width: 100%;
            border-collapse: collapse;
        }

        .info-tbl td {
            font-size: 14px;
            padding: 2px 0;
            line-height: 1.4;
            font-weight: 600;
        }

        .info-tbl td.lbl {
            width: 55%;
        }

        .info-tbl td.val {
            text-align: right;
        }

        /* Amount Highlight Box */
        .amount-box {
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 5px 0;
            margin: 5px 0;
            text-align: center;
        }

        .amount-text {
            font-size: 18px;
            font-weight: bold;
        }

        /* Paid Stamp */
        .paid-stamp {
            border: 3px solid #000;
            border-radius: 4px;
            text-align: center;
            font-size: 20px;
            font-weight: bold;
            letter-spacing: 4px;
            padding: 4px 8px;
            margin: 8px 0;
        }

        /* Footer exactly as per sales invoice */
        .footer {
            margin-top: 6px;
            text-align: center;
            font-size: 10px;
            border-top: 1px dashed #000;
            padding-top: 4px;
            line-height: 1.5;
            font-weight: 600;
        }

        /* Space for paper cutter */
        .cut-space {
            height: 35px;
        }

        /* Print rules */
        @media print {
            html, body {
                width: 72mm;
                margin: 0 auto;
                padding: 0;
                font-size: 12px;
            }
            * {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                color-adjust: exact;
            }
            @page {
                size: 80mm auto;
                margin: 0;
            }
        }
    </style>
</head>
<body>

    @php
        // Determine company for receipt (fallback to auth user's company or first record)
        $company = null;
        if (function_exists('auth') && auth()->check()) {
            $company = \App\Models\Company::where('company_code', auth()->user()->company_code)->first();
        }
        $company = $company ?? \App\Models\Company::first();

        // Logo Logic (Base64 for rendering reliability)
        $logoBase64 = '';
        $companyCode = strtoupper($company->company_code ?? 'VIS');
        
        $vismassPngCandidates = [public_path('images/Vismass-logo.png'), public_path('images/vismass-logo.png')];
        $malibuPngCandidates = [public_path('images/Malibu-logo.png'), public_path('images/malibu-logo.png')];

        $logoPath = null;
        if (str_contains($companyCode, 'MAL')) {
            foreach ($malibuPngCandidates as $c) { if (file_exists($c)) { $logoPath = $c; break; } }
        } else {
            foreach ($vismassPngCandidates as $c) { if (file_exists($c)) { $logoPath = $c; break; } }
        }

        if ($logoPath && file_exists($logoPath)) {
            $type = pathinfo($logoPath, PATHINFO_EXTENSION);
            $data = @file_get_contents($logoPath);
            if ($data) {
                $logoBase64 = 'data:image/' . ($type === 'svg' ? 'svg+xml' : $type) . ';base64,' . base64_encode($data);
            }
        }
        
        $companyName = $company->name ?? 'VISMASS';
    @endphp

    <div style="text-align:center; margin-bottom:2px;">
        @if($logoBase64)
            <img src="{{ $logoBase64 }}" alt="Logo" style="height: 50px; display:block; margin: 0 auto;" />
        @else
            <div class="bold" style="font-size:18px;">{{ $companyName }}</div>
        @endif
    </div>
    
    <div class="sub">{{ $company->address ?? '' }}</div>
    <div class="sub">Tel: {{ $company->phone ?? '' }}</div>

    <div class="bill-title">PAYMENT RECEIPT</div>

    <table class="info-tbl">
        <tr><td class="lbl">Date:</td><td class="val">{{ \Carbon\Carbon::parse($payment->payment_date)->format('Y-m-d H:i') }}</td></tr>
        <tr><td class="lbl">Receipt No:</td><td class="val bold">PMT-{{ str_pad($payment->id, 6, '0', STR_PAD_LEFT) }}</td></tr>
        <tr><td class="lbl">Customer:</td><td class="val">
            @if($delivery->shop)
                {{ $delivery->shop->name }}
            @else
                {{ $delivery->customer_name ?: 'Walk-in' }}
            @endif
        </td></tr>
        <tr><td class="lbl">Invoice Ref:</td><td class="val">{{ $delivery->delivery_number }}</td></tr>
    </table>

    <div class="sep"></div>

    <table class="info-tbl">
        <tr><td class="lbl">Payment Mode:</td><td class="val">
            @if($payment->method === 'cash') CASH
            @elseif($payment->method === 'cheque') CHEQUE
            @elseif($payment->method === 'transfer') BANK TRANSFER
            @elseif($payment->method === 'card') CARD PAYMENT
            @else {{ strtoupper($payment->method) }} @endif
        </td></tr>
        @if($payment->reference_no || $payment->cheque_no)
            <tr>
                <td class="lbl">
                    @if($payment->method === 'cheque') Cheque No:
                    @else Reference No: @endif
                </td>
                <td class="val">{{ $payment->reference_no ?? $payment->cheque_no }}</td>
            </tr>
        @endif
        @if($payment->bank_name)
            <tr><td class="lbl">Bank:</td><td class="val">{{ $payment->bank_name }}</td></tr>
        @endif
    </table>

    <div class="sep"></div>

    <div class="amount-box">
        <div style="font-size: 12px; margin-bottom: 2px;">AMOUNT PAID</div>
        <div class="amount-text">Rs {{ number_format($payment->amount, 2) }}</div>
    </div>

    <table class="info-tbl">
        <tr><td class="lbl">Invoice Total:</td><td class="val">{{ number_format($delivery->total_amount, 2) }}</td></tr>
        <tr><td class="lbl">Total Paid:</td><td class="val">{{ number_format($delivery->paid_amount, 2) }}</td></tr>
        <tr class="bold"><td>INV BALANCE</td><td class="val">Rs {{ number_format($delivery->outstanding_balance, 2) }}</td></tr>
    </table>

    @if(isset($outstandingDeliveries) && $outstandingDeliveries->count() > 0)
        <div class="sep"></div>
        <div class="center bold" style="margin-bottom: 4px; font-size:12px;">ACCOUNT SUMMARY</div>
        <table class="info-tbl">
            @foreach($outstandingDeliveries as $d)
                <tr>
                    <td style="font-size: 12px;">{{ $d->delivery_number }}</td>
                    <td class="val" style="font-size: 12px;">{{ number_format($d->outstanding_balance, 2) }}</td>
                </tr>
            @endforeach
            <tr style="border-top: 1px solid #000;">
                <td class="bold">TOTAL DUE:</td>
                <td class="val bold" style="font-size: 14px;">Rs {{ number_format($outstandingDeliveries->sum('outstanding_balance'), 2) }}</td>
            </tr>
        </table>
    @endif

    @if($delivery->payment_status === 'paid')
        <div class="paid-stamp">PAID IN FULL</div>
    @elseif($delivery->payment_status === 'partial')
        <div class="bill-title" style="border: none; background: #eee;">PARTIAL PAYMENT</div>
    @endif

    @if($payment->notes)
        <div class="sep"></div>
        <div style="font-size: 12px; line-height: 1.4;">
            <span class="bold">Notes:</span> {{ $payment->notes }}
        </div>
    @endif

    <div class="footer">
        @if($payment->recordedBy)
            Recorded by: {{ $payment->recordedBy->first_name }} {{ $payment->recordedBy->last_name }}<br>
        @endif
        Printed: {{ now()->setTimezone('Asia/Colombo')->format('Y-m-d H:i') }}<br>
        THANK YOU FOR YOUR BUSINESS!<br>
        Unitec Software Solutions (PVT) Ltd.
    </div>

    <div class="cut-space"></div>

    <script>
        var printed = false;
        function autoPrint() {
            if (printed) return;
            printed = true;
            setTimeout(function() {
                window.print();
            }, 100);
        }
        document.addEventListener('DOMContentLoaded', autoPrint);
        if (document.readyState === 'interactive' || document.readyState === 'complete') {
            autoPrint();
        }
        window.addEventListener('load', autoPrint);
    </script>
</body>
</html>

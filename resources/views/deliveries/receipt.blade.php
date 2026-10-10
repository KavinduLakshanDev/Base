<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Delivery Receipt - {{ $delivery->delivery_number }}</title>
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
            width: 72mm;
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
            font-size: 13px;
            text-align: center;
            margin: 1px 0;
            font-weight: 600;
        }

        /* Bill title */
        .bill-title {
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 2px 0;
            font-size: 14px;
            font-weight: bold;
            text-align: center;
            margin: 3px 0;
        }

        /* Separator line */
        .sep {
            border-top: 1px dashed #000;
            margin: 3px 0;
        }

        /* Info table */
        .info-tbl {
            width: 100%;
            border-collapse: collapse;
        }

        .info-tbl td {
            font-size: 13px;
            padding: 2px 0;
            line-height: 1.4;
            font-weight: 600;
        }

        .info-tbl td.lbl {
            width: 45%;
        }

        .info-tbl td.val {
            text-align: right;
        }

        /* Item table */
        .item-tbl {
            width: 100%;
            border-collapse: collapse;
            margin-top: 3px;
        }

        .item-tbl th {
            font-size: 13px;
            border-bottom: 1px dashed #000;
            padding: 2px 0;
            text-align: left;
            font-weight: bold;
        }

        .item-tbl th.r { text-align: right; }

        .item-tbl td {
            font-size: 13px;
            padding: 2px 0;
            line-height: 1.3;
            font-weight: 600;
        }

        .item-tbl td.r { text-align: right; }

        /* Footer */
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
            }
            * {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
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
        $company = null;
        if (function_exists('auth') && auth()->check()) {
            $company = \App\Models\Company::where('company_code', auth()->user()->company_code)->first();
        }
        $company = $company ?? \App\Models\Company::first();

        $companyCode = strtoupper($company->company_code ?? 'VIS');
        $logoBase64 = '';
        
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

    <div class="center" style="margin-bottom:2px;">
        @if($logoBase64)
            <img src="{{ $logoBase64 }}" alt="Logo" style="height: 45px; display:block; margin: 0 auto; filter: grayscale(100%) brightness(0);" />
        @else
            <div class="bold" style="font-size:18px;">{{ $companyName }}</div>
        @endif
    </div>
    
    <div class="sub">{{ $company->address ?? '' }}</div>
    <div class="sub">Tel: {{ $company->phone ?? '' }}</div>

    <div class="bill-title">DELIVERY RECEIPT</div>

    <table class="info-tbl">
        <tr><td class="lbl">Invoice No:</td><td class="val bold">{{ $delivery->delivery_number }}</td></tr>
        <tr><td class="lbl">Date:</td><td class="val">{{ $delivery->delivery_date ?? \Carbon\Carbon::parse($delivery->created_at)->toDateString() }}</td></tr>
        <tr><td class="lbl">Customer:</td><td class="val">
            @if($delivery->shop)
                {{ data_get($delivery, 'shop.name') }}
            @else
                {{ $delivery->customer_name }}
            @endif
        </td></tr>
        @if($delivery->deliveryRoute)
        <tr><td class="lbl">Route:</td><td class="val">{{ $delivery->deliveryRoute->name }}</td></tr>
        @endif
        @if($delivery->payments && $delivery->payments->count() > 0)
        <tr><td class="lbl">Payment Method:</td><td class="val">{{ ucfirst($delivery->payments->first()->method) }}</td></tr>
        @elseif($delivery->total_amount > 0 && $delivery->paid_amount == 0)
        <tr><td class="lbl">Payment Method:</td><td class="val">Credit</td></tr>
        @endif
    </table>

    <div class="sep"></div>

    <table class="item-tbl">
        <thead>
            <tr>
                <th>Item</th>
                <th class="r">Qty</th>
                <th class="r">Price</th>
                <th class="r">Amt</th>
            </tr>
        </thead>
        <tbody>
            @php $total = 0; @endphp
            @foreach($delivery->items as $item)
                @php
                    $unitPrice = $item->unit_price ?? (($item->quantity && $item->total_amount) ? $item->total_amount / $item->quantity : 0);
                    $total += (float) ($item->total_amount ?? ($item->quantity * $unitPrice));
                @endphp
                <tr>
                    <td colspan="4" style="font-weight: bold;">{{ $item->ItemName }}</td>
                </tr>
                @if(!empty($item->serial_number))
                <tr>
                    <td colspan="4" style="font-size: 12px; padding-left: 8px;">SN: {{ $item->serial_number }}</td>
                </tr>
                @endif
                <tr>
                    <td></td>
                    <td class="r">{{ number_format((float)$item->quantity) }}</td>
                    <td class="r">{{ number_format((float)$unitPrice, 2) }}</td>
                    <td class="r">{{ number_format((float)($item->total_amount ?? ($item->quantity * $unitPrice)), 2) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="sep"></div>

    <table class="info-tbl">
        @php
            $grossTotal    = 0;
            $tierDiscTotal = 0;
            foreach($delivery->items as $item) {
                $gross = (float)$item->quantity * (float)$item->unit_price;
                $grossTotal    += $gross;
                $tierDiscTotal += (float)($item->discount_amount ?? 0);
            }
            $afterTierTotal = max(0, $grossTotal - $tierDiscTotal);

            // Global invoice-level discount
            $globalDiscountAmount = 0;
            if ($delivery->discount_type === 'percentage') {
                $globalDiscountAmount = $afterTierTotal * ((float)($delivery->discount_value ?? 0) / 100);
            } else {
                $globalDiscountAmount = (float)($delivery->discount_value ?? 0);
            }
            $finalTotal = max(0, $afterTierTotal - $globalDiscountAmount);
        @endphp

        @if($tierDiscTotal > 0 || $globalDiscountAmount > 0)
            <tr>
                <td class="lbl">GROSS TOTAL</td>
                <td class="val">Rs {{ number_format($grossTotal, 2) }}</td>
            </tr>
            @if($tierDiscTotal > 0)
            <tr>
                <td class="lbl">ITEM DISCOUNT</td>
                <td class="val">-Rs {{ number_format($tierDiscTotal, 2) }}</td>
            </tr>
            @endif
            @if($globalDiscountAmount > 0)
            <tr>
                <td class="lbl">DISCOUNT @if($delivery->discount_type === 'percentage')({{ $delivery->discount_value }}%)@endif</td>
                <td class="val">-Rs {{ number_format($globalDiscountAmount, 2) }}</td>
            </tr>
            @endif
            <tr class="bold" style="font-size: 15px; border-top: 1px dashed #000;">
                <td>NET AMOUNT</td>
                <td class="val">Rs {{ number_format($finalTotal, 2) }}</td>
            </tr>
        @else
            <tr class="bold" style="font-size: 15px;">
                <td>TOTAL AMOUNT</td>
                <td class="val">Rs {{ number_format($finalTotal, 2) }}</td>
            </tr>
        @endif
    </table>


    <div class="sep"></div>

    <div class="bold" style="font-size: 12px; margin-bottom: 2px;">OUTSTANDING SUMMARY</div>
    @if(isset($outstandingDeliveries) && $outstandingDeliveries->count() > 0)
        <table class="info-tbl" style="font-size: 12px;">
            @foreach($outstandingDeliveries as $d)
                <tr>
                    <td>{{ $d->delivery_number }}</td>
                    <td class="val">{{ number_format($d->outstanding_balance, 2) }}</td>
                </tr>
            @endforeach
            <tr style="border-top: 1px solid #000;">
                <td class="bold">TOTAL DUE:</td>
                <td class="val bold" style="font-size: 14px;">Rs {{ number_format($outstandingDeliveries->sum('outstanding_balance'), 2) }}</td>
            </tr>
        </table>
    @else
        <table class="info-tbl">
            <tr><td>Total Outstanding</td><td class="val">Rs {{ number_format($delivery->outstanding_balance, 2) }}</td></tr>
        </table>
    @endif

    @if($delivery->notes)
        <div class="sep"></div>
        <div style="font-size: 12px;"><strong>Notes:</strong> {{ $delivery->notes }}</div>
    @endif

    <div class="footer">
        <div>Thank you for choosing {{ $companyName }}</div>
        <div>{{ date('Y-m-d H:i') }}</div>
        <div>Unitec Software Solutions.</div>
        +94 777704105 || +94 332222502
    </div>

    <div class="cut-space"></div>

    <script>
        var printed = false;
        function autoPrint() {
            if (printed) return;
            printed = true;
            setTimeout(function() { window.print(); }, 100);
        }
        document.addEventListener('DOMContentLoaded', autoPrint);
        if (document.readyState === 'interactive' || document.readyState === 'complete') {
            autoPrint();
        }
        window.addEventListener('load', autoPrint);
    </script>
</body>
</html>
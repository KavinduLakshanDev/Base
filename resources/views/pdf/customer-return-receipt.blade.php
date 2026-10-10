<!DOCTYPE html>
<html lang="en">
<head>

<meta charset="UTF-8">
<title>Customer Return Receipt - {{ $customerReturn->return_no }}</title>

<style>

/* Paper setup for 80mm POS roll */
@page{
    size:80mm auto;
    margin:0;
}

*{
    margin:0;
    padding:0;
    box-sizing:border-box;
}

/* Body layout */
body{
    font-family:"Courier New", monospace;
    font-size:12px;
    width:72mm;
    margin:0 auto;
    padding:2mm;
    background:#fff;
    color:#000;
    line-height:1.35;
    font-weight:600;
}

/* Heading */
h1{
    font-size:16px;
    text-align:center;
    margin-bottom:2px;
    font-weight:bold;
}

/* Sub text */
.sub{
    font-size:11px;
    text-align:center;
    margin:1px 0;
    font-weight:600;
}

/* Receipt title */
.receipt-title{
    border-top:1px solid #000;
    border-bottom:1px solid #000;
    padding:2px 0;
    font-size:13px;
    font-weight:bold;
    text-align:center;
    margin:3px 0;
}

/* Separator line */
.sep{
    border-top:1px dashed #000;
    margin:3px 0;
}

/* Info table */
.info-tbl{
    width:100%;
    border-collapse:collapse;
}

.info-tbl td{
    font-size:11px;
    padding:2px 0;
    line-height:1.4;
    font-weight:600;
}

.info-tbl td.lbl{
    width:55%;
}

.info-tbl td.val{
    text-align:right;
}

/* Item table */
.item-tbl{
    width:100%;
    border-collapse:collapse;
    margin-top:3px;
}

.item-tbl th{
    font-size:11px;
    border-bottom:1px dashed #000;
    padding:2px 0;
    text-align:left;
    font-weight:bold;
}

.item-tbl th.r{
    text-align:right;
}

.item-tbl td{
    font-size:11px;
    padding:2px 0;
    line-height:1.3;
    font-weight:600;
}

.item-tbl td.r{
    text-align:right;
}

/* Item name */
.item-name{
    font-weight:bold;
    font-size:12px;
    line-height:1.4;
}

.item-sub{
    font-size:10px;
    color:#333;
    font-weight:500;
}

/* Totals table */
.tot-tbl{
    width:100%;
    border-collapse:collapse;
    margin-top:3px;
}

.tot-tbl td{
    font-size:11px;
    padding:2px 0;
    line-height:1.4;
    font-weight:600;
}

.tot-tbl td.r{
    text-align:right;
}

.tot-tbl tr.grand td{
    font-size:13px;
    font-weight:bold;
    border-top:1px solid #000;
    padding-top:3px;
    line-height:1.5;
}

/* Signature */
.sig-tbl{
    width:100%;
    border-collapse:collapse;
    margin-top:8px;
}

.sig-tbl td{
    width:50%;
    font-size:10px;
    text-align:center;
    border-top:1px dotted #000;
    padding-top:3px;
    line-height:1.4;
    font-weight:600;
}

/* Footer */
.footer{
    margin-top:6px;
    text-align:center;
    font-size:10px;
    border-top:1px dashed #000;
    padding-top:4px;
    line-height:1.5;
    font-weight:600;
}

/* Space for paper cutter */
.cut-space{
    height:35px;
}

.bold{
    font-weight:bold;
}

/* Print rules */
@media print{

    html,body{
        width:72mm;
        margin:0;
        padding:0;
        font-size:12px;
    }

    *{
        -webkit-print-color-adjust:exact;
        print-color-adjust:exact;
        color-adjust:exact;
    }

    @page{
        size:80mm auto;
        margin:0;
    }
}

</style>

</head>
<body>

@php
    // Use the company record for the current user (or fall back to the first record)
    $company = null;
    if (function_exists('auth') && auth()->check()) {
        $company = \App\Models\Company::where('company_code', auth()->user()->company_code)->first();
    }
    $company = $company ?? \App\Models\Company::first();

    // Pick logo based on the company code (VisMass vs Malibu)
    $companyCode = strtoupper($company->company_code ?? 'VIS001');

    // Prefer PNG versions when available (case-sensitive file systems).
    $vismassPngCandidates = [
        public_path('images/Vismass-logo.png'),
        public_path('images/vismass-logo.png'),
    ];
    $malibuPngCandidates = [
        public_path('images/malibu-logo.png'),
        public_path('images/Malibu-logo.png'),
    ];

    $logoPath = null;
    if ($companyCode === 'MAL001') {
        foreach ($malibuPngCandidates as $candidate) {
            if (file_exists($candidate)) {
                $logoPath = $candidate;
                break;
            }
        }
    } else {
        foreach ($vismassPngCandidates as $candidate) {
            if (file_exists($candidate)) {
                $logoPath = $candidate;
                break;
            }
        }
    }

    $logoUrl = '';
    if ($logoPath && file_exists($logoPath)) {
        $logoData = @file_get_contents($logoPath);
        $logoUrl = $logoData ? 'data:image/png;base64,' . base64_encode($logoData) : '';
    }
@endphp

<div style="text-align:center; margin-bottom:2px;">
    <img src="{{ $logoUrl }}" alt="{{ $company->company_name ?? 'VISMASS' }}" style="height:20px; display:block; margin: 0 auto;" />
</div>
<div class="sub">{{ $company->address ?? '' }}</div>
<div class="sub">Tel: {{ $company->phone ?? '' }}</div>

<div class="receipt-title">CUSTOMER RETURN</div>

<table class="info-tbl">
    <tr><td class="lbl">Return No:</td><td class="val bold">{{ $customerReturn->return_no }}</td></tr>
    <tr><td class="lbl">Date:</td><td class="val">{{ \Carbon\Carbon::parse($customerReturn->return_date)->format('Y-m-d H:i') }}</td></tr>
    <tr><td class="lbl">Customer:</td><td class="val">{{ $customerReturn->customer_name }}</td></tr>
    @if($customerReturn->original_invoice_no)
    <tr><td class="lbl">Orig Invoice:</td><td class="val">{{ $customerReturn->original_invoice_no }}</td></tr>
    @endif
</table>

<div class="sep"></div>

<table class="info-tbl">
    <tr><td class="lbl">Return Type:</td><td class="val">{{ ucfirst($customerReturn->return_type) }}</td></tr>
    <tr><td class="lbl">Refund:</td><td class="val">{{ ucfirst($customerReturn->refund_method) }}</td></tr>
    @if($customerReturn->reason)
    <tr><td class="lbl">Reason:</td><td class="val">{{ substr($customerReturn->reason, 0, 20) }}</td></tr>
    @endif
</table>

<div class="sep"></div>

@php
    // Separate returned items and exchange items
    $returnedItems = $customerReturn->items->where('item_direction', 'in') ?? collect([]);
    $exchangeItems = $customerReturn->items->where('item_direction', 'out') ?? collect([]);
    
    // Calculate totals for each section
    $returnedTotal = $returnedItems->sum('total_amount');
    $exchangeTotal = $exchangeItems->sum('total_amount');
@endphp

@if($returnedItems->count() > 0)
<table class="item-tbl">
    <thead>
        <tr>
            <th>Return Items</th>
            <th class="r">Qty</th>
            <th class="r">Price</th>
            <th class="r">Total</th>
        </tr>
    </thead>
    <tbody>
        @foreach($returnedItems as $item)
        <tr><td colspan="4" class="item-name">{{ $item->item_name }}</td></tr>
        <tr>
            <td class="item-sub">{{ $item->item_code ?? 'N/A' }}</td>
            <td class="r">{{ number_format($item->quantity, 0) }}</td>
            <td class="r">{{ number_format($item->unit_price, 2) }}</td>
            <td class="r">-{{ number_format($item->total_amount, 2) }}</td>
        </tr>
        @if($item->condition && $item->condition !== 'good')
        <tr><td colspan="4" class="item-sub">Cond: {{ strtoupper($item->condition) }}@if($item->damage_notes) - {{ substr($item->damage_notes, 0, 15) }}@endif</td></tr>
        @endif
        @if($item->add_to_stock)
        <tr><td colspan="4" class="item-sub">+To Stock</td></tr>
        @endif
        @endforeach
    </tbody>
</table>

<table class="tot-tbl">
    <tr><td>Return Items Total</td><td class="r">-{{ number_format($returnedTotal, 2) }}</td></tr>
</table>
@endif

@if($exchangeItems->count() > 0)
<div class="sep"></div>

<table class="item-tbl">
    <thead>
        <tr>
            <th>Exchange Items</th>
            <th class="r">Qty</th>
            <th class="r">Price</th>
            <th class="r">Total</th>
        </tr>
    </thead>
    <tbody>
        @foreach($exchangeItems as $item)
        <tr><td colspan="4" class="item-name">{{ $item->item_name }}</td></tr>
        <tr>
            <td class="item-sub">{{ $item->item_code ?? 'N/A' }}</td>
            <td class="r">{{ number_format($item->quantity, 0) }}</td>
            <td class="r">{{ number_format($item->unit_price, 2) }}</td>
            <td class="r">+{{ number_format($item->total_amount, 2) }}</td>
        </tr>
        @endforeach
    </tbody>
</table>

<table class="tot-tbl">
    <tr><td>Exchange Items Total</td><td class="r">+{{ number_format($exchangeTotal, 2) }}</td></tr>
</table>
@endif

<div class="sep"></div>

<table class="tot-tbl">
    <tr><td>Return Amount</td><td class="r">-{{ number_format($customerReturn->total_return_amount, 2) }}</td></tr>
    @if($exchangeTotal > 0)
    <tr><td>Exchange Value</td><td class="r">+{{ number_format($exchangeTotal, 2) }}</td></tr>
    @endif
    
    @php
        $netAmount = $exchangeTotal - $customerReturn->total_return_amount;
    @endphp
    
    @if($netAmount > 0)
    <tr class="grand"><td>CUSTOMER PAYS</td><td class="r">{{ number_format($netAmount, 2) }}</td></tr>
    @elseif($netAmount < 0)
    <tr class="grand"><td>CUSTOMER REFUND</td><td class="r">{{ number_format(abs($netAmount), 2) }}</td></tr>
    @else
    <tr class="grand"><td>NET AMOUNT</td><td class="r">0.00</td></tr>
    @endif
</table>

<table class="sig-tbl">
    <tr><td>Processed by</td><td>Authorized</td></tr>
</table>

<div class="footer">
    {{ $customerReturn->processedBy->name ?? 'System' }}<br>
    {{ \Carbon\Carbon::parse($customerReturn->processed_at)->format('Y-m-d H:i') }}<br>
    <br>
    Thank you for your cooperation!
</div>

<script>
    function autoPrint() {
        setTimeout(function() {
            window.print();
        }, 100);
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(autoPrint, 300);
        });
    } else {
        setTimeout(autoPrint, 100);
    }
    
    window.addEventListener('load', function() {
        setTimeout(autoPrint, 100);
    });
</script>

</body>
</html>

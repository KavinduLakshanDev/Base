<!DOCTYPE html>
<html lang="en">
<head>

<meta charset="UTF-8">
<title>Sales Invoice - {{ $sale->invoice_no }}</title>

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
    font-size:14px;
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
    font-size:18px;
    text-align:center;
    margin-bottom:2px;
    font-weight:bold;
}

/* Sub text */
.sub{
    font-size:14px;
    text-align:center;
    margin:1px 0;
    font-weight:600;
}

/* Invoice title */
.bill-title{
    border-top:1px solid #000;
    border-bottom:1px solid #000;
    padding:2px 0;
    font-size:14px;
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
    font-size:14px;
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
    font-size:14px;
    border-bottom:1px dashed #000;
    padding:2px 0;
    text-align:left;
    font-weight:bold;
}

.item-tbl th.r{
    text-align:right;
}

.item-tbl td{
    font-size:14px;
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
    font-size:14px;
    line-height:1.4;
}

.item-sub{
    font-size:14px;
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
    font-size:14px;
    padding:2px 0;
    line-height:1.4;
    font-weight:600;
}

.tot-tbl td.r{
    text-align:right;
}

.tot-tbl tr.grand td{
    font-size:14px;
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
        margin: 0 auto;
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

    // Prefer PNG versions when available (case-sensitive file systems), fall back to a placeholder.
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
    $logoUrl = $logoData ? 'data:image/png;base64,' . base64_encode($logoData) : '';

    $paymentDetails = is_array($sale->payment_details)
        ? $sale->payment_details
        : json_decode($sale->payment_details, true);
    $cashPaid   = $paymentDetails['cash']          ?? 0;
    $cardPaid   = $paymentDetails['card']          ?? 0;
    $pointsPaid = $paymentDetails['points']        ?? 0;
    $chequePaid = $paymentDetails['cheque']        ?? 0;
    $bankPaid   = $paymentDetails['bank_transfer'] ?? 0;
    $appliedCredit = $paymentDetails['applied_credit'] ?? 0;
    $initialPayments = $cashPaid + $cardPaid + $pointsPaid + $chequePaid + $bankPaid + $appliedCredit;
    $totalAmount   = $sale->total_amount;
    $changeAmount  = $initialPayments > $totalAmount ? $initialPayments - $totalAmount : 0;
    
    // Calculate total payments based on the current balance amount
    $balanceDue    = max(0, (float)$sale->balance_amount);
    $totalPayments = max(0, $totalAmount - $balanceDue);
    
    $laterPaymentsList = \App\Models\CustomerPayment::where('status', 'completed')
        ->where(function($q) use ($sale) {
            $q->where('sales_transaction_id', $sale->id)
              ->orWhereJsonContains('invoice_allocations', ['invoice_id' => $sale->id]);
        })
        ->get();
        
    $laterPaymentsGroups = [];
    foreach ($laterPaymentsList as $p) {
        if (strpos($p->notes, 'Initial') !== false || strpos($p->notes, 'Service advance') !== false) continue;

        $allocAmount = $p->amount;
        if ($p->sales_transaction_id != $sale->id && is_array($p->invoice_allocations)) {
            foreach ($p->invoice_allocations as $a) {
                if (($a['invoice_id'] ?? 0) == $sale->id) {
                    $allocAmount = $a['amount'];
                    break;
                }
            }
        }
        
        $methodLabel = ucwords(str_replace('_', ' ', $p->method));
        $laterPaymentsGroups[$methodLabel] = ($laterPaymentsGroups[$methodLabel] ?? 0) + $allocAmount;
    }
    $grossTotal = 0; $netTotal = 0;
    foreach ($sale->items as $item) {
        $grossTotal += $item->unit_price * $item->quantity;
        $netTotal   += $item->line_total;
    }
    $itemLevelDiscounts = $grossTotal - $netTotal;
    $manualDiscount     = $sale->discount_amount ?? 0;
    
    // Priority: Stored total_discount, then calculated sum, then difference
    $storedTotalDiscount = (float)($sale->total_discount ?? 0);
    $calculatedTotalDiscount = $itemLevelDiscounts + $manualDiscount;
    $diffTotalDiscount = (float)($sale->subtotal ?? 0) - (float)($sale->total_amount ?? 0) + (float)($sale->tax_amount ?? 0);
    
    $totalDiscount = $storedTotalDiscount > 0 ? $storedTotalDiscount : 
                    ($calculatedTotalDiscount > 0 ? $calculatedTotalDiscount : max(0, $diffTotalDiscount));
    
    $vatAmount          = $sale->is_vat_invoice ? ($sale->tax_amount ?? 0) : 0;
@endphp


<div style="text-align:center; margin-bottom:2px;">
    <img src="{{ $logoUrl }}" alt="{{ $company->company_name ?? 'VISMASS' }}" style="height:50px; display:block; margin: 0 auto; filter: grayscale(100%) brightness(0);" />
</div>
<!-- <div class="sub">{{ $company->company_name ?? 'VISMASS (PVT) Ltd' }}</div> -->
<div class="sub">{{ $company->address ?? '' }}</div>
<div class="sub">Tel: {{ $company->phone ?? '' }}</div>

<div class="bill-title">SALES INVOICE</div>

<table class="info-tbl">
    <tr><td class="lbl">Date:</td><td class="val">{{ $sale->created_at->setTimezone('Asia/Colombo')->format('Y-m-d H:i') }}</td></tr>
    <tr><td class="lbl">Invoice No:</td><td class="val bold">{{ $sale->invoice_no }}</td></tr>
    <tr><td class="lbl">Cashier:</td><td class="val">{{ $sale->cashier->name ?? 'Admin' }}</td></tr>
    <tr><td class="lbl">Customer:</td><td class="val">{{ $sale->customer_name ?: 'Walk-in' }}</td></tr>
    @if($sale->customer_code && $sale->customer_code !== '0001')
    <tr><td class="lbl">Cust Code:</td><td class="val">{{ $sale->customer_code }}</td></tr>
    @endif
</table>

<div class="sep"></div>

<table class="item-tbl">
    <thead>
        <tr>
            <th>Item</th>
            <th class="r">Qty</th>
            <th class="r">Price</th>
            <th class="r">Total</th>
        </tr>
    </thead>
    <tbody>
        @foreach($sale->items as $item)
        @php 
            $displayName = $item->item_name ?: ($item->item->ItmNm ?? 'Item ' . $item->item_code);
        @endphp
        <tr><td colspan="4" class="item-name">{{ $displayName }}</td></tr>
        <tr>
            <td class="item-sub"> </td>
            <td class="r">{{ number_format($item->quantity, 0) }}</td>
            <td class="r">{{ number_format($item->unit_price, 2) }}</td>
            <td class="r">{{ number_format($item->line_total, 2) }}</td>
        </tr>
        @if(($item->discount_amount ?? 0) > 0)
        <tr><td colspan="4" class="item-sub">Disc: -{{ number_format($item->discount_amount, 2) }}</td></tr>
        @endif
        @if(($item->free_quantity ?? 0) > 0)
        <tr><td colspan="4" class="item-sub">Free Qty: {{ number_format($item->free_quantity, 0) }}</td></tr>
        @endif
        @endforeach
    </tbody>
</table>

<div class="sep"></div>

<table class="tot-tbl">
    <tr><td>SUBTOTAL</td><td class="r">{{ number_format($grossTotal, 2) }}</td></tr>
    @if($itemLevelDiscounts > 0)
    <tr><td>ITEM DISCOUNT</td><td class="r">{{ number_format($itemLevelDiscounts, 2) }}</td></tr>
    @endif
    @php
        $fixedDiscount = $sale->manual_discount_fixed ?? 0;
        $percentageDiscountAmount = $manualDiscount - $fixedDiscount;
    @endphp
    @if($percentageDiscountAmount > 0)
    <tr><td>DISCOUNT ({{ number_format($sale->discount_percentage, 0) }}%)</td><td class="r">{{ number_format($percentageDiscountAmount, 2) }}</td></tr>
    @endif
    @if($fixedDiscount > 0)
    <tr><td>FIXED DISCOUNT</td><td class="r">{{ number_format($fixedDiscount, 2) }}</td></tr>
    @endif
    @if($sale->is_vat_invoice)
    <tr><td>VAT ({{ number_format($sale->vat_rate, 2) }}%)</td><td class="r">{{ number_format($vatAmount, 2) }}</td></tr>
    @endif
    <tr class="grand"><td>TOTAL</td><td class="r">{{ number_format($totalAmount, 2) }}</td></tr>
</table>

<div class="sep"></div>

<table class="tot-tbl">
    <tr><td colspan="2" class="bold" style="padding-bottom:2px; font-size:11px;">PAYMENT</td></tr>
    @if($cashPaid > 0)
    <tr><td>Cash Paid</td><td class="r">{{ number_format($cashPaid, 2) }}</td></tr>
    @endif
    @if($cardPaid > 0)
    <tr><td>Card Paid</td><td class="r">{{ number_format($cardPaid, 2) }}</td></tr>
    @endif
    @if($chequePaid > 0)
    <tr><td>Cheque Paid</td><td class="r">{{ number_format($chequePaid, 2) }}</td></tr>
    @if(!empty($paymentDetails['cheque_no']) || !empty($paymentDetails['cheque_bank']))
    <tr><td colspan="2" style="font-size:9px; color:#444; padding:1px 0;">
        @if(!empty($paymentDetails['cheque_no']))#{{ $paymentDetails['cheque_no'] }} @endif
        @if(!empty($paymentDetails['cheque_bank'])){{ $paymentDetails['cheque_bank'] }}@endif
        @if(!empty($paymentDetails['cheque_branch'])) , {{ $paymentDetails['cheque_branch'] }}@endif
    </td></tr>
    @endif
    @endif
    @if($bankPaid > 0)
    <tr><td>Bank Transfer</td><td class="r">{{ number_format($bankPaid, 2) }}</td></tr>
    @if(!empty($paymentDetails['bank_name']) || !empty($paymentDetails['bank_ref']))
    <tr><td colspan="2" style="font-size:9px; color:#444; padding:1px 0;">
        @if(!empty($paymentDetails['bank_name'])){{ $paymentDetails['bank_name'] }} @endif
        @if(!empty($paymentDetails['bank_branch'])), {{ $paymentDetails['bank_branch'] }} @endif
        @if(!empty($paymentDetails['bank_ref']))Ref: {{ $paymentDetails['bank_ref'] }}@endif
    </td></tr>
    @endif
    @endif
    @if($pointsPaid > 0)
    <tr><td>Points Redeemed</td><td class="r">{{ number_format($pointsPaid, 2) }}</td></tr>
    @endif
    @if($appliedCredit > 0)
    <tr><td>Applied Credit</td><td class="r">{{ number_format($appliedCredit, 2) }}</td></tr>
    @endif
    @foreach($laterPaymentsGroups as $method => $amount)
    <tr><td>{{ $method }} (Later)</td><td class="r">{{ number_format($amount, 2) }}</td></tr>
    @endforeach
    <tr class="bold"><td>TOTAL PAID</td><td class="r">{{ number_format($totalPayments, 2) }}</td></tr>
    @if($changeAmount > 0)
    <tr><td>Change Due</td><td class="r">{{ number_format($changeAmount, 2) }}</td></tr>
    @endif
    @if($balanceDue > 0)
    <tr><td class="bold">BALANCE DUE</td><td class="r bold">{{ number_format($balanceDue, 2) }}</td></tr>
    @endif
</table>

@if($sale->customer_id)
    @php
        $customerObj = \App\Models\Customer::find($sale->customer_id);
        $totalBalance = 0;
        if ($customerObj) {
            $totalBalance = $customerObj->calculateOutstandingBalance();
        }
    @endphp
    @if($customerObj)
    <div class="sep"></div>
    <table class="tot-tbl">
        <tr>
            <td class="bold">{{ $totalBalance < 0 ? 'CUS. CREDIT BAL:' : 'CUS. OUTSTANDING:' }}</td>
            <td class="r bold">Rs {{ number_format(abs($totalBalance), 2) }}{{ $totalBalance < 0 ? ' CR' : '' }}</td>
        </tr>
    </table>
    @endif
@endif
@if($sale->is_vat_invoice)
<div class="sep"></div>
@php $customer = \App\Models\Customer::where('AdrCd', $sale->customer_code)->first(); @endphp
<table class="info-tbl">
    @if($company && $company->vat_no)
    <tr><td class="lbl">Company VAT No:</td><td class="val">{{ $company->vat_no }}</td></tr>
    @endif
    @if($customer && $customer->VATNo)
    <tr><td class="lbl">Customer VAT No:</td><td class="val">{{ $customer->VATNo }}</td></tr>
    @endif
</table>
@endif

<table class="sig-tbl">
    <tr><td>Customer</td><td>Authorized</td></tr>
</table>

<div class="footer">
    THANK YOU! COME BACK AGAIN!<br>
    Please keep this invoice for warranty &amp; returns.<br>
    Unitec Software Solutions.    
    +94 332222502  ||  +94 777704105

    <!-- {{ now()->setTimezone('Asia/Colombo')->format('Y-m-d H:i:s') }} -->
</div>

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

    window.onafterprint = function() {
        if (window.history.length > 1 && document.referrer !== "") {
            window.history.back();
        } else {
            window.close();
        }
    };
</script>

</body>
</html>
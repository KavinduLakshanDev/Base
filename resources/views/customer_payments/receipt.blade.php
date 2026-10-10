<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Payment Receipt - PAY-{{ $payment->id }}</title>
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
    margin: auto;
    padding: 2mm;
    background: #fff;
    color: #000;
    line-height: 1.35;
    font-weight: 600;
}

/* Sub text */
.sub {
    font-size: 14px;
    text-align: center;
    margin: 1px 0;
    font-weight: 600;
}

/* Invoice title */
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
    font-size: 14px;
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

/* Signature */
.sig-tbl {
    width: 100%;
    border-collapse: collapse;
    margin-top: 8px;
}

.sig-tbl td {
    width: 50%;
    font-size: 12px; /* Slightly larger than sales for clarity */
    text-align: center;
    border-top: 1px dotted #000;
    padding-top: 3px;
    line-height: 1.4;
    font-weight: 600;
}

/* Footer */
.footer {
    margin-top: 6px;
    text-align: center;
    font-size: 11px;
    padding-top: 4px;
    line-height: 1.5;
    font-weight: 600;
}

/* Space for paper cutter */
.cut-space {
    height: 35px;
}

.bold {
    font-weight: bold;
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
        // Variables like $customerName, $date, $balanceLabel, $balanceFormatted, 
        // $invoiceAllocations, and logo/company info are now passed directly 
        // from the CustomerPaymentController@generateReceiptHtml method.
    @endphp

    <div style="text-align:center; margin-bottom:2px;">
        @if($logoBase64)
            <img src="{{ $logoBase64 }}" alt="Logo" style="height: 50px; display:block; margin: 0 auto;" />
        @else
            <div class="bold" style="font-size:18px;">{{ $companyName }}</div>
        @endif
    </div>
    
    <div class="sub">{{ $companyAddress }}</div>
    <div class="sub">Tel: {{ $companyPhone }}</div>

    <div class="bill-title">PAYMENT RECEIPT</div>

    <table class="info-tbl">
        <tr><td class="lbl">Date:</td><td class="val">{{ $date }}</td></tr>
        <tr><td class="lbl">Receipt No:</td><td class="val bold">PAY-{{ $payment->id }}</td></tr>
        <tr><td class="lbl">Customer:</td><td class="val">{{ $customerName }}</td></tr>
        @if($payment->sales_transaction_id)
            <tr><td class="lbl">Invoice Ref:</td><td class="val">{{ $payment->sales_transaction_id }}</td></tr>
        @endif
        @if($payment->service_job_id)
            <tr><td class="lbl">Job Ref:</td><td class="val">{{ $payment->service_job_id }}</td></tr>
        @endif
    </table>

    <div class="sep"></div>

    <table class="info-tbl">
        <tr><td class="lbl">Payment Mode:</td><td class="val">{{ ucwords(str_replace('_', ' ', $payment->method)) }}</td></tr>
        @if($payment->method == 'cheque')
            <tr><td class="lbl">Cheque No:</td><td class="val">{{ $payment->cheque_no }}</td></tr>
            @if($payment->bank_name)<tr><td class="lbl">Bank:</td><td class="val">{{ $payment->bank_name }}</td></tr>@endif
        @elseif(in_array($payment->method, ['bank', 'bank_transfer']))
            @if($payment->reference)<tr><td class="lbl">Ref No:</td><td class="val">{{ $payment->reference }}</td></tr>@endif
            @if($payment->bank_name)<tr><td class="lbl">Bank:</td><td class="val">{{ $payment->bank_name }}</td></tr>@endif
        @endif
    </table>

    @if(!empty($invoiceAllocations))
        <div class="sep"></div>
        <div style="font-size: 12px; font-weight: bold; margin-bottom: 2px;">PAID INVOICES:</div>
        <table class="info-tbl">
            @foreach($invoiceAllocations as $allocation)
                <tr>
                    <td>{{ $allocation['label'] }}</td>
                    <td class="val">Rs {{ number_format($allocation['amount'], 2) }}</td>
                </tr>
            @endforeach
        </table>
    @endif

    <div class="sep"></div>

    <div class="amount-box">
        <div style="font-size: 12px; margin-bottom: 2px;">AMOUNT PAID</div>
        <div class="amount-text">Rs {{ number_format($payment->amount, 2) }}</div>
    </div>

    <table class="info-tbl">
        <tr class="bold">
            <td>{{ $balanceLabel }}</td>
            <td class="val">Rs {{ $balanceFormatted }}</td>
        </tr>
    </table>

    @if($payment->notes)
        <div class="sep"></div>
        <div style="font-size: 12px;"><strong>Notes:</strong> {{ $payment->notes }}</div>
    @endif

    <table class="sig-tbl">
        <tr><td>Customer</td><td>Authorized</td></tr>
    </table>

    <div class="footer">
        @if($payment->collectedBy)
            Recorded by: {{ $payment->collectedBy->first_name }} {{ $payment->collectedBy->last_name }}<br>
        @endif
        THANK YOU FOR YOUR BUSINESS!<br>
        System Generated Receipt<br>
        Unitec Software Solutions.
        +94 777704105 || +94 332222502
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

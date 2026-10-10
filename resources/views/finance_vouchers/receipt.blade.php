<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Finance Voucher - {{ $voucher->finance_voucher_no }}</title>
<style>
@page {
    size: 80mm auto;
    margin: 0;
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

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

.sub {
    font-size: 14px;
    text-align: center;
    margin: 1px 0;
    font-weight: 600;
}

.bill-title {
    border-top: 1px solid #000;
    border-bottom: 1px solid #000;
    padding: 2px 0;
    font-size: 14px;
    font-weight: bold;
    text-align: center;
    margin: 3px 0;
}

.sep {
    border-top: 1px dashed #000;
    margin: 3px 0;
}

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

.type-badge {
    display: inline-block;
    padding: 2px 8px;
    border: 1px solid #000;
    font-size: 12px;
    font-weight: bold;
    text-transform: uppercase;
}

.sig-tbl {
    width: 100%;
    border-collapse: collapse;
    margin-top: 8px;
}

.sig-tbl td {
    width: 50%;
    font-size: 12px;
    text-align: center;
    border-top: 1px dotted #000;
    padding-top: 3px;
    line-height: 1.4;
    font-weight: 600;
}

.footer {
    margin-top: 6px;
    text-align: center;
    font-size: 11px;
    padding-top: 4px;
    line-height: 1.5;
    font-weight: 600;
}

.cut-space {
    height: 35px;
}

.bold {
    font-weight: bold;
}

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
    <div style="text-align:center; margin-bottom:2px;">
        @if($logoBase64)
            <img src="{{ $logoBase64 }}" alt="Logo" style="height: 50px; display:block; margin: 0 auto;" />
        @else
            <div class="bold" style="font-size:18px;">{{ $companyName }}</div>
        @endif
    </div>
    
    <div class="sub">{{ $companyAddress }}</div>
    <div class="sub">Tel: {{ $companyPhone }}</div>

    <div class="bill-title">FINANCE VOUCHER</div>

    <table class="info-tbl">
        <tr><td class="lbl">Voucher No:</td><td class="val bold">{{ $voucher->finance_voucher_no }}</td></tr>
        <tr><td class="lbl">Date:</td><td class="val">{{ $voucher->date }}</td></tr>
        <tr><td class="lbl">Type:</td><td class="val"><span class="type-badge">{{ strtoupper($voucher->type) }}</span></td></tr>
    </table>

    <div class="sep"></div>

    <table class="info-tbl">
        <tr><td class="lbl">From Account:</td><td class="val">{{ $fromAccountName }}</td></tr>
        @if($toAccountName)
            <tr><td class="lbl">To Account:</td><td class="val">{{ $toAccountName }}</td></tr>
        @endif
    </table>

    <div class="sep"></div>

    <table class="info-tbl">
        <tr><td class="lbl">Payment Method:</td><td class="val">{{ ucwords($voucher->payment_method) }}</td></tr>
        @if($voucher->cheque_number)
            <tr><td class="lbl">Cheque No:</td><td class="val">{{ $voucher->cheque_number }}</td></tr>
        @endif
        @if($voucher->cheque_date)
            <tr><td class="lbl">Cheque Date:</td><td class="val">{{ $voucher->cheque_date }}</td></tr>
        @endif
        @if($voucher->reference_number)
            <tr><td class="lbl">Reference:</td><td class="val">{{ $voucher->reference_number }}</td></tr>
        @endif
        <!-- @if($voucher->payer_account)
            <tr><td class="lbl">Payer:</td><td class="val">{{ $voucher->payer_account }}</td></tr>
        @endif -->
    </table>

    @if($voucher->description)
        <div class="sep"></div>
        <div style="font-size: 12px;"><strong>Description:</strong> {{ $voucher->description }}</div>
    @endif

    <div class="sep"></div>

    <div class="amount-box">
        <div style="font-size: 12px; margin-bottom: 2px;">AMOUNT</div>
        <div class="amount-text">Rs {{ number_format($voucher->amount, 2) }}</div>
    </div>

    <table class="sig-tbl">
        <tr><td>Prepared By</td><td>Authorized</td></tr>
    </table>

    <div class="footer">
        @if($voucher->createdBy)
            Recorded by: {{ $voucher->createdBy->name ?? 'System' }}<br>
        @endif
        System Generated Receipt<br>
        VISMASS Distribution System
    </div>

    <div class="cut-space"></div>

    <div style="text-align:center; margin-top:10px; padding:10px; border-top:1px dashed #000;">
        <a href="{{ url('admin/finance-transfers') }}" style="display:inline-block; padding:8px 16px; background:#000; color:#fff; text-decoration:none; font-size:13px; font-weight:bold; border-radius:4px;">Back to Finance Vouchers</a>
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
    </script>
</body>
</html>

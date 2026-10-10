<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ $reportTitle }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            font-size: 9pt;
            color: #334155;
            line-height: 1.3;
            padding: 15px;
        }

        /* Header */
        .header {
            width: 100%;
            border-bottom: 3px solid #1e293b;
            padding-bottom: 10px;
            margin-bottom: 12px;
        }
        .header td { vertical-align: middle; }
        .logo { height: 38px; }
        .branch-name { font-size: 10px; color: #64748b; margin-top: 2px; }
        .po-title {
            font-size: 18px;
            font-weight: bold;
            color: #1e293b;
            text-transform: uppercase;
            letter-spacing: 1px;
            text-align: right;
        }
        .po-number {
            font-size: 12px;
            font-weight: bold;
            color: #3b82f6;
            text-align: right;
            margin-top: 3px;
        }
        .po-date {
            font-size: 10px;
            color: #64748b;
            text-align: right;
            margin-top: 2px;
        }

        /* Info Section */
        .info-section {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
        }
        .info-section td {
            vertical-align: top;
            padding: 0 8px 0 0;
        }
        .info-section td:last-child { padding-right: 0; }
        .info-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 3px;
            padding: 5px 8px;
        }
        .info-label {
            font-size: 7px;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            font-weight: bold;
            margin-bottom: 2px;
        }
        .info-value {
            font-size: 9pt;
            color: #1e293b;
            font-weight: 600;
        }
        .info-sub {
            font-size: 8pt;
            color: #64748b;
        }

        /* Data Table */
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            margin-bottom: 10px;
        }
        .items-table thead th {
            background: #1e293b;
            color: #fff;
            font-size: 7.5pt;
            font-weight: bold;
            text-transform: uppercase;
            padding: 6px 5px;
            text-align: left;
        }
        .items-table thead th.num { text-align: center; width: 4%; }
        .items-table thead th.name { text-align: left; width: 48%; }
        .items-table thead th.qty { text-align: center; width: 8%; }
        .items-table thead th.price { text-align: right; width: 18%; }
        .items-table thead th.total { text-align: right; width: 22%; }
        .items-table tbody td {
            padding: 5px 5px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 9pt;
            vertical-align: middle;
        }
        .items-table tbody tr:nth-child(even) { background: #f8fafc; }
        .items-table tbody td.num { text-align: center; color: #94a3b8; }
        .items-table tbody td.qty { text-align: center; font-weight: 600; }
        .items-table tbody td.price { text-align: right; }
        .items-table tbody td.total { text-align: right; font-weight: 600; }
        .product-name { font-weight: 600; color: #1e293b; }
        .product-code { font-size: 8pt; color: #94a3b8; margin-top: 1px; }

        /* Remarks */
        .remarks {
            margin-top: 6px;
            margin-bottom: 8px;
        }
        .remarks-title {
            font-size: 7pt;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            font-weight: bold;
            margin-bottom: 2px;
        }
        .remarks-text {
            font-size: 8.5pt;
            color: #475569;
            line-height: 1.3;
        }

        /* Summary */
        .summary {
            width: 250px;
            margin-left: auto;
            border-collapse: collapse;
            margin-top: 6px;
        }
        .summary td {
            padding: 4px 8px;
            font-size: 9pt;
        }
        .summary .label { color: #64748b; font-weight: 500; }
        .summary .value { text-align: right; font-weight: 600; color: #1e293b; }
        .summary .tax-value { text-align: right; font-weight: 600; color: #d97706; }
        .summary .total-row { background: #1e293b; }
        .summary .total-row td { color: #fff; font-weight: bold; font-size: 10pt; }
        .summary .total-value { text-align: right; }

        /* Footer */
        .footer {
            margin-top: 16px;
            border-top: 1px solid #e2e8f0;
            padding-top: 6px;
            text-align: center;
            font-size: 7.5pt;
            color: #94a3b8;
        }
    </style>
</head>
<body>
    @php
        $company = \App\Models\Company::where('company_code', $purchaseOrder->company_code)->first() ?? \App\Models\Company::first();
        $vatRate = $company->vat_rate ?? 0;

        $companyCode = strtoupper($company->company_code ?? 'VIS001');
        $vismassPng = public_path('images/vismass-logo.png');
        $malibuPng  = public_path('images/malibu-logo.png');
        if (!file_exists($vismassPng)) {
            @file_put_contents($vismassPng, base64_decode('iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAQAAAAAYLlVAAAAHklEQVR4nO3BMQEAAADCoPVPbQ0PoAAAAAAAAAAA4BsMCgABxIoV2AAAAAElFTkSuQmCC'));
        }
        if (!file_exists($malibuPng)) {
            @file_put_contents($malibuPng, base64_decode('iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAQAAAAAYLlVAAAAHklEQVR4nO3BMQEAAADCoPVPbQ0PoAAAAAAAAAAA4BsMCgABxIoV2AAAAAElFTkSuQmCC'));
        }
        $logoPath = ($companyCode === 'MAL001') ? $malibuPng : $vismassPng;
        $logoData = @file_get_contents($logoPath);
        $logoUrl = $logoData ? 'data:image/png;base64,' . base64_encode($logoData) : '';

        $costTotal = 0;
        foreach ($purchaseOrder->details as $detail) {
            $costTotal += $detail->Qty * ($detail->CostPrice ?? 0);
        }
        $taxTotal = $costTotal * $vatRate / 100;
        $grandTotal = $costTotal + $taxTotal;

        $poNo = $purchaseOrder->company_code . '-PO-' . str_pad($purchaseOrder->PurchaseOrderNo, 6, '0', STR_PAD_LEFT);
    @endphp

    <!-- Header -->
    <table class="header">
        <tr>
            <td style="width: 55%; border: none;">
                <img src="{{ $logoUrl }}" class="logo" alt="Logo" />
                <!-- <div class="branch-name">{{ $purchaseOrder->section->name ?? 'Main Branch' }}</div> -->
                @if($company->address)
                    <div class="branch-name">{{ $company->address }}</div>
                @endif
                @if($company->city)
                    <div class="branch-name">{{ $company->city }}</div>
                @endif
                @if($company->phone)
                    <div class="branch-name">Tel: {{ $company->phone }}</div>
                @endif
            </td>
            <td style="width: 45%; border: none;">
                <div class="po-title">Purchase Order</div>
                <div class="po-number">{{ $poNo }}</div>
                <div class="po-date">{{ $purchaseOrder->PODate->format('d M Y') }}</div>
            </td>
        </tr>
    </table>

    <!-- Info Cards -->
    <table class="info-section">
        <tr>
            <td style="width: 55%;">
                <div class="info-card">
                    <div class="info-label">Supplier</div>
                    <div class="info-value">{{ $purchaseOrder->supplier->FstNm ?? $purchaseOrder->supplier->AccNm ?? 'N/A' }}</div>
                    <div class="info-sub">Code: {{ $purchaseOrder->SuppCode ?? '-' }}</div>
                </div>
            </td>
            <td style="width: 15%;">
                <div class="info-card">
                    <div class="info-label">Type</div>
                    <div class="info-value">{{ ucfirst($purchaseOrder->item_type) }}</div>
                </div>
            </td>
            <td style="width: 15%;">
                <div class="info-card">
                    <div class="info-label">Status</div>
                    <div class="info-value">{{ $purchaseOrder->Status }}</div>
                </div>
            </td>
            <td style="width: 15%;">
                <div class="info-card">
                    <div class="info-label">Items</div>
                    <div class="info-value">{{ $purchaseOrder->details->count() }}</div>
                </div>
            </td>
        </tr>
    </table>

    <!-- Items Table -->
    <table class="items-table">
        <thead>
            <tr>
                <th class="num">#</th>
                <th class="name">Product Name</th>
                <th class="qty">Qty</th>
                <th class="price">Unit Price</th>
                <th class="total">Total (Rs)</th>
            </tr>
        </thead>
        <tbody>
            @foreach($purchaseOrder->details as $index => $detail)
            @php
                $unitPrice = $detail->CostPrice ?? 0;
                $qty = $detail->Qty ?? 0;
                $lineTotal = $qty * $unitPrice;
            @endphp
            <tr>
                <td class="num">{{ $index + 1 }}</td>
                <td>
                    <div class="product-name">{{ $detail->product->ItmNm ?? 'Unknown Product' }}</div>
                    @if(!empty($detail->product->ItemCode))
                        <div class="product-code">{{ $detail->product->ItemCode }}</div>
                    @endif
                </td>
                <td class="qty">{{ number_format($qty, 0) }}</td>
                <td class="price">{{ number_format($unitPrice, 2) }}</td>
                <td class="total">{{ number_format($lineTotal, 2) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <!-- Remarks -->
    @if($purchaseOrder->Des)
    <div class="remarks">
        <div class="remarks-title">Remarks</div>
        <div class="remarks-text">{{ $purchaseOrder->Des }}</div>
    </div>
    @endif

    <!-- Financial Summary -->
    <table class="summary">
        <tr>
            <td class="label">Subtotal</td>
            <td class="value">{{ number_format($costTotal, 2) }}</td>
        </tr>
        <tr>
            <td class="label">Tax ({{ $vatRate }}%)</td>
            <td class="tax-value">{{ number_format($taxTotal, 2) }}</td>
        </tr>
        <tr class="total-row">
            <td>Total</td>
            <td class="total-value">{{ number_format($grandTotal, 2) }}</td>
        </tr>
    </table>

    <!-- Footer -->
    <div class="footer">
        Generated by: <strong>{{ $generated_by }}</strong> | {{ $generated_at }} | UNITEC POS
    </div>
</body>
</html>

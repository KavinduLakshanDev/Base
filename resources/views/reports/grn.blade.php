<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ $reportTitle }}</title>
    <style>
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            font-size: 9pt;
            color: #334155;
            line-height: 1.25;
            margin: 0;
            padding: 8px;
        }
        
        /* Layout Helpers */
        .w-full { width: 100%; }
        .w-half { width: 50%; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .text-left { text-align: left; }
        .font-bold { font-weight: bold; }
        .uppercase { text-transform: uppercase; }
        .mb-2 { margin-bottom: 0.4rem; }
        .mb-4 { margin-bottom: 0.8rem; }
        
        /* Header */
        .header-container {
            margin-bottom: 12px;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 8px;
        }
        .company-name {
            font-size: 20px;
            font-weight: bold;
            color: #1e293b;
            margin: 0;
        }
        .company-details {
            font-size: 11px;
            color: #64748b;
            margin-top: 4px;
        }
        .report-title {
            font-size: 16px;
            font-weight: bold;
            color: #3b82f6;
            text-align: right;
            text-transform: uppercase;
            letter-spacing: 0.75px;
            margin: 0;
        }
        
        /* Information Sections */
        .info-table {
            width: 100%;
            margin-bottom: 8px;
        }
        .info-table td {
            vertical-align: top;
            padding-right: 12px;
        }
        .info-box {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: 4px;
            height: auto;
            min-height: 56px;
        }
        .info-title {
            font-size: 9px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            font-weight: bold;
            margin-bottom: 4px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 2px;
        }
        .info-content {
            font-size: 10px;
            color: #1e293b;
            line-height: 1.2;
        }
        .info-row {
            margin-bottom: 1px;
        }
        .label {
            color: #64748b;
            font-weight: 500;
            display: inline-block;
            width: 70px;
        }

        /* Data Table */
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
            border: 1px solid #e2e8f0;
        }
        .data-table th {
            background-color: #f1f5f9;
            color: #475569;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 9px;
            padding: 3px 3px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
        }
        .data-table td {
            padding: 3px 3px;
            border-bottom: 1px solid #e2e8f0;
            color: #334155;
            vertical-align: top;
        }
        .data-table tr:nth-child(even) {
            background-color: #f8fafc; /* Zebra striping */
        }
        .data-table tr:last-child td {
            border-bottom: none;
        }

        /* Totals Section */
        .totals-container {
            width: 100%;
            margin-top: 8px;
            page-break-inside: avoid;
        }
        .totals-table {
            width: 40%;
            float: right;
            border-collapse: collapse;
        }
        .totals-table td {
            padding: 3px 0;
            text-align: right;
        }
        .totals-label {
            color: #64748b;
            padding-right: 15px;
        }
        .totals-value {
            font-weight: bold;
        }
        .grand-total {
            border-top: 2px solid #3b82f6;
            margin-top: 8px;
            padding-top: 8px !important;
            font-size: 14px;
            color: #1e293b;
        }

        /* Footer */
        .footer {
            margin-top: 14px;
            border-top: 1px solid #e2e8f0;
            padding-top: 6px;
            text-align: center;
            font-size: 10px;
            color: #94a3b8;
        }
        
        .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .badge-gray { background-color: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
    </style>
</head>
<body>
    @php
        // Determine company for current report (fall back to auth user's company or first record)
        $company = $purchase->company ?? null;
        if (function_exists('auth') && auth()->check()) {
            $company = $company ?? \App\Models\Company::where('company_code', auth()->user()->company_code)->first();
        }
        $company = $company ?? \App\Models\Company::first();

        // Prefer PNG versions when available (requested), fall back to a small placeholder if missing.
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

        $logoData = @file_get_contents($logoPath);
        $logoUrl = $logoData ? 'data:image/png;base64,' . base64_encode($logoData) : '';
    @endphp

    <!-- Header -->
    <table class="w-full header-container">
        <tr>
            <td width="60%">
                <div style="text-align: left; margin-bottom: 10px;">
                    <img src="{{ $logoUrl }}" alt="{{ $company->name ?? 'Company' }}" style="height: 40px;" />
                </div>
                <!-- <h1 class="company-name">{{ $company->name ?? 'Company Name' }}</h1> -->
                <div class="company-details">
                    {{ $purchase->section->name ?? 'Main Branch' }}<br>
                    Goods Received Note
                </div>
            </td>
            <td width="40%" class="text-right" style="vertical-align: top;">
                <h2 class="report-title">GRN Report</h2>
                <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
                    Generated on: {{ $generated_at }}
                </div>
            </td>
        </tr>
    </table>

    <!-- Info Boxes -->
    <table class="info-table">
        <tr>
            <td width="33%">
                <div class="info-box">
                    <div class="info-title">Supplier Details</div>
                    <div class="info-content">
                        <div class="info-row" style="margin-bottom: 8px;">
                            <strong style="font-size: 14px;">Name: {{ $purchase->supplier->FstNm ?? $purchase->supplier->full_name ?? 'N/A' }}</strong>
                        </div>
                        <div class="info-row"><span class="label">Code:</span> {{ $purchase->SuppCode ?? '-' }}</div>
                        <div class="info-row"><span class="label">Invoice No:</span> {{ $purchase->SuppInvNo ?? 'N/A' }}</div>
                    </div>
                </div>
            </td>
            <td width="60%">
                <div class="info-box">
                    <div class="info-title">GRN Reference</div>
                    <div class="info-content">
                        <div class="info-row"><span class="label">GRN No:</span> <strong style="color: #1e293b;">{{ $purchase->company_code }}-{{ str_pad($purchase->PurchaseNo, 6, '0', STR_PAD_LEFT) }}</strong></div>
                        <div class="info-row"><span class="label">GRN Date:</span> {{ $purchase->GRNDate->format('d M Y') }}</div>
                        <div class="info-row"><span class="label">Batch:</span> {{ $purchase->batch_no ?? '-' }}</div>
                    </div>
                </div>
            </td>
            <td width="10%">
                <div class="info-box">
                    <div class="info-title">Remarks</div>
                    <div class="info-content">
                        <!-- <div class="info-row" style="margin-bottom: 6px;">
                            <span class="label">Status:</span> 
                            @if($purchase->flused)
                                <span class="badge" style="background-color: #dcfce7; color: #166534; border: 1px solid #86efac;">POSTED</span>
                            @elseif($purchase->Status == 'I')
                                <span class="badge" style="background-color: #fee2e2; color: #991b1b; border: 1px solid #fca5a5;">CANCELLED</span>
                            @else
                                <span class="badge" style="background-color: #ffedd5; color: #9a3412; border: 1px solid #fdba74;">DRAFT</span>
                            @endif
                        </div> -->
                        <div class="info-row">
                            <span class="label" style="vertical-align: top;">Note:</span> 
                            <span style="display: inline-block; width: 65%; vertical-align: top;">{{ Str::limit($purchase->Des ?? '-', 100) }}</span>
                        </div>
                    </div>
                </div>
            </td>
        </tr>
    </table>


    @php
        // Check if this is a printer GRN (only if ALL items are printing_section AND no free items)
        // Also check for serial_number presence since stock_location_type was removed
        // If any item is main_stock, has free qty, or null stock type, show Free column
        $hasPrinterItems = $purchase->details->some(function($detail) {
            return !empty($detail->serial_number) || $detail->stock_location_type === 'printing_section';
        });
        $allPrintingSection = $purchase->details->every(function($detail) {
            return $detail->stock_location_type === 'printing_section' || !empty($detail->serial_number);
        });
        $hasFreeItems = $purchase->details->some(function($detail) {
            return $detail->Free > 0;
        });
        $isPrinterGrn = $allPrintingSection && !$hasFreeItems && $purchase->details->count() > 0;
    @endphp

    <!-- Items Table -->
    <table class="data-table" style="margin-top: 20px;">
        <thead>
            <tr>
                <th style="width: 5%; text-align: center; padding-left: 10px; border-bottom: 2px solid #e2e8f0;">#</th>
                <th style="width: 35%; text-align: left; border-bottom: 2px solid #e2e8f0;">Product Information</th>
                <th style="width: 10%; text-align: center; border-bottom: 2px solid #e2e8f0;">Qty</th>
                @if(!$isPrinterGrn)
                <th style="width: 10%; text-align: center; border-bottom: 2px solid #e2e8f0;">Free</th>
                @else
                <th style="width: 10%; text-align: right; border-bottom: 2px solid #e2e8f0;">Cus Disc</th>
                @endif
                <th style="width: 15%; text-align: right; border-bottom: 2px solid #e2e8f0;">Unit Cost</th>
                <th style="width: 15%; text-align: right; border-bottom: 2px solid #e2e8f0; color: #2563eb;">New Cost</th>
                <th style="width: 10%; text-align: right; border-bottom: 2px solid #e2e8f0;">Disc</th>
                <th style="width: 15%; text-align: right; padding-right: 10px; border-bottom: 2px solid #e2e8f0;">Total (Rs)</th>
            </tr>
        </thead>
        <tbody>
            @foreach($purchase->details as $index => $detail)
            <tr style="{{ $loop->even ? 'background-color: #f8fafc;' : '' }}">
                <td style="text-align: center; vertical-align: top; padding: 4px 3px; color: #64748b;">{{ $index + 1 }}</td>
                <td style="vertical-align: top; padding: 4px 3px;">
                    @if(!empty($detail->serial_number) || $detail->stock_location_type === 'printing_section')
                        {{-- Printer GRN: Show item_name, brand+model, and serial_number --}}
                        @php
                            // Try multiple sources for item name
                            $itemName = null;
                            if (!empty($detail->item_name)) {
                                $itemName = $detail->item_name;
                            } elseif (isset($detail->product) && !empty($detail->product->ItmNm)) {
                                $itemName = $detail->product->ItmNm;
                            } else {
                                $itemName = 'Product Name N/A';
                            }
                        @endphp
                        <div style="font-weight: bold; color: #334155; margin-bottom: 2px;">{{ $itemName }}</div>
                        <div style="font-size: 10px; color: #64748b; margin-bottom: 1px;">
                            <span style="font-weight: 600;">{{ $detail->brand }} {{ $detail->model }}</span>
                        </div>
                        <div style="font-size: 10px; font-weight: bold; color: #0a0d12ff;">
                            <span style="font-family: 'Courier New', monospace; padding: 0; border-radius: 3px;">S/N: {{ $detail->serial_number }}</span>
                        </div>
                    @else
                        {{-- Item GRN: Show only item_name and code --}}
                        @php
                            // Try multiple sources for item name
                            $itemName = null;
                            if (!empty($detail->item_name)) {
                                $itemName = $detail->item_name;
                            } elseif (isset($detail->product) && !empty($detail->product->ItmNm)) {
                                $itemName = $detail->product->ItmNm;
                            } else {
                                $itemName = 'Product Name N/A';
                            }
                        @endphp
                        <div style="font-weight: bold; color: #334155; margin-bottom: 2px;">{{ $itemName }}</div>
                        @if(isset($detail->product) && !empty($detail->product->ItemCode))
                        <div style="font-size: 10px; color: #64748b;">
                            Code: {{ $detail->product->ItemCode }}
                        </div>
                        @endif
                    @endif
                    @if(!empty($detail->remark))
                        <div style="font-size: 9px; color: #94a3b8; font-style: italic; margin-top: 2px;">
                            Note: {{ $detail->remark }}
                        </div>
                    @endif
                </td>
                <td style="text-align: center; vertical-align: top; padding: 4px 3px;">
                    <span style="font-weight: 600; color: #334155;">{{ number_format($detail->Qty, 2) }}</span>
                </td>
                @if(!$isPrinterGrn)
                <td style="text-align: center; vertical-align: top; padding: 6px 4px; color: {{ $detail->Free > 0 ? '#16a34a' : '#64748b' }};">
                    <span style="{{ $detail->Free > 0 ? 'font-weight: 600;' : '' }}">{{ $detail->Free > 0 ? number_format($detail->Free, 2) : '-' }}</span>
                </td>
                @else
                <td style="text-align: right; vertical-align: top; padding: 4px 3px; color: #334155;">
                    <span>{{ $detail->CusDiscountRate > 0 ? number_format($detail->CusDiscountRate, 2) : '-' }}</span>
                </td>
                @endif
                <td style="text-align: right; vertical-align: top; padding: 4px 3px; color: #334155;">
                    {{ number_format($detail->CostPrice, 2) }}
                </td>
                <td style="text-align: right; vertical-align: top; padding: 4px 3px; font-weight: bold; color: #2563eb;">
                    {{ number_format($detail->NewCostPrice ?? $detail->CostPrice, 2) }}
                </td>
                <td style="text-align: right; vertical-align: top; padding: 4px 3px; color: #090d12ff;">
                    @if($detail->DiscountRate > 0)
                        {{ number_format($detail->DiscountRate, 2) }}
                        <span style="font-size: 11px; font-weight: 600; color: #000000ff; margin-left: 2px;">
                            {{ ($detail->discount_type ?? 'fixed') === 'percentage' ? '%' : 'Rs' }}
                        </span>
                    @else
                        -
                    @endif
                </td>
                <td style="text-align: right; vertical-align: top; padding: 4px 6px; font-weight: bold; color: #334155;">
                    {{ number_format($detail->AmountF, 2) }}
                </td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <!-- Totals -->
    <div class="totals-container">
        <table class="totals-table">
            <tr>
                <td class="totals-label">Total Amount</td>
                <td class="totals-value">Rs. {{ number_format($purchase->CostTotal, 2) }}</td>
            </tr>
            <tr>
                <td class="totals-label">Total Discount</td>
                <td class="totals-value" style="color: #ef4444;">- Rs. {{ number_format($purchase->ToIDscount, 2) }}</td>
            </tr>
            @if($purchase->TaxAmount > 0)
            <tr>
                <td class="totals-label">Tax Amount</td>
                <td class="totals-value">Rs. {{ number_format($purchase->TaxAmount, 2) }}</td>
            </tr>
            @endif
            <tr>
                <td class="grand-total totals-label u-uppercase">Net Total</td>
                <td class="grand-total totals-value" style="color: #2563eb;">Rs. {{ number_format($purchase->TotalVal, 2) }}</td>
            </tr>
        </table>
        <div style="clear: both;"></div>
    </div>

    <!-- Footer -->
    <div class="footer">
        <p>
            Generated by user: <strong>{{ $generated_by }}</strong> | System: UNITEC POS<br>
            This is a computer-generated document and is valid without a signature.
        </p>
    </div>
</body>
</html>
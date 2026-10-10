<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quotation - {{ $quotation->serviceJob?->job_number ?? 'N/A' }}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@100..900&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
        }

        body {
            font-family: 'Segoe UI', 'Noto Sans Sinhala', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            background: white;
            padding: 0;
            margin: 0;
        }

        .print-button-wrapper {
            padding: 20px;
            text-align: right;
            background: white;
        }

        @page {
            size: A4 portrait;
            margin: 10mm;
            padding: 0;
        }

        .container {
            max-width: 210mm;
            width: 210mm;
            margin: 0 auto;
            background: white;
            padding: 10mm;
            box-sizing: border-box;
        }

        .printable-quotation {
            width: 100%;
            background: white;
            padding: 0;
            margin: 0;
        }

        /* Header Section */
        .quotation-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px solid #1e40af;
            padding-bottom: 10px;
            margin-bottom: 12px;
        }

        .logo-section {
            flex: 0 0 auto;
            margin-right: 12px;
        }

        .logo-section img {
            height: 32px;
            width: auto;
            object-fit: contain;
        }

        .company-info h1 {
            font-size: 16px;
            font-weight: 700;
            color: #1e40af;
            margin-bottom: 2px;
        }

        .company-contact {
            font-size: 10px;
            color: #4b5563;
            margin-top: 3px;
            line-height: 1.3;
        }

        .company-contact p {
            margin: 1px 0;
        }

        .quotation-badge {
            background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%);
            color: white;
            padding: 10px 12px;
            border-radius: 6px;
            text-align: right;
            flex: 0 0 auto;
        }

        .quotation-badge .label {
            font-size: 8px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            opacity: 0.9;
        }

        .quotation-badge .number {
            font-size: 18px;
            font-weight: bold;
            margin-top: 3px;
        }

        /* Company Info Table */
        .company-info-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
            font-size: 9px;
        }

        .company-info-table td {
            border: none;
            padding: 2px 4px;
            vertical-align: top;
        }

        .company-info-table td:nth-child(odd) {
            font-weight: 600;
            width: 20%;
            color: #1f2937;
        }

        .company-info-table td:nth-child(even) {
            width: 30%;
            color: #4b5563;
        }

        /* Title Row */
        .title-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e5e7eb;
        }

        .title-row h2 {
            font-size: 16px;
            font-weight: bold;
            color: #1e40af;
        }

        .issue-date {
            text-align: right;
        }

        .issue-date .label {
            font-size: 8px;
            font-weight: 600;
            text-transform: uppercase;
            color: #6b7280;
        }

        .issue-date .date {
            font-size: 11px;
            font-weight: bold;
            color: #111827;
            margin-top: 2px;
        }

        /* Details Grid */
        .details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 12px;
        }

        .detail-box {
            padding: 8px;
            border-radius: 4px;
            border-left: 3px solid #1e40af;
            background-color: #f0f9ff;
        }

        .detail-box.customer {
            border-left-color: #10b981;
            background-color: #f0fdf4;
        }

        .detail-box h3 {
            font-size: 8px;
            font-weight: 600;
            text-transform: uppercase;
            color: #6b7280;
            margin-bottom: 6px;
            letter-spacing: 0.3px;
        }

        .detail-item {
            margin-bottom: 4px;
        }

        .detail-item .label {
            font-size: 8px;
            color: #6b7280;
            text-transform: uppercase;
            font-weight: 600;
        }

        .detail-item .value {
            font-size: 11px;
            font-weight: 600;
            color: #111827;
            margin-top: 1px;
        }

        /* Device Information */
        .device-info {
            background: linear-gradient(to right, #f8fafc 0%, #ffffff 100%);
            padding: 10px;
            border-radius: 4px;
            border: 1px solid #e2e8f0;
            margin-bottom: 12px;
        }

        .device-info h3 {
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            color: #1f2937;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            letter-spacing: 0.3px;
        }

        .device-info h3::before {
            content: '';
            display: inline-block;
            width: 14px;
            height: 14px;
            background-color: #1e40af;
            border-radius: 50%;
            margin-right: 6px;
        }

        .device-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1.5fr;
            gap: 10px;
        }

        .device-field {
            display: flex;
            flex-direction: column;
        }

        .device-field .label {
            font-size: 7px;
            font-weight: 700;
            text-transform: uppercase;
            color: #6b7280;
            margin-bottom: 2px;
            letter-spacing: 0.2px;
        }

        .device-field .value {
            font-size: 10px;
            font-weight: 600;
            color: #111827;
        }

        /* Items Table */
        .items-section h3 {
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            color: #1f2937;
            margin-bottom: 8px;
            letter-spacing: 0.3px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
            font-size: 10px;
        }

        thead {
            background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%);
            color: white;
        }

        thead th {
            padding: 6px;
            text-align: left;
            font-weight: 700;
            font-size: 8px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            border: 1px solid #1e3a8a;
        }

        thead th:nth-child(1),
        thead th:nth-child(4),
        thead th:nth-child(5),
        thead th:nth-child(6) {
            text-align: right;
        }

        tbody td {
            padding: 6px;
            border: 1px solid #cbd5e1;
            font-size: 9px;
        }

        tbody tr:nth-child(even) {
            background-color: #f8fafc;
        }

        tbody tr:nth-child(odd) {
            background-color: white;
        }

        tbody td:nth-child(1),
        tbody td:nth-child(4),
        tbody td:nth-child(5),
        tbody td:nth-child(6) {
            text-align: right;
            font-weight: 600;
        }

        .item-badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 12px;
            font-size: 8px;
            font-weight: 600;
            text-transform: capitalize;
        }

        .badge-part {
            background-color: #dbeafe;
            color: #1e40af;
        }

        .badge-service {
            background-color: #e9d5ff;
            color: #7c3aed;
        }

        .badge-other {
            background-color: #e5e7eb;
            color: #374151;
        }

        tfoot {
            background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%);
            color: white;
            font-weight: 700;
        }

        tfoot td {
            padding: 8px;
            border: 1px solid #1e3a8a;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.2px;
        }

        tfoot td:last-child {
            font-size: 10px;
            font-weight: 700;
        }

        /* Notes Section */
        .notes-section {
            background-color: #fffbeb;
            border-left: 3px solid #f59e0b;
            padding: 8px;
            border-radius: 4px;
            margin-bottom: 10px;
        }

        .notes-section h3 {
            font-size: 8px;
            font-weight: 700;
            text-transform: uppercase;
            color: #1f2937;
            margin-bottom: 4px;
            letter-spacing: 0.2px;
        }

        .notes-section p {
            font-size: 9px;
            color: #4b5563;
            white-space: pre-wrap;
            line-height: 1.3;
        }

        /* Terms & Conditions */
        .terms-section {
            background-color: #f8fafc;
            padding: 8px;
            border-radius: 4px;
            margin-bottom: 10px;
            border: 1px solid #e5e7eb;
        }

        .terms-section h4 {
            font-size: 8px;
            font-weight: 700;
            text-transform: uppercase;
            color: #1f2937;
            margin-bottom: 6px;
            letter-spacing: 0.2px;
        }

        .terms-section ul {
            list-style: none;
            padding: 0;
        }

        .terms-section li {
            font-size: 8px;
            color: #4b5563;
            margin-bottom: 3px;
            display: flex;
            align-items: flex-start;
            line-height: 1.2;
        }

        .terms-section li::before {
            content: '•';
            color: #1e40af;
            font-weight: bold;
            margin-right: 4px;
            font-size: 8px;
        }

        /* Signature Section */
        .signature-section {
            display: flex;
            justify-content: space-between;
            margin-top: 15px;
            padding-top: 10px;
            border-top: 2px solid #1e40af;
        }

        .signature-box {
            flex: 1;
            text-align: left;
        }

        .signature-box.right {
            text-align: right;
        }

        .signature-box .label {
            font-size: 7px;
            font-weight: 700;
            text-transform: uppercase;
            color: #6b7280;
            margin-bottom: 2px;
            letter-spacing: 0.2px;
        }

        .signature-box .signatory {
            font-size: 9px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 8px;
        }

        .signature-line {
            border-bottom: 1.5px solid #6b7280;
            width: 100px;
            margin-bottom: 2px;
        }

        .signature-box.right .signature-line {
            margin-left: auto;
        }

        .signature-box .note {
            font-size: 7px;
            color: #6b7280;
            margin-top: 2px;
        }

        /* Footer */
        .quotation-footer {
            margin-top: 12px;
            padding-top: 8px;
            border-top: 1.5px solid #e5e7eb;
            text-align: center;
            font-size: 8px;
        }

        .quotation-footer p {
            color: #6b7280;
            margin-bottom: 1px;
        }

        /* Print Media Query */
        @media print {
            body {
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
            }

            .print-button-wrapper {
                display: none !important;
            }

            .container {
                max-width: 100% !important;
                width: 100% !important;
                height: auto !important;
                margin: 0 !important;
                padding: 0 !important;
                page-break-after: avoid;
            }

            .printable-quotation {
                padding: 0 !important;
                page-break-after: avoid;
            }

            .no-print {
                display: none !important;
            }

            * {
                orphans: 3;
                widows: 3;
            }
        }
    </style>
</head>
<body>
    <!-- Print Button -->
    <div class="print-button-wrapper">
        <button onclick="window.print()" style="padding: 10px 20px; background-color: #1e40af; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 14px;">
            🖨️ Print Quotation
        </button>
    </div>

    @php
        // Determine company for report
        $company = $company ?? null;
        if (function_exists('auth') && auth()->check()) {
            $company = $company ?? \App\Models\Company::where('company_code', auth()->user()->company_code)->first();
        }
        $company = $company ?? \App\Models\Company::first();

        $companyObj = is_array($company) ? (object) $company : $company;
        $companyCode = strtoupper($companyObj->company_code ?? 'VIS001');
        
        // Logo handling
        $vismassPng = public_path('images/vismass-logo.png');
        $malibuPng  = public_path('images/malibu-logo.png');
        $placeholderPng = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAQAAAAAYLlVAAAAHklEQVR4nO3BMQEAAADCoPVPbQ0PoAAAAAAAAAAA4BsMCgABxIoV2AAAAAElFTkSuQmCC');
        
        if (!file_exists($vismassPng)) {
            @file_put_contents($vismassPng, $placeholderPng);
        }
        if (!file_exists($malibuPng)) {
            @file_put_contents($malibuPng, $placeholderPng);
        }

        $logoUrl = asset('images/vismass-logo.png');
        if ($companyCode === 'MAL001') {
            $logoUrl = asset('images/malibu-logo.png');
        }

        // Prefer explicit company logo from database, if set
        if (!empty($companyObj->logo)) {
            $companyLogo = trim($companyObj->logo);

            if (preg_match('/^https?:\/\//i', $companyLogo)) {
                // Absolute URL
                $logoUrl = $companyLogo;
            } elseif (Str::startsWith($companyLogo, ['/storage/', '/images/', 'storage/', 'images/'])) {
                // Storage path or images path
                $companyLogo = ltrim($companyLogo, '/');
                $logoUrl = asset($companyLogo);
            } elseif (file_exists(public_path($companyLogo))) {
                // Local public path
                $logoUrl = asset($companyLogo);
            } elseif (file_exists(public_path('storage/' . $companyLogo))) {
                // Local storage path
                $logoUrl = asset('storage/' . ltrim($companyLogo, '/'));
            }
        }

        $companyName = $companyObj->name ?? 'Company';
    @endphp

    <div class="container">
        <div class="printable-quotation">
            <!-- Header -->
            <div class="quotation-header">
                <div style="display: flex; align-items: flex-start; flex: 1;">
                    <div class="logo-section">
                        <img src="{{ $logoUrl }}" alt="{{ $companyName }}" />
                        <div class="company-contact">
                            @if($company->address ?? false)
                                <p>{{ $company->address }}</p>
                            @endif
                            @if($company->phone ?? false)
                                <p>Tel: {{ $company->phone }}</p>
                            @endif
                            @if($company->email ?? false)
                                <p>Email: {{ $company->email }}</p>
                            @endif
                        </div>
                    </div>
                    <!-- <div class="company-info" style="flex: 1;">
                        <h1>{{ $companyName }}</h1>
                        <div class="company-contact">
                            @if($company->address ?? false)
                                <p>{{ $company->address }}</p>
                            @endif
                            @if($company->phone ?? false)
                                <p>Tel: {{ $company->phone }}</p>
                            @endif
                            @if($company->email ?? false)
                                <p>Email: {{ $company->email }}</p>
                            @endif
                        </div>
                    </div> -->
                </div>
                <div class="quotation-badge">
                    <div class="label">Quotation</div>
                    <div class="number">#{{ $quotation->id }}</div>
                </div>
            </div>

            <!-- Company Info Table -->
            <table class="company-info-table">
                <tbody>
                    <tr>
                        <td><strong>Company:</strong></td>
                        <td>{{ $company->name ?? 'N/A' }}</td>
                        <td><strong>Job Number:</strong></td>
                        <td>{{ $quotation->serviceJob?->job_number ?? 'N/A' }}</td>
                    </tr>
                    <tr>
                        <td><strong>Section:</strong></td>
                        <td>{{ $company->section ?? 'N/A' }}</td>
                        <td><strong>Generated Date:</strong></td>
                        <td>{{ $quotation->created_at->format('d M Y h:i A') }}</td>
                    </tr>
                </tbody>
            </table>

            <!-- Title & Date -->
            <div class="title-row">
                <h2>SERVICE QUOTATION</h2>
                <div class="issue-date">
                    <div class="label">Date Issued</div>
                    <div class="date">{{ $quotation->created_at->format('d M Y') }}</div>
                </div>
            </div>

            <!-- Details Grid -->
            <div class="details-grid">
                <div class="detail-box">
                    <h3>Service Job Details</h3>
                    <div class="detail-item">
                        <div class="label">Job Number</div>
                        <div class="value">{{ $quotation->serviceJob?->job_number ?? 'N/A' }}</div>
                    </div>
                    <div class="detail-item">
                        <div class="label">Created By</div>
                        <div class="value">
                            @if($quotation->createdBy)
                                {{ $quotation->createdBy->first_name }} {{ $quotation->createdBy->last_name }}
                            @else
                                N/A
                            @endif
                        </div>
                    </div>
                </div>

                <div class="detail-box customer">
                    <h3>Customer Details</h3>
                    <div class="detail-item">
                        <div class="label">Customer Name</div>
                        <div class="value">{{ $quotation->serviceJob?->customer_name ?? 'N/A' }}</div>
                    </div>
                    <div class="detail-item">
                        <div class="label">Phone</div>
                        <div class="value">{{ $quotation->serviceJob?->customer_phone ?? 'N/A' }}</div>
                    </div>
                </div>
            </div>

            <!-- Device Information -->
            <div class="device-info">
                <h3>Device Information</h3>
                <div class="device-grid">
                    <div class="device-field">
                        <span class="label">Brand</span>
                        <span class="value">{{ $quotation->serviceJob?->device_brand ?? 'N/A' }}</span>
                    </div>
                    <div class="device-field">
                        <span class="label">Model</span>
                        <span class="value">{{ $quotation->serviceJob?->device_model ?? 'N/A' }}</span>
                    </div>
                    <div class="device-field">
                        <span class="label">Serial Number</span>
                        <span class="value">{{ $quotation->serviceJob?->device_serial ?? 'N/A' }}</span>
                    </div>
                </div>
            </div>

            <!-- Items Table -->
            <div class="items-section">
                <h3>Quotation Items</h3>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 5%;">#</th>
                            <th style="width: 40%; text-align: left;">Description</th>
                            <th style="width: 15%;">Type</th>
                            <th style="width: 12%;">Quantity</th>
                            <th style="width: 14%;">Unit Price</th>
                            <th style="width: 14%;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($quotation->items as $key => $item)
                            <tr>
                                <td style="text-align: center;">{{ $key + 1 }}</td>
                                <td style="text-align: left;">{{ $item['item_name'] }}</td>
                                <td style="text-align: center;">
                                    <span class="item-badge badge-{{ $item['item_type'] === 'part' ? 'part' : ($item['item_type'] === 'service_charge' ? 'service' : 'other') }}">
                                        @if($item['item_type'] === 'part')
                                            Part
                                        @elseif($item['item_type'] === 'service_charge')
                                            Service
                                        @else
                                            Other
                                        @endif
                                    </span>
                                </td>
                                <td>{{ $item['quantity'] }}</td>
                                <td>Rs. {{ number_format($item['unit_price'], 2, '.', ',') }}</td>
                                <td style="color: #1e40af;">Rs. {{ number_format($item['quantity'] * $item['unit_price'], 2, '.', ',') }}</td>
                            </tr>
                        @endforeach
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="5">Total Amount:</td>
                            <td>Rs. {{ number_format($quotation->total_amount, 2, '.', ',') }}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <!-- Notes -->
            @if($quotation->notes)
                <div class="notes-section">
                    <h3>Additional Notes</h3>
                    <p>{{ $quotation->notes }}</p>
                </div>
            @endif

            <!-- Terms & Conditions -->
            <div class="terms-section">
                <h4>Terms & Conditions</h4>
                <ul>
                    <li>This quotation is valid for 30 days from the date of issue.</li>
                    <li>Prices are subject to change without prior notice.</li>
                    <li>Payment terms: As agreed upon acceptance of quotation.</li>
                    <li>Warranty terms apply as per manufacturer specifications.</li>
                </ul>
            </div>

            <!-- Signature Section -->
            <div class="signature-section">
                <div class="signature-box">
                    <div class="label">Prepared By</div>
                    <div class="signatory">
                        @if($quotation->createdBy)
                            {{ $quotation->createdBy->first_name }} {{ $quotation->createdBy->last_name }}
                        @else
                            N/A
                        @endif
                    </div>
                    <div class="signature-line"></div>
                    <div class="note">Authorized Signature</div>
                </div>

                <div class="signature-box right">
                    <div class="label">Customer Acceptance</div>
                    <div class="signatory">&nbsp;</div>
                    <div class="signature-line"></div>
                    <div class="note">Name & Signature</div>
                </div>
            </div>

            <!-- Footer -->
            <div class="quotation-footer">
                <p>Thank you for your business! For inquiries, please contact us.</p>
                <p>Report Generated: {{ now()->format('d M Y h:i A') }} | Generated by: {{ auth()->user()->first_name ?? 'System' }}</p>
                <p>© 2026 {{ $companyName }}. All rights reserved. Developed by: Unitec Software Solution</p>
            </div>
        </div>
    </div>
</body>
</html>

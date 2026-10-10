<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Parts Receipt - {{ $job->job_number }}</title>
    <style>
        body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 14px;
            margin: 0;
            padding: 0;
            background-color: #fff;
            width: 80mm; /* Standard POS paper width */
        }
        .receipt-box {
            width: 76mm; /* Content width slightly less than paper width */
            margin: 0 auto;
            padding: 2mm;
        }
        .header {
            text-align: center;
            margin-bottom: 5px;
            padding-bottom: 5px;
        }
        .header .company-logo {
            max-height: 60px;
            max-width: 70mm;
            object-fit: contain;
            margin-bottom: 2px;
        }
        .header .location {
            font-weight: bold;
            font-size: 14px;
            margin: 0;
        }
        .header .receipt-type {
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            margin: 5px 0;
            padding: 2px 0;
            font-size: 16px;
            font-weight: bold;
        }
        .header p {
            margin: 2px 0;
            font-size: 12px;
        }
        .info-section {
            width: 100%;
            margin-bottom: 5px;
            font-size: 15px;
            line-height: 1.4;
        }
        .info-section div {
            margin-bottom: 2px;
        }
        .job-number-box {
            border: 1px solid #000;
            padding: 6px 8px;
            margin: 6px 0 4px;
            text-align: center;
            font-weight: bold;
            font-size: 18px;
            letter-spacing: 0.5px;
        }
        .section-title {
            font-weight: bold;
            text-decoration: underline;
            margin-top: 5px;
            margin-bottom: 2px;
            font-size: 14px;
        }
        .dotted-line {
            border-top: 1px dashed #000;
            margin: 5px 0;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 5px;
            font-size: 13px;
        }
        th, td {
            text-align: left;
            border-bottom: 1px dashed #000;
            padding: 4px 0;
        }
        th {
            font-weight: bold;
        }
        .text-right {
            text-align: right;
        }
        .footer {
            margin-top: 10px;
            text-align: center;
            font-size: 12px;
            border-top: 1px dashed #000;
            padding-top: 5px;
        }
        .signature-box {
            margin-top: 40px;
            font-size: 12px;
            display: flex;
            justify-content: space-between;
        }
        .signature {
            border-top: 1px dotted #000;
            width: 100%;
            text-align: center;
            padding-top: 2px;
        }
        @media print {
            body { 
                width: 80mm;
            }
            .no-print { display: none; }
            @page {
                size: 80mm auto;
                margin: 0;
            }
        }
    </style>
</head>
<body onload="window.print()" onafterprint="window.history.back()">
    <div class="receipt-box">
        <div class="header">
            @php
                $companyName = $company->name ?? 'VISMASS';
                $fallbackLogo = asset('images/Vismass-logo.png');
            @endphp

            @if(!empty($logoBase64))
                <img src="{{ $logoBase64 }}" alt="{{ $companyName }}" class="company-logo" />
            @else
                <img src="{{ $fallbackLogo }}" alt="{{ $companyName }}" class="company-logo" />
            @endif

            <p class="location">{{ $company->address ?? 'Sri Lanka - Yakkala' }}</p>
            <p style="text-decoration: underline;"><strong>Service Center</strong></p>
            <div class="receipt-type">PARTS DISPATCH RECEIPT</div>
        </div>

        <div class="info-section">
            <div><strong>Date:</strong> {{ date('Y-m-d H:i') }}</div>
            <div class="job-number-box">JOB ID - {{ $job->job_number }}</div>
            
            <div class="dotted-line"></div>
            
            <div><strong>Technician: {{ $job->technician ? ($job->technician->first_name . ' ' . $job->technician->last_name) : 'Unassigned' }}</strong></div>
            <div><strong>Device: {{ $job->device_name ?: $job->device_brand . ' ' . $job->device_model }}</strong></div>
            
            <div class="dotted-line"></div>
            <div class="section-title"><strong>PARTS LIST</strong></div>
            
            @if($job->items->count() > 0)
            <table>
                <thead>
                    <tr>
                        <th>Part Name</th>
                        <th class="text-right">Qty</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($job->items as $item)
                        <tr>
                            <td style="color: #000; font-weight: bold;">{{ $item->item_name }}</td>
                            <td class="text-right" style="font-weight: bold;">{{ number_format($item->quantity, 2) }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
            @else
                <div style="text-align: center; margin-top: 10px;">No parts added to this job.</div>
            @endif
        </div>

        <div class="signature-box">
            <div class="signature">Technician Signature</div>
        </div>

        <div class="footer">
            <p>Parts Authorized By: <strong>{{ auth()->user()->first_name }} {{ auth()->user()->last_name }}</strong></p>
            <p>{{ date('Y-m-d H:i:s') }}</p>
        </div>
    </div>
</body>
</html>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Service Receipt - {{ $job->job_number }}</title>
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
        .header h1 {
            margin: 0;
            font-size: 22px;
            text-transform: uppercase;
            color: #03a9f4;
            letter-spacing: 1px;
        }
        .header h1 span {
            color: #757575;
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
        .footer {
            margin-top: 10px;
            text-align: center;
            font-size: 12px;
            border-top: 1px dashed #000;
            padding-top: 5px;
        }
        .signature-box {
            margin-top: 30px;
            font-size: 12px;
            display: flex;
            justify-content: space-between;
        }
        .signature {
            border-top: 1px dotted #000;
            width: 32mm;
            text-align: center;
            padding-top: 2px;
        }
        .important-note {
            margin-top: 10px;
            font-size: 10px;
            font-style: italic;
            text-align: justify;
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

            <!-- <h1>{{ strtoupper($companyName) }}</h1> -->
            <p class="location">{{ $company->address ?? 'Sri Lanka - Yakkala' }}</p>
            <p style="text-decoration: underline;"><strong>Service Center</strong></p>
            <p><strong>Tel: {{ '+94 332239606 / +94 70330204' }}</strong></p>
            <div class="receipt-type">SERVICE RECEIPT</div>
        </div>

        <div class="info-section">
            <div><strong>Date:</strong> {{ date('Y-m-d H:i') }}</div>
            <div class="job-number-box">JOB ID - {{ $job->job_number }}</div>
            
            <div class="dotted-line"></div>
            
            <div class="section-title"><strong>CUSTOMER DETAILS</strong></div>
            <div><strong>Name: {{ $job->customer_name }}</strong></div>
            <div><strong>Phone: {{ $job->customer_phone }}</strong></div>
            @if($job->customer_address)
            <div><strong>Address: {{ $job->customer_address }}</strong></div>
            @endif
            
            <div class="dotted-line"></div>
            
            <div class="section-title"><strong>DEVICE DETAILS</strong></div>
            <div><strong>Device: {{ $job->device_name ?: $job->device_brand . ' ' . $job->device_model }}</strong></div>
            @if($job->device_model && $job->device_name !== $job->device_model)
            <div><strong>Model: {{ $job->device_model }}</strong></div>
            @endif
            @if($job->device_serial)
            <div><strong>Serial: {{ $job->device_serial }}</strong></div>
            @endif
            
            <div class="dotted-line"></div>
            
            <div class="section-title"><strong>REPAIR REASON</strong></div>
            <div style="white-space: pre-wrap;">{{ $job->problem_description }}</div>
            
            <div class="dotted-line"></div>
            
            @if($job->advanced_payment > 0)
            <div><strong>Advanced Paid: Rs {{ number_format($job->advanced_payment, 2) }}</strong></div>
            @endif
            <div><strong>Estimated Date: {{ $job->estimated_completion_date ? \Carbon\Carbon::parse($job->estimated_completion_date)->format('Y-m-d') : 'TBD' }}</strong></div>
        </div>

        <!-- <div class="important-note">
            * Please bring this receipt when collecting your device.<br>
            * We are not responsible for any data loss. Please back up your data.<br>
            * Items not collected within 30 days may be disposed of.
        </div> -->

        <div class="signature-box">
            <div class="signature">Customer Signature</div>
            <div class="signature">Authorized By</div>
        </div>

        <div class="footer">
            <p>Thank you for choosing VISMASS!</p>
            <p>{{ date('Y-m-d H:i:s') }}</p>
        </div>
    </div>
</body>
</html>

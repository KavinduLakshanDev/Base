<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Stock Transfer Report</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            margin: 0;
            padding: 20px;
            color: #333;
            background: #fff;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
        }
        .logo {
            height: 42px;
            margin-bottom: 8px;
        }
        .company-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 2px;
        }
        .report-title {
            font-size: 16px;
            letter-spacing: 1px;
            margin: 0;
        }
        .subtitle {
            font-size: 12px;
            color: #555;
            margin-top: 6px;
        }
    </style>
</head>
<body>
    @php
        // Determine company for report (fall back to auth user's company or first record)
        $company = $company ?? null;
        if (function_exists('auth') && auth()->check()) {
            $company = $company ?? \App\Models\Company::where('company_code', auth()->user()->company_code)->first();
        }
        $company = $company ?? \App\Models\Company::first();

        $companyObj = is_array($company) ? (object) $company : $company;

        // Prefer PNG logos; create placeholder if missing (prevents DOMPDF failures)
        $companyCode = strtoupper($companyObj->company_code ?? 'VIS001');
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

        $companyName = $companyObj->name ?? 'Company';
    @endphp

    <div class="header">
        <img src="{{ $logoUrl }}" alt="{{ $companyName }}" class="logo" />
        <div class="company-name">{{ $companyName }}</div>
        <div class="report-title">STOCK TRANSFER REPORT</div>
        <div class="subtitle">Generated: {{ now()->format('d/m/Y H:i:s') }}</div>
    </div>

    <div>
        <p>This report view is a placeholder. The PDF version is generated using <code>stock_transfer_pdf</code>.</p>
    </div>
</body>
</html>

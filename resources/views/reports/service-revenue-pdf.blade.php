<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Service Revenue Report</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            margin: 20px;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
        }
        .company-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .report-title {
            font-size: 16px;
            font-weight: bold;
            margin-top: 10px;
        }
        .report-period {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
        }
        .summary-section {
            margin-top: 20px;
            margin-bottom: 20px;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 20px;
        }
        .summary-card {
            border: 1px solid #ddd;
            padding: 10px;
            border-radius: 4px;
            background-color: #f9f9f9;
        }
        .summary-label {
            font-size: 10px;
            color: #666;
            margin-bottom: 5px;
        }
        .summary-value {
            font-size: 16px;
            font-weight: bold;
            color: #333;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            font-size: 11px;
        }
        th {
            background-color: #4a5568;
            color: white;
            padding: 8px;
            text-align: left;
            border: 1px solid #333;
        }
        td {
            padding: 6px 8px;
            border: 1px solid #ddd;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        .text-right {
            text-align: right;
        }
        .section-title {
            font-size: 14px;
            font-weight: bold;
            margin-top: 25px;
            margin-bottom: 10px;
            color: #333;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
        }
        .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 10px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 10px;
        }
        .page-break {
            page-break-after: always;
        }
    </style>
</head>
<body>
    @php
        // Determine current company (fall back to auth user's company or first record)
        $company = $company ?? null;
        if (function_exists('auth') && auth()->check()) {
            $company = $company ?? \App\Models\Company::where('company_code', auth()->user()->company_code)->first();
        }
        $company = $company ?? \App\Models\Company::first();

        $companyObj = is_array($company) ? (object) $company : $company;

        // Prefer PNG logos; create placeholder if missing (prevents DOMPDF missing image errors)
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

        $companyName = $companyObj->name ?? '';
        $companyBranch = $companyObj->branch ?? '';
    @endphp

    <!-- Header -->
    <div class="header">
        <div style="text-align: center; margin-bottom: 8px;">
            <img src="{{ $logoUrl }}" alt="{{ $companyName }}" style="height: 40px;" />
        </div>
        <div class="company-name">{{ $companyName }}</div>
        <div>{{ $companyBranch }}</div>
        <div class="report-title">Service Revenue Summary Report</div>
        <div class="report-period">
            Period: {{ date('d/m/Y', strtotime($fromDate)) }} to {{ date('d/m/Y', strtotime($toDate)) }}
        </div>
        <div style="font-size: 10px; margin-top: 5px;">
            Generated on: {{ date('d/m/Y H:i:s') }}
        </div>
    </div>

    <!-- Summary Section -->
    <div class="summary-section">
        <div class="summary-grid">
            <div class="summary-card">
                <div class="summary-label">Total Revenue</div>
                <div class="summary-value">Rs {{ number_format($revenueData['summary']['total_revenue'], 2) }}</div>
                @if($revenueData['summary']['revenue_change'] != 0)
                <div style="font-size: 9px; margin-top: 3px; color: {{ $revenueData['summary']['revenue_change'] > 0 ? '#059669' : '#DC2626' }}; font-weight: bold;">
                    {{ $revenueData['summary']['revenue_change'] > 0 ? '+' : '' }}{{ number_format($revenueData['summary']['revenue_change'], 1) }}% vs previous period
                </div>
                @endif
            </div>
            <div class="summary-card">
                <div class="summary-label">Total Profit</div>
                <div class="summary-value">Rs {{ number_format($revenueData['summary']['total_profit'], 2) }}</div>
                <div style="font-size: 9px; color: #666; margin-top: 3px;">
                    Profit Margin: {{ number_format($revenueData['summary']['profit_margin'], 1) }}%
                </div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Parts Revenue</div>
                <div class="summary-value">Rs {{ number_format($revenueData['summary']['total_parts_revenue'], 2) }}</div>
                <div style="font-size: 9px; color: #666; margin-top: 3px;">
                    {{ number_format($revenueData['summary']['parts_percentage'], 1) }}% of total
                </div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Service Revenue</div>
                <div class="summary-value">Rs {{ number_format($revenueData['summary']['total_service_revenue'], 2) }}</div>
                <div style="font-size: 9px; color: #666; margin-top: 3px;">
                    {{ number_format($revenueData['summary']['service_percentage'], 1) }}% of total
                </div>
            </div>
        </div>
        <div class="summary-grid" style="grid-template-columns: repeat(3, 1fr);">
            <div class="summary-card">
                <div class="summary-label">VAT Collected</div>
                <div class="summary-value">Rs {{ number_format($revenueData['summary']['total_vat_collected'], 2) }}</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Total Jobs</div>
                <div class="summary-value">{{ $revenueData['summary']['total_jobs_count'] }}</div>
                @if($revenueData['summary']['jobs_change'] != 0)
                <div style="font-size: 9px; margin-top: 3px; color: {{ $revenueData['summary']['jobs_change'] > 0 ? '#059669' : '#DC2626' }};">
                    {{ $revenueData['summary']['jobs_change'] > 0 ? '+' : '' }}{{ number_format($revenueData['summary']['jobs_change'], 1) }}%
                </div>
                @endif
            </div>
            <div class="summary-card">
                <div class="summary-label">Average Job Value</div>
                <div class="summary-value">Rs {{ number_format($revenueData['summary']['average_job_value'], 2) }}</div>
            </div>
        </div>
    </div>

    <!-- Revenue by Period -->
    <div class="section-title">Revenue by Period</div>
    <table>
        <thead>
            <tr>
                <th>Period</th>
                <th class="text-right">Jobs</th>
                <th class="text-right">Total Revenue</th>
                <th class="text-right">Parts Revenue</th>
                <th class="text-right">Service Revenue</th>
                <th class="text-right">VAT Collected</th>
            </tr>
        </thead>
        <tbody>
            @foreach($revenueData['grouped_data'] as $group)
            <tr>
                <td>{{ $group['display_period'] }}</td>
                <td class="text-right">{{ $group['jobs_count'] }}</td>
                <td class="text-right"><strong>Rs {{ number_format($group['total_revenue'], 2) }}</strong></td>
                <td class="text-right">Rs {{ number_format($group['parts_revenue'], 2) }}</td>
                <td class="text-right">Rs {{ number_format($group['service_revenue'], 2) }}</td>
                <td class="text-right">Rs {{ number_format($group['vat_collected'], 2) }}</td>
            </tr>
            @endforeach
        </tbody>
        <tfoot>
            <tr style="background-color: #e2e8f0; font-weight: bold;">
                <td>TOTAL</td>
                <td class="text-right">{{ $revenueData['summary']['total_jobs_count'] }}</td>
                <td class="text-right">Rs {{ number_format($revenueData['summary']['total_revenue'], 2) }}</td>
                <td class="text-right">Rs {{ number_format($revenueData['summary']['total_parts_revenue'], 2) }}</td>
                <td class="text-right">Rs {{ number_format($revenueData['summary']['total_service_revenue'], 2) }}</td>
                <td class="text-right">Rs {{ number_format($revenueData['summary']['total_vat_collected'], 2) }}</td>
            </tr>
        </tfoot>
    </table>

    <div class="page-break"></div>

    <!-- Revenue by Technician -->
    <div class="section-title">Revenue by Technician</div>
    <table>
        <thead>
            <tr>
                <th>Technician Name</th>
                <th class="text-right">Jobs</th>
                <th class="text-right">Total Revenue</th>
                <th class="text-right">Total Profit</th>
                <th class="text-right">Profit %</th>
                <th class="text-right">Avg Job Value</th>
                <th class="text-right">Parts</th>
                <th class="text-right">Service</th>
            </tr>
        </thead>
        <tbody>
            @foreach($revenueData['revenue_by_technician'] as $tech)
            <tr>
                <td>{{ $tech['technician_name'] }}</td>
                <td class="text-right">{{ $tech['jobs_count'] }}</td>
                <td class="text-right"><strong>Rs {{ number_format($tech['total_revenue'], 2) }}</strong></td>
                <td class="text-right"><strong>Rs {{ number_format($tech['total_profit'], 2) }}</strong></td>
                <td class="text-right">{{ number_format($tech['profit_margin'], 1) }}%</td>
                <td class="text-right">Rs {{ number_format($tech['avg_job_value'], 2) }}</td>
                <td class="text-right">Rs {{ number_format($tech['parts_revenue'], 2) }}</td>
                <td class="text-right">Rs {{ number_format($tech['service_revenue'], 2) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <!-- Revenue by Customer (Top 20) -->
    <div class="section-title">Revenue by Customer (Top 20)</div>
    <table>
        <thead>
            <tr>
                <th>Customer Name</th>
                <th class="text-right">Jobs</th>
                <th class="text-right">Total Revenue</th>
                <th class="text-right">Total Profit</th>
                <th class="text-right">Profit %</th>
                <th class="text-right">Avg Job Value</th>
                <th class="text-right">Parts</th>
                <th class="text-right">Service</th>
            </tr>
        </thead>
        <tbody>
            @foreach(array_slice($revenueData['revenue_by_customer'], 0, 20) as $customer)
            <tr>
                <td>{{ $customer['customer_name'] }}</td>
                <td class="text-right">{{ $customer['jobs_count'] }}</td>
                <td class="text-right"><strong>Rs {{ number_format($customer['total_revenue'], 2) }}</strong></td>
                <td class="text-right"><strong>Rs {{ number_format($customer['total_profit'], 2) }}</strong></td>
                <td class="text-right">{{ number_format($customer['profit_margin'], 1) }}%</td>
                <td class="text-right">Rs {{ number_format($customer['avg_job_value'], 2) }}</td>
                <td class="text-right">Rs {{ number_format($customer['parts_revenue'], 2) }}</td>
                <td class="text-right">Rs {{ number_format($customer['service_revenue'], 2) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <!-- Footer -->
    <div class="footer">
        <div>{{ $company['name'] }} - Service Revenue Report</div>
        <div>This is a system generated report</div>
    </div>
</body>
</html>

<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Service Charges Report</title>
    <style>
    <style>
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 11px; margin: 15px; }
        .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 8px; }
        .report-title { font-size: 15px; font-weight: bold; margin-top: 8px; }
        .report-period { font-size: 11px; color: #666; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 10px; }
        th { background-color: #4a5568; color: white; padding: 6px; text-align: left; border: 1px solid #333; }
        td { padding: 5px 6px; border: 1px solid #ddd; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #ddd; padding-top: 8px; }
        .row-even { background-color: #f9f9f9; }
    </style>
</head>
<body>
    @php
        $companyObj = is_array($company) ? (object) $company : $company;
        $companyCode = strtoupper($companyObj->code ?? 'VIS001');
        
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
        
        $companyName = $companyObj->name ?? '';
        $companyBranch = $companyObj->branch ?? '';
    @endphp

    <!-- Header -->
    <div class="header">
        <div style="text-align: center; margin-bottom: 8px;">
            <img src="{{ $logoUrl }}" alt="{{ $companyName }}" style="height: 40px;" />
        </div>
        <!-- <div class="company-name">{{ $companyName }}</div> -->
        <!-- <div>{{ $companyBranch }}</div> -->
        <div class="report-title">Service Charges Report</div>
        <div class="report-period">
            Period: {{ date('d/m/Y', strtotime($fromDate)) }} to {{ date('d/m/Y', strtotime($toDate)) }}
        </div>
        <div style="font-size: 10px; margin-top: 5px;">
            Generated on: {{ date('d/m/Y H:i:s') }}
        </div>
    </div>

    <!-- Summary Section -->
    <!-- <div class="summary-section">
        <table class="summary-table">
            <tr>
                <td>
                    <div class="summary-card">
                        <div class="summary-label">Total Records</div>
                        <div class="summary-value">{{ $reportData['summary']['total_records'] }}</div>
                    </div>
                </td>
                <td>
                    <div class="summary-card">
                        <div class="summary-label">Total Amount</div>
                        <div class="summary-value">Rs {{ number_format($reportData['summary']['total_amount'], 2) }}</div>
                    </div>
                </td>
            </tr>
        </table>
    </div> -->

    <!-- Detailed List -->
    <table>
        <thead>
            <tr>
                <th>#</th>
                <th>Date</th>
                <th>Job Number</th>
                <th>Customer Name</th>
                <th>Technician</th>
                <th>Service Charge</th>
                <th class="text-center">Status</th>
                @if($includeProducts)
                    <th class="text-right">Service Price</th>
                    <th>Products Used</th>
                    <th class="text-right" style="background-color:#d1fae5; color:#15803d;">Job Total</th>
                @else
                    <th class="text-right">Total</th>
                @endif
            </tr>
        </thead>
        <tbody>
            @foreach($reportData['items'] as $index => $item)
            @php
                $products = $item['products'] ?? [];
                $productTotal = array_sum(array_column($products, 'total'));
                $jobTotal = $item['total'] + $productTotal;
            @endphp
            <tr>
                <td>{{ $index + 1 }}</td>
                <td>{{ $item['completion_date'] }}</td>
                <td>{{ $item['job_number'] }}</td>
                <td>{{ $item['customer_name'] }}</td>
                <td>{{ $item['technician_name'] }}</td>
                <td>{{ $item['service_charge'] }}</td>
                <td class="text-center">{{ ucfirst(str_replace('_', ' ', $item['status'])) }}</td>
                @if($includeProducts)
                    <td class="text-right" style="color:#1d4ed8;"><strong>Rs {{ number_format($item['total'], 2) }}</strong></td>
                    <td style="padding: 0; vertical-align: top;">
                        @if(empty($products))
                            <div style="padding: 5px 6px; color: #999; font-style: italic;">No products</div>
                        @else
                            <table style="width: 100%; margin: 0; border: none;">
                                @foreach($products as $p)
                                    <tr>
                                        <td style="border: none; border-bottom: 1px solid #f0f0f0; padding: 4px 6px;">
                                            <div style="font-weight: bold; color: #333;">{{ $p['item_name'] }}</div>
                                            <div style="font-size: 9px; color: #666;">Qty: {{ number_format($p['quantity'], 2) }}</div>
                                        </td>
                                        <td style="border: none; border-bottom: 1px solid #f0f0f0; padding: 4px 6px; text-align: right; vertical-align: top;">
                                            Rs {{ number_format($p['total'], 2) }}
                                        </td>
                                    </tr>
                                @endforeach
                            </table>
                        @endif
                    </td>
                    <td class="text-right" style="color:#15803d; background-color:#f0fdf4;"><strong>Rs {{ number_format($jobTotal, 2) }}</strong></td>
                @else
                    <td class="text-right"><strong>Rs {{ number_format($item['total'], 2) }}</strong></td>
                @endif
            </tr>
            @endforeach
        </tbody>
        <tfoot>
            <tr style="background-color: #e2e8f0; font-weight: bold;">
                <td colspan="{{ $includeProducts ? 7 : 6 }}" class="text-right">TOTAL SERVICE</td>
                @if($includeProducts)
                    <td class="text-right">Rs {{ number_format($reportData['summary']['total_amount'], 2) }}</td>
                    <td></td>
                    <td></td>
                @else
                    <td class="text-right">Rs {{ number_format($reportData['summary']['total_amount'], 2) }}</td>
                @endif
            </tr>
        </tfoot>
    </table>

    <!-- Footer -->
    <div class="footer">
        <div>{{ $companyName }} - Service Charges Report</div>
        <div>This is a system generated report</div>
    </div>
</body>
</html>

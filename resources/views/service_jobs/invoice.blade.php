<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Service Bill - {{ $job->invoice_number }}</title>
    <style>
        body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 14px;
            margin: 0;
            padding: 0;
            background-color: #fff;
            width: 80mm; /* Standard POS paper width */
        }
        .invoice-box {
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
            font-size: 28px;
            text-transform: uppercase;
            color: #03a9f4;
            letter-spacing: 1px;
        }
        .header h1 span {
            color: #757575;
        }
        .header .location {
            font-weight: bold;
            font-size: 15px;
            margin: 0;
        }
        .header .bill-type {
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            margin: 5px 0;
            padding: 2px 0;
            font-size: 17px;
            font-weight: bold;
        }
        .header p {
            margin: 2px 0;
            font-size: 13px;
        }
        .info-section {
            width: 100%;
            margin-bottom: 5px;
            font-size: 13px;
            line-height: 1.4;
        }
        .info-section div {
            margin-bottom: 2px;
        }
        .dotted-line {
            border-top: 1px dashed #000;
            margin: 5px 0;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
        }
        .items-table th {
            text-align: left;
            border-bottom: 1px dashed #000;
            padding: 2px 0;
        }
        .items-table td {
            padding: 3px 0;
            vertical-align: top;
        }
        .totals-table {
            width: 100%;
            margin-top: 5px;
            font-size: 14px;
            border-top: 1px dashed #000;
            padding-top: 5px;
        }
        .totals-table td {
            padding: 2px 0;
        }
        .footer {
            margin-top: 10px;
            text-align: center;
            font-size: 12px;
            border-top: 1px dashed #000;
            padding-top: 5px;
        }
        .signature-box {
            margin-top: 20px;
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
<body onload="window.print()">
    @php
        // Pick logo based on the company code (VisMass vs Malibu)
        $companyCode = strtoupper($company->company_code ?? 'VIS001');
        $companyName = $company->name ?? 'VISMASS';

        $fallbackLogo = asset('images/Vismass-logo.png');
        if ($companyCode === 'MAL001') {
            $fallbackLogo = asset('images/malibu-logo.png');
        }
    @endphp
    <div class="invoice-box">
        <div class="header">
            <div style="text-align:center; margin-bottom:5px;">
                @if(!empty($logoBase64))
                    <img src="{{ $logoBase64 }}" alt="{{ $companyName }}" style="height:30px; display:block; margin: 0 auto;" />
                @else
                    <img src="{{ $fallbackLogo }}" alt="{{ $companyName }}" style="height:30px; display:block; margin: 0 auto;" />
                @endif
            </div>
            <p class="location">{{ $company ? $company->address : 'Sri Lanka - Yakkala' }}</p>
            <div class="bill-type">SERVICE BILL</div>
            <p>Tel: {{ $company ? $company->phone : '+94 33 22 34300' }}</p>
        </div>

        <div class="info-section">
            <div><strong>Date:</strong> {{ $job->invoice_date->format('Y-m-d H:i') }}</div>
            <div><strong>Inv No:</strong> {{ $job->invoice_number }}</div>
            <div><strong>Job No:</strong> {{ $job->job_number }}</div>
            <div class="dotted-line"></div>
            <div><strong>Customer:</strong> {{ $job->customer_name }}</div>
            @if($job->customer_phone)
            <div><strong>Phone:</strong> {{ $job->customer_phone }}</div>
            @endif
            <div class="dotted-line"></div>
            @if($job->device_model)
            <div><strong>Device:</strong> {{ $job->device_brand }} {{ $job->device_model }}</div>
            @endif
            @if($job->device_serial)
            <div><strong>S/N:</strong> {{ $job->device_serial }}</div>
            @endif
        </div>

        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 43%;">Item</th>
                    <th style="text-align: center; width: 12%;">Qty</th>
                    <th style="text-align: right; width: 20%;">Price</th>
                    <th style="text-align: right; width: 25%;">Total</th>
                </tr>
            </thead>
            <tbody>
                @foreach($job->items as $item)
                <tr>
                    <td colspan="4" style="padding-bottom: 0;">{{ $item->item_name }}</td>
                </tr>
                <tr>
                    <td style="font-size: 12px; color: #555;">({{ ucfirst($item->item_type) }})</td>
                    <td style="text-align: center;">{{ number_format($item->quantity, 0) }}</td>
                    <td style="text-align: right;">{{ number_format($item->unit_price + (($item->discount_amount ?? 0) / max($item->quantity, 1)), 2) }}</td>
                    <td style="text-align: right;">{{ number_format($item->quantity * $item->unit_price, 2) }}</td>
                </tr>
                @if(($item->discount_amount ?? 0) > 0)
                <tr>
                    <td colspan="4" style="font-size: 12px; color: #f44336; padding-top: 0; padding-bottom: 3px; font-weight: bold;">
                        Disc: -{{ number_format($item->discount_amount, 2) }}
                    </td>
                </tr>
                @endif
                @endforeach
            </tbody>
        </table>

        <table class="totals-table">
            @php
                // Recalculate from items - check each item for VAT
                $partsTotal = 0;
                $serviceTotal = 0;
                $subtotalBeforeVat = 0;
                $vatAmount = 0;
                
                foreach ($job->items as $item) {
                    $itemTotal = $item->quantity * $item->unit_price;
                    
                    // Categorize by type
                    if ($item->item_type === 'part') {
                        $partsTotal += $itemTotal;
                    } else {
                        $serviceTotal += $itemTotal;
                    }
                    
                    // Calculate VAT for VAT-inclusive items
                    // Check: (1) Customer VAT registered, (2) Item is VAT inclusive
                    if ($job->is_vat_invoice && $item->vat_inclusive) {
                        // Item price includes VAT - extract the net amount
                        // Use job's VAT rate (from company settings)
                        $vatRateDecimal = $job->vat_rate / 100;
                        
                        // Formula: Subtotal = Total / (1 + VAT_RATE/100)
                        // Example: 100 / 1.18 = 84.75
                        $itemSubtotal = $itemTotal / (1 + $vatRateDecimal);
                        $itemVat = $itemTotal - $itemSubtotal;
                        
                        $subtotalBeforeVat += $itemSubtotal;
                        $vatAmount += $itemVat;
                    } else {
                        // No VAT or customer not registered
                        $subtotalBeforeVat += $itemTotal;
                    }
                }
                
                $subtotal = $partsTotal + $serviceTotal;
                $netAmount = $subtotal - $job->advanced_payment;

                // Calculate previous balance (after applying advance payment)
                $previousBalance = $netAmount;
                $currentPaymentAmount = request('amount', 0);
                $currentPaymentMethod = request('payment_method', 'cash');
                $currentChequeNo = request('cheque_no');
                $currentReference = request('reference');

                // Exclude the service advance payment record from payment history
                $paymentHistory = $job->payments->filter(function ($payment) {
                    return !str_starts_with(trim((string) ($payment->notes ?? '')), 'Service advance payment');
                });
            @endphp
            <tr>
                <td>PARTS TOTAL</td>
                <td style="text-align: right;">{{ number_format($partsTotal, 2) }}</td>
            </tr>
            <tr>
                <td>SERVICE CHARGES TOTAL</td>
                <td style="text-align: right;">{{ number_format($serviceTotal, 2) }}</td>
            </tr>

            @if($job->is_vat_invoice)
            {{-- VAT Invoice - Show breakdown --}}
            <tr style="border-top: 1px dashed #000;">
                <td style="padding-top: 5px;"><strong>SUBTOTAL (Before VAT)</strong></td>
                <td style="text-align: right; padding-top: 5px;"><strong>{{ number_format($subtotalBeforeVat, 2) }}</strong></td>
            </tr>
            <tr>
                <td>VAT ({{ number_format($job->vat_rate, 2) }}%)</td>
                <td style="text-align: right;">{{ number_format($vatAmount, 2) }}</td>
            </tr>
            <tr style="font-weight: bold; font-size: 12px;">
                <td><strong>TOTAL (With VAT)</strong></td>
                <td style="text-align: right;"><strong>{{ number_format($subtotal, 2) }}</strong></td>
            </tr>
            @else
            {{-- Non-VAT Invoice - Show regular subtotal --}}
            <tr>
                <td><strong>SUBTOTAL</strong></td>
                <td style="text-align: right;"><strong>{{ number_format($subtotal, 2) }}</strong></td>
            </tr>
            @endif
            @if($job->advanced_payment > 0)
            <tr>
                <td>ADVANCED PAYMENT</td>
                <td style="text-align: right;">-{{ number_format($job->advanced_payment, 2) }}</td>
            </tr>
            <tr>
                <td><strong>NET AMOUNT TO PAY</strong></td>
                <td style="text-align: right;"><strong>{{ number_format($netAmount, 2) }}</strong></td>
            </tr>
            @endif

            {{-- Payment History Section --}}
            <tr>
                <td colspan="2" style="padding-top: 10px; font-weight: bold; border-top: 1px solid #000;">PAYMENT HISTORY</td>
            </tr>

            {{-- Previous Balance --}}
            <tr>
                <td>PREVIOUS BALANCE</td>
                <td style="text-align: right;">{{ number_format($previousBalance, 2) }}</td>
            </tr>

            {{-- Show all previous payments --}}
            @php
                $totalPreviousPayments = 0;
            @endphp
            @foreach($paymentHistory as $payment)
            <tr>
                <td style="font-size: 9px;">
                    @php
                        $paymentDate = \Carbon\Carbon::parse($payment->date)->format('d/m/Y');
                        $paymentMethodText = '';
                        if ($payment->method === 'cash') {
                            $paymentMethodText = 'CASH';
                        } elseif ($payment->method === 'cheque') {
                            $paymentMethodText = 'CHEQUE - #' . $payment->cheque_no;
                        } elseif ($payment->method === 'bank') {
                            $paymentMethodText = 'BANK TRANSFER';
                        } else {
                            $paymentMethodText = strtoupper($payment->method);
                        }
                        echo $paymentDate . ' - ' . $paymentMethodText;
                        $totalPreviousPayments += $payment->amount;
                    @endphp
                </td>
                <td style="text-align: right; font-size: 9px;">-{{ number_format($payment->amount, 2) }}</td>
            </tr>
            @endforeach

            {{-- Current Payment (if not yet in database) --}}
            @if($currentPaymentAmount > 0 && !$job->payments->contains(function($payment) use ($currentPaymentAmount, $currentPaymentMethod) {
                return $payment->amount == $currentPaymentAmount && $payment->method == $currentPaymentMethod;
            }))
            <tr>
                <td style="font-weight: bold;">
                    @php
                        $currentPaymentText = '';
                        if ($currentPaymentMethod === 'cash') {
                            $currentPaymentText = 'CASH PAID';
                        } elseif ($currentPaymentMethod === 'cheque') {
                            $currentPaymentText = 'CHEQUE PAID - #' . $currentChequeNo;
                        } elseif ($currentPaymentMethod === 'bank') {
                            $currentPaymentText = 'BANK TRANSFER';
                        } else {
                            $currentPaymentText = 'PAID';
                        }
                        echo date('d/m/Y') . ' - ' . $currentPaymentText;
                        $totalPreviousPayments += $currentPaymentAmount;
                    @endphp
                </td>
                <td style="text-align: right; font-weight: bold;">-{{ number_format($currentPaymentAmount, 2) }}</td>
            </tr>
            @endif

            {{-- Balance calculation showing progression --}}
            @php
                $remainingBalance = $netAmount - $totalPreviousPayments;
            @endphp
            <tr style="font-size: 11px; border-top: 1px dashed #000; padding-top: 5px;">
                <td><strong>CURRENT BALANCE</strong></td>
                <td style="text-align: right;"><strong>{{ number_format($remainingBalance, 2) }}</strong></td>
            </tr>
            @if(isset($outstandingBalance))
            <tr style="font-size: 11px; padding-top: 5px;">
                <td><strong>{{ $outstandingBalance < 0 ? 'CUS. CREDIT BAL' : 'CUS. OUTSTANDING' }}</strong></td>
                <td style="text-align: right;"><strong>{{ number_format(abs($outstandingBalance), 2) }}{{ $outstandingBalance < 0 ? ' CR' : '' }}</strong></td>
            </tr>
            @endif
        </table>

        <div class="signature-box">
            <div class="signature">Customer</div>
            <div class="signature">Authorized</div>
        </div>

        <div class="footer">
            @if($job->is_vat_invoice)
            <div style="font-weight: bold; border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 5px;">
                <div>Company VAT No: {{ $job->company_vat_no }}</div>
                <div>Customer VAT No: {{ $job->customer_vat_no }}</div>
            </div>
            @endif
            Thank you for your business!<br>
            Presenting this receipt will help speed up any Re-Service requests.<br>
            {{ date('Y-m-d H:i:s') }}
        </div>
    </div>
    
    <div class="no-print" style="text-align: center; margin-top: 20px;">
        <button onclick="window.print()" style="padding: 10px 20px; cursor: pointer;">Print Again</button>
        <button onclick="window.close()" style="padding: 10px 20px; cursor: pointer;">Close</button>
    </div>

    <script>
        window.onafterprint = function() {
            if (window.history.length > 1 && document.referrer !== "") {
                window.history.back();
            } else {
                window.close();
            }
        };
    </script>
</body>
</html>

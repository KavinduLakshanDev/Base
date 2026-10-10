<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\Shop;
use App\Models\Company;
use App\Models\Delivery;
use App\Models\DeliveryPayment;
use App\Models\ShopReturn;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ShopLedgerController extends Controller
{
    public function index(Request $request)
    {
        $company = $this->getCompany();

        $shops = Shop::where('company_code', $company->company_code ?? 'C01')
            ->orderBy('name')
            ->get();

        $data = [
            'shops' => $shops,
            'company' => $company,
        ];

        // If shop is selected, fetch transactions
        if ($request->shop_id) {
            $shop = Shop::where('id', $request->shop_id)
                ->where('company_code', $company->company_code ?? 'C01')
                ->first();
            
            if ($shop) {
                $fromDate = $request->from_date ? Carbon::parse($request->from_date)->startOfDay() : Carbon::now()->subMonths(3)->startOfDay();
                $toDate = $request->to_date ? Carbon::parse($request->to_date)->endOfDay() : Carbon::now()->endOfDay();

                // Get opening balance - deliveries minus payments minus shop returns before fromDate
                // We need to identify which old deliveries have activity in the current period (b/f deliveries)
                // Those will be shown explicitly in the period, so their delivery value goes into the period, not opening balance.
                $bfDeliveryIds = Delivery::where('shop_id', $shop->id)
                    ->where('delivery_date', '<', $fromDate->format('Y-m-d'))
                    ->where(function ($q) use ($fromDate, $toDate) {
                        $q->whereHas('payments', function ($pq) use ($fromDate, $toDate) {
                            $pq->whereBetween('payment_date', [$fromDate->format('Y-m-d'), $toDate->format('Y-m-d')])
                               ->where('status', '!=', 'bounced')
                               ->where('method', '!=', 'credit_note')
                               ->where('amount', '>', 0);
                        })
                        ->orWhereHas('shopReturns', function ($rq) use ($fromDate, $toDate) {
                            $rq->where('status', '!=', 'cancelled')
                               ->whereBetween('return_date', [$fromDate->format('Y-m-d'), $toDate->format('Y-m-d')]);
                        });
                    })
                    ->pluck('id');

                $deliveriesBeforeDate = Delivery::where('shop_id', $shop->id)
                    ->where('delivery_date', '<', $fromDate->format('Y-m-d'))
                    ->whereNotIn('id', $bfDeliveryIds) // exclude b/f deliveries (they appear in the period)
                    ->get()
                    ->sum('total_amount');
                
                $paymentsBeforeDate = DeliveryPayment::whereHas('delivery', function ($q) use ($shop) {
                        $q->where('shop_id', $shop->id);
                    })
                    ->where('payment_date', '<', $fromDate->format('Y-m-d'))
                    ->where('status', '!=', 'bounced')
                    ->where('method', '!=', 'credit_note')
                    ->where('amount', '>', 0)
                    ->sum('amount');

                // For shop returns, compute the total amount from items if possible
                $allShopReturns = ShopReturn::with(['items', 'delivery'])
                    ->where('shop_id', $shop->id)
                    ->get();

                $shopReturnsBeforeDate = $allShopReturns->filter(function ($return) use ($fromDate) {
                        // Only include CASH refund returns — credit_note returns create available credit
                        // and are only reflected in the ledger when formally applied via 'Apply Credit' payment.
                        if ($return->status === 'cancelled') return false;
                        if (($return->refund_method ?? '') === 'credit_note') return false;
                        return Carbon::parse($return->return_date)->startOfDay()->lt($fromDate);
                    })
                    ->sum(function ($return) {
                        return $return->items->sum(function ($item) {
                            return $item->quantity * $item->unit_price;
                        });
                    });
                
                $openingBalance = $deliveriesBeforeDate - $paymentsBeforeDate - $shopReturnsBeforeDate;



                // Get deliveries for the period (delivery_date in range)
                $deliveriesInPeriod = Delivery::with(['items', 'payments'])
                    ->where('shop_id', $shop->id)
                    ->whereBetween('delivery_date', [$fromDate->format('Y-m-d'), $toDate->format('Y-m-d')])
                    ->get();

                // Also get deliveries that are OUTSIDE the date range but have payments or returns WITHIN the period
                // (e.g. an old delivery that was paid/returned during this period)
                $deliveriesWithActivityInPeriod = Delivery::with(['items', 'payments'])
                    ->where('shop_id', $shop->id)
                    ->where('delivery_date', '<', $fromDate->format('Y-m-d'))
                    ->where(function ($q) use ($fromDate, $toDate) {
                        // Has payments in the period
                        $q->whereHas('payments', function ($pq) use ($fromDate, $toDate) {
                            $pq->whereBetween('payment_date', [$fromDate->format('Y-m-d'), $toDate->format('Y-m-d')])
                               ->where('status', '!=', 'bounced')
                               ->where('method', '!=', 'credit_note')
                               ->where('amount', '>', 0);
                        })
                        // Or has returns in the period
                        ->orWhereHas('shopReturns', function ($rq) use ($fromDate, $toDate) {
                            $rq->where('status', '!=', 'cancelled')
                               ->whereBetween('return_date', [$fromDate->format('Y-m-d'), $toDate->format('Y-m-d')]);
                        });
                    })
                    ->get();

                // Merge both sets, avoiding duplicates
                $allDeliveries = $deliveriesInPeriod->merge($deliveriesWithActivityInPeriod)->unique('id');

                $deliveries = $allDeliveries->map(function($delivery) use ($fromDate) {
                        // Deliveries outside the period are shown at the start of the period date
                        $displayDate = Carbon::parse($delivery->delivery_date)->lt($fromDate)
                            ? $fromDate->format('Y-m-d')
                            : $delivery->delivery_date;

                        return [
                            'date'        => $displayDate,
                            'type'        => 'delivery',
                            'sort_key'    => Carbon::parse($displayDate)->format('Y-m-d H:i:s') . '_0_' . $delivery->id,
                            'description' => 'Delivery - #' . $delivery->delivery_number
                                . (Carbon::parse($delivery->delivery_date)->lt($fromDate) ? ' (b/f)' : ''),
                            'invoice_no'  => $delivery->delivery_number,
                            'debit'       => $delivery->total_amount,
                            'credit'      => 0,
                        ];
                    });

                // Get payment transactions for the period
                $payments = DeliveryPayment::with('delivery')
                    ->whereHas('delivery', function ($q) use ($shop) {
                        $q->where('shop_id', $shop->id);
                    })
                    ->whereBetween('payment_date', [$fromDate->format('Y-m-d'), $toDate->format('Y-m-d')])
                    ->where('status', '!=', 'bounced')
                    ->where('method', '!=', 'credit_note')
                    ->where('amount', '>', 0)
                    ->get()
                    ->map(function($payment) {
                        $description = 'Payment';
                        if ($payment->method) {
                            $description .= ' - ' . ucfirst($payment->method);
                        }
                        if ($payment->cheque_no) {
                            $description .= ' (Cheque: ' . $payment->cheque_no . ')';
                        }

                        return [
                            'date'        => $payment->payment_date,
                            'type'        => 'payment',
                            'sort_key'    => Carbon::parse($payment->payment_date)->format('Y-m-d H:i:s') . '_2',
                            'description' => $description,
                            'invoice_no'  => $payment->delivery ? $payment->delivery->delivery_number : '-',
                            'debit'       => 0,
                            'credit'      => $payment->amount,
                        ];
                    });

                // Get shop return transactions for the period.
                // IMPORTANT: Only include CASH refund returns as direct credits in the ledger.
                // Credit_note returns do NOT move cash — they create available credit (overpayment on the
                // referenced delivery). That available credit only appears in the ledger once the user formally
                // applies it via the 'Apply Credit' payment method, which creates a DeliveryPayment record
                // already captured in the $payments query above.
                $shopReturns = $allShopReturns->filter(function ($ret) use ($fromDate, $toDate) {
                        if ($ret->status === 'cancelled') return false;
                        if (($ret->refund_method ?? '') === 'credit_note') return false; // excluded — show only after Apply Credit
                        $retDate = Carbon::parse($ret->return_date)->startOfDay();
                        return $retDate->gte($fromDate) && $retDate->lte($toDate);
                    })
                    ->map(function ($ret) {
                        $total = $ret->items->sum(function ($item) {
                            return $item->quantity * $item->unit_price;
                        });

                        return [
                            'date'        => $ret->return_date,
                            'type'        => 'return',
                            'sort_key'    => Carbon::parse($ret->return_date)->format('Y-m-d H:i:s') . '_3',
                            'description' => 'Shop Return (Cash) - #SR-' . str_pad($ret->id, 6, '0', STR_PAD_LEFT) . ($ret->notes ? ' (' . $ret->notes . ')' : ''),
                            'invoice_no'  => $ret->delivery ? $ret->delivery->delivery_number : '-',
                            'debit'       => 0,
                            'credit'      => $total,
                        ];
                    });
                
                // Merge and sort all transactions
                $allTransactions = $deliveries->concat($payments)->concat($shopReturns)->sortBy('sort_key')->values();

                $balance = $openingBalance;
                $ledgerTransactions = [];

                foreach ($allTransactions as $index => $trn) {
                    $balance += $trn['debit'] - $trn['credit'];

                    $ledgerTransactions[] = [
                        'id' => $index + 1,
                        'date' => $trn['date'],
                        'description' => $trn['description'],
                        'invoice_no' => $trn['invoice_no'],
                        'debit' => $trn['debit'],
                        'credit' => $trn['credit'],
                        'balance' => $balance,
                    ];
                }

                $data['selectedShop'] = $shop;
                $data['transactions'] = $ledgerTransactions;
                $data['fromDate'] = $fromDate->format('Y-m-d');
                $data['toDate'] = $toDate->format('Y-m-d');
                $data['openingBalance'] = $openingBalance;
                $data['closingBalance'] = $balance;
            }
        }

        return Inertia::render('Reports/ShopLedger', $data);
    }

    private function getCompany()
    {
        $company = null;
        if (auth('company')->check()) {
            $company = auth('company')->user();
        } else {
            $user = auth('web')->user();
            $company = $user ? $user->company : Company::first();
        }

        if (!$company) {
            $company = (object) [
                'company_code' => 'C01',
                'name' => 'VISION COPIER',
                'primary_color' => '#00aeef',
                'secondary_color' => '#737578'
            ];
        }

        return $company;
    }
}

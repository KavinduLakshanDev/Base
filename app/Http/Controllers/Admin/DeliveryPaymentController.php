<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\DeliveryPayment;
use App\Models\Delivery;
use App\Models\Shop;
use App\Models\BankAccount;
use App\Models\FinanceAccount;
use App\Models\FinanceAccountTransaction;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class DeliveryPaymentController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $query = DeliveryPayment::with(['delivery.shop', 'recordedBy:id,first_name,last_name']);

        if ($user && $user->role_id !== 1) { // Not superadmin
            $query->where('company_code', $user->company_code);
        } else if ($user && $user->role_id === 1) { // Superadmin
            $selectedCompany = session('selected_company');
            if ($selectedCompany) {
                $query->where('company_code', $selectedCompany);
            }
        }

        // Search functionality
        if ($request->has('search') && $request->search) {
            $query->where(function($q) use ($request) {
                $q->where('reference_no', 'like', '%' . $request->search . '%')
                  ->orWhere('cheque_no', 'like', '%' . $request->search . '%')
                  ->orWhereHas('delivery.shop', function($cq) use ($request) {
                      $cq->where('name', 'like', '%' . $request->search . '%')
                         ->orWhere('contact_phone', 'like', '%' . $request->search . '%');
                  })
                  ->orWhereHas('delivery', function($dq) use ($request) {
                      $dq->where('delivery_number', 'like', '%' . $request->search . '%');
                  });
            });
        }
        
        // Date Filtering
        if ($request->has('date_from') && $request->date_from) {
            $query->whereDate('payment_date', '>=', $request->date_from);
        }
        if ($request->has('date_to') && $request->date_to) {
            $query->whereDate('payment_date', '<=', $request->date_to);
        }

        // Cashier Filtering
        if ($request->has('cashier_id') && $request->cashier_id) {
            $query->where('recorded_by', $request->cashier_id);
        }

        $payments = $query->orderBy('created_at', 'desc')->paginate(10)->withQueryString();

        // Transform for the frontend
        $payments->getCollection()->transform(function ($payment) {
            return [
                'id' => $payment->id,
                'amount' => $payment->amount,
                'date' => $payment->payment_date,
                'method' => $payment->method,
                'reference' => $payment->reference_no,
                'cheque_no' => $payment->cheque_no,
                'status' => $payment->status,
                'shop' => $payment->delivery && $payment->delivery->shop ? [
                    'shop_name' => $payment->delivery->shop->name,
                    'shop_code' => 'SHOP-' . str_pad($payment->delivery->shop->id, 4, '0', STR_PAD_LEFT),
                ] : null,
                'sales_transaction_id' => null,
                'delivery_id' => $payment->delivery_id,
                'paid_invoices' => $payment->delivery ? [$payment->delivery->delivery_number] : [],
                'collected_by' => $payment->recordedBy ? [
                    'first_name' => $payment->recordedBy->first_name,
                    'last_name' => $payment->recordedBy->last_name,
                ] : null,
            ];
        });

        // Stats
        $stats = [
            'total_sales' => 0, // Placeholder
            'total_collected' => DeliveryPayment::sum('amount'),
            'pending_clearance' => DeliveryPayment::where('status', 'pending')->sum('amount'),
            'this_month' => DeliveryPayment::whereMonth('payment_date', date('m'))->sum('amount'),
            'cash_total' => DeliveryPayment::where('method', 'cash')->sum('amount'),
            'cheque_total' => DeliveryPayment::where('method', 'cheque')->sum('amount'),
            'bank_total' => DeliveryPayment::whereIn('method', ['transfer', 'bank_transfer', 'bank'])->sum('amount'),
            'card_total' => DeliveryPayment::where('method', 'card')->sum('amount'),
            'transaction_count' => DeliveryPayment::count(),
        ];

        $cashiers = \App\Models\User::where('company_code', $user->company_code ?? session('selected_company'))->get(['id', 'first_name', 'last_name']);

        return Inertia::render('DeliveryPayments/Index', [
            'payments' => $payments,
            'filters' => $request->only(['search', 'date_from', 'date_to', 'cashier_id']),
            'stats' => $stats,
            'cashiers' => $cashiers
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $companyCode = request()->user()->company_code ?? session('selected_company');
        
        $shops = Shop::where('company_code', $companyCode)
            ->where('is_active', true)
            ->orderBy('name')
            ->get()
            ->map(function ($shop) {
                // Map the frontend properties
                $shop->shop_name = $shop->name;
                $shop->shop_code = 'SHOP-' . str_pad($shop->id, 4, '0', STR_PAD_LEFT);
                return $shop;
            });
            
        $bankAccounts = BankAccount::where('company_code', $companyCode)
            ->where('status', 'active')
            ->get();

        return Inertia::render('DeliveryPayments/Create', [
            'shops' => $shops,
            'bankAccounts' => $bankAccounts
        ]);
    }

    /**
     * Search shops via AJAX
     */
    public function searchShops(Request $request)
    {
        $q = $request->query('q');
        $companyCode = $request->user()->company_code ?? session('selected_company');
        
        $query = Shop::where('company_code', $companyCode)->where('is_active', true);
        
        if ($q) {
            $query->where(function($sq) use ($q) {
                $sq->where('name', 'like', "%{$q}%")
                   ->orWhere('contact_phone', 'like', "%{$q}%");
            });
        }
        
        $results = $query->limit(20)->get()->map(function ($shop) {
            $shop->shop_name = $shop->name;
            $shop->shop_code = 'SHOP-' . str_pad($shop->id, 4, '0', STR_PAD_LEFT);
            return $shop;
        });

        return response()->json($results);
    }

    /**
     * Get pending invoices for a specific shop
     */
    public function pendingInvoices(Request $request)
    {
        $request->validate([
            'shop_id' => 'required|exists:shops,id'
        ]);

        $companyCode = $request->user()->company_code ?? session('selected_company');
        
        $deliveries = Delivery::where('company_code', $companyCode)
            ->where('shop_id', $request->shop_id)
            ->where('status', '!=', 'cancelled')
            ->get()
            ->filter(function($d) {
                return abs($d->outstanding_balance) > 0.005;
            })
            ->values()
            ->map(function($d) {
                return [
                    'id' => $d->id,
                    'invoice_no' => $d->delivery_number,
                    'date' => $d->delivery_date,
                    'total_amount' => collect($d->items)->sum('total_price'), // approximate total
                    'paid_amount' => $d->payments->sum('amount'),
                    'balance_amount' => $d->outstanding_balance,
                ];
            });

        return response()->json($deliveries);
    }

    /**
     * Get payment history for a specific shop
     */
    public function history(Request $request)
    {
        $request->validate([
            'shop_id' => 'required|exists:shops,id'
        ]);

        $companyCode = $request->user()->company_code ?? session('selected_company');
        
        $history = DeliveryPayment::where('company_code', $companyCode)
            ->whereHas('delivery', function($q) use ($request) {
                $q->where('shop_id', $request->shop_id);
            })
            ->where('method', '!=', 'credit_note')
            ->with(['delivery:id,delivery_number'])
            ->orderBy('payment_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get()
            ->map(function($p) {
                return [
                    'id' => $p->id,
                    'amount' => $p->amount,
                    'date' => $p->payment_date,
                    'method' => $p->method,
                    'reference' => $p->reference_no ?? $p->cheque_no,
                    'cheque_no' => $p->cheque_no,
                    'bank_name' => $p->bank_name,
                    'branch' => $p->branch,
                    'created_at' => $p->created_at,
                    'delivery_number' => $p->delivery ? $p->delivery->delivery_number : null,
                ];
            });

        return response()->json($history);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        if (!request()->user()->hasPermission('deliveries.payments.create') &&
            !request()->user()->hasPermission('deliveries.edit')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to record payments.');
        }

        $companyCode = request()->user()->company_code ?? session('selected_company');

        $request->validate([
            'shop_id'      => 'required|exists:shops,id',
            'amount'       => 'required|numeric|min:0.01',
            'method'       => 'required|in:cash,cheque,transfer,card,applied_credit',
            'bank_account_id' => 'required_if:method,transfer|required_if:method,card|nullable|exists:bank_accounts,id',
            'reference_no' => 'required_if:method,cheque|nullable|string|max:100',
            'bank_name'    => 'required_if:method,cheque|nullable|string|max:100',
            'branch'       => 'required_if:method,cheque|nullable|string|max:100',
            'payment_date' => 'required|date',
            'notes'        => 'nullable|string|max:500',
            'allocations'  => 'required|array|min:1',
            'allocations.*.invoice_id' => 'required|exists:deliveries,id',
            'allocations.*.amount'     => 'required|numeric',
        ]);

        $totalAllocated = collect($request->allocations)->sum('amount');
        if ($request->method !== 'cheque' && abs($totalAllocated - (float)$request->amount) > 0.01) {
            return redirect()->back()->withErrors(['amount' => 'Total allocated amount must match the payment amount for ' . $request->method . ' payments.']);
        }

        DB::transaction(function () use ($request, $companyCode) {
            // 1. Update bank account balance if transfer or card
            if (in_array($request->method, ['transfer', 'card']) && $request->bank_account_id) {
                $bankAccount = BankAccount::lockForUpdate()->find($request->bank_account_id);
                if ($bankAccount) {
                    $bankAccount->increment('current_balance', (float) $request->amount);
                }
            }

            $mainPayment = null;

            foreach ($request->allocations as $alloc) {
                $targetDelivery = Delivery::lockForUpdate()->findOrFail($alloc['invoice_id']);
                
                $payment = DeliveryPayment::create([
                    'delivery_id'        => $targetDelivery->id,
                    'amount'             => $alloc['amount'],
                    'method'             => $request->method,
                    'cheque_no'          => $request->method === 'cheque' ? $request->reference_no : null,
                    'status'             => 'cleared',
                    'reference_no'       => $request->method !== 'cheque' && $request->method !== 'applied_credit' ? $request->reference_no : null,
                    'bank_account_id'    => $request->bank_account_id,
                    'bank_name'          => $request->bank_name,
                    'branch'             => $request->branch,
                    'payment_date'       => $request->payment_date,
                    'notes'              => $request->notes,
                    'recorded_by'        => request()->user()->id,
                    'company_code'       => $companyCode,
                ]);

                if (!$mainPayment) $mainPayment = $payment;
            }

            // Auto-consume overpaid deliveries if method is applied_credit
            if ($request->method === 'applied_credit') {
                $creditToConsume = (float) $request->amount;
                $explicitAllocations = collect($request->allocations)->pluck('invoice_id')->toArray();
                
                $overpaidDeliveries = Delivery::where('shop_id', $request->shop_id)
                    ->where('company_code', $companyCode)
                    ->whereNotIn('id', $explicitAllocations) // avoid double consuming if user explicitly added it
                    ->get()
                    ->filter(fn($d) => $d->outstanding_balance < -0.005)
                    ->sortBy('id'); // consume oldest first

                foreach ($overpaidDeliveries as $od) {
                    if ($creditToConsume <= 0.005) break;
                    
                    $availableCredit = abs($od->outstanding_balance);
                    $consumeAmount = min($creditToConsume, $availableCredit);
                    
                    DeliveryPayment::create([
                        'delivery_id'        => $od->id,
                        'amount'             => -$consumeAmount, // negative payment to bring balance closer to 0
                        'method'             => 'applied_credit',
                        'status'             => 'cleared',
                        'payment_date'       => $request->payment_date,
                        'notes'              => 'Auto-applied credit to another invoice',
                        'recorded_by'        => request()->user()->id,
                        'company_code'       => $companyCode,
                    ]);
                    
                    $creditToConsume -= $consumeAmount;
                }
            }

            if ($mainPayment) {
                // 3. Update FinanceAccount if any cash payment was made
                $totalCashAmount = collect($request->allocations)->sum(function($alloc) use ($request) {
                    return $request->method === 'cash' ? (float)$alloc['amount'] : 0;
                });
                
                if ($totalCashAmount > 0) {
                    $sectionCode = request()->user()->section_code ?? 'VIS-SEC-001';
                    $deliverySalesAccount = FinanceAccount::where('account_name', 'like', '%Delivery Sales%')
                        ->where('section_code', $sectionCode)
                        ->lockForUpdate()
                        ->first() ?? FinanceAccount::find(41); // Fallback to Delivery Sales ID 41

                    if ($deliverySalesAccount) {
                        if (in_array($deliverySalesAccount->main_category->value ?? 'assets', ['liabilities', 'revenue', 'equity'])) {
                            $deliverySalesAccount->current_balance -= $totalCashAmount;
                        } else {
                            $deliverySalesAccount->current_balance += $totalCashAmount;
                        }
                        $deliverySalesAccount->save();
                        
                        $deliveryNos = Delivery::whereIn('id', collect($request->allocations)->pluck('invoice_id'))->pluck('delivery_number')->toArray();
                        
                        FinanceAccountTransaction::create([
                            'finance_account_id' => $deliverySalesAccount->id,
                            'date' => now(),
                            'source_type' => 'Delivery Cash Payment',
                            'source_id' => $mainPayment->id,
                            'description' => 'Delivery payment (Deliveries: ' . implode(', ', array_unique($deliveryNos)) . ')',
                            'method' => 'cash',
                            'type' => 'debit',
                            'amount' => $totalCashAmount,
                            'reference' => implode(', ', array_unique($deliveryNos)),
                        ]);
                    }
                }
                
                session()->flash('payment_id', $mainPayment->id);
            }
        });

        if ($request->wantsJson() || $request->isXmlHttpRequest()) {
            // Need to retrieve payment_id flashed into the session by the transaction closure
            return response()->json([
                'success' => true,
                'message' => 'Delivery payment recorded successfully.',
                'payment_id' => session('payment_id'),
            ]);
        }

        return redirect()->route('delivery-payments.index')->with('success', 'Delivery payment recorded successfully.');
    }
    
    /**
     * Generate Receipt
     */
    public function generateReceipt(DeliveryPayment $payment)
    {
        return redirect()->to("/deliveries/{$payment->delivery_id}/payments/{$payment->id}/receipt");
    }

    /**
     * Export
     */
    public function export(Request $request)
    {
        // Simple export stub
        return redirect()->back()->with('error', 'Export functionality is coming soon.');
    }
}

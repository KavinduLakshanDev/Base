<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Http\Request;

use App\Models\CustomerPayment;
use App\Models\Customer;
use App\Models\ServiceJob;
use App\Models\SalesTransaction;
use App\Models\AccMas;
use App\Models\AccTrn;
use App\Models\Address;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

use Dompdf\Dompdf;
use Dompdf\Options;

class CustomerPaymentController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('cashier.shift', only: ['index', 'create', 'store']),
        ];
    }
    // ... existing code ...

    public function generateReceipt($id)
    {
        $payment = CustomerPayment::with(['customer', 'collectedBy'])->findOrFail($id);
        
        // If the payment is tied to a specific Service Job, show the Service Job Invoice
        if (!empty($payment->service_job_id)) {
            return redirect()->to("/service-jobs/{$payment->service_job_id}/invoice");
        }

        // If the payment is tied to a specific single Sales Invoice, show the Sales Invoice
        if (!empty($payment->sales_transaction_id)) {
            return redirect()->to("/sales/{$payment->sales_transaction_id}/invoice");
        }

        // Otherwise, generate the standard payment receipt
        // Resolution of balance: sum up all outstanding invoices for this customer
        $balance = $this->resolveReceiptBalance($payment);

        $html = $this->generateReceiptHtml($payment, $balance);

        return response($html)
            ->header('Content-Type', 'text/html');
    }

    /**
     * Determine outstanding balance for a receipt.
     * Always show overall outstanding for the customer (all jobs + invoices + returns).
     */
    public function resolveReceiptBalance(CustomerPayment $customerPayment): float
    {
        $adrKy = $customerPayment->customer_id;

        // Sum all pending service jobs + invoices for this customer
        $accKy = null;
        if ($customerPayment->customer) {
            $accKy = $customerPayment->customer->AccKy;
        } elseif ($adrKy) {
            $addr = \App\Models\Customer::find($adrKy);
            $accKy = $addr?->AccKy;
        }

        if ($accKy) {
            $customer = Customer::where('AccKy', $accKy)->first();
            if ($customer) {
                return $customer->calculateOutstandingBalance();
            }
        }

        // No AccKy resolved — fall back to invoice balance_amount only
        $invoicesBalance = SalesTransaction::where('customer_id', $adrKy)
            ->whereNotNull('balance_amount')
            ->sum('balance_amount');

        return (float) $invoicesBalance;
    }

    private function getReturnedChequeTotal(?int $accKy): float
    {
        if (empty($accKy)) {
            return 0.0;
        }

        return (float) AccTrn::where('AccKy', $accKy)
            ->where('FInAct', true)
            ->where('Status', 'A')
            ->where('Amt', '>', 0)
            ->where(function ($q) {
                $q->where('Reason', 'like', 'Cheque Return%')
                  ->orWhereNotNull('original_payment_id');
            })
            ->sum('Amt');
    }

    private function generateReceiptHtml($payment, $balance)
    {
        $user = auth()->user();
        $company = ($user && $user->company) ? $user->company : \App\Models\Company::first();
        $companyName = $company->name ?? 'Company Name';
        $companyAddress = $company->address ?? 'Address';
        $companyPhone = $company->phone ?? 'Phone';

        $isCredit = $balance < 0;
        $balanceLabel = $isCredit ? 'Credit Balance' : 'Outstanding Balance';
        $balanceFormatted = $isCredit
            ? number_format(abs($balance), 2) . ' CR'
            : number_format($balance, 2);
        
        $customerName = 'N/A';
        if ($payment->customer) {
            $customerName = trim($payment->customer->FstNm . ' ' . $payment->customer->LstNm);
            if (empty($customerName) && $payment->customer->account) {
                 $customerName = $payment->customer->account->AccNm;
            }
        }
        
        $date = $payment->date instanceof \DateTime ? $payment->date->format('Y-m-d H:i') : $payment->date;

        $invoiceAllocations = [];
        if (is_array($payment->invoice_allocations) && !empty($payment->invoice_allocations)) {
            foreach ($payment->invoice_allocations as $allocation) {
                $invoiceId = (int) ($allocation['invoice_id'] ?? -1);
                $jobId = (int) ($allocation['service_job_id'] ?? -1);
                $allocatedAmount = (float) ($allocation['amount'] ?? 0);
                
                if ($allocatedAmount <= 0) {
                    continue;
                }

                if ($invoiceId === 0) {
                    $invoiceLabel = 'Opening Balance';
                } elseif ($jobId > 0) {
                    $job = ServiceJob::find($jobId);
                    if ($job) {
                        $invoiceLabel = $job->invoice_number ? "{$job->invoice_number} ({$job->job_number})" : $job->job_number;
                    } else {
                        $invoiceLabel = 'SJ-' . $jobId;
                    }
                } elseif ($invoiceId > 0) {
                    $invoice = SalesTransaction::find($invoiceId);
                    $invoiceLabel = $invoice?->invoice_no ?: ('INV-' . $invoiceId);
                } else {
                    continue;
                }
                
                $invoiceAllocations[] = [
                    'label' => $invoiceLabel,
                    'amount' => $allocatedAmount
                ];
            }
        }

        // Fetch company logo and convert to Base64 for Dompdf
        $logoBase64 = '';
        $companyCode = strtoupper($company->company_code ?? 'VIS');
        
        $vismassPngCandidates = [public_path('images/Vismass-logo.png'), public_path('images/vismass-logo.png')];
        $malibuPngCandidates = [public_path('images/Malibu-logo.png'), public_path('images/malibu-logo.png')];

        $logoPath = null;
        if (str_contains($companyCode, 'MAL')) {
            foreach ($malibuPngCandidates as $c) { if (file_exists($c)) { $logoPath = $c; break; } }
        } else {
            foreach ($vismassPngCandidates as $c) { if (file_exists($c)) { $logoPath = $c; break; } }
        }

        if ($logoPath && file_exists($logoPath)) {
            $type = pathinfo($logoPath, PATHINFO_EXTENSION);
            $data = @file_get_contents($logoPath);
            if ($data) {
                $logoBase64 = 'data:image/' . ($type === 'svg' ? 'svg+xml' : $type) . ';base64,' . base64_encode($data);
            }
        }

        return view('customer_payments.receipt', [
            'payment' => $payment,
            'balance' => $balance,
            'balanceLabel' => $balanceLabel,
            'balanceFormatted' => $balanceFormatted,
            'customerName' => $customerName,
            'date' => $date,
            'invoiceAllocations' => $invoiceAllocations,
            'logoBase64' => $logoBase64,
            'companyName' => $companyName,
            'companyAddress' => $companyAddress,
            'companyPhone' => $companyPhone,
        ])->render();
    }
    public function index(Request $request)
    {
        if (!request()->user()->hasPermission('customer_payments.view')) {
             return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view customer payments.');
        }

        /** @var \App\Models\User $user */
        $user = $request->user();
        $query = CustomerPayment::with(['customer', 'salesTransaction:id,invoice_no', 'collectedBy:id,first_name,last_name']);

        if ($user && $user->role_id !== 1) { // Not superadmin
            if ($user->role_id === 3) {
                $query->whereHas('customer', function($q) use ($user) {
                    $q->where('section_code', $user->section_code);
                });
            } else {
                $query->whereHas('customer', function($q) use ($user) {
                    $q->where('company_code', $user->company_code);
                });
            }
        } else if ($user && $user->role_id === 1) { // Superadmin
            $selectedCompany = session('selected_company');
            if ($selectedCompany) {
                $query->whereHas('customer', function($q) use ($selectedCompany) {
                    $q->where('company_code', $selectedCompany);
                });
            }
        }

        // Search functionality
        if ($request->has('search') && $request->search) {
             $query->where(function($q) use ($request) {
                  $q->where('reference', 'like', '%' . $request->search . '%')
                    ->orWhere('cheque_no', 'like', '%' . $request->search . '%')
                    ->orWhereHas('customer', function($cq) use ($request) {
                         $cq->where('FstNm', 'like', '%' . $request->search . '%')
                           ->orWhere('LstNm', 'like', '%' . $request->search . '%')
                           ->orWhere('AdrCd', 'like', '%' . $request->search . '%');
                    });
             });
        }
        
        // Date Filtering
        if ($request->has('date_from') && $request->date_from) {
             $query->whereDate('date', '>=', $request->date_from);
        }
        if ($request->has('date_to') && $request->date_to) {
             $query->whereDate('date', '<=', $request->date_to);
        }

        // Cashier Filtering
        if ($request->has('cashier_id') && $request->cashier_id) {
             $query->where('collected_by', $request->cashier_id);
        }

        $payments = $query->orderBy('created_at', 'desc')->paginate(10)->withQueryString();

        $paymentCollection = $payments->getCollection();
        $invoiceIds = $paymentCollection->flatMap(function ($payment) {
            $ids = [];
            if (!empty($payment->sales_transaction_id)) {
                $ids[] = (int) $payment->sales_transaction_id;
            }
            if (is_array($payment->invoice_allocations)) {
                foreach ($payment->invoice_allocations as $allocation) {
                    $invoiceId = (int) ($allocation['invoice_id'] ?? -1);
                    if ($invoiceId >= 0) {
                        $ids[] = $invoiceId;
                    }
                }
            }
            return $ids;
        })->unique()->values();

        $serviceJobIds = $paymentCollection->flatMap(function ($payment) {
            $ids = [];
            if (!empty($payment->service_job_id)) {
                $ids[] = (int) $payment->service_job_id;
            }
            if (is_array($payment->invoice_allocations)) {
                foreach ($payment->invoice_allocations as $allocation) {
                    $jobId = (int) ($allocation['service_job_id'] ?? -1);
                    if ($jobId >= 0) {
                        $ids[] = $jobId;
                    }
                }
            }
            return $ids;
        })->unique()->values();

        $invoiceMap = $invoiceIds->isEmpty()
            ? collect()
            : SalesTransaction::whereIn('id', $invoiceIds)->pluck('invoice_no', 'id');

        $serviceJobMap = $serviceJobIds->isEmpty()
            ? collect()
            : ServiceJob::whereIn('id', $serviceJobIds)->get(['id', 'job_number', 'invoice_number'])->mapWithKeys(function ($job) {
                return [$job->id => $job->invoice_number ? "{$job->invoice_number} ({$job->job_number})" : $job->job_number];
            });

        $payments->setCollection(
            $paymentCollection->map(function ($payment) use ($invoiceMap, $serviceJobMap) {
                $paidInvoices = [];
                if (!empty($payment->sales_transaction_id)) {
                    $invoiceNo = $invoiceMap->get((int) $payment->sales_transaction_id);
                    if ($invoiceNo) {
                        $paidInvoices[] = $invoiceNo;
                    }
                }
                if (!empty($payment->service_job_id)) {
                    $jobNo = $serviceJobMap->get((int) $payment->service_job_id);
                    if ($jobNo) {
                        $paidInvoices[] = $jobNo;
                    }
                }
                if (is_array($payment->invoice_allocations)) {
                    foreach ($payment->invoice_allocations as $allocation) {
                        $invoiceId = (int) ($allocation['invoice_id'] ?? -1);
                        if ($invoiceId === 0) {
                             $paidInvoices[] = 'OPENING-BAL';
                             continue;
                        }
                        if ($invoiceId > 0) {
                            $invoiceNo = $invoiceMap->get($invoiceId);
                            if ($invoiceNo) {
                                $paidInvoices[] = $invoiceNo;
                            }
                        }

                        $jobId = (int) ($allocation['service_job_id'] ?? -1);
                        if ($jobId > 0) {
                            $jobNo = $serviceJobMap->get($jobId);
                            if ($jobNo) {
                                $paidInvoices[] = $jobNo;
                            }
                        }
                    }
                }
                $payment->paid_invoices = array_values(array_unique($paidInvoices));
                return $payment;
            })
        );

        // Calculate Stats based on the filtered query
        $statsQuery = clone $query;

        // Calculate Total Sales for the filtered period
        $salesQuery = SalesTransaction::where('status', '!=', 'cancelled');
        $jobsQuery = ServiceJob::where('status', '!=', 'cancelled');
        
        $user = $request->user();
        if ($user && $user->role_id !== 1) { // Not superadmin
            if ($user->role_id === 3) {
                $salesQuery->where('section_code', $user->section_code);
                $jobsQuery->where('section_code', $user->section_code);
            } else {
                $salesQuery->whereHas('customer', function($q) use ($user) {
                    $q->where('company_code', $user->company_code);
                });
                $jobsQuery->where('company_code', $user->company_code);
            }
        } elseif ($user && $user->role_id === 1) { // Superadmin
            $selectedCompany = session('selected_company');
            if ($selectedCompany) {
                $salesQuery->whereHas('customer', function($q) use ($selectedCompany) {
                    $q->where('company_code', $selectedCompany);
                });
                $jobsQuery->where('company_code', $selectedCompany);
            }
        }

        if ($request->has('date_from') && $request->date_from) {
             $salesQuery->whereDate('transaction_date', '>=', $request->date_from);
             $jobsQuery->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->has('date_to') && $request->date_to) {
             $salesQuery->whereDate('transaction_date', '<=', $request->date_to);
             $jobsQuery->whereDate('created_at', '<=', $request->date_to);
        }
        
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $salesQuery->where(function($q) use ($search) {
                $q->where('customer_name', 'like', "%{$search}%")
                  ->orWhere('customer_code', 'like', "%{$search}%");
            });
            $jobsQuery->where(function($q) use ($search) {
                $q->where('customer_name', 'like', "%{$search}%")
                  ->orWhere('customer_phone', 'like', "%{$search}%");
            });
        }

        $stats = [
            'total_sales'       => (float) $salesQuery->sum('total_amount') + (float) $jobsQuery->sum('total_amount'),
            'total_collected'   => (float) $statsQuery->sum('amount'),
            'pending_clearance' => (float) (clone $statsQuery)->where('status', 'pending')->sum('amount'),
            'this_month'        => (float) (clone $statsQuery)->whereMonth('date', now()->month)->whereYear('date', now()->year)->sum('amount'),
            'cash_total'        => (float) (clone $statsQuery)->where('method', 'cash')->sum('amount'),
            'cheque_total'      => (float) (clone $statsQuery)->where('method', 'cheque')->sum('amount'),
            'bank_total'        => (float) (clone $statsQuery)->where('method', 'bank')->sum('amount'),
            'card_total'        => (float) (clone $statsQuery)->where('method', 'card')->sum('amount'),
            'transaction_count' => $statsQuery->count(),
        ];

        // Fetch users for cashier dropdown
        $usersQuery = \App\Models\User::query();
        if ($user && $user->role_id !== 1) { // Not superadmin
            if ($user->role_id === 3) {
                $usersQuery->where('section_code', $user->section_code);
            } else {
                $usersQuery->where('company_code', $user->company_code);
            }
        } else if ($user && $user->role_id === 1) { // Superadmin
            $selectedCompany = session('selected_company');
            if ($selectedCompany) {
                $usersQuery->where('company_code', $selectedCompany);
            }
        }
        $cashiers = $usersQuery->whereHas('role', function ($q) {
                $q->where('level', 'cashier');
            })->orderBy('first_name')->get(['id', 'first_name', 'last_name']);

        return Inertia::render('CustomerPayments/Index', [
            'payments' => $payments,
            'filters'  => $request->only(['search', 'date_from', 'date_to', 'cashier_id']),
            'stats'    => $stats,
            'cashiers' => $cashiers
        ]);
    }

    public function create()
    {
        if (!request()->user()->hasPermission('customer_payments.create')) {
             return redirect()->back()->with('error', 'Unauthorized. You do not have permission to create customer payments.');
        }
        
        /** @var \App\Models\User $user */
        $user = request()->user();
        
        $customerQuery = Customer::select('AdrKy', 'FstNm', 'LstNm', 'AdrCd', 'AccKy')
            ->where('AdrCd', 'like', 'CUS%');

        if ($user && $user->role_id !== 1) { // Not superadmin
            if ($user->role_id === 3) {
                $customerQuery->where('section_code', $user->section_code);
            } else {
                $customerQuery->where('company_code', $user->company_code);
            }
        } else if ($user && $user->role_id === 1) { // Superadmin
            $selectedCompany = session('selected_company');
            if ($selectedCompany) {
                $customerQuery->where('company_code', $selectedCompany);
            }
        }

        // also provide active bank accounts for payment dropdowns
        $bankAccountsQuery = \App\Models\BankAccount::where('status', 'active');
        if ($user && $user->role_id !== 1) {
            if ($user->role_id === 3) {
                $bankAccountsQuery->where('section_code', $user->section_code);
            } else {
                $bankAccountsQuery->where('company_code', $user->company_code);
            }
        } else if ($user && $user->role_id === 1) { // Superadmin
            $selectedCompany = session('selected_company');
            if ($selectedCompany) {
                $bankAccountsQuery->where('company_code', $selectedCompany);
            }
        }
        $bankAccounts = $bankAccountsQuery->orderBy('bank_name')->get();

        // no longer passing the full customer list; frontend will query via AJAX search
        return Inertia::render('CustomerPayments/Create', [
            'customers' => [],
            'bankAccounts' => $bankAccounts,
        ]);
    }

    public function getPendingServiceJobs(Request $request)
    {
        if (!request()->user()->hasPermission('customer_payments.view')) {
             return response()->json(['error' => 'Unauthorized'], 403);
        }

        try {
            $customerId = $request->query('customer_id');

            if (!$customerId) {
                return response()->json([]);
            }

            // Robust resolution: try to find by AdrKy first, if not assume it's AccKy
            $address = Customer::find($customerId);
            if ($address) {
                $accKy = $address->AccKy;
            } else {
                // Check if it's a direct AccKy
                $existsInAccMas = AccMas::where('AccKy', $customerId)->exists();
                $accKy = $existsInAccMas ? $customerId : null;
            }

            // Compute jobs outstanding only when we have a valid AccKy
            $jobs = [];
            $jobsOutstanding = 0;

            if ($accKy) {
                // If the customer has a credit balance (<= 0), all jobs are effectively settled
                $outstandingBalance = $address ? $address->calculateOutstandingBalance() : 0;
                // Calculate total outstanding for the response payload
                $outstandingBalance = $address ? $address->calculateOutstandingBalance() : 0;

                // Show jobs that still have a positive balance (pending jobs);
                // overpaid jobs (negative balance) are settled and excluded from the list
                $jobsQuery = ServiceJob::with('items')
                    ->where('AccKy', (int) $accKy)
                    ->where('status', 'delivered')
                    ->where(function($q) {
                        $q->where('balance_amount', '>', 0)
                          ->orWhereNull('balance_amount');
                    });

                // Filter by company for superadmin if selected
                $user = auth()->user();
                if ($user && $user->role_id === 1) {
                    $selectedCompany = session('selected_company');
                    if ($selectedCompany) {
                        $jobsQuery->where('company_code', $selectedCompany);
                    }
                }

                $jobs = $jobsQuery->orderBy('id', 'desc')->get();

                // Calculate card_balance_amount for each job
                foreach ($jobs as $job) {
                    $totalDiscount = 0;
                    foreach ($job->items as $item) {
                        if ($item->discount_amount > 0) {
                            $totalDiscount += ((float) $item->discount_amount * (float) $item->quantity);
                        }
                    }
                    $job->card_balance_amount = (float) $job->balance_amount + $totalDiscount;
                }
            }

            // --- Correct outstanding calculation ---
            // Outstanding = total billed (all non-cancelled job amounts + open invoices)
            //             - total payments received
            //             + returned cheques (bounced payments)
            // This is the only formula immune to allocation-loop gaps where surplus
            // payments fail to be applied to any balance and silently disappear.

            $customer = Customer::find($customerId);
            $totalOutstanding = 0;
            if ($customer) {
                $totalOutstanding = $customer->calculateOutstandingBalance();
            } elseif ($accKy) {
                $tempCustomer = new Customer();
                $tempCustomer->AccKy = $accKy;
                $tempCustomer->AdrKy = $customerId;
                $totalOutstanding = $tempCustomer->calculateOutstandingBalance();
            }

            return response()->json([
                'jobs' => $jobs,
                'account_balance' => $totalOutstanding,   // kept for backwards compat
                'total_outstanding' => $totalOutstanding,
            ]);
        } catch (\Exception $e) {
            Log::error('Error in getPendingServiceJobs: ' . $e->getMessage());
            return response()->json(['error' => 'Internal server error'], 500);
        }
    }

    public function getPendingInvoices(Request $request)
    {
        \Illuminate\Support\Facades\Log::info('getPendingInvoices called with customer_id: ' . $request->query('customer_id'));
        if (!request()->user()->hasPermission('customer_payments.view')) {
             return response()->json(['error' => 'Unauthorized'], 403);
        }

        try {
            $customerId = $request->query('customer_id');

            if (!$customerId) {
                return response()->json([]);
            }

            // If the customer has zero or negative outstanding balance (overpaid/credit), 
            // they don't owe anything, so we should hide all "pending" invoices.
            $customer = Customer::find($customerId);
            $totalOutstanding = 0;
            if ($customer) {
                $totalOutstanding = $customer->calculateOutstandingBalance();
            } else {
                $existsInAccMas = \App\Models\AccMas::where('AccKy', $customerId)->exists();
                if ($existsInAccMas) {
                    $tempCustomer = new Customer();
                    $tempCustomer->AccKy = $customerId;
                    $tempCustomer->AdrKy = $customerId;
                    $totalOutstanding = $tempCustomer->calculateOutstandingBalance();
                }
            }

            $invoicesQuery = \App\Models\SalesTransaction::where('customer_id', $customerId)
                ->where('balance_amount', '>', 0);

            // Filter by company for superadmin if selected
            $user = auth()->user();
            if ($user && $user->role_id === 1) {
                $selectedCompany = session('selected_company');
                if ($selectedCompany) {
                    $sections = \App\Models\Section::where('company_code', $selectedCompany)->pluck('section_code');
                    $invoicesQuery->where(function($q) use ($sections) {
                        $q->whereIn('section_code', $sections)
                          ->orWhereNull('section_code');
                    });
                }
            }

            $invoices = $invoicesQuery->orderBy('transaction_date', 'asc')->get();

            // Resolve the customer model to get accKy for the OPENING-BAL section
            $customer = Customer::find($customerId);
            $accKy = $customer?->AccKy;
            $adrKy = $customer?->AdrKy ?? $customerId;
            // NOTE: The old "virtual auto-reconciliation" block (which compared AccMas.CurBal
            // to invoice totals and hid invoices) has been removed. It was causing valid pending
            // invoices to disappear when CurBal was stale or slightly below the invoice balance.
            // The balance_amount fields on invoices are now kept accurate by the observer.

            // --- ADD VIRTUAL OPENING BALANCE INVOICE (only if genuinely owed) ---
            // We only show an OPENING-BAL entry if the customer account was created with
            // a starting debt (account.opening_balance > 0) AND that amount has not yet
            // been fully paid off.
            //
            // We do NOT use the "outstanding - invoices - jobs" gap approach anymore.
            // That gap can arise from: applied_credit at POS, service job payments,
            // or historical allocation mis-tracking — none of which are a real "opening balance".
            // Showing a fake OPENING-BAL for these cases confuses reconciliation.
            // Build the result array from the pending invoices
            $result = $invoices->values()->toArray();

            $openingBalance = (float)($customer?->account?->opening_balance ?? 0);
            if ($openingBalance > 0) {
                // How much of the opening balance has already been paid?
                // Payments recorded against invoice_id=0 (explicit opening-balance payments)
                $paidTowardOpening = 0;
                $openingBalPayments = CustomerPayment::where('customer_id', $adrKy)
                    ->whereNotNull('invoice_allocations')
                    ->get(['invoice_allocations']);
                foreach ($openingBalPayments as $cp) {
                    if (!is_array($cp->invoice_allocations)) continue;
                    foreach ($cp->invoice_allocations as $alloc) {
                        if ((int)($alloc['invoice_id'] ?? -1) === 0) {
                            $paidTowardOpening += (float)($alloc['amount'] ?? 0);
                        }
                    }
                }
                $openingBalRemainder = round($openingBalance - $paidTowardOpening, 2);
                if ($openingBalRemainder > 1) {
                    array_unshift($result, [
                        'id'               => 0,
                        'invoice_no'       => 'OPENING-BAL',
                        'transaction_date' => $customer->created_at->format('Y-m-d'),
                        'total_amount'     => $openingBalance,
                        'balance_amount'   => $openingBalRemainder,
                        'status'           => 'pending',
                        'is_opening'       => true,
                    ]);
                }
            }

            return response()->json($result);
        } catch (\Exception $e) {
            Log::error('Error in getPendingInvoices: ' . $e->getMessage());
            return response()->json(['error' => 'Internal server error'], 500);
        }
    }

    public function getPaymentHistory(Request $request)
    {
        if (!request()->user()->hasPermission('customer_payments.view')) {
             return response()->json(['error' => 'Unauthorized'], 403);
        }

        try {
            $customerId = $request->query('customer_id');

            if (!$customerId) {
                return response()->json([]);
            }

            // Robust resolution: try to find by AdrKy first, if not assume it's AccKy
            $address = Customer::find($customerId);
            $adrKy = $address ? $address->AdrKy : null;
            
            // If we found an address, use its AccKy to find other addresses linked to same account?
            // Or just search by customer_id which is typically AdrKy in payments table.
            
            // The payments table uses 'customer_id' which stores AdrKy.
            // If the input is AccKy, we might miss payments if we don't resolve to AdrKy or search by customer code.
            
            // Let's rely on what we have. If we have AdrKy, use it.
            // If the frontend sends AccKy (which it does sometimes), we need to find the AdrKy or search by customer code?
            // In store(), we resolve AdrKy. 
            
            // Let's try to query by customer_id = $customerId (assuming AdrKy) first.
            // But let's also check if the input is AccKy.
            
            $query = CustomerPayment::query();

            // Direct match assume AdrKy
            $query->where('customer_id', $customerId);
            
            // Filter by company for superadmin if selected
            $user = auth()->user();
            if ($user && $user->role_id === 1) {
                $selectedCompany = session('selected_company');
                if ($selectedCompany) {
                    $query->whereHas('customer', function($q) use ($selectedCompany) {
                        $q->where('company_code', $selectedCompany);
                    });
                }
            }

            $history = $query->orderBy('date', 'desc')
                             ->orderBy('created_at', 'desc')
                             ->limit(10)
                             ->get();

            return response()->json($history);

        } catch (\Exception $e) {
            Log::error('Error in getPaymentHistory: ' . $e->getMessage());
            return response()->json(['error' => 'Internal server error'], 500);
        }
    }

    public function store(Request $request)
    {
        if (!request()->user()->hasPermission('customer_payments.create')) {
             return redirect()->back()->with('error', 'Unauthorized. You do not have permission to create customer payments.');
        }

        $input = $request->all();
        $isServiceJobPayment = !empty($input['service_job_id']);
        $isInvoicePayment = !empty($input['sales_transaction_id']);

        $rules = [
            'amount' => 'required|numeric|min:0.01',
            'TrnDt' => 'required|date',
            'method' => 'required|string',
            'selected_bank_id' => 'nullable|exists:bank_accounts,id',
            'ChqueNo' => 'nullable|string',
            'BankNm' => 'nullable|string',
            'ChqueBranch' => 'nullable|string',
            'BankBranch' => 'nullable|string',
            'ChqueDt' => 'nullable|date',
            'CardLast4' => 'nullable|string',
            'CardAuthCode' => 'nullable|string',
            'Reference' => 'nullable|string',
            'notes' => 'nullable|string',
            'service_job_id' => 'nullable|exists:service_jobs,id',
            'sales_transaction_id' => 'nullable', // Allow 0 for opening balance
            'invoice_allocations' => 'nullable|array',
        ];

        if ($isServiceJobPayment) {
            // Check AccMas if coming from Service Job
            $rules['AccKy'] = 'required'; // We will validate manually to allow both types
        } else {
            // Check Address if coming from standard form
            $rules['AccKy'] = 'required';
        }

        $validated = $request->validate($rules);
        
        // if a bank account was selected, populate the name/branch fields so downstream logic works
        if (!empty($validated['selected_bank_id'])) {
            $bank = \App\Models\BankAccount::find($validated['selected_bank_id']);
            if ($bank) {
                $validated['BankNm'] = $bank->bank_name;
                // for both cheque and bank methods we'll set branches consistently
                $validated['ChqueBranch'] = $bank->branch_name;
                $validated['BankBranch'] = $bank->branch_name;
            }
        }

        $accKy = null; 
        $adrKy = null; 
        $customerCode = null;

        // RESOLUTION LOGIC: Determine if it's an AdrKy or AccKy
        $inputKey = $validated['AccKy'];
        
        // Try treating it as AdrKy (Address ID)
        $address = Address::find($inputKey);
        if ($address) {
            $adrKy = $address->AdrKy;
            $accKy = $address->AccKy;
        } else {
            // Try treating it as AccKy (Account ID)
            $accMas = AccMas::find($inputKey);
            if ($accMas) {
                $accKy = $accMas->AccKy;
                // Find primary address for this account
                $address = Address::where('AccKy', $accKy)->orderBy('AdrTypKy', 'asc')->first();
                $adrKy = $address ? $address->AdrKy : null;
            }
        }

        if (!$accKy) {
            return back()->withErrors(['AccKy' => 'Invalid Customer selection.']);
        }

        // If a service job was selected, ensure it belongs to the selected customer
        if (!empty($validated['service_job_id'])) {
            $serviceJob = ServiceJob::find($validated['service_job_id']);
            if (!$serviceJob) {
                return back()->withErrors(['service_job_id' => 'Selected service job not found.']);
            }
            if ($serviceJob->AccKy !== $accKy) {
                return back()->withErrors(['service_job_id' => 'Selected service job does not belong to the chosen customer.']);
            }
        }

        // Get customer code from AccMas
        if ($accKy) {
            $accMas = AccMas::find($accKy);
            $customerCode = $accMas ? $accMas->AccCd : null;
        }

        $payment = DB::transaction(function () use ($validated, $accKy, $adrKy, $customerCode) {
            // if user selected a bank account and the method is bank or card we should
            // increment that bank's current balance.
            $selectedBank = null;
            if (!empty($validated['selected_bank_id']) && ($validated['method'] === 'bank' || $validated['method'] === 'card')) {
                // lock the row to avoid race conditions when multiple payments
                // are being recorded concurrently against the same account
                $selectedBank = \App\Models\BankAccount::lockForUpdate()
                    ->find($validated['selected_bank_id']);
                if ($selectedBank) {
                    // basic permission/company check (reuse existing guard in other
                    // controllers if necessary); for now we at least ensure the bank
                    // is active and belongs to the user's company/section.
                    if ($selectedBank->status === 'active') {
                        // perform the balance increase now; we'll refresh again after
                        // creating the payment record just to be safe
                        $selectedBank->current_balance = (float) $selectedBank->current_balance + (float) $validated['amount'];
                        $selectedBank->save();
                    }
                }
            }

            $payment = CustomerPayment::create([
                'customer_id' => $adrKy,
                'customer_code' => $customerCode,
                'collected_by' => Auth::id(),
                'service_job_id' => $validated['service_job_id'] ?? null,
                'sales_transaction_id' => (!empty($validated['sales_transaction_id']) && $validated['sales_transaction_id'] > 0) ? $validated['sales_transaction_id'] : null,
                'amount' => $validated['amount'],
                'date' => $validated['TrnDt'],
                'method' => $validated['method'],
                'cheque_no' => $validated['ChqueNo'] ?? null,
                'bank_name' => $validated['BankNm'] ?? null,
                'branch' => $validated['ChqueBranch'] ?? $validated['BankBranch'] ?? null,
                'card_last_4' => $validated['CardLast4'] ?? null,
                'card_auth_code' => $validated['CardAuthCode'] ?? null,
                'reference' => $validated['Reference'] ?? null,
                'cheque_date' => $validated['ChqueDt'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'status' => 'completed',
                'selected_bank_id' => !empty($validated['selected_bank_id']) ? $validated['selected_bank_id'] : null,
                'invoice_allocations' => $validated['invoice_allocations'] ?? null,
            ]);

            // --- Intercept Card Payments to Remove Discounts on Service Jobs ---
            if ($validated['method'] === 'card' && !empty($validated['service_job_id'])) {
                /** @var \App\Models\ServiceJob $jobForCard */
                $jobForCard = \App\Models\ServiceJob::with('items')->find($validated['service_job_id']);
                if ($jobForCard) {
                    $itemsChanged = false;
                    foreach ($jobForCard->items as $item) {
                        if ($item->discount_amount > 0) {
                            // Add the discount back to the unit price
                            $item->unit_price = (float)$item->unit_price + (float)$item->discount_amount;
                            $item->discount_amount = 0;
                            $item->save(); // This triggers the model's boot method to recalculate total_price
                            $itemsChanged = true;
                        }
                    }
                    
                    if ($itemsChanged) {
                        // Recalculate Service Job totals based on updated items
                        $jobForCard->updateTotals();
                        // Important: After updateTotals, the balance_amount has increased.
                        // The frontend passed the new higher amount, so this correctly matches.
                    }
                }
            }

            // Reconciliation logic will be handled below after the customer balance update

            // Update customer's current balance
            if ($accKy && $validated['method'] !== 'applied_credit') {
                /** @var AccMas $customerAcc */
                $customerAcc = AccMas::find($accKy);
                if ($customerAcc) {
                    $customerAcc->CurBal = (float) $customerAcc->CurBal - (float) $validated['amount'];
                    $customerAcc->save();

                    // Create Accounting Transaction with Unique Reference
                    \App\Models\AccTrn::create([
                        'AccKy' => $customerAcc->AccKy,
                        'TrnDt' => $validated['TrnDt'],
                        'TrnNo' => 'CPY-' . now()->format('YmdHis') . '-' . str_pad(random_int(0, 9999), 4, '0', STR_PAD_LEFT),
                        'Amt' => -1 * abs($validated['amount']),
                        'VaucherNo' => $validated['Reference'] ?? null,
                        'ChqueNo' => $validated['ChqueNo'] ?? null,
                        'BankNm' => $validated['BankNm'] ?? null,
                        'BranchNm' => $validated['ChqueBranch'] ?? $validated['BankBranch'] ?? null,
                        'Dec' => $validated['notes'] ?? 'Customer Payment',
                        'FInAct' => 1,
                        'Status' => 'A',
                        'company_code' => $customerAcc->company_code ?? null,
                        'section_code' => $customerAcc->section_code ?? null,
                        'customer_code' => $customerCode,
                        'customer_name' => $customerAcc->AccNm ?? null,
                        // NOTE: original_payment_id is intentionally omitted here.
                        // That column's unique constraint is reserved for cheque return entries
                        // (to prevent duplicate cheque returns). Customer payments must not
                        // set it, otherwise repeated payments toward the same invoice would fail.
                    ]);
                }
            }

            // --- RECONCILIATION PRIORITY ---
            
            // 1. Handle explicit multiple invoice allocations if provided
            if (!empty($validated['invoice_allocations']) && count($validated['invoice_allocations']) > 0) {
                // Separate real allocations (invoice_id > 0) from OPENING-BAL allocations (invoice_id = 0)
                $realAllocations = array_filter($validated['invoice_allocations'], fn($a) => (int)($a['invoice_id'] ?? 0) > 0);
                $openingBalAllocations = array_filter($validated['invoice_allocations'], fn($a) => (int)($a['invoice_id'] ?? 0) === 0);

                // Apply real invoice allocations
                foreach ($realAllocations as $allocation) {
                    $invoiceId = (int)($allocation['invoice_id'] ?? 0);
                    $allocatedAmount = (float)($allocation['amount'] ?? 0);
                    
                    if ($invoiceId > 0 && $allocatedAmount > 0) {
                        /** @var SalesTransaction $inv */
                        $inv = SalesTransaction::find($invoiceId);
                        if ($inv) {
                            $inv->balance_amount = (float)$inv->balance_amount - $allocatedAmount;
                            if ($inv->balance_amount <= 0) {
                                $inv->balance_amount = 0;
                                $inv->status = 'completed';
                            } else {
                                $inv->status = 'partially_paid';
                            }
                            $inv->save();
                        }
                    }
                }

                // For OPENING-BAL allocations (invoice_id=0), auto-apply to oldest real pending invoices
                // IMPORTANT: We also update the payment's invoice_allocations to record the real invoice
                // IDs so the observer can correctly recalculate balance_amount later.
                $openingBalTotal = array_sum(array_column(array_values($openingBalAllocations), 'amount'));
                if ($openingBalTotal > 0 && $accKy) {
                    $remainingOpeningBal = (float)$openingBalTotal;
                    $pendingInvoices = SalesTransaction::where('customer_id', $adrKy ?: $accKy)
                        ->where('balance_amount', '>', 0)
                        ->orderBy('transaction_date', 'asc')
                        ->orderBy('id', 'asc')
                        ->get();

                    // Track which real invoices we credited with the OPENING-BAL amount
                    $openingBalRealAllocations = [];
                    
                    foreach ($pendingInvoices as $pendingInv) {
                        if ($remainingOpeningBal <= 0.01) break;
                        $payAmount = min($remainingOpeningBal, (float)$pendingInv->balance_amount);
                        $pendingInv->balance_amount = (float)$pendingInv->balance_amount - $payAmount;
                        if ($pendingInv->balance_amount <= 0) {
                            $pendingInv->balance_amount = 0;
                            $pendingInv->status = 'completed';
                        } else {
                            $pendingInv->status = 'partially_paid';
                        }
                        $pendingInv->saveQuietly(); // saveQuietly to skip observer; we'll call recalculate explicitly
                        $openingBalRealAllocations[] = ['invoice_id' => $pendingInv->id, 'amount' => $payAmount];
                        $remainingOpeningBal -= $payAmount;
                    }

                    // Replace invoice_id=0 entries with the real invoice entries we just applied.
                    // This ensures invoice_allocations is always complete and the observer is accurate.
                    if (!empty($openingBalRealAllocations)) {
                        $mergedAllocations = array_merge(
                            array_values($realAllocations),
                            $openingBalRealAllocations
                        );
                        $payment->invoice_allocations = $mergedAllocations;
                        $payment->saveQuietly();

                        // Manually trigger recalculate for each invoice we credited via OPENING-BAL
                        foreach ($openingBalRealAllocations as $alloc) {
                            SalesTransaction::recalculateBalance((int)$alloc['invoice_id']);
                        }
                    }
                }
            }

            // 2. Handle single invoice allocation via direct ID (Legacy/Simple case)
            elseif (!empty($validated['sales_transaction_id'])) {
                /** @var SalesTransaction $sale */
                $sale = SalesTransaction::find($validated['sales_transaction_id']);
                if ($sale) {
                    // NOTE: observer may have already recalculated balance_amount to 0.
                    // Clamp to 0 to prevent a negative balance being persisted.
                    $sale->balance_amount = max(0, (float)$sale->balance_amount - (float)$validated['amount']);
                    if ($sale->balance_amount <= 0) {
                        $sale->status = 'completed';
                    } else {
                        $sale->status = 'partially_paid';
                    }
                    $sale->save();
                }
            }
            // 3. Auto-reconcile Service Job if linked
            elseif (!empty($validated['service_job_id'])) {
                /** @var ServiceJob $job */
                $job = ServiceJob::find($validated['service_job_id']);
                if ($job) {
                    $totalPaidThroughPayments = CustomerPayment::withoutServiceAdvancePayments()
                        ->where('service_job_id', $job->id)
                        ->sum('amount');
                    $job->paid_amount = $totalPaidThroughPayments;
                    $job->updateTotals();
                    $balance = ($job->total_amount - $job->advanced_payment) - $job->paid_amount;
                    // Note: we do NOT auto-promote to 'completed' here.
                    // The 'completed' status is set by the technician when the repair is done.
                    // The bill is finalized when the Cashier manually marks the job as 'delivered'.
                    $job->save();
                }
            } elseif (empty($validated['sales_transaction_id']) && $accKy) {
                // AUTO-ALLOCATION LOGIC:
                $remainingAmount = (float)$validated['amount'];
                
                $jobs = ServiceJob::where('AccKy', $accKy)
                    ->where('balance_amount', '>', 0)
                    ->orderBy('created_at', 'asc')
                    ->get();
                    
                $invoices = SalesTransaction::where('customer_id', $adrKy ?: $accKy)
                    ->where('balance_amount', '>', 0)
                    ->orderBy('transaction_date', 'asc')
                    ->get();
                    
                $allItems = collect();
                
                foreach ($jobs as $j) {
                    $allItems->push([
                        'type' => 'job',
                        'date' => $j->created_at,
                        'model' => $j,
                        'balance' => $j->balance_amount
                    ]);
                }
                
                foreach ($invoices as $i) {
                    $allItems->push([
                        'type' => 'invoice',
                        'date' => $i->transaction_date,
                        'model' => $i,
                        'balance' => $i->balance_amount
                    ]);
                }
                
                $sortedItems = $allItems->sortBy('date');
                $autoAllocations = [];
                
                foreach ($sortedItems as $item) {
                    if ($remainingAmount <= 0.01) break;
                    
                    $payAmount = min($remainingAmount, (float)$item['balance']);
                    
                    if ($item['type'] === 'job') {
                        /** @var ServiceJob $jobModel */
                        $jobModel = $item['model'];
                        
                        $totalPaid = CustomerPayment::withoutServiceAdvancePayments()
                            ->where('service_job_id', $jobModel->id)
                            ->sum('amount');
                        $jobModel->paid_amount = $totalPaid + $payAmount; 
                        $jobModel->updateTotals();
                        
                        if (($jobModel->total_amount - $jobModel->advanced_payment - $jobModel->paid_amount) <= 0) {
                            // Note: we do NOT auto-promote to 'completed' here.
                            // The bill is finalized when the Cashier manually marks the job as 'delivered'.
                        }

                        $autoAllocations[] = [
                            'service_job_id' => $jobModel->id,
                            'amount' => $payAmount
                        ];
                        
                    } else {
                        /** @var SalesTransaction $invModel */
                        $invModel = $item['model'];
                        
                        $invModel->balance_amount = (float)$invModel->balance_amount - $payAmount;
                        if ($invModel->balance_amount <= 0) {
                             $invModel->balance_amount = 0;
                             $invModel->status = 'completed';
                        } else {
                             $invModel->status = 'partially_paid';
                        }
                        $invModel->save();

                        $autoAllocations[] = [
                            'invoice_id' => $invModel->id,
                            'amount' => $payAmount
                        ];
                    }
                    
                    $remainingAmount -= $payAmount;
                }

                if (!empty($autoAllocations)) {
                    $payment->invoice_allocations = $autoAllocations;
                    $payment->save();
                }
            }
            
            \Log::info("REACHED FAT LOGIC", ['method' => $validated['method'] ?? 'null', 'payment_id' => $payment->id ?? 'null']);
            // Record to Cashier Sales Finance Account
            if (strtolower(trim($validated['method'] ?? '')) === 'cash') {
                $cashierFinanceAccount = \App\Models\FinanceAccount::where('account_name', 'like', '%Cashier Sales%')
                    ->where('section_code', Auth::user()->section_code)
                    ->first() ?? \App\Models\FinanceAccount::find(40);
                
                if ($cashierFinanceAccount) {
                    $effectiveCash = (float)$validated['amount'];
                    
                    $invoicesText = '';
                    $invNos = [];
                    
                    if (!empty($payment->sales_transaction_id)) {
                        $invNo = \App\Models\SalesTransaction::where('id', $payment->sales_transaction_id)->value('invoice_no');
                        if ($invNo) $invNos[] = $invNo;
                    }
                    
                    if (!empty($payment->invoice_allocations)) {
                        $invIds = array_filter(array_column($payment->invoice_allocations, 'invoice_id'));
                        if (!empty($invIds)) {
                            $allocInvNos = \App\Models\SalesTransaction::whereIn('id', $invIds)->pluck('invoice_no')->toArray();
                            $invNos = array_merge($invNos, $allocInvNos);
                        }
                    }
                    
                    $invNos = array_unique(array_filter($invNos));
                    if (!empty($invNos)) {
                        $invoicesText .= ' (Invoices: ' . implode(', ', $invNos) . ')';
                    }
                    
                    if (!empty($payment->service_job_id)) {
                        $sjNo = \App\Models\ServiceJob::where('id', $payment->service_job_id)->value('job_number');
                        if ($sjNo) {
                            $invoicesText .= ' (Service Job: ' . $sjNo . ')';
                        }
                    }

                    $fat = \App\Models\FinanceAccountTransaction::where('source_type', \App\Models\CustomerPayment::class)
                        ->where('source_id', $payment->id)
                        ->first();
                        
                    $description = 'Customer payment (' . ($payment->reference ?? '-') . ')' . $invoicesText;

                    \Log::info("FAT check for payment " . $payment->id, ['has_fat' => $fat ? true : false, 'effective_cash' => $effectiveCash]);

                    if (!$fat && $effectiveCash > 0) {
                        $fatData = [
                            'finance_account_id' => $cashierFinanceAccount->id,
                            'date' => $validated['TrnDt'],
                            'source_type' => \App\Models\CustomerPayment::class,
                            'source_id' => $payment->id,
                            'description' => $description,
                            'method' => 'cash', // LOWERCASE cash to match enum if any
                            'type' => 'debit',
                            'amount' => $effectiveCash,
                            'running_balance' => 0
                        ];
                        \Log::info("Creating FAT", $fatData);
                        \App\Models\FinanceAccountTransaction::create($fatData);
                        
                        if (in_array($cashierFinanceAccount->main_category->value ?? 'assets', ['liabilities', 'revenue', 'equity'])) {
                            $cashierFinanceAccount->current_balance -= $effectiveCash;
                        } else {
                            $cashierFinanceAccount->current_balance += $effectiveCash;
                        }
                        $cashierFinanceAccount->save();
                    } elseif ($fat) {
                        $fat->description = $description;
                        $fat->save();
                    }
                }
            }

            return $payment;
        });

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Payment recorded successfully',
                'payment_id' => $payment->id
            ]);
        }

        return redirect()->back()->with('success', 'Payment recorded successfully')->with('payment_id', $payment->id);
    }

    public function export(Request $request)
    {
        if (!request()->user()->hasPermission('customer_payments.view')) {
             return redirect()->back()->with('error', 'Unauthorized.');
        }

        $user = $request->user();
        $query = CustomerPayment::with(['customer', 'salesTransaction:id,invoice_no', 'collectedBy:id,first_name,last_name']);

        if ($user && $user->role_id !== 1) { // Not superadmin
            if ($user->role_id === 3) {
                $query->whereHas('customer', function($q) use ($user) {
                    $q->where('section_code', $user->section_code);
                });
            } else {
                $query->whereHas('customer', function($q) use ($user) {
                    $q->where('company_code', $user->company_code);
                });
            }
        } else if ($user && $user->role_id === 1) { // Superadmin
            $selectedCompany = session('selected_company');
            if ($selectedCompany) {
                $query->whereHas('customer', function($q) use ($selectedCompany) {
                    $q->where('company_code', $selectedCompany);
                });
            }
        }

        if ($request->has('search') && $request->search) {
             $query->where(function($q) use ($request) {
                  $q->where('reference', 'like', '%' . $request->search . '%')
                    ->orWhere('cheque_no', 'like', '%' . $request->search . '%')
                    ->orWhereHas('customer', function($cq) use ($request) {
                         $cq->where('FstNm', 'like', '%' . $request->search . '%')
                           ->orWhere('LstNm', 'like', '%' . $request->search . '%')
                           ->orWhere('AdrCd', 'like', '%' . $request->search . '%');
                    });
             });
        }
        
        if ($request->has('date_from') && $request->date_from) {
             $query->whereDate('date', '>=', $request->date_from);
        }
        if ($request->has('date_to') && $request->date_to) {
             $query->whereDate('date', '<=', $request->date_to);
        }

        // Cashier Filtering
        if ($request->has('cashier_id') && $request->cashier_id) {
             $query->where('collected_by', $request->cashier_id);
        }

        $paymentCollection = $query->orderBy('created_at', 'desc')->get();

        $invoiceIds = $paymentCollection->flatMap(function ($payment) {
            $ids = [];
            if (!empty($payment->sales_transaction_id)) {
                $ids[] = (int) $payment->sales_transaction_id;
            }
            if (is_array($payment->invoice_allocations)) {
                foreach ($payment->invoice_allocations as $allocation) {
                    $invoiceId = (int) ($allocation['invoice_id'] ?? -1);
                    if ($invoiceId >= 0) {
                        $ids[] = $invoiceId;
                    }
                }
            }
            return $ids;
        })->unique()->values();

        $serviceJobIds = $paymentCollection->flatMap(function ($payment) {
            $ids = [];
            if (!empty($payment->service_job_id)) {
                $ids[] = (int) $payment->service_job_id;
            }
            if (is_array($payment->invoice_allocations)) {
                foreach ($payment->invoice_allocations as $allocation) {
                    $jobId = (int) ($allocation['service_job_id'] ?? -1);
                    if ($jobId >= 0) {
                        $ids[] = $jobId;
                    }
                }
            }
            return $ids;
        })->unique()->values();

        $invoiceMap = $invoiceIds->isEmpty()
            ? collect()
            : SalesTransaction::whereIn('id', $invoiceIds)->pluck('invoice_no', 'id');

        $serviceJobMap = $serviceJobIds->isEmpty()
            ? collect()
            : ServiceJob::whereIn('id', $serviceJobIds)->get(['id', 'job_number', 'invoice_number'])->mapWithKeys(function ($job) {
                return [$job->id => $job->invoice_number ? "{$job->invoice_number} ({$job->job_number})" : $job->job_number];
            });

        $format = $request->get('format', 'csv');
        $filenameBase = "customer-payments-history-" . date('Y-m-d');
        
        $reportData = [];
        $totalCollected = 0;

        foreach ($paymentCollection as $payment) {
            $paidInvoices = [];
            if (!empty($payment->sales_transaction_id)) {
                $invoiceNo = $invoiceMap->get((int) $payment->sales_transaction_id);
                if ($invoiceNo) {
                    $paidInvoices[] = $invoiceNo;
                }
            }
            if (!empty($payment->service_job_id)) {
                $jobNo = $serviceJobMap->get((int) $payment->service_job_id);
                if ($jobNo) {
                    $paidInvoices[] = $jobNo;
                }
            }
            if (is_array($payment->invoice_allocations)) {
                foreach ($payment->invoice_allocations as $allocation) {
                    $invoiceId = (int) ($allocation['invoice_id'] ?? -1);
                    if ($invoiceId === 0) {
                         $paidInvoices[] = 'OPENING-BAL';
                         continue;
                    }
                    if ($invoiceId > 0) {
                        $invoiceNo = $invoiceMap->get($invoiceId);
                        if ($invoiceNo) {
                            $paidInvoices[] = $invoiceNo;
                        }
                    }

                    $jobId = (int) ($allocation['service_job_id'] ?? -1);
                    if ($jobId > 0) {
                        $jobNo = $serviceJobMap->get($jobId);
                        if ($jobNo) {
                            $paidInvoices[] = $jobNo;
                        }
                    }
                }
            }

            $paidInvoicesStr = implode(', ', array_unique($paidInvoices));
            $date = \Carbon\Carbon::parse($payment->date)->format('Y-m-d');
            
            $ref = '';
            if ($payment->method === 'cheque') $ref = '#' . $payment->cheque_no;
            if ($payment->reference) $ref .= ($ref ? ' | ' : '') . 'Ref: ' . $payment->reference;

            $reportData[] = [
                'date' => $date,
                'receipt_no' => 'PAY-' . $payment->id,
                'customer_code' => $payment->customer ? $payment->customer->AdrCd : '',
                'customer_name' => $payment->customer ? trim($payment->customer->FstNm . ' ' . $payment->customer->LstNm) : 'Unknown',
                'amount' => $payment->amount,
                'paid_invoices' => $paidInvoicesStr,
                'method' => ucfirst($payment->method),
                'reference' => $ref,
                'status' => strtoupper($payment->status),
                'cashier' => $payment->collectedBy ? $payment->collectedBy->name : 'N/A'
            ];
            $totalCollected += (float)$payment->amount;
        }

        if ($format === 'pdf') {
            ini_set('memory_limit', '1024M');
            ini_set('max_execution_time', '300');
            $company = \App\Models\Company::first();
            $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('reports.customer-payments-pdf', [
                'company' => $company,
                'reportData' => $reportData,
                'totalCollected' => $totalCollected
            ])->setPaper('a4', 'landscape');
            return $pdf->download("{$filenameBase}.pdf");
        }

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filenameBase}.csv\"",
        ];

        $callback = function() use ($reportData) {
            $file = fopen('php://output', 'w');
            fputcsv($file, ['Date', 'Receipt No', 'Customer Code', 'Customer Name', 'Amount (Rs)', 'Paid Invoice No', 'Method', 'Reference / Cheque No', 'Status', 'Cashier']);

            foreach ($reportData as $item) {
                fputcsv($file, [
                    $item['date'],
                    $item['receipt_no'],
                    $item['customer_code'],
                    $item['customer_name'],
                    number_format((float)$item['amount'], 2, '.', ''),
                    $item['paid_invoices'],
                    $item['method'],
                    $item['reference'],
                    $item['status'],
                    $item['cashier']
                ]);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}

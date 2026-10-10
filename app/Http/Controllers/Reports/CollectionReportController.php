<?php

namespace App\Http\Controllers\Reports;

use App\Models\CustomerPayment;
use App\Models\DeliveryPayment;
use App\Models\Delivery;
use App\Models\ServiceJob;
use App\Models\Customer;
use App\Models\User;
use App\Models\Company;
use App\Models\Section;
use App\Models\SalesTransaction;
use App\Models\SupplierPayment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;
use App\Http\Controllers\Controller;

class CollectionReportController extends Controller
{
    public function index(Request $request)
    {
        // authorization check – see PermissionSeeder for slug
        if (! request()->user() || ! request()->user()->hasPermission('reports.collection')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view collection reports.');
        }

        // Get authenticated user
        $user = Auth::user();
        
        $startDate = $request->get('start_date', Carbon::now()->startOfMonth()->format('Y-m-d'));        $endDate = $request->get('end_date', Carbon::now()->endOfMonth()->format('Y-m-d'));
        $customerId = $request->get('customer_id');
        $paymentMethod = $request->get('payment_method');
        $paymentSource = $request->get('payment_source'); // New filter for payment source
        $technicianId = $request->get('technician_id');
        $serialNumber = $request->get('serial_number');
        $jobNumber = $request->get('job_number');
        $reportType = $request->get('report_type', 'daily'); // daily, monthly
        $companyCode = $request->get('company_code');
        $sectionCode = $request->get('section_code');

        // For staff members (not admins), when payment method is selected,
        // automatically filter to today's transactions
        $autoFilterToday = false;
        $filterByStaffUser = false;
        if ($user && ($user->role_id === 3 || $user->role_id === 4) && $paymentMethod && $paymentMethod !== 'all') {
            $today = Carbon::now()->format('Y-m-d');
            $startDate = $today;
            $endDate = $today;
            $autoFilterToday = true;
            $filterByStaffUser = true;
        }

        // Build query for payments with company/section filtering
        $paymentsQuery = CustomerPayment::with(['customer', 'serviceJob.technician', 'collectedBy', 'salesTransaction'])
            ->whereBetween('date', [$startDate, $endDate]);

        // Apply company/section filtering based on user role
        if ($user) {
            if ($user->role_id === 1) {
                // Superadmin - can filter by any company/section
                if ($companyCode && $companyCode !== 'all') {
                    $paymentsQuery->where(function($query) use ($companyCode) {
                        $query->whereHas('customer', function ($q) use ($companyCode) {
                            $q->where(function($subQ) use ($companyCode) {
                                $subQ->where('company_code', $companyCode)
                                    ->orWhereNull('company_code')
                                    ->orWhere('company_code', '');
                            });
                        })->orWhereDoesntHave('customer');
                    });
                }
                if ($sectionCode && $sectionCode !== 'all') {
                    $paymentsQuery->where(function($query) use ($sectionCode) {
                        $query->whereHas('customer', function ($q) use ($sectionCode) {
                            $q->where(function($subQ) use ($sectionCode) {
                                $subQ->where('section_code', $sectionCode)
                                    ->orWhereNull('section_code')
                                    ->orWhere('section_code', '');
                            });
                        })->orWhereDoesntHave('customer');
                    });
                }
            } elseif ($user->role_id === 3 || $user->role_id === 4) {
                // Section admin or staff - filter by their section only
                $paymentsQuery->where(function($query) use ($user) {
                    $query->whereHas('customer', function ($q) use ($user) {
                        $q->where(function($subQ) use ($user) {
                            $subQ->where('section_code', $user->section_code)
                                ->orWhereNull('section_code')
                                ->orWhere('section_code', '');
                        });
                    })->orWhereDoesntHave('customer');
                });
            } else {
                // Company admin - filter by their company, optionally by section
                $paymentsQuery->where(function($query) use ($user, $sectionCode) {
                    $query->whereHas('customer', function ($q) use ($user, $sectionCode) {
                        $q->where(function($subQ) use ($user) {
                            $subQ->where('company_code', $user->company_code)
                                ->orWhereNull('company_code')
                                ->orWhere('company_code', '');
                        });
                        if ($sectionCode && $sectionCode !== 'all') {
                            $q->where(function($subQ) use ($sectionCode) {
                                $subQ->where('section_code', $sectionCode)
                                    ->orWhereNull('section_code')
                                    ->orWhere('section_code', '');
                            });
                        }
                    })->orWhereDoesntHave('customer');
                });
            }
        }

        if ($customerId && $customerId !== 'all') {
            $paymentsQuery->where('customer_id', $customerId);
        }

        if ($paymentMethod && $paymentMethod !== 'all') {
            $paymentsQuery->where('method', $paymentMethod);
            
            // For staff members, show only their own collections (or null collected_by for legacy data)
            if ($filterByStaffUser && $user) {
                $paymentsQuery->where(function($query) use ($user) {
                    $query->where('collected_by', $user->id)
                          ->orWhereNull('collected_by');
                });
            }
        }

        if ($technicianId && $technicianId !== 'all') {
            $paymentsQuery->whereHas('serviceJob', function ($q) use ($technicianId) {
                $q->where('assigned_technician_id', $technicianId);
            });
        }

        if ($serialNumber) {
            $paymentsQuery->whereHas('serviceJob', function ($q) use ($serialNumber) {
                $q->where('device_serial', 'like', '%' . $serialNumber . '%');
            });
        }

        if ($jobNumber) {
            $paymentsQuery->whereHas('serviceJob', function ($q) use ($jobNumber) {
                $q->where('job_number', 'like', '%' . $jobNumber . '%');
            });
        }

        $customerPayments = $paymentsQuery->orderBy('date', 'desc')->get();

        // Query delivery payments with the same date range and company/section filtering
        $deliveryPaymentsQuery = DeliveryPayment::with(['delivery'])
            ->whereBetween('payment_date', [$startDate, $endDate]);

        // Apply company filtering for delivery payments
        if ($user) {
            if ($user->role_id === 1) {
                // Superadmin
                if ($companyCode && $companyCode !== 'all') {
                    $deliveryPaymentsQuery->where('company_code', $companyCode);
                }
            } elseif ($user->role_id === 3 || $user->role_id === 4) {
                // Section admin or staff
                if ($user->section_code) {
                    $deliveryPaymentsQuery->whereHas('delivery', function ($q) use ($user) {
                        $q->where('section_code', $user->section_code);
                    });
                }
            } else {
                // Company admin
                $deliveryPaymentsQuery->where('company_code', $user->company_code);
            }
        }

        if ($paymentMethod && $paymentMethod !== 'all') {
            $deliveryPaymentsQuery->where('method', $paymentMethod);
        }

        $deliveryPayments = collect();
        if (!$technicianId || $technicianId === 'all') {
            $deliveryPayments = $deliveryPaymentsQuery->orderBy('payment_date', 'desc')->get();
        }

        // Query sales transactions (POS sales) with the same date range
        $salesTransactionsQuery = SalesTransaction::with(['customer', 'cashier'])
            ->whereBetween('transaction_date', [$startDate, $endDate])
            ->where('status', 'completed');

        // Apply section filtering for sales transactions
        if ($user) {
            if ($user->role_id === 1) {
                // Superadmin
                if ($sectionCode && $sectionCode !== 'all') {
                    $salesTransactionsQuery->where('section_code', $sectionCode);
                }
            } elseif ($user->role_id === 3 || $user->role_id === 4) {
                // Section admin or staff
                if ($user->section_code) {
                    $salesTransactionsQuery->where('section_code', $user->section_code);
                }
            } else {
                // Company admin - filter by sections in their company
                if ($sectionCode && $sectionCode !== 'all') {
                    $salesTransactionsQuery->where('section_code', $sectionCode);
                }
            }
        }

        if ($paymentMethod && $paymentMethod !== 'all') {
            if ($filterByStaffUser && $user) {
                $salesTransactionsQuery->where('cashier_id', $user->id);
            }
        }

        $salesTransactions = collect();
        if (!$technicianId || $technicianId === 'all') {
            $salesTransactions = $salesTransactionsQuery->orderBy('transaction_date', 'desc')->get();
        }

        // If payment method filter is set, filter sales transactions in PHP (payment_details is JSON)
        if ($paymentMethod && $paymentMethod !== 'all') {
            $salesTransactions = $salesTransactions->filter(function($transaction) use ($paymentMethod) {
                $details = $transaction->payment_details ?? [];
                $mode = $details['mode'] ?? '';
                $amount = floatval($details[$paymentMethod] ?? 0);
                return $mode === $paymentMethod || $amount > 0;
            });
        }

        // Query supplier payments
        $supplierPaymentsQuery = SupplierPayment::whereBetween('payment_date', [$startDate, $endDate]);

        // Apply company/section filtering for supplier payments
        if ($user) {
            if ($user->role_id === 1) {
                // Superadmin
                if ($companyCode && $companyCode !== 'all') {
                    $supplierPaymentsQuery->where('company_code', $companyCode);
                }
                if ($sectionCode && $sectionCode !== 'all') {
                    $supplierPaymentsQuery->where('section_code', $sectionCode);
                }
            } elseif ($user->role_id === 3 || $user->role_id === 4) {
                // Section admin or staff
                if ($user->section_code) {
                    $supplierPaymentsQuery->where('section_code', $user->section_code);
                }
            } else {
                // Company admin
                if ($user->company_code) {
                    $supplierPaymentsQuery->where('company_code', $user->company_code);
                }
                if ($sectionCode && $sectionCode !== 'all') {
                    $supplierPaymentsQuery->where('section_code', $sectionCode);
                }
            }
        }

        $supplierPayments = collect();
        if (!$technicianId || $technicianId === 'all') {
            $supplierPayments = $supplierPaymentsQuery->orderBy('payment_date', 'desc')->get();
        }

        // Filter supplier payments by payment method in PHP (values are capitalized, e.g. "Cash")
        if ($paymentMethod && $paymentMethod !== 'all') {
            $supplierPayments = $supplierPayments->filter(function($p) use ($paymentMethod) {
                return strtolower($p->payment_method) === strtolower($paymentMethod);
            });
        }

        // Transform all payments into unified format with source_type
        $allPayments = collect();

        // Add customer payments (services and sales)
        foreach ($customerPayments as $payment) {
            // Determine source type based on explicit indicators first
            $sourceType = 'sales'; // Default
            
            // Priority 1: Check if this is explicitly a service payment
            if ($payment->service_job_id) {
                $sourceType = 'service';
            } 
            // Priority 2: Check if this is explicitly a sales payment
            elseif ($payment->sales_transaction_id) {
                $sourceType = 'sales';
            } 
            // Priority 3: Infer from section types only if no explicit indicator
            else {
                // Check the collected_by user's section type
                if ($payment->collectedBy && $payment->collectedBy->section_code) {
                    $collectorSection = Section::where('section_code', $payment->collectedBy->section_code)->first();
                    if ($collectorSection && strtolower($collectorSection->section_type) === 'service') {
                        $sourceType = 'service';
                    }
                }
                
                // If still not service, check customer's section type
                if ($sourceType === 'sales' && $payment->customer && $payment->customer->section_code) {
                    $customerSection = Section::where('section_code', $payment->customer->section_code)->first();
                    if ($customerSection && strtolower($customerSection->section_type) === 'service') {
                        $sourceType = 'service';
                    }
                }
            }
            
            // Ensure customer object exists even if relationship is null
            $customer = $payment->customer;
            if (!$customer) {
                $customer = (object)[
                    'AdrKy' => $payment->customer_id ?? 0,
                    'FstNm' => 'Unknown',
                    'LstNm' => 'Customer',
                    'AdrCd' => $payment->customer_code ?? 'N/A',
                ];
            }
            
            $allPayments->push([
                'id' => $payment->id,
                'customer_id' => $payment->customer_id,
                'customer_code' => $payment->customer_code,
                'amount' => $payment->amount,
                'date' => $payment->date,
                'method' => $payment->method,
                'reference' => $payment->reference,
                'notes' => $payment->notes,
                'source_type' => $sourceType,
                'customer' => $customer,
                'serviceJob' => $payment->serviceJob,
                'salesTransaction' => $payment->salesTransaction ?? null,
            ]);
        }

        // Add delivery payments
        foreach ($deliveryPayments as $payment) {
            $allPayments->push([
                'id' => 'D-' . $payment->id,
                'customer_id' => null,
                'customer_code' => $payment->delivery ? $payment->delivery->customer_name : 'Delivery',
                'amount' => $payment->amount,
                'date' => $payment->payment_date,
                'method' => $payment->method,
                'reference' => $payment->reference_no,
                'notes' => $payment->notes,
                'source_type' => 'delivery',
                'customer' => (object)[
                    'AdrKy' => 0,
                    'FstNm' => $payment->delivery ? $payment->delivery->customer_name : 'Delivery',
                    'LstNm' => '',
                    'AdrCd' => $payment->delivery ? $payment->delivery->delivery_number : 'N/A',
                ],
                'serviceJob' => null,
                'salesTransaction' => null,
                'delivery' => $payment->delivery,
            ]);
        }

        // Add sales transactions (POS sales)
        foreach ($salesTransactions as $transaction) {
            // Get payment details
            $paymentDetails = $transaction->payment_details ?? [];
            $paymentMode = $paymentDetails['mode'] ?? 'cash';
            
            // Determine the actual amount paid
            $cashAmount = floatval($paymentDetails['cash'] ?? 0);
            $cardAmount = floatval($paymentDetails['card'] ?? 0);
            $pointsAmount = floatval($paymentDetails['points'] ?? 0);
            
            // Get customer info
            $customer = $transaction->customer;
            if (!$customer) {
                // Use customer_code and customer_name from transaction
                $customer = (object)[
                    'AdrKy' => $transaction->customer_id ?? 0,
                    'FstNm' => $transaction->customer_name ?? 'Cash Customer',
                    'LstNm' => '',
                    'AdrCd' => $transaction->customer_code ?? 'CASH',
                ];
            }
            
            // NOTE: We skip adding Cash and Card amounts here because they are 
            // automatically recorded in the CustomerPayment table and picked 
            // up by the first loop in this controller. We only add the 
            // SalesTransaction if it's a Credit sale (no immediate payment).
            
            $balanceAmount = floatval($paymentDetails['balance'] ?? 0);
            
            if ($balanceAmount > 0 || $paymentMode === 'credit') {
                $allPayments->push([
                    'id' => 'ST-' . $transaction->id . '-credit',
                    'customer_id' => $transaction->customer_id,
                    'customer_code' => $transaction->customer_code,
                    'amount' => $balanceAmount > 0 ? $balanceAmount : $transaction->total_amount,
                    'date' => $transaction->transaction_date,
                    'method' => 'credit',
                    'reference' => $transaction->invoice_no,
                    'notes' => 'Credit Sale',
                    'source_type' => 'sales',
                    'customer' => $customer,
                    'serviceJob' => null,
                    'salesTransaction' => $transaction,
                ]);
            }
        }

        // Add supplier payments
        foreach ($supplierPayments as $payment) {
            $allPayments->push([
                'id' => 'SP-' . $payment->id,
                'customer_id' => null,
                'customer_code' => $payment->supplier_code ?? 'N/A',
                'amount' => $payment->paid_amount,
                'date' => $payment->payment_date,
                'method' => strtolower($payment->payment_method ?? 'cash'),
                'reference' => $payment->payment_no,
                'notes' => $payment->notes,
                'source_type' => 'supplier',
                'customer' => (object)[
                    'AdrKy' => $payment->supplier_id ?? 0,
                    'FstNm' => $payment->supplier_name ?? 'Supplier',
                    'LstNm' => '',
                    'AdrCd' => $payment->supplier_code ?? 'N/A',
                ],
                'serviceJob' => null,
                'salesTransaction' => null,
            ]);
        }

        // Sort all payments by date descending
        $payments = $allPayments->sortByDesc('date')->values();
        
        // Filter by payment source if specified
        if ($paymentSource && in_array($paymentSource, ['service', 'sales', 'delivery', 'supplier'])) {
            $payments = $payments->filter(function($payment) use ($paymentSource) {
                return $payment['source_type'] === $paymentSource;
            })->values();
        }

        // FALLBACK LOGIC: For payments without a direct service_job_id, 
        // try to find the most relevant service job for the customer for reporting purposes.
        $payments->each(function($payment) {
            if ($payment['source_type'] === 'service' && !$payment['serviceJob'] && $payment['customer'] && isset($payment['customer']->AccKy)) {
                // 1. Try matching by AccKy (Account Key)
                $bestJob = null;
                if ($payment['customer']->AccKy) {
                    $bestJob = ServiceJob::with(['technician'])
                        ->where('AccKy', $payment['customer']->AccKy)
                        ->where('received_date', '<=', $payment['date'])
                        ->orderByRaw("ABS(DATEDIFF(received_date, ?))", [$payment['date']])
                        ->first();
                }

                // 2. If no AccKy match, try matching by Customer Name in service_jobs table
                if (!$bestJob) {
                    $fullName = trim($payment['customer']->FstNm . ' ' . $payment['customer']->LstNm);
                    $bestJob = ServiceJob::with(['technician'])
                        ->where('customer_name', 'like', '%' . $fullName . '%')
                        ->where('received_date', '<=', $payment['date'])
                        ->orderByRaw("ABS(DATEDIFF(received_date, ?))", [$payment['date']])
                        ->first();
                }

                if ($bestJob) {
                    // Dynamically associate it for the report view
                    $payment['serviceJob'] = $bestJob;
                }
            }
        });

        // Specific customer data if filtered
        $customerSummary = null;
        if ($customerId && $customerId !== 'all') {
            $customer = Customer::find($customerId);
            if ($customer) {
                $customerSummary = [
                    'name' => $customer->FstNm . ' ' . $customer->LstNm,
                    'code' => $customer->AdrCd,
                    'phone' => $customer->Mob,
                    'email' => $customer->Email,
                    'total_paid' => CustomerPayment::where('customer_id', $customerId)->sum('amount'),
                    'total_outstanding' => ServiceJob::where('AccKy', $customer->AccKy)->sum('balance_amount'),
                    'job_count' => ServiceJob::where('AccKy', $customer->AccKy)->count(),
                    'last_payment' => CustomerPayment::where('customer_id', $customerId)->latest('date')->first()?->date,
                ];
            }
        }

        // Get filter options based on user role
        $customersQuery = Customer::select('AdrKy', 'FstNm', 'LstNm', 'AdrCd', 'company_code', 'section_code');
        
        // Filter customers based on user role
        if ($user) {
            if ($user->role_id === 1) {
                // Superadmin - can see all customers, optionally filter
                if ($companyCode && $companyCode !== 'all') {
                    $customersQuery->where('company_code', $companyCode);
                }
                if ($sectionCode && $sectionCode !== 'all') {
                    $customersQuery->where('section_code', $sectionCode);
                }
            } elseif ($user->role_id === 3 || $user->role_id === 4) {
                // Section admin or staff - show customers from their section
                // Include customers with NULL section_code as they might be legacy data
                $customersQuery->where(function($q) use ($user) {
                    $q->where('section_code', $user->section_code)
                      ->orWhereNull('section_code')
                      ->orWhere('section_code', '');
                });
            } else {
                // Company admin - show customers from their company
                $customersQuery->where(function($q) use ($user) {
                    $q->where('company_code', $user->company_code)
                      ->orWhereNull('company_code')
                      ->orWhere('company_code', '');
                });
                
                // If section selected, further filter
                if ($sectionCode && $sectionCode !== 'all') {
                    $customersQuery->where(function($q) use ($sectionCode) {
                        $q->where('section_code', $sectionCode)
                          ->orWhereNull('section_code')
                          ->orWhere('section_code', '');
                    });
                }
            }
        }
        
        $customers = $customersQuery->orderBy('AdrCd')->get();
        
        $technicians = User::whereHas('serviceJobs')
            ->select('id', 'first_name', 'last_name')
            ->get()
            ->map(function ($u) {
                return [
                    'id' => $u->id,
                    'name' => $u->first_name . ' ' . $u->last_name
                ];
            });
        $paymentMethods = ['cash', 'cheque', 'bank', 'card', 'credit'];

        // Get available companies and sections based on user role
        $companies = collect();
        $sections = collect();

        if ($user) {
            if ($user->role_id === 1) {
                // Superadmin - can see all
                $companies = Company::select('id', 'name', 'company_code')->get();
                if ($companyCode) {
                    $sections = Section::where('company_code', $companyCode)
                        ->select('id', 'name', 'section_code')
                        ->get();
                } else {
                    $sections = Section::select('id', 'name', 'section_code', 'company_code')->get();
                }
            } elseif ($user->role_id === 3 || $user->role_id === 4) {
                // Section admin or staff - no company/section selection
                $companies = Company::where('company_code', $user->company_code)->get();
                $sections = Section::where('section_code', $user->section_code)->get();
            } else {
                // Company admin - can see their company and sections
                $companies = Company::where('company_code', $user->company_code)->get();
                $sections = Section::where('company_code', $user->company_code)
                    ->select('id', 'name', 'section_code')
                    ->get();
            }
        }

        // Generate chart data
        $chartData = $this->generateChartData($payments, $reportType, $startDate, $endDate);
        
        // Generate summary data
        $summary = $this->generateSummary($payments);

        return inertia('Reports/CollectionReport', [
            'payments' => $payments,
            'customers' => $customers,
            'technicians' => $technicians,
            'paymentMethods' => $paymentMethods,
            'companies' => $companies,
            'sections' => $sections,
            'chartData' => $chartData,
            'customerSummary' => $customerSummary,
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'customer_id' => $customerId,
                'payment_method' => $paymentMethod,
                'payment_source' => $paymentSource,
                'technician_id' => $technicianId,
                'serial_number' => $serialNumber,
                'job_number' => $jobNumber,
                'report_type' => $reportType,
                'company_code' => $companyCode,
                'section_code' => $sectionCode,
            ],
            'summary' => $summary,
        ]);
    }

    private function generateChartData($payments, $reportType, $startDate, $endDate)
    {
        $data = [];

        if ($reportType === 'daily') {
            // Daily chart data
            $dates = collect();
            $currentDate = Carbon::parse($startDate);
            $endDateCarbon = Carbon::parse($endDate);

            while ($currentDate <= $endDateCarbon) {
                $dateStr = $currentDate->format('Y-m-d');
                $dayPayments = $payments->filter(function($p) use ($dateStr) {
                    return Carbon::parse($p['date'])->format('Y-m-d') === $dateStr;
                });

                $data[] = [
                    'date' => $currentDate->format('M d'),
                    'full_date' => $dateStr,
                    'total' => $dayPayments->sum('amount'),
                    'cash' => $dayPayments->where('method', 'cash')->sum('amount'),
                    'cheque' => $dayPayments->where('method', 'cheque')->sum('amount'),
                    'bank' => $dayPayments->where('method', 'bank')->sum('amount'),
                    'card' => $dayPayments->where('method', 'card')->sum('amount'),
                    'credit' => $dayPayments->where('method', 'credit')->sum('amount'),
                    'count' => $dayPayments->count(),
                    // Source breakdown
                    'service' => $dayPayments->where('source_type', 'service')->sum('amount'),
                    'sales' => $dayPayments->where('source_type', 'sales')->sum('amount'),
                    'delivery' => $dayPayments->where('source_type', 'delivery')->sum('amount'),
                    'supplier' => $dayPayments->where('source_type', 'supplier')->sum('amount'),
                ];

                $currentDate->addDay();
            }
        } else {
            // Monthly chart data
            $months = collect();
            $currentDate = Carbon::parse($startDate)->startOfMonth();
            $endDateCarbon = Carbon::parse($endDate)->endOfMonth();

            while ($currentDate <= $endDateCarbon) {
                $monthStr = $currentDate->format('Y-m');
                $monthPayments = $payments->filter(function ($payment) use ($monthStr) {
                    return Carbon::parse($payment['date'])->format('Y-m') === $monthStr;
                });

                $data[] = [
                    'date' => $currentDate->format('M Y'),
                    'full_date' => $monthStr,
                    'total' => $monthPayments->sum('amount'),
                    'cash' => $monthPayments->where('method', 'cash')->sum('amount'),
                    'cheque' => $monthPayments->where('method', 'cheque')->sum('amount'),
                    'bank' => $monthPayments->where('method', 'bank')->sum('amount'),
                    'card' => $monthPayments->where('method', 'card')->sum('amount'),
                    'credit' => $monthPayments->where('method', 'credit')->sum('amount'),
                    'count' => $monthPayments->count(),
                    // Source breakdown
                    'service' => $monthPayments->where('source_type', 'service')->sum('amount'),
                    'sales' => $monthPayments->where('source_type', 'sales')->sum('amount'),
                    'delivery' => $monthPayments->where('source_type', 'delivery')->sum('amount'),
                    'supplier' => $monthPayments->where('source_type', 'supplier')->sum('amount'),
                ];

                $currentDate->addMonth();
            }
        }

        return $data;
    }

    private function generateSummary($payments)
    {
        return [
            'total_amount' => $payments->sum('amount'),
            'total_payments' => $payments->count(),
            'average_payment' => $payments->count() > 0 ? $payments->sum('amount') / $payments->count() : 0,
            'payment_methods' => [
                'cash' => $payments->where('method', 'cash')->sum('amount'),
                'cheque' => $payments->where('method', 'cheque')->sum('amount'),
                'bank' => $payments->where('method', 'bank')->sum('amount'),
                'card' => $payments->where('method', 'card')->sum('amount'),
                'credit' => $payments->where('method', 'credit')->sum('amount'),
            ],
            'payment_sources' => [
                'service' => $payments->where('source_type', 'service')->sum('amount'),
                'sales' => $payments->where('source_type', 'sales')->sum('amount'),
                'delivery' => $payments->where('source_type', 'delivery')->sum('amount'),
                'supplier' => $payments->where('source_type', 'supplier')->sum('amount'),
            ],
            'top_customers_count' => $payments->filter(function($p) { 
                return $p['customer_id'] !== null; 
            })->groupBy('customer_id')->count(),
            'top_customers' => $payments->filter(function($p) { 
                return $p['customer_id'] !== null; 
            })->groupBy('customer_id')->map(function ($customerPayments) {
                $customer = $customerPayments->first()['customer'];
                return [
                    'name' => $customer ? ($customer->FstNm . ' ' . $customer->LstNm) : 'Unknown',
                    'code' => $customer && isset($customer->AdrCd) ? $customer->AdrCd : 'N/A',
                    'total' => $customerPayments->sum('amount'),
                    'count' => $customerPayments->count(),
                ];
            })->sortByDesc('total')->take(10)->values(),
            'technician_performance' => $payments->filter(function($p) {
                return $p['source_type'] === 'service';
            })->groupBy(function ($payment) {
                if (isset($payment['serviceJob']) && $payment['serviceJob']) {
                    $job = $payment['serviceJob'];
                    if (is_object($job)) {
                        return $job->technician_name ?: (isset($job->technician) && $job->technician ? ($job->technician->first_name . ' ' . $job->technician->last_name) : 'Unassigned');
                    }
                }
                return 'Unassigned';
            })->map(function ($techPayments, $techName) {
                return [
                    'name' => $techName,
                    'total' => $techPayments->sum('amount'),
                    'count' => $techPayments->count(),
                ];
            })->sortByDesc('total')->values(),
        ];
    }
}
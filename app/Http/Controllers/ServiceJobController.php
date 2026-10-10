<?php

namespace App\Http\Controllers;

use App\Models\ServiceJob;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use App\Models\ServiceJobItem;
use App\Models\AccMas;
use App\Models\Address;
use App\Models\User;
use App\Models\Company;
use App\Models\ItemMaster;
use App\Models\ServiceCharge;
use App\Models\Purchase;
use App\Models\PurchaseDet;
use App\Models\SalesTransaction;
use App\Models\SalesTransactionItem;
use App\Models\CustomerPayment;
use App\Models\Brand;
use App\Models\ProductModel;
use App\Services\SmsService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

class ServiceJobController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('cashier.shift', only: ['index', 'create', 'store']),
        ];
    }
    public function index(Request $request)
    {
        if (!$request->user()->hasPermission('service_jobs.view')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view service jobs.');
        }

        $user = $request->user();

        $isTechnician = $user && $user->role && 
            !in_array($user->role->level, ['service_manager', 'company_admin', 'super_admin']) && (
            $user->user_type === 'technician' ||
            $user->role->level === 'technician' ||
            str_contains($user->role->slug, 'technician')
        );

        $query = ServiceJob::with(['customer', 'technician']);

        // Base Company Isolation
        if ($user->role_id !== 1) { // Not a Superadmin
            $query->where('company_code', $user->company_code);
        } else { // Superadmin
            $selectedCompany = session('selected_company');
            if ($selectedCompany) {
                $query->where('company_code', $selectedCompany);
            } else {
                $query->whereRaw('1 = 0');
            }
        }

        if ($request->has('filter') && $request->filter === 'my_jobs') {
            $query->where('assigned_technician_id', $user->id);
        } elseif ($isTechnician) {
            $query->where(function($q) use ($user) {
                $q->where(function($subQ) {
                    $subQ->where('status', 'pending')
                         ->whereNull('assigned_technician_id');
                })
                ->orWhere(function($subQ) use ($user) {
                    $subQ->where('assigned_technician_id', $user->id)
                         ->whereNotIn('status', ['completed', 'delivered', 'cancelled']);
                });
            });
        } else {
            if ($request->has('status') && $request->status !== '') {
                if ($request->status !== 'all') {
                    // When filtering by 'completed' AND a date is provided, also include
                    // 'delivered' jobs — they passed through completed and share the same
                    // actual_completion_date. Without this, delivered-after-completion
                    // jobs are hidden from the completion-date search.
                    if ($request->status === 'completed' &&
                        ($request->filled('start_date') || $request->filled('end_date'))) {
                        $query->where(function ($q) {
                            $q->where('status', 'completed')
                              ->orWhere('status', 'delivered');
                        });
                    } else {
                        $query->where('status', $request->status);
                    }
                }
            }
        }

        $query->latest();

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('job_number', 'like', "%{$search}%")
                  ->orWhere('customer_name', 'like', "%{$search}%")
                  ->orWhere('customer_phone', 'like', "%{$search}%")
                  ->orWhere('device_serial', 'like', "%{$search}%")
                  ->orWhere('device_barcode', 'like', "%{$search}%")
                  ->orWhere('device_brand', 'like', "%{$search}%")
                  ->orWhere('device_model', 'like', "%{$search}%")
                  ->orWhere('customer_address', 'like', "%{$search}%")
                  ->orWhere('technician_name', 'like', "%{$search}%")
                  ->orWhereHas('technician', function($tq) use ($search) {
                      $tq->where('first_name', 'like', "%{$search}%")
                         ->orWhere('last_name', 'like', "%{$search}%");
                  });
            });
        }

        if ($request->filled('technician_id') && $request->technician_id !== 'all') {
            $query->where('assigned_technician_id', $request->technician_id);
        }

        if ($request->filled('start_date') || $request->filled('end_date')) {
            $status = $request->status ?? 'all';
            $dateColumn = match($status) {
                'delivered' => 'delivered_date',
                'completed' => 'actual_completion_date',
                default      => 'received_date',
            };

            // If only one date is provided, default the other to the same date
            // so a single date selection filters to exactly that day.
            $startDate = $request->filled('start_date') ? $request->start_date : $request->end_date;
            $endDate   = $request->filled('end_date')   ? $request->end_date   : $request->start_date;

            $query->whereDate($dateColumn, '>=', $startDate)
                  ->whereDate($dateColumn, '<=', $endDate);
        }

        $jobs = $query->paginate(20)->withQueryString();

        // Stats query — mirrors the same filters as the main list (search, date, technician)
        // but does NOT apply a status filter so each card can count its own status.
        $statsQuery = ServiceJob::query();
        if ($user->role_id !== 1) {
            $statsQuery->where('company_code', $user->company_code);
        } else {
            $selectedCompany = session('selected_company');
            if ($selectedCompany) {
                $statsQuery->where('company_code', $selectedCompany);
            } else {
                 $statsQuery->whereRaw('1 = 0');
            }
        }

        // Apply the same technician access control as the main query (without status filter)
        if ($request->has('filter') && $request->filter === 'my_jobs') {
            $statsQuery->where('assigned_technician_id', $user->id);
        } elseif ($isTechnician) {
            $statsQuery->where(function($q) use ($user) {
                $q->where(function($subQ) {
                    $subQ->where('status', 'pending')
                         ->whereNull('assigned_technician_id');
                })
                ->orWhere(function($subQ) use ($user) {
                    $subQ->where('assigned_technician_id', $user->id)
                         ->whereNotIn('status', ['completed', 'delivered', 'cancelled']);
                });
            });
        }

        // Apply the same search filter
        if ($request->filled('search')) {
            $search = $request->search;
            $statsQuery->where(function($q) use ($search) {
                $q->where('job_number', 'like', "%{$search}%")
                  ->orWhere('customer_name', 'like', "%{$search}%")
                  ->orWhere('customer_phone', 'like', "%{$search}%")
                  ->orWhere('device_serial', 'like', "%{$search}%")
                  ->orWhere('device_barcode', 'like', "%{$search}%")
                  ->orWhere('device_brand', 'like', "%{$search}%")
                  ->orWhere('device_model', 'like', "%{$search}%")
                  ->orWhere('customer_address', 'like', "%{$search}%")
                  ->orWhere('technician_name', 'like', "%{$search}%")
                  ->orWhereHas('technician', function($tq) use ($search) {
                      $tq->where('first_name', 'like', "%{$search}%")
                         ->orWhere('last_name', 'like', "%{$search}%");
                  });
            });
        }

        // Apply the same technician filter
        if ($request->filled('technician_id') && $request->technician_id !== 'all') {
            $statsQuery->where('assigned_technician_id', $request->technician_id);
        }

        // Apply the same date filters (using the same smart date column logic)
        if ($request->filled('start_date') || $request->filled('end_date')) {
            $status = $request->status ?? 'all';
            $dateColumn = match($status) {
                'delivered' => 'delivered_date',
                'completed' => 'actual_completion_date',
                default      => 'received_date',
            };

            // If only one date is provided, default the other to the same date
            $startDate = $request->filled('start_date') ? $request->start_date : $request->end_date;
            $endDate   = $request->filled('end_date')   ? $request->end_date   : $request->start_date;

            $statsQuery->whereDate($dateColumn, '>=', $startDate)
                       ->whereDate($dateColumn, '<=', $endDate);
        }

        $totalAllJobs    = (clone $statsQuery)->count();
        $totalActiveJobs = (clone $statsQuery)->whereNotIn('status', ['completed', 'delivered', 'cancelled'])->count();
        $pendingCount    = (clone $statsQuery)->where('status', 'pending')->count();
        $completedCount  = (clone $statsQuery)->where('status', 'completed')->count();
        $deliveredCount  = (clone $statsQuery)->where('status', 'delivered')->count();
        $inProgressCount = (clone $statsQuery)->whereIn('status', ['in_progress', 'assigned', 'waiting_for_parts', 'quotation_received', 'quotation_generated'])->count();
        $cancelledCount  = (clone $statsQuery)->where('status', 'cancelled')->count();


        // Fetch technicians for the filter dropdown
        $techniciansQuery = \App\Models\User::whereHas('role', function($q) {
            $q->where('level', 'technician');
        })->where('company_code', $user->company_code)->orderBy('first_name');
        $technicians = $techniciansQuery->get(['id', 'first_name', 'last_name']);

        return Inertia::render('ServiceJobs/Index', [
            'jobs' => $jobs,
            'filters' => $request->only(['search', 'status', 'filter', 'start_date', 'end_date', 'technician_id']),
            'technicians' => $technicians,
            'statuses' => [
                'pending' => 'Pending',
                'assigned' => 'Assigned',
                'in_progress' => 'In Progress',
                'waiting_for_parts' => 'Waiting for Parts',
                'quotation_generated' => 'Quotation Generated',
                'completed' => 'Completed',
                'delivered' => 'Delivered',
                'cancelled' => 'Cancelled',
            ],
            'stats' => [
                'active_jobs'  => $totalActiveJobs,
                'total_jobs'   => $totalAllJobs,
                'pending'      => $pendingCount,
                'completed'    => $completedCount,
                'delivered'    => $deliveredCount,
                'in_progress'  => $inProgressCount,
                'cancelled'    => $cancelledCount,
            ],
        ]);
    }

    public function history(Request $request)
    {
        if (!$request->user()->hasPermission('service_jobs.view')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view service jobs.');
        }

        $user = $request->user();

        // eager load everything needed for a full history view
        $query = ServiceJob::with(['customer', 'technician', 'items', 'statusHistory.changedBy', 'createdBy']);

        // Base Company Isolation
        if ($user->role_id !== 1) {
            $query->where('company_code', $user->company_code);
        } else { // Superadmin
            $selectedCompany = session('selected_company');
            if ($selectedCompany) {
                $query->where('company_code', $selectedCompany);
            } else {
                $query->whereRaw('1 = 0');
            }
        }

        $query->latest();

        // Service Jobs are now company-wide. No section-level filtering in history.

        // generic search across multiple fields (job number, serial, barcode, customer, technician)
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('job_number', 'like', "%{$search}%")
                    ->orWhere('device_serial', 'like', "%{$search}%")
                    ->orWhere('device_barcode', 'like', "%{$search}%")
                    ->orWhere('device_brand', 'like', "%{$search}%")
                    ->orWhere('device_model', 'like', "%{$search}%")
                    ->orWhere('customer_name', 'like', "%{$search}%")
                    ->orWhere('customer_address', 'like', "%{$search}%")
                    ->orWhereHas('customer', function($q2) use ($search) {
                        $q2->where('AccNm', 'like', "%{$search}%");
                    })
                    ->orWhereHas('technician', function($q3) use ($search) {
                        $q3->where('first_name', 'like', "%{$search}%")
                           ->orWhere('last_name', 'like', "%{$search}%");
                    });
            });
        }

        // allow direct serial search param for exact match
        if ($request->filled('serial')) {
            $serial = $request->serial;
            $query->where(function($q) use ($serial) {
                $q->where('device_serial', $serial)
                  ->orWhere('device_barcode', $serial);
            });
        }

        // filter by technician id
        if ($request->filled('technician_id')) {
            $query->where('assigned_technician_id', $request->technician_id);
        }

        // filter by customer AccKy
        if ($request->filled('customer_accky')) {
            $query->where('AccKy', $request->customer_accky);
        }

        $perPage = $request->input('per_page', 20);
        $jobs = $query->paginate($perPage)->withQueryString();

        // get active technicians for filter dropdown - scoped to company
        $technicians = User::whereHas('role', function($q) {
                $q->where('level', 'technician')
                  ->orWhere('slug', 'like', '%technician%');
            })
            ->where('is_active', true)
            ->when($user->role_id !== 1, function($q) use ($user) {
                return $q->where('company_code', $user->company_code);
            }, function($q) {
                $selectedCompany = session('selected_company');
                if ($selectedCompany) {
                    $q->where('company_code', $selectedCompany);
                }
                return $q;
            })
            ->select('id', 'first_name', 'last_name')
            ->get();

        return Inertia::render('ServiceJobs/History', [
            'jobs' => $jobs,
            'filters' => $request->only(['search', 'serial', 'technician_id', 'customer_accky', 'per_page']),
            'technicians' => $technicians,
            'auth' => [

                'user' => auth()->user(),

            ],
        ]);
    }

    public function create()
    {
        if (!Auth::user()->hasPermission('service_jobs.create')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to create service jobs.');
        }

        $user = Auth::user();

        // Get customers with their address information - scoped to company
        $query = AccMas::where('AccTyp', 'CUSTOMER');
        
        if ($user->role_id !== 1) {
            $query->where('company_code', $user->company_code);
        } else { // Superadmin
            $selectedCompany = session('selected_company');
            if ($selectedCompany) {
                $query->where('company_code', $selectedCompany);
            }
        }

        $customers = $query->select('AccKy', 'AccCd', 'AccNm', 'CurBal', 'CrLmt')
            ->with(['addresses' => function($query) {
                $query->where('AdrTypKy', 1)->select('AccKy', 'TP1', 'Email', 'Address', 'City');
            }])
            ->get()
            ->map(function($customer) {
                $address = $customer->addresses->first();
                return [
                    'AccKy' => $customer->AccKy,
                    'AccCd' => $customer->AccCd,
                    'AccNm' => $customer->AccNm,
                    'CurBal' => $customer->CurBal,
                    'CrLmt' => $customer->CrLmt,
                    'phone' => $address ? $address->TP1 : null,
                    'email' => $address ? $address->Email : null,
                    'address' => $address ? $address->Address : null,
                    'city' => $address ? $address->City : null,
                ];
            });

        return Inertia::render('ServiceJobs/Create', [
            'customers' => $customers,
            'technicians' => User::whereHas('role', function($q) {
                $q->where('level', 'technician')
                  ->orWhere('slug', 'like', '%technician%');
            })
            ->where('is_active', true)
            ->when($user->role_id !== 1, fn($q) => $q->where('company_code', $user->company_code), function($q) {
                $selectedCompany = session('selected_company');
                if ($selectedCompany) {
                    $q->where('company_code', $selectedCompany);
                }
                return $q;
            })
            ->select('id', 'first_name', 'last_name', 'phone', 'email')
            ->get(),
            'serviceCharges' => ServiceCharge::active()
                ->when($user->role_id !== 1, fn($q) => $q->where('company_code', $user->company_code), function($q) {
                    $selectedCompany = session('selected_company');
                    if ($selectedCompany) {
                        $q->where('company_code', $selectedCompany);
                    }
                    return $q;
                })->get(),
        ]);
    }

    public function store(Request $request)
    {
        if (!$request->user()->hasPermission('service_jobs.create')) {
             return redirect()->back()->with('error', 'Unauthorized. You do not have permission to create service jobs.');
        }

        // Decode items from JSON string to array
        if ($request->has('items') && is_string($request->input('items'))) {
            $request->merge(['items' => json_decode($request->input('items'), true)]);
        }

        /** @var User|null $authUser */
        $authUser = Auth::user();

        $customerPhoneRules = ['required', 'string', 'digits:10'];
        if ($request->input('is_existing_customer') === '0') {
            $customerPhoneRules[] = \Illuminate\Validation\Rule::unique('address', 'TP1')->where(function ($query) use ($authUser) {
                return $query->where('company_code', $authUser ? $authUser->company_code : null);
            });
        }

        $validated = $request->validate([
            'AccKy' => 'nullable|integer|exists:acc_mas,AccKy',
            'customer_name' => 'required|string|max:100',
            'customer_phone' => $customerPhoneRules,
            'customer_email' => 'nullable|email|max:100',
            'customer_address' => 'nullable|string|max:255',
            'device_model' => 'nullable|string|max:100',
            'device_brand' => 'nullable|string|max:100',
            'device_warranty' => 'nullable|string|max:50',
            'device_serial' => 'nullable|string|max:100',
            'device_barcode' => 'nullable|string|max:100',
            'problem_description' => 'required|string',
            'received_date' => 'required|date',
            'estimated_completion_date' => 'nullable|date',
            'assigned_technician_id' => 'nullable|integer|exists:users,id',
            'advanced_payment' => 'nullable|numeric|min:0',
            'items' => 'nullable|array',
            'items.*.item_type' => 'required|in:part,service_charge,other',
            'items.*.ItmKy' => 'nullable|string',
            'items.*.item_code' => 'nullable|string',
            'items.*.item_name' => 'required|string',
            'items.*.barcode' => 'nullable|string',
            'items.*.quantity' => 'required|numeric|min:0.0001',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.description' => 'nullable|string',
            'items.*.batch_no' => 'nullable|string',
            'is_existing_customer' => 'nullable|string',
        ], [
            'customer_phone.unique' => 'This phone number is already registered to an existing customer in your company.',
            'customer_phone.digits' => 'Phone number must be exactly 10 digits.',
        ]);

        if (!empty($validated['device_serial']) || !empty($validated['device_barcode'])) {
            $duplicateQuery = ServiceJob::where(function ($query) {
                $query->whereIn('status', ['pending', 'assigned', 'in_progress', 'waiting_for_parts', 'quotation_received'])
                      ->orWhere(function ($query) {
                          $query->where('status', 'completed')
                                ->whereNull('delivered_date');
                      });
            });

            if (!empty($validated['device_serial'])) {
                $duplicateQuery->where('device_serial', $validated['device_serial']);
            } else {
                $duplicateQuery->where('device_barcode', $validated['device_barcode'])
                    ->where(function ($q) {
                        $q->whereNull('device_serial')
                          ->orWhere('device_serial', '');
                    });
            }

            if ($authUser->role_id !== 1) {
                $duplicateQuery->where('company_code', $authUser->company_code);
            } else {
                $selectedCompany = session('selected_company');
                if ($selectedCompany) {
                    $duplicateQuery->where('company_code', $selectedCompany);
                }
            }

            $existingActiveJob = $duplicateQuery->first();
            if ($existingActiveJob) {
                $errorMessage = ($existingActiveJob->status === 'completed' && !$existingActiveJob->delivered_date)
                    ? 'This device already has a completed service job that has not yet been delivered and cannot be registered for a new service job.'
                    : 'This device is already under service and cannot be registered for a new service job.';

                return back()->withErrors([
                    'device_serial' => $errorMessage,
                    'device_barcode' => $errorMessage,
                ])->withInput();
            }
        }

        DB::beginTransaction();

        try {
            // Allow multiple service jobs for the same device
            // A customer can bring the same device multiple times for different issues
            // (e.g., first for screen repair, then later for battery replacement)
            // No duplicate checking needed here - each service job is independent

            $isExistingCustomer = $request->input('is_existing_customer') === '1';
            
            // Check if device exists with serial/barcode to auto-find customer
            $deviceSearchResult = $this->findCustomerByDevice($validated);
            
            if ($deviceSearchResult && empty($validated['AccKy'])) {
                $validated['AccKy'] = $deviceSearchResult['customer']->AccKy;
                $validated = array_merge($validated, $deviceSearchResult['details']);
                $isExistingCustomer = true;
            }

            // Handle customer logic
            if (!empty($validated['AccKy']) && $isExistingCustomer) {
                // Existing customer - just verify it exists and use the AccKy
                // Do NOT create or update customer records
                $customer = AccMas::where('AccKy', $validated['AccKy'])->first();
                
                if (!$customer) {
                    throw new \Exception('Selected customer not found in database.');
                }
                
                // Get customer details for the service job record. we want to fall back
                // to the database value only when the incoming request did not supply
                // its own value (e.g. an empty phone field). this allows the user to
                // correct or add a phone number as part of the form submission.
                $customerData = $this->getCustomerDataForJob($validated['AccKy']);
                if ($customerData) {
                    // use request value if non-empty, otherwise fallback to DB
                    if (empty($validated['customer_name'])) {
                        $validated['customer_name'] = $customerData['customer_name'] ?? '';
                    }
                    if (empty($validated['customer_phone'])) {
                        $validated['customer_phone'] = $customerData['customer_phone'] ?? '';
                    }
                    if (empty($validated['customer_email'])) {
                        $validated['customer_email'] = $customerData['customer_email'] ?? '';
                    }
                    if (empty($validated['customer_address'])) {
                        $validated['customer_address'] = $customerData['customer_address'] ?? '';
                    }
                }
                
                // if the form supplied updated contact details (phone/email/address)
                // apply them to the customer's latest address record so that the
                // master data stays in sync. this is especially important when the
                // customer was identified via a device serial and had no phone
                // previously – the user is allowed to enter one on the service‑job
                // form and we persist it here.
                $this->updateCustomerAddress($validated, $authUser);

                Log::info("Using existing customer for service job", [
                    'AccKy' => $validated['AccKy'],
                    'customer_name' => $validated['customer_name']
                ]);
            } elseif (empty($validated['AccKy']) || !$isExistingCustomer) {
                // New customer - create customer record
                $customer = $this->createNewCustomer($validated, $authUser);
                $validated['AccKy'] = $customer->AccKy;
                
                Log::info("Created new customer for service job", [
                    'AccKy' => $validated['AccKy'],
                    'customer_name' => $validated['customer_name']
                ]);
            }

            // We set created_by/status now. Job number will be assigned based on the actual ID after creation.
            $validated['created_by'] = $authUser?->id ?? null;
            $validated['status'] = 'pending'; // Set initial status

            // Check if customer is VAT registered
            $customerAccMas = AccMas::where('AccKy', $validated['AccKy'])->first();
            $isVatRegistered = $customerAccMas && $customerAccMas->fVATRegistered;
            
            if ($isVatRegistered) {
                $validated['is_vat_invoice'] = true;
                $validated['customer_vat_no'] = $customerAccMas->VATNo;
                
                // Get company VAT info
                $company = Company::where('company_code', $authUser?->company_code)->first();
                if ($company) {
                    $validated['company_vat_no'] = $company->vat_no;
                    $validated['vat_rate'] = $company->vat_rate ?? 15.00; // Default 15% if not set
                }
            } else {
                $validated['is_vat_invoice'] = false;
                $validated['customer_vat_no'] = null;
                $validated['company_vat_no'] = null;
                $validated['vat_rate'] = null;
            }

            // Ensure company and section codes are saved
            if ($authUser->role_id === 1) {
                $validated['company_code'] = session('selected_company');
            } else {
                $validated['company_code'] = $authUser?->company_code;
            }
            // Removed section_code saving as per user request. Service jobs are company-wide.

            $serviceJob = ServiceJob::create($validated);

            // Ensure job number is always in sync with the actual created ID (prevents race conditions)
            $serviceJobNumber = 'SJ' . str_pad($serviceJob->id, 6, '0', STR_PAD_LEFT);
            if ($serviceJob->job_number !== $serviceJobNumber) {
                $serviceJob->update(['job_number' => $serviceJobNumber]);
            }

            // Create items with VAT information
            if (!empty($validated['items'])) {
                foreach ($validated['items'] as $item) {
                    // Check if item has VAT from ItemMaster or PurchaseDet
                    $vatInclusive = false;
                    $vatRate = 0;
                    
                    if ($isVatRegistered) {
                        if (!empty($item['ItmKy'])) {
                            // Check ItemMaster for VAT info
                            $itemMaster = ItemMaster::where('ItmKy', $item['ItmKy'])->first();
                            if ($itemMaster && $itemMaster->VATItem) {
                                $vatInclusive = true;
                                $vatRate = $validated['vat_rate'];
                            }
                        }
                        
                        // Items from purchase_det always have VAT included
                        if ($item['item_type'] === 'part') {
                            $purchaseDet = PurchaseDet::where('serial_number', $validated['device_serial'] ?? '')
                                ->where('flnAct', true)
                                ->first();
                            if ($purchaseDet && $purchaseDet->VATItem) {
                                $vatInclusive = true;
                                $vatRate = $validated['vat_rate'];
                            }
                        }
                    }
                    
                    $item['vat_inclusive'] = $vatInclusive;
                    $item['vat_rate'] = $vatRate;
                    $item['cost_price'] = $item['cost_price'] ?? 0;
                    
                    $serviceJob->items()->create($item);
                }
            }

            // Update totals
            $serviceJob->updateTotals();

            // Sync advance payment if any
            $this->syncAdvancePayment($serviceJob);

            // Status history is automatically created by model event

            DB::commit();

            // Send SMS notification to customer
            try {
                $smsService = app(SmsService::class);
                $smsResult = $smsService->sendJobCreationNotification(
                    $serviceJob->customer_phone,
                    $serviceJob->job_number
                );

                if (!$smsResult['success']) {
                    Log::warning('Failed to send SMS notification for service job: ' . $serviceJob->job_number);
                }
            } catch (\Exception $e) {
                Log::error('SMS sending error for service job ' . $serviceJob->job_number . ': ' . $e->getMessage());
                // Don't fail the entire transaction for SMS errors
            }

            // Redirect to the show page and include a query param so the frontend
            // can open the printable receipt automatically.
            $showUrl = route('service-jobs.show', $serviceJob) . '?print=1';
            return redirect()->to($showUrl)
                ->with('success', 'Service job and invoice created successfully. SMS notification sent to customer.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Service job creation error: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Failed to create service job: ' . $e->getMessage()]);
        }
    }

    private function findCustomerByDevice(array $data)
    {
        if (!empty($data['device_serial']) || !empty($data['device_barcode'])) {
            // Serial number is the unique identity for printer devices.
            // Do not fall back to barcode matching when serial is present.
            if (!empty($data['device_serial'])) {
                $previousJob = ServiceJob::whereNotNull('AccKy')
                    ->where('device_serial', $data['device_serial'])
                    ->orderBy('created_at', 'desc')
                    ->first();
            } else {
                // Barcode-only matching is allowed only for non-serialized records.
                // This avoids cross-linking different devices that share the same barcode.
                $previousJob = ServiceJob::whereNotNull('AccKy')
                    ->where('device_barcode', $data['device_barcode'])
                    ->where(function ($query) {
                        $query->whereNull('device_serial')
                            ->orWhere('device_serial', '');
                    })
                    ->orderBy('created_at', 'desc')
                    ->first();
            }
            
            if ($previousJob) {
                // Get customer details
                $customer = AccMas::where('AccKy', $previousJob->AccKy)->first();
                $address = Address::where('AccKy', $previousJob->AccKy)->first();
                
                if ($customer) {
                    return [
                        'customer' => $customer,
                        'details' => [
                            'customer_name' => $customer->AccNm,
                            'customer_phone' => $address->TP1 ?? '',
                            'customer_email' => $address->Email ?? '',
                            'customer_address' => $address->Address ?? '',
                            'device_brand' => $previousJob->device_brand ?? '',
                            'device_warranty' => $previousJob->device_warranty ?? '',
                        ]
                    ];
                }
            }
        }
        
        return null;
    }

    private function createNewCustomer(array $data, ?User $authUser = null)
    {
        $companyCode = ($authUser && $authUser->role_id === 1) ? session('selected_company') : ($authUser?->company_code ?? null);
        
        $sequenceName = "customer_code_{$companyCode}";
        
        do {
            $nextVal = \App\Models\Sequence::incrementSequence($sequenceName, function() use ($companyCode) {
                $maxNum = \App\Models\Customer::where('AdrCd', 'LIKE', 'CUS%')
                    ->where('company_code', $companyCode)
                    ->selectRaw('MAX(CAST(SUBSTRING(AdrCd, 4) AS UNSIGNED)) as max_num')
                    ->value('max_num');
                return $maxNum ? (int)$maxNum : 0;
            });
            $customerCode = 'CUS' . str_pad($nextVal, 3, '0', STR_PAD_LEFT);
            
            $exists = \App\Models\Customer::where('AdrCd', $customerCode)
                ->where('company_code', $companyCode)
                ->exists();
        } while ($exists);

        // Create customer in acc_mas
        $customer = AccMas::create([
            'AccCd' => $customerCode,
            'AccNm' => $data['customer_name'],
            'AccTyp' => 'CUSTOMER',
            'Status' => 'A',
            'CurBal' => 0,
            'CrLmt' => 0,
            'company_code' => ($authUser && $authUser->role_id === 1) ? session('selected_company') : ($authUser?->company_code ?? null),
            'section_code' => $authUser?->section_code ?? null,
        ]);

        // Create address record
        Address::create([
            'AccKy' => $customer->AccKy,
            'AdrCd' => $customerCode,
            'CtPerson' => $data['customer_name'],
            'FstNm' => $data['customer_name'],
            'TP1' => $data['customer_phone'],
            'Email' => $data['customer_email'],
            'Address' => $data['customer_address'],
            'AdrTypKy' => 1, // Assuming 1 is for customer address
            'Status' => 'A', // Explicitly set active status
            'company_code' => ($authUser && $authUser->role_id === 1) ? session('selected_company') : ($authUser?->company_code ?? null),
            'section_code' => $authUser?->section_code ?? null,
        ]);

        return $customer;
    }

    private function getCustomerDataForJob($accKy)
    {
        $customer = AccMas::where('AccKy', $accKy)->first();
        $address = Address::where('AccKy', $accKy)->orderBy('AdrKy', 'desc')->first();

        if ($customer) {
            return [
                'customer_name' => $customer->AccNm,
                'customer_phone' => $address->TP1 ?? '',
                'customer_email' => $address->Email ?? '',
                'customer_address' => $address->Address ?? '',
            ];
        }

        return null;
    }

    private function updateCustomerAddress(array $data, ?User $authUser = null)
    {
        $address = Address::where('AccKy', $data['AccKy'])
            ->orderBy('AdrKy', 'desc')
            ->first();

        if ($address) {
            $address->update([
                'CtPerson' => $data['customer_name'] ?? $address->CtPerson,
                'FstNm' => $data['customer_name'] ?? $address->FstNm,
                'TP1' => $data['customer_phone'] ?? $address->TP1,
                'Email' => $data['customer_email'] ?? $address->Email,
                'Address' => $data['customer_address'] ?? $address->Address,
            ]);
        } else {
            // Create address if doesn't exist
            $customer = AccMas::find($data['AccKy']);
            Address::create([
                'AccKy' => $data['AccKy'],
                'AdrCd' => $customer ? $customer->AccCd : null,
                'CtPerson' => $data['customer_name'],
                'FstNm' => $data['customer_name'],
                'TP1' => $data['customer_phone'],
                'Email' => $data['customer_email'],
                'Address' => $data['customer_address'],
                'AdrTypKy' => 1,
                'Status' => 'A', // Explicitly set active status
                'company_code' => ($authUser && $authUser->role_id === 1) ? session('selected_company') : ($authUser?->company_code ?? null),
                'section_code' => $authUser?->section_code ?? null,
            ]);
        }
    }

    private function generateInvoiceNo($type = 'item')
    {
        $user = Auth::user();
        $companyPrefix = '';
        $sequenceKey = 'DEFAULT'; // Default key for sequence
        
        // Determine company prefix and sequence key
        if ($user && $user->company_code) {
            $code = strtoupper($user->company_code);
            if (str_starts_with($code, 'VIS')) {
                $companyPrefix = 'VIS-';
                $sequenceKey = 'VIS';
            } elseif (str_starts_with($code, 'MAL')) {
                $companyPrefix = 'MAL-';
                $sequenceKey = 'MAL';
            }
        }

        $typePrefix = match($type) {
            'printer' => 'PRI-',
            'item' => 'ITM-',
            default => 'INV-'
        };
        
        $prefix = $companyPrefix . $typePrefix;

        // Use strictly separate sequence names based on the prefix key (VIS/MAL)
        $sequenceName = 'sales_' . $sequenceKey . '_' . $type;
        
        // Use generic sequence generator with initialization capability
        $nextValue = \App\Models\Sequence::incrementSequence($sequenceName, function () use ($prefix) {
            // Initializer: Find the max existing invoice number to continue from if sequence is new
            $lastSale = SalesTransaction::where('invoice_no', 'like', $prefix . '%')
                ->orderByRaw('CAST(SUBSTRING(invoice_no, LENGTH(?)+1) AS UNSIGNED) DESC', [$prefix])
                ->first();
                
            $lastServiceJob = ServiceJob::where('invoice_number', 'like', $prefix . '%')
                ->orderByRaw('CAST(SUBSTRING(invoice_number, LENGTH(?)+1) AS UNSIGNED) DESC', [$prefix])
                ->first();

            $maxSaleNum = 0;
            $maxJobNum = 0;
            
            if ($lastSale) {
                $numericPart = substr($lastSale->invoice_no, strlen($prefix));
                $maxSaleNum = is_numeric($numericPart) ? (int)$numericPart : 0;
            }
            if ($lastServiceJob) {
                $numericPart = substr($lastServiceJob->invoice_number, strlen($prefix));
                $maxJobNum = is_numeric($numericPart) ? (int)$numericPart : 0;
            }
            
            return max($maxSaleNum, $maxJobNum);
        });

        return $prefix . str_pad($nextValue, 6, '0', STR_PAD_LEFT);
    }

    private function createInvoiceForServiceJob(ServiceJob $serviceJob, ?User $authUser = null): SalesTransaction
    {
        // Generate invoice number
        $invoiceNumber = $this->generateInvoiceNo();

        // Calculate totals
        $subtotal = 0;
        foreach ($serviceJob->items as $item) {
            $subtotal += $item->quantity * $item->unit_price;
        }

        $taxAmount = 0; // You can add tax calculation logic here if needed
        $discountAmount = 0; // You can add discount logic here if needed
        $totalAmount = $subtotal + $taxAmount - $discountAmount;

        // Get customer details
        $customer = AccMas::where('AccKy', $serviceJob->AccKy)->first();

        // Create the sales transaction (invoice)
        $invoice = SalesTransaction::create([
            'invoice_no' => $invoiceNumber,
            'transaction_date' => now(),
            'customer_code' => $customer ? $customer->AccCd : null,
            'customer_name' => $serviceJob->customer_name,
            'company_code' => $authUser?->company_code ?? 'DEFAULT',
            'section_code' => $authUser?->section_code ?? 'DEFAULT',
            'cashier_id' => $authUser?->id ?? null,
            'customer_id' => $serviceJob->AccKy,
            'subtotal' => $subtotal,
            'discount_amount' => $discountAmount,
            'tax_amount' => $taxAmount,
            'total_amount' => $totalAmount,
            'status' => 'pending', // Service job invoices start as pending
            'notes' => "Service Job: {$serviceJob->job_number} - {$serviceJob->device_brand} {$serviceJob->device_model}",
        ]);

        // Create invoice items
        $lineNumber = 1;
        foreach ($serviceJob->items as $item) {
            SalesTransactionItem::create([
                'sales_transaction_id' => $invoice->id,
                'item_code' => $item->item_code,
                'unit_price' => $item->unit_price,
                'cost_price' => $item->cost_price ?? 0,
                'batch_no' => $item->batch_no,
                'quantity' => $item->quantity,
                'discount_amount' => 0,
                'tax_amount' => 0,
                'line_total' => $item->total_price ?? ($item->quantity * $item->unit_price),
                'line_subtotal' => $item->quantity * $item->unit_price,
                'line_number' => $lineNumber++,
                'company_code' => $authUser?->company_code ?? 'DEFAULT',
                'section_code' => $authUser?->section_code ?? 'DEFAULT',
                'product_id' => $item->ItmKy,
                'price_type' => 'retail',
            ]);
        }

        // Update service job with invoice reference
        $serviceJob->update([
            'invoice_number' => $invoiceNumber,
            'invoice_date' => now(),
        ]);

        return $invoice;
    }

    /**
     * Keep a CustomerPayment record in sync with the service job's advanced payment.
     */
    protected function syncAdvancePayment(ServiceJob $job)
    {
        $amount = (float) $job->advanced_payment;
        $existing = CustomerPayment::where('service_job_id', $job->id)
                    ->where('notes', 'like', 'Service advance%')
                    ->first();

        // Resolve Address ID (AdrKy) from Account ID (AccKy)
        $adrKy = $job->AccKy; // fallback if address not found
        if ($job->AccKy) {
            $address = Address::where('AccKy', $job->AccKy)->orderBy('AdrTypKy', 'asc')->first();
            if ($address) {
                $adrKy = $address->AdrKy;
            }
        }

        if ($amount > 0) {
            if ($existing) {
                $existing->customer_id = $adrKy;
                if ((float) $existing->amount !== $amount || $existing->isDirty('customer_id')) {
                    $oldAmount = (float) $existing->amount;
                    $existing->amount = $amount;
                    $existing->date = $job->received_date ?? now()->toDateString();
                    $existing->save();
                    
                    // Sync FAT Update
                    $fat = \App\Models\FinanceAccountTransaction::where('source_type', 'Service Advanced payment')->where('source_id', $existing->id)->first();
                    if ($fat) {
                        $diff = $amount - $oldAmount;
                        $fat->amount = $amount;
                        $fat->date = $existing->date;
                        $fat->reference = $job->job_number;
                        $fat->save();
                        
                        $mainCashAccount = \App\Models\FinanceAccount::find($fat->finance_account_id);
                        if ($mainCashAccount) {
                            if (in_array($mainCashAccount->main_category->value ?? 'assets', ['liabilities', 'revenue', 'equity'])) {
                                $mainCashAccount->current_balance -= $diff;
                            } else {
                                $mainCashAccount->current_balance += $diff;
                            }
                            $mainCashAccount->save();
                        }
                    } else {
                        // Create FAT if missing
                        $this->createFatForAdvancePayment($existing, $job, $amount);
                    }
                }
            } else {
                $payment = CustomerPayment::create([
                    'customer_id' => $adrKy,
                    'customer_code' => $job->customer_code ?? '',
                    'collected_by' => $job->created_by, // User who created the service job
                    'service_job_id' => $job->id,
                    'amount' => $amount,
                    'date' => $job->received_date ?? now()->toDateString(),
                    'method' => 'cash',
                    'notes' => 'Service advance payment ' . $job->job_number,
                    'company_code' => $job->company_code,
                ]);
                $this->createFatForAdvancePayment($payment, $job, $amount);
            }
        } elseif ($existing) {
            // remove any previously created advance payment if amount now zero
            $fat = \App\Models\FinanceAccountTransaction::where('source_type', 'Service Advanced payment')->where('source_id', $existing->id)->first();
            if ($fat) {
                $mainCashAccount = \App\Models\FinanceAccount::find($fat->finance_account_id);
                if ($mainCashAccount) {
                    if (in_array($mainCashAccount->main_category->value ?? 'assets', ['liabilities', 'revenue', 'equity'])) {
                        $mainCashAccount->current_balance += $fat->amount; // Reversing the debit
                    } else {
                        $mainCashAccount->current_balance -= $fat->amount; // Reversing the debit
                    }
                    $mainCashAccount->save();
                }
                $fat->delete();
            }
            $existing->delete();
        }
    }

    protected function createFatForAdvancePayment($payment, $job, $amount) {
        $accMas = \App\Models\AccMas::find($job->AccKy);
        $companyCode = $accMas->company_code ?? request()->user()->company_code ?? null;
        $sectionCode = $job->section_code ?? request()->user()->section_code ?? null;
        if ($companyCode) {
            $mainCashAccount = \App\Models\FinanceAccount::where('account_name', 'like', '%Cashier Sales%')
                ->where('section_code', $sectionCode)
                ->first() ?? \App\Models\FinanceAccount::find(40);
                
            if ($mainCashAccount) {
                if (in_array($mainCashAccount->main_category->value ?? 'assets', ['liabilities', 'revenue', 'equity'])) {
                    $mainCashAccount->current_balance -= (float) $amount; // debit decreases liab/rev
                } else {
                    $mainCashAccount->current_balance += (float) $amount; // debit increases asset
                }
                $mainCashAccount->save();
                
                \App\Models\FinanceAccountTransaction::create([
                    'finance_account_id' => $mainCashAccount->id,
                    'date' => $job->received_date ?? now()->toDateString(),
                    'source_type' => 'Service Advanced payment',
                    'source_id' => $payment->id,
                    'description' => 'Service advance payment (Service Job: ' . $job->job_number . ')',
                    'method' => 'cash',
                    'type' => 'debit',
                    'amount' => (float) $amount,
                    'reference' => $job->job_number,
                ]);
            }
        }
    }

    public function show(ServiceJob $serviceJob)
    {
        if (!Auth::user()->hasPermission('service_jobs.view')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view service jobs.');
        }

        // Authorization check for superadmin/company isolation
        $user = Auth::user();
        if ($user->role_id === 1) {
            $selectedCompany = session('selected_company');
            if ($selectedCompany && $serviceJob->company_code !== $selectedCompany) {
                return redirect()->route('service-jobs.index')->with('error', 'Unauthorized access to this service job.');
            }
        } else if ($serviceJob->company_code !== $user->company_code) {
            return redirect()->route('service-jobs.index')->with('error', 'Unauthorized access to this service job.');
        }

        $serviceJob->load([
            'items',
            'customer.addresses',
            'technician',
            'statusHistory.changedBy',
            'createdBy',
            'payments',
            'quotations.createdBy',
            'photos',
            'messages.sender'
        ]);

        return Inertia::render('ServiceJobs/Show', [
            'job' => $serviceJob,
            'items' => $serviceJob->items,
            'statusHistory' => $serviceJob->statusHistory,
            'technicians' => User::whereHas('role', function($q) {
                $q->where('level', 'technician')
                  ->orWhere('slug', 'like', '%technician%');
            })->where('is_active', true)
            ->when(strtolower($user->role->level ?? '') === 'technician' || str_contains(strtolower($user->role->slug ?? ''), 'technician'), function ($query) use ($user) {
                $query->where('id', $user->id);
            })
            ->select('id', 'first_name', 'last_name', 'phone', 'email')
            ->get(),
            'serviceCharges' => ServiceCharge::active()->get(),
        ]);
    }

    public function generateInvoice(ServiceJob $serviceJob)
    {
        if (!Auth::user()->hasPermission('service_jobs.view')) {
             return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view service jobs.');
        }

        // Check if job has items
        if ($serviceJob->items()->count() === 0) {
            return back()->with('error', 'Cannot generate invoice for a job with no items.');
        }

        if (empty($serviceJob->invoice_number)) {
            $serviceJob->invoice_number = $this->generateInvoiceNo();
            $serviceJob->invoice_date = \Illuminate\Support\Carbon::now();
            $serviceJob->save();
        }

        $serviceJob->load(['items', 'customer', 'technician', 'payments']);
        
        $company = Company::where('company_code', auth()->user()->company_code)->first();
        $company = $company ?: Company::first();

        $outstandingBalance = 0;
        if ($serviceJob->AccKy) {
            $customerInfo = \App\Models\Customer::where('AccKy', $serviceJob->AccKy)->first();
            if ($customerInfo) {
                $outstandingBalance = $customerInfo->calculateOutstandingBalance();
            }
        }

        return view('service_jobs.invoice', [
            'job' => $serviceJob,
            'company' => $company,
            'logoBase64' => $this->getCompanyLogoBase64($company),
            'outstandingBalance' => $outstandingBalance,
        ]);
    }

    public function generateReceipt(ServiceJob $serviceJob)
    {
        if (!Auth::user()->hasPermission('service_jobs.view')) {
             return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view service jobs.');
        }

        $serviceJob->load(['customer', 'technician']);
        $company = Company::where('company_code', auth()->user()->company_code)->first();
        $company = $company ?: Company::first();

        return view('service_jobs.receipt', [
            'job' => $serviceJob,
            'company' => $company,
            'logoBase64' => $this->getCompanyLogoBase64($company),
        ]);
    }

    public function generatePartsReceipt(ServiceJob $serviceJob)
    {
        if (!Auth::user()->hasPermission('service_jobs.view')) {
             return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view service jobs.');
        }

        $serviceJob->load(['customer', 'technician', 'items' => function($query) {
            $query->where('item_type', 'part');
        }]);
        
        $company = Company::where('company_code', auth()->user()->company_code)->first();
        $company = $company ?: Company::first();

        return view('service_jobs.parts-receipt', [
            'job' => $serviceJob,
            'company' => $company,
            'logoBase64' => $this->getCompanyLogoBase64($company),
        ]);
    }

    public function destroy(ServiceJob $serviceJob)
    {
        if (!Auth::user()->hasPermission('service_jobs.delete')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to delete service jobs.');
        }

        // Authorization check
        $user = Auth::user();
        if ($user->role_id === 1) {
            $selectedCompany = session('selected_company');
            if ($selectedCompany && $serviceJob->company_code !== $selectedCompany) {
                return redirect()->back()->with('error', 'Unauthorized access.');
            }
        } else if ($serviceJob->company_code !== $user->company_code) {
            return redirect()->back()->with('error', 'Unauthorized access.');
        }

        $serviceJob->delete();
        
        return redirect()->route('service-jobs.index')
            ->with('success', 'Service job deleted successfully.');
    }

    public function addItem(Request $request, ServiceJob $serviceJob)
    {
        if (!$request->user()->hasPermission('service_jobs.edit')) {
             return redirect()->back()->with('error', 'Unauthorized. You do not have permission to edit service jobs.');
        }

        $validated = $request->validate([
            'item_type' => 'required|in:part,service_charge,other',
            'ItmKy' => 'nullable|string',
            'item_code' => 'nullable|string',
            'item_name' => 'required|string',
            'batch_no' => 'required_if:item_type,part|string',
            'serial_number' => 'nullable|string',
            'brand' => 'nullable|string',
            'model' => 'nullable|string',
            'barcode' => 'nullable|string',
            'quantity' => 'required|numeric|min:0.0001',
            'unit_price' => 'required|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
            'vat_inclusive' => 'nullable|boolean',
            'source' => 'nullable|string|in:itemmaster,purchase_det',
        ]);

        DB::beginTransaction();
        try {
            // For parts, deduct stock from the Service section (VIS-SEC-001)
            if ($validated['item_type'] === 'part' && !empty($validated['ItmKy'])) {
                // Always use Shop section for stock deduction, not user's current section
                $serviceSectionCode = 'VIS-SEC-002';
                $batchNo = $validated['batch_no'] ?? null;
                $serialNumber = $validated['serial_number'] ?? null;
                
                // Check available stock first
                $availableStock = $this->getAvailableStock(
                    $validated['ItmKy'],
                    $serviceSectionCode,
                    $batchNo,
                    $serialNumber
                );
                
                if ($availableStock < $validated['quantity']) {
                    DB::rollBack();
                    return back()->withErrors([
                        'quantity' => "Insufficient stock. Available: {$availableStock}"
                    ]);
                }
                
                // Deduct stock
                $this->deductServiceJobStock(
                    $validated['ItmKy'],
                    $validated['quantity'],
                    $serviceSectionCode,
                    'VIS-SEC-001',
                    $batchNo,
                    $serviceJob->id,
                    $serialNumber
                );
                
                Log::info('Stock deducted for service job item', [
                    'service_job_id' => $serviceJob->id,
                    'item_ky' => $validated['ItmKy'],
                    'quantity' => $validated['quantity'],
                    'batch_no' => $batchNo,
                    'serial_number' => $serialNumber,
                ]);
            }
            
            // Store unit discount for calculations, but save the total discount in the database
            $unitDiscount = isset($validated['discount_amount']) ? (float) $validated['discount_amount'] : 0;

            // Check if same item already exists in the service job
            $query = $serviceJob->items()
                ->where('item_type', $validated['item_type'])
                ->where('item_name', $validated['item_name']);
                
            if (!empty($validated['ItmKy'])) {
                $query->where('ItmKy', $validated['ItmKy']);
            } else {
                $query->whereNull('ItmKy');
            }
            
            if (!empty($validated['batch_no'])) {
                $query->where('batch_no', $validated['batch_no']);
            } else {
                $query->where(function($q) {
                    $q->whereNull('batch_no')->orWhere('batch_no', '');
                });
            }

            if (!empty($validated['serial_number'])) {
                $query->where('serial_number', $validated['serial_number']);
            } else {
                $query->where(function($q) {
                    $q->whereNull('serial_number')->orWhere('serial_number', '');
                });
            }

            $existingItem = $query->first();

            if ($existingItem) {
                // Update quantity and recalculate totals
                $existingItem->quantity += $validated['quantity'];
                $existingItem->unit_price = $validated['unit_price'];
                if ($unitDiscount > 0) {
                    $existingItem->discount_amount += ($unitDiscount * $validated['quantity']);
                }
                $existingItem->save();
            } else {
                if ($unitDiscount > 0) {
                    $validated['discount_amount'] = $unitDiscount * $validated['quantity'];
                }
                $serviceJob->items()->create($validated);
            }

            $serviceJob->updateTotals();
            
            DB::commit();
            return back()->with('success', 'Item added successfully and stock updated.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to add service job item: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Failed to add item: ' . $e->getMessage()]);
        }
    }

    public function removeItem(ServiceJob $serviceJob, ServiceJobItem $item)
    {
        if (!Auth::user()->hasPermission('service_jobs.edit')) {
             return redirect()->back()->with('error', 'Unauthorized. You do not have permission to edit service jobs.');
        }

        DB::beginTransaction();
        try {
            // For parts, restore stock to the Service section (VIS-SEC-001)
            if ($item->item_type === 'part' && !empty($item->ItmKy)) {
                // Always use Shop section for stock restoration to reverse the deduction from VIS-SEC-002
                $serviceSectionCode = 'VIS-SEC-002';
                
                // Restore stock
                $this->restoreServiceJobStock(
                    $item->ItmKy,
                    $item->quantity,
                    $serviceSectionCode,
                    $item->batch_no,
                    $serviceJob->id,
                    $item->serial_number
                );
                
                Log::info('Stock restored for removed service job item', [
                    'service_job_id' => $serviceJob->id,
                    'item_ky' => $item->ItmKy,
                    'quantity' => $item->quantity,
                    'batch_no' => $item->batch_no,
                    'serial_number' => $item->serial_number,
                ]);
            }
            
            $item->delete();
            $serviceJob->updateTotals();
            
            DB::commit();
            return back()->with('success', 'Item removed successfully and stock restored.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to remove service job item: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Failed to remove item: ' . $e->getMessage()]);
        }
    }

    public function updateStatus(Request $request, ServiceJob $serviceJob, SmsService $smsService)
    {
        if (!$request->user()->hasPermission('service_jobs.edit')) {
             return redirect()->back()->with('error', 'Unauthorized. You do not have permission to edit service jobs.');
        }

        /** @var User|null $authUser */
        $authUser = Auth::user();
        
        $validated = $request->validate([
            'status' => 'required|in:pending,assigned,in_progress,waiting_for_parts,quotation_received,quotation_rejected,quotation_approved,completed,delivered,cancelled',
            'notes' => 'nullable|string',
            'assigned_technician_id' => 'nullable|integer|exists:users,id',
        ]);

        // Restrict only actual technician-level roles; allow cashier/front-desk to deliver/cancel.
        $roleSlug = (string) ($authUser?->role?->slug ?? '');
        $isTechnicianLevel = ($authUser?->role?->level === 'technician')
            || str_contains($roleSlug, 'technician');
        $isCashierLevel = ($authUser?->role?->level === 'cashier')
            || $roleSlug === 'cashier'
            || str_ends_with($roleSlug, '_cashier');

        if ($isTechnicianLevel && in_array($validated['status'], ['delivered', 'cancelled'], true)) {
            return back()->withErrors([
                'status' => 'Technicians can only progress or complete jobs. Delivery and cancellation require cashier/front-desk access.',
            ]);
        }

        if ($isCashierLevel && !in_array($validated['status'], ['delivered', 'cancelled'], true)) {
            return back()->withErrors([
                'status' => 'Cashiers can only mark jobs as Delivered or Cancelled.',
            ]);
        }

        // Cashiers can mark a job as 'delivered' (bill finalized) from any active status.
        // The 'completed' status is used by technicians to signal the repair is done (SMS sent),
        // but the bill is only officially finalized when the cashier marks it 'delivered'.
        if ($isCashierLevel && $validated['status'] === 'delivered' && $serviceJob->status === 'cancelled') {
            return back()->withErrors([
                'status' => 'A cancelled service job cannot be marked as Delivered.',
            ]);
        }

        // Prevent assigning an already assigned job (concurrency protection)
        if (array_key_exists('assigned_technician_id', $validated) && 
            $validated['assigned_technician_id'] !== null &&
            $serviceJob->assigned_technician_id !== null && 
            $serviceJob->assigned_technician_id != $validated['assigned_technician_id']) {
            return back()->with('error', 'This job is already assigned to another technician.');
        }

        // If the assigned technician is cleared on an active job,
        // reset the status to pending so it does not remain assigned without a technician.
        if (array_key_exists('assigned_technician_id', $validated) &&
            $validated['assigned_technician_id'] === null &&
            in_array($serviceJob->status, ['assigned', 'in_progress', 'waiting_for_parts', 'quotation_received', 'quotation_rejected', 'quotation_approved'], true)
        ) {
            $validated['status'] = 'pending';
        }

        $oldStatus = $serviceJob->status;

        // Check if status is already the same
        if ($serviceJob->status === $validated['status'] && 
            (!array_key_exists('assigned_technician_id', $validated) || $serviceJob->assigned_technician_id == $validated['assigned_technician_id'])) {
            return back()->with('info', 'No changes were made - status and technician assignment are already set.');
        }

        $updateData = [
            'status' => $validated['status'],
            'technician_notes' => $validated['notes'] ?? $serviceJob->technician_notes,
        ];

        // Only update assigned_technician_id if the request explicitly included it
        if (array_key_exists('assigned_technician_id', $validated)) {
            $updateData['assigned_technician_id'] = $validated['assigned_technician_id'];
        }

        // Set completion and delivered dates when status changes
        // Always update when transitioning INTO these states so the date filter
        // reflects the latest completion/delivery even if the job was re-opened.
        if ($validated['status'] === 'completed' && $oldStatus !== 'completed') {
            $updateData['actual_completion_date'] = now()->toDateString();
        }

        if ($validated['status'] === 'delivered' && $oldStatus !== 'delivered') {
            $updateData['delivered_date'] = now()->toDateString();
            // Also stamp completion date if not already set
            if (!$serviceJob->actual_completion_date) {
                $updateData['actual_completion_date'] = now()->toDateString();
            }
        }

        try {
            $serviceJob->update($updateData);
        } catch (\Illuminate\Database\QueryException $ex) {
            // Handle MySQL enum truncation (e.g., value not present in ENUM)
            $message = $ex->getMessage();
            if (str_contains($message, 'Data truncated for column') || str_contains($message, '1265')) {
                try {
                    // Ensure enum includes 'quotation_received'
                    DB::statement("ALTER TABLE `service_jobs` MODIFY `status` ENUM('pending','assigned','in_progress','waiting_for_parts','quotation_received','quotation_rejected','quotation_approved','completed','delivered','cancelled') NOT NULL DEFAULT 'pending'");
                    // Retry update
                    $serviceJob->refresh();
                    $serviceJob->update($updateData);
                } catch (\Exception $inner) {
                    Log::error('Failed to update status after altering enum: ' . $inner->getMessage());
                    return back()->withErrors(['error' => 'Failed to update status: ' . $inner->getMessage()]);
                }
            } else {
                throw $ex;
            }
        }

        // Create status history
        $serviceJob->statusHistory()->create([
            'status' => $validated['status'],
            'notes' => $validated['notes'] ?? 'Status updated',
            'changed_by' => $authUser?->id ?? null,
        ]);

        // Send SMS if status is updated to completed
        if ($validated['status'] === 'completed' && $oldStatus !== 'completed') {
            if ($serviceJob->customer_phone) {
                try {
                    $smsService->sendJobCompletionNotification(
                        $serviceJob->customer_phone,
                        $serviceJob->job_number,
                        (float) $serviceJob->total_amount
                    );
                } catch (\Exception $e) {
                    Log::error('Failed to send job completion SMS: ' . $e->getMessage());
                }
            }
        }

        return redirect()->back()->with('success', 'Status updated successfully.');
    }

    public function searchCustomers(Request $request)
    {
        $search = $request->search;
        
        $user = auth()->user();
        $customersQuery = AccMas::where('AccTyp', 'CUSTOMER');

        if ($user && $user->role_id !== 1) {
            $customersQuery->where('company_code', $user->company_code);
        } else if ($user && $user->role_id === 1) {
            $selectedCompany = session('selected_company');
            if ($selectedCompany) {
                $customersQuery->where('company_code', $selectedCompany);
            } else {
                $customersQuery->whereRaw('1 = 0');
            }
        }

        $customers = $customersQuery
            ->where(function($q) use ($search) {
                $q->where('AccCd', 'like', "%{$search}%")
                  ->orWhere('AccNm', 'like', "%{$search}%")
                  ->orWhereHas('addresses', function($q2) use ($search) {
                      $q2->where('TP1', 'like', "%{$search}%")
                         ->orWhere('Email', 'like', "%{$search}%");
                  });
            })
            ->limit(10)
            ->get(['AccKy', 'AccCd', 'AccNm', 'CurBal', 'CrLmt']);
        
        return response()->json($customers);
    }

    public function getCustomerDetails($AccKy)
    {
        try {
            Log::info("Fetching customer details for AccKy: {$AccKy}");
            
            $customer = AccMas::where('AccKy', $AccKy)->first();
            
            if (!$customer) {
                Log::warning("Customer not found for AccKy: {$AccKy}");
                return response()->json(['error' => 'Customer not found'], 404);
            }
            
            Log::info("Customer found: {$customer->AccNm}");
            
            // Get address details from address table - try without AdrTypKy filter first
            $address = Address::where('AccKy', $AccKy)
                ->orderBy('AdrKy', 'desc') // Get the most recent address
                ->first();
            
            Log::info("Address found: " . ($address ? "Yes (AdrKy: {$address->AdrKy})" : "No"));

            // Get customer's previous service jobs to find device details
            $previousJobs = ServiceJob::where('AccKy', $AccKy)
                ->where(function($q) {
                    $q->whereNotNull('device_serial')
                      ->orWhereNotNull('device_barcode');
                })
                ->select('device_brand', 'device_model', 'device_serial', 'device_barcode')
                ->distinct()
                ->limit(10)
                ->get();

            $response = [
                'customer' => [
                    'AccKy' => $customer->AccKy,
                    'AccCd' => $customer->AccCd,
                    'AccNm' => $customer->AccNm,
                    'AccTyp' => $customer->AccTyp,
                    'CurBal' => $customer->CurBal ?? 0,
                    'CrLmt' => $customer->CrLmt ?? 0,
                ],
                'address' => $address ? [
                    'AdrKy' => $address->AdrKy,
                    'CtPerson' => $address->CtPerson ?? '',
                    'FstNm' => $address->FstNm ?? '',
                    'LstNm' => $address->LstNm ?? '',
                    'TP1' => $address->TP1 ?? '',
                    'TP2' => $address->TP2 ?? '',
                    'TP3' => $address->TP3 ?? '',
                    'Email' => $address->Email ?? '',
                    'Address' => $address->Address ?? '',
                    'Town' => $address->Town ?? '',
                    'City' => $address->City ?? '',
                    'Country' => $address->Country ?? ''
                ] : null,
                'previousDevices' => $previousJobs
            ];
            
            Log::info("Response prepared successfully", ['response' => $response]);
            
            return response()->json($response);
        } catch (\Exception $e) {
            Log::error("Error in getCustomerDetails: " . $e->getMessage(), [
                'AccKy' => $AccKy,
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'error' => 'Server error occurred while fetching customer details',
                'message' => $e->getMessage(),
                'line' => $e->getLine(),
                'file' => $e->getFile()
            ], 500);
        }
    }

    public function searchItems(Request $request)
    {
        try {
            $search = $request->search;
            $user = auth()->user();
            $results = [];
            $isQuotationScope = $request->query('scope') === 'quotation';

            // Always use Shop section for stock lookup, regardless of user's current section
            $serviceSectionCode = 'VIS-SEC-002';
            $includeAllItems = $request->boolean('include_all', false) || $isQuotationScope;

            Log::info('Service Job Item Search', [
                'search' => $search,
                'user_id' => $user?->id,
                'user_section' => $user?->section_code,
                'using_section' => $serviceSectionCode,
                'include_all_items' => $includeAllItems,
                'scope' => $request->query('scope'),
            ]);

            // Search in ItemMaster table
            $itemsQuery = ItemMaster::where(function($q) use ($search) {
                    $q->where('ItemCode', 'like', "%{$search}%")
                      ->orWhere('ItmNm', 'like', "%{$search}%")
                      ->orWhere('BarCode', 'like', "%{$search}%");
                });

            if ($isQuotationScope) {
                // Quotation search should use current company only.
                $itemsQuery->where('fInAct', false);
                
                if ($user && $user->role_id !== 1) {
                    $itemsQuery->where('company_code', $user->company_code);
                } else if ($user && $user->role_id === 1) {
                    $selectedCompany = session('selected_company');
                    if ($selectedCompany) {
                        $itemsQuery->where('company_code', $selectedCompany);
                    }
                }

                $itemsQuery->where(function ($q) {
                        $q->whereNull('item_type')
                          ->orWhereIn('item_type', ['product', 'printer', 'part']);
                    });
            }

            if (!$includeAllItems) {
                // only items with positive NET stock in SERVICE section (default behavior for service job part selection)
                $itemsQuery->whereRaw('ItmKy IN (
                    SELECT ItemKy 
                    FROM stock_in_hand 
                    WHERE section_code = ? 
                    GROUP BY ItemKy, batch_no 
                    HAVING SUM(Qty + COALESCE(FreeQty, 0)) > 0
                )', [$serviceSectionCode]);
            }

            $items = $itemsQuery
                ->orderBy('ItmNm')
                ->limit($isQuotationScope ? 100 : 20)
                ->get(['ItmKy', 'ItemCode', 'ItmNm', 'SlsPri', 'Unit', 'BarCode', 'company_code', 'transfer_conversion_factor', 'transfer_unit_id', 'receiving_unit_id', 'CredQty1', 'CredDis1', 'CredQty2', 'CredDis2']);

            Log::info('Service Job Search Results', [
                'section_code' => $serviceSectionCode,
                'itemmaster_count' => $items->count(),
            ]);

            // Format ItemMaster results
            foreach ($items as $item) {
                $conversionFactor = floatval($item->transfer_conversion_factor ?? 1);
                $hasConversionRows = $conversionFactor > 1;

                $fromUnitName = $item->transfer_unit_id
                    ? DB::table('code_masters')->where('id', $item->transfer_unit_id)->value('cname')
                    : null;
                $toUnitName = $item->receiving_unit_id
                    ? DB::table('code_masters')->where('id', $item->receiving_unit_id)->value('cname')
                    : null;

                // fetch batch availability in section
                $batchRecords = DB::table('stock_in_hand')
                    ->where('ItemKy', $item->ItmKy)
                    ->where('section_code', $serviceSectionCode)
                    ->select('batch_no', DB::raw('SUM(Qty + COALESCE(FreeQty,0)) as total_qty'))
                    ->groupBy('batch_no')
                    ->having('total_qty', '>', 0)
                    ->get();

                $totalBundleStock = 0.0;
                $totalNosStock    = 0.0;

                $batchArray = $batchRecords->map(function($b) use ($item, $serviceSectionCode, $hasConversionRows, &$totalBundleStock, &$totalNosStock) {
                    // Bundle stock: exclude CNV-IN% and RCNV-OUT% rows
                    $bundleStock = (float) DB::table('stock_in_hand')
                        ->where('ItemKy', $item->ItmKy)
                        ->where('section_code', $serviceSectionCode)
                        ->where('batch_no', $b->batch_no)
                        ->where(function($q) {
                            $q->whereNull('RefNo')
                              ->orWhere(function($q2) {
                                  $q2->where('RefNo', 'NOT LIKE', 'CNV-IN%')
                                     ->where('RefNo', 'NOT LIKE', 'RCNV-OUT%');
                              });
                        })
                        ->where(function($q) use ($hasConversionRows) {
                            if ($hasConversionRows) {
                                $q->whereNull('TrnTyp')
                                  ->orWhereNotIn('TrnTyp', ['SAL-NOS', 'SAL']);
                            } else {
                                $q->whereNull('TrnTyp')
                                  ->orWhere('TrnTyp', '!=', 'SAL-NOS');
                            }
                        })
                        ->sum(DB::raw('Qty + COALESCE(FreeQty, 0)'));

                    // NOS stock: only CNV-IN%, RCNV-OUT%, and SAL-NOS rows
                    $nosStock = (float) DB::table('stock_in_hand')
                        ->where('ItemKy', $item->ItmKy)
                        ->where('section_code', $serviceSectionCode)
                        ->where('batch_no', $b->batch_no)
                        ->where(function($q) {
                            $q->where('RefNo', 'LIKE', 'CNV-IN%')
                              ->orWhere('RefNo', 'LIKE', 'RCNV-OUT%')
                              ->orWhere('TrnTyp', 'SAL-NOS');
                        })
                        ->sum(DB::raw('Qty + COALESCE(FreeQty, 0)'));

                    $bundleStock = max(0.0, $bundleStock);
                    $nosStock    = max(0.0, $nosStock);

                    $totalBundleStock += $bundleStock;
                    $totalNosStock    += $nosStock;

                    $batchPrice = DB::table('purchase_det')
                        ->where('iTimKy', $item->ItmKy)
                        ->where('batch_no', $b->batch_no)
                        ->whereNotNull('SalePrice')
                        ->orderByDesc('PerchaseDetKy')
                        ->value('SalePrice');

                    return [
                        'batch_no'     => $b->batch_no,
                        'qty'          => (float)$b->total_qty,
                        'bundle_stock' => $bundleStock,
                        'nos_stock'    => $nosStock,
                        'sale_price'   => $batchPrice,
                    ];
                })->toArray();

                $slsPri = $item->SlsPri;
                
                // Fallback 1: Use a batch price if SlsPri is 0
                if ($slsPri == 0 && count($batchArray) > 0) {
                    foreach ($batchArray as $batch) {
                        if (!empty($batch['sale_price']) && $batch['sale_price'] > 0) {
                            $slsPri = $batch['sale_price'];
                            break;
                        }
                    }
                }
                
                // Fallback 2: Use the latest purchase detail price if SlsPri is still 0
                if ($slsPri == 0) {
                    $latestPurchasePrice = DB::table('purchase_det')
                        ->where('iTimKy', $item->ItmKy)
                        ->whereNotNull('SalePrice')
                        ->where('SalePrice', '>', 0)
                        ->orderByDesc('PerchaseDetKy')
                        ->value('SalePrice');
                        
                    if ($latestPurchasePrice) {
                        $slsPri = $latestPurchasePrice;
                    }
                }

                $results[] = [
                    'ItmKy'  => $item->ItmKy,
                    'ItemCode' => $item->ItemCode,
                    'ItmNm'  => $item->ItmNm,
                    'SlsPri' => $slsPri,
                    'Unit'   => $item->Unit,
                    'BarCode' => $item->BarCode,
                    'company_code' => $item->company_code,
                    'source' => 'itemmaster',
                    'vat_inclusive' => $item->vat_inclusive ?? false,
                    'batches' => $batchArray,
                    'transfer_conversion_factor' => $conversionFactor,
                    'from_unit_name' => $fromUnitName,
                    'to_unit_name'   => $toUnitName,
                    'bundle_stock'   => $totalBundleStock,
                    'nos_stock'      => $totalNosStock,
                    'CredQty1'       => $item->CredQty1,
                    'CredDis1'       => $item->CredDis1,
                    'CredQty2'       => $item->CredQty2,
                    'CredDis2'       => $item->CredDis2,
                ];
            }

            // Search in PurchaseDet table by serial number
            $purchaseItems = PurchaseDet::where(function($q) use ($search) {
                    $q->where('serial_number', 'like', "%{$search}%");
                })
                ->where(function($q) {
                    $q->where('flnAct', false) // flnAct = false means active (not inactive)
                      ->orWhereNull('flnAct');
                })
                ->where('Status', 'A')
                ->when($isQuotationScope, function($q) use ($user) {
                    if ($user && $user->role_id !== 1) {
                        $q->where('company_code', $user->company_code);
                    } else if ($user && $user->role_id === 1) {
                        $selectedCompany = session('selected_company');
                        if ($selectedCompany) {
                            $q->where('company_code', $selectedCompany);
                        }
                    }
                })
                ->with('product')
                ->limit(20)
                ->get();

            Log::info('PurchaseDet search results: ' . $purchaseItems->count() . ' items found for search: ' . $search);

            // Format PurchaseDet results
            foreach ($purchaseItems as $purchaseItem) {
                $itemName = $purchaseItem->product ? $purchaseItem->product->ItmNm : 'Unknown Item';
                
                // prefer product ItmKy when available so frontend can load batches
                $itmKy = $purchaseItem->product?->ItmKy ?? $purchaseItem->iTimKy ?? '';
                
                $results[] = [
                    'ItmKy' => $itmKy,
                    'ItemCode' => $purchaseItem->serial_number ?? '',
                    'ItmNm' => $itemName,
                    'SlsPri' => $purchaseItem->SalePrice ?? $purchaseItem->CostPrice ?? 0,
                    'Unit' => $purchaseItem->product ? $purchaseItem->product->Unit : 'PCS',
                    'BarCode' => $purchaseItem->serial_number ?? '',
                    'serial_number' => $purchaseItem->serial_number,
                    'batch_no' => $purchaseItem->batch_no ?? '',
                    'company_code' => $purchaseItem->company_code,
                    'source' => 'purchase_det',
                    'purchase_det_ky' => $purchaseItem->PerchaseDetKy,
                    'vat_inclusive' => $purchaseItem->product ? ($purchaseItem->product->vat_inclusive ?? false) : false,
                    'CredQty1' => $purchaseItem->product ? $purchaseItem->product->CredQty1 : null,
                    'CredDis1' => $purchaseItem->product ? $purchaseItem->product->CredDis1 : null,
                    'CredQty2' => $purchaseItem->product ? $purchaseItem->product->CredQty2 : null,
                    'CredDis2' => $purchaseItem->product ? $purchaseItem->product->CredDis2 : null,
                ];
            }

            return response()->json($results);
        } catch (\Exception $e) {
            Log::error('Item search error: ' . $e->getMessage());
            Log::error('Item search trace: ' . $e->getTraceAsString());
            return response()->json([], 500);
        }
    }

    public function getCustomerByDevice(Request $request)
    {
        try {
            $serial = $request->query('serial');
            $barcode = $request->query('barcode');
            
            Log::info('ServiceJob: Searching for device', ['serial' => $serial, 'barcode' => $barcode]);
            
            if (!$serial && !$barcode) {
                return response()->json(['error' => 'Serial number or barcode is required'], 400);
            }

            // Determine search type and normalize
            $searchType = $serial ? 'serial' : 'barcode';
            $searchTerm = trim($serial ?? $barcode ?? '');
            
            if (!$searchTerm) {
                return response()->json(['error' => 'Search term cannot be empty'], 400);
            }

            // Check if device is already under service (active service job)
            // Include completed jobs that have not yet been delivered.
            // ONLY match if the searched field matches, not the other field.
            // MUST be restricted by company.
            $activeJobsQuery = ServiceJob::where(function ($query) {
                    $query->whereIn('status', ['pending', 'assigned', 'in_progress', 'waiting_for_parts', 'quotation_received'])
                          ->orWhere(function ($query) {
                              $query->where('status', 'completed')
                                    ->whereNull('delivered_date');
                          });
                });
            
            if (auth()->user()->role_id !== 1) {
                $activeJobsQuery->where('company_code', auth()->user()->company_code);
            } else {
                $selectedCompany = session('selected_company');
                if ($selectedCompany) {
                    $activeJobsQuery->where('company_code', $selectedCompany);
                }
            }

            $activeJobs = $activeJobsQuery->get(); // Get all active jobs first

            // Manually filter to match ONLY the field that was searched
            foreach ($activeJobs as $job) {
                $jobSerial = trim($job->device_serial ?? '');
                $jobBarcode = trim($job->device_barcode ?? '');
                
                // Only match if:
                // 1. Searched by serial AND serial matches (exact match, non-empty)
                // 2. Searched by barcode AND barcode matches (exact match, non-empty)
                $isMatch = false;
                
                if ($searchType === 'serial' && $jobSerial && $jobSerial === $searchTerm) {
                    $isMatch = true;
                } elseif (
                    $searchType === 'barcode' &&
                    $jobBarcode &&
                    $jobBarcode === $searchTerm &&
                    empty($jobSerial)
                ) {
                    $isMatch = true;
                }

                if ($isMatch) {
                    Log::info('ServiceJob: Device already under service - VERIFIED MATCH', [
                        'job_number' => $job->job_number,
                        'status' => $job->status,
                        'search_type' => $searchType,
                        'search_term' => $searchTerm,
                        'job_serial' => $jobSerial,
                        'job_barcode' => $jobBarcode,
                    ]);

                    $blockedMessage = ($job->status === 'completed' && !$job->delivered_date)
                    ? 'This device already has a completed service job that has not yet been delivered and cannot be registered for a new service job.'
                    : 'This device is already under service and cannot be registered for a new service job.';

                return response()->json([
                        'error' => 'Device already under service',
                        'message' => $blockedMessage,
                        'existing_job' => [
                            'job_number' => $job->job_number,
                            'status' => $job->status,
                            'customer_name' => $job->customer_name,
                            'technician_name' => $job->technician_name,
                            'received_date' => $job->received_date,
                            'estimated_completion_date' => $job->estimated_completion_date,
                        ],
                        'device_serial' => $searchTerm,
                        'device_barcode' => $searchTerm
                    ], 409);
                }
            }
            
            Log::info('ServiceJob: No active service job found for device', [
                'search_type' => $searchType,
                'search_term' => $searchTerm
            ]);
            
            // First, search in sales_transactions and sales_transaction_items tables
            $salesTransaction = null;
            $saleItem = null;
            
            // Search by the SPECIFIC field that was searched (field-aware)
            $query = DB::table('sales_transaction_items as sti')
                ->join('itemmaster as im', 'sti.product_id', '=', 'im.ItmKy')
                ->leftJoin('brands as b', 'im.brand_id', '=', 'b.id')
                ->leftJoin('models as m', 'im.models_id', '=', 'm.id')
                ->where(function($query) use ($searchType, $searchTerm) {
                    if ($searchType === 'serial') {
                        $query->where('sti.serial_number', $searchTerm)
                              ->whereNotNull('sti.serial_number'); // Ensure it's not NULL
                    } else {
                        $query->where('sti.barcode', $searchTerm)
                              ->whereNotNull('sti.barcode'); // Ensure it's not NULL
                    }
                });
                
            if (auth()->user()->role_id !== 1) {
                $query->where('sti.company_code', auth()->user()->company_code);
            } else {
                $selectedCompany = session('selected_company');
                if ($selectedCompany) {
                    $query->where('sti.company_code', $selectedCompany);
                }
            }


            $saleItem = $query->select(
                    'sti.*',
                    'b.name as brand',
                    'm.name as model',
                    'im.warranty as item_warranty',
                    'im.ItmNm as item_name'
                )
                ->orderBy('sti.id', 'desc')
                ->first();
            
            Log::info('ServiceJob: Searched for device', ['found' => $saleItem ? 'yes' : 'no', 'search_term' => $searchTerm]);
            
            // If found in sales, get the full transaction details
            if ($saleItem) {
                Log::info('ServiceJob: Found sale item', [
                    'item_id' => $saleItem->id,
                    'sales_transaction_id' => $saleItem->sales_transaction_id,
                    'brand' => $saleItem->brand,
                    'model' => $saleItem->model,
                    'serial_number' => $saleItem->serial_number
                ]);
                
                // Fallback for warranty if not in itemmaster
                $saleItem->warranty = $saleItem->item_warranty;
                
                // If brand or model is missing from the sales record, try to find it in purchase_det
                // This is common for serialized items where details were registered during purchase.
                if (empty($saleItem->brand) || empty($saleItem->model)) {
                    $purchaseInfo = DB::table('purchase_det as pd')
                        ->join('itemmaster as im', 'pd.iTimKy', '=', 'im.ItmKy')
                        ->leftJoin('brands as b', 'im.brand_id', '=', 'b.id')
                        ->leftJoin('models as m', 'im.models_id', '=', 'm.id')
                        ->where('pd.serial_number', $saleItem->serial_number)
                        ->select('b.name as brand', 'm.name as model', 'im.warranty')
                        ->first();
                    
                    if ($purchaseInfo) {
                        $saleItem->brand = $saleItem->brand ?: $purchaseInfo->brand;
                        $saleItem->model = $saleItem->model ?: $purchaseInfo->model;
                        $saleItem->warranty = $saleItem->warranty ?: ($saleItem->warranty ?? $purchaseInfo->warranty);
                        
                        Log::info('ServiceJob: Supplemental info found via purchase_det joins', [
                            'brand' => $saleItem->brand,
                            'model' => $saleItem->model
                        ]);
                    }
                }
                
                // select the key customer fields upfront so they are always available
                $salesTransaction = DB::table('sales_transactions')
                    ->select('id', 'customer_code', 'customer_name', 'customer_id', 'transaction_date', 'customer_name', 'customer_code')
                    ->where('id', $saleItem->sales_transaction_id)
                    ->first();
                
                Log::info('ServiceJob: Sales transaction lookup', [
                    'sales_transaction_id' => $saleItem->sales_transaction_id,
                    'found' => $salesTransaction ? 'yes' : 'no'
                ]);
                
                if ($salesTransaction) {
                    Log::info('ServiceJob: Found sales transaction', [
                        'transaction_id' => $salesTransaction->id,
                        'customer_id' => $salesTransaction->customer_id,
                        'customer_code' => $salesTransaction->customer_code,
                        'customer_name' => $salesTransaction->customer_name
                    ]);
                    
                    // Get all items from this sale
                    $allSaleItems = DB::table('sales_transaction_items')
                        ->where('sales_transaction_id', $salesTransaction->id)
                        ->get();
                    
                    // Get customer details using customer_id from sales_transactions
                    $customer = null;
                    $address = null;
                    $customerPhone = '';
                    $customerEmail = '';
                    $customerAddress = '';
                    $customerName = $salesTransaction->customer_name ?? '';
                    
                    // Try to get customer from AccMas using customer_id
                    if (!empty($salesTransaction->customer_id)) {
                        $customer = DB::table('acc_mas')
                            ->where('AccKy', $salesTransaction->customer_id)
                            ->first();
                        
                        Log::info('ServiceJob: Searched acc_mas by customer_id', [
                            'customer_id' => $salesTransaction->customer_id,
                            'found' => $customer ? 'yes' : 'no'
                        ]);
                        
                        if ($customer) {
                            $customerName = $customer->AccNm ?? $customerName;
                            
                            // Get address details from address table using AccKy (not AdrKy)
                            // Note: Not filtering by AdrTypKy as it may be NULL for customers
                            $address = DB::table('address')
                                ->where('AccKy', $salesTransaction->customer_id)
                                ->orderBy('AdrKy', 'desc') // Get most recent address
                                ->first();
                            
                            Log::info('ServiceJob: Searched address by AccKy', [
                                'AccKy' => $salesTransaction->customer_id,
                                'found' => $address ? 'yes' : 'no'
                            ]);
                            
                            if ($address) {
                                $customerPhone = $address->TP1 ?? $address->TP2 ?? $address->TP3 ?? '';
                                $customerEmail = $address->Email ?? '';
                                $customerAddress = $address->Address ?? '';
                            }
                        }
                    }
                    
                    // If no customer_id or not found, try using customer_code
                    if (!$customer && !empty($salesTransaction->customer_code)) {
                        $customer = DB::table('acc_mas')
                            ->where('AccCd', $salesTransaction->customer_code)
                            ->first();
                        
                        Log::info('ServiceJob: Searched acc_mas by customer_code', [
                            'customer_code' => $salesTransaction->customer_code,
                            'found' => $customer ? 'yes' : 'no'
                        ]);
                        
                        if ($customer) {
                            $customerName = $customer->AccNm ?? $customerName;
                            
                            // Get address details using AccKy (not AdrKy)
                            // Note: Not filtering by AdrTypKy as it may be NULL for customers
                            $address = DB::table('address')
                                ->where('AccKy', $customer->AccKy)
                                ->orderBy('AdrKy', 'desc') // Get most recent address
                                ->first();
                            
                            Log::info('ServiceJob: Searched address by customer AccKy', [
                                'AccKy' => $customer->AccKy,
                                'found' => $address ? 'yes' : 'no'
                            ]);
                            
                            if ($address) {
                                $customerPhone = $address->TP1 ?? $address->TP2 ?? $address->TP3 ?? '';
                                $customerEmail = $address->Email ?? '';
                                $customerAddress = $address->Address ?? '';
                            }
                        }
                    }
                    
                    // if the sales transaction record includes its own customer details, prefer those
                    $salesCustomerCode = $salesTransaction->customer_code ?? null;
                    $salesCustomerName = $salesTransaction->customer_name ?? null;

                    // log final data including what came from sales table
                    Log::info('ServiceJob: Final customer data', [
                        'customer_name' => $customerName,
                        'customer_phone' => $customerPhone,
                        'customer_email' => $customerEmail,
                        'sales_customer_code' => $salesCustomerCode,
                        'sales_customer_name' => $salesCustomerName,
                        'has_address_record' => $address ? 'yes' : 'no'
                    ]);
                    
                    // Prepare response with sale data
                    $result = [
                        'customer' => [
                            'AccKy' => $customer->AccKy ?? $salesTransaction->customer_id ?? '',
                            'AdrKy' => $customer->AccKy ?? $salesTransaction->customer_id ?? '',
                            // prefer values from sales_transactions when present
                            'AccCd' => $customer->AccCd ?? $salesCustomerCode ?? $salesTransaction->customer_code ?? '',
                            'AccNm' => $salesCustomerName ?? $customerName,
                            'full_name' => $salesCustomerName ?? $customerName,
                            'customer_name' => $salesCustomerName ?? $customerName,
                            'customer_phone' => $customerPhone,
                            'customer_email' => $customerEmail,
                            'customer_address' => $customerAddress,
                            'TP1' => $customerPhone,
                            'Email' => $customerEmail,
                            'Address' => $customerAddress,
                            // explicitly expose the original sales columns too
                            'sales_customer_code' => $salesCustomerCode,
                            'sales_customer_name' => $salesCustomerName,
                        ],
                        'address' => $address ? [
                            'TP1' => $address->TP1 ?? '',
                            'TP2' => $address->TP2 ?? '',
                            'TP3' => $address->TP3 ?? '',
                            'Email' => $address->Email ?? '',
                            'Address' => $address->Address ?? '',
                            'City' => $address->City ?? '',
                        ] : null,
                        'device_serial' => $saleItem->serial_number ?? $serial,
                        'device_brand' => $saleItem->brand ?? '',
                        'device_model' => $saleItem->model ?? '',
                        'device_barcode' => $saleItem->barcode ?? $barcode ?? '',
                        'device_warranty' => $saleItem->warranty ?? '',
                        'sale_date' => $salesTransaction->transaction_date ?? $salesTransaction->created_at,
                        'items' => $allSaleItems->map(function($item) {
                            return [
                                'ItmKy' => $item->product_id ?? $item->item_code,
                                'item_code' => $item->item_code ?? '',
                                'item_name' => $item->item->ItmNm ?? '',
                                'ItemCode' => $item->item_code ?? '',
                                'ItmNm' => $item->item->ItmNm ?? '',
                                'barcode' => $item->item->BarCode ?? '',
                                'BarCode' => $item->item->BarCode ?? '',
                                'quantity' => $item->quantity ?? 1,
                                'unit_price' => $item->unit_price ?? 0,
                                'SlsPri' => $item->unit_price ?? 0,
                                'description' => $item->notes ?? '',
                            ];
                        })->toArray(),
                    ];
                    
                    return response()->json($result);
                }
            }
            
            // If not found in sales, fallback to purchase_det table (original logic)
            $purchaseDet = PurchaseDet::where('flnAct', true)
                ->where('Status', 'A')
                ->where(function($query) use ($searchType, $serial, $barcode) {
                    if ($searchType === 'serial' && $serial) {
                        $query->where('serial_number', $serial);
                    } elseif ($searchType === 'barcode' && $barcode) {
                        $query->where('barcode', $barcode);
                    }
                })
                ->with(['purchase.customer', 'product.brand', 'product.model'])
                ->first();
            
            if (!$purchaseDet) {
                Log::warning('ServiceJob: No record found', [
                    'serial' => $serial,
                    'barcode' => $barcode,
                    'checked_sales' => 'yes',
                    'checked_purchase' => 'yes'
                ]);
                
                return response()->json([
                    'error' => 'No sale or purchase record found for this device serial/barcode',
                    'message' => 'The serial number or barcode you entered does not exist in our records. Please check the number and try again.',
                    'searched_value' => $serial ?? $barcode
                ], 404);
            }
            
            $purchase = $purchaseDet->purchase;
            $customer = $purchase ? $purchase->customer : null;
            $product = $purchaseDet->product;
            
            if (!$customer) {
                return response()->json(['error' => 'Customer not found for this purchase'], 404);
            }
            
            // Get customer address
            $address = Address::where('AccKy', $customer->AccKy)
                ->where('AdrTypKy', 1)
                ->first();
            
            $result = [
                'customer' => [
                    'AccKy' => $customer->AccKy,
                    'AccCd' => $customer->AccCd,
                    'AccNm' => $customer->AccNm,
                    'CurBal' => $customer->CurBal,
                    'CrLmt' => $customer->CrLmt,
                ],
                'address' => $address ? [
                    'TP1' => $address->TP1,
                    'TP2' => $address->TP2,
                    'TP3' => $address->TP3,
                    'Email' => $address->Email,
                    'Address' => $address->Address,
                    'City' => $address->City,
                ] : null,
                'device_serial' => $purchaseDet->serial_number,
                'device_model' => $purchaseDet->product->model->name ?? '',
                'device_brand' => $purchaseDet->product->brand->name ?? '',
                'device_barcode' => $purchaseDet->product->BarCode ?? '',
                'device_warranty' => $purchaseDet->product->warranty ?? '',
                'items' => $product ? [[
                    'ItmKy' => $product->ItmKy,
                    'ItemCode' => $product->ItemCode,
                    'ItmNm' => $product->ItmNm,
                    'BarCode' => $product->BarCode,
                    'SlsPri' => $product->SlsPri,
                    'Unit' => $product->UnitKy,
                ]] : [],
            ];
            
            return response()->json($result);
        } catch (\Exception $e) {
            Log::error('getCustomerByDevice error: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json(['error' => 'Server error: ' . $e->getMessage()], 500);
        }
    }

    public function getItemByCode($itemCode)
    {
        try {
            $query = ItemMaster::where(function($q) use ($itemCode) {
                    $q->where('ItemCode', $itemCode)
                      ->orWhere('BarCode', $itemCode);
                });
            
            if (auth()->user()->role_id !== 1) {
                $query->where('company_code', auth()->user()->company_code);
            }

            $item = $query->first();

            if (!$item) {
                return response()->json(['error' => 'Item not found'], 404);
            }

            return response()->json($item);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Server error: ' . $e->getMessage()], 500);
        }
    }

    public function getDeviceDetails(Request $request)
    {
        $serialNumber = $request->query('serial_number');

        if (!$serialNumber) {
            return response()->json(['error' => 'Serial number is required'], 400);
        }

        $device = DB::table('purchase_det as pd')
            ->leftJoin('itemmaster as im', 'pd.iTimKy', '=', 'im.ItmKy')
            ->leftJoin('brands as b', 'im.brand_id', '=', 'b.id')
            ->leftJoin('models as m', 'im.models_id', '=', 'm.id')
            ->where('pd.serial_number', $serialNumber)
            ->when(auth()->user()->role_id !== 1, function($q) {
                return $q->where('pd.company_code', auth()->user()->company_code);
            })
            ->select('b.name as brand', 'm.name as model', 'im.warranty')
            ->first();

        if (!$device) {
            return response()->json(['error' => 'Device not found'], 404);
        }

        return response()->json($device);
    }

    public function getDeviceSerialNumbers()
    {
        $query = DB::table('sales_transaction_items')
            ->whereNotNull('serial_number')
            ->where('serial_number', '!=', '');
            
        if (auth()->user()->role_id !== 1) {
            $query->where('company_code', auth()->user()->company_code);
        }

        $serialNumbers = $query->pluck('serial_number')
            ->unique()
            ->values();

        return response()->json($serialNumbers);
    }

    public function getPrinterBrands()
    {
        try {
            Log::info('getPrinterBrands called');

            // Get all active brands in "Epson Canon HP printers" category
            // Filter by VIS-SEC-002 section
            $brands = Brand::where('is_active', true)
                ->where('company_code', auth()->user()->company_code)
                ->where('section_code', 'VIS-SEC-002')
                ->whereHas('category', function ($query) {
                    $query->where('description', 'Epson Canon HP printers');
                })
                ->distinct()
                ->orderBy('name')
                ->get(['id', 'name', 'code']);

            Log::info('getPrinterBrands result', [
                'count' => $brands->count(),
                'company_code' => auth()->user()->company_code,
                'section_code' => 'VIS-SEC-002',
                'category' => 'Epson Canon HP printers',
            ]);

            return response()->json($brands);
        } catch (\Exception $e) {
            Log::error('getPrinterBrands error: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function getPrinterModels(Request $request)
    {
        try {
            $brandId = $request->query('brand_id');

            Log::info('getPrinterModels request', ['brand_id' => $brandId]);

            $query = ProductModel::where('is_active', true)
                ->where('company_code', auth()->user()->company_code)
                ->where('section_code', 'VIS-SEC-002')
                ->whereHas('brand', function ($brandQuery) {
                    $brandQuery->whereHas('category', function ($catQuery) {
                        $catQuery->where('description', 'Epson Canon HP printers');
                    });
                });

            if ($brandId) {
                $query->where('brand_id', $brandId);
            }

            $models = $query->distinct()
                ->orderBy('name')
                ->get(['id', 'name', 'code', 'brand_id']);

            Log::info('getPrinterModels result', [
                'brand_id' => $brandId,
                'count' => $models->count(),
                'company_code' => auth()->user()->company_code,
                'section_code' => 'VIS-SEC-002',
                'category' => 'Epson Canon HP printers',
            ]);

            return response()->json($models);
        } catch (\Exception $e) {
            Log::error('getPrinterModels error: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function createPrinterModel(Request $request)
    {
        try {
            $validated = $request->validate([
                'brand_id' => 'required|integer|exists:brands,id',
                'model_name' => 'required|string|max:100|unique:models,name',
            ]);

            $brand = Brand::findOrFail($validated['brand_id']);

            // Create new model with generated code
            $model = ProductModel::create([
                'uuid' => \Illuminate\Support\Str::uuid(),
                'code' => strtoupper(substr($validated['model_name'], 0, 3)) . '-' . time(),
                'name' => $validated['model_name'],
                'brand_id' => $validated['brand_id'],
                'company_code' => auth()->user()->company_code,
                'section_code' => 'VIS-SEC-002',
                'is_active' => true,
            ]);

            Log::info('New printer model created', [
                'model_id' => $model->id,
                'model_name' => $validated['model_name'],
                'brand_id' => $validated['brand_id'],
                'brand_name' => $brand->name,
            ]);

            return response()->json([
                'id' => $model->id,
                'name' => $model->name,
                'code' => $model->code,
                'brand_id' => $model->brand_id,
                'message' => "New model '{$validated['model_name']}' created successfully for brand {$brand->name}",
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::warning('Model creation validation error', $e->errors());
            return response()->json(['error' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('createPrinterModel error: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * General update handler for a service job.
     * Accepts customer/device info, payments, assigned technician and status changes.
     */
    public function update(Request $request, ServiceJob $serviceJob)
    {
        /** @var User|null $authUser */
        $authUser = Auth::user();
        
        $validated = $request->validate([
            'customer_name' => 'nullable|string|max:100',
            'customer_phone' => 'nullable|string|max:20',
            'customer_email' => 'nullable|email|max:100',
            'customer_address' => 'nullable|string|max:255',
            'device_model' => 'nullable|string|max:100',
            'device_brand' => 'nullable|string|max:100',
            'device_warranty' => 'nullable|string|max:50',
            'device_serial' => 'nullable|string|max:100',
            'device_barcode' => 'nullable|string|max:100',
            'assigned_technician_id' => 'nullable|integer|exists:users,id',
            'technician_notes' => 'nullable|string',
            'admin_notes' => 'nullable|string',
            'advanced_payment' => 'nullable|numeric|min:0',
            'paid_amount' => 'nullable|numeric|min:0',
            'status' => 'nullable|in:pending,assigned,in_progress,waiting_for_parts,completed,delivered,cancelled',
        ]);

        $roleSlug = (string) ($authUser?->role?->slug ?? '');
        $isTechnicianLevel = ($authUser?->role?->level === 'technician')
            || str_contains($roleSlug, 'technician');
        $isCashierLevel = ($authUser?->role?->level === 'cashier')
            || $roleSlug === 'cashier'
            || str_ends_with($roleSlug, '_cashier');

        if ($isTechnicianLevel && isset($validated['status']) && in_array($validated['status'], ['delivered', 'cancelled'], true)) {
            return back()->withErrors([
                'status' => 'Technicians can only progress or complete jobs. Delivery and cancellation require cashier/front-desk access.',
            ]);
        }

        if ($isCashierLevel && isset($validated['status']) && !in_array($validated['status'], ['delivered', 'cancelled'], true)) {
            return back()->withErrors([
                'status' => 'Cashiers can only mark jobs as Delivered or Cancelled.',
            ]);
        }

        // Cashiers can mark a job as 'delivered' from any active status.
        // Only a cancelled job cannot be delivered.
        if ($isCashierLevel && isset($validated['status']) && $validated['status'] === 'delivered' && $serviceJob->status === 'cancelled') {
            return back()->withErrors([
                'status' => 'A cancelled service job cannot be marked as Delivered.',
            ]);
        }

        DB::beginTransaction();
        try {
            $updateData = [];

            $allowed = [
                'customer_name','customer_phone','customer_email','customer_address',
                'device_model','device_brand','device_warranty','device_serial','device_barcode',
                'assigned_technician_id','technician_notes','admin_notes','advanced_payment','paid_amount'
            ];

            foreach ($allowed as $field) {
                if (array_key_exists($field, $validated)) {
                    $updateData[$field] = $validated[$field];
                }
            }

            $statusChanged = false;
            if (array_key_exists('assigned_technician_id', $validated) && $validated['assigned_technician_id'] === null && in_array($serviceJob->status, ['assigned', 'in_progress', 'waiting_for_parts', 'quotation_received', 'quotation_rejected', 'quotation_approved'], true)) {
                $validated['status'] = 'pending';
            }

            if (isset($validated['status']) && $validated['status'] !== $serviceJob->status) {
                $updateData['status'] = $validated['status'];
                $statusChanged = true;
                if ($validated['status'] === 'completed' && !$serviceJob->actual_completion_date) {
                    $updateData['actual_completion_date'] = now()->toDateString();
                }
                if ($validated['status'] === 'delivered') {
                    if (!$serviceJob->delivered_date) {
                        $updateData['delivered_date'] = now()->toDateString();
                    }
                    if (!$serviceJob->actual_completion_date) {
                        $updateData['actual_completion_date'] = now()->toDateString();
                    }
                }
            }

            if (!empty($updateData)) {
                $serviceJob->update($updateData);
            }

            // Recalculate totals/balance
            $serviceJob->updateTotals();
            // Ensure the advance payment record stays in sync when advanced_payment changes.
            $this->syncAdvancePayment($serviceJob);

            if ($statusChanged) {
                $serviceJob->statusHistory()->create([
                    'status' => $serviceJob->status,
                    'notes' => $validated['technician_notes'] ?? 'Status updated',
                    'changed_by' => $authUser?->id ?? null,
                ]);
            }

            DB::commit();

            // If this is an Inertia request, return a proper Inertia redirect
            if ($request->header('X-Inertia')) {
                return redirect()->route('service-jobs.show', $serviceJob);
            }

            // For non-Inertia JSON API clients, return JSON
            if ($request->wantsJson() && !$request->header('X-Inertia')) {
                return response()->json(['success' => true, 'job' => $serviceJob]);
            }

            return back()->with('success', 'Service job updated successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Service job update error: ' . $e->getMessage());
            if ($request->header('X-Inertia')) {
                return redirect()->back()->withErrors(['error' => 'Failed to update service job: ' . $e->getMessage()]);
            }

            if ($request->wantsJson() && !$request->header('X-Inertia')) {
                return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
            }

            return back()->withErrors(['error' => 'Failed to update service job: ' . $e->getMessage()]);
        }
    }

    public function quotationsIndex(Request $request)
    {
        if (!request()->user()->hasPermission('quotations.view')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view quotations.');
        }

        $query = \App\Models\Quotation::with(['serviceJob.customer', 'createdBy'])
            ->latest();

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->whereHas('serviceJob', function($q2) use ($search) {
                    $q2->where('job_number', 'like', "%{$search}%")
                       ->orWhere('customer_name', 'like', "%{$search}%");
                });
            });
        }

        $perPage = (int) $request->input('per_page', 20);
        if (!in_array($perPage, [10, 20, 25, 50, 100], true)) {
            $perPage = 20;
        }

        $quotations = $query->paginate($perPage);

        return Inertia::render('ServiceJobs/QuotationsIndex', [
            'quotations' => $quotations,
            'filters' => $request->only(['search', 'per_page']),
        ]);
    }

    public function viewQuotation(\App\Models\Quotation $quotation)
    {
        if (!request()->user()->hasPermission('quotations.view')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view quotations.');
        }

        // Load relationships
        $quotation->load(['serviceJob.customer', 'createdBy']);
        
        $company = Company::first();

        return Inertia::render('ServiceJobs/ViewQuotation', [
            'quotation' => [
                'id' => $quotation->id,
                'service_job_id' => $quotation->service_job_id,
                'total_amount' => $quotation->total_amount,
                'notes' => $quotation->notes,
                'items' => $quotation->items,
                'created_at' => $quotation->created_at,
                'service_job' => [
                    'id' => $quotation->serviceJob->id,
                    'job_number' => $quotation->serviceJob->job_number,
                    'customer_name' => $quotation->serviceJob->customer_name,
                    'customer_phone' => $quotation->serviceJob->customer_phone,
                    'device_type' => $quotation->serviceJob->device_type,
                    'device_brand' => $quotation->serviceJob->device_brand,
                    'device_model' => $quotation->serviceJob->device_model,
                    'device_serial' => $quotation->serviceJob->device_serial,
                ],
                'created_by' => $quotation->createdBy ? [
                    'first_name' => $quotation->createdBy->first_name,
                    'last_name' => $quotation->createdBy->last_name,
                ] : null,
            ],
            'company' => $company,
        ]);
    }

    public function createQuotationPage(ServiceJob $serviceJob)
    {
        if (!request()->user()->hasPermission('quotations.create')) {
            return redirect()->route('service-jobs.show', $serviceJob)->with('error', 'Unauthorized. You do not have permission to create quotations.');
        }

        // Load necessary relationships
        $serviceJob->load('items.itemMaster', 'customer');
        
        // Get service charges for quick add
        $serviceCharges = ServiceCharge::where('is_active', true)
            ->get()
            ->map(function ($charge) {
                return [
                    'id' => $charge->id,
                    'charge_name' => $charge->charge_name,
                    'charge_value' => $charge->amount,
                    'description' => $charge->description ?? null,
                ];
            });

        // Get technicians if needed
        $technicians = User::where('is_active', true)->get(['id', 'first_name', 'last_name']);

        return Inertia::render('ServiceJobs/CreateQuotation', [
            'job' => [
                'id' => $serviceJob->id,
                'job_number' => $serviceJob->job_number,
                'customer_name' => $serviceJob->customer?->CustNm ?? 'N/A',
            ],
            'serviceCharges' => $serviceCharges,
            'technicians' => $technicians,
        ]);
    }

    public function createQuotation(Request $request)
    {
        if (!request()->user()->hasPermission('quotations.create')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to create quotations.');
        }

        /** @var User|null $authUser */
        $authUser = Auth::user();
        
        try {
            $validated = $request->validate([
                'service_job_id' => 'required|exists:service_jobs,id',
                'items' => 'required|json',
                'notes' => 'nullable|string',
                'total_amount' => 'required|numeric|min:0',
            ]);

            DB::beginTransaction();

            $quotation = \App\Models\Quotation::create([
                'service_job_id' => $validated['service_job_id'],
                'items' => json_decode($validated['items'], true),
                'notes' => $validated['notes'] ?? null,
                'total_amount' => $validated['total_amount'],
                'created_by' => $authUser?->id ?? null,
            ]);

            $serviceJob = ServiceJob::findOrFail($validated['service_job_id']);
            $isTerminalStatus = in_array($serviceJob->status, ['completed', 'delivered', 'cancelled'], true);

            if (!$isTerminalStatus && $serviceJob->status !== 'quotation_received') {
                $serviceJob->update(['status' => 'quotation_received']);
                $serviceJob->statusHistory()->create([
                    'status' => 'quotation_received',
                    'notes' => 'Quotation generated',
                    'changed_by' => $authUser?->id ?? null,
                ]);
            }

            DB::commit();

            if ($request->wantsJson()) {
                return response()->json([
                    'success' => true,
                    'quotation' => $quotation
                ], 201);
            }

            return back()->with('success', 'Quotation created successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Quotation creation error: ' . $e->getMessage());
            
            if ($request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'error' => $e->getMessage()
                ], 422);
            }

            return back()->withErrors(['error' => 'Failed to create quotation: ' . $e->getMessage()]);
        }
    }

    /**
     * Show the form for editing a quotation.
     */
    public function editQuotation(\App\Models\Quotation $quotation)
    {
        if (!request()->user()->hasPermission('quotations.edit')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to edit quotations.');
        }

        // Load the service job with relationships
        $serviceJob = $quotation->serviceJob;
        $serviceJob->load('items.itemMaster', 'customer');
        
        // Get service charges for quick add
        $serviceCharges = ServiceCharge::where('is_active', true)
            ->get()
            ->map(function ($charge) {
                return [
                    'id' => $charge->id,
                    'charge_name' => $charge->charge_name,
                    'charge_value' => $charge->amount,
                    'description' => $charge->description ?? null,
                ];
            });

        return Inertia::render('ServiceJobs/EditQuotation', [
            'quotation' => [
                'id' => $quotation->id,
                'items' => $quotation->items,
                'notes' => $quotation->notes,
                'total_amount' => $quotation->total_amount,
                'created_at' => $quotation->created_at->format('Y-m-d H:i:s'),
            ],
            'job' => [
                'id' => $serviceJob->id,
                'job_number' => $serviceJob->job_number,
                'customer_name' => $serviceJob->customer?->CustNm ?? 'N/A',
            ],
            'serviceCharges' => $serviceCharges,
        ]);
    }

    /**
     * Update the specified quotation.
     */
    public function updateQuotation(Request $request, \App\Models\Quotation $quotation)
    {
        if (!request()->user()->hasPermission('quotations.edit')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to edit quotations.');
        }

        /** @var User|null $authUser */
        $authUser = Auth::user();
        
        try {
            $validated = $request->validate([
                'items' => 'required|json',
                'notes' => 'nullable|string',
                'total_amount' => 'required|numeric|min:0',
            ]);

            $quotation->update([
                'items' => json_decode($validated['items'], true),
                'notes' => $validated['notes'] ?? null,
                'total_amount' => $validated['total_amount'],
            ]);

            if ($request->wantsJson()) {
                return response()->json([
                    'success' => true,
                    'quotation' => $quotation
                ], 200);
            }

            return redirect()->route('quotations.show', $quotation->id)
                ->with('success', 'Quotation updated successfully');
        } catch (\Exception $e) {
            Log::error('Quotation update error: ' . $e->getMessage());
            
            if ($request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'error' => $e->getMessage()
                ], 422);
            }

            return back()->withErrors(['error' => 'Failed to update quotation: ' . $e->getMessage()]);
        }
    }

    /**
     * Print a quotation using Blade template
     */
    public function printQuotation(\App\Models\Quotation $quotation)
    {
        if (!request()->user()->hasPermission('quotations.view')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view quotations.');
        }

        // Eager load all necessary relationships
        if (!$quotation->relationLoaded('serviceJob')) {
            $quotation->load(['serviceJob', 'createdBy']);
        }
        
        // Ensure serviceJob is loaded
        if (!$quotation->serviceJob) {
            return redirect()->back()->with('error', 'Quotation service job not found.');
        }
        
        $company = Company::where('company_code', auth()->user()->company_code)->first();
        $company = $company ?? Company::first();

        return view('service-jobs.quotations.print', [
            'quotation' => $quotation,
            'company' => $company,
        ]);
    }

    /**
     * Delete a quotation.
     */
    public function deleteQuotation(\App\Models\Quotation $quotation)
    {
        if (!request()->user()->hasPermission('quotations.delete')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to delete quotations.');
        }

        try {
            $quotation->delete();
            return redirect()->route('quotations.index')->with('success', 'Quotation deleted successfully.');
        } catch (\Exception $e) {
            Log::error('Quotation delete error: ' . $e->getMessage());
            return redirect()->route('quotations.index')->with('error', 'Failed to delete quotation.');
        }
    }

    /**
     * Debug endpoint to check stock in service section
     */
    public function debugStockCheck(Request $request)
    {
        $user = auth()->user();
        $sectionCode = $request->input('section_code', $user->section_code ?? 'VIS-SEC-002');
        
        // Get all stock in the specified section
        $stockRecords = DB::table('stock_in_hand')
            ->where('section_code', $sectionCode)
            ->select('ItemKy', 'batch_no', 'Qty', 'FreeQty', 'OrdDate', 'RefNo', 'TrnTyp', 'company_code')
            ->orderBy('ItemKy')
            ->orderBy('OrdDate', 'desc')
            ->get();

        // Group by ItemKy and calculate totals
        $summary = DB::table('stock_in_hand')
            ->where('section_code', $sectionCode)
            ->select('ItemKy', DB::raw('SUM(Qty + COALESCE(FreeQty, 0)) as total_qty'))
            ->groupBy('ItemKy')
            ->havingRaw('SUM(Qty + COALESCE(FreeQty, 0)) > 0')
            ->get();

        // Get item details
        $itemIds = $summary->pluck('ItemKy')->toArray();
        $items = DB::table('itemmaster')
            ->whereIn('ItmKy', $itemIds)
            ->select('ItmKy', 'ItemCode', 'ItmNm')
            ->get()
            ->keyBy('ItmKy');

        $enrichedSummary = $summary->map(function($row) use ($items) {
            $item = $items->get($row->ItemKy);
            return [
                'ItemKy' => $row->ItemKy,
                'ItemCode' => $item->ItemCode ?? 'N/A',
                'ItemName' => $item->ItmNm ?? 'N/A',
                'TotalQuantity' => $row->total_qty,
            ];
        });

        return response()->json([
            'user_section_code' => $user->section_code ?? 'NOT SET',
            'checked_section_code' => $sectionCode,
            'total_stock_records' => $stockRecords->count(),
            'items_with_stock' => $summary->count(),
            'stock_records' => $stockRecords,
            'summary' => $enrichedSummary,
        ]);
    }

    /**
     * Get available stock quantity for an item in a specific section and batch
     */
    private function getAvailableStock($itemKy, $sectionCode, $batchNo = null, $serialNumber = null)
    {
        $query = DB::table('stock_in_hand')
            ->where('ItemKy', $itemKy)
            ->where('section_code', $sectionCode);
        
        if ($batchNo) {
            $query->where('batch_no', $batchNo);
        }
        
        if ($serialNumber) {
            $query->where('serial_number', $serialNumber);
        }
        
        return $query->sum(DB::raw('Qty + COALESCE(FreeQty, 0)'));
    }

    /**
     * Deduct stock when adding a part to service job
     */
    private function deductServiceJobStock($itemKy, $quantity, $sourceSectionCode, $targetSectionCode, $batchNo = null, $serviceJobId = null, $serialNumber = null)
    {
        // Get reference stock record for metadata
        $referenceStock = DB::table('stock_in_hand')
            ->where('ItemKy', $itemKy)
            ->where('section_code', $sourceSectionCode);
        
        if ($batchNo) {
            $referenceStock->where('batch_no', $batchNo);
        }
        
        if ($serialNumber) {
            $referenceStock->where('serial_number', $serialNumber);
        }
        
        $referenceStock = $referenceStock
            ->whereRaw('(Qty + COALESCE(FreeQty, 0)) > 0')
            ->orderBy('OrdDate', 'asc')
            ->first();
        
        if (!$referenceStock) {
            throw new \Exception("No stock record found for item {$itemKy} in section {$sourceSectionCode}");
        }
        
        // Get section and company info
        $section = \App\Models\Section::where('section_code', $sourceSectionCode)->first();
        $companyCode = $section->company_code ?? Auth::user()->company_code;
        $company = Company::where('company_code', $companyCode)->first();
        $companyId = $company->id ?? null;

        $targetCompanyCode = $companyCode;
        $targetCompanyId = $companyId;
        
        if ($sourceSectionCode !== $targetSectionCode) {
            $targetSection = \App\Models\Section::where('section_code', $targetSectionCode)->first();
            $targetCompanyCode = $targetSection->company_code ?? $companyCode;
            $targetCompanyId = Company::where('company_code', $targetCompanyCode)->first()->id ?? null;

            // TRANSFER OUT from source
            \App\Models\StockInHand::create([
                'RefNo' => 'TRN-OUT-SJ-' . $serviceJobId,
                'company_code' => $companyCode,
                'owner_company_code' => $referenceStock->owner_company_code ?? $companyCode,
                'section_code' => $sourceSectionCode,
                'Cky' => $companyId,
                'OrdDate' => now()->toDateString(),
                'ItemKy' => $itemKy,
                'batch_no' => $batchNo ?: ($referenceStock->batch_no ?? null),
                'serial_number' => $serialNumber ?: ($referenceStock->serial_number ?? null),
                'Qty' => -$quantity,
                'FreeQty' => 0,
                'TrnTyp' => 'TRANSFER_OUT',
                'OrdKy' => $serviceJobId,
                'StkKy' => null,
                'OrdTypKy' => null,
                'CounterID' => Auth::id() ?? 0,
            ]);

            // TRANSFER IN to target
            \App\Models\StockInHand::create([
                'RefNo' => 'TRN-IN-SJ-' . $serviceJobId,
                'company_code' => $targetCompanyCode,
                'owner_company_code' => $referenceStock->owner_company_code ?? $companyCode,
                'section_code' => $targetSectionCode,
                'Cky' => $targetCompanyId,
                'OrdDate' => now()->toDateString(),
                'ItemKy' => $itemKy,
                'batch_no' => $batchNo ?: ($referenceStock->batch_no ?? null),
                'serial_number' => $serialNumber ?: ($referenceStock->serial_number ?? null),
                'Qty' => $quantity,
                'FreeQty' => 0,
                'TrnTyp' => 'TRANSFER_IN',
                'OrdKy' => $serviceJobId,
                'StkKy' => null,
                'OrdTypKy' => null,
                'CounterID' => Auth::id() ?? 0,
            ]);
        }
        
        // Create negative transaction for service job deduction using model
        $newStock = \App\Models\StockInHand::create([
            'RefNo' => 'SJ-OUT-' . $serviceJobId,
            'company_code' => $targetCompanyCode,
            'owner_company_code' => $referenceStock->owner_company_code ?? $companyCode,
            'section_code' => $targetSectionCode,
            'Cky' => $targetCompanyId,
            'OrdDate' => now()->toDateString(),
            'ItemKy' => $itemKy,
            'batch_no' => $batchNo ?: ($referenceStock->batch_no ?? null),
            'serial_number' => $serialNumber ?: ($referenceStock->serial_number ?? null),
            'Qty' => -$quantity,
            'FreeQty' => 0,
            'TrnTyp' => 'SERVICE_JOB',
            'OrdKy' => $serviceJobId,
            'StkKy' => null,
            'OrdTypKy' => null,
            'CounterID' => Auth::id() ?? 0,
        ]);
        
        Log::info('Service job stock deducted', [
            'service_job_id' => $serviceJobId,
            'item_ky' => $itemKy,
            'quantity' => $quantity,
            'batch_no' => $batchNo,
            'stock_record_id' => $newStock->TableKy,
        ]);
    }

    /**
     * Restore stock when removing a part from service job
     */
    private function restoreServiceJobStock($itemKy, $quantity, $sectionCode, $batchNo = null, $serviceJobId = null, $serialNumber = null)
    {
        // Get reference stock record for metadata
        $referenceStock = DB::table('stock_in_hand')
            ->where('ItemKy', $itemKy)
            ->where('section_code', $sectionCode);
        
        if ($batchNo) {
            $referenceStock->where('batch_no', $batchNo);
        }
        
        if ($serialNumber) {
            $referenceStock->where('serial_number', $serialNumber);
        }
        
        $referenceStock = $referenceStock
            ->orderBy('OrdDate', 'desc')
            ->first();
        
        if (!$referenceStock) {
            \Log::warning("No prior stock record found for item {$itemKy} in section {$sectionCode}. Proceeding with default values.");
        }
        
        // Get section and company info
        $section = \App\Models\Section::where('section_code', $sectionCode)->first();
        $companyCode = $section->company_code ?? Auth::user()->company_code;
        $company = Company::where('company_code', $companyCode)->first();
        $companyId = $company->id ?? null;
        
        // Create positive transaction to restore stock using model
        $newStock = \App\Models\StockInHand::create([
            'RefNo' => 'SJ-IN-' . $serviceJobId,
            'company_code' => $companyCode,
            'owner_company_code' => $referenceStock ? ($referenceStock->owner_company_code ?? $companyCode) : $companyCode,
            'section_code' => $sectionCode,
            'Cky' => $companyId,
            'OrdDate' => now()->toDateString(),
            'ItemKy' => $itemKy,
            'batch_no' => $batchNo ?: ($referenceStock ? ($referenceStock->batch_no ?? null) : null),
            'serial_number' => $serialNumber ?: ($referenceStock ? ($referenceStock->serial_number ?? null) : null),
            'Qty' => $quantity,
            'FreeQty' => 0,
            'TrnTyp' => 'SERVICE_JOB_RETURN',
            'OrdKy' => $serviceJobId,
            'StkKy' => null,
            'OrdTypKy' => null,
            'CounterID' => Auth::id() ?? 0,
        ]);
        
        Log::info('Service job stock restored', [
            'service_job_id' => $serviceJobId,
            'item_ky' => $itemKy,
            'quantity' => $quantity,
            'batch_no' => $batchNo,
            'stock_record_id' => $newStock->TableKy,
        ]);
    }

    /**
     * Fetch company logo and convert to Base64 for reliable printing and hosting.
     */
    private function getCompanyLogoBase64($company)
    {
        $logoBase64 = '';
        if (!$company) return $logoBase64;

        $companyCode = strtoupper($company->company_code ?? 'VIS');
        
        // Exact filenames (case-sensitive for Linux environments)
        $vismassPngCandidates = [
            public_path('images/Vismass-logo.png'), 
            public_path('images/vismass-logo.png')
        ];
        $malibuPngCandidates = [
            public_path('images/malibu-logo.png'), 
            public_path('images/Malibu-logo.png')
        ];

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
        return $logoBase64;
    }

    public function uploadPhotos(Request $request, ServiceJob $serviceJob)
    {
        $request->validate([
            'photos' => 'required|array|max:4',
            'photos.*' => 'image|mimes:jpeg,png,jpg|max:2048', // 2MB max per image, JPEG/PNG only
        ]);

        $currentPhotoCount = $serviceJob->photos()->count();
        if ($currentPhotoCount + count($request->file('photos')) > 4) {
            return back()->with('error', 'You can only upload a maximum of 4 photos per service job.');
        }

        foreach ($request->file('photos') as $photo) {
            $path = $photo->store("service-jobs/{$serviceJob->id}/photos", 'public');
            $serviceJob->photos()->create([
                'photo_path' => $path,
                'original_name' => $photo->getClientOriginalName(),
            ]);
        }

        return back()->with('success', 'Photos uploaded successfully.');
    }

    public function deletePhoto(ServiceJob $serviceJob, \App\Models\ServiceJobPhoto $photo)
    {
        if ($photo->service_job_id !== $serviceJob->id) {
            return back()->with('error', 'Unauthorized action.');
        }

        if (\Illuminate\Support\Facades\Storage::disk('public')->exists($photo->photo_path)) {
            \Illuminate\Support\Facades\Storage::disk('public')->delete($photo->photo_path);
        }

        $photo->delete();

        return back()->with('success', 'Photo deleted successfully.');
    }

    public function sendMessage(Request $request, ServiceJob $serviceJob)
    {
        $request->validate([
            'message' => 'required|string',
        ]);

        $serviceJob->messages()->create([
            'message' => $request->input('message'),
            'sent_by' => Auth::id(),
        ]);

        // Send SMS to customer
        try {
            if (!empty($serviceJob->customer_phone)) {
                $smsService = app(SmsService::class);
                $smsResult = $smsService->sendSms(
                    $serviceJob->customer_phone,
                    $request->input('message'),
                    $serviceJob->job_number,
                    'custom_message'
                );

                if (!$smsResult['success']) {
                    Log::warning('Failed to send custom SMS message to customer for service job: ' . $serviceJob->job_number);
                    return back()->with('success', 'Message saved, but failed to send SMS to customer.');
                }
            } else {
                return back()->with('success', 'Message saved. No customer phone number available for SMS.');
            }
        } catch (\Exception $e) {
            Log::error('SMS sending error for service job ' . $serviceJob->job_number . ': ' . $e->getMessage());
            return back()->with('success', 'Message saved, but an error occurred while sending SMS.');
        }

        return back()->with('success', 'Message sent successfully.');
    }
}

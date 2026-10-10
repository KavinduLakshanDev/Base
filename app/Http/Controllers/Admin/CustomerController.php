<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\CustomerPayment;
use App\Models\Section;
use App\Models\Company;
use App\Models\AccMas;
use App\Models\AccTrn;
use App\Models\Address;
use App\Models\ServiceJob;
use App\Models\SalesTransaction;
use App\Models\PrivilegeUser;
use App\Services\NumberGeneratorService;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class CustomerController extends Controller
{
    /**
     * Display a listing of customers.
     */
    public function index(Request $request): Response
    {
        if (!request()->user()->hasPermission('customers.view')) {
             return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view customers.');
        }

        $query = Customer::query();

        // Only show records where acc_mas.AccTyp = 'CUSTOMER'
        $query->whereHas('account', function ($q) {
            $q->where('AccTyp', 'CUSTOMER');
        });

        // Filter by company/section for non-superadmin users
        $user = $request->user();
        if ($user && $user->role_id !== 1) { // Not superadmin
            if ($user->role_id === 3) { // Branch/Section admin - filter by their section
                // Get the user's section to get the section_code string
                $userSection = Section::where('section_code', $user->section_code)->first();
                if ($userSection) {
                    $query->where('section_code', $userSection->section_code);
                } else {
                     // Fallback if user has section_code directly
                     $query->where('section_code', $user->section_code);
                }
            } else { // Company admin - filter by their company
                $query->where('company_code', $user->company_code);
            }
        }

        // Create a clone for stats before applying search/filters
        $statsQuery = clone $query;
        $totalCustomers = $statsQuery->count();
        $activeCustomers = (clone $statsQuery)->where('Status', 'A')->count();
        $inactiveCustomers = (clone $statsQuery)->where('Status', '!=', 'A')->count();

        // Search functionality
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('FstNm', 'like', "%{$search}%")
                    ->orWhere('CtPerson', 'like', "%{$search}%")
                    ->orWhere('AdrCd', 'like', "%{$search}%")
                    ->orWhere('Email', 'like', "%{$search}%")
                    ->orWhere('TP1', 'like', "%{$search}%")
                    ->orWhere('Address', 'like', "%{$search}%")
                    ->orWhere('Town', 'like', "%{$search}%")
                    ->orWhere('City', 'like', "%{$search}%");
            });
        }

        // Filter by active status
        if ($request->filled('status')) {
             // AddressController uses Status = 'A'
             $status = $request->status === 'active' ? 'A' : 'I';
            $query->where('Status', $status);
        }

        // Filter by company
        if ($request->filled('company_code')) {
            $query->where('company_code', $request->company_code);
        }

        // Filter by section
        if ($request->filled('section_code')) {
            $query->where('section_code', $request->section_code);
        }

        $perPage = $request->input('per_page', 10);
        if (!in_array($perPage, [10, 25, 50, 100])) {
            $perPage = 10;
        }

        $customers = $query->with('account')->orderBy('created_at', 'desc')->paginate($perPage)->withQueryString();
        
        // Transform for frontend
        $customers->through(function ($customer) {
            return [
                'AdrKy' => $customer->AdrKy,
                'AdrCd' => $customer->AdrCd,
                'full_name' => trim($customer->FstNm),
                'formatted_address' => $customer->Address,
                'EMail' => $customer->Email,
                'TP1' => $customer->TP1,
                'CPerson' => $customer->CtPerson,
                'BRNo' => $customer->BRNo,
                'TINNo' => $customer->TINNo,
                'flnAct' => $customer->Status === 'A',
                'CurBal' => $customer->calculateOutstandingBalance(),
                'CrLmt' => $customer->account?->CrLmt ?? 0,
                'created_at' => $customer->created_at,
            ];
        });

        // Get available companies and sections based on user role
        $user = $request->user();
        $companies = collect();
        $sections = collect();

        if ($user) {
            if ($user->role_id === 1) { // Superadmin - all companies and sections
                $companies = Company::all();
                $sections = Section::all();
            } elseif ($user->role_id === 2) { // Company admin - their company and its sections
                $companies = Company::where('company_code', $user->company_code)->get();
                $sections = Section::where('company_code', $user->company_code)->get();
            } elseif ($user->role_id === 3) { // Section admin - their company and section
                $companies = Company::where('company_code', $user->company_code)->get();
                $userSection = Section::where('section_code', $user->section_code)->first();
                if ($userSection) {
                    $sections = collect([$userSection]);
                }
            }
        }

        return Inertia::render('admin/customers/index', [
            'customers' => $customers,
            'stats' => [ // Pass stats to frontend
                'total' => $totalCustomers,
                'active' => $activeCustomers,
                'inactive' => $inactiveCustomers,
            ],
            'filters' => $request->only(['search', 'status', 'company_code', 'section_code']),
            'companies' => $companies->map(function ($company) {
                return [
                    'value' => $company->company_code,
                    'label' => $company->company_name,
                ];
            }),
            'branches' => $sections->map(function ($section) { // Frontend expects 'branches'
                return [
                    'value' => $section->section_code,
                    'label' => $section->name,
                ];
            }),
        ]);
    }

    /**
     * Export all customers matching the current filters as CSV.
     */
    public function export(Request $request)
    {
        if (!request()->user()->hasPermission('customers.view')) {
             return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view customers.');
        }

        $query = Customer::query();
        $query->whereHas('account', function ($q) {
            $q->where('AccTyp', 'CUSTOMER');
        });

        // Filter by company/section for non-superadmin users
        $user = $request->user();
        if ($user && $user->role_id !== 1) { // Not superadmin
            if ($user->role_id === 3) { // Branch/Section admin
                $userSection = Section::where('section_code', $user->section_code)->first();
                if ($userSection) {
                    $query->where('section_code', $userSection->section_code);
                } else {
                    $query->where('section_code', $user->section_code);
                }
            } else { // Company admin
                $query->where('company_code', $user->company_code);
            }
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('FstNm', 'like', "%{$search}%")
                    ->orWhere('CtPerson', 'like', "%{$search}%")
                    ->orWhere('AdrCd', 'like', "%{$search}%")
                    ->orWhere('Email', 'like', "%{$search}%")
                    ->orWhere('TP1', 'like', "%{$search}%")
                    ->orWhere('Address', 'like', "%{$search}%")
                    ->orWhere('Town', 'like', "%{$search}%")
                    ->orWhere('City', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
             $status = $request->status === 'active' ? 'A' : 'I';
            $query->where('Status', $status);
        }

        if ($request->filled('company_code')) {
            $query->where('company_code', $request->company_code);
        }

        if ($request->filled('section_code')) {
            $query->where('section_code', $request->section_code);
        }

        $customers = $query->with('account')->orderBy('created_at', 'desc')->get();

        $filename = "Customers_Export_" . date('Ymd_His') . ".csv";
        $headers = [
            "Content-type"        => "text/csv",
            "Content-Disposition" => "attachment; filename=$filename",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0"
        ];

        $columns = ['Code', 'Name', 'Contact Person', 'Email', 'Phone', 'Address', 'Credit Limit', 'Status'];

        $callback = function() use($customers, $columns) {
            $file = fopen('php://output', 'w');
            fputcsv($file, $columns);

            foreach ($customers as $c) {
                fputcsv($file, [
                    $c->AdrCd,
                    $c->FstNm,
                    $c->CtPerson,
                    $c->Email,
                    $c->TP1,
                    $c->Address,
                    $c->account ? number_format($c->account->CrLmt, 2, '.', '') : '0.00',
                    $c->Status === 'A' ? 'Active' : 'Inactive'
                ]);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Show the form for creating a new customer.
     */
    public function create(): Response
    {
        if (!request()->user()->hasPermission('customers.create')) {
             return redirect()->back()->with('error', 'Unauthorized. You do not have permission to create customers.');
        }

        $user = Auth::user();
        $companies = collect();

        // Get available companies based on user role
        if ($user && $user->role_id !== 1) { // Not superadmin
            if ($user->role_id === 2 || $user->role_id === 3) { // Company or section admin - their company
                $companies = Company::where('company_code', $user->company_code)->get();
            }
        } else {
            // Super admin - get all companies
            $companies = Company::all();
        }

        return Inertia::render('admin/customers/create');
    }

    /**
     * Store a newly created customer in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        if (!request()->user()->hasPermission('customers.create')) {
             return redirect()->back()->with('error', 'Unauthorized. You do not have permission to create customers.');
        }

        Log::info('Customer store initiated', $request->all());
        $user = Auth::user();

        $validated = $request->validate([
            'FstNm' => ['required_without:CtPerson', 'nullable', 'string', 'max:60'],
            'LstNm' => ['nullable', 'string', 'max:60'],
            'CtPerson' => ['required_without:FstNm', 'nullable', 'string', 'max:100'],
            'Address' => ['nullable', 'string', 'max:250'],
            'AddressLine2' => ['nullable', 'string', 'max:250'],
            'Locality' => ['nullable', 'string', 'max:100'],
            'Country' => ['nullable', 'string', 'max:60'],
            'Town' => ['nullable', 'string', 'max:100'],
            'City' => ['nullable', 'string', 'max:100'],
            'PostalCode' => ['nullable', 'string', 'max:20'],
            'TP1' => [
                'nullable', 
                'digits:10',
                \Illuminate\Validation\Rule::unique('address')->where(function ($query) use ($user) {
                    return $query->where('company_code', $user ? $user->company_code : null);
                })
            ],
            'TP2' => ['nullable', 'string', 'max:20'],
            'Fax' => ['nullable', 'string', 'max:14'],
            'Email' => ['nullable', 'email', 'max:60'],
            'Website' => ['nullable', 'url', 'max:60'],
            'fVATRegistered' => ['boolean'],
            'VATNo' => ['nullable', 'string', 'max:50'],
            'IDNo' => ['nullable', 'string', 'max:20'],
            'BRNo' => ['nullable', 'string', 'max:50'],
            'TINNo' => ['nullable', 'string', 'max:50'],
            'Title' => ['required', 'string', 'max:30'],
            'CurBal' => ['nullable', 'string'],
            'CrLmt' => ['nullable', 'string'],
            // privilege user options
            'register_as_privilege' => ['boolean'],
            'privilege_card_no' => ['nullable', 'string', 'max:50'],
            ], [
            'FstNm.required_without' => 'First Name is required when Business Name is not provided.',
            'CtPerson.required_without' => 'Business Name is required when First Name is not provided.',
            'TP1.unique' => 'This phone number is already registered to an existing customer in your company.',
            'TP1.digits' => 'Phone number must be exactly 10 digits.'
        ]);
        Log::info('Validation passed');

        try {
            DB::beginTransaction();

            // Get authenticated user for company/section context
            $user = Auth::user();

            // Determine section based on user's company
            $section = null;
            if ($user && $user->company_code) {
                $targetSectionCode = null;
                if ($user->company_code === 'VIS001') {
                    $targetSectionCode = 'VIS-SEC-002';
                } elseif ($user->company_code === 'MAL001') {
                    $targetSectionCode = 'MAL-SEC-002';
                }

                if ($targetSectionCode) {
                    $section = Section::where('company_code', $user->company_code)
                        ->where('section_code', $targetSectionCode)
                        ->first();
                }

                // Fallback if specific section not found
                if (!$section) {
                    $section = Section::where('company_code', $user->company_code)
                        ->where('is_active', true)
                        ->orderBy('is_main_stock', 'desc')
                        ->first();
                }
            }
            
            if (!$section) {
                throw new \Exception('No valid section found for your company.');
            }
            
            Log::info('Section found: ' . $section->section_code);

            // if privilege registration requested, check uniqueness of card
            if (!empty($validated['register_as_privilege']) && $validated['register_as_privilege']) {
                $card = $validated['privilege_card_no'] ?? null;
                if (!$card) {
                    throw new \Exception('Card number required when registering as privilege user.');
                }
                $companyCode = $section->company_code;

                // check if card is already used by someone else in this company
                $dup = \App\Models\Customer::where('privilege_card_no', $card)->where('company_code', $companyCode);
                
                // if we are updating, we should exclude the current customer, but this is the 'store' method so it's a new customer
                if ($dup->exists()) {
                    throw new \Exception('Privilege card number already in use for this company.');
                }
            }

            // Authorization check - users can only create customers in their own company
            if ($user->role_id === 3) { 
                if ($section->section_code !== $user->section_code) {
                    throw new \Exception('Unauthorized section access.');
                }
            }

            // Generate unique customer code (sequential like CUS001, CUS002, etc.) using thread-safe Sequence
            // Company-specific sequence to avoid conflicts between Vismass and Malibo
            $companyCode = $section->company_code;

            // look for existing privilege user by phone (may be updated later)
            $existingPrivilege = null;
            if ($request->filled('TP1')) {
                $existingPrivilege = PrivilegeUser::where('company_code', $companyCode)
                    ->where('phone', $request->TP1)
                    ->first();
            }

            $sequenceName = "customer_code_{$companyCode}";
            
            do {
                $nextVal = \App\Models\Sequence::incrementSequence($sequenceName, function() use ($companyCode) {
                    // Initializer: Find the max number from existing customers with format CUSxxx for this company
                    // Cast the substring after 'CUS' (which starts at index 4) to integer for correct numeric comparison
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
            
            Log::info('Customer Code generated via Sequence for company ' . $companyCode . ': ' . $customerCode);

            // Create Account Master record
            $fullName = trim(($validated['FstNm'] ?? '') . ' ' . ($validated['LstNm'] ?? ''));
            if (empty($fullName)) {
                $fullName = $validated['CtPerson'] ?? 'Unknown';
            }
            $accData = [
                'AccCd' => $customerCode,
                'AccNm' => $fullName,
                'AccTyp' => 'CUSTOMER',
                'company_code' => $section->company_code,
                'section_code' => $section->section_code,
                'Status' => 'A',
                'CurBal' => (float)($validated['CurBal'] ?? 0),
                'CrLmt' => (float)($validated['CrLmt'] ?? 0),
                'opening_balance' => (float)($validated['CurBal'] ?? 0),
                'fVATRegistered' => $validated['fVATRegistered'] ?? false,
                'VATNo' => $validated['VATNo'] ?? null,
                'uuid' => (string) \Illuminate\Support\Str::uuid(),
            ];
            Log::info('Creating AccMas', $accData);
            $account = AccMas::create($accData);

            // Final data preparation
            $customerData = [
                'company_code' => $section->company_code,
                'section_code' => $section->section_code,
                'AdrCd' => $customerCode,
                'FstNm' => $validated['FstNm'] ?? null,
                'LstNm' => $validated['LstNm'] ?? null,
                // CtPerson is optional; default to null if not provided
                'CtPerson' => $validated['CtPerson'] ?? null,
                'Address' => $validated['Address'],
                'AddressLine2' => $validated['AddressLine2'] ?? null,
                'Locality' => $validated['Locality'] ?? null,
                'Country' => $validated['Country'] ?? null,
                'Town' => $validated['Town'] ?? null,
                'City' => $validated['City'] ?? null,
                'PostalCode' => $validated['PostalCode'] ?? null,
                'TP1' => $validated['TP1'],
                'TP2' => $validated['TP2'] ?? null,
                'Fax' => $validated['Fax'] ?? null,
                'Email' => $validated['Email'] ?? null,
                'Website' => $validated['Website'] ?? null,
                'IDNo' => $validated['IDNo'] ?? null,
                'BRNo' => $validated['BRNo'] ?? null,
                'TINNo' => $validated['TINNo'] ?? null,
                'Title' => $validated['Title'],
                'Status' => 'A',
                'uuid' => (string) \Illuminate\Support\Str::uuid(),
                'AccKy' => $account->AccKy,
                'VATNo' => $validated['VATNo'] ?? null,
                'AdrTypKy' => 1, // 1 for Customer
                'is_privilege_user' => !empty($validated['register_as_privilege']) && $validated['register_as_privilege'],
                'privilege_card_no' => $validated['privilege_card_no'] ?? null,
            ];
            
            Log::info('Creating Customer', $customerData);
            // Create customer record
            $customer = Customer::create($customerData);

            // Send registration confirmation SMS
            if (!empty($validated['register_as_privilege']) && $validated['register_as_privilege'] && !empty($validated['TP1'])) {
                $phone = $validated['TP1'];
                $name = trim($validated['FstNm']);
                try {
                    $otpService = new \App\Services\OtpService(new \App\Services\SmsService());
                    $smsResult = $otpService->sendRegistrationConfirmation(
                        $phone,
                        'privilege_user_registration',
                        $name
                    );
                    if ($smsResult['success']) {
                        Log::info('Privilege customer SMS sent after customer creation', [
                            'phone' => $phone,
                            'name' => $name,
                        ]);
                    } else {
                        Log::warning('Privilege customer SMS failed after customer creation', [
                            'phone' => $phone,
                            'error' => $smsResult['message'],
                        ]);
                    }
                } catch (\Exception $e) {
                    Log::error('Exception while sending privilege SMS', [
                        'phone' => $phone,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            DB::commit();
            Log::info('Transaction committed');

            $createdCustomer = [
                'AccKy' => $account->AccKy,
                'AdrKy' => $customer->AdrKy,
                'AccCd' => $account->AccCd,
                'full_name' => trim($customer->FstNm . ' ' . ($customer->LstNm ?? '')),
                'EMail' => $customer->Email,
                'TP1' => $customer->TP1,
                'Address' => $customer->Address,
                'created_privilege' => !empty($validated['register_as_privilege']) && $validated['register_as_privilege'],
                'privilege_card_no' => $validated['privilege_card_no'] ?? null,
            ];

            if ($request->filled('return_to')) {
                return redirect($request->input('return_to'))
                    ->with('success', 'Customer registered successfully.')
                    ->with('created_customer', $createdCustomer);
            }

            // Handle the new action for going to service form
            if ($request->input('action') === 'register_and_go_to_service') {
                return redirect('/service-jobs/create')
                    ->with('success', 'Customer registered successfully. You can now create a service job.')
                    ->with('created_customer', $createdCustomer);
            }

            return redirect()->route('admin.customers.index')
                ->with('success', 'Customer registered successfully.')
                ->with('created_customer', $createdCustomer);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Customer creation failed: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            return back()
                ->withInput()
                ->with('error', 'Failed to register customer: ' . $e->getMessage());
        }
    }

    /**
     * Display the specified customer.
     */
    public function show(Customer $customer): Response
    {
        if (!request()->user()->hasPermission('customers.view')) {
             return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view customers.');
        }

        // Authorization check
        $user = Auth::user();
        if ($user->role_id === 3) { 
            if ($customer->section_code !== $user->section_code) {
                return redirect()->back()->with('error', 'You can only view customers from your own section.');
            }
        } elseif ($user->role_id === 2) { 
            if ($customer->company_code !== $user->company_code) {
                return redirect()->back()->with('error', 'You can only view customers from your company.');
            }
        }

        // look for privilege user record to obtain card number
        $privRecord = PrivilegeUser::where('company_code', $customer->company_code)
            ->where('phone', $customer->TP1)
            ->first();

        // Calculate actual outstanding balance
        $outstandingBalance = $customer->calculateOutstandingBalance();
        $isCredit = $outstandingBalance < 0;
        $displayBalance = $isCredit ? abs($outstandingBalance) : $outstandingBalance;

        return Inertia::render('admin/customers/show', [
            'customer' => [
                'AdrKy' => $customer->AdrKy,
                'AdrCd' => $customer->AdrCd,
                'full_name' => trim($customer->FstNm),
                'formatted_address' => $customer->Address,
                'EMail' => $customer->Email,
                'TP1' => $customer->TP1,
                'CPerson' => $customer->CtPerson,
                'flnAct' => $customer->Status === 'A',
                'created_at' => $customer->created_at,
                'updated_at' => $customer->updated_at,
                'Address' => $customer->Address,
                'Country' => $customer->Country,
                'WebSite' => $customer->Website,
                'fVATRegistered' => $customer->fVATRegistered,
                'VATNo' => $customer->VATNo,
                'Status' => $customer->Status,
                'IDNo' => $customer->IDNo,
                'Title' => $customer->Title,
                'FstNm' => $customer->FstNm,
                // New calculated balance fields
                'outstanding_balance' => $outstandingBalance,
                'display_balance' => $displayBalance,
                'is_credit' => $isCredit,
                // Legacy fields
                'CurBal' => $customer->account?->CurBal ?? 0,
                'CrLmt' => $customer->account?->CrLmt ?? 0,
                'Fax' => $customer->Fax,
                // include privilege indicator and card number
                'is_privilege' => (bool) $customer->is_privilege_user,
                'privilege_card_no' => $customer->privilege_card_no,
            ],
        ]);
    }
    /**
     * Show the form for editing the specified customer.
     */
    public function edit($id)
    {
        if (!request()->user()->hasPermission('customers.edit')) {
             return redirect()->back()->with('error', 'Unauthorized. You do not have permission to edit customers.');
        }

        $customer = Customer::findOrFail($id);

        // Authorization check
        $user = Auth::user();
        if ($user->role_id === 3) { 
            if ($customer->section_code !== $user->section_code) {
                return redirect()->back()->with('error', 'You can only edit customers from your own section.');
            }
        } elseif ($user->role_id === 2) { 
            if ($customer->company_code !== $user->company_code) {
                return redirect()->back()->with('error', 'You can only edit customers from your company.');
            }
        }

        // lookup privilege user by phone OR, fallback to card number if phone changed?
        $privilege = PrivilegeUser::where('company_code', $customer->company_code)
            ->where(function ($q) use ($customer) {
                $q->where('phone', $customer->TP1);
                // if phone no longer matches but there is a card stored previously in address?
                // we don't have card on address so ignore for now
            })->first();

        $companies = collect();

        // Get available companies based on user role
        if ($user && $user->role_id !== 1) { // Not superadmin
            if ($user->role_id === 2 || $user->role_id === 3) { // Company or section admin - their company
                $companies = Company::where('company_code', $user->company_code)->get();
            }
        } else {
            // Super admin - get all companies
            $companies = Company::all();
        }

        // Flatten account fields into the customer object for the frontend
        $customer->CurBal = $customer->account?->CurBal ?? 0;
        $customer->CrLmt = $customer->account?->CrLmt ?? 0;

        return Inertia::render('admin/customers/edit', [
            'customer' => $customer,
            'privilege' => [
                'card_no' => $customer->privilege_card_no,
            ],
        ]);
    }

    /**
     * Update the specified customer in storage.
     */
    public function update(Request $request, $id)
    {
        if (!request()->user()->hasPermission('customers.edit')) {
             return redirect()->back()->with('error', 'Unauthorized. You do not have permission to edit customers.');
        }

        $customer = Customer::findOrFail($id);

        // Authorization check
        $user = Auth::user();
        if ($user->role_id === 3) { 
            if ($customer->section_code !== $user->section_code) {
                return back()
                    ->with('error', 'You can only update customers from your own section.');
            }
        } elseif ($user->role_id === 2) { 
            if ($customer->company_code !== $user->company_code) {
                return back()
                    ->with('error', 'You can only update customers from your company.');
            }
        }

        $validated = $request->validate([
            'FstNm' => ['required_without:CtPerson', 'nullable', 'string', 'max:60'],
            'LstNm' => ['nullable', 'string', 'max:60'],
            'CtPerson' => ['required_without:FstNm', 'nullable', 'string', 'max:100'],
            'Address' => ['nullable', 'string', 'max:250'],
            'AddressLine2' => ['nullable', 'string', 'max:250'],
            'Locality' => ['nullable', 'string', 'max:100'],
            'Town' => ['nullable', 'string', 'max:100'],
            'City' => ['nullable', 'string', 'max:100'],
            'PostalCode' => ['nullable', 'string', 'max:20'],
            'Country' => ['nullable', 'string', 'max:60'],
            'TP1' => [
                'nullable', 
                'digits:10',
                \Illuminate\Validation\Rule::unique('address')->where(function ($query) use ($user) {
                    return $query->where('company_code', $user ? $user->company_code : null);
                })->ignore($id, 'AdrKy')
            ],
            'TP2' => ['nullable', 'string', 'max:20'],
            'Fax' => ['nullable', 'string', 'max:14'],
            'Email' => ['nullable', 'email', 'max:60'],
            'Website' => ['nullable', 'url', 'max:60'],
            'fVATRegistered' => ['boolean'],
            'VATNo' => ['nullable', 'string', 'max:50'],
            'IDNo' => ['nullable', 'string', 'max:20'],
            'BRNo' => ['nullable', 'string', 'max:50'],
            'TINNo' => ['nullable', 'string', 'max:50'],
            'Title' => ['required', 'string', 'max:30'],
            'CurBal' => ['nullable', 'string'],
            'CrLmt' => ['nullable', 'string'],
            'Status' => ['nullable', 'string'],
            // privilege options
            'register_as_privilege' => ['boolean'],
            'privilege_card_no' => ['nullable', 'string', 'max:50'],
            ], [
            'FstNm.required_without' => 'First Name is required when Business Name is not provided.',
            'CtPerson.required_without' => 'Business Name is required when First Name is not provided.',
            'TP1.unique' => 'This phone number is already registered to another customer in your company.',
            'TP1.digits' => 'Phone number must be exactly 10 digits.'
        ]);

        DB::beginTransaction();

        try {
            // ensure optional keys are present when updating to avoid undefined index
            $updateData = $validated;
            $updateData['CtPerson'] = $validated['CtPerson'] ?? null;
            $updateData['Country'] = $validated['Country'] ?? null;
            $updateData['Fax'] = $validated['Fax'] ?? null;
            $updateData['Email'] = $validated['Email'] ?? null;
            $updateData['Website'] = $validated['Website'] ?? null;
            $updateData['IDNo'] = $validated['IDNo'] ?? null;
            
            // Privilege fields
            if (isset($validated['register_as_privilege'])) {
                $updateData['is_privilege_user'] = $validated['register_as_privilege'];
                if ($validated['register_as_privilege']) {
                    $updateData['privilege_card_no'] = $validated['privilege_card_no'] ?? null;
                }
            }

            $customer->update($updateData);

            // Update Account Master with financial and VAT info
            AccMas::where('AccKy', $customer->AccKy)->update([
                'CrLmt' => (float)($validated['CrLmt'] ?? 0),
                'fVATRegistered' => $validated['fVATRegistered'] ?? false,
                'VATNo' => $validated['VATNo'] ?? null,
            ]);

            // Send SMS if newly registered as privilege
            if (!empty($validated['register_as_privilege']) && $validated['register_as_privilege'] && !$customer->is_privilege_user) {
                $phone = $validated['TP1'];
                $name = trim($validated['FstNm']);
                if (!empty($phone)) {
                    try {
                        $otpService = new \App\Services\OtpService(new \App\Services\SmsService());
                        $smsResult = $otpService->sendRegistrationConfirmation(
                            $phone,
                            'privilege_user_registration',
                            $name
                        );
                        if ($smsResult['success']) {
                            Log::info('Privilege customer SMS sent after customer update', [
                                'phone' => $phone,
                                'name' => $name,
                            ]);
                        } else {
                            Log::warning('Privilege customer SMS failed after customer update', [
                                'phone' => $phone,
                                'error' => $smsResult['message'],
                            ]);
                        }
                    } catch (\Exception $e) {
                        Log::error('Exception while sending privilege SMS on update', [
                            'phone' => $phone,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }
            }

            DB::commit();

            return redirect()
                ->route('admin.customers.index')
                ->with('success', 'Customer updated successfully!');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()
                ->withInput()
                ->withErrors(['error' => 'Failed to update customer: ' . $e->getMessage()]);
        }
    }

    /**
     * Remove the specified customer from storage.
     */
    // public function destroy(Customer $customer): RedirectResponse
    // {
    //     if (!request()->user()->hasPermission('customers.delete')) {
    //          return redirect()->back()->with('error', 'Unauthorized. You do not have permission to delete customers.');
    //     }

    //     // Authorization check
    //     $user = Auth::user();
    //     if ($user->role_id === 3) { 
    //         if ($customer->section_code !== $user->section_code) {
    //             return back()
    //                 ->with('error', 'You can only delete customers from your own section.');
    //         }
    //     } elseif ($user->role_id === 2) { 
    //         if ($customer->company_code !== $user->company_code) {
    //             return back()
    //                 ->with('error', 'You can only delete customers from your company.');
    //         }
    //     }

    //     try {
    //         DB::beginTransaction();
            
    //         // Get the customer name for the success message
    //         $customerName = $customer->FstNm;
    //         $customerCode = $customer->AdrCd;
            
    //         // Get AccKy from the customer's account relationship
    //         $accKy = null;
    //         if ($customer->account) {
    //             $accKy = $customer->account->AccKy;
    //         }
            
    //         // Delete the customer address record
    //         $customer->delete();
            
    //         // If there's an associated AccMas record, delete it too
    //         if ($accKy) {
    //             AccMas::where('AccKy', $accKy)->delete();
    //         }
            
    //         DB::commit();
            
    //         Log::info("Customer deleted successfully", [
    //             'customer_code' => $customerCode,
    //             'customer_name' => $customerName,
    //             'deleted_by' => $user->id
    //         ]);

    //         return redirect()->route('admin.customers.index')
    //             ->with('success', "Customer '{$customerName}' ({$customerCode}) deleted successfully from database.");
    //     } catch (\Exception $e) {
    //         DB::rollBack();
            
    //         Log::error("Failed to delete customer", [
    //             'customer_id' => $customer->AdrKy,
    //             'error' => $e->getMessage()
    //         ]);
            
    //         return back()
    //             ->with('error', 'Failed to delete customer: ' . $e->getMessage());
    //     }
    // }

    /**
     * Toggle customer active status.
     */
    public function toggle(Customer $customer): RedirectResponse
    {
        if (!request()->user()->hasPermission('customers.edit')) {
             return redirect()->back()->with('error', 'Unauthorized. You do not have permission to edit customers.');
        }

        // Authorization check
        $user = Auth::user();
        if ($user->role_id === 3) { 
            if ($customer->section_code !== $user->section_code) {
                return back()
                    ->with('error', 'You can only modify customers from your own section.');
            }
        } elseif ($user->role_id === 2) { 
            if ($customer->company_code !== $user->company_code) {
                return back()
                    ->with('error', 'You can only modify customers from your company.');
            }
        }

        try {
            $newStatus = $customer->Status === 'A' ? 'I' : 'A';
            $customer->update(['Status' => $newStatus]);

            // If this customer is also a privilege user, keep that record in sync.
            // We look up by company_code + phone since address does not store card number.
            if ($customer->TP1) {
                $privQuery = PrivilegeUser::where('company_code', $customer->company_code)
                    ->where('phone', $customer->TP1);

                if ($newStatus === 'A') {
                    // reactivate privilege record when customer is activated
                    $privQuery->update([
                        'is_active' => true,
                        'finAct' => true,
                    ]);
                } else {
                    // deactivate privilege record when customer is deactivated
                    $privQuery->update([
                        'is_active' => false,
                        'finAct' => false,
                    ]);
                }
            }

            $status = $newStatus === 'A' ? 'activated' : 'deactivated';

            return redirect()->back()
                ->with('success', "Customer {$status} successfully.");
        } catch (\Exception $e) {
            return back()
                ->with('error', 'Failed to toggle customer status: ' . $e->getMessage());
        }
    }

    /**
     * Generate a unique privilege customer_code (avoids duplicates if sequence is out-of-sync).
     */
    private function generateUniquePrivilegeCustomerCode(NumberGeneratorService $generator, string $companyCode, string $sectionCode): string
    {
        $attempts = 0;
        do {
            $code = $generator->generate('privilege_user', $companyCode, $sectionCode);
            $exists = PrivilegeUser::where('customer_code', $code)->exists();
            $attempts++;

            if ($attempts > 50) {
                throw new \RuntimeException('Unable to generate unique privilege customer code after multiple attempts.');
            }
        } while ($exists);

        return $code;
    }

    /**
     * Display customer payments management page.
     */
    public function paymentsIndex(): Response
    {
        if (!request()->user()->hasPermission('customer_payments.view')) {
             return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view customer payments.');
        }

        return Inertia::render('admin/customer-payments/index');
    }

    /**
     * Search customers for payment management.
     */
    public function searchCustomers(Request $request)
    {
        if (!request()->user()->hasPermission('customers.view')) {
             return response()->json(['error' => 'Unauthorized'], 403);
        }

        $query = Customer::query();

        // Only show records where acc_mas.AccTyp = 'CUSTOMER'
        $query->whereHas('account', function ($q) {
            $q->where('AccTyp', 'CUSTOMER');
        });

        $user = $request->user();
        if ($user && $user->role_id !== 1) { // Not superadmin
            if ($user->role_id === 3) {
                $query->where('section_code', $user->section_code);
            } else {
                $query->where('company_code', $user->company_code);
            }
        } else if ($user && $user->role_id === 1) { // Superadmin
            $selectedCompany = session('selected_company');
            if ($selectedCompany) {
                $query->where('company_code', $selectedCompany);
            }
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('FstNm', 'like', "%{$search}%")
                    ->orWhere('LstNm', 'like', "%{$search}%")
                    ->orWhere('AdrCd', 'like', "%{$search}%")
                    ->orWhere('TP1', 'like', "%{$search}%");
            });
        }

        $customers = $query->limit(20)->get()->map(function ($customer) {
            return [
                'AdrKy' => $customer->AdrKy,
                'AdrCd' => $customer->AdrCd,
                'full_name' => trim($customer->FstNm . ' ' . ($customer->LstNm ?? '')),
                'TP1' => $customer->TP1,
                'Address' => $customer->Address,
            ];
        });

        return response()->json($customers);
    }

    /**
     * Get outstanding balance for a customer.
     */
    public function getOutstandingBalance(Customer $customer)
    {
        if (!request()->user()->hasPermission('customers.view')) {
             return response()->json(['error' => 'Unauthorized'], 403);
        }

        // Calculate outstanding balance using unified formula (includes Opening Balance)
        $outstandingBalance = $customer->calculateOutstandingBalance();

        // Get recent payments
        $recentPayments = $customer->payments()
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get()
            ->map(function ($payment) {
                return [
                    'id' => $payment->id,
                    'amount' => $payment->amount,
                    'date' => $payment->date,
                    'method' => $payment->method,
                    'reference' => $payment->reference,
                    'status' => $payment->status,
                ];
            });

        return response()->json([
            'outstanding_balance' => $outstandingBalance,
            'recent_payments' => $recentPayments,
            'customer' => [
                'AdrKy' => $customer->AdrKy,
                'AdrCd' => $customer->AdrCd,
                'full_name' => trim($customer->FstNm . ' ' . ($customer->LstNm ?? '')),
                'TP1' => $customer->TP1,
                'Address' => $customer->Address,
            ]
        ]);
    }

    /**
     * Store a new customer payment.
     */
    public function storePayment(Request $request)
    {
        if (!request()->user()->hasPermission('customer_payments.create')) {
             return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $user = request()->user();
        if (!in_array($user->role_id, [1, 2, 5], true)) {
            $isReconciled = \App\Models\CashReconciliation::where('user_id', $user->id)
                ->whereDate('reconciliation_date', $request->input('payment_date', date('Y-m-d')))
                ->exists();
            if ($isReconciled) {
                return response()->json([
                    'message' => 'Cash reconciliation already completed for this date. No further transactions are allowed.',
                    'errors' => ['payment_date' => ['Cash reconciliation already completed for this date.']]
                ], 422);
            }
        }

        $validated = $request->validate([
            'customer_id' => 'required|exists:address,AdrKy',
            'payment_method' => 'required|in:cash,cheque,bank_transfer,card,applied_credit',
            'amount' => 'required|numeric|min:0.01',
            'payment_date' => 'required|date',

            // Optional alternate field names from PaymentForm
            'AccKy' => 'sometimes|required',
            'TrnDt' => 'sometimes|required|date',
            'method' => 'sometimes|required|string',
            'BankNm' => 'nullable|string',
            'ChqueBranch' => 'nullable|string',
            'BankBranch' => 'nullable|string',
            'ChqueNo' => 'nullable|string',
            'Reference' => 'nullable|string',

            // Card fields
            'card_last_4' => 'nullable|string',
            'card_auth_code' => 'nullable|string',

            // Bank account dropdown
            'selected_bank_id' => 'nullable|exists:bank_accounts,id',

            // Cash payment fields
            'cash_description' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:255',

            // Cheque payment fields
            'cheque_no' => 'required_if:payment_method,cheque|string|max:50',
            'cheque_bank' => 'nullable|string|max:100',
            'cheque_branch' => 'nullable|string|max:100',
            'cheque_date' => 'required_if:payment_method,cheque|date',
            'cheque_description' => 'nullable|string|max:255',

            // Bank transfer fields
            'transfer_ref_no' => 'nullable|string|max:100',
            'transfer_bank' => 'nullable|string|max:100',
            'transfer_branch' => 'nullable|string|max:100',
            'transfer_date' => 'required_if:payment_method,bank_transfer|date',
            'transfer_description' => 'nullable|string|max:255',

            // Optional references
            'service_job_id' => 'nullable|exists:service_jobs,id',
            'sales_transaction_id' => 'nullable', // Allow 0 for opening balance
            'invoice_allocations' => 'nullable|array|min:1',
            'invoice_allocations.*.invoice_id' => 'required_with:invoice_allocations', // Relaxed to allow 0
            'invoice_allocations.*.amount' => 'required_with:invoice_allocations|numeric|min:0.01',
        ]);

        try {
            DB::beginTransaction();

            $customer = Customer::findOrFail($validated['customer_id']);

            if ($validated['payment_method'] === 'applied_credit') {
                $ledgerOutstanding = $customer->calculateOutstandingBalance();
                $jobsSum = \App\Models\ServiceJob::where('AccKy', $customer->AccKy)->where('balance_amount', '>', 0)->sum('balance_amount');
                $invoicesSum = \App\Models\SalesTransaction::where('customer_id', $customer->AdrKy)->where('balance_amount', '>', 0)->sum('balance_amount');
                
                // Unallocated credit = Sum of pending job/invoice balances - True overall ledger balance
                $availableCredit = max(0, ($jobsSum + $invoicesSum) - $ledgerOutstanding);

                if ((float)$validated['amount'] > $availableCredit + 0.01) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Requested credit allocation (' . $validated['amount'] . ') exceeds available unallocated credit (' . $availableCredit . ').'
                    ], 422);
                }
            }

            // Authorization check for superadmin
            $user = $request->user();
            if ($user && $user->role_id === 1) {
                $selectedCompany = session('selected_company');
                if ($selectedCompany && $customer->company_code !== $selectedCompany) {
                    return response()->json([
                        'success' => false,
                        'message' => 'The selected customer does not belong to the active company context.'
                    ], 403);
                }
            }

            // Prepare payment data based on method
            $paymentData = [
                'customer_id' => $customer->AdrKy,
                'customer_code' => $customer->AdrCd,
                'collected_by' => Auth::id(),
                'amount' => $validated['amount'],
                'date' => $validated['payment_date'],
                'method' => $validated['payment_method'],
                'status' => 'completed',
                'service_job_id' => $validated['service_job_id'] ?? null,
                'sales_transaction_id' => (!empty($validated['sales_transaction_id']) && $validated['sales_transaction_id'] > 0) ? $validated['sales_transaction_id'] : null,
                'invoice_allocations' => null,
            ];

            // allow selected bank account to override bank/branch and adjust its balance
            $selectedBank = null;
            if (!empty($validated['selected_bank_id'])) {
                // lock row for update in case of concurrent payments
                $selectedBank = \App\Models\BankAccount::lockForUpdate()->find($validated['selected_bank_id']);
                if ($selectedBank) {
                    // choose appropriate fields depending on method
                    if ($validated['payment_method'] === 'cheque') {
                        $validated['cheque_bank'] = $selectedBank->bank_name;
                        $validated['cheque_branch'] = $selectedBank->branch_name;
                    } elseif ($validated['payment_method'] === 'bank_transfer') {
                        $validated['transfer_bank'] = $selectedBank->bank_name;
                        $validated['transfer_branch'] = $selectedBank->branch_name;
                    }

                    // increment bank balance when money is received (bank transfer or card)
                    if ($validated['payment_method'] === 'bank_transfer' || $validated['payment_method'] === 'card') {
                        if ($selectedBank->status === 'active') {
                            $selectedBank->current_balance = (float)$selectedBank->current_balance + (float)$validated['amount'];
                            $selectedBank->save();
                        }
                    }
                }
            }

            switch ($validated['payment_method']) {
                case 'cash':
                    $paymentData['notes'] = $validated['cash_description'] ?? null;
                    break;

                case 'cheque':
                    $paymentData['cheque_no'] = $validated['cheque_no'] ?? $validated['ChqueNo'] ?? null;
                    $paymentData['bank_name'] = $validated['cheque_bank'] ?? $validated['BankNm'] ?? null;
                    $paymentData['branch'] = $validated['cheque_branch'] ?? $validated['ChqueBranch'] ?? null;
                    $paymentData['cheque_date'] = $validated['cheque_date'] ?? null;
                    $paymentData['notes'] = $validated['cheque_description'] ?? $validated['notes'] ?? null;
                    break;

                case 'bank_transfer':
                    $paymentData['reference'] = $validated['transfer_ref_no'] ?? $validated['Reference'] ?? null;
                    $paymentData['bank_name'] = $validated['transfer_bank'] ?? $validated['BankNm'] ?? null;
                    $paymentData['branch'] = $validated['transfer_branch'] ?? $validated['BankBranch'] ?? null;
                    $paymentData['transfer_date'] = $validated['transfer_date'] ?? null;
                    $paymentData['notes'] = $validated['transfer_description'] ?? $validated['notes'] ?? null;
                    break;

                case 'card':
                    $paymentData['card_last_4'] = $validated['card_last_4'] ?? null;
                    $paymentData['card_auth_code'] = $validated['card_auth_code'] ?? null;
                    $paymentData['notes'] = $validated['notes'] ?? null;
                    break;
                
                case 'applied_credit':
                    $paymentData['notes'] = 'Applied from Customer Credit Balance';
                    break;
            }

            // Track which bank account received this payment (enables full ledger on bank account page)
            if (!empty($validated['selected_bank_id'])) {
                $paymentData['selected_bank_id'] = $validated['selected_bank_id'];
            }

            $payment = CustomerPayment::create($paymentData);

            // --- Intercept Card Payments to Remove Discounts on Service Jobs ---
            if ($validated['payment_method'] === 'card' && !empty($validated['service_job_id'])) {
                /** @var \App\Models\ServiceJob $jobForCard */
                $jobForCard = \App\Models\ServiceJob::with('items')->find($validated['service_job_id']);
                if ($jobForCard) {
                    $itemsChanged = false;
                    foreach ($jobForCard->items as $item) {
                        if ($item->discount_amount > 0) {
                            $item->unit_price = (float)$item->unit_price + (float)$item->discount_amount;
                            $item->discount_amount = 0;
                            $item->save();
                            $itemsChanged = true;
                        }
                    }
                    if ($itemsChanged) {
                        $jobForCard->updateTotals();
                    }
                }
            }

            $amount = (float) $validated['amount'];
            $accKy  = $customer->AccKy;
            $adrKy  = $customer->AdrKy;
            $hasInvoiceAllocations = !empty($validated['invoice_allocations']) && is_array($validated['invoice_allocations']);

            if ($hasInvoiceAllocations && empty($payment->sales_transaction_id) && count($validated['invoice_allocations']) === 1) {
                $singleInvoiceId = (int) ($validated['invoice_allocations'][0]['invoice_id'] ?? 0);
                if ($singleInvoiceId > 0) {
                    $payment->sales_transaction_id = $singleInvoiceId;
                }
            }

            // ── 1. Reconcile specific Service Job ──────────────────────────
            if (!empty($validated['service_job_id'])) {
                $job = ServiceJob::find($validated['service_job_id']);
                if ($job) {
                    $totalPaid = CustomerPayment::withoutServiceAdvancePayments()
                        ->where('service_job_id', $job->id)
                        ->sum('amount');
                    $job->paid_amount = $totalPaid;
                    $job->updateTotals();
                    $balance = ($job->total_amount - $job->advanced_payment) - $job->paid_amount;
                    if ($balance <= 0 && !in_array($job->status, ['completed', 'delivered'])) {
                        $job->status = 'completed';
                        if (!$job->actual_completion_date) {
                            $job->actual_completion_date = now();
                        }
                        $job->save();
                    }
                }
            }

            // ── 2. Reconcile split Sales Transactions (Invoices) ───────────
            if ($hasInvoiceAllocations) {
                $allocationTotal = 0.0;

                foreach ($validated['invoice_allocations'] as $allocation) {
                    $allocationTotal += (float) $allocation['amount'];
                }

                if (abs($allocationTotal - $amount) > 0.01) {
                    throw new \InvalidArgumentException('Allocated invoice total must match payment amount.');
                }

                foreach ($validated['invoice_allocations'] as $allocation) {
                    $invoiceId = (int) $allocation['invoice_id'];
                    $allocationAmount = (float) $allocation['amount'];

                    if ($invoiceId > 0) {
                        $sale = SalesTransaction::lockForUpdate()->find($invoiceId);
                        if (!$sale || (int) $sale->customer_id !== (int) $adrKy) {
                            throw new \InvalidArgumentException("Invoice {$invoiceId} is invalid for this customer.");
                        }

                        // IMPORTANT: The CustomerPaymentObserver fires when $payment is created above
                        // (line 1166) and may have already recalculated $sale->balance_amount to 0
                        // (since it correctly counts the new payment). If we read $sale->balance_amount
                        // directly it would be 0, making any allocation appear to "exceed" the balance.
                        // Instead, reconstruct the available balance as:
                        //   invoice_total - payments_already_made_BEFORE_this_payment
                        $alreadyPaidToInvoice = (float) \App\Models\CustomerPayment::where('sales_transaction_id', $invoiceId)
                            ->where('id', '!=', $payment->id)
                            ->sum('amount');
                        $currentBalance = max(0.0, (float)$sale->total_amount - $alreadyPaidToInvoice);

                        if ($allocationAmount > $currentBalance + 0.01) {
                            throw new \InvalidArgumentException("Allocated amount for invoice {$sale->invoice_no} exceeds outstanding balance.");
                        }


                        $sale->balance_amount = max(0, $currentBalance - $allocationAmount);
                        $sale->status = $sale->balance_amount <= 0 ? 'completed' : 'partially_paid';
                        $sale->save();
                    }
                }

                $payment->invoice_allocations = collect($validated['invoice_allocations'])
                    ->map(function ($allocation) {
                        return [
                            'invoice_id' => (int) $allocation['invoice_id'],
                            'amount' => round((float) $allocation['amount'], 2),
                        ];
                    })
                    ->values()
                    ->all();
                $payment->save();
            }

            // ── 3. Reconcile specific Sales Transaction (Invoice) ──────────
            elseif (!empty($validated['sales_transaction_id'])) {
                $sale = SalesTransaction::find($validated['sales_transaction_id']);
                if ($sale) {
                    // Allow negative balance_amount to represent overpayment credit
                    $sale->balance_amount = (float) $sale->balance_amount - $amount;
                    $sale->status = $sale->balance_amount <= 0 ? 'completed' : 'partially_paid';
                    $sale->save();
                }
            }

            // ── 4. Auto-allocate if no specific job/invoice linked ─────────
            if (!$hasInvoiceAllocations && empty($validated['service_job_id']) && empty($validated['sales_transaction_id'])) {
                $remaining = $amount;

                $jobs = ServiceJob::where('AccKy', $accKy)
                    ->where('balance_amount', '>', 0)
                    ->orderBy('created_at', 'asc')
                    ->get();

                $invoices = SalesTransaction::where('customer_id', $adrKy)
                    ->where('balance_amount', '>', 0)
                    ->orderBy('transaction_date', 'asc')
                    ->get();

                $allItems = collect();
                foreach ($jobs as $j) {
                    $allItems->push(['type' => 'job', 'date' => $j->created_at, 'model' => $j, 'balance' => $j->balance_amount]);
                }
                foreach ($invoices as $i) {
                    $allItems->push(['type' => 'invoice', 'date' => $i->transaction_date, 'model' => $i, 'balance' => $i->balance_amount]);
                }

                $autoAllocations = [];
                
                foreach ($allItems->sortBy('date') as $item) {
                    if ($remaining <= 0.01) break;
                    $pay = min($remaining, (float) $item['balance']);

                    if ($item['type'] === 'job') {
                        /** @var ServiceJob $jobModel */
                        $jobModel  = $item['model'];
                        $totalPaid = CustomerPayment::withoutServiceAdvancePayments()
                            ->where('service_job_id', $jobModel->id)
                            ->sum('amount');
                        $jobModel->paid_amount = $totalPaid + $pay;
                        $jobModel->updateTotals();
                        if (($jobModel->total_amount - $jobModel->advanced_payment - $jobModel->paid_amount) <= 0
                            && !in_array($jobModel->status, ['completed', 'delivered'])) {
                            $jobModel->status = 'completed';
                            $jobModel->save();
                        }
                    } else {
                        /** @var SalesTransaction $invModel */
                        $invModel               = $item['model'];
                        $invModel->balance_amount = max(0, (float) $invModel->balance_amount - $pay);
                        $invModel->status       = $invModel->balance_amount <= 0 ? 'completed' : 'partially_paid';
                        $invModel->save();
                        
                        $autoAllocations[] = [
                            'invoice_id' => $invModel->id,
                            'amount' => round($pay, 2),
                        ];
                    }
                    $remaining -= $pay;
                }
                
                if (!empty($autoAllocations)) {
                    // Save the auto-allocations to the payment so the CustomerPaymentObserver
                    // doesn't overwrite the balances later when a new payment is made.
                    $payment->invoice_allocations = $autoAllocations;
                    $payment->save();
                }
            }

            // ── 5. Update AccMas balance + create AccTrn ledger entry ──────
            if ($validated['payment_method'] !== 'applied_credit') {
                $accMas = AccMas::where('AccKy', $accKy)->first();
                if ($accMas) {
                    $accMas->CurBal = (float) $accMas->CurBal - $amount;
                    $accMas->save();

                    AccTrn::create([
                        'AccKy'               => $accMas->AccKy,
                        'TrnDt'               => $validated['payment_date'],
                        'TrnNo'               => 'CPY-' . now()->format('YmdHis') . '-' . str_pad(random_int(0, 9999), 4, '0', STR_PAD_LEFT),
                        'Amt'                 => -1 * abs($amount),
                        'VaucherNo'           => $validated['transfer_ref_no'] ?? null,
                        'ChqueNo'             => $validated['cheque_no'] ?? null,
                        'BankNm'              => $validated['cheque_bank'] ?? $validated['transfer_bank'] ?? null,
                        'BranchNm'            => $validated['cheque_branch'] ?? $validated['transfer_branch'] ?? null,
                        'Dec'                 => $validated['cash_description'] ?? $validated['cheque_description'] ?? $validated['transfer_description'] ?? 'Customer Payment',
                        'FInAct'              => 1,
                        'Status'              => 'A',
                        'company_code'        => $accMas->company_code ?? null,
                        'section_code'        => $accMas->section_code ?? null,
                        'customer_code'       => $customer->AdrCd ?? null,
                        'customer_name'       => $accMas->AccNm ?? null,
                    // NOTE: original_payment_id intentionally omitted — that column's unique
                    // constraint is reserved for cheque-return entries only. Setting it here
                    // would prevent a second payment toward the same invoice/sale.
                ]);
            }
        }

        // ── 6. Update Finance Account balance & add Transaction (IF CASH) ──────
        if (strtolower(trim($validated['payment_method'] ?? '')) === 'cash') {
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

                $description = 'Customer payment (' . ($payment->reference ?? '-') . ')' . $invoicesText;

                if ($effectiveCash > 0) {
                    $fatData = [
                        'finance_account_id' => $cashierFinanceAccount->id,
                        'date' => clone \Carbon\Carbon::parse($validated['payment_date']),
                        'source_type' => \App\Models\CustomerPayment::class,
                        'source_id' => $payment->id,
                        'description' => $description,
                        'method' => 'cash',
                        'type' => 'debit',
                        'amount' => $effectiveCash,
                        'running_balance' => 0
                    ];
                    \App\Models\FinanceAccountTransaction::create($fatData);
                    
                    if (in_array($cashierFinanceAccount->main_category->value ?? 'assets', ['liabilities', 'revenue', 'equity'])) {
                        $cashierFinanceAccount->current_balance -= $effectiveCash;
                    } else {
                        $cashierFinanceAccount->current_balance += $effectiveCash;
                    }
                    $cashierFinanceAccount->save();
                }
            }
        }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Payment recorded successfully.',
                'payment_id' => $payment->id,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to record payment: ' . $e->getMessage()
            ], 500);
        }
    }
}

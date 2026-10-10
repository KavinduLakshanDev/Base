<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PrivilagePoint;
use App\Models\PrivilegeUser;
use App\Models\Section;
use App\Services\NumberGeneratorService;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Mpdf\Mpdf;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;


class PrivilegeUserController extends Controller
{
    protected NumberGeneratorService $numberGenerator;

    public function __construct(NumberGeneratorService $numberGenerator)
    {
        $this->numberGenerator = $numberGenerator;
    }
    /**
     * Display a listing of privilege users.
     */
    public function index(Request $request): Response
    {
        if (!request()->user()->hasPermission('privilege_users.view')) {
             return redirect()->back()->with('error', 'Unauthorized.');
        }

        $query = \App\Models\Customer::with(['company', 'section'])->where('is_privilege_user', true);

        // Filter by company/section for non-superadmin users
        $user = $request->user();
        if ($user && $user->role_id !== 1) { // Not superadmin
            if ($user->role_id === 3 || $user->role_id === 4) { // Section admin or Staff user - filter by their section
                $query->where('section_code', $user->section->section_code);
            } else { // Company admin - filter by their company
                $query->where('company_code', $user->company_code);
            }
        }

        // Search functionality
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('FstNm', 'like', "%{$search}%")
                    ->orWhere('AdrCd', 'like', "%{$search}%")
                    ->orWhere('IDNo', 'like', "%{$search}%")
                    ->orWhere('TP1', 'like', "%{$search}%");
            });
        }

        // Specific customer code filter
        if ($request->filled('customer_code')) {
            $query->where('AdrCd', 'like', "%{$request->customer_code}%");
        }

        // Specific name filter
        if ($request->filled('name')) {
            $query->where('FstNm', 'like', "%{$request->name}%");
        }

        // Filter by section
        if ($request->filled('section_code')) {
            $query->where('section_code', $request->section_code);
        }

        // Filter by status
        if ($request->filled('is_active')) {
            $status = $request->boolean('is_active') ? 'A' : 'I';
            $query->where('Status', $status);
        }

        $privilegeUsers = $query->latest()->paginate(15)->withQueryString();
        
        $privilegeUsers->getCollection()->transform(function ($customer) {
            return [
                'id' => $customer->AdrKy, // Use AdrKy for ID routing
                'company_code' => $customer->company_code,
                'section_code' => $customer->section_code,
                'customer_code' => $customer->AdrCd,
                'privCusName' => $customer->FstNm,
                'NIC' => $customer->IDNo,
                'address' => $customer->Address,
                'town' => null,
                'city' => null,
                'country' => $customer->Country,
                'phone' => $customer->TP1,
                'gender' => null,
                'card_no' => $customer->privilege_card_no,
                'regdate' => $customer->created_at,
                'ent_user' => null,
                'finAct' => $customer->Status === 'A',
                'is_active' => $customer->Status === 'A',
                'created_at' => $customer->created_at,
                'updated_at' => $customer->updated_at,
                'company' => $customer->company,
                'section' => $customer->section,
            ];
        });

        $sections = Section::where('company_code', $user->company_code)
            ->where('is_active', true)
            ->get();

        return Inertia::render('admin/privilege-users/index', [
            'privilegeUsers' => $privilegeUsers,
            'sections' => $sections,
            'filters' => $request->only(['search', 'customer_code', 'name', 'section_code', 'gender', 'is_active']),
        ]);
    }

    /**
     * Export privilege users report as PDF.
     */
    public function export(Request $request)
    {
        if (!request()->user()->hasPermission('privilege_users.view')) {
             return redirect()->back()->with('error', 'Unauthorized.');
        }

        $user = Auth::user()->load(['company', 'section']);

        $query = \App\Models\Customer::with(['company', 'section'])->where('is_privilege_user', true);

        // Filter by company/section for non-superadmin users
        if ($user && $user->role_id !== 1) { // Not superadmin
            if ($user->role_id === 3) { // Section admin - filter by their section
                $query->where('section_code', $user->section->section_code);
            } else { // Company admin - filter by their company
                $query->where('company_code', $user->company_code);
            }
        }

        // Apply the same filters as index
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('FstNm', 'like', "%{$search}%")
                    ->orWhere('AdrCd', 'like', "%{$search}%")
                    ->orWhere('IDNo', 'like', "%{$search}%")
                    ->orWhere('TP1', 'like', "%{$search}%");
            });
        }

        // Specific customer code filter
        if ($request->filled('customer_code')) {
            $query->where('AdrCd', 'like', "%{$request->customer_code}%");
        }

        // Specific name filter
        if ($request->filled('name')) {
            $query->where('FstNm', 'like', "%{$request->name}%");
        }

        if ($request->filled('section_code')) {
            $query->where('section_code', $request->section_code);
        }

        if ($request->filled('is_active')) {
            $status = $request->boolean('is_active') ? 'A' : 'I';
            $query->where('Status', $status);
        }

        $customers = $query->latest()->get();
        
        // Map to expected structure for the PDF view
        $privilegeUsers = $customers->map(function ($customer) {
            return (object) [
                'id' => $customer->AdrKy,
                'customer_code' => $customer->AdrCd,
                'privCusName' => $customer->FstNm,
                'NIC' => $customer->IDNo,
                'phone' => $customer->TP1,
                'card_no' => $customer->privilege_card_no,
                'is_active' => $customer->Status === 'A',
                'gender' => null,
            ];
        });

        // Generate PDF with mPDF for better Unicode support (Sinhala, Tamil, English)
        try {
            $html = view('exports.privilege-users-report', [
                'privilegeUsers' => $privilegeUsers,
                'generatedAt' => now(),
                'generatedBy' => $user->name ?? 'System',
                'filters' => $request->all(),
                'totalRecords' => $privilegeUsers->count(),
                'company' => $user->company->name ?? 'Default Company',
                'section' => $user->section->name ?? 'Default Section',
            ])->render();

            // Initialize mPDF with Unicode support
            $mpdf = new Mpdf([
                'mode' => 'utf-8',
                'format' => 'A4', // A4 Portrait
                'margin_left' => 10,
                'margin_right' => 10,
                'margin_top' => 10,
                'margin_bottom' => 10,
                'margin_header' => 5,
                'margin_footer' => 5,
                'default_font' => 'dejavusans',
                'autoScriptToLang' => true,
                'autoLangToFont' => true,
            ]);

            // Add custom fonts for better Sinhala support
            $mpdf->autoScriptToLang = true;
            $mpdf->autoLangToFont = true;

            $mpdf->WriteHTML($html);

            $filename = 'privilege_users_report_' . now()->format('Y-m-d_H-i-s') . '.pdf';

            return response()->streamDownload(function () use ($mpdf) {
                echo $mpdf->Output('', 'S');
            }, $filename, [
                'Content-Type' => 'application/pdf',
            ]);
        } catch (\Exception $e) {
            return back()->with('error', 'Failed to generate PDF: ' . $e->getMessage());
        }
    }

    public function create(): Response | RedirectResponse
    {
        return redirect()->route('admin.customers.create');
    }

    /**
     * Store a newly created privilege user in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();

        if (!$user->hasPermission('privilege_users.create')) {
              return redirect()->back()->with('error', 'Unauthorized.');
        }

        // Check if user has permission to create privilege users
        $canCreate = $user->role_id === 1 || $user->role_id === 2 || $user->role_id === 3 || $user->role_id === 4; // Super admin, Company admin, Section admin, or Staff user
        if (!$canCreate) {
            return redirect()->back()->with('error', 'You do not have permission to create privilege users.');
        }

        $validated = $request->validate([
            'section_code' => 'required|exists:sections,id',
            'privCusName' => 'required|string|max:255',
            'NIC' => 'nullable|string|max:20',
            'address' => 'required|string',
            'town' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:255',
            'country' => 'required|string|max:255',
            'phone' => 'nullable|regex:/^[0-9]{10}$/',
            'gender' => 'nullable|in:male,female',
            'card_no' => 'nullable|regex:/^[0-9]+$/',
            'regdate' => 'required|date',
            'ent_user' => 'nullable|string|max:255',
            'finAct' => 'boolean',
            'is_active' => 'boolean',
        ]);

        // Check if phone number already exists for another privilege user
        if ($validated['phone']) {
            $existingUser = PrivilegeUser::where('phone', $validated['phone'])
                ->where('company_code', $user->company_code)
                ->first();

            if ($existingUser) {
                return redirect()->back()
                    ->withInput()
                    ->withErrors(['phone' => 'This phone number is already registered with another privileged user. Please use a different phone number.']);
            }
        }

        // No OTP verification required - we'll send confirmation SMS after registration

        // For section admins and staff users, ensure they can only create users for their own section
        if (($user->role_id === 3 || $user->role_id === 4) && $validated['section_code'] != $user->section->id) {
            return redirect()->back()->with('error', 'Section admins and staff users can only create privilege users for their own section.');
        }

        // Get the section to convert ID to section_code string
        $section = Section::findOrFail($validated['section_code']);
        $validated['company_code'] = $user->company_code;
        $validated['section_code'] = $section->section_code; // Convert ID to code string
        $validated['ent_user'] = $request->ip(); // Set entered user to client IP
        $validated['customer_code'] = $this->generateUniquePrivilegeCustomerCode(
            $this->numberGenerator,
            $user->company_code,
            $validated['section_code']
        );

        $privilegeUser = PrivilegeUser::create($validated);

        // Send registration confirmation SMS if phone number is provided
        if ($validated['phone']) {
            try {
                $otpService = new \App\Services\OtpService(new \App\Services\SmsService());
                $smsResult = $otpService->sendRegistrationConfirmation(
                    $validated['phone'],
                    'privilege_user_registration',
                    $validated['privCusName']
                );

                if ($smsResult['success']) {
                    Log::info('Registration confirmation SMS sent', [
                        'customer_code' => $privilegeUser->customer_code,
                        'phone' => $validated['phone'],
                        'name' => $validated['privCusName']
                    ]);
                } else {
                    Log::warning('Registration confirmation SMS failed', [
                        'customer_code' => $privilegeUser->customer_code,
                        'phone' => $validated['phone'],
                        'error' => $smsResult['message']
                    ]);
                }
            } catch (\Exception $e) {
                Log::error('Registration confirmation SMS exception', [
                    'customer_code' => $privilegeUser->customer_code,
                    'phone' => $validated['phone'],
                    'error' => $e->getMessage()
                ]);
            }
        }

        // No session data to clear since we removed OTP verification

        return redirect()->route('admin.privilege-users.index')
            ->with('success', 'Privilege user created successfully and confirmation SMS sent.');
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
     * Display the specified privilege user.
     */
    public function show($id): Response | RedirectResponse
    {
        return redirect()->route('admin.customers.show', $id);
    }

    /**
     * Show the form for editing the specified privilege user.
     */
    public function edit($id): Response | RedirectResponse
    {
        return redirect()->route('admin.customers.edit', $id);
    }

    /**
     * Update the specified privilege user in storage.
     */
    public function update(Request $request, PrivilegeUser $privilegeUser): RedirectResponse
    {
        $user = Auth::user();

        if (!$user->hasPermission('privilege_users.edit')) {
             return redirect()->back()->with('error', 'Unauthorized.');
        }

        // Check if user can update this privilege user
        if ($user->role_id !== 1 && $privilegeUser->company_code !== $user->company_code) {
            return redirect()->back()->with('error', 'You do not have permission to update this privilege user.');
        }

        // For section admins and staff users, ensure they can only update users from their own section
        if (($user->role_id === 3 || $user->role_id === 4) && $privilegeUser->section_code !== $user->section->section_code) {
            return redirect()->back()->with('error', 'Section admins and staff users can only update privilege users from their own section.');
        }

        $validated = $request->validate([
            'section_code' => 'required|exists:sections,id',
            'privCusName' => 'required|string|max:255',
            'NIC' => 'nullable|string|max:20',
            'address' => 'required|string',
            'town' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:255',
            'country' => 'required|string|max:255',
            'phone' => 'nullable|regex:/^[0-9]{10}$/',
            'gender' => 'nullable|in:male,female',
            'card_no' => 'nullable|regex:/^[0-9]+$/',
            'regdate' => 'required|date',
            'finAct' => 'boolean',
            'is_active' => 'boolean',
        ]);

        // Convert section_code from ID to string if it changed
        if (isset($validated['section_code'])) {
            $section = Section::findOrFail($validated['section_code']);
            $validated['section_code'] = $section->section_code;
        }

        $privilegeUser->update($validated);

        return redirect()->route('admin.privilege-users.index')
            ->with('success', 'Privilege user updated successfully.');
    }



    /**
     * Remove the specified privilege user from storage.
     */
    // public function destroy(PrivilegeUser $privilegeUser): RedirectResponse
    // {
    //     $user = Auth::user();

    //     // Check if user can delete this privilege user
    //     if ($user->role_id !== 1 && $privilegeUser->company_code !== $user->company_code) {
    //         abort(403, 'You do not have permission to delete this privilege user.');
    //     }

    //     // For section admins, ensure they can only delete users from their own section
    //     if ($user->role_id === 3 && $privilegeUser->section_code !== $user->section->section_code) {
    //         abort(403, 'Section admins can only delete privilege users from their own section.');
    //     }

    //     $privilegeUser->delete();

    //     return redirect()->route('admin.privilege-users.index')
    //         ->with('success', 'Privilege user deleted successfully.');
    // }

    /**
     * Toggle the active status of the privilege user.
     */
    public function toggle(Request $request, $id): RedirectResponse
    {
        $user = Auth::user();

        if (!$user->hasPermission('privilege_users.edit')) {
             return redirect()->back()->with('error', 'Unauthorized.');
        }

        $customer = \App\Models\Customer::findOrFail($id);
        $newStatus = $customer->Status === 'A' ? 'I' : 'A';
        $customer->update(['Status' => $newStatus]);
        
        $statusStr = $newStatus === 'A' ? 'activated' : 'deactivated';

        return redirect()->back()
            ->with('success', "Privilege user {$statusStr} successfully.");
    }

    /**
     * Search for privilege user by card number, mobile number, or customer code for POS integration.
     */
    public function search(Request $request)
    {
        if (!request()->user()->hasPermission('privilege_users.manage') && !request()->user()->hasPermission('sale.access')) {
             return response()->json(['error' => 'Unauthorized'], 403);
        }

        $request->validate([
            'type' => 'required|in:card,mobile,code',
            'value' => 'required|string',
        ]);

        $user = Auth::user();
        $query = \App\Models\Customer::where('Status', 'A')->where('is_privilege_user', true);

        // Filter by company for non-superadmin users
        if ($user && $user->role_id !== 1) {
            $query->where('company_code', $user->company_code);
        }

        if ($request->type === 'card') {
            $query->where('privilege_card_no', $request->value);
        } elseif ($request->type === 'mobile') {
            $query->where('TP1', $request->value);
        } elseif ($request->type === 'code') {
            $query->where('AdrCd', $request->value);
        }

        $customer = $query->first();

        if (!$customer) {
            return response()->json(['error' => 'User not found'], 404);
        }

        // Calculate total points from PrivilagePoint table
        // Total available points = earned points - redeemed points
        $earnedPoints = PrivilagePoint::where('customer_code', $customer->AdrCd)
            ->where('company_code', $user->company_code)
            ->where('pointType', 'earned')
            ->sum('pointAmount');

        $redeemedPoints = PrivilagePoint::where('customer_code', $customer->AdrCd)
            ->where('company_code', $user->company_code)
            ->where('pointType', 'redeemed')
            ->sum('pointAmount');

        $totalPoints = max(0, $earnedPoints - $redeemedPoints); // Ensure total is never negative

        return response()->json([
            'code' => $customer->AdrCd,
            'name' => $customer->FstNm,
            'nic_no' => $customer->IDNo,
            'gender' => null,
            'card_no' => $customer->privilege_card_no,
            'phone' => $customer->TP1,
            'total_points' => (float) $totalPoints,
        ]);
    }

    /**
     * Send OTP to phone number for privilege user registration
     */
    public function sendOtp(Request $request)
    {
        // Add debug logging
        $user = Auth::user();
        
        if (!$user->hasPermission('privilege_users.manage')) {
             return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        \Illuminate\Support\Facades\Log::info('OTP send request received', [
            'phone' => $request->phone,
            'request_data' => $request->all(),
            'user_id' => $user ? $user->id : null,
        ]);

        $request->validate([
            'phone' => 'required|string|max:20',
        ]);

        try {
            $otpService = new \App\Services\OtpService(new \App\Services\SmsService());
            
            $result = $otpService->generateAndSendOtp(
                $request->phone,
                'privilege_card',
                null,
                'privilege_user_registration'
            );

            \Illuminate\Support\Facades\Log::info('OTP service result', [
                'phone' => $request->phone,
                'result' => $result,
            ]);

            if ($result['success']) {
                return response()->json([
                    'success' => true,
                    'message' => 'OTP sent successfully to ' . $request->phone,
                    'expires_at' => $result['expires_at'] ?? null,
                    'debug' => [
                        'otp_id' => $result['otp_id'] ?? null,
                        'sms_log_id' => $result['sms_log_id'] ?? null,
                    ],
                ]);
            } else {
                \Illuminate\Support\Facades\Log::warning('OTP send failed', [
                    'phone' => $request->phone,
                    'result' => $result,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => $result['message'],
                ], 400);
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('OTP send failed for privilege user registration', [
                'phone' => $request->phone,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to send OTP. Please try again.',
            ], 500);
        }
    }

    /**
     * Verify OTP for privilege user registration
     */
    public function verifyOtp(Request $request)
    {
        if (!request()->user()->hasPermission('privilege_users.manage')) {
             return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'phone' => 'required|string|max:20',
            'otp' => 'required|string|min:4|max:6',
        ]);

        try {
            $otpService = new \App\Services\OtpService(new \App\Services\SmsService());
            
            $result = $otpService->verifyOtp(
                $request->phone,
                $request->otp,
                'privilege_card'
            );

            if ($result['success']) {
                // Store verification status in session for form submission
                session(['otp_verified_phone' => $request->phone, 'otp_verified_at' => now()]);

                return response()->json([
                    'success' => true,
                    'message' => 'Phone number verified successfully',
                    'verified_at' => $result['verified_at'] ?? null,
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => $result['message'],
                ], 400);
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('OTP verification failed for privilege user registration', [
                'phone' => $request->phone,
                'otp' => $request->otp,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to verify OTP. Please try again.',
            ], 500);
        }
    }
}
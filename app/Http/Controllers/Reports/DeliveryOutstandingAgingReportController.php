<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use App\Models\Delivery;
use App\Models\DeliveryRoute;
use App\Models\User;
use App\Models\Customer;
use App\Models\Shop;
use Carbon\Carbon;

class DeliveryOutstandingAgingReportController extends Controller
{
    private function escapeLikePattern(string $value): string
    {
        return str_replace(['%', '_'], ['\\%', '\\_'], $value);
    }

    public function index(Request $request)
    {
        if (!request()->user()->hasPermission('reports.delivery_outstanding_aging')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $user = Auth::user();
        $companyCode = $user->company_code;

        $dateFrom = $request->input('date_from', now()->subDays(90)->format('Y-m-d'));
        $dateTo = $request->input('date_to', now()->format('Y-m-d'));
        $bucketFilter = $request->input('bucket', 'all'); // '0-30','31-60','61-90','>90','all'
        $routeId = $request->input('route_id');
        $repId = $request->input('rep_id');
        $minOutstanding = (float) $request->input('min_outstanding', 0);
        $customerId = $request->input('customer_id'); // optional customer/shop filter

        // collect all deliveries first (may be reduced by customer_id in the query builder)
        $allDeliveries = Delivery::with(['items', 'payments', 'deliveryRoute', 'assignedUser', 'shop'])
            ->where('company_code', $companyCode)
            ->whereBetween('delivery_date', [$dateFrom, $dateTo])
            ->when($routeId && $routeId !== 'all', fn($q) => $q->where('delivery_route_id', $routeId))
            ->when($repId && $repId !== 'all', fn($q) => $q->where('assigned_user_id', $repId))
            ->when($customerId && $customerId !== 'all', function ($q) use ($customerId, $companyCode) {
                if (str_starts_with((string) $customerId, 'shop:')) {
                    $shopId = (int) substr((string) $customerId, 5);

                    $shop = Shop::find($shopId);
                    if ($shop) {
                        $q->where(function ($sub) use ($shopId, $shop) {
                            $sub->where('shop_id', $shopId)
                                ->orWhere('customer_phone', $shop->contact_phone)
                                ->orWhere('customer_name', 'like', '%' . $this->escapeLikePattern($shop->name) . '%');
                        });
                    } else {
                        $q->where('shop_id', $shopId);
                    }

                    return;
                }

                if (is_numeric($customerId)) {
                    $cust = Customer::find((int) $customerId);
                    if ($cust) {
                        $phone = $cust->TP1 ?? null;
                        if ($phone) $q->where('customer_phone', $phone);
                        else $q->where('customer_name', 'like', '%' . $this->escapeLikePattern($cust->FstNm) . '%');
                        return;
                    }

                    $shop = Shop::find((int) $customerId);
                    if ($shop) {
                        $q->where('shop_id', $shop->id);
                        return;
                    }

                    $q->where('customer_phone', (string) $customerId);
                    return;
                }

                if (str_starts_with((string) $customerId, 'name:')) {
                    $name = substr((string) $customerId, 5);
                    $q->where('customer_name', 'like', '%' . $this->escapeLikePattern($name) . '%');
                    return;
                }

                $q->where(function ($sub) use ($customerId) {
                    $sub->where('customer_phone', (string) $customerId)
                        ->orWhere('customer_name', 'like', '%' . $this->escapeLikePattern((string) $customerId) . '%');
                });
            })
            ->get()
            ->map(function ($d) {
                $outstanding = $d->outstanding_balance;
                $ageDays = (int) Carbon::parse($d->delivery_date)->startOfDay()->diffInDays(Carbon::now()->startOfDay());
                $bucket = $ageDays <= 30 ? '0-30' : ($ageDays <= 60 ? '31-60' : ($ageDays <= 90 ? '61-90' : '>90'));
                return [
                    'id' => $d->id,
                    'delivery_number' => $d->delivery_number,
                    'customer_name' => $d->customer_name,
                    'delivery_date' => $d->delivery_date ? Carbon::parse($d->delivery_date)->toDateString() : null,
                    'days' => $ageDays,
                    'bucket' => $bucket,
                    'outstanding' => (float) $outstanding,
                    'last_payment_date' => ($d->payments->sortByDesc('payment_date')->first()?->payment_date) ? Carbon::parse($d->payments->sortByDesc('payment_date')->first()?->payment_date)->toDateString() : null,
                    'sales_rep' => $d->assignedUser ? ($d->assignedUser->first_name . ' ' . $d->assignedUser->last_name) : 'Unassigned',
                    'route' => $d->deliveryRoute?->name ?? 'N/A',
                    'shop' => $d->shop?->name ?? null,
                    'is_overdue_critical' => (in_array($bucket, ['61-90', '>90']) && $outstanding > 0),
                ];
            });

        // Outstanding-only collection (used for bucket totals and summary)
        $outstandingDeliveries = $allDeliveries->filter(fn($r) => $r['outstanding'] > 0 && $r['outstanding'] >= $minOutstanding)->values();

        // When a customer/shop is selected we show ALL deliveries for that customer (paid or unpaid).
        // Otherwise show only outstanding deliveries.
        $deliveries = ($customerId && $customerId !== 'all') ? $allDeliveries : $outstandingDeliveries;

        // Apply bucket filter to the *outstanding* collection used for totals
        if ($bucketFilter !== 'all') {
            $outstandingDeliveries = $outstandingDeliveries->where('bucket', $bucketFilter)->values();
        }

        // Bucket totals (ordered) — computed from outstanding deliveries only (preserves report semantics)
        $bucketTotals = [
            '0-30' => ['label' => '0-30', 'count' => 0, 'total_outstanding' => 0.0],
            '31-60' => ['label' => '31-60', 'count' => 0, 'total_outstanding' => 0.0],
            '61-90' => ['label' => '61-90', 'count' => 0, 'total_outstanding' => 0.0],
            '>90' => ['label' => '>90', 'count' => 0, 'total_outstanding' => 0.0],
        ];

        $summaryTotalOutstanding = 0.0;
        foreach ($outstandingDeliveries as $d) {
            $summaryTotalOutstanding += $d['outstanding'];
            $bucketTotals[$d['bucket']]['count']++;
            $bucketTotals[$d['bucket']]['total_outstanding'] += $d['outstanding'];
        }

        // If a bucket filter was requested, also apply it to the table-level deliveries shown to the user
        if ($bucketFilter !== 'all') {
            $deliveries = $deliveries->where('bucket', $bucketFilter)->values(); // NOSONAR - Collection filter, not SQL
        }

        // Convert to indexed array for safe front-end access and test assertions
        $bucketTotalsArray = array_values($bucketTotals);

        // Build customers list (shops first, then address customers, then delivery-derived fallbacks)
        $shopCustomers = Shop::query()
            ->where('company_code', $companyCode)
            ->orderBy('name')
            ->get()
            ->map(fn($s) => ['id' => 'shop:' . $s->id, 'name' => $s->name, 'phone' => $s->contact_phone])
            ->keyBy(fn($c) => $c['phone'] ?? 'shop_'.$c['id']);

        $addressCustomers = Customer::query()
            ->where('company_code', $companyCode)
            ->where('AdrTypKy', 1)
            ->orderBy('FstNm')
            ->limit(500)
            ->get()
            ->map(fn($c) => ['id' => $c->AdrKy, 'name' => trim($c->FstNm . ' ' . ($c->LstNm ?? '')), 'phone' => $c->TP1]) // NOSONAR - Data transformation, not SQL
            ->keyBy(fn($c) => $c['phone'] ?? 'adr_'.$c['id']);

        $deliveryCustomers = Delivery::query()
            ->where('company_code', $companyCode)
            ->selectRaw('customer_name, customer_phone')
            ->distinct()
            ->get()
            ->map(fn($d) => ['id' => $d->customer_phone ?: ('name:' . substr($d->customer_name ?? '', 0, 40)), 'name' => $d->customer_name, 'phone' => $d->customer_phone])
            ->keyBy(fn($c) => $c['phone'] ?? ('name:' . ($c['name'] ?? '')));

        $customers = $shopCustomers->values()->all();

        $routes = DeliveryRoute::where('company_code', $companyCode)->where('is_active', true)->get();
        $salesReps = User::where('company_code', $companyCode)->whereHas('role', fn($q) => $q->where('level', 'sales_rep'))->where('is_active', true)->get();

        return Inertia::render('Reports/DeliveryOutstandingAging', [
            'deliveries' => $deliveries,
            'bucket_totals' => $bucketTotalsArray,
            'summary' => [
                'total_outstanding' => (float) $summaryTotalOutstanding,
                'total_deliveries' => $deliveries->count(),
            ],
            'filters' => [
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'bucket' => $bucketFilter,
                'route_id' => $routeId,
                'rep_id' => $repId,
                'min_outstanding' => $minOutstanding,
                'customer_id' => $customerId,
            ],
            'routes' => $routes,
            'salesReps' => $salesReps,
            'customers' => $customers,
        ]);
    }

    public function export(Request $request)
    {
        if (!request()->user()->hasPermission('reports.delivery_outstanding_aging')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $user = Auth::user();
        $companyCode = $user->company_code;

        $dateFrom = $request->input('date_from', now()->subDays(90)->format('Y-m-d'));
        $dateTo = $request->input('date_to', now()->format('Y-m-d'));
        $bucketFilter = $request->input('bucket', 'all');
        $routeId = $request->input('route_id');
        $repId = $request->input('rep_id');
        $minOutstanding = (float) $request->input('min_outstanding', 0);
        $customerId = $request->input('customer_id');

        $allDeliveries = Delivery::with(['items', 'payments', 'deliveryRoute', 'assignedUser', 'shop'])
            ->where('company_code', $companyCode)
            ->whereBetween('delivery_date', [$dateFrom, $dateTo])
            ->when($routeId && $routeId !== 'all', fn($q) => $q->where('delivery_route_id', $routeId))
            ->when($repId && $repId !== 'all', fn($q) => $q->where('assigned_user_id', $repId))
            ->when($customerId && $customerId !== 'all', function ($q) use ($customerId) {
                if (str_starts_with((string) $customerId, 'shop:')) {
                    $shopId = (int) substr((string) $customerId, 5);
                    $shop = Shop::find($shopId);

                    if ($shop) {
                        $q->where(function ($sub) use ($shopId, $shop) {
                            $sub->where('shop_id', $shopId)
                                ->orWhere('customer_phone', $shop->contact_phone)
                                ->orWhere('customer_name', 'like', '%' . $this->escapeLikePattern($shop->name) . '%');
                        });
                    } else {
                        $q->where('shop_id', $shopId);
                    }

                    return;
                }

                if (is_numeric($customerId)) {
                    $cust = Customer::find((int) $customerId);
                    if ($cust) {
                        $phone = $cust->TP1 ?? null;
                        if ($phone) $q->where('customer_phone', $phone);
                        else $q->where('customer_name', 'like', '%' . $this->escapeLikePattern($cust->FstNm) . '%');
                        return;
                    }

                    $shop = Shop::find((int) $customerId);
                    if ($shop) {
                        $q->where('shop_id', $shop->id);
                        return;
                    }

                    $q->where('customer_phone', (string) $customerId);
                    return;
                }

                if (str_starts_with((string) $customerId, 'name:')) {
                    $name = substr((string) $customerId, 5);
                    $q->where('customer_name', 'like', '%' . $this->escapeLikePattern($name) . '%');
                    return;
                }

                $q->where(function ($sub) use ($customerId) {
                    $sub->where('customer_phone', (string) $customerId)
                        ->orWhere('customer_name', 'like', '%' . $this->escapeLikePattern((string) $customerId) . '%');
                });
            })
            ->get()
            ->map(function ($d) {
                $outstanding = $d->outstanding_balance;
                $age = (int) Carbon::parse($d->delivery_date)->startOfDay()->diffInDays(Carbon::now()->startOfDay());
                $bucket = $age <= 30 ? '0-30' : ($age <= 60 ? '31-60' : ($age <= 90 ? '61-90' : '>90'));

                return [
                    'delivery_number' => $d->delivery_number,
                    'customer_name' => $d->customer_name,
                    'delivery_date' => $d->delivery_date ? Carbon::parse($d->delivery_date)->toDateString() : '',
                    'days' => $age,
                    'bucket' => $bucket,
                    'outstanding' => (float) $outstanding,
                    'last_payment_date' => ($d->payments->sortByDesc('payment_date')->first()?->payment_date) ? Carbon::parse($d->payments->sortByDesc('payment_date')->first()?->payment_date)->toDateString() : '',
                    'sales_rep' => $d->assignedUser ? ($d->assignedUser->first_name . ' ' . $d->assignedUser->last_name) : 'Unassigned',
                    'route' => $d->deliveryRoute?->name ?? 'N/A',
                    'shop' => $d->shop?->name ?? null,
                ];
            });

        // when customer is selected show ALL deliveries (paid or unpaid), otherwise only outstanding rows are exported
        $rowsForCsv = ($customerId && $customerId !== 'all') ? $allDeliveries : $allDeliveries->filter(fn($r) => $r['outstanding'] > 0 && $r['outstanding'] >= $minOutstanding)->values();

        if ($bucketFilter !== 'all') {
            $rowsForCsv = $rowsForCsv->where('bucket', $bucketFilter)->values();
        }

        $csv = [];
        $csv[] = ['Delivery Outstanding / Aging Report'];
        $csv[] = ['Date Range', "{$dateFrom} to {$dateTo}"];
        $csv[] = [];
        $csv[] = ['Delivery #', 'Customer', 'Route', 'Sales Rep', 'Delivery Date', 'Days', 'Bucket', 'Outstanding (Rs.)', 'Last Payment Date', 'Shop'];

        foreach ($rowsForCsv as $d) {
            $csv[] = [
                $d['delivery_number'],
                $d['customer_name'],
                $d['route'],
                $d['sales_rep'],
                $d['delivery_date'],
                $d['days'],
                $d['bucket'],
                'Rs. ' . number_format($d['outstanding'], 2),
                $d['last_payment_date'] ?? '',
                $d['shop'] ?? '',
            ];
        }

        $safeFilename = preg_replace('/[^a-zA-Z0-9_\-]/', '_', "delivery_outstanding_{$dateFrom}_to_{$dateTo}"); // NOSONAR - Sanitized filename
        $handle = fopen('php://output', 'w');
        ob_start();
        foreach ($csv as $row) {
            fputcsv($handle, $row);
        }
        fclose($handle);
        $content = ob_get_clean();

        return response($content, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$safeFilename}.csv\"",
        ]);
    }

    public function sendReminder(Request $request, $deliveryId)
    {
        if (!request()->user()->hasPermission('reports.delivery_outstanding_aging')) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $delivery = Delivery::where('id', $deliveryId)->where('company_code', Auth::user()->company_code)->first();
        if (!$delivery) {
            return response()->json(['success' => false, 'message' => 'Delivery not found'], 404);
        }

        // collect candidate recipient phones (delivery phone first, then shop contact)
        $candidates = [];
        if (!empty($delivery->customer_phone)) $candidates[] = $delivery->customer_phone;
        if (!empty($delivery->shop?->contact_phone) && ($delivery->shop->contact_phone !== ($delivery->customer_phone ?? null))) {
            $candidates[] = $delivery->shop->contact_phone;
        }

        if (empty($candidates)) {
            return response()->json(['success' => false, 'message' => 'No customer phone number available'], 422);
        }

        try {
            $outstanding = number_format($delivery->outstanding_balance, 2);
            $message = "Reminder: Delivery {$delivery->delivery_number} has an outstanding balance of Rs. {$outstanding}. Please clear the payment. Thank you.";

            $smsService = app(\App\Services\SmsService::class);
            $lastResult = null;

            foreach ($candidates as $candidatePhone) {
                // try each candidate; if provider rejects for invalid phone, continue to next
                $smsResult = $smsService->sendSms($candidatePhone, $message, $delivery->delivery_number, 'delivery_reminder');
                $lastResult = $smsResult;

                if (!empty($smsResult['success'])) {
                    return response()->json(['success' => true, 'message' => $smsResult['message'] ?? 'Reminder queued'], 200);
                }

                // if the service explicitly flagged invalid phone, try the next candidate
                $errKey = $smsResult['error'] ?? null;
                $errMsg = strtolower($smsResult['message'] ?? ($smsResult['error'] ?? ''));
                if ($errKey === 'invalid_phone' || stripos($errMsg, 'invalid phone') !== false || stripos($errMsg, 'no recipients') !== false) {
                    continue;
                }

                // other errors should be propagated immediately
                return response()->json([
                    'success' => false,
                    'message' => $smsResult['message'] ?? ($smsResult['error'] ?? 'Failed to send reminder')
                ], 422);
            }

            // none succeeded
            return response()->json([
                'success' => false,
                'message' => $lastResult['message'] ?? 'No valid recipient phone numbers found'
            ], 422);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
}

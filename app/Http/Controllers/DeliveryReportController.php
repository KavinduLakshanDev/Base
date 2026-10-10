<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Delivery;
use App\Models\Shop;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DeliveryReportController extends Controller
{
    /**
     * Van report (per-customer) — shows deliveries, item details and payments for a single customer/shop.
     * Accepts optional query params: customer_id, date_from, date_to
     */
    public function index(Request $request)
    {
        if (! request()->user()->hasPermission('reports.deliveries')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view delivery reports.');
        }

        $companyCode = request()->user()->company_code;

        // 1) Shops (delivery shops) — prefer showing shops in van-report selector
        $shopCustomers = \App\Models\Shop::query()
            ->where('company_code', $companyCode)
            ->orderBy('name')
            ->get()
            ->map(function ($s) {
                return [
                    'id' => 'shop:' . $s->id,
                    'name' => $s->name,
                    'phone' => $s->contact_phone,
                ];
            })->keyBy(fn ($c) => $c['phone'] ?? 'shop_'.$c['id']);

        // 2) Get customers from master `address` (Customer) table
        $addressCustomers = Customer::query()
            ->where('company_code', $companyCode)
            ->where('AdrTypKy', 1)
            ->orderBy('FstNm')
            ->limit(500)
            ->get()
            ->map(function ($c) {
                return [
                    'id' => $c->AdrKy,               // keep numeric id when available
                    'name' => trim($c->FstNm . ' ' . ($c->LstNm ?? '')),
                    'phone' => $c->TP1,
                ];
            })->keyBy(fn ($c) => $c['phone'] ?? 'adr_'.$c['id']);

        // 3) Fallback: collect distinct customer names/phones from deliveries for the company
        $deliveryCustomers = Delivery::query()
            ->where('company_code', $companyCode)
            ->selectRaw('customer_name, customer_phone')
            ->distinct()
            ->get()
            ->map(function ($d) {
                return [
                    'id' => $d->customer_phone ?: ('name:' . substr($d->customer_name ?? '', 0, 40)),
                    'name' => $d->customer_name,
                    'phone' => $d->customer_phone,
                ];
            })->keyBy(fn ($c) => $c['phone'] ?? ('name:' . ($c['name'] ?? '')));

        // Merge (shops first, then address customers, then delivery fallbacks)
        $customersCollection = $shopCustomers->union($addressCustomers)->union($deliveryCustomers)->values();
        $customers = $customersCollection->all();

        $selectedCustomer = null;
        $deliveries = [];

        if ($request->filled('customer_id')) {
            $cid = (string) $request->input('customer_id');

            // support shop:<id> keys first
            $shopId = null;
            if (str_starts_with($cid, 'shop:')) {
                $shopId = (int) substr($cid, 5);
                $selectedCustomer = Shop::find($shopId);
                $phone = $selectedCustomer?->contact_phone ?? null;
                $fullName = $selectedCustomer?->name ?? null;
            } elseif (is_numeric($cid)) {
                // numeric could be an AdrKy (Customer) or a Shop id — try Customer first, then Shop
                $selectedCustomer = Customer::find((int) $cid);

                if ($selectedCustomer) {
                    $phone = $selectedCustomer->TP1 ?? null;
                    $fullName = trim($selectedCustomer->FstNm . ' ' . ($selectedCustomer->LstNm ?? ''));
                } else {
                    // maybe it's a Shop id
                    $selectedCustomer = Shop::find((int) $cid);
                    if ($selectedCustomer) {
                        $shopId = $selectedCustomer->id;
                        $phone = $selectedCustomer->contact_phone ?? null;
                        $fullName = $selectedCustomer->name ?? null;
                    } else {
                        // Numeric but not an AdrKy or Shop id — treat as phone
                        $phone = $cid;
                        $fullName = null;

                        $selectedCustomer = Customer::where('company_code', $companyCode)
                            ->where(function ($q) use ($phone) {
                                $q->where('TP1', $phone)
                                  ->orWhereRaw("CONCAT(FstNm, ' ', COALESCE(LstNm, '')) like ?", ["%{$phone}%"]);
                            })->first();
                    }
                }
            } else {
                // Non-numeric keys can be either a phone or a delivery-derived name key starting with "name:"
                $phone = null;
                $fullName = null;

                if (str_starts_with($cid, 'name:')) {
                    $fullName = substr($cid, 5); // remove prefix

                    // try to resolve a Customer record by matching name
                    $selectedCustomer = Customer::where('company_code', $companyCode)
                        ->whereRaw("CONCAT(FstNm, ' ', COALESCE(LstNm, '')) like ?", ["%{$fullName}%"])
                        ->first();

                    // if not found, create a lightweight object from a sample delivery later
                } else {
                    // treat as phone
                    $phone = $cid;

                    $selectedCustomer = Customer::where('company_code', $companyCode)
                        ->where(function ($q) use ($phone) {
                            $q->where('TP1', $phone)
                              ->orWhereRaw("CONCAT(FstNm, ' ', COALESCE(LstNm, '')) like ?", ["%{$phone}%"]);
                        })->first();
                }

                // if still not resolved to a Customer object, try to find a sample delivery to provide display info
                if (! $selectedCustomer) {
                    $sampleQuery = Delivery::where('company_code', $companyCode);

                    if ($phone) {
                        $sampleQuery->where(function ($q) use ($phone) {
                            $q->where('customer_phone', $phone)
                              ->orWhere('customer_name', 'like', "%{$phone}%");
                        });
                    } elseif ($fullName) {
                        $sampleQuery->where('customer_name', 'like', "%{$fullName}%");
                    }

                    $sample = $sampleQuery->first();

                    if ($sample) {
                        $selectedCustomer = (object) [
                            'name' => $sample->customer_name,
                            'FstNm' => $sample->customer_name,
                            'TP1' => $sample->customer_phone,
                        ];
                        $fullName = $fullName ?? $sample->customer_name;
                        $phone = $phone ?? $sample->customer_phone;
                    }
                }
            }

            if ($shopId || $phone || $fullName) {
                if ($shopId) {
                    $query = Delivery::query()
                        ->where('company_code', $companyCode)
                        ->where('shop_id', $shopId)
                        ->with(['items', 'payments'])
                        ->orderByDesc('delivery_date');
                } else {
                    $query = Delivery::query()
                        ->where('company_code', $companyCode)
                        ->when($phone, fn($q) => $q->where('customer_phone', $phone))
                        ->when(!$phone && $fullName, fn($q) => $q->where('customer_name', 'like', "%{$fullName}%"))
                        ->with(['items', 'payments'])
                        ->orderByDesc('delivery_date');
                }

                if ($request->filled('date_from')) {
                    $query->whereDate('delivery_date', '>=', $request->input('date_from'));
                }
                if ($request->filled('date_to')) {
                    $query->whereDate('delivery_date', '<=', $request->input('date_to'));
                }

                $deliveries = $query->get();
            }
        }

        return Inertia::render('delivery/van-report', [
            'customers' => $customers,
            'selectedCustomer' => $selectedCustomer,
            'deliveries' => $deliveries,
            'filters' => [
                'customer_id' => $request->input('customer_id'),
                'date_from' => $request->input('date_from'),
                'date_to' => $request->input('date_to'),
            ],
        ]);
    }
}

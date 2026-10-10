<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\ServiceJobItem;
use App\Models\User;
use App\Models\AccMas;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;

class ServiceChargesReportController extends Controller
{
    public function index(Request $request)
    {
        if (!$request->user()->hasPermission('reports.service_charges')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view reports.');
        }

        $user = Auth::user();
        $company = $this->getCompany();
        
        $fromDate = $request->get('from_date');
        $toDate = $request->get('to_date');
        $sectionCode = $request->get('section_code', $user->section_code);
        $technicianId = $request->get('technician_id');
        $includeProducts = $request->boolean('include_products', false);
        
        $filters = [
            'from_date' => $fromDate,
            'to_date' => $toDate,
            'section_code' => $sectionCode,
            'technician_id' => $technicianId,
            'include_products' => $includeProducts,
        ];
        
        $reportData = null;
        $companyCode = ($user->role_id === 1) ? session('selected_company') : $user->company_code;
        
        if ($fromDate && $toDate) {
            $reportData = $this->getReportData($fromDate, $toDate, $companyCode, $technicianId);
        }
        
        $technicians = User::whereHas('role', function($q) {
            $q->where('level', 'technician')
              ->orWhere('slug', 'like', '%technician%');
        })->get(['id', 'first_name', 'last_name']);

        return Inertia::render('Reports/ServiceChargesReport', [
            'company' => [
                'name' => $company->company_name ?? 'VISMASS PVT LTD',
                'branch' => $company->branch ?? 'Main Branch',
                'code' => $company->company_code ?? 'VISMASS',
                'branch_code' => $company->branch_code ?? '001',
            ],
            'filters' => $filters,
            'reportData' => $reportData,
            'technicians' => $technicians,
        ]);
    }

    private function getReportData($fromDate, $toDate, $companyCode, $technicianId = null)
    {
        $from = Carbon::parse($fromDate)->startOfDay();
        $to = Carbon::parse($toDate)->endOfDay();
        
        $query = ServiceJobItem::with(['serviceJob.customer', 'serviceJob.technician'])
            ->where('item_type', 'service_charge')
            ->whereHas('serviceJob', function($q) use ($from, $to, $companyCode, $technicianId) {
                // Base query for completed service jobs
                $q->whereIn('status', ['completed', 'delivered'])
                  ->where(function($sq) use ($from, $to) {
                      $sq->whereBetween('actual_completion_date', [$from, $to])
                        ->orWhere(function($ssq) use ($from, $to) {
                            $ssq->whereNull('actual_completion_date')
                               ->whereBetween('invoice_date', [$from, $to]);
                        })
                        ->orWhere(function($ssq) use ($from, $to) {
                            $ssq->whereNull('actual_completion_date')
                               ->whereNull('invoice_date')
                               ->whereBetween('updated_at', [$from, $to]);
                        });
                  });
                
                if ($companyCode) {
                    $q->where('company_code', $companyCode);
                }
                
                if ($technicianId) {
                    $q->where('assigned_technician_id', $technicianId);
                }
            });

        $items = $query->get();

        $data = [];
        $totalQuantity = 0;
        $totalAmount = 0;

        foreach ($items as $item) {
            $job = $item->serviceJob;
            if (!$job) continue;

            $completionDate = $job->actual_completion_date 
                ? Carbon::parse($job->actual_completion_date)
                : ($job->invoice_date 
                    ? Carbon::parse($job->invoice_date)
                    : Carbon::parse($job->updated_at));

            $customerName = $job->customer ? $job->customer->AccNm : $job->customer_name;
            $technicianName = $job->technician ? ($job->technician->first_name . ' ' . $job->technician->last_name) : 'Unassigned';

            $total = $item->quantity * $item->unit_price;

            $products = [];
            $productItems = ServiceJobItem::where('service_job_id', $job->id)
                ->where('item_type', 'part')
                ->get();

            foreach ($productItems as $product) {
                $products[] = [
                    'item_code' => $product->item_code,
                    'item_name' => $product->item_name,
                    'quantity'  => (float) $product->quantity,
                    'unit_price'=> (float) $product->unit_price,
                    'total'     => (float) ($product->quantity * $product->unit_price),
                ];
            }

            $data[] = [
                'job_id' => $job->id,
                'job_number' => $job->job_number,
                'completion_date' => $completionDate->format('Y-m-d'),
                'customer_name' => $customerName,
                'technician_name' => $technicianName,
                'service_charge' => $item->item_name,
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price,
                'total' => $total,
                'status' => $job->status,
                'products' => $products,
            ];

            $totalQuantity += $item->quantity;
            $totalAmount += $total;
        }

        // Sort by completion date desc
        usort($data, function($a, $b) {
            return strtotime($b['completion_date']) - strtotime($a['completion_date']);
        });

        return [
            'items' => $data,
            'summary' => [
                'total_quantity' => $totalQuantity,
                'total_amount' => round($totalAmount, 2),
                'total_records' => count($data)
            ]
        ];
    }

    private function getCompany()
    {
        $user = Auth::user();
        if ($user && $user->company_code) {
            return Company::where('company_code', $user->company_code)->first() ?? new Company();
        }
        return new Company();
    }

    public function export(Request $request)
    {
        if (!$request->user()->hasPermission('reports.service_charges')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $fromDate = $request->get('from_date');
        $toDate = $request->get('to_date');
        $sectionCode = $request->get('section_code');
        $technicianId = $request->get('technician_id');
        $format = $request->get('format', 'pdf');
        $includeProducts = $request->boolean('include_products', false);

        if (!$fromDate || !$toDate) {
            return back()->with('error', 'Please select valid date range');
        }

        $user = $request->user();
        $companyCode = ($user->role_id === 1) ? session('selected_company') : $user->company_code;

        $reportData = $this->getReportData($fromDate, $toDate, $companyCode, $technicianId);
        $company = $this->getCompany();

        if ($format === 'excel') {
            return $this->exportExcel($reportData, $company, $fromDate, $toDate, $includeProducts);
        }

        return $this->exportPdf($reportData, $company, $fromDate, $toDate, $includeProducts);
    }

    private function exportPdf($reportData, $company, $fromDate, $toDate, bool $includeProducts = false)
    {
        // DomPDF can be memory-intensive for large reports
        ini_set('memory_limit', '512M');
        ini_set('max_execution_time', '120');

        $pdf = Pdf::loadView('reports.service-charges-pdf', [
            'company' => [
                'name' => $company->company_name ?? 'VISMASS PVT LTD',
                'branch' => $company->branch ?? 'Main Branch',
                'code' => $company->company_code ?? 'VISMASS',
                'branch_code' => $company->branch_code ?? '001',
            ],
            'reportData' => $reportData,
            'fromDate' => $fromDate,
            'toDate' => $toDate,
            'includeProducts' => $includeProducts,
        ])->setPaper('a4', 'landscape');

        $filename = "service-charges-report-" . date('Y-m-d') . ".pdf";
        return $pdf->download($filename);
    }

    private function exportExcel($reportData, $company, $fromDate, $toDate, bool $includeProducts = false)
    {
        $filename = "service-charges-report-" . date('Y-m-d') . ".csv";
        
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"$filename\"",
        ];

        $callback = function() use ($reportData, $fromDate, $toDate, $includeProducts) {
            $file = fopen('php://output', 'w');
            
            fputcsv($file, ['Service Charges Report']);
            fputcsv($file, ['From: ' . $fromDate, 'To: ' . $toDate]);
            fputcsv($file, []);

            if ($includeProducts) {
                fputcsv($file, [
                    'Date',
                    'Job Number',
                    'Customer',
                    'Technician',
                    'Service Charge',
                    'Status',
                    'Service Price',
                    'Product Name',
                    'Product Price',
                    'Job Total',
                ]);
            } else {
                fputcsv($file, [
                    'Date',
                    'Job Number',
                    'Customer',
                    'Technician',
                    'Service Charge',
                    'Status',
                    'Total',
                ]);
            }
            
            foreach ($reportData['items'] as $item) {
                if ($includeProducts) {
                    $products = $item['products'] ?? [];
                    $productNames = implode(' | ', array_map(fn($p) => $p['item_name'] . ' x' . number_format($p['quantity'], 2), $products));
                    $productTotal = array_sum(array_column($products, 'total'));
                    $jobTotal = $item['total'] + $productTotal;

                    fputcsv($file, [
                        $item['completion_date'],
                        $item['job_number'],
                        $item['customer_name'],
                        $item['technician_name'],
                        $item['service_charge'],
                        ucfirst(str_replace('_', ' ', $item['status'])),
                        number_format($item['total'], 2),
                        $productNames ?: '—',
                        number_format($productTotal, 2),
                        number_format($jobTotal, 2),
                    ]);
                } else {
                    fputcsv($file, [
                        $item['completion_date'],
                        $item['job_number'],
                        $item['customer_name'],
                        $item['technician_name'],
                        $item['service_charge'],
                        ucfirst(str_replace('_', ' ', $item['status'])),
                        number_format($item['total'], 2),
                    ]);
                }
            }
            
            fputcsv($file, []);
            fputcsv($file, ['Total Service Amount', number_format($reportData['summary']['total_amount'], 2)]);

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}

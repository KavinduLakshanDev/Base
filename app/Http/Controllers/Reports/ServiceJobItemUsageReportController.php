<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\ServiceJob;
use App\Models\ServiceJobItem;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ServiceJobItemUsageReportController extends Controller
{
    public function index(Request $request)
    {
        if (!$request->user()->hasPermission('reports.service_jobs')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view reports.');
        }

        $user = Auth::user();
        $company = $this->getCompany();
        
        $groupBy = $request->get('group_by', 'job');
        $fromDate = $request->get('from_date');
        $toDate = $request->get('to_date');
        $companyCode = ($user->role_id === 1) ? session('selected_company') : $user->company_code;
        
        $reportData = $this->getReportData($companyCode, $groupBy, $fromDate, $toDate);
        
        return Inertia::render('Reports/ServiceJobItemUsageReport', [
            'company' => [
                'name' => $company->company_name ?? 'VISMASS PVT LTD',
                'branch' => $company->branch ?? 'Main Branch',
                'code' => $company->company_code ?? 'VISMASS',
                'branch_code' => $company->branch_code ?? '001',
            ],
            'filters' => [
                'group_by' => $groupBy,
                'from_date' => $fromDate,
                'to_date' => $toDate,
            ],
            'reportData' => $reportData,
        ]);
    }

    private function getReportData($companyCode, $groupBy = 'job', $fromDate = null, $toDate = null)
    {
        $query = ServiceJobItem::with(['serviceJob', 'serviceJob.customer', 'itemMaster', 'itemMaster.stockInHand'])
            ->where('item_type', 'part')
            ->whereHas('serviceJob', function($q) use ($companyCode, $fromDate, $toDate) {
                $q->where('status', '!=', 'delivered');
                if ($companyCode) {
                    $q->where('company_code', $companyCode);
                }
                if ($fromDate) {
                    $q->whereDate('received_date', '>=', $fromDate);
                }
                if ($toDate) {
                    $q->whereDate('received_date', '<=', $toDate);
                }
            });

        // We want to sort by service job received_date mostly
        // so we'll use a join for ordering, or just order by service_job_id
        $items = $query->get();

        $data = [];
        $totalQuantity = 0;
        $totalAmount = 0;

        if ($groupBy === 'item') {
            $groupedItems = [];
            foreach ($items as $item) {
                $job = $item->serviceJob;
                if (!$job) continue;

                $itemCode = $item->item_code ?: ($item->itemMaster ? $item->itemMaster->ItemCode : '-');
                $itemName = $item->item_name ?: ($item->itemMaster ? $item->itemMaster->ItmNm : '-');

                $key = $itemCode;

                if (!isset($groupedItems[$key])) {
                    $groupedItems[$key] = [
                        'item_code' => $itemCode,
                        'item_name' => $itemName,
                        'item_type' => $item->item_type,
                        'quantity' => 0,
                        'total_price' => 0,
                    ];
                }

                $groupedItems[$key]['quantity'] += $item->quantity;
                $groupedItems[$key]['total_price'] += $item->total_price;

                $totalQuantity += $item->quantity;
                $totalAmount += $item->total_price;
            }

            $data = array_values($groupedItems);

            // Sort data by item_code
            usort($data, function($a, $b) {
                return strcmp($a['item_code'], $b['item_code']);
            });

        } else {
            foreach ($items as $item) {
                $job = $item->serviceJob;
                if (!$job) continue;

                $customerName = $job->customer ? $job->customer->AccNm : $job->customer_name;
                
                // Get current stock if available
                $currentStock = 0;
                if ($item->itemMaster && $item->itemMaster->stockInHand) {
                    $currentStock = $item->itemMaster->stockInHand->sum('Qty') ?? 0;
                }

                $itemCode = $item->item_code ?: ($item->itemMaster ? $item->itemMaster->ItemCode : '-');
                $itemName = $item->item_name ?: ($item->itemMaster ? $item->itemMaster->ItmNm : '-');

                $data[] = [
                    'id' => $item->id,
                    'job_id' => $job->id,
                    'job_number' => $job->job_number,
                    'received_date' => $job->received_date->format('Y-m-d'),
                    'customer_name' => $customerName,
                    'item_code' => $itemCode,
                    'item_name' => $itemName,
                    'item_type' => $item->item_type,
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unit_price,
                    'total_price' => $item->total_price,
                    'current_stock' => $currentStock
                ];

                $totalQuantity += $item->quantity;
                $totalAmount += $item->total_price;
            }
            
            // Sort data by received_date desc, then job_id desc to group them
            usort($data, function($a, $b) {
                $dateCmp = strtotime($b['received_date']) - strtotime($a['received_date']);
                if ($dateCmp === 0) {
                    return $b['job_id'] <=> $a['job_id'];
                }
                return $dateCmp;
            });
        }

        return [
            'items' => $data,
            'summary' => [
                'total_quantity' => round($totalQuantity, 4),
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
        if (!$request->user()->hasPermission('reports.service_jobs')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $format = $request->get('format', 'pdf');
        $groupBy = $request->get('group_by', 'job');
        $fromDate = $request->get('from_date');
        $toDate = $request->get('to_date');

        $user = $request->user();
        $companyCode = ($user->role_id === 1) ? session('selected_company') : $user->company_code;

        $reportData = $this->getReportData($companyCode, $groupBy, $fromDate, $toDate);
        $company = $this->getCompany();

        if ($format === 'excel') {
            return $this->exportExcel($reportData, $company, $groupBy);
        }

        return $this->exportPdf($reportData, $company, $groupBy);
    }

    private function exportPdf($reportData, $company, $groupBy)
    {
        $pdf = Pdf::loadView('reports.service-job-item-usage-pdf', [
            'company' => [
                'name' => $company->company_name ?? 'VISMASS PVT LTD',
                'branch' => $company->branch ?? 'Main Branch',
                'code' => $company->company_code ?? 'VISMASS',
                'branch_code' => $company->branch_code ?? '001',
            ],
            'reportData' => $reportData,
            'groupBy' => $groupBy,
        ])->setPaper('a4', 'landscape');

        $filename = "service-job-item-usage-report-" . date('Y-m-d') . ".pdf";
        return $pdf->download($filename);
    }

    private function exportExcel($reportData, $company, $groupBy)
    {
        $filename = "service-job-item-usage-report-" . date('Y-m-d') . ".csv";
        
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"$filename\"",
        ];

        $callback = function() use ($reportData, $groupBy) {
            $file = fopen('php://output', 'w');
            
            fputcsv($file, ['Service Jobs Item Usage Report']);
            fputcsv($file, []);
            
            if ($groupBy === 'item') {
                fputcsv($file, [
                    'Item Code',
                    'Item Name', 
                    'Qty Used'
                ]);
                
                foreach ($reportData['items'] as $item) {
                    fputcsv($file, [
                        $item['item_code'],
                        $item['item_name'],
                        $item['quantity']
                    ]);
                }

                fputcsv($file, []);
                fputcsv($file, [
                    'Total', 
                    '', 
                    $reportData['summary']['total_quantity']
                ]);
            } else {
                fputcsv($file, [
                    'Date', 
                    'Job Number', 
                    'Customer', 
                    'Item Code',
                    'Item Name', 
                    'Qty Used'
                ]);
                
                foreach ($reportData['items'] as $item) {
                    fputcsv($file, [
                        $item['received_date'],
                        $item['job_number'],
                        $item['customer_name'],
                        $item['item_code'],
                        $item['item_name'],
                        $item['quantity']
                    ]);
                }
                
                fputcsv($file, []);
                fputcsv($file, [
                    'Total', 
                    '', 
                    '', 
                    '', 
                    '', 
                    $reportData['summary']['total_quantity']
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}

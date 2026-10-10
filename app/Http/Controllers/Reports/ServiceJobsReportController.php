<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\ServiceJob;
use App\Models\User;
use App\Models\AccMas;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;

class ServiceJobsReportController extends Controller
{
    public function index(Request $request)
    {
        if (!$request->user()->hasPermission('reports.service_jobs')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view reports.');
        }

        $user = Auth::user();
        $company = $this->getCompany();
        
        $fromDate = $request->get('from_date');
        $toDate = $request->get('to_date');
        $technicianId = $request->get('technician_id');
        $status = $request->get('status');
        
        $filters = [
            'from_date' => $fromDate,
            'to_date' => $toDate,
            'technician_id' => $technicianId,
            'status' => $status,
        ];
        
        $companyCode = ($user->role_id === 1) ? session('selected_company') : $user->company_code;
        
        $reportData = null;
        
        if ($fromDate || $toDate) {
            $reportData = $this->getReportData($fromDate, $toDate, $companyCode, $technicianId, $status);
        }

        $technicians = User::whereHas('role', function($q) {
            $q->where('level', 'technician')
              ->orWhere('slug', 'like', '%technician%');
        })->where('company_code', $companyCode)->get(['id', 'first_name', 'last_name']);
        
        return Inertia::render('Reports/ServiceJobsReport', [
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

    private function getReportData($fromDate, $toDate, $companyCode, $technicianId = null, $status = null)
    {
        $startDateStr = $fromDate ?: $toDate;
        $endDateStr   = $toDate ?: $fromDate;

        $from = Carbon::parse($startDateStr)->startOfDay();
        $to   = Carbon::parse($endDateStr)->endOfDay();

        $dateColumn = match($status) {
            'delivered' => 'delivered_date',
            'completed' => 'actual_completion_date',
            default     => 'received_date',
        };

        $query = ServiceJob::with(['customer', 'technician']);

        if ($fromDate || $toDate) {
            $query->whereBetween($dateColumn, [$from, $to]);
        }

        if ($companyCode) {
            $query->where('company_code', $companyCode);
        }

        if ($technicianId && $technicianId !== 'all') {
            $query->where('assigned_technician_id', $technicianId);
        }

        if ($status && $status !== 'all') {
            if ($status === 'completed' && ($fromDate || $toDate)) {
                $query->where(function ($q) {
                    $q->where('status', 'completed')
                      ->orWhere('status', 'delivered');
                });
            } else {
                $query->where('status', $status);
            }
        }

        $jobs = $query->orderBy($dateColumn, 'desc')->get();

        $data = [];
        $totalAmount = 0;

        foreach ($jobs as $job) {
            $customerName = $job->customer ? $job->customer->AccNm : $job->customer_name;
            $technicianName = $job->technician ? ($job->technician->first_name . ' ' . $job->technician->last_name) : 'Unassigned';

            $displayDate = match($status) {
                'delivered' => $job->delivered_date ? $job->delivered_date->format('Y-m-d') : ($job->received_date ? $job->received_date->format('Y-m-d') : ''),
                'completed' => $job->actual_completion_date ? $job->actual_completion_date->format('Y-m-d') : ($job->received_date ? $job->received_date->format('Y-m-d') : ''),
                default     => $job->received_date ? $job->received_date->format('Y-m-d') : '',
            };

            $data[] = [
                'id' => $job->id,
                'job_number' => $job->job_number,
                'received_date' => $displayDate,
                'customer_name' => $customerName,
                'device' => trim($job->device_brand . ' ' . $job->device_model),
                'technician_name' => $technicianName,
                'status' => $job->status,
                'total_amount' => $job->total_amount ?? 0,
            ];

            $totalAmount += ($job->total_amount ?? 0);
        }

        return [
            'items' => $data,
            'summary' => [
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

        $fromDate = $request->get('from_date');
        $toDate = $request->get('to_date');
        $technicianId = $request->get('technician_id');
        $status = $request->get('status');
        $format = $request->get('format', 'pdf');

        if (!$fromDate && !$toDate) {
            return back()->with('error', 'Please select a valid date range');
        }

        $effectiveFrom = $fromDate ?: $toDate;
        $effectiveTo   = $toDate ?: $fromDate;

        $user = $request->user();
        $companyCode = ($user->role_id === 1) ? session('selected_company') : $user->company_code;

        $reportData = $this->getReportData($effectiveFrom, $effectiveTo, $companyCode, $technicianId, $status);
        $company = $this->getCompany();

        if ($format === 'excel') {
            return $this->exportExcel($reportData, $company, $effectiveFrom, $effectiveTo);
        }

        return $this->exportPdf($reportData, $company, $effectiveFrom, $effectiveTo);
    }

    private function exportPdf($reportData, $company, $fromDate, $toDate)
    {
        $pdf = Pdf::loadView('reports.service-jobs-pdf', [
            'company' => [
                'name' => $company->company_name ?? 'VISMASS PVT LTD',
                'branch' => $company->branch ?? 'Main Branch',
                'code' => $company->company_code ?? 'VISMASS',
                'branch_code' => $company->branch_code ?? '001',
            ],
            'reportData' => $reportData,
            'fromDate' => $fromDate,
            'toDate' => $toDate,
        ])->setPaper('a4', 'landscape');

        $filename = "service-jobs-report-" . date('Y-m-d') . ".pdf";
        return $pdf->download($filename);
    }

    private function exportExcel($reportData, $company, $fromDate, $toDate)
    {
        $filename = "service-jobs-report-" . date('Y-m-d') . ".csv";
        
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"$filename\"",
        ];

        $callback = function() use ($reportData, $fromDate, $toDate) {
            $file = fopen('php://output', 'w');
            
            fputcsv($file, ['Service Jobs Report']);
            fputcsv($file, ['From: ' . $fromDate, 'To: ' . $toDate]);
            fputcsv($file, []);
            
            fputcsv($file, [
                'Date', 
                'Job Number', 
                'Customer', 
                'Device',
                'Technician', 
                'Status',
                'Total Amount'
            ]);
            
            foreach ($reportData['items'] as $item) {
                fputcsv($file, [
                    $item['received_date'],
                    $item['job_number'],
                    $item['customer_name'],
                    $item['device'],
                    $item['technician_name'],
                    ucfirst(str_replace('_', ' ', $item['status'])),
                    number_format($item['total_amount'], 2)
                ]);
            }
            
            fputcsv($file, []);
            fputcsv($file, ['Total Amount', number_format($reportData['summary']['total_amount'], 2)]);

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}

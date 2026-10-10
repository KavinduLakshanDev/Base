<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\ServiceJob;
use App\Models\Company;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;

class DeviceServiceHistoryReportController extends Controller
{
    /**
     * Display the report index page.
     */
    public function index(Request $request)
    {
        return Inertia::render('Reports/DeviceServiceHistoryReport');
    }

    /**
     * Search for service history by device serial number.
     */
    public function search(Request $request)
    {
        $serial = $request->query('serial');

        if (!$serial) {
            return response()->json([
                'success' => false,
                'message' => 'Serial number is required.'
            ], 400);
        }

        $user = Auth::user();
        $companyCode = ($user->role_id === 1) ? session('selected_company') : $user->company_code;

        // Fetch jobs related to the specific serial number
        $query = ServiceJob::with(['technician', 'customer'])
            ->where('device_serial', $serial);

        if ($companyCode) {
            $query->where('company_code', $companyCode);
        }

        $jobs = $query->orderBy('received_date', 'desc')->get();

        if ($jobs->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'No service history found for this serial number.',
                'data' => []
            ]);
        }

        // Format data
        $data = $jobs->map(function ($job) {
            return [
                'id' => $job->id,
                'job_number' => $job->job_number,
                'received_date' => $job->received_date ? $job->received_date->format('Y-m-d') : null,
                'actual_completion_date' => $job->actual_completion_date ? $job->actual_completion_date->format('Y-m-d') : null,
                'delivered_date' => $job->delivered_date ? $job->delivered_date->format('Y-m-d') : null,
                'status' => $job->status,
                'problem_description' => $job->problem_description,
                'technician_name' => $job->technician ? ($job->technician->first_name . ' ' . $job->technician->last_name) : 'Unassigned',
                'customer_name' => $job->customer ? $job->customer->AccNm : $job->customer_name,
                'device_brand' => $job->device_brand,
                'device_model' => $job->device_model,
                'device_warranty' => $job->device_warranty,
                'total_amount' => $job->total_amount,
            ];
        });

        // Get unique device details from the most recent job
        $latestJob = $jobs->first();

        return response()->json([
            'success' => true,
            'device_summary' => [
                'brand' => $latestJob->device_brand,
                'model' => $latestJob->device_model,
                'warranty' => $latestJob->device_warranty,
                'serial' => $latestJob->device_serial
            ],
            'data' => $data
        ]);
    }

    /**
     * Export the report to PDF or CSV.
     */
    public function export(Request $request)
    {
        $serial = $request->query('serial');

        if (!$serial) {
            return back()->with('error', 'Serial number is required to export.');
        }

        $format = $request->query('format', 'pdf');
        $user = Auth::user();
        $companyCode = ($user->role_id === 1) ? session('selected_company') : $user->company_code;

        $query = ServiceJob::with(['technician', 'customer'])
            ->where('device_serial', $serial);

        if ($companyCode) {
            $query->where('company_code', $companyCode);
        }

        $jobs = $query->orderBy('received_date', 'desc')->get();

        if ($jobs->isEmpty()) {
            return back()->with('error', 'No service history found for this serial number.');
        }

        $data = $jobs->map(function ($job) {
            return [
                'id' => $job->id,
                'job_number' => $job->job_number,
                'received_date' => $job->received_date ? $job->received_date->format('Y-m-d') : '',
                'status' => $job->status,
                'problem_description' => $job->problem_description,
                'technician_name' => $job->technician ? ($job->technician->first_name . ' ' . $job->technician->last_name) : 'Unassigned',
                'customer_name' => $job->customer ? $job->customer->AccNm : $job->customer_name,
                'total_amount' => $job->total_amount,
            ];
        });

        $latestJob = $jobs->first();
        $deviceSummary = [
            'brand' => $latestJob->device_brand,
            'model' => $latestJob->device_model,
            'warranty' => $latestJob->device_warranty,
            'serial' => $latestJob->device_serial
        ];

        $company = Company::where('company_code', $companyCode)->first() ?? new Company();

        if ($format === 'excel') {
            return $this->exportExcel($data, $deviceSummary, $company);
        }

        return $this->exportPdf($data, $deviceSummary, $company);
    }

    private function exportPdf($reportData, $deviceSummary, $company)
    {
        $pdf = Pdf::loadView('reports.device-service-history-pdf', [
            'company' => [
                'name' => $company->company_name ?? 'VISMASS PVT LTD',
                'branch' => $company->branch ?? 'Main Branch',
                'code' => $company->company_code ?? 'VISMASS',
                'branch_code' => $company->branch_code ?? '001',
            ],
            'reportData' => $reportData,
            'deviceSummary' => $deviceSummary,
        ])->setPaper('a4', 'portrait');

        $filename = "device-history-" . $deviceSummary['serial'] . "-" . date('Y-m-d') . ".pdf";
        return $pdf->download($filename);
    }

    private function exportExcel($reportData, $deviceSummary, $company)
    {
        $filename = "device-history-" . $deviceSummary['serial'] . "-" . date('Y-m-d') . ".csv";
        
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"$filename\"",
        ];

        $callback = function() use ($reportData, $deviceSummary) {
            $file = fopen('php://output', 'w');
            
            fputcsv($file, ['Device Service History Report']);
            fputcsv($file, ['Serial Number:', $deviceSummary['serial']]);
            fputcsv($file, ['Brand:', $deviceSummary['brand'] ?? 'N/A']);
            fputcsv($file, ['Model:', $deviceSummary['model'] ?? 'N/A']);
            fputcsv($file, ['Warranty:', $deviceSummary['warranty'] ?? 'N/A']);
            fputcsv($file, []);
            
            fputcsv($file, [
                'Date', 
                'Job Number', 
                'Customer', 
                'Problem',
                'Technician', 
                'Status',
                'Total Amount'
            ]);
            
            $totalAmount = 0;
            foreach ($reportData as $item) {
                fputcsv($file, [
                    $item['received_date'],
                    $item['job_number'],
                    $item['customer_name'],
                    $item['problem_description'],
                    $item['technician_name'],
                    ucfirst(str_replace('_', ' ', $item['status'])),
                    number_format($item['total_amount'], 2)
                ]);
                $totalAmount += $item['total_amount'];
            }
            
            fputcsv($file, []);
            fputcsv($file, ['Total Amount', '', '', '', '', '', number_format($totalAmount, 2)]);

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}

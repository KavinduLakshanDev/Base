<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\ServiceJob;
use App\Models\ServiceJobItem;
use App\Models\User;
use App\Models\AccMas;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Carbon\Carbon;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Support\Facades\Auth;

class ServiceRevenueReportController extends Controller
{
    public function index(Request $request)
    {
        if (!$request->user()->hasPermission('reports.service_revenue')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view service revenue reports.');
        }

        $user = Auth::user();
        $company = $this->getCompany();
        
        $fromDate = $request->get('from_date');
        $toDate = $request->get('to_date');
        $sectionCode = $request->get('section_code', $user->section_code);
        $technicianId = $request->get('technician_id');
        $customerId = $request->get('customer_id');
        $vatFilter = $request->get('vat_filter', 'all'); // all, vat, non_vat
        $groupBy = $request->get('group_by', 'daily'); // daily, weekly, monthly
        
        $filters = [
            'from_date' => $fromDate,
            'to_date' => $toDate,
            'section_code' => $sectionCode,
            'technician_id' => $technicianId,
            'customer_id' => $customerId,
            'vat_filter' => $vatFilter,
            'group_by' => $groupBy,
        ];
        
        $revenueData = null;
        $technicians = User::whereHas('role', function($q) {
            $q->where('level', 'technician');
        })->where('company_code', $user->company_code)
          ->orderBy('first_name')
          ->get(['id', 'first_name', 'last_name']);


        $customers = AccMas::where('AccTyp', 'CUSTOMER')
            ->where('company_code', $user->company_code)
            ->orderBy('AccNm')
            ->get(['AccKy', 'AccNm', 'AccCd']);

        
        if ($fromDate && $toDate) {
            $revenueData = $this->getRevenueData($fromDate, $toDate, $user->company_code, $technicianId, $customerId, $vatFilter, $groupBy);
        }
        
        return Inertia::render('Reports/ServiceRevenueReport', [
            'company' => [
                'name' => $company->company_name ?? 'VISMASS PVT LTD',
                'branch' => $company->branch ?? 'Main Branch',
                'code' => $company->company_code ?? 'VISMASS',
                'branch_code' => $company->branch_code ?? '001',
            ],
            'filters' => $filters,
            'revenueData' => $revenueData,
            'technicians' => $technicians,
            'customers' => $customers,
        ]);
    }

    private function getRevenueData($fromDate, $toDate, $companyCode, $technicianId = null, $customerId = null, $vatFilter = 'all', $groupBy = 'daily')
    {
        $from = Carbon::parse($fromDate)->startOfDay();
        $to = Carbon::parse($toDate)->endOfDay();
        
        // Calculate previous period for comparison
        $daysDifference = $from->diffInDays($to);
        $previousFrom = $from->copy()->subDays($daysDifference + 1);
        $previousTo = $to->copy()->subDays($daysDifference + 1);
        
        // Base query for completed service jobs
        // Use actual_completion_date if available, otherwise use invoice_date or updated_at
        $query = ServiceJob::with(['items', 'technician', 'customer'])
            ->whereIn('status', ['completed', 'delivered'])
            ->where(function($q) use ($from, $to) {
                $q->whereBetween('actual_completion_date', [$from, $to])
                  ->orWhere(function($sq) use ($from, $to) {
                      $sq->whereNull('actual_completion_date')
                         ->whereBetween('invoice_date', [$from, $to]);
                  })
                  ->orWhere(function($sq) use ($from, $to) {
                      $sq->whereNull('actual_completion_date')
                         ->whereNull('invoice_date')
                         ->whereBetween('updated_at', [$from, $to]);
                  });
            });

        if ($companyCode) {
            $query->where('company_code', $companyCode);
        }

        if ($technicianId) {
            $query->where('assigned_technician_id', $technicianId);
        }

        if ($customerId) {
            $query->where('AccKy', $customerId);
        }

        if ($vatFilter === 'vat') {
            $query->where('is_vat_invoice', true);
        } elseif ($vatFilter === 'non_vat') {
            $query->where(function($q) {
                $q->where('is_vat_invoice', false)->orWhereNull('is_vat_invoice');
            });
        }

        $jobs = $query->orderByRaw('COALESCE(actual_completion_date, invoice_date, updated_at) DESC')
                     ->get();

        // Get previous period data for comparison — eager load items to avoid N+1
        $previousQuery = ServiceJob::with(['items'])
            ->whereIn('status', ['completed', 'delivered'])
            ->where(function($q) use ($previousFrom, $previousTo) {
                $q->whereBetween('actual_completion_date', [$previousFrom, $previousTo])
                  ->orWhere(function($sq) use ($previousFrom, $previousTo) {
                      $sq->whereNull('actual_completion_date')
                         ->whereBetween('invoice_date', [$previousFrom, $previousTo]);
                  })
                  ->orWhere(function($sq) use ($previousFrom, $previousTo) {
                      $sq->whereNull('actual_completion_date')
                         ->whereNull('invoice_date')
                         ->whereBetween('updated_at', [$previousFrom, $previousTo]);
                  });
            });
        
        if ($companyCode) {
            $previousQuery->where('company_code', $companyCode);
        }
        if ($technicianId) {
            $previousQuery->where('assigned_technician_id', $technicianId);
        }
        if ($customerId) {
            $previousQuery->where('AccKy', $customerId);
        }
        if ($vatFilter === 'vat') {
            $previousQuery->where('is_vat_invoice', true);
        } elseif ($vatFilter === 'non_vat') {
            $previousQuery->where(function($q) {
                $q->where('is_vat_invoice', false)->orWhereNull('is_vat_invoice');
            });
        }
        
        $previousJobs = $previousQuery->get();
        $previousRevenue = 0;
        foreach ($previousJobs as $prevJob) {
            $itemsTotal = $prevJob->items->sum(fn($i) => $i->quantity * $i->unit_price);
            // Fallback to stored total_amount if no items
            $previousRevenue += $itemsTotal > 0 ? $itemsTotal : (float)$prevJob->total_amount;
        }

        // Calculate totals
        $totalRevenue = 0;
        $totalPartsRevenue = 0;
        $totalServiceRevenue = 0;
        $totalVatCollected = 0;
        $totalJobsCount = $jobs->count();
        $totalCostPrice = 0;

        // Revenue by technician
        $revenueByTechnician = [];
        // Revenue by customer
        $revenueByCustomer = [];
        // Grouped data (daily, weekly, monthly)
        $groupedData = [];

        foreach ($jobs as $job) {
            $partsTotal = $job->items->where('item_type', 'part')->sum(function($item) {
                return $item->quantity * $item->unit_price;
            });
            
            $serviceTotal = $job->items->where('item_type', 'service_charge')->sum(function($item) {
                return $item->quantity * $item->unit_price;
            });
            
            $jobTotal = $partsTotal + $serviceTotal;
            
            // Fallback: if no line items recorded, use the stored total_amount on the job itself
            if ($jobTotal == 0 && $job->total_amount > 0) {
                $jobTotal     = (float) $job->total_amount;
                $serviceTotal = $jobTotal; // treat whole amount as service revenue
            }
            
            $jobVat = $job->is_vat_invoice ? ($job->vat_amount ?? 0) : 0;
            
            // Calculate cost and profit
            $jobCost = $job->items->sum(function($item) {
                return $item->quantity * ($item->cost_price ?? 0);
            });
            $jobProfit = $jobTotal - $jobCost;

            $totalRevenue += $jobTotal;
            $totalPartsRevenue += $partsTotal;
            $totalServiceRevenue += $serviceTotal;
            $totalVatCollected += $jobVat;
            $totalCostPrice += $jobCost;

            // Group by technician
            $technicianKey = $job->assigned_technician_id ?? 'unassigned';
            if (!isset($revenueByTechnician[$technicianKey])) {
                $revenueByTechnician[$technicianKey] = [
                    'technician_id' => $job->assigned_technician_id,
                    'technician_name' => $job->technician ? ($job->technician->first_name . ' ' . $job->technician->last_name) : 'Unassigned',
                    'jobs_count' => 0,
                    'total_revenue' => 0,
                    'parts_revenue' => 0,
                    'service_revenue' => 0,
                    'vat_collected' => 0,
                    'total_profit' => 0,
                    'avg_job_value' => 0,
                ];
            }
            $revenueByTechnician[$technicianKey]['jobs_count']++;
            $revenueByTechnician[$technicianKey]['total_revenue'] += $jobTotal;
            $revenueByTechnician[$technicianKey]['parts_revenue'] += $partsTotal;
            $revenueByTechnician[$technicianKey]['service_revenue'] += $serviceTotal;
            $revenueByTechnician[$technicianKey]['vat_collected'] += $jobVat;
            $revenueByTechnician[$technicianKey]['total_profit'] += $jobProfit;

            // Group by customer
            $customerKey = $job->AccKy ?? 'unknown';
            if (!isset($revenueByCustomer[$customerKey])) {
                $revenueByCustomer[$customerKey] = [
                    'customer_id' => $job->AccKy,
                    'customer_name' => $job->customer ? $job->customer->AccNm : $job->customer_name,
                    'jobs_count' => 0,
                    'total_revenue' => 0,
                    'parts_revenue' => 0,
                    'service_revenue' => 0,
                    'vat_collected' => 0,
                    'total_profit' => 0,
                    'avg_job_value' => 0,
                ];
            }
            $revenueByCustomer[$customerKey]['jobs_count']++;
            $revenueByCustomer[$customerKey]['total_revenue'] += $jobTotal;
            $revenueByCustomer[$customerKey]['parts_revenue'] += $partsTotal;
            $revenueByCustomer[$customerKey]['service_revenue'] += $serviceTotal;
            $revenueByCustomer[$customerKey]['vat_collected'] += $jobVat;
            $revenueByCustomer[$customerKey]['total_profit'] += $jobProfit;

            // Group by time period - use actual_completion_date, invoice_date, or updated_at
            $completionDate = $job->actual_completion_date 
                ? Carbon::parse($job->actual_completion_date)
                : ($job->invoice_date 
                    ? Carbon::parse($job->invoice_date)
                    : Carbon::parse($job->updated_at));
            $date = $completionDate;
            $groupKey = '';
            
            if ($groupBy === 'daily') {
                $groupKey = $date->format('Y-m-d');
            } elseif ($groupBy === 'weekly') {
                $groupKey = $date->format('Y') . '-W' . $date->format('W');
            } elseif ($groupBy === 'monthly') {
                $groupKey = $date->format('Y-m');
            }

            if (!isset($groupedData[$groupKey])) {
                $groupedData[$groupKey] = [
                    'period' => $groupKey,
                    'display_period' => $this->formatPeriod($groupKey, $groupBy),
                    'jobs_count' => 0,
                    'total_revenue' => 0,
                    'parts_revenue' => 0,
                    'service_revenue' => 0,
                    'vat_collected' => 0,
                    'jobs' => [],
                ];
            }
            $groupedData[$groupKey]['jobs_count']++;
            $groupedData[$groupKey]['total_revenue'] += $jobTotal;
            $groupedData[$groupKey]['parts_revenue'] += $partsTotal;
            $groupedData[$groupKey]['service_revenue'] += $serviceTotal;
            $groupedData[$groupKey]['vat_collected'] += $jobVat;
            $groupedData[$groupKey]['jobs'][] = [
                'job_number' => $job->job_number,
                'job_id' => $job->id,
                'customer_name' => $job->customer ? $job->customer->AccNm : $job->customer_name,
                'technician_name' => $job->technician ? ($job->technician->first_name . ' ' . $job->technician->last_name) : 'Unassigned',
                'completion_date' => $completionDate->format('Y-m-d'),
                'total_revenue' => $jobTotal,
                'parts_revenue' => $partsTotal,
                'service_revenue' => $serviceTotal,
                'vat_collected' => $jobVat,
                'is_vat_invoice' => $job->is_vat_invoice,
            ];
        }

        // Calculate average job values
        foreach ($revenueByTechnician as &$tech) {
            $tech['avg_job_value'] = $tech['jobs_count'] > 0 ? round($tech['total_revenue'] / $tech['jobs_count'], 2) : 0;
            $tech['profit_margin'] = $tech['total_revenue'] > 0 ? round(($tech['total_profit'] / $tech['total_revenue']) * 100, 2) : 0;
        }
        
        foreach ($revenueByCustomer as &$cust) {
            $cust['avg_job_value'] = $cust['jobs_count'] > 0 ? round($cust['total_revenue'] / $cust['jobs_count'], 2) : 0;
            $cust['profit_margin'] = $cust['total_revenue'] > 0 ? round(($cust['total_profit'] / $cust['total_revenue']) * 100, 2) : 0;
        }
        
        // Sort arrays
        $revenueByTechnician = array_values($revenueByTechnician);
        usort($revenueByTechnician, function($a, $b) {
            return $b['total_revenue'] <=> $a['total_revenue'];
        });

        $revenueByCustomer = array_values($revenueByCustomer);
        usort($revenueByCustomer, function($a, $b) {
            return $b['total_revenue'] <=> $a['total_revenue'];
        });

        ksort($groupedData);
        $groupedData = array_values($groupedData);
        
        // Calculate period-over-period comparison
        $revenueChange = $previousRevenue > 0 ? (($totalRevenue - $previousRevenue) / $previousRevenue) * 100 : 0;
        $jobsChange = $previousJobs->count() > 0 ? (($totalJobsCount - $previousJobs->count()) / $previousJobs->count()) * 100 : 0;

        return [
            'summary' => [
                'total_revenue' => round($totalRevenue, 2),
                'total_parts_revenue' => round($totalPartsRevenue, 2),
                'total_service_revenue' => round($totalServiceRevenue, 2),
                'total_vat_collected' => round($totalVatCollected, 2),
                'total_jobs_count' => $totalJobsCount,
                'average_job_value' => $totalJobsCount > 0 ? round($totalRevenue / $totalJobsCount, 2) : 0,
                'parts_percentage' => $totalRevenue > 0 ? round(($totalPartsRevenue / $totalRevenue) * 100, 2) : 0,
                'service_percentage' => $totalRevenue > 0 ? round(($totalServiceRevenue / $totalRevenue) * 100, 2) : 0,
                'total_profit' => round($totalRevenue - $totalCostPrice, 2),
                'profit_margin' => $totalRevenue > 0 ? round((($totalRevenue - $totalCostPrice) / $totalRevenue) * 100, 2) : 0,
                'previous_revenue' => round($previousRevenue, 2),
                'revenue_change' => round($revenueChange, 2),
                'previous_jobs_count' => $previousJobs->count(),
                'jobs_change' => round($jobsChange, 2),
            ],
            'revenue_by_technician' => $revenueByTechnician,
            'revenue_by_customer' => $revenueByCustomer,
            'grouped_data' => $groupedData,
            'from_date' => $from->format('Y-m-d'),
            'to_date' => $to->format('Y-m-d'),
            'comparison_period' => [
                'from' => $previousFrom->format('Y-m-d'),
                'to' => $previousTo->format('Y-m-d'),
            ],
        ];
    }

    private function formatPeriod($period, $groupBy)
    {
        if ($groupBy === 'daily') {
            return Carbon::parse($period)->format('D, M d, Y');
        } elseif ($groupBy === 'weekly') {
            $parts = explode('-W', $period);
            $year = $parts[0];
            $week = $parts[1];
            $date = Carbon::now()->setISODate($year, $week);
            return 'Week ' . $week . ', ' . $year . ' (' . $date->startOfWeek()->format('M d') . ' - ' . $date->endOfWeek()->format('M d') . ')';
        } elseif ($groupBy === 'monthly') {
            return Carbon::parse($period . '-01')->format('F Y');
        }
        return $period;
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
        if (!$request->user()->hasPermission('reports.service_revenue')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $fromDate = $request->get('from_date');
        $toDate = $request->get('to_date');
        $sectionCode = $request->get('section_code');
        $technicianId = $request->get('technician_id');
        $customerId = $request->get('customer_id');
        $vatFilter = $request->get('vat_filter', 'all');
        $groupBy = $request->get('group_by', 'daily');
        $format = $request->get('format', 'pdf'); // pdf or excel

        if (!$fromDate || !$toDate) {
            return back()->with('error', 'Please select valid date range');
        }

        $user = Auth::user();
        $companyCode = $user->company_code;
        $revenueData = $this->getRevenueData($fromDate, $toDate, $companyCode, $technicianId, $customerId, $vatFilter, $groupBy);
        $company = $this->getCompany();

        if ($format === 'excel') {
            return $this->exportExcel($revenueData, $company, $fromDate, $toDate);
        }

        return $this->exportPdf($revenueData, $company, $fromDate, $toDate, $groupBy);
    }

    private function exportPdf($revenueData, $company, $fromDate, $toDate, $groupBy)
    {
        $pdf = Pdf::loadView('reports.service-revenue-pdf', [
            'company' => [
                'name' => $company->company_name ?? 'VISMASS PVT LTD',
                'branch' => $company->branch ?? 'Main Branch',
                'code' => $company->company_code ?? 'VISMASS',
                'branch_code' => $company->branch_code ?? '001',
            ],
            'revenueData' => $revenueData,
            'fromDate' => $fromDate,
            'toDate' => $toDate,
            'groupBy' => $groupBy,
        ])->setPaper('a4', 'landscape');

        $filename = "service-revenue-report-" . date('Y-m-d') . ".pdf";
        return $pdf->download($filename);
    }

    private function exportExcel($revenueData, $company, $fromDate, $toDate)
    {
        // You can implement Excel export using Laravel Excel package
        // For now, return a simple CSV
        $filename = "service-revenue-report-" . date('Y-m-d') . ".csv";
        
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"$filename\"",
        ];

        $callback = function() use ($revenueData) {
            $file = fopen('php://output', 'w');
            
            // Summary section
            fputcsv($file, ['Service Revenue Summary Report']);
            fputcsv($file, []);
            fputcsv($file, ['Total Revenue', number_format($revenueData['summary']['total_revenue'], 2)]);
            fputcsv($file, ['Parts Revenue', number_format($revenueData['summary']['total_parts_revenue'], 2)]);
            fputcsv($file, ['Service Revenue', number_format($revenueData['summary']['total_service_revenue'], 2)]);
            fputcsv($file, ['VAT Collected', number_format($revenueData['summary']['total_vat_collected'], 2)]);
            fputcsv($file, ['Total Jobs', $revenueData['summary']['total_jobs_count']]);
            fputcsv($file, []);
            
            // Revenue by period
            fputcsv($file, ['Revenue by Period']);
            fputcsv($file, ['Period', 'Jobs Count', 'Total Revenue', 'Parts Revenue', 'Service Revenue', 'VAT Collected']);
            foreach ($revenueData['grouped_data'] as $group) {
                fputcsv($file, [
                    $group['display_period'],
                    $group['jobs_count'],
                    number_format($group['total_revenue'], 2),
                    number_format($group['parts_revenue'], 2),
                    number_format($group['service_revenue'], 2),
                    number_format($group['vat_collected'], 2),
                ]);
            }
            fputcsv($file, []);
            
            // Revenue by technician
            fputcsv($file, ['Revenue by Technician']);
            fputcsv($file, ['Technician', 'Jobs Count', 'Total Revenue', 'Parts Revenue', 'Service Revenue', 'VAT Collected']);
            foreach ($revenueData['revenue_by_technician'] as $tech) {
                fputcsv($file, [
                    $tech['technician_name'],
                    $tech['jobs_count'],
                    number_format($tech['total_revenue'], 2),
                    number_format($tech['parts_revenue'], 2),
                    number_format($tech['service_revenue'], 2),
                    number_format($tech['vat_collected'], 2),
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}

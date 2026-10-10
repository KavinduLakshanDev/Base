<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\PettyCashCategory;
use App\Models\PettyCashTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PettyCashAnalysisController extends Controller
{
    public function index(Request $request)
    {
        if (!request()->user()->hasPermission('reports.petty_cash_analysis')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view petty cash analysis.');
        }

        $user = Auth::user();
        $companyCode = $user->company_code;

        $dateFrom = $request->input('date_from', now()->subDays(30)->format('Y-m-d'));
        $dateTo = $request->input('date_to', now()->format('Y-m-d'));
        $categoryId = $request->input('category_id');
        $sectionCode = $request->input('section_code');

        if ($categoryId && !is_numeric($categoryId)) {
            $categoryId = null;
        }

        // Base query for transactions within the period
        $query = PettyCashTransaction::with('category')
            ->where('company_code', $companyCode)
            ->where('type', 'usage')
            ->whereBetween('transaction_date', [$dateFrom, $dateTo]);

        if ($sectionCode && $sectionCode !== 'all') {
            $query->where('section_code', $sectionCode);
        }
        if ($categoryId && $categoryId !== 'all') {
            $query->where('category_id', intval($categoryId));
        }

        $transactions = $query->orderBy('transaction_date', 'asc')->get();

        // Summary KPIs
        $totalOutflow = $transactions->sum('amount');
        $transactionCount = $transactions->count();
        $averageAmount = $transactionCount > 0 ? round($totalOutflow / $transactionCount, 2) : 0;
        $categoriesUsed = $transactions->pluck('category_id')->unique()->count();

        // Breakdown by category (expense type)
        $byCategory = $transactions->groupBy('category_id')->map(function ($group) use ($totalOutflow) {
            $category = $group->first()->category;
            $sum = $group->sum('amount');
            return [
                'category_id' => $group->first()->category_id,
                'category_name' => $category->name ?? 'N/A',
                'transaction_count' => $group->count(),
                'total_amount' => round($sum, 2),
                'average_amount' => $group->count() > 0 ? round($sum / $group->count(), 2) : 0,
                'percentage' => $totalOutflow > 0 ? round(($sum / $totalOutflow) * 100, 2) : 0,
            ];
        })->sortByDesc('total_amount')->values();

        // Daily time-series for the period (trend of petty cash outflow)
        $timeSeries = collect();
        $period = \Carbon\CarbonPeriod::create($dateFrom, $dateTo);
        foreach ($period as $dt) {
            $dateStr = $dt->format('Y-m-d');
            $dayTx = $transactions->filter(fn($t) => $t->transaction_date->format('Y-m-d') === $dateStr);
            $timeSeries->push([
                'date' => $dateStr,
                'amount' => $dayTx->sum('amount'),
                'count' => $dayTx->count(),
            ]);
        }

        // Categories for the filter dropdown (active categories scoped to the user's company)
        $categories = PettyCashCategory::active()
            ->where('company_code', $companyCode)
            ->orderBy('name')
            ->get(['id', 'name']);

        // Sections for filter dropdown
        $sections = DB::table('sections')
            ->where('company_code', $companyCode)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'section_code']);

        return Inertia::render('Reports/PettyCashAnalysis', [
            'summary' => [
                'total_outflow' => $totalOutflow,
                'transaction_count' => $transactionCount,
                'average_amount' => $averageAmount,
                'categories_used' => $categoriesUsed,
            ],
            'by_category' => $byCategory,
            'time_series' => $timeSeries,
            'filters' => [
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'category_id' => $categoryId,
                'section_code' => $sectionCode,
            ],
            'categories' => $categories,
            'sections' => $sections,
        ]);
    }

    public function export(Request $request)
    {
        if (!request()->user()->hasPermission('reports.petty_cash_analysis')) {
            return redirect()->back()->with('error', 'Unauthorized.');
        }

        $user = Auth::user();
        $companyCode = $user->company_code;

        $dateFrom = $request->input('date_from', now()->subDays(30)->format('Y-m-d'));
        $dateTo = $request->input('date_to', now()->format('Y-m-d'));
        $categoryId = $request->input('category_id');
        $sectionCode = $request->input('section_code');

        if ($categoryId && !is_numeric($categoryId)) {
            $categoryId = null;
        }

        $query = PettyCashTransaction::with('category')
            ->where('company_code', $companyCode)
            ->where('type', 'usage')
            ->whereBetween('transaction_date', [$dateFrom, $dateTo]);

        if ($sectionCode && $sectionCode !== 'all') {
            $query->where('section_code', $sectionCode);
        }
        if ($categoryId && $categoryId !== 'all') {
            $query->where('category_id', intval($categoryId));
        }

        $transactions = $query->orderBy('transaction_date', 'asc')->get();

        $csvData = [];
        $csvData[] = ['Petty Cash Analysis Report'];
        $csvData[] = ['Date Range', "{$dateFrom} to {$dateTo}"];
        $csvData[] = [];

        // Category summary section
        $csvData[] = ['Category', 'Transactions', 'Total (Rs.)', 'Average (Rs.)', 'Share (%)'];
        $byCategory = $transactions->groupBy('category_id');
        $totalOutflow = $transactions->sum('amount');
        foreach ($byCategory as $groupId => $group) {
            $category = $group->first()->category;
            $sum = $group->sum('amount');
            $csvData[] = [
                $category->name ?? 'N/A',
                $group->count(),
                'Rs. ' . number_format($sum, 2),
                'Rs. ' . number_format($group->count() > 0 ? $sum / $group->count() : 0, 2),
                ($totalOutflow > 0 ? round(($sum / $totalOutflow) * 100, 2) : 0) . '%',
            ];
        }

        $csvData[] = [];
        $csvData[] = ['Date', 'Category', 'Amount (Rs.)', 'Notes'];
        foreach ($transactions as $tx) {
            $csvData[] = [
                $tx->transaction_date->format('Y-m-d'),
                $tx->category->name ?? 'N/A',
                'Rs. ' . number_format($tx->amount, 2),
                $tx->notes ?? '',
            ];
        }

        $filename = "petty_cash_analysis_{$dateFrom}_to_{$dateTo}.csv";
        $handle = fopen('php://output', 'w');
        ob_start();
        foreach ($csvData as $row) {
            fputcsv($handle, $row);
        }
        fclose($handle);
        $csvContent = ob_get_clean();

        return response($csvContent, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }
}

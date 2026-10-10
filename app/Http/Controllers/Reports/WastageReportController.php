<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use App\Models\Company;
use App\Models\Section;
use App\Models\StockInHand;

class WastageReportController extends Controller
{
    /**
     * Display the wastage report.
     */
    public function index(Request $request)
    {
        // authorization guard
        if (! request()->user() || ! request()->user()->hasPermission('reports.wastage')) {
            return redirect()->back()->with('error', 'Unauthorized. You do not have permission to view wastage reports.');
        }
        $user = Auth::user();

        // Get company & branch info from user first
        try {
            $company = $user->company ?? Company::first();
            $section = $user->section ?? Section::first();

            $companyCode = $company ? ($company->company_code ?? 'C01') : 'C01';
            $sectionCode = $section ? ($section->section_code ?? 'BR01') : 'BR01';

            // Handle section filter from request
            if ($request->has('section') && !empty($request->section) && $request->section !== 'all') {
                $requestedSection = Section::find($request->section);
                if ($requestedSection) {
                    $sectionCode = $requestedSection->section_code;
                    $companyCode = $requestedSection->company_code; // Update company code to match selected section
                    $section = $requestedSection;
                }
            }

            $companyInfo = [
                'name' => $company ? ($company->name ?? 'Company') : 'Company',
                'section' => $section ? ($section->name ?? 'Main') : 'Main',
                'code' => $companyCode,
                'section_code' => $sectionCode,
            ];
        } catch (\Exception $e) {
            $companyInfo = [
                'name' => 'Company',
                'section' => 'Main',
                'code' => 'C01',
                'section_code' => 'BR01',
            ];
        }

        // Get all sections for filter dropdown
        $sections = Section::where('company_code', $companyInfo['code'])->get();

        // Get date range from request or default to current month
        $fromDate = $request->get('from_date', now()->startOfMonth()->format('Y-m-d'));
        $toDate = $request->get('to_date', now()->endOfMonth()->format('Y-m-d'));

        // Determine section code for filtering (null means all sections)
        $filterSectionCode = ($request->has('section') && !empty($request->section) && $request->section !== 'all') ? $sectionCode : null;

        // Get wastage data
        $wastageData = $this->getWastageData($companyInfo['code'], $fromDate, $toDate, $filterSectionCode);

        return Inertia::render('Reports/WastageReport', [
            'companyInfo' => $companyInfo,
            'sections' => $sections,
            'wastageData' => $wastageData,
            'filters' => [
                'from_date' => $fromDate,
                'to_date' => $toDate,
                'section' => $request->get('section'),
            ],
        ]);
    }

    /**
     * Get wastage data for the specified period.
     */
    private function getWastageData($companyCode, $fromDate, $toDate, $sectionCode = null)
    {
        $query = DB::table('stock_in_hand as sih')
            ->join('itemmaster as im', 'sih.ItemKy', '=', 'im.ItmKy')
            ->where('sih.company_code', $companyCode)
            ->where('sih.TrnTyp', 'WASTAGE')
            ->whereBetween('sih.OrdDate', [$fromDate, $toDate]);

        // Only filter by section if sectionCode is provided
        if ($sectionCode) {
            $query->where('sih.section_code', $sectionCode);
        }

        return $query->leftJoin('brands as b', 'im.brand_id', '=', 'b.id')
            ->leftJoin('models as m', 'im.models_id', '=', 'm.id')
            ->select(
                'sih.OrdDate',
                'im.ItemCode',
                'im.ItmNm',
                'sih.batch_no',
                'sih.serial_number',
                'b.name as brand',
                'm.name as model',
                'sih.Qty',
                'sih.RefNo',
                'sih.TableKy'
            )
            ->orderBy('sih.OrdDate', 'desc')
            ->orderBy('im.ItmNm')
            ->get()
            ->map(function ($item) {
                return [
                    'date' => $item->OrdDate,
                    'item_code' => $item->ItemCode,
                    'item_name' => $item->ItmNm,
                    'batch_no' => $item->batch_no ?: 'N/A',
                    'serial_number' => $item->serial_number ?: 'N/A',
                    'brand' => $item->brand ?: 'N/A',
                    'model' => $item->model ?: 'N/A',
                    'quantity' => abs($item->Qty), // Wastage quantities are stored as negative
                    'reference' => $item->RefNo,
                    'table_key' => $item->TableKy,
                ];
            });
    }
}
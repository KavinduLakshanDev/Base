<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\ItemMaster;
use App\Models\PurchaseDet;
use App\Models\StockInHand;
use App\Models\StockTransfer;
use App\Models\Section;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class StockBinCardController extends Controller
{
    public function index(Request $request)
    {
        $company = $this->getCompany();
        $companyCode = $company->company_code ?? 'C01';

        $businessUnit = 'vismass'; // Default
        if (str_starts_with(strtoupper($companyCode), 'MAL')) {
            $businessUnit = 'malibo';
        }

        $items = ItemMaster::where('fInAct', false)
            ->where(function($q) use ($companyCode, $businessUnit) {
                $q->where('company_code', $companyCode)
                  ->orWhereJsonContains('available_business_units', $businessUnit);
            })
            ->select('ItmKy', 'ItemCode', 'ItmNm')
            ->orderBy('ItemCode')
            ->get();

        $sections = Section::where('company_code', $company->company_code ?? 'C01')->get();

        $item = null;
        $transactions = [];
        $itemUnits = null;
        $openingBalances = [
            'primary' => 0,
            'secondary' => 0
        ];
        $closingBalances = [
            'primary' => 0,
            'secondary' => 0
        ];

        if ($request->item_code) {
            $item = ItemMaster::where('ItemCode', $request->item_code)
                ->where(function($q) use ($companyCode, $businessUnit) {
                    $q->where('company_code', $companyCode)
                      ->orWhereJsonContains('available_business_units', $businessUnit);
                })
                ->where('item_type', 'product')
                ->first();

            if ($item) {
                $fromDate = $request->from_date ? Carbon::parse($request->from_date)->startOfDay() : Carbon::now()->subDays(7)->startOfDay();
                $toDate = $request->to_date ? Carbon::parse($request->to_date)->endOfDay() : Carbon::now()->endOfDay();

                // Get item unit information
                $itemUnits = [
                    'primary_unit' => $item->unit ? $item->unit->UnitNm : null,
                    'secondary_unit' => $item->receivingUnit ? $item->receivingUnit->UnitNm : null,
                    'conversion_factor' => floatval($item->unit_conversion_rate ?? 1),
                ];

                $validBatches = $this->getValidBatches($item, $request->section_code, $companyCode);
                
                $openingBalances = $this->calculateOpeningBalances($item, $fromDate, $request->section_code, $companyCode, $validBatches);
                
                $allTransactions = $this->getTransactions($item, $fromDate, $toDate, $request->section_code, $companyCode, $validBatches);
                
                $transactionsData = $this->processTransactions($allTransactions, $openingBalances, $itemUnits['conversion_factor']);
                
                $transactions = $transactionsData['list'];
                $closingBalances = $transactionsData['closing'];
            }
        }

        return Inertia::render('Reports/StockBinCard', [
            'items' => $items,
            'sections' => $sections,
            'company' => $company,
            'transactions' => $transactions,
            'selectedItem' => $item,
            'itemUnits' => $itemUnits,
            'fromDate' => $request->from_date ?? Carbon::now()->subDays(7)->toDateString(),
            'toDate' => $request->to_date ?? Carbon::now()->toDateString(),
            'selectedSectionCode' => $request->section_code ?? 'all',
            'openingPrimaryBalance' => $openingBalances['primary'],
            'openingSecondaryBalance' => $openingBalances['secondary'],
            'closingPrimaryBalance' => $closingBalances['primary'],
            'closingSecondaryBalance' => $closingBalances['secondary'],
        ]);
    }

    private function applyBatchFilter($query)
    {
        return $query->where(function($q) {
            $q->whereNull('batch_no')
              ->orWhere('batch_no', '')
              ->orWhere('batch_no', 'not like', 'GRN-VIS-VIS-%')
              ->orWhere('batch_no', '>=', 'GRN-VIS-VIS-0026');
        });
    }

    private function getValidBatches($item, $sectionCode, $companyCode)
    {
        $allBatchesData = StockInHand::where('ItemKy', $item->ItmKy)
            ->where('company_code', $companyCode)
            ->when(str_starts_with($companyCode, 'VIS'), function($q) {
                return $this->applyBatchFilter($q);
            })
            ->when($sectionCode, function($q) use ($sectionCode) {
                if ($sectionCode !== 'all') {
                    $q->where('section_code', $sectionCode);
                }
            })
            ->get();
        
        $validBatches = [];
        $batchesGrouped = $allBatchesData->groupBy(function($record) {
            return $record->batch_no ?? '';
        });

        foreach ($batchesGrouped as $batchNo => $records) {
            $validBatches[] = (string)$batchNo;
        }
        
        return $validBatches;
    }

    private function calculateOpeningBalances($item, $fromDate, $sectionCode, $companyCode, $validBatches)
    {
        $stockChangesBefore = StockInHand::where('ItemKy', $item->ItmKy)
            ->where('company_code', $companyCode)
            ->when(str_starts_with($companyCode, 'VIS'), function($q) {
                return $this->applyBatchFilter($q);
            })
            ->when($sectionCode, function($q) use ($sectionCode) {
                $q->where('section_code', $sectionCode);
            })
            ->where('OrdDate', '<', $fromDate)
            ->where(function($q) use ($validBatches) {
                $q->whereIn('batch_no', $validBatches);
                if (in_array("", $validBatches)) {
                    $q->orWhereNull('batch_no');
                }
            })
            ->get();

        $primaryStock = 0;
        $secondaryStock = 0;

        foreach ($stockChangesBefore as $change) {
            $qty = floatval($change->Qty) + floatval($change->FreeQty);
            $refNo = $change->RefNo ?? '';
            $trnTyp = $change->TrnTyp ?? '';
            
            $isSecondary = false;
            
            if (!empty($item->transfer_unit_id) && $change->UnitKy == $item->transfer_unit_id) {
                $isSecondary = false;
            } elseif (!empty($item->receiving_unit_id) && $change->UnitKy == $item->receiving_unit_id) {
                $isSecondary = true;
            } elseif (empty($change->UnitKy)) {
                if (str_starts_with($refNo, 'CNV-IN') || $trnTyp === 'SAL-NOS') {
                    $isSecondary = true;
                } elseif (str_starts_with($refNo, 'RCNV-OUT')) {
                    $isSecondary = false;
                } else {
                    $isSecondary = false; // default to primary
                }
            } else {
                $isSecondary = false; // default to primary
            }

            if ($isSecondary) {
                $secondaryStock += $qty;
            } else {
                $primaryStock += $qty;
            }
        }

        // Normalize balances
        $conversionFactor = floatval($item->transfer_conversion_factor ?? $item->unit_conversion_rate ?? 1);
        if ($conversionFactor > 1) {
            $totalSecondary = ($primaryStock * $conversionFactor) + $secondaryStock;
            $primaryStock = floor($totalSecondary / $conversionFactor);
            $secondaryStock = fmod($totalSecondary, $conversionFactor);
        } else {
            $primaryStock += $secondaryStock;
            $secondaryStock = 0;
        }

        return [
            'primary' => $primaryStock,
            'secondary' => $secondaryStock
        ];
    }

    private function getTransactions($item, $fromDate, $toDate, $sectionCode, $companyCode, $validBatches)
    {
        $movements = StockInHand::where('ItemKy', $item->ItmKy)
            ->where('company_code', $companyCode)
            ->when(str_starts_with($companyCode, 'VIS'), function($q) {
                return $this->applyBatchFilter($q);
            })
            ->when($sectionCode, function($q) use ($sectionCode) {
                $q->where('section_code', $sectionCode);
            })
            ->whereBetween('OrdDate', [$fromDate, $toDate])
            ->where(function($q) use ($validBatches) {
                $q->whereIn('batch_no', $validBatches);
                if (in_array("", $validBatches)) {
                    $q->orWhereNull('batch_no');
                }
            })
            ->get();

        $saleIds = [];
        $cnvIds = [];
        $serviceJobIds = [];
        $transferIds = [];
        foreach ($movements as $m) {
            if (in_array($m->TrnTyp, ['SAL', 'SAL-BND', 'SAL-NOS']) && str_starts_with($m->RefNo, 'STK-')) {
                $saleIds[] = intval(substr($m->RefNo, 4));
            }
            if (str_starts_with($m->RefNo, 'CNV-') || str_starts_with($m->RefNo, 'RCNV-')) {
                $parts = explode('-', $m->RefNo);
                $id = end($parts);
                if (is_numeric($id)) {
                    $cnvIds[] = (int) $id;
                }
            }
            if (in_array($m->TrnTyp, ['SERVICE_JOB', 'SERVICE_JOB_RETURN']) && $m->OrdKy) {
                $serviceJobIds[] = $m->OrdKy;
            }
            if (str_starts_with($m->RefNo, 'TRF-')) {
                $parts = explode('-', $m->RefNo);
                $id = end($parts);
                if (is_numeric($id)) {
                    $transferIds[] = (int) $id;
                }
            }
        }
        
        $invoices = [];
        if (count($saleIds) > 0) {
            $invoices = \App\Models\SalesTransaction::whereIn('id', array_unique($saleIds))->pluck('invoice_no', 'id')->toArray();
        }

        $conversions = [];
        if (count($cnvIds) > 0) {
            $conversions = \App\Models\StockConversion::whereIn('id', array_unique($cnvIds))->get()->keyBy('id');
        }

        $serviceJobs = [];
        if (count($serviceJobIds) > 0) {
            $serviceJobs = \App\Models\ServiceJob::whereIn('id', array_unique($serviceJobIds))->pluck('job_number', 'id')->toArray();
        }

        $transfers = [];
        if (count($transferIds) > 0) {
            $transfers = \App\Models\StockTransfer::whereIn('id', array_unique($transferIds))->pluck('transfer_number', 'id')->toArray();
        }

        $transactions = $movements->map(function($m) use ($item, $invoices, $conversions, $serviceJobs, $transfers) {
            $qty = floatval($m->Qty) + floatval($m->FreeQty);
            $refNo = $m->RefNo ?? '';
            $trnTyp = $m->TrnTyp ?? '';
            
            $unitType = 'primary';
            if (!empty($item->transfer_unit_id) && $m->UnitKy == $item->transfer_unit_id) {
                $unitType = 'primary';
            } elseif (!empty($item->receiving_unit_id) && $m->UnitKy == $item->receiving_unit_id) {
                $unitType = 'secondary';
            } elseif (empty($m->UnitKy)) {
                if (str_starts_with($refNo, 'CNV-IN') || $trnTyp === 'SAL-NOS') {
                    $unitType = 'secondary';
                } elseif (str_starts_with($refNo, 'RCNV-OUT')) {
                    $unitType = 'primary';
                } elseif (str_starts_with($refNo, 'CNV-') || str_starts_with($refNo, 'RCNV-')) {
                    $parts = explode('-', $refNo);
                    $id = end($parts);
                    if (is_numeric($id) && isset($conversions[$id])) {
                        $conv = $conversions[$id];
                        $isOut = str_contains($refNo, '-OUT-');
                        $involvedUnit = $isOut ? $conv->from_unit_id : $conv->to_unit_id;
                        
                        if ($item->receiving_unit_id && $involvedUnit == $item->receiving_unit_id) {
                            $unitType = 'secondary';
                        }
                    }
                }
            }

            $reference = $m->RefNo ?? $m->TrnTyp . '-' . $m->TableKy;
            if (in_array($m->TrnTyp, ['SAL', 'SAL-BND', 'SAL-NOS']) && str_starts_with($m->RefNo, 'STK-')) {
                $saleId = intval(substr($m->RefNo, 4));
                if (isset($invoices[$saleId])) {
                    $reference = $invoices[$saleId];
                }
            }
            if (in_array($m->TrnTyp, ['SERVICE_JOB', 'SERVICE_JOB_RETURN']) && $m->OrdKy && isset($serviceJobs[$m->OrdKy])) {
                $reference = $serviceJobs[$m->OrdKy];
            }
            if (str_starts_with($m->RefNo, 'TRF-')) {
                $parts = explode('-', $m->RefNo);
                $id = end($parts);
                if (is_numeric($id) && isset($transfers[$id])) {
                    $reference = $transfers[$id];
                }
            }

            return [
                'date' => $m->OrdDate,
                'created_at' => $m->created_at,
                'description' => $this->getMovementDescription($m),
                'reference' => $reference,
                'received' => $qty > 0 ? $qty : 0,
                'issued' => $qty < 0 ? abs($qty) : 0,
                'unit_type' => $unitType,
                'sort_key' => 2
            ];
        });

        return $transactions->sortBy([
            ['date', 'asc'],
            ['created_at', 'asc'],
            ['sort_key', 'asc']
        ]);
    }

    private function getMovementDescription($m)
    {
        $desc = match($m->TrnTyp) {
            'SAL', 'SAL-BND', 'SAL-NOS' => 'Sale',
            'WASTAGE' => 'Wastage',
            'WST_RESTO' => 'Wastage Restored',
            'SRET-OUT' => 'Supplier Return',
            'SRET-IN' => 'Supplier Return Cancelled',
            'CUSTOMER_RETURN' => 'Customer Return',
            'CUSTOMER_EXCHANGE' => 'Customer Exchange',
            'SERVICE_JOB' => 'Service Job - Parts Used',
            'SERVICE_JOB_RETURN' => 'Service Job - Parts Returned',
            'ADJ-IN' => 'Stk Adj (Addition)',
            'ADJ-OUT' => 'Stk Adj (Subtraction)',
            'V-ADJ-IN' => 'Vehicle Stk Adj (Addition)',
            'V-ADJ-OUT' => 'Vehicle Stk Adj (Subtraction)',
            'GRN', 'PUR' => 'Purchase Received',
            'TRF-IN' => 'Transfer In',
            'TRF-OUT' => 'Transfer Out',
            'VLOAD-IN', 'VLOAD-OUT' => 'Vehicle Load',
            'VUNLOAD-IN', 'VUNLOAD-OUT' => 'Vehicle Unload',
            'IN' => str_starts_with($m->RefNo ?? '', 'TRF-IN') ? 'Transfer In' : 'Stock In',
            'OUT' => str_starts_with($m->RefNo ?? '', 'TRF-OUT') ? 'Transfer Out' : 'Stock Out',
            default => $m->TrnTyp ?? 'Unknown'
        };

        $refNo = $m->RefNo ?? '';
        if (str_starts_with($refNo, 'CNV-IN')) $desc = 'Conversion - Secondary Unit Added';
        if (str_starts_with($refNo, 'CNV-OUT')) $desc = 'Conversion - Primary Unit Removed';
        if (str_starts_with($refNo, 'RCNV-IN')) $desc = 'Reverse Conversion - Primary Unit Added';
        if (str_starts_with($refNo, 'RCNV-OUT')) $desc = 'Reverse Conversion - Secondary Unit Removed';

        if ($refNo && !in_array($m->TrnTyp, [
            'SAL', 'SAL-BND', 'SAL-NOS', 
            'SERVICE_JOB', 'SERVICE_JOB_RETURN', 
            'IN', 'OUT'
        ]) && !str_contains($desc, 'Conversion') && !str_contains($desc, 'Transfer')) {
            $desc .= " (#{$refNo})";
        }
        
        if ($m->batch_no) $desc .= " (Batch: {$m->batch_no})";
        if ($m->serial_number) $desc .= " (SN: {$m->serial_number})";
        
        return $desc;
    }

    private function processTransactions($transactions, $openingBalances, $conversionFactor)
    {
        $list = [];
        $currentPrimary = $openingBalances['primary'];
        $currentSecondary = $openingBalances['secondary'];

        foreach ($transactions as $t) {
            $received = $t['received'];
            $issued = $t['issued'];
            $change = $received - $issued;

            if ($t['unit_type'] === 'secondary') {
                $currentSecondary += $change;
            } else {
                $currentPrimary += $change;
            }

            // Normalize
            if ($conversionFactor > 1) {
                $totalSecondary = ($currentPrimary * $conversionFactor) + $currentSecondary;
                $currentPrimary = floor($totalSecondary / $conversionFactor);
                $currentSecondary = fmod($totalSecondary, $conversionFactor);
            } else {
                $currentPrimary += $currentSecondary;
                $currentSecondary = 0;
            }

            $t['primary_balance'] = $currentPrimary;
            $t['secondary_balance'] = $currentSecondary;
            $t['id'] = count($list) + 1;
            $list[] = $t;
        }

        return [
            'list' => $list,
            'closing' => [
                'primary' => $currentPrimary,
                'secondary' => $currentSecondary
            ]
        ];
    }

    private function getCompany()
    {
        if (auth('company')->check()) {
            return auth('company')->user();
        }
        $user = auth('web')->user();
        return $user ? $user->company : Company::first();
    }
}

<?php

namespace App\Http\Controllers\POS;

use App\Http\Controllers\Controller;
use App\Models\CustomerPayment;
use App\Models\DeliveryPayment;
use App\Models\AccTrn;
use App\Models\BankAccount;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ChequeLedgerController extends Controller
{
    /**
     * Build the unified ledger query and return filtered collection + summary.
     */
    private function getLedgerData(Request $request): array
    {
        $user = Auth::user();
        $companyCode = $user->company_code;

        $status = $request->input('status', 'all');
        $search = $request->input('search', '');
        $dateFrom = $request->input('date_from', '');
        $dateTo = $request->input('date_to', '');

        $customerQuery = CustomerPayment::with(['customer', 'depositBank'])
            ->where('method', 'cheque')
            ->whereHas('customer', function ($q) use ($companyCode) {
                $q->where('company_code', $companyCode);
            });

        $deliveryQuery = DeliveryPayment::with(['delivery.shop', 'depositBank'])
            ->where('method', 'cheque')
            ->where('company_code', $companyCode);

        if ($status === 'pending') {
            $customerQuery->where('is_deposited', false)->where('status', '!=', 'returned');
            $deliveryQuery->where('is_deposited', false)->whereIn('status', ['pending', 'cleared']);
        } elseif ($status === 'deposited') {
            $customerQuery->where('is_deposited', true);
            $deliveryQuery->where('is_deposited', true);
        } elseif ($status === 'returned') {
            $customerQuery->where('status', 'returned');
            $deliveryQuery->where('status', 'bounced');
        }

        if ($dateFrom) {
            $customerQuery->where('date', '>=', $dateFrom);
            $deliveryQuery->where('payment_date', '>=', $dateFrom);
        }
        if ($dateTo) {
            $customerQuery->where('date', '<=', $dateTo);
            $deliveryQuery->where('payment_date', '<=', $dateTo);
        }

        $customerCheques = $customerQuery->orderBy('date', 'desc')->get();
        $deliveryCheques = $deliveryQuery->orderBy('payment_date', 'desc')->get();

        $customerCheques->load('depositBank');
        $deliveryCheques->load('depositBank');

        $customerChequeNos = $customerCheques->pluck('cheque_no')->filter()->unique()->values()->all();
        $returnMap = [];
        if (!empty($customerChequeNos)) {
            $returnRecords = AccTrn::where('company_code', $companyCode)
                ->where('FInAct', true)
                ->where('Status', 'A')
                ->where('Amt', '>', 0)
                ->whereIn('ChqueNo', $customerChequeNos)
                ->where(function ($q) {
                    $q->where('Reason', 'like', 'Cheque Return%')
                      ->orWhereNotNull('original_payment_id');
                })
                ->get();

            foreach ($returnRecords as $ret) {
                $key = strtolower(trim($ret->ChqueNo));
                if (!isset($returnMap[$key])) {
                    $returnMap[$key] = [
                        'return_date' => $ret->TrnDt,
                        'return_reason' => str_replace(['Cheque Return: ', 'Cheque Return (Delivery): '], '', (string) ($ret->Reason ?? '')),
                        'return_number' => $ret->TrnNo,
                    ];
                }
            }
        }

        $ledger = collect();

        foreach ($customerCheques as $row) {
            $isReturned = $row->status === 'returned';
            $chequeKey = strtolower(trim((string) $row->cheque_no));
            $returnInfo = $returnMap[$chequeKey] ?? null;

            if ($status === 'returned' && !$returnInfo && !$isReturned) {
                continue;
            }

            $statusText = 'pending';
            if ($isReturned) {
                $statusText = 'returned';
            } elseif ($row->is_deposited) {
                $statusText = 'deposited';
            }

            $ledger->push([
                'id' => $row->id,
                'type' => 'customer',
                'cheque_no' => $row->cheque_no,
                'bank_name' => $row->bank_name,
                'branch' => $row->branch,
                'amount' => (float) $row->amount,
                'cheque_date' => $row->cheque_date,
                'customer_name' => $row->customer ? ($row->customer->FstNm . ' ' . $row->customer->LstNm) : $row->customer_code,
                'customer_code' => $row->customer_code,
                'status' => $statusText,
                'is_deposited' => (bool) $row->is_deposited,
                'deposited_at' => $row->deposited_at,
                'deposit_bank' => $row->depositBank ? $row->depositBank->bank_name . ' - ' . $row->depositBank->account_name : null,
                'return_date' => $returnInfo['return_date'] ?? null,
                'return_reason' => $returnInfo['return_reason'] ?? null,
                'return_number' => $returnInfo['return_number'] ?? null,
                'created_at' => $row->created_at,
            ]);
        }

        foreach ($deliveryCheques as $row) {
            $statusText = 'pending';
            if ($row->status === 'bounced') {
                $statusText = 'returned';
            } elseif ($row->is_deposited) {
                $statusText = 'deposited';
            }

            $ledger->push([
                'id' => $row->id,
                'type' => 'delivery',
                'cheque_no' => $row->cheque_no,
                'bank_name' => $row->bank_name,
                'branch' => $row->branch,
                'amount' => (float) $row->amount,
                'cheque_date' => $row->payment_date,
                'customer_name' => $row->delivery?->shop?->name ?? 'Unknown Shop',
                'customer_code' => (string) ($row->delivery?->shop?->id ?? ''),
                'status' => $statusText,
                'is_deposited' => (bool) $row->is_deposited,
                'deposited_at' => $row->deposited_at,
                'deposit_bank' => $row->depositBank ? $row->depositBank->bank_name . ' - ' . $row->depositBank->account_name : null,
                'return_date' => $row->bounced_at,
                'return_reason' => $row->status === 'bounced' ? 'Bounced' : null,
                'return_number' => $row->status === 'bounced' ? 'DEL-' . $row->id : null,
                'created_at' => $row->created_at,
            ]);
        }

        if ($search) {
            $searchLower = strtolower($search);
            $ledger = $ledger->filter(function ($item) use ($searchLower) {
                return str_contains(strtolower((string) $item['cheque_no']), $searchLower)
                    || str_contains(strtolower($item['customer_name']), $searchLower)
                    || str_contains(strtolower((string) ($item['bank_name'] ?? '')), $searchLower);
            });
        }

        $ledger = $ledger->sortByDesc('cheque_date')->values();

        $summary = [
            'total_count' => $ledger->count(),
            'total_amount' => $ledger->sum('amount'),
            'pending_count' => $ledger->where('status', 'pending')->count(),
            'pending_amount' => $ledger->where('status', 'pending')->sum('amount'),
            'deposited_count' => $ledger->where('status', 'deposited')->count(),
            'deposited_amount' => $ledger->where('status', 'deposited')->sum('amount'),
            'returned_count' => $ledger->where('status', 'returned')->count(),
            'returned_amount' => $ledger->where('status', 'returned')->sum('amount'),
        ];

        return compact('ledger', 'summary', 'status', 'search', 'dateFrom', 'dateTo');
    }

    public function index(Request $request): Response
    {
        $data = $this->getLedgerData($request);

        return Inertia::render('pos/cheque-ledger/index', [
            'ledger' => $data['ledger'],
            'summary' => $data['summary'],
            'filters' => [
                'status' => $data['status'],
                'search' => $data['search'],
                'date_from' => $data['dateFrom'],
                'date_to' => $data['dateTo'],
            ],
        ]);
    }

    /**
     * Export cheque ledger as CSV.
     */
    public function exportCsv(Request $request)
    {
        if (!Auth::user()->hasPermission('cheque_deposits.view')) {
            abort(403, 'Unauthorized.');
        }

        $data = $this->getLedgerData($request);
        $ledger = $data['ledger'];

        $statusLabel = $data['status'] === 'all' ? 'All' : ucfirst($data['status']);
        $filename = "cheque-ledger-{$statusLabel}-" . date('Y-m-d') . ".csv";

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        $callback = function () use ($ledger) {
            $file = fopen('php://output', 'w');

            fputcsv($file, ['Type', 'Cheque No', 'Customer/Shop', 'Bank', 'Branch', 'Chq Date', 'Amount', 'Status', 'Deposit Bank', 'Deposited At', 'Return Date', 'Return Reason']);

            foreach ($ledger as $item) {
                fputcsv($file, [
                    ucfirst($item['type']),
                    $item['cheque_no'] ?? '',
                    $item['customer_name'],
                    $item['bank_name'],
                    $item['branch'] ?? '',
                    $item['cheque_date'] ? \Carbon\Carbon::parse($item['cheque_date'])->format('d/m/Y') : '',
                    number_format($item['amount'], 2, '.', ''),
                    ucfirst($item['status']),
                    $item['deposit_bank'] ?? '',
                    $item['deposited_at'] ? \Carbon\Carbon::parse($item['deposited_at'])->format('d/m/Y H:i') : '',
                    $item['return_date'] ? \Carbon\Carbon::parse($item['return_date'])->format('d/m/Y') : '',
                    $item['return_reason'] ?? '',
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Export cheque ledger as PDF.
     */
    public function exportPdf(Request $request)
    {
        if (!Auth::user()->hasPermission('cheque_deposits.view')) {
            abort(403, 'Unauthorized.');
        }

        $data = $this->getLedgerData($request);

        $user = Auth::user();
        $company = $user->company ? $user->company->toArray() : [
            'name' => config('app.name', 'Distribution System'),
            'code' => $user->company_code,
        ];

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('reports.cheque-ledger-pdf', [
            'ledger' => $data['ledger'],
            'summary' => $data['summary'],
            'status' => $data['status'],
            'dateFrom' => $data['dateFrom'],
            'dateTo' => $data['dateTo'],
            'company' => $company,
        ]);

        $statusLabel = $data['status'] === 'all' ? 'All' : ucfirst($data['status']);
        return $pdf->download("cheque-ledger-{$statusLabel}-" . date('Y-m-d') . ".pdf");
    }
}

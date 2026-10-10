import { useEffect, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import AppLogo from '@/components/app-logo';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem, Company } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Printer, Filter, Calendar, DollarSign, ArrowLeft,RotateCcw, FileText } from 'lucide-react';

interface Payment {
    id: number;
    customer_id: number;
    customer_code: string;
    amount: number;
    date: string;
    method: string;
    reference?: string;
    notes?: string;
    customer: any;
}

interface LedgerRow {
    id: number;
    date: string;
    customer_code: string;
    customer_name: string;
    debit: number;
    credit: number;
    running_balance: number;
    invoice_no?: string;
    reference?: string;
}

interface CashCollectionReportProps {
    company: Company;
    payments: Payment[];
    sales: Array<{ id: number; transaction_date: string; invoice_no?: string; total_amount: number; customer_name?: string }>;
    filters: {
        start_date: string;
        end_date: string;
        cashier_id?: string;
        section_code?: string;
        company_code?: string;
    };
    summary: {
        total_amount: number;
        total_payments: number;
        average_payment: number;
    };
    opening_balance: number;
    closing_balance?: number;
    ledger: LedgerRow[];
    cashiers: Array<{ id: number; name: string; has_balance?: boolean; opening_balance?: number }>;
    opening_records: Array<any>;
    sections: Array<{ section_code: string; name: string }>;
    companies?: Array<{ id: number; name: string; company_code: string }>;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    // { title: 'Reports', href: '/reports' },
    { title: 'Cash Collection Report', href: '/reports/cash-collection-report' },
];

export default function CashCollectionReport({ company, payments, sales, filters, summary, opening_balance, closing_balance, ledger, cashiers, opening_records, sections, companies = [] }: CashCollectionReportProps) {
    const formatLocalDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [localFilters, setLocalFilters] = useState({
        start_date: filters.start_date || formatLocalDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
        end_date: filters.end_date || formatLocalDate(new Date()),
        cashier_id: filters.cashier_id || '',
        section_code: filters.section_code || '',
        company_code: filters.company_code || '',
    });

    // Keep local filter state in sync with server-provided filters (Inertia props)
    useEffect(() => {
        setLocalFilters((prev) => ({
            ...prev,
            start_date: filters.start_date || prev.start_date,
            end_date: filters.end_date || prev.end_date,
            cashier_id: filters.cashier_id || prev.cashier_id,
            section_code: filters.section_code || prev.section_code,
            company_code: filters.company_code || prev.company_code,
        }));
    }, [filters.start_date, filters.end_date, filters.cashier_id, filters.section_code, filters.company_code]);

    const selectedCashier = cashiers.find(c => String(c.id) === String(localFilters.cashier_id));
    const selectedSection = sections.find(s => s.section_code === localFilters.section_code);

    // If a cashier is selected we prefer that cashier's opening balance (from the
    // list supplied by the backend). If that value is missing or zero, fall back
    // to the server‑computed opening_balance value.
    let displayedOpening = opening_balance;
    if (localFilters.cashier_id && localFilters.cashier_id !== 'all' && selectedCashier) {
        if (typeof selectedCashier.opening_balance === 'number') {
            displayedOpening = selectedCashier.opening_balance;
        }
    }
    if (displayedOpening === 0 && opening_balance !== 0) {
        displayedOpening = opening_balance;
    }

    const exportUrl = (() => {
        const params = new URLSearchParams();
        params.set('start_date', localFilters.start_date);
        params.set('end_date', localFilters.end_date);
        if (localFilters.company_code && localFilters.company_code !== 'all') {
            params.set('company_code', localFilters.company_code);
        }
        if (localFilters.section_code && localFilters.section_code !== 'all') {
            params.set('section_code', localFilters.section_code);
        }
        if (localFilters.cashier_id && localFilters.cashier_id !== 'all') {
            params.set('cashier_id', localFilters.cashier_id);
        }
        return `/reports/cash-collection-report/export?${params.toString()}`;
    })();

    const handleFilterChange = (key: string, value: string) => {
        // immediately update local state
        const updated = { ...localFilters, [key]: value };
        setLocalFilters(updated);

        // if cashier, section, or company is changed, reload the report so that the
        // opening balance and cashiers list are recalculated on the server.
        if (key === 'cashier_id' || key === 'section_code' || key === 'company_code') {
            const params: any = { ...updated };
            if (params.cashier_id === 'all') {
                params.cashier_id = '';
            }
            if (params.section_code === 'all') {
                params.section_code = '';
            }
            if (params.company_code === 'all') {
                params.company_code = '';
            }
            router.get('/reports/cash-collection-report', params, {
                preserveState: true,
                replace: true,
            });
        }
    };

    const applyFilters = () => {
        const params: any = { ...localFilters };
        if (!params.cashier_id) {
            delete params.cashier_id;
        }
        if (!params.section_code) {
            delete params.section_code;
        }
        router.get('/reports/cash-collection-report', params, {
            preserveState: true,
            replace: true,
        });
    };

    const resetFilters = () => {
        const defaultFilters = {
            start_date: new Date().toISOString().split('T')[0].replace(/\d{2}$/, '01'),
            end_date: new Date().toISOString().split('T')[0],
            section_code: 'all',
            cashier_id: 'all',
            company_code: 'all',
        };
        setLocalFilters(defaultFilters);
        router.get('/reports/cash-collection-report', {}, { preserveState: true });
    };

    const handleExportCsv = () => {
        // export is handled by the server endpoint which respects current filters
        window.location.href = exportUrl;
    };

    const formatCurrency = (amount: number, showSymbol = true) => {
        const formatted = amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return showSymbol ? `Rs ${formatted}` : formatted;
    };

    const parseLocalDate = (isoDate: string) => {
        const [year, month, day] = isoDate.split('-').map(Number);
        return new Date(year, month - 1, day);
    };

    // ledger rows supplied by server are already in chronological order
    // ledger prop should be an array of rows, but occasionally backend bugs or
    // serialization issues can result in an object (e.g. empty collection)
    // which would crash the component when we call .map on it. enforce an array
    // here so the UI never breaks even if server data is malformed.
    const ledgerRows: LedgerRow[] = Array.isArray(ledger) ? ledger : [];

    if (!Array.isArray(ledger) && ledger != null) {
        // log in development so we can trace the bad payload
        console.warn('CashCollectionReport: expected ledger array but received', ledger);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Cash Collection Report">
                <style>{`                    
                    @media print {
                        @page {
                            size: A4 portrait;
                            margin-top: 10mm;
                            margin-right: 10mm;
                            margin-bottom: 10mm;
                            margin-left: 10mm;
                        }
                        
                        body, html {
                            height: auto !important;
                            overflow: visible !important;
                            background: #fff !important;
                        }
                        
                        body * {
                            visibility: hidden;
                        }
                        
                        /* Reset all parent containers to allow multi-page flow */
                        body,
                        body > div,
                        body > div > div,
                        [data-slot="sidebar-wrapper"],
                        [data-slot="sidebar-inset"],
                        main,
                        .min-h-screen,
                        .min-h-svh {
                            position: static !important;
                            overflow: visible !important;
                            height: auto !important;
                            min-height: 0 !important;
                            max-height: none !important;
                            display: block !important;
                        }
                        
                        #printable-report,
                        #printable-report * {
                            visibility: visible;
                        }
                        
                        #printable-report {
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 100%;
                            background: white;
                            height: auto !important;
                            overflow: visible !important;
                        }
                        
                        .no-print {
                            display: none !important;
                        }
                        
                        .print-header {
                            margin-bottom: 20px;
                            border-bottom: 2px solid #000;
                            padding-bottom: 10px;
                            display: block !important;
                            page-break-inside: avoid;
                        }
                        
                        .print-logo-wrap {
                            display: flex;
                            justify-content: center;
                            margin-bottom: 10px;
                        }

                        .print-logo {
                            width: 72px;
                            height: 72px;
                            object-fit: contain;
                        }
                        
                        .print-report-title {
                            font-size: 18px;
                            font-weight: bold;
                            text-align: center;
                            margin-bottom: 15px;
                        }
                        
                        .print-info {
                            margin-bottom: 15px;
                        }
                        
                        .print-info-row {
                            display: flex;
                            justify-content: space-between;
                            font-size: 12px;
                            margin-bottom: 3px;
                        }
                        
                        /* enhance closing balance appearance */
                        .balance-row {
                            background-color: #f3f4f6 !important;
                            font-weight: bold;
                            color: #000 !important;
                            border-top: 2px solid #000 !important;
                        }
                        
                        /* ensure totals align neatly on each side */
                        .closing-total {
                            text-align: right !important;
                        }
                        
                        /* make any cell marked text-right stay right in print */
                        .text-right {
                            text-align: right !important;
                        }
                        
                        /* remove card border/shadow for print version */
                        #printable-report > .bg-white {
                            border: none !important;
                            box-shadow: none !important;
                            border-radius: 0 !important;
                            overflow: visible !important;
                        }

                        .overflow-x-auto {
                            overflow: visible !important;
                        }
                        
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            font-size: 10px;
                            page-break-inside: auto;
                            table-layout: fixed;
                        }

                        thead {
                            display: table-header-group;
                        }

                        tbody {
                            display: table-row-group;
                        }
                        
                        th, td {
                            border: 1px solid #666;
                            padding: 4px;
                            vertical-align: top;
                            word-break: break-word;
                        }
                        
                        tr {
                            page-break-inside: avoid;
                            page-break-after: auto;
                        }
                    }
                `}</style>
            </Head>

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow no-print">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4">
                            <div className="flex min-w-0 items-center space-x-3">
                                <button
                                    onClick={() => window.history.back()}
                                    className="shrink-0 rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all"
                                    title="Go Back"
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </button>
                                <div className="shrink-0 rounded-lg bg-white/20 p-2 shadow">
                                    <DollarSign className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="truncate text-lg sm:text-xl font-bold text-white">Cash Collection Report</h1>
                                    <p className="text-xs text-white/80 hidden sm:block">Cash payments plus opening balance</p>
                                </div>
                            </div>

                            <div className="flex w-full sm:w-auto items-center gap-2 sm:gap-3">
                                <button onClick={handleExportCsv} className="no-print inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200">
                                    <FileText className="mr-1.5 h-4 w-4" />
                                    Export CSV
                                </button>
                                <button onClick={() => window.print()} className="no-print inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200">
                                    <Printer className="mr-1.5 h-4 w-4" />
                                    Print
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        {/* Stats Cards */}
                        <div className="mt-4 mb-4 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-4">
                            <div className="rounded-xl bg-white p-3 shadow-sm border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-green-600 p-2">
                                        <DollarSign className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-2 flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-600 truncate">
                                            Opening Balance {selectedCashier ? `(${selectedCashier.name})` : ''}
                                        </p>
                                        <p className="text-sm font-bold text-gray-900 truncate">
                                            {formatCurrency(displayedOpening)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl bg-white p-3 shadow-sm border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-green-600 p-2">
                                        <DollarSign className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-2 flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-600 truncate">Total Cash Collected</p>
                                        <p className="text-sm font-bold text-gray-900 truncate">{formatCurrency(summary.total_amount)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl bg-white p-3 shadow-sm border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-purple-600 p-2">
                                        <DollarSign className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-2 flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-600 truncate">Average Payment</p>
                                        <p className="text-sm font-bold text-gray-900 truncate">{formatCurrency(summary.average_payment)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl bg-white p-3 shadow-sm border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-indigo-600 p-2">
                                        <Calendar className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-2 flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-600 truncate">Period</p>
                                        <p className="text-sm font-bold text-gray-900 truncate">
                                            {new Date(localFilters.start_date).toLocaleDateString('en-GB')} to {new Date(localFilters.end_date).toLocaleDateString('en-GB')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Filters Section */}
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm no-print mb-6">
                            <div className="flex flex-col">
                                <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                    <Filter className="h-4 w-4" />
                                    Filters
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-gray-700">Start Date</Label>
                                        <input
                                            type="date"
                                            id="start_date"
                                            value={localFilters.start_date || ''}
                                            onChange={(e) => handleFilterChange('start_date', e.target.value)}
                                            className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-gray-700">End Date</Label>
                                        <input
                                            type="date"
                                            id="end_date"
                                            value={localFilters.end_date || ''}
                                            onChange={(e) => handleFilterChange('end_date', e.target.value)}
                                            className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                        />
                                    </div>

                                    {companies.length > 0 && (
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium text-gray-700">Company</Label>
                                            <select
                                                value={localFilters.company_code}
                                                onChange={(e) => handleFilterChange('company_code', e.target.value)}
                                                className="block w-full rounded-xl border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                            >
                                                <option value="">{t('All Companies')}</option>
                                                {companies.map((c) => (
                                                    <option key={c.company_code} value={c.company_code}>
                                                        {c.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-gray-700">Section</Label>
                                        <select
                                            value={localFilters.section_code}
                                            onChange={(e) => handleFilterChange('section_code', e.target.value)}
                                            className="block w-full rounded-xl border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                        >
                                            <option value="">{t('All Sections')}</option>
                                            {sections.map((s) => (
                                                <option key={s.section_code} value={s.section_code}>
                                                    {s.name}
                                                </option>
                                            ))}
                                        </select>
                                        {selectedSection && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                {t('Filtered section')}: {selectedSection.name}
                                            </p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-gray-700">User</Label>
                                        <select
                                            value={localFilters.cashier_id}
                                            onChange={(e) => handleFilterChange('cashier_id', e.target.value)}
                                            className="block w-full rounded-xl border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                        >
                                            <option value="">{t('Select user')}</option>
                                            {cashiers.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.name}{c.has_balance ? ` (${t('has balance')})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                        {cashiers.length === 0 && (
                                            <p className="text-xs text-gray-500 mt-1">{t('No cashiers with opening balance for selected date')}</p>
                                        )}
                                        {selectedCashier && selectedCashier.opening_balance !== undefined && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                {t('Selected user opening balance')}: {formatCurrency(selectedCashier.opening_balance)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                        {/* show opening record table */}
                        {localFilters.cashier_id && localFilters.cashier_id !== 'all' && (
                            <div className="mb-6">
                                <h4 className="text-lg font-semibold text-slate-800 mb-2">{t('Opening Balance Records')}</h4>
                                <div className="overflow-x-auto rounded-lg border border-slate-200">
                                <table className="min-w-[560px] w-full divide-y divide-slate-200 mb-0">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('Date')}</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('Amount (Rs)')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-200">
                                        {opening_records.length === 0 ? (
                                            <tr>
                                                <td colSpan={2} className="px-4 py-4 text-center text-sm text-slate-500">
                                                    {t('No opening balance found for selected cashier')}
                                                </td>
                                            </tr>
                                        ) : (
                                            opening_records.map((r, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50">
                                                    <td className="px-4 py-2 text-sm text-slate-900">{new Date(r.balance_date).toLocaleDateString('en-GB')}</td>
                                                    <td className="px-4 py-2 text-sm text-slate-900">{formatCurrency(r.opening_balance, false)}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                                </div>
                            </div>
                        )}
                                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                                    <button
                                        onClick={() => applyFilters()}
                                        className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-vismass-blue px-4 py-2 text-sm font-medium text-white hover:bg-vismass-blue/90"
                                    >
                                        <Filter className="mr-2 h-4 w-4" />
                                        Apply
                                    </button>
                                    <button
                                        onClick={resetFilters}
                                        className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-white border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                    >
                                        <RotateCcw className="mr-2 h-4 w-4" />
                                        Reset
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* ledger-style table showing opening balance and running total */}
                        <div id="printable-report">
                            {/* Print Header - only visible in print */}
                            <div className="print-header" style={{ display: 'none' }}>
                                <div className="mb-4 text-center">
                                    <div className="print-logo-wrap">
                                        {company?.logo ? (
                                            <img
                                                src={company.logo}
                                                alt={company?.name || 'Company Logo'}
                                                className="print-logo"
                                            />
                                        ) : (
                                            <AppLogo companyCode={company?.company_code} />
                                        )}
                                    </div>
                                    <div className="print-report-title">Cash Collection Report</div>
                                </div>
                                <div className="print-info">
                                    <div className="print-info-row">
                                        <span><strong>Period:</strong> {localFilters.start_date} to {localFilters.end_date}</span>
                                        <span><strong>Date:</strong> {new Date().toLocaleDateString('en-GB')}</span>
                                    </div>
                                    <div className="print-info-row">
                                        <span><strong>Section:</strong> {selectedSection ? selectedSection.name : 'All'}</span>
                                        <span><strong>Cashier:</strong> {selectedCashier ? selectedCashier.name : 'All'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                                {/* Screen-only info card */}
                                <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-200 no-print">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-slate-600">Section</p>
                                            <p className="font-medium">{selectedSection ? selectedSection.name : 'All'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-600">Cashier</p>
                                            <p className="font-medium">{selectedCashier ? selectedCashier.name : 'All'}</p>
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <p className="text-sm text-slate-600">Period</p>
                                        <p className="font-medium">
                                            {localFilters.start_date} to {localFilters.end_date}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-6 overflow-x-auto">
                                    <table className="min-w-[760px] w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('Date')}</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('Customer')}</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">{t('Debit (Rs)')}</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">{t('Credit (Rs)')}</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">{t('Balance (Rs)')}</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {/* opening balance row */}
                                    <tr className="font-semibold">
                                        <td className="px-4 py-2 text-sm text-slate-900">{filters.start_date}</td>
                                        <td className="px-4 py-2 text-sm text-slate-900">{t('Opening Balance')}</td>
                                        <td className="px-4 py-2 text-sm text-slate-900 text-right"></td>
                                        <td className="px-4 py-2 text-sm text-slate-900 text-right"></td>
                                        <td className="px-4 py-2 text-sm text-slate-900 text-right">{formatCurrency(displayedOpening, false)}</td>
                                    </tr>
                                    {ledgerRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-4 text-center text-sm text-slate-500">
                                                {t('No cash payments for selected period')}
                                            </td>
                                        </tr>
                                    ) : (
                                        ledgerRows.map((row) => (
                                            <tr key={row.id} className="hover:bg-slate-50">
                                                <td className="px-4 py-2 text-sm text-slate-900">{new Date(row.date).toLocaleDateString('en-GB')}</td>
                                                <td className="px-4 py-2 text-sm text-slate-900">
                                                    <div className="font-medium">{row.customer_name || row.customer_code}</div>
                                                    {row.invoice_no && (
                                                        <div className="text-xs text-blue-600 font-semibold mt-0.5">
                                                            {t('Inv')}: {row.invoice_no}
                                                        </div>
                                                    )}
                                                    {row.reference && !row.invoice_no && (
                                                        <div className="text-xs text-slate-500 mt-0.5">
                                                            {t('Ref')}: {row.reference}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2 text-sm text-slate-900 text-right">{row.debit ? formatCurrency(row.debit,false) : ''}</td>
                                                <td className="px-4 py-2 text-sm text-slate-900 text-right">{row.credit ? formatCurrency(row.credit,false) : ''}</td>
                                                <td className="px-4 py-2 text-sm text-slate-900 text-right">{formatCurrency(row.running_balance,false)}</td>
                                            </tr>
                                        ))
                                    )}
                                    {/* closing balance row if ledger exists */}
                                    {ledgerRows.length > 0 && (
                                        <tr className="font-semibold bg-slate-50 balance-row">
                                            <td className="px-4 py-2 text-sm text-slate-900"></td>
                                            <td className="px-4 py-2 text-sm text-slate-900">{t('Closing Balance')}</td>
                                            <td className="px-4 py-2 text-sm text-slate-900"></td>
                                            <td className="px-4 py-2 text-sm text-slate-900"></td>
                                            <td className="px-4 py-2 text-sm text-slate-900 text-right closing-total">{formatCurrency(closing_balance ?? displayedOpening, false)}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div> {/* closes mt-6 */}
                    </div> {/* closes bg-white container */}
                </div> {/* closes printable-report */}
            </div> {/* closes px-4 container */}
                </main>

                {/* Footer */}
                <footer className="mt-12 border-t border-slate-200 bg-gradient-to-r from-white to-slate-50 py-6 no-print">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <p className="text-center text-sm text-gray-600">© 2026 VISMASS</p>
                    </div>
                </footer>
            </div>
        </AppLayout>
    );
}

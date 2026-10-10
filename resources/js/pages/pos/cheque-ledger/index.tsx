import React, { useState, useEffect, useRef, useCallback } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Search,
    CreditCard,
    Building2,
    Calendar,
    CheckCircle,
    XCircle,
    DollarSign,
    Clock,
    RotateCcw,
    TrendingDown,
    Truck,
    AlertTriangle,
    ChevronDown,
    ChevronUp,
    Download,
    FileText,
} from 'lucide-react';
import { t } from '@/lib/i18n';

interface LedgerItem {
    id: number;
    type: 'customer' | 'delivery';
    cheque_no: string;
    bank_name: string;
    branch: string | null;
    amount: number;
    cheque_date: string;
    customer_name: string;
    customer_code: string;
    status: 'pending' | 'deposited' | 'returned';
    is_deposited: boolean;
    deposited_at: string | null;
    deposit_bank: string | null;
    return_date: string | null;
    return_reason: string | null;
    return_number: string | null;
    created_at: string;
}

interface Summary {
    total_count: number;
    total_amount: number;
    pending_count: number;
    pending_amount: number;
    deposited_count: number;
    deposited_amount: number;
    returned_count: number;
    returned_amount: number;
}

interface Filters {
    status: string;
    search: string;
    date_from: string;
    date_to: string;
}

interface Props {
    ledger: LedgerItem[];
    summary: Summary;
    filters: Filters;
}

const breadcrumbs = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Cheque Ledger', href: '/pos/cheque-ledger' },
];

function buildExportUrl(base: string, status: string, search: string, dateFrom: string, dateTo: string) {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
}

function ExportButtons({ status, search, dateFrom, dateTo }: { status: string; search: string; dateFrom: string; dateTo: string }) {
    const csvUrl = buildExportUrl('/pos/cheque-ledger/export-csv', status, search, dateFrom, dateTo);
    const pdfUrl = buildExportUrl('/pos/cheque-ledger/download-pdf', status, search, dateFrom, dateTo);

    return (
        <div className="flex items-center gap-1 border-l border-gray-300 pl-2 ml-1">
            <a
                href={csvUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center bg-white border border-gray-300 text-gray-700 px-3 py-2 text-sm rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium whitespace-nowrap"
            >
                <FileText className="mr-1 h-3.5 w-3.5" />
                {t('CSV')}
            </a>
            {/* <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center bg-rose-600 text-white px-3 py-2 text-sm rounded-lg hover:bg-rose-700 transition-all duration-200 font-medium whitespace-nowrap"
            >
                <Download className="mr-1 h-3.5 w-3.5" />
                {t('PDF')}
            </a> */}
        </div>
    );
}

export default function ChequeLedgerIndex({ ledger, summary, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || 'all');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isInitialMount = useRef(true);

    const fetchFiltered = useCallback((params: { status: string; search: string; date_from: string; date_to: string }) => {
        router.get('/pos/cheque-ledger', params, {
            preserveState: true,
            replace: true,
        });
    }, []);

    // Auto-apply filters on status/date changes (skip initial mount)
    useEffect(() => {
        if (isInitialMount.current) return;
        fetchFiltered({ status, search, date_from: dateFrom, date_to: dateTo });
    }, [status, dateFrom, dateTo]);

    // Debounced auto-apply for search
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            fetchFiltered({ status, search, date_from: dateFrom, date_to: dateTo });
        }, 400);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [search]);

    const clearFilters = () => {
        setSearch('');
        setStatus('all');
        setDateFrom('');
        setDateTo('');
        fetchFiltered({ status: 'all', search: '', date_from: '', date_to: '' });
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-GB');
    };

    const formatDateTime = (dateStr: string | null) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
    };

    const statusBadge = (item: LedgerItem) => {
        if (item.status === 'returned') {
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800 border border-red-200">
                    <XCircle className="h-3 w-3" />
                    {t('Returned')}
                </span>
            );
        }
        if (item.status === 'deposited') {
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800 border border-green-200">
                    <CheckCircle className="h-3 w-3" />
                    {t('Deposited')}
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
                <Clock className="h-3 w-3" />
                {t('Pending')}
            </span>
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Cheque Ledger')} />

            <div className="min-h-screen bg-slate-50 pb-12">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4">
                            <div className="flex items-center space-x-3">
                                <button
                                    onClick={() => window.history.back()}
                                    className="rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                    title="Go Back"
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </button>
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <CreditCard className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">
                                        {t('Cheque Ledger')}
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        {t('Complete history of all cheques — pending, deposited, and returned')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
                            {/* Total */}
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue p-2 shadow-sm">
                                        <CreditCard className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Total Cheques')}</p>
                                        <p className="text-lg font-bold text-gray-900">{summary.total_count}</p>
                                        <p className="text-[10px] text-gray-500">Rs.{summary.total_amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Pending */}
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-amber-500 p-2 shadow-sm">
                                        <Clock className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Pending')}</p>
                                        <p className="text-lg font-bold text-amber-600">{summary.pending_count}</p>
                                        <p className="text-[10px] text-gray-500">Rs.{summary.pending_amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Deposited */}
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-green-500 p-2 shadow-sm">
                                        <CheckCircle className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Deposited')}</p>
                                        <p className="text-lg font-bold text-green-600">{summary.deposited_count}</p>
                                        <p className="text-[10px] text-gray-500">Rs.{summary.deposited_amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Returned */}
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-red-500 p-2 shadow-sm">
                                        <RotateCcw className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Returned')}</p>
                                        <p className="text-lg font-bold text-red-600">{summary.returned_count}</p>
                                        <p className="text-[10px] text-gray-500">Rs.{summary.returned_amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Content Card */}
                        <div className="rounded-lg border border-slate-200 bg-white shadow overflow-hidden">
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 py-3">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                                    <div>
                                        <h3 className="text-base font-semibold text-white">
                                            {t('Cheque Records')}
                                        </h3>
                                        <p className="text-white/80 text-xs mt-0.5">
                                            {t('All cheques with deposit and return details')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4">
                                {/* Filters */}
                                <div className="bg-slate-50 p-3 rounded-lg mb-4 border border-slate-200">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                                        {/* Search */}
                                        <div className="flex-1 min-w-0">
                                            <div className="relative">
                                                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder={t('Search by cheque no, customer, bank...')}
                                                    value={search}
                                                    onChange={(e) => setSearch(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                            {/* Status Filter */}
                                            <div className="w-full sm:w-36">
                                                <select
                                                    value={status}
                                                    onChange={(e) => setStatus(e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-vismass-blue focus:ring-2 focus:ring-vismass-blue/20"
                                                >
                                                    <option value="all">{t('All Status')}</option>
                                                    <option value="pending">{t('Pending')}</option>
                                                    <option value="deposited">{t('Deposited')}</option>
                                                    <option value="returned">{t('Returned')}</option>
                                                </select>
                                            </div>

                                            {/* Date Range */}
                                            <input
                                                type="date"
                                                value={dateFrom}
                                                onChange={(e) => setDateFrom(e.target.value)}
                                                className="w-full sm:w-36 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-vismass-blue focus:ring-2 focus:ring-vismass-blue/20"
                                                placeholder={t('From Date')}
                                            />
                                            <input
                                                type="date"
                                                value={dateTo}
                                                onChange={(e) => setDateTo(e.target.value)}
                                                className="w-full sm:w-36 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-vismass-blue focus:ring-2 focus:ring-vismass-blue/20"
                                                placeholder={t('To Date')}
                                            />

                                            {/* Clear */}
                                            <button
                                                onClick={clearFilters}
                                                className="inline-flex items-center bg-gray-200 text-gray-700 px-3 py-2 text-sm rounded-lg hover:bg-gray-300 transition-all duration-200 font-medium whitespace-nowrap"
                                            >
                                                {t('Clear')}
                                            </button>

                                            {/* Export Buttons */}
                                            <ExportButtons status={status} search={search} dateFrom={dateFrom} dateTo={dateTo} />
                                        </div>
                                    </div>
                                </div>

                                {/* Desktop Table View */}
                                <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200">
                                    <table className="min-w-full divide-y divide-slate-200">
                                        <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
                                            <tr>
                                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider w-8"></th>
                                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                    {t('Cheque No')}
                                                </th>
                                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                    {t('Customer')}
                                                </th>
                                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                    {t('Cheque Bank')}
                                                </th>
                                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                    {t('Chq Date')}
                                                </th>
                                                <th className="px-3 py-2.5 text-center text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                    {t('Status')}
                                                </th>
                                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                    {t('Deposit Bank')}
                                                </th>
                                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                    {t('Deposited Date')}
                                                </th>
                                                <th className="px-3 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                    {t('Amount')}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-200">
                                            {ledger.length === 0 ? (
                                                <tr>
                                                    <td colSpan={9} className="px-4 py-12 text-center">
                                                        <CreditCard className="mx-auto h-12 w-12 text-slate-400" />
                                                        <h3 className="mt-2 text-sm font-medium text-slate-900">{t('No cheques found')}</h3>
                                                        <p className="mt-1 text-sm text-slate-500">
                                                            {t('No cheques match your filter criteria.')}
                                                        </p>
                                                    </td>
                                                </tr>
                                            ) : (
                                                ledger.map((item) => {
                                                    const rowKey = `${item.type}-${item.id}`;
                                                    const isExpanded = expandedRow === rowKey;
                                                    return (
                                                        <React.Fragment key={rowKey}>
                                                            <tr
                                                                className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                                                                    item.status === 'returned' ? 'bg-red-50/30' :
                                                                    item.status === 'deposited' ? 'bg-green-50/20' : ''
                                                                }`}
                                                                onClick={() => setExpandedRow(isExpanded ? null : rowKey)}
                                                            >
                                                                <td className="px-3 py-2.5">
                                                                    {isExpanded ? (
                                                                        <ChevronUp className="h-4 w-4 text-slate-400" />
                                                                    ) : (
                                                                        <ChevronDown className="h-4 w-4 text-slate-400" />
                                                                    )}
                                                                </td>
                                                                <td className="px-3 py-2.5 whitespace-nowrap">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-sm font-medium text-slate-900">
                                                                            {item.cheque_no || t('No Number')}
                                                                        </span>
                                                                        {item.type === 'delivery' && (
                                                                            <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-800 border border-amber-200">
                                                                                <Truck className="mr-0.5 h-2.5 w-2.5" />
                                                                                {t('DLV')}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="px-3 py-2.5 whitespace-nowrap">
                                                                    <div className="text-sm text-slate-900">{item.customer_name}</div>
                                                                </td>
                                                                <td className="px-3 py-2.5 whitespace-nowrap">
                                                                    <div className="text-sm text-slate-700 flex items-center gap-1.5">
                                                                        <Building2 className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                                                                        <span>{item.bank_name}</span>
                                                                    </div>
                                                                    {item.branch && (
                                                                        <div className="text-xs text-slate-500 ml-5">{item.branch}</div>
                                                                    )}
                                                                </td>
                                                                <td className="px-3 py-2.5 whitespace-nowrap">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                                                        <span className="text-sm text-slate-700">{formatDate(item.cheque_date)}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-3 py-2.5 whitespace-nowrap text-center">
                                                                    {statusBadge(item)}
                                                                </td>
                                                                <td className="px-3 py-2.5 whitespace-nowrap">
                                                                    {item.deposit_bank ? (
                                                                        <div className="text-sm text-slate-700">{item.deposit_bank}</div>
                                                                    ) : (
                                                                        <span className="text-xs text-slate-400">-</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-3 py-2.5 whitespace-nowrap">
                                                                    {item.deposited_at ? (
                                                                        <span className="text-sm text-slate-700">{formatDateTime(item.deposited_at)}</span>
                                                                    ) : (
                                                                        <span className="text-xs text-slate-400">-</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-3 py-2.5 whitespace-nowrap text-right">
                                                                    <span className={`text-sm font-bold ${
                                                                        item.status === 'returned' ? 'text-red-600' : 'text-vismass-blue'
                                                                    }`}>
                                                                        Rs.{Number(item.amount).toFixed(2)}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                            {/* Expanded Row - Return Details */}
                                                            {isExpanded && item.status === 'returned' && (
                                                                <tr>
                                                                    <td colSpan={9} className="px-4 py-3 bg-red-50/50">
                                                                        <div className="flex items-center gap-6 ml-8">
                                                                            <div className="flex items-center gap-2">
                                                                                <AlertTriangle className="h-4 w-4 text-red-500" />
                                                                                <span className="text-xs font-semibold text-red-700">{t('Return Details')}</span>
                                                                            </div>
                                                                            {item.return_date && (
                                                                                <div className="text-xs text-red-600">
                                                                                    <span className="font-medium">{t('Return Date')}:</span> {formatDate(item.return_date)}
                                                                                </div>
                                                                            )}
                                                                            {item.return_reason && (
                                                                                <div className="text-xs text-red-600">
                                                                                    <span className="font-medium">{t('Reason')}:</span> {item.return_reason}
                                                                                </div>
                                                                            )}
                                                                            {item.return_number && (
                                                                                <div className="text-xs text-red-600">
                                                                                    <span className="font-medium">{t('Return No')}:</span> {item.return_number}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                            {isExpanded && item.status !== 'returned' && item.deposit_bank && (
                                                                <tr>
                                                                    <td colSpan={9} className="px-4 py-3 bg-green-50/30">
                                                                        <div className="flex items-center gap-6 ml-8">
                                                                            <div className="flex items-center gap-2">
                                                                                <CheckCircle className="h-4 w-4 text-green-500" />
                                                                                <span className="text-xs font-semibold text-green-700">{t('Deposit Details')}</span>
                                                                            </div>
                                                                            <div className="text-xs text-green-600">
                                                                                <span className="font-medium">{t('Bank')}:</span> {item.deposit_bank}
                                                                            </div>
                                                                            {item.deposited_at && (
                                                                                <div className="text-xs text-green-600">
                                                                                    <span className="font-medium">{t('Date')}:</span> {formatDateTime(item.deposited_at)}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile List View */}
                                <div className="md:hidden space-y-3">
                                    {ledger.length === 0 ? (
                                        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
                                            <CreditCard className="mx-auto h-12 w-12 text-slate-400" />
                                            <h3 className="mt-2 text-sm font-medium text-slate-900">{t('No cheques found')}</h3>
                                        </div>
                                    ) : (
                                        ledger.map((item) => (
                                            <div
                                                key={`${item.type}-${item.id}`}
                                                className={`rounded-2xl border bg-white p-4 shadow-sm ${
                                                    item.status === 'returned' ? 'border-red-200' :
                                                    item.status === 'deposited' ? 'border-green-200' : 'border-slate-200'
                                                }`}
                                            >
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-bold text-slate-900">{item.cheque_no || t('No Number')}</span>
                                                            {item.type === 'delivery' && (
                                                                <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-800">
                                                                    <Truck className="mr-0.5 h-2.5 w-2.5" /> DLV
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-slate-500">{item.customer_name}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className={`text-sm font-bold ${item.status === 'returned' ? 'text-red-600' : 'text-vismass-blue'}`}>
                                                            Rs.{Number(item.amount).toFixed(2)}
                                                        </div>
                                                        <div className="mt-1">{statusBadge(item)}</div>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-3">
                                                    <div>
                                                        <span className="text-slate-400 block mb-0.5">{t('Cheque Bank')}</span>
                                                        <span className="font-medium text-slate-700">{item.bank_name}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-400 block mb-0.5">{t('Chq Date')}</span>
                                                        <span className="font-medium text-slate-700">{formatDate(item.cheque_date)}</span>
                                                    </div>
                                                    {item.deposit_bank && (
                                                        <div>
                                                            <span className="text-slate-400 block mb-0.5">{t('Deposit Bank')}</span>
                                                            <span className="font-medium text-slate-700">{item.deposit_bank}</span>
                                                        </div>
                                                    )}
                                                    {item.deposited_at && (
                                                        <div>
                                                            <span className="text-slate-400 block mb-0.5">{t('Deposited')}</span>
                                                            <span className="font-medium text-slate-700">{formatDateTime(item.deposited_at)}</span>
                                                        </div>
                                                    )}
                                                    {item.status === 'returned' && item.return_reason && (
                                                        <div className="col-span-2 mt-1 p-2 bg-red-50 rounded-lg">
                                                            <span className="text-red-500 block mb-0.5">{t('Return Reason')}</span>
                                                            <span className="font-medium text-red-700">{item.return_reason}</span>
                                                            {item.return_date && (
                                                                <span className="text-red-500 ml-2">({formatDate(item.return_date)})</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </AppLayout>
    );
}

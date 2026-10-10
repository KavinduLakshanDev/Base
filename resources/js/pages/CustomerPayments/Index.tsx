import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem } from '@/types';
import { t } from '@/lib/i18n';
import {
    Receipt,
    Plus,
    Search,
    Calendar,
    X,
    User,
    DollarSign,
    AlertCircle,
    CreditCard,
    Banknote,
    Landmark,
    Ticket,
    Download,
    FileText
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface Payment {
    id: number;
    amount: string;
    date: string;
    method: string;
    reference: string | null;
    cheque_no: string | null;
    status: string;
    customer: {
        FstNm: string;
        AdrCd: string;
    } | null;
    sales_transaction_id: number | null;
    service_job_id: number | null;
    invoice_allocations?: Array<{ invoice_id: number; amount: number }> | null;
    paid_invoices?: string[];
    collected_by?: {
        first_name: string;
        last_name: string;
    } | null;
}

interface PaginationLinks {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaymentsResponse {
    data: Payment[];
    links: PaginationLinks[];
    current_page: number;
    last_page: number;
    from: number;
    to: number;
    total: number;
}

interface Props {
    payments: PaymentsResponse;
    filters: {
        search?: string;
        date_from?: string;
        date_to?: string;
        cashier_id?: string;
    };
    cashiers?: Array<{ id: number; first_name: string; last_name: string; }>;
    stats?: {
        total_sales: number;
        total_collected: number;
        pending_clearance: number;
        this_month: number;
        cash_total: number;
        cheque_total: number;
        bank_total: number;
        card_total: number;
        transaction_count: number;
    };
}

export default function CustomerPaymentIndex({ payments, filters, stats, cashiers }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    const [cashierId, setCashierId] = useState(filters.cashier_id || '');

    const parseAmount = (amount: any) => {
        if (!amount) return 0;
        if (typeof amount === 'number') return amount;
        return parseFloat(amount.toString().replace(/,/g, '')) || 0;
    };

    const pageStats = {
        transaction_count: payments.data.length,
        total_sales: payments.data.reduce((sum, p) => sum + parseAmount(p.amount), 0),
        cash_total: payments.data.filter(p => p.method?.toLowerCase() === 'cash').reduce((sum, p) => sum + parseAmount(p.amount), 0),
        card_total: payments.data.filter(p => p.method?.toLowerCase() === 'card').reduce((sum, p) => sum + parseAmount(p.amount), 0),
        cheque_total: payments.data.filter(p => p.method?.toLowerCase() === 'cheque').reduce((sum, p) => sum + parseAmount(p.amount), 0),
        bank_total: payments.data.filter(p => p.method?.toLowerCase() === 'bank' || p.method?.toLowerCase() === 'bank transfer').reduce((sum, p) => sum + parseAmount(p.amount), 0),
    };

    function handleSearch(e?: React.FormEvent) {
        if (e) e.preventDefault();
        router.get(
            '/admin/customer-payments',
            { search, date_from: dateFrom, date_to: dateTo, cashier_id: cashierId },
            {
                preserveState: true,
                replace: true,
            }
        );
    }

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (search !== (filters.search || '')) {
                handleSearch();
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);



    const clearFilters = () => {
        setSearch('');
        setDateFrom('');
        setDateTo('');
        setCashierId('');
        router.get('/admin/customer-payments', {}, {
            preserveState: true,
            replace: true
        });
    };

    const handleDownload = () => {
        const url = new URL(window.location.origin + '/admin/customer-payments/export');
        if (search) url.searchParams.append('search', search);
        if (dateFrom) url.searchParams.append('date_from', dateFrom);
        if (dateTo) url.searchParams.append('date_to', dateTo);
        if (cashierId) url.searchParams.append('cashier_id', cashierId);
        window.location.href = url.toString();
    };

    const handleDownloadPdf = () => {
        const url = new URL(window.location.origin + '/admin/customer-payments/export');
        if (search) url.searchParams.append('search', search);
        if (dateFrom) url.searchParams.append('date_from', dateFrom);
        if (dateTo) url.searchParams.append('date_to', dateTo);
        if (cashierId) url.searchParams.append('cashier_id', cashierId);
        url.searchParams.append('format', 'pdf');
        window.location.href = url.toString();
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('Dashboard'), href: '/dashboard' },
        { title: t('Customer Payments'), href: '#' },
    ];

    const formatCurrency = (amount: string | number): string => {
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        return `Rs ${numAmount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-GB', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-green-100 text-green-800'; // Default to green as per previous design
        }
    };

    const printReceipt = (paymentId: number) => {
        const toastId = toast.loading('Generating receipt...');
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = `/admin/customer-payments/${paymentId}/receipt`;
        document.body.appendChild(iframe);

        iframe.onload = () => {
            toast.dismiss(toastId);
            toast.success('Print command sent.', { duration: 2000 });
            // The iframe contains auto-print script, so it will trigger automatically.
            // We just need to clean up after some time.
            setTimeout(() => {
                if (document.body.contains(iframe)) {
                    document.body.removeChild(iframe);
                }
            }, 10000);
        };
    };

    const getPaidInvoiceNumbers = (payment: Payment): string => {
        const invoices = (payment.paid_invoices || []).filter((inv) => !!inv);
        if (invoices.length === 0) {
            return '—';
        }
        return invoices.join(', ');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Customer Payments')} />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4 gap-3">
                            <div className="flex min-w-0 items-center space-x-3">
                                <button
                                    onClick={() => window.history.back()}
                                    className="shrink-0 rounded-lg bg-white/20 p-2 transition-all duration-200 hover:bg-white/30"
                                    title="Go Back"
                                >
                                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                </button>
                                <div className="shrink-0 rounded-lg bg-white/20 p-2 shadow">
                                    <Receipt className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="truncate text-lg sm:text-xl font-bold text-white">
                                        {t('Customer Payments')}
                                    </h1>
                                    <p className="hidden text-xs text-white/80 sm:block">
                                        {t('Manage and track all customer payment records')}
                                    </p>
                                </div>
                            </div>

                            <Link
                                href="/admin/customer-payments/create"
                                className="shrink-0 inline-flex items-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                            >
                                <Plus className="h-4 w-4 sm:mr-1.5" />
                                <span className="hidden sm:inline">{t('Create Payment')}</span>
                            </Link>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-8 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">

                        {/* Summary Stats (If data available) */}
                        {pageStats && (
                            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 mb-6">
                                {/* Transactions Card */}
                                <div className="group relative overflow-hidden rounded-xl bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                    <div className="flex items-center">
                                        <div className="rounded-lg bg-emerald-500 p-2.5 shadow-sm">
                                            <Receipt className="h-5 w-5 text-white" />
                                        </div>
                                        <div className="ml-3 min-w-0">
                                            <p className="text-xs font-medium text-gray-500 truncate">{t('Transactions')}</p>
                                            <p className="text-xl font-bold text-gray-900">{pageStats.transaction_count}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Total Collected Card */}
                                <div className="group relative overflow-hidden rounded-xl bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                    <div className="flex items-center">
                                        <div className="rounded-lg bg-sky-500 p-2.5 shadow-sm">
                                            <DollarSign className="h-5 w-5 text-white" />
                                        </div>
                                        <div className="ml-3 min-w-0">
                                            <p className="text-xs font-medium text-gray-500 truncate">{t('Total Collected')}</p>
                                            <p className="text-xl font-bold text-gray-900 leading-tight">
                                                <span className="text-[10px] block font-normal text-gray-400">Rs</span>
                                                {new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(pageStats.total_sales)}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Cash Card */}
                                <div className="group relative overflow-hidden rounded-xl bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                    <div className="flex items-center">
                                        <div className="rounded-lg bg-purple-600 p-2.5 shadow-sm">
                                            <Banknote className="h-5 w-5 text-white" />
                                        </div>
                                        <div className="ml-3 min-w-0">
                                            <p className="text-xs font-medium text-gray-500 truncate">{t('Cash')}</p>
                                            <p className="text-xl font-bold text-gray-900 leading-tight">
                                                <span className="text-[10px] block font-normal text-gray-400">Rs</span>
                                                {new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(pageStats.cash_total)}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Card Card */}
                                <div className="group relative overflow-hidden rounded-xl bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                    <div className="flex items-center">
                                        <div className="rounded-lg bg-indigo-500 p-2.5 shadow-sm">
                                            <CreditCard className="h-5 w-5 text-white" />
                                        </div>
                                        <div className="ml-3 min-w-0">
                                            <p className="text-xs font-medium text-gray-500 truncate">{t('Card')}</p>
                                            <p className="text-xl font-bold text-gray-900 leading-tight">
                                                <span className="text-[10px] block font-normal text-gray-400">Rs</span>
                                                {new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(pageStats.card_total)}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Cheque Card */}
                                <div className="group relative overflow-hidden rounded-xl bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                    <div className="flex items-center">
                                        <div className="rounded-lg bg-orange-500 p-2.5 shadow-sm">
                                            <Ticket className="h-5 w-5 text-white" />
                                        </div>
                                        <div className="ml-3 min-w-0">
                                            <p className="text-xs font-medium text-gray-500 truncate">{t('Cheque')}</p>
                                            <p className="text-xl font-bold text-gray-900 leading-tight">
                                                <span className="text-[10px] block font-normal text-gray-400">Rs</span>
                                                {new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(pageStats.cheque_total)}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Bank Transfer Card */}
                                <div className="group relative overflow-hidden rounded-xl bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                    <div className="flex items-center">
                                        <div className="rounded-lg bg-blue-600 p-2.5 shadow-sm">
                                            <Landmark className="h-5 w-5 text-white" />
                                        </div>
                                        <div className="ml-3 min-w-0">
                                            <p className="text-xs font-medium text-gray-500 truncate">{t('Bank Transfer')}</p>
                                            <p className="text-xl font-bold text-gray-900 leading-tight">
                                                <span className="text-[10px] block font-normal text-gray-400">Rs</span>
                                                {new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(pageStats.bank_total)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Main Content Card */}
                        <div className="rounded-lg border border-slate-200 bg-white shadow overflow-hidden">
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 py-3">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">
                                            {t('Payment History')}
                                        </h3>
                                        <p className="text-white/80 text-sm mt-1">
                                            {t('Detailed record of all customer payments')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6">
                                {/* Filters */}
                                <div className="bg-slate-50 p-3 rounded-lg mb-4 border border-slate-200">
                                    <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                                        <div className="flex-1">
                                            <div className="relative">
                                                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder={t('Search by reference, customer or cheque no...')}
                                                    value={search}
                                                    onChange={(e) => setSearch(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
                                            <div className="relative">
                                                <Calendar className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <input
                                                    type="date"
                                                    value={dateFrom}
                                                    onChange={(e) => setDateFrom(e.target.value)}
                                                    className="w-full pl-9 pr-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                />
                                            </div>
                                            <div className="relative">
                                                <Calendar className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <input
                                                    type="date"
                                                    value={dateTo}
                                                    onChange={(e) => setDateTo(e.target.value)}
                                                    className="w-full pl-9 pr-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                />
                                            </div>
                                            <div className="relative col-span-2 sm:col-span-1 min-w-[150px]">
                                                <User className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <select
                                                    value={cashierId}
                                                    onChange={(e) => setCashierId(e.target.value)}
                                                    className="w-full pl-9 pr-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition appearance-none bg-white"
                                                >
                                                    <option value="">{t('All Cashiers')}</option>
                                                    {cashiers?.map(c => (
                                                        <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                type="submit"
                                                className="inline-flex items-center justify-center bg-gradient-to-r from-sky-600 to-blue-600 text-white px-4 py-2 text-sm rounded-lg hover:from-sky-700 hover:to-blue-700 transition-all duration-200 font-medium shadow-sm"
                                            >
                                                <Search className="mr-1.5 h-3.5 w-3.5" />
                                                {t('Filter')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={clearFilters}
                                                className="inline-flex items-center bg-gray-200 text-gray-700 px-4 py-2 text-sm rounded-lg hover:bg-gray-300 transition-all duration-200 font-medium"
                                            >
                                                <X className="mr-1.5 h-3.5 w-3.5" />
                                                {t('Clear')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleDownload}
                                                className="inline-flex items-center bg-emerald-100 text-emerald-700 border border-emerald-200 px-4 py-2 text-sm rounded-lg hover:bg-emerald-200 hover:text-emerald-800 transition-all duration-200 font-medium shadow-sm"
                                            >
                                                <Download className="mr-1.5 h-3.5 w-3.5" />
                                                {t('CSV')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleDownloadPdf}
                                                className="inline-flex items-center bg-rose-100 text-rose-700 border border-rose-200 px-4 py-2 text-sm rounded-lg hover:bg-rose-200 hover:text-rose-800 transition-all duration-200 font-medium shadow-sm"
                                            >
                                                <FileText className="mr-1.5 h-3.5 w-3.5" />
                                                {t('PDF')}
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                {/* Payments Table */}
                                <div className="overflow-x-auto rounded-lg border border-gray-200">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
                                            <tr>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                    {t('Date')}
                                                </th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                    {t('Receipt No')}
                                                </th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                    {t('Customer')}
                                                </th>
                                                <th className="px-4 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                    {t('Amount')}
                                                </th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                    {t('Paid Invoice No')}
                                                </th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                    {t('Method')}
                                                </th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                    {t('Collected By')}
                                                </th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                    {t('Status')}
                                                </th>
                                                <th className="px-4 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                    {t('Actions')}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {payments.data.length > 0 ? (
                                                payments.data.map((payment) => (
                                                    <tr key={payment.id} className="hover:bg-sky-50/50 transition-colors duration-150">
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <div className="text-xs text-gray-900 flex items-center">
                                                                <Calendar className="mr-1.5 h-3.5 w-3.5 text-gray-400" />
                                                                {formatDate(payment.date)}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <span className="text-xs font-bold text-vismass-blue bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                                                PAY-{payment.id}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center">
                                                                <User className="mr-1.5 h-3.5 w-3.5 text-gray-400" />
                                                                <div>
                                                                    <div className="text-xs font-medium text-gray-900 truncate max-w-[150px]">
                                                                        {payment.customer ? payment.customer.FstNm : t('Unknown')}
                                                                    </div>
                                                                    <div className="text-[10px] text-gray-500 font-mono">
                                                                        {payment.customer?.AdrCd}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-right text-xs font-bold text-gray-900">
                                                            {formatCurrency(payment.amount)}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700">
                                                            {getPaidInvoiceNumbers(payment)}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-medium capitalize text-gray-700">{payment.method}</span>
                                                                {payment.method === 'cheque' && (
                                                                    <span className="text-[10px] text-gray-500 italic">#{payment.cheque_no}</span>
                                                                )}
                                                                {payment.reference && (
                                                                    <span className="text-[10px] text-gray-500 italic">Ref: {payment.reference}</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-700">
                                                            {payment.collected_by ? `${payment.collected_by.first_name} ${payment.collected_by.last_name}` : '—'}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ${getStatusColor(payment.status)}`}>
                                                                {payment.status || 'Completed'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-right text-xs font-medium">
                                                            <button
                                                                onClick={() => printReceipt(payment.id)}
                                                                className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                                                            >
                                                                <FileText className="mr-1 h-3.5 w-3.5" />
                                                                {t('Receipt')}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={9} className="px-6 py-12 text-center">
                                                        <div className="flex flex-col items-center">
                                                            <AlertCircle className="h-10 w-10 text-gray-300 mb-2" />
                                                            <p className="text-gray-500 text-sm font-medium">{t('No payments found')}</p>
                                                            <p className="text-gray-400 text-xs">{t('Try adjusting your search or filters')}</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                {payments.links.length > 3 && (
                                    <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                                        <div className="hidden sm:block">
                                            <p className="text-xs text-gray-500">
                                                {t('Showing')} <span className="font-medium text-gray-700">{payments.from}</span> {t('to')} <span className="font-medium text-gray-700">{payments.to}</span> {t('of')} <span className="font-medium text-gray-700">{payments.total}</span> {t('results')}
                                            </p>
                                        </div>
                                        <nav className="flex items-center space-x-1" aria-label="Pagination">
                                            {payments.links.map((link, index) => (
                                                <Link
                                                    key={index}
                                                    href={link.url || '#'}
                                                    className={`relative inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${link.active
                                                        ? 'z-10 bg-vismass-blue text-white shadow-sm'
                                                        : link.url
                                                            ? 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                                                            : 'bg-white border border-gray-100 text-gray-300 cursor-not-allowed'
                                                        }`}
                                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                                />
                                            ))}
                                        </nav>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="mt-8 border-t border-sky-200 bg-gradient-to-r from-white to-sky-50">
                    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col sm:flex-row items-center justify-between">
                            <p className="text-xs text-gray-500">
                                © VISMASS {t('Financial Management')} • {t('Transaction History')}
                            </p>
                            <div className="flex items-center space-x-4 mt-2 sm:mt-0">
                                <span className="text-[10px] text-sky-600 font-medium">v1.0.0</span>
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </AppLayout>
    );
}

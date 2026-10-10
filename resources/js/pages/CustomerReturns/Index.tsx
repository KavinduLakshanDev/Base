import { useEffect, useState, useRef } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Filter, RotateCcw, DollarSign, CheckCircle2, Download, Tag, Eye } from 'lucide-react';
import { t } from '@/lib/i18n';
import Pagination, { PaginationLink, PaginationMeta } from '@/components/pagination';
import { type BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: t('Dashboard'),
        href: '/company/dashboard',
    },
    {
        title: t('Customer Returns'),
        href: '/customer-returns',
    },
];

interface CustomerReturn {
    id: number;
    return_no: string;
    return_date: string;
    customer_name: string;
    original_invoice_no?: string;
    return_type: 'item' | 'printer' | 'mixed';
    total_return_amount: number;
    refund_amount: number;
    refund_method: string;
    status: 'pending' | 'processed' | 'completed' | 'cancelled';
    items_count?: number;
}

interface Filters {
    search?: string;
    return_type?: string;
    date_from?: string;
    date_to?: string;
    per_page?: string;
}

interface Props {
    returns: {
        data: CustomerReturn[];
        links: PaginationLink[];
        meta: PaginationMeta;
        from?: number;
        to?: number;
        total?: number;
        current_page?: number;
        last_page?: number;
    };
    filters: Filters;
    stats: {
        totalReturns: number;
        completedReturns: number;
        totalReturnAmount: number;
    };
}

export default function Index({ returns, filters = {}, stats }: Props) {
    const [itemsPerPage, setItemsPerPage] = useState(filters.per_page || '15');
    
    const { data, setData } = useForm({
        search: filters.search || '',
        return_type: filters.return_type || '',
        date_from: filters.date_from || '',
        date_to: filters.date_to || '',
    });

    const initialRender = useRef(true);

    // Debounced filtering
    useEffect(() => {
        if (initialRender.current) {
            initialRender.current = false;
            return;
        }

        const timeoutId = setTimeout(() => {
            router.get(
                '/customer-returns',
                {
                    search: data.search,
                    return_type: data.return_type,
                    date_from: data.date_from,
                    date_to: data.date_to,
                    per_page: itemsPerPage,
                    page: 1,
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                }
            );
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [data.search, data.return_type, data.date_from, data.date_to, itemsPerPage]);

    const handleClearFilters = () => {
        setData({ search: '', return_type: '', date_from: '', date_to: '' });
        setItemsPerPage('15');
        
        router.get('/customer-returns', { per_page: '15' }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const formatAmount = (amount: number | string) => {
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        if (!numAmount && numAmount !== 0) return 'N/A';
        return `Rs ${numAmount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const handleDownload = () => {
        const headers = ['Return No', 'Date', 'Customer', 'Original Invoice', 'Return Amount', 'Refund Amount', 'Method', 'Status'];
        const csvRows = returns.data.map(item => [
            item.return_no,
            new Date(item.return_date).toLocaleDateString(),
            `"${item.customer_name}"`,
            item.original_invoice_no || '-',
            item.total_return_amount,
            item.refund_amount,
            item.refund_method,
            item.status
        ].join(','));
        const csvContent = [headers.join(','), ...csvRows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `customer_returns_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
            pending: 'outline',
            processed: 'secondary',
            completed: 'default',
            cancelled: 'destructive',
        };
        return <Badge variant={variants[status] || 'default'}>{t(status.charAt(0).toUpperCase() + status.slice(1))}</Badge>;
    };

    const getReturnTypeBadge = (type: string) => {
        const labels: Record<string, string> = {
            item: 'Item',
            printer: 'Printer',
            mixed: 'Mixed',
        };
        return <Badge variant="outline">{t(labels[type] || type)}</Badge>;
    };

    const safeReturns = {
        data: returns.data || [],
        links: returns.links || [],
        meta: returns.meta || {
            from: returns.from || 0,
            to: returns.to || 0,
            total: returns.total || 0,
            current_page: returns.current_page || 1,
            last_page: returns.last_page || 1,
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="min-h-screen bg-slate-50">
                <Head title={t('Customer Returns')} />

                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4 gap-3">
                            <div className="flex items-center space-x-3 min-w-0">
                                <button
                                    onClick={() => window.history.back()}
                                    className="shrink-0 rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                    title={t('Go Back')}
                                >
                                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                </button>
                                <div className="shrink-0 rounded-lg bg-white/20 p-2 shadow">
                                    <RotateCcw className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-lg sm:text-xl font-bold text-white truncate">
                                        {t('Customer Returns')}
                                    </h1>
                                    <p className="text-xs text-white/80 hidden sm:block">
                                        {t('Manage all customer returns and exchanges')}
                                    </p>
                                </div>
                            </div>
                            <Link
                                href="/customer-returns/create"
                                className="shrink-0 inline-flex items-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                            >
                                <Plus className="h-4 w-4 sm:mr-1.5" />
                                <span className="hidden sm:inline">{t('New Return')}</span>
                            </Link>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-4">
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue p-2 shadow-sm">
                                        <RotateCcw className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Total Returns')}</p>
                                        <p className="text-lg font-bold text-gray-900">{stats?.totalReturns ?? 0}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-emerald-500 p-2 shadow-sm">
                                        <CheckCircle2 className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Completed Returns')}</p>
                                        <p className="text-lg font-bold text-gray-900">
                                            {stats?.completedReturns ?? 0}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-grey p-2 shadow-sm">
                                        <DollarSign className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Total Return Amount')}</p>
                                        <p className="text-lg font-bold text-gray-900">
                                            {formatAmount(stats?.totalReturnAmount ?? 0)}
                                        </p>
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
                                            {t('Return History')}
                                        </h3>
                                        <p className="text-white/80 text-xs mt-0.5">
                                            {t('View and manage all customer returns')}
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleDownload}
                                        disabled={safeReturns.data.length === 0}
                                        className="inline-flex items-center justify-center rounded-lg bg-white/20 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 disabled:opacity-50 transition-colors"
                                    >
                                        <Download className="mr-1.5 h-4 w-4" />
                                        {t('Export CSV')}
                                    </button>
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
                                                    placeholder={t('Search returns...')}
                                                    value={data.search || ''}
                                                    onChange={(e) => setData('search', e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                />
                                            </div>
                                        </div>

                                        {/* Date Filters + type + per-page + clear */}
                                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                            <div className="flex-1 min-w-[130px]">
                                                <input
                                                    type="date"
                                                    value={data.date_from || ''}
                                                    onChange={(e) => setData('date_from', e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition text-gray-600"
                                                />
                                            </div>
                                            
                                            <div className="flex-1 min-w-[130px]">
                                                <input
                                                    type="date"
                                                    value={data.date_to || ''}
                                                    onChange={(e) => setData('date_to', e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition text-gray-600"
                                                />
                                            </div>

                                            <div className="flex-1 min-w-[120px]">
                                                <div className="relative">
                                                    <Tag className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                    <select
                                                        value={data.return_type || ''}
                                                        onChange={(e) => setData('return_type', e.target.value)}
                                                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                    >
                                                        <option value="">{t('All Types')}</option>
                                                        <option value="item">{t('Items')}</option>
                                                        <option value="printer">{t('Printers')}</option>
                                                        <option value="mixed">{t('Mixed')}</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="w-28">
                                                <select
                                                    value={itemsPerPage}
                                                    onChange={(e) => setItemsPerPage(e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-vismass-blue focus:ring-2 focus:ring-vismass-blue/20"
                                                >
                                                    <option value="15">15 / {t('Page')}</option>
                                                    <option value="25">25 / {t('Page')}</option>
                                                    <option value="50">50 / {t('Page')}</option>
                                                    <option value="100">100 / {t('Page')}</option>
                                                </select>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={handleClearFilters}
                                                className="inline-flex items-center bg-gray-200 text-gray-700 px-3 py-2 text-sm rounded-lg hover:bg-gray-300 transition-all duration-200 font-medium whitespace-nowrap"
                                            >
                                                <Filter className="mr-1 h-3.5 w-3.5" />
                                                {t('Clear')}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* List */}
                                {safeReturns.data.length > 0 ? (
                                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
                                                <tr>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Return Details')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Customer')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Type')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Amount')}
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
                                                {safeReturns.data.map((item) => (
                                                    <tr key={item.id} className="hover:bg-slate-50 transition-colors duration-150">
                                                        <td className="px-4 py-3">
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-medium text-gray-900">
                                                                    {item.return_no}
                                                                </span>
                                                                <span className="text-xs text-gray-500">
                                                                    {new Date(item.return_date).toLocaleDateString()}
                                                                </span>
                                                                {item.original_invoice_no && (
                                                                    <span className="text-xs text-gray-500 mt-0.5">
                                                                        Ref: {item.original_invoice_no}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <span className="text-sm text-gray-900">{item.customer_name}</span>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            {getReturnTypeBadge(item.return_type)}
                                                            {item.items_count !== undefined && (
                                                                <span className="ml-2 text-xs text-gray-500">
                                                                    ({item.items_count} items)
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-right">
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-sm font-medium text-gray-900">
                                                                    {formatAmount(item.total_return_amount)}
                                                                </span>
                                                                {item.refund_amount > 0 && (
                                                                    <span className="text-xs text-emerald-600 font-medium">
                                                                        Refund: {formatAmount(item.refund_amount)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            {getStatusBadge(item.status)}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                                                            <Link
                                                                href={`/customer-returns/${item.id}`}
                                                                className="inline-flex items-center text-vismass-blue hover:text-blue-800 transition-colors bg-blue-50 hover:bg-blue-100 p-1.5 rounded"
                                                                title={t('View details')}
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </Link>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <div className="mx-auto h-10 w-10 text-gray-400 mb-3">
                                            <RotateCcw className="h-10 w-10" />
                                        </div>
                                        <h3 className="text-xs font-medium text-gray-900 mb-1.5">{t('No returns found')}</h3>
                                        <p className="text-xs text-gray-500 mb-3">
                                            {t('Try adjusting your filters or create a new return.')}
                                        </p>
                                        <Link
                                            href="/customer-returns/create"
                                            className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded-lg text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                                        >
                                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                                            {t('New Return')}
                                        </Link>
                                    </div>
                                )}

                                {/* Pagination */}
                                {(safeReturns.links || []).length > 0 && (
                                    <Pagination links={safeReturns.links} meta={safeReturns.meta} />
                                )}
                            </div>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="mt-6 border-t border-sky-200 bg-gradient-to-r from-white to-sky-50">
                    <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
                        <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2">
                            <p className="text-xs text-gray-500">© VISMASS {t('Customer Returns')} • v1.0.0</p>
                        </div>
                    </div>
                </footer>
            </div>
        </AppLayout>
    );
}

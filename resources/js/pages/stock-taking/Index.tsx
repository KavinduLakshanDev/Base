import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    Plus,
    Eye,
    Download,
    ClipboardList,
    CheckCircle2,
    Clock,
    XCircle,
    Search,
    Filter,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Pagination, { PaginationLink, PaginationMeta } from '@/components/pagination';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Stock Taking', href: '/stock-takings' },
];

interface StockTakingItem {
    id: number;
    product_id: number;
    system_stock: number;
    actual_stock: number;
    variance: number;
    product?: {
        ItmNm: string;
        ItemCode: string;
    };
}

interface StockTaking {
    id: number;
    taking_number: string;
    taking_date: string;
    status: string;
    notes: string | null;
    section?: { name: string };
    recorder?: { name: string };
    items: StockTakingItem[];
    created_at: string;
}

interface Props {
    takings: {
        data: StockTaking[];
        links: PaginationLink[];
        meta: PaginationMeta;
        from?: number;
        to?: number;
        total?: number;
        current_page?: number;
        last_page?: number;
    };
    stats?: {
        total: number;
        draft: number;
        completed: number;
        cancelled: number;
    };
    filters?: {
        search?: string;
        status?: string;
        per_page?: string;
    };
}

const statusConfig: Record<string, { color: string; icon: React.ElementType; label: string }> = {
    draft: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Draft' },
    completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle2, label: 'Completed' },
    cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Cancelled' },
};

export default function StockTakingIndex({ takings, stats, filters = {} }: Props) {
    const [itemsPerPage, setItemsPerPage] = useState(filters.per_page || '10');
    const { data, setData, get } = useForm({
        search: filters.search || '',
        status: filters.status || '',
    });

    const initialRender = useRef(true);

    useEffect(() => {
        if (initialRender.current) {
            initialRender.current = false;
            return;
        }

        const timeoutId = setTimeout(() => {
            router.get(
                '/stock-takings',
                {
                    search: data.search,
                    status: data.status,
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
    }, [data.search, data.status, itemsPerPage]);

    const handleClearFilters = () => {
        setData({ search: '', status: '' });
        setItemsPerPage('10');
    };

    const safeTakings = {
        data: takings.data || [],
        links: takings.links || [],
        meta: takings.meta || {
            from: takings.from || 0,
            to: takings.to || 0,
            total: takings.total || 0,
            current_page: takings.current_page || 1,
            last_page: takings.last_page || 1,
        },
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="min-h-screen bg-slate-50">
                <Head title={t('Stock Taking')} />

                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4 gap-3">
                            <div className="flex items-center space-x-3 min-w-0">
                                <button
                                    onClick={() => window.history.back()}
                                    className="shrink-0 rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                    title="Go Back"
                                >
                                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                </button>
                                <div className="shrink-0 rounded-lg bg-white/20 p-2 shadow">
                                    <ClipboardList className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-lg sm:text-xl font-bold text-white truncate">
                                        {t('Stock Taking')}
                                    </h1>
                                    <p className="text-xs text-white/80 hidden sm:block">
                                        {t('Physical stock count records')}
                                    </p>
                                </div>
                            </div>
                            <Link
                                href="/stock-takings/create"
                                className="shrink-0 inline-flex items-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                            >
                                <Plus className="h-4 w-4 sm:mr-1.5" />
                                <span className="hidden sm:inline">{t('New Stock Taking')}</span>
                            </Link>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue p-2 shadow-sm">
                                        <ClipboardList className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Total Records')}</p>
                                        <p className="text-lg font-bold text-gray-900">{stats?.total ?? safeTakings.meta.total}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-yellow-500 p-2 shadow-sm">
                                        <Clock className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Draft')}</p>
                                        <p className="text-lg font-bold text-gray-900">{stats?.draft ?? 0}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-green-500 p-2 shadow-sm">
                                        <CheckCircle2 className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Completed')}</p>
                                        <p className="text-lg font-bold text-gray-900">{stats?.completed ?? 0}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-red-500 p-2 shadow-sm">
                                        <XCircle className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Cancelled')}</p>
                                        <p className="text-lg font-bold text-gray-900">{stats?.cancelled ?? 0}</p>
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
                                            {t('Stock Taking Records')}
                                        </h3>
                                        <p className="text-white/80 text-xs mt-0.5">
                                            {t('View and manage all stock taking records')}
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
                                                    placeholder={t('Search by taking number...')}
                                                    value={data.search || ''}
                                                    onChange={(e) => setData('search', e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                            <div className="flex-1 min-w-[130px]">
                                                <div className="relative">
                                                    <Filter className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                    <select
                                                        value={data.status || ''}
                                                        onChange={(e) => setData('status', e.target.value)}
                                                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                    >
                                                        <option value="">{t('All Status')}</option>
                                                        <option value="draft">{t('Draft')}</option>
                                                        <option value="completed">{t('Completed')}</option>
                                                        <option value="cancelled">{t('Cancelled')}</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="w-28">
                                                <select
                                                    value={itemsPerPage}
                                                    onChange={(e) => setItemsPerPage(e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-vismass-blue focus:ring-2 focus:ring-vismass-blue/20"
                                                >
                                                    <option value="10">10 / {t('Page')}</option>
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

                                {/* Stock Taking List */}
                                {safeTakings.data.length > 0 ? (
                                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
                                                <tr>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Taking Number')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Date')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Section')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Items')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Status')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Recorded By')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Actions')}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {safeTakings.data.map((taking) => {
                                                    const status = statusConfig[taking.status] || statusConfig.draft;
                                                    const StatusIcon = status.icon;
                                                    const itemCount = taking.items.filter(item => Number(item.system_stock) > 0).length;
                                                    return (
                                                        <tr
                                                            key={taking.id}
                                                            className="hover:bg-sky-50/50 transition-colors duration-150"
                                                        >
                                                            <td className="px-4 py-2.5">
                                                                <div className="text-xs font-medium text-gray-900 font-mono">
                                                                    {taking.taking_number}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-2.5">
                                                                <div className="text-xs text-gray-900">
                                                                    {new Date(taking.taking_date).toLocaleDateString('en-GB')}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-2.5">
                                                                <div className="text-xs text-gray-900">
                                                                    {taking.section?.name || '-'}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-2.5 text-center">
                                                                <div className="text-xs font-medium text-gray-900">
                                                                    {itemCount}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-2.5 whitespace-nowrap">
                                                                <span
                                                                    className={`px-2 py-0.5 text-xs font-medium rounded-full ${status.color}`}
                                                                >
                                                                    <StatusIcon className="h-3 w-3 inline mr-1" />
                                                                    {status.label}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-2.5">
                                                                <div className="text-xs text-gray-900">
                                                                    {taking.recorder?.name || '-'}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-2.5 whitespace-nowrap text-xs font-medium">
                                                                <Link
                                                                    href={`/stock-takings/${taking.id}`}
                                                                    className="inline-flex items-center text-sky-600 hover:text-sky-800"
                                                                >
                                                                    <Eye className="mr-1 h-3.5 w-3.5" />
                                                                    {t('View')}
                                                                </Link>
                                                                <a
                                                                    href={`/stock-takings/${taking.id}/download?type=full`}
                                                                    className="inline-flex items-center ml-3 text-red-600 hover:text-red-800"
                                                                    title={t('Download Full Report PDF')}
                                                                >
                                                                    <Download className="h-3.5 w-3.5 mr-1" />
                                                                    {t('Full PDF')}
                                                                </a>
                                                                <a
                                                                    href={`/stock-takings/${taking.id}/download-csv?type=full`}
                                                                    className="inline-flex items-center ml-2 text-green-600 hover:text-green-800"
                                                                    title={t('Download Full Report CSV')}
                                                                >
                                                                    <Download className="h-3.5 w-3.5 mr-1" />
                                                                    {t('CSV')}
                                                                </a>
                                                                <a
                                                                    href={`/stock-takings/${taking.id}/download?type=variance`}
                                                                    className="inline-flex items-center ml-3 text-red-600 hover:text-red-800"
                                                                    title={t('Download Variance Report PDF')}
                                                                >
                                                                    <Download className="h-3.5 w-3.5 mr-1" />
                                                                    {t('Variance PDF')}
                                                                </a>
                                                                <a
                                                                    href={`/stock-takings/${taking.id}/download-csv?type=variance`}
                                                                    className="inline-flex items-center ml-2 text-green-600 hover:text-green-800"
                                                                    title={t('Download Variance Report CSV')}
                                                                >
                                                                    <Download className="h-3.5 w-3.5 mr-1" />
                                                                    {t('CSV')}
                                                                </a>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <div className="mx-auto h-10 w-10 text-gray-400 mb-3">
                                            <ClipboardList className="h-10 w-10" />
                                        </div>
                                        <h3 className="text-xs font-medium text-gray-900 mb-1.5">{t('No stock taking records found')}</h3>
                                        <p className="text-xs text-gray-500 mb-3">
                                            {t('Create your first stock taking record to get started')}
                                        </p>
                                        <Link
                                            href="/stock-takings/create"
                                            className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded-lg text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                                        >
                                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                                            {t('New Stock Taking')}
                                        </Link>
                                    </div>
                                )}

                                {/* Pagination */}
                                {(safeTakings.links || []).length > 0 && (
                                    <Pagination links={safeTakings.links} meta={safeTakings.meta} />
                                )}
                            </div>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="mt-6 border-t border-sky-200 bg-gradient-to-r from-white to-sky-50">
                    <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
                        <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2">
                            <p className="text-xs text-gray-500">© VISMASS {t('Stock Taking')} • v1.0.0</p>
                        </div>
                    </div>
                </footer>
            </div>
        </AppLayout>
    );
}

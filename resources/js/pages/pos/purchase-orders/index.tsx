import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import React, { useEffect, useRef, useState } from 'react';
import { t } from '@/lib/i18n';
import {
    ArrowLeft,
    CheckCircle2,
    Clock,
    Eye,
    Filter,
    List,
    Package,
    Plus,
    RefreshCw,
    Search,
    ShoppingCart,
    XCircle,
    Edit,
    FileText,
    Download,
} from 'lucide-react';
import Pagination, { PaginationLink, PaginationMeta } from '@/components/pagination';

interface PurchaseOrder {
    id: number;
    purchase_order_no: string;
    date: string;
    supplier_name: string;
    branch_name: string;
    description: string;
    net_amount: number;
    status: string;
    details_count: number;
}

interface Props {
    purchaseOrders: {
        data: PurchaseOrder[];
        links: PaginationLink[];
        meta: PaginationMeta;
    };
    stats: {
        total: number;
        pending: number;
        approved: number;
        completed: number;
        cancelled: number;
    };
    filters: {
        search?: string;
        per_page?: string;
        status?: string;
    };
}

const breadcrumbs = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Purchase Orders', href: '#' },
];

export default function PurchaseOrderIndex({ purchaseOrders, stats, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || '');
    const [itemsPerPage, setItemsPerPage] = useState(filters.per_page || '10');
    const initialRender = useRef(true);

    useEffect(() => {
        if (initialRender.current) {
            initialRender.current = false;
            return;
        }
        const timeoutId = setTimeout(() => {
            router.get(
                '/pos/purchase-orders',
                { search, status, per_page: itemsPerPage, page: 1 },
                { preserveState: true, preserveScroll: true, replace: true }
            );
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [search, status, itemsPerPage]);

    const handleClearFilters = () => {
        setSearch('');
        setStatus('');
        setItemsPerPage('10');
    };

    const formatPrice = (price: number) => {
        return `Rs ${Number(price).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const statusBadge = (status: string) => {
        const styles: Record<string, string> = {
            Pending: 'bg-amber-100 text-amber-800 border border-amber-200',
            Approved: 'bg-blue-100 text-blue-800 border border-blue-200',
            Completed: 'bg-green-100 text-green-800 border border-green-200',
            Cancelled: 'bg-red-100 text-red-800 border border-red-200',
        };
        return (
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
                {status}
            </span>
        );
    };

    const safeData = {
        data: purchaseOrders?.data || [],
        links: purchaseOrders?.links || [],
        meta: purchaseOrders?.meta || { from: 0, to: 0, total: 0, current_page: 1, last_page: 1 },
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="min-h-screen bg-slate-50">
                <Head title="Purchase Orders" />

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
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </button>
                                <div className="shrink-0 rounded-lg bg-white/20 p-2 shadow">
                                    <ShoppingCart className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-lg sm:text-xl font-bold text-white truncate">
                                        {t('Purchase Orders')}
                                    </h1>
                                    <p className="text-xs text-white/80 hidden sm:block">
                                        {t('Manage your purchase orders')}
                                    </p>
                                </div>
                            </div>
                            <Link
                                href="/pos/purchase-orders/create"
                                className="shrink-0 inline-flex items-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                            >
                                <Plus className="h-4 w-4 sm:mr-1.5" />
                                <span className="hidden sm:inline">{t('New PO')}</span>
                            </Link>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-4">
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue p-2 shadow-sm">
                                        <Package className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Total POs')}</p>
                                        <p className="text-lg font-bold text-gray-900">{stats.total}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-amber-500 p-2 shadow-sm">
                                        <Clock className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Pending')}</p>
                                        <p className="text-lg font-bold text-amber-600">{stats.pending}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-blue-500 p-2 shadow-sm">
                                        <CheckCircle2 className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Approved')}</p>
                                        <p className="text-lg font-bold text-blue-600">{stats.approved}</p>
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
                                        <p className="text-lg font-bold text-green-600">{stats.completed}</p>
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
                                        <p className="text-lg font-bold text-red-600">{stats.cancelled}</p>
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
                                            {t('Purchase Orders')}
                                        </h3>
                                        <p className="text-white/80 text-xs mt-0.5">
                                            {t('View and manage all purchase orders')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4">
                                {/* Filters */}
                                <div className="bg-slate-50 p-3 rounded-lg mb-4 border border-slate-200">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="relative">
                                                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder={t('Search by PO number, supplier...')}
                                                    value={search}
                                                    onChange={(e) => setSearch(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                            <div className="flex-1 min-w-[130px]">
                                                <div className="relative">
                                                    <Filter className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                    <select
                                                        value={status}
                                                        onChange={(e) => setStatus(e.target.value)}
                                                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                    >
                                                        <option value="">{t('All Status')}</option>
                                                        <option value="Pending">{t('Pending')}</option>
                                                        <option value="Approved">{t('Approved')}</option>
                                                        <option value="Completed">{t('Completed')}</option>
                                                        <option value="Cancelled">{t('Cancelled')}</option>
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

                                {/* Table */}
                                {safeData.data.length > 0 ? (
                                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
                                                <tr>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('PO Number')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Date')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Supplier')}
                                                    </th>
                                                    {/* <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Branch')}
                                                    </th> */}
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Description')}
                                                    </th>
                                                    {/* <th className="px-4 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Amount')}
                                                    </th> */}
                                                    {/* <th className="px-4 py-2.5 text-center text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Status')}
                                                    </th> */}
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Actions')}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {safeData.data.map((po) => (
                                                    <tr key={po.id} className="hover:bg-sky-50/50 transition-colors duration-150">
                                                        <td className="px-4 py-2.5">
                                                            <div className="flex items-center">
                                                                <div className="h-8 w-8 shrink-0">
                                                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-100 to-blue-100">
                                                                        <FileText className="h-3.5 w-3.5 text-sky-600" />
                                                                    </div>
                                                                </div>
                                                                <div className="ml-2.5">
                                                                    <div className="text-xs font-medium text-gray-900">
                                                                        {po.purchase_order_no}
                                                                    </div>
                                                                    <div className="text-[10px] text-gray-500">
                                                                        {po.details_count} {t('items')}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5 text-xs text-gray-700">
                                                            {po.date}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-xs text-gray-900">
                                                            {po.supplier_name}
                                                        </td>
                                                        {/* <td className="px-4 py-2.5 text-xs text-gray-700">
                                                            {po.branch_name}
                                                        </td> */}
                                                        <td className="px-4 py-2.5 text-xs text-gray-500 max-w-[150px] truncate">
                                                            {po.description || '-'}
                                                        </td>
                                                        {/* <td className="px-4 py-2.5 text-right">
                                                            <div className="text-xs font-medium text-gray-900">
                                                                {formatPrice(po.net_amount)}
                                                            </div>
                                                        </td> */}
                                                        {/* <td className="px-4 py-2.5 text-center whitespace-nowrap">
                                                            {statusBadge(po.status)}
                                                        </td> */}
                                                        <td className="px-4 py-2.5 whitespace-nowrap text-xs font-medium">
                                                            <Link
                                                                href={`/pos/purchase-orders/${po.id}`}
                                                                className="inline-flex items-center text-sky-600 hover:text-sky-800"
                                                            >
                                                                <Eye className="mr-1 h-3.5 w-3.5" />
                                                                {t('View')}
                                                            </Link>
                                                            <Link
                                                                href={`/pos/purchase-orders/${po.id}/edit`}
                                                                className="inline-flex items-center p-1.5 rounded-md text-amber-600 hover:text-amber-800 hover:bg-amber-50 transition-colors ml-1"
                                                                title={t('Edit')}
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Link>
                                                            <a
                                                                href={`/pos/purchase-orders/${po.id}/download-pdf`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center p-1.5 rounded-md text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition-colors ml-1"
                                                                title={t('Download PDF')}
                                                            >
                                                                <Download className="h-4 w-4" />
                                                            </a>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <div className="mx-auto h-10 w-10 text-gray-400 mb-3">
                                            <ShoppingCart className="h-10 w-10" />
                                        </div>
                                        <h3 className="text-xs font-medium text-gray-900 mb-1.5">{t('No purchase orders found')}</h3>
                                        <p className="text-xs text-gray-500 mb-3">
                                            {t('Create your first purchase order to get started')}
                                        </p>
                                        <Link
                                            href="/pos/purchase-orders/create"
                                            className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded-lg text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                                        >
                                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                                            {t('New PO')}
                                        </Link>
                                    </div>
                                )}

                                {/* Pagination */}
                                {safeData.links.length > 0 && (
                                    <Pagination links={safeData.links} meta={safeData.meta} />
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </AppLayout>
    );
}

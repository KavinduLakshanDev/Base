import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { PackageX, Plus, AlertTriangle, CheckCircle2, XCircle, Trash2, Filter, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { t } from '@/lib/i18n';

interface SupplierReturn {
    id: number;
    return_type: string;
    item_name: string;
    item_code: string;
    supplier_name: string;
    supplier_invoice_no: string;
    quantity: number;
    return_value: number;
    reason: string;
    return_date: string;
    status: string;
    recorded_by: string;
    section_name: string;
}

interface Props {
    returns: {
        data: SupplierReturn[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
}

export default function SupplierReturnIndex({ returns }: Props) {
    const approvedCount = returns.data.filter(r => r.status === 'approved').length;
    const pendingCount = returns.data.filter(r => r.status === 'pending').length;
    const rejectedCount = returns.data.filter(r => r.status === 'rejected').length;

    const [statusFilter, setStatusFilter] = useState('all');

    const breadcrumbs = [
        {
            title: t('Dashboard'),
            href: '/dashboard',
        },
        {
            title: t('Supplier Returns'),
            href: '#',
        },
    ];

    const filteredReturns = statusFilter === 'all' 
        ? returns.data 
        : returns.data.filter(r => r.status === statusFilter);

    const handleDelete = (id: number) => {
        if (confirm(t('Are you sure you want to delete this return record?'))) {
            router.delete(`/supplier-returns/${id}`, {
                preserveScroll: true,
            });
        }
    };

    const getStatusBadge = (status: string) => {
        const badges = {
            approved: 'bg-green-100 text-green-800',
            pending: 'bg-yellow-100 text-yellow-800',
            rejected: 'bg-red-100 text-red-800',
        };
        return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800';
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Supplier Returns')} />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4">
                            <div className="flex min-w-0 items-center space-x-3">
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
                                    <PackageX className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="truncate text-lg sm:text-xl font-bold text-white">
                                        {t('Supplier Returns')}
                                    </h1>
                                    <p className="hidden sm:block text-xs text-white/80">
                                        {t('Manage returns to suppliers')}
                                    </p>
                                </div>
                            </div>
                            <Link href="/supplier-returns/create">
                                <Button className="shrink-0 bg-white text-vismass-blue hover:bg-slate-100 inline-flex items-center rounded-lg px-3 sm:px-4 py-2 text-sm font-medium shadow transition-all duration-200">
                                    <Plus className="h-4 w-4 sm:mr-1.5" />
                                    <span className="hidden sm:inline">{t('New Return')}</span>
                                </Button>
                            </Link>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-green-500 p-2 shadow-sm">
                                        <CheckCircle2 className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Approved')}</p>
                                        <p className="text-2xl font-bold text-gray-900">
                                            {approvedCount}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-yellow-500 p-2 shadow-sm">
                                        <AlertTriangle className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Pending')}</p>
                                        <p className="text-2xl font-bold text-gray-900">
                                            {pendingCount}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-red-500 p-2 shadow-sm">
                                        <XCircle className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Rejected')}</p>
                                        <p className="text-2xl font-bold text-gray-900">
                                            {rejectedCount}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Content Card */}
                        <div className="rounded-lg border border-slate-200 bg-white shadow overflow-hidden">
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 py-3">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                                    <div>
                                        <h3 className="text-base font-semibold text-white">
                                            {t('Supplier Returns List')}
                                        </h3>
                                        <p className="text-white/80 text-xs mt-0.5">
                                            {t('View and manage all supplier returns')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4">
                                {/* Filters */}
                                <div className="bg-slate-50 p-3 rounded-lg mb-4 border border-slate-200">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:space-x-2">
                                            <Filter className="h-4 w-4 text-gray-400" />
                                            <span className="text-sm font-medium text-slate-700">{t('Filter by Status')}:</span>
                                            <select
                                                value={statusFilter}
                                                onChange={(e) => setStatusFilter(e.target.value)}
                                                className="w-full sm:w-auto rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                            >
                                                <option value="all">{t('All Status')}</option>
                                                <option value="approved">{t('Approved')}</option>
                                                <option value="pending">{t('Pending')}</option>
                                                <option value="rejected">{t('Rejected')}</option>
                                            </select>
                                        </div>
                                        {statusFilter !== 'all' && (
                                            <button
                                                onClick={() => setStatusFilter('all')}
                                                className="inline-flex items-center bg-gray-200 text-gray-700 px-3 py-1.5 text-xs rounded-lg hover:bg-gray-300 transition-all duration-200 font-medium"
                                            >
                                                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                                                {t('Clear')}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Returns Table */}
                                {filteredReturns.length > 0 ? (
                                    <div className="space-y-3">
                                        {/* Mobile Cards */}
                                        <div className="space-y-3 md:hidden">
                                            {filteredReturns.map((ret) => (
                                                <div key={ret.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-semibold text-slate-900">{ret.item_name}</p>
                                                            <p className="text-xs text-slate-500">{ret.item_code}</p>
                                                        </div>
                                                        <span className={`shrink-0 px-2 py-0.5 text-xs font-medium rounded-full ${getStatusBadge(ret.status)}`}>
                                                            {t(ret.status.charAt(0).toUpperCase() + ret.status.slice(1))}
                                                        </span>
                                                    </div>

                                                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                                                        <div>
                                                            <p className="text-slate-500">{t('Date')}</p>
                                                            <p className="font-medium text-slate-900">{ret.return_date}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-slate-500">{t('Type')}</p>
                                                            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full capitalize ${
                                                                ret.return_type === 'printer'
                                                                    ? 'bg-purple-100 text-purple-800'
                                                                    : 'bg-blue-100 text-blue-800'
                                                            }`}>
                                                                {ret.return_type === 'printer' ? t('Printer') : t('Item')}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <p className="text-slate-500">{t('Supplier')}</p>
                                                            <p className="font-medium text-slate-900 break-words">{ret.supplier_name}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-slate-500">{t('Inv No')}</p>
                                                            <p className="font-medium text-slate-900 break-words">{ret.supplier_invoice_no || 'N/A'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-slate-500">{t('Quantity')}</p>
                                                            <p className="font-medium text-slate-900">{ret.quantity}</p>
                                                        </div>
                                                        <div className="col-span-2">
                                                            <p className="text-slate-500">{t('Value')}</p>
                                                            <p className="font-semibold text-vismass-blue">Rs. {Number(ret.return_value).toFixed(2)}</p>
                                                        </div>
                                                        <div className="col-span-2">
                                                            <p className="text-slate-500">{t('Reason')}</p>
                                                            <p className="text-slate-700 break-words">{ret.reason}</p>
                                                        </div>
                                                    </div>

                                                    <div className="mt-3 flex justify-end">
                                                        <button
                                                            onClick={() => handleDelete(ret.id)}
                                                            className="inline-flex items-center rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-800"
                                                        >
                                                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                                                            {t('Delete')}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Desktop Table */}
                                        <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200">
                                            <table className="min-w-[980px] divide-y divide-gray-200">
                                                <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
                                                    <tr>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                            {t('Date')}
                                                        </th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                            {t('Type')}
                                                        </th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                            {t('Item')}
                                                        </th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                            {t('Supplier')}
                                                        </th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                            {t('Inv No')}
                                                        </th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                            {t('Quantity')}
                                                        </th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                            {t('Value')}
                                                        </th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                            {t('Reason')}
                                                        </th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                            {t('Status')}
                                                        </th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                            {t('Actions')}
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {filteredReturns.map((ret) => (
                                                        <tr key={ret.id} className="hover:bg-sky-50/50 transition-colors duration-150">
                                                            <td className="px-4 py-2.5 whitespace-nowrap">
                                                                <div className="text-xs font-medium text-gray-900">{ret.return_date}</div>
                                                            </td>
                                                            <td className="px-4 py-2.5 whitespace-nowrap">
                                                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${
                                                                    ret.return_type === 'printer'
                                                                        ? 'bg-purple-100 text-purple-800'
                                                                        : 'bg-blue-100 text-blue-800'
                                                                }`}>
                                                                    {ret.return_type === 'printer' ? t('Printer') : t('Item')}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-2.5">
                                                                <div className="text-xs font-medium text-gray-900">{ret.item_name}</div>
                                                                <div className="text-xs text-gray-500 mt-0.5">{ret.item_code}</div>
                                                            </td>
                                                            <td className="px-4 py-2.5">
                                                                <div className="text-xs font-medium text-gray-900">{ret.supplier_name}</div>
                                                            </td>
                                                            <td className="px-4 py-2.5 whitespace-nowrap">
                                                                <div className="text-xs font-medium text-gray-900">{ret.supplier_invoice_no || 'N/A'}</div>
                                                            </td>
                                                            <td className="px-4 py-2.5 whitespace-nowrap">
                                                                <span className="text-xs font-medium text-gray-900">{ret.quantity}</span>
                                                            </td>
                                                            <td className="px-4 py-2.5 whitespace-nowrap">
                                                                <span className="text-xs font-medium text-gray-900">Rs. {Number(ret.return_value).toFixed(2)}</span>
                                                            </td>
                                                            <td className="px-4 py-2.5 max-w-[220px]">
                                                                <div className="text-xs text-gray-600 truncate" title={ret.reason}>{ret.reason}</div>
                                                            </td>
                                                            <td className="px-4 py-2.5 whitespace-nowrap">
                                                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusBadge(ret.status)}`}>
                                                                    {t(ret.status.charAt(0).toUpperCase() + ret.status.slice(1))}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-2.5 whitespace-nowrap text-xs font-medium">
                                                                <button
                                                                    onClick={() => handleDelete(ret.id)}
                                                                    className="inline-flex items-center text-red-600 hover:text-red-800"
                                                                >
                                                                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                                                                    {t('Delete')}
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <div className="mx-auto h-10 w-10 text-gray-400 mb-3">
                                            <PackageX className="h-10 w-10" />
                                        </div>
                                        <h3 className="text-xs font-medium text-gray-900 mb-1.5">{t('No returns found')}</h3>
                                        <p className="text-xs text-gray-500 mb-3">
                                            {t('Get started by creating a new supplier return.')}
                                        </p>
                                        <Link
                                            href="/supplier-returns/create"
                                            className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded-lg text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                                        >
                                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                                            {t('Create Return')}
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="mt-6 border-t border-sky-200 bg-gradient-to-r from-white to-sky-50">
                    <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
                        <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2">
                            <p className="text-xs text-gray-500">© VISMASS {t('Supplier Returns Management')} • v1.0.0</p>
                        </div>
                    </div>
                </footer>
            </div>
        </AppLayout>
    );
}

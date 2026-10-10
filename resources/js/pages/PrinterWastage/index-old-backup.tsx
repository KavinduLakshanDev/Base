import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import {
    Plus,
    Eye,
    Trash2,
    Printer,
} from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: t('Dashboard'),
        href: '/dashboard',
    },
    {
        title: t('Printer Wastage Management'),
        href: '#',
    },
];

interface PrinterWastageItem {
    id: number;
    printer_name: string;
    serial_number: string;
    batch_no: string;
    brand?: string;
    model?: string;
    reason: string;
    recorded_by: string;
    recorded_at: string;
    status: string;
    warranty?: string;
}

interface Props {
    wastages: {
        data: PrinterWastageItem[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    flash?: {
        success?: string;
        error?: string;
    };
}

export default function PrinterWastageIndex({ wastages, flash }: Props) {
    const [searchTerm, setSearchTerm] = useState('');

    const handleDelete = (id: number) => {
        if (confirm(t('Are you sure you want to delete this printer wastage record?'))) {
            router.delete(`/printer-wastages/${id}`, {
                preserveScroll: true,
            });
        }
    };

    const getStatusBadge = (status: string) => {
        const statusClasses = {
            pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            approved: 'bg-green-100 text-green-800 border-green-200',
            rejected: 'bg-red-100 text-red-800 border-red-200',
        };

        return (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusClasses[status as keyof typeof statusClasses] || 'bg-slate-100 text-slate-800 border-slate-200'}`}>
                {t(status.charAt(0).toUpperCase() + status.slice(1))}
            </span>
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Printer Wastage Management')} />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-purple-600 to-purple-800 shadow-lg">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-3">
                            <div className="flex items-center space-x-3">
                                <div className="rounded-lg bg-white/20 p-2 shadow-lg">
                                    <Printer className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-lg font-bold text-white">
                                        {t('Printer Wastage Management')}
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        {t('Track and manage printer wastage records')}
                                    </p>
                                </div>
                            </div>
                            <Link href="/printer-wastages/create">
                                <Button className="bg-white text-purple-600 hover:bg-white/90 shadow-lg">
                                    <Plus className="mr-2 h-4 w-4" />
                                    {t('Record Printer Wastage')}
                                </Button>
                            </Link>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    {/* Success/Error Messages */}
                    {flash?.success && (
                        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4">
                            <div className="flex">
                                <div className="shrink-0">
                                    <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-green-800">
                                        {flash.success}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {flash?.error && (
                        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
                            <div className="flex">
                                <div className="shrink-0">
                                    <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-red-800">
                                        {flash.error}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Search and Filter */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 mb-4">
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <input
                                    type="text"
                                    placeholder={t('Search by printer name, serial number, or reason...')}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="block w-full rounded-lg border-slate-200 focus:border-purple-600 focus:ring-purple-600/20 px-3 py-2 text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                            {t('Printer')}
                                        </th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                            {t('Serial Number')}
                                        </th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                            {t('Batch')}
                                        </th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                            {t('Brand/Model')}
                                        </th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                            {t('Reason')}
                                        </th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                            {t('Recorded By')}
                                        </th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                            {t('Date')}
                                        </th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                            {t('Status')}
                                        </th>
                                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                            {t('Actions')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {wastages.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="px-3 py-8 text-center">
                                                <Printer className="mx-auto h-10 w-10 text-slate-400" />
                                                <p className="mt-3 text-base font-medium text-slate-900">
                                                    {t('No printer wastage records found')}
                                                </p>
                                                <p className="mt-2 text-sm text-slate-600">
                                                    {t('Start by recording a new printer wastage entry')}
                                                </p>
                                            </td>
                                        </tr>
                                    ) : (
                                        wastages.data.map((wastage) => (
                                            <tr key={wastage.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-3 py-2">
                                                    <div className="text-sm font-medium text-slate-900">
                                                        {wastage.printer_name}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <div className="text-sm text-slate-600 font-mono">
                                                        {wastage.serial_number}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <div className="text-sm text-slate-600">
                                                        {wastage.batch_no}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <div className="text-sm text-slate-600">
                                                        {wastage.brand && wastage.model
                                                            ? `${wastage.brand} ${wastage.model}`
                                                            : wastage.brand || wastage.model || '-'}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <div className="text-sm text-slate-600 max-w-xs truncate">
                                                        {wastage.reason}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <div className="text-sm text-slate-600">
                                                        {wastage.recorded_by}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <div className="text-sm text-slate-600">
                                                        {new Date(wastage.recorded_at).toLocaleDateString()}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2">
                                                    {getStatusBadge(wastage.status)}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => handleDelete(wastage.id)}
                                                            className="rounded-lg p-2 text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                                                            title={t('Delete')}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {wastages.last_page > 1 && (
                            <div className="bg-slate-50 px-3 py-2 border-t border-slate-200">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-slate-600">
                                        {t('Showing')} {wastages.data.length} {t('of')} {wastages.total} {t('records')}
                                    </div>
                                    <div className="flex gap-2">
                                        {/* Add pagination buttons here */}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </AppLayout>
    );
}

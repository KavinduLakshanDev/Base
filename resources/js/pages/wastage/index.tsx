import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Plus,
    Trash2,
    Printer,
    Search,
    Eye,
    Edit,
} from 'lucide-react';
import { useState } from 'react';
import { usePermission } from '@/hooks/usePermission';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: t('Dashboard'),
        href: '/dashboard',
    },
    {
        title: t('Wastage Management'),
        href: '#',
    },
];

interface WastageItem {
    id: number;
    product_name: string;
    category: string;
    quantity: number;
    unit: string;
    cost_price: number;
    batch_no?: string;
    serial_number?: string;
    warranty?: string;
    reason: string;
    notes?: string;
    section_name: string;
    wastage_date: string;
    recorded_by: string;
    recorded_at: string;
}

interface Props {
    wastages: {
        data: WastageItem[];
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

export default function WastageIndex({ wastages, flash }: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const { hasPermission } = usePermission();

    const handleDelete = (id: number) => {
        if (confirm(t('Are you sure you want to delete this wastage record?'))) {
            router.delete(`/wastages/${id}`, {
                preserveScroll: true,
            });
        }
    };

    const handlePrint = () => {
        window.print();
    };

    // Calculate totals
    const totalQuantity = wastages.data.reduce((sum, item) => sum + Number(item.quantity), 0);
    const totalValue = wastages.data.reduce((sum, item) => sum + (Number(item.cost_price) * Number(item.quantity)), 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Wastage Management')} />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow no-print">
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
                                <div className="shrink-0 rounded-lg bg-white/20 p-2 shadow border border-white/30">
                                    <Trash2 className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-lg sm:text-xl font-bold text-white truncate">
                                        {t('Wastage Management')}
                                    </h1>
                                    <p className="text-xs text-white/80 hidden sm:block">
                                        {t('Track and manage product wastage records')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button
                                    onClick={handlePrint}
                                    className="shrink-0 inline-flex items-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200 no-print"
                                >
                                    <Printer className="h-4 w-4 sm:mr-1.5" />
                                    <span className="hidden sm:inline">{t('Print')}</span>
                                </Button>
                                {hasPermission('wastages.create') && (
                                    <Link href="/wastages/create" className="no-print">
                                        <Button className="shrink-0 inline-flex items-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200">
                                            <Plus className="h-4 w-4 sm:mr-1.5" />
                                            <span className="hidden sm:inline">{t('Record Wastage')}</span>
                                        </Button>
                                    </Link>
                                )}
                            </div>
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
                                        <Trash2 className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Total Records')}</p>
                                        <p className="text-lg font-bold text-gray-900">{wastages.total}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-red-600 p-2 shadow-sm">
                                        <Plus className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Total Quantity')}</p>
                                        <p className="text-lg font-bold text-gray-900">{totalQuantity.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-orange-500 p-2 shadow-sm">
                                        <Printer className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Total Value')}</p>
                                        <p className="text-lg font-bold text-gray-900">{totalValue.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue/70 p-2 shadow-sm">
                                        <span className="h-4 w-4 block text-white text-center">D</span>
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('On This Date')}</p>
                                        <p className="text-lg font-bold text-gray-900">{new Date().toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div id="printable-wastage" className="rounded-lg border border-slate-200 bg-white shadow overflow-hidden">
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 py-3">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                                    <div>
                                        <h3 className="text-base font-semibold text-white">{t('Wastage History')}</h3>
                                        <p className="text-white/80 text-xs mt-0.5">{t('Track and manage product wastage records')}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4">
                                {flash?.success && (
                                    <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 no-print">
                                        <p className="text-sm font-medium text-green-800">{flash.success}</p>
                                    </div>
                                )}

                                {flash?.error && (
                                    <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 no-print">
                                        <p className="text-sm font-medium text-red-800">{flash.error}</p>
                                    </div>
                                )}

                                {/* Print Header */}
                                <div className="print-header" style={{ display: 'none' }}>
                                    <div className="text-center mb-4">
                                        <div className="text-3xl font-black" style={{ marginBottom: '5px' }}>
                                            <span style={{ color: '#00aeef' }}>VIS</span>
                                            <span style={{ color: '#737578' }}>MASS</span>
                                        </div>
                                        <div className="text-sm text-slate-600">Wastage Report</div>
                                        <div className="text-xs text-slate-500">
                                            Generated on: {new Date().toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-3 rounded-lg mb-4 border border-slate-200 no-print">
                                    <div className="max-w-sm">
                                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('Search')}</label>
                                        <div className="relative">
                                            <Input
                                                type="text"
                                                placeholder={t('Search by product name, category, or reason...')}
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-full text-sm py-2 pl-9"
                                            />
                                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                        </div>
                                    </div>
                                </div>

                                <div className="overflow-x-auto rounded-lg border border-gray-200">
                                    <table className="min-w-[900px] w-full divide-y divide-gray-200">
                                        <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
                                            <tr>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Product')}</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Batch / Serial')}</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Section')}</th>
                                                <th className="px-4 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Quantity')}</th>
                                                <th className="px-4 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Total Cost')}</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Reason')}</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Date')}</th>
                                                {(hasPermission('wastages.view') || hasPermission('wastages.edit') || hasPermission('wastages.delete')) && (
                                                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-sky-900 uppercase tracking-wider no-print">{t('Action')}</th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {wastages.data.length === 0 ? (
                                                <tr>
                                                    <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                                                        <div className="flex flex-col items-center justify-center text-gray-400">
                                                            <Trash2 className="h-8 w-8 mb-2 opacity-30" />
                                                            <p className="text-sm text-gray-500">{t('No wastage records found')}</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                wastages.data.map((wastage) => (
                                                    <tr key={wastage.id} className="hover:bg-sky-50/50 transition-colors duration-150">
                                                        <td className="px-4 py-2.5">
                                                            <div className="text-sm font-medium text-gray-900">{wastage.product_name}</div>
                                                            <div className="text-xs text-gray-500 mt-0.5">{wastage.category}</div>
                                                        </td>
                                                        <td className="px-4 py-2.5 text-sm text-gray-900">
                                                            {wastage.batch_no && (
                                                                <div className="font-mono text-xs">{wastage.batch_no}</div>
                                                            )}
                                                            {wastage.serial_number && (
                                                                <div className="text-xs text-gray-500">SN: {wastage.serial_number}</div>
                                                            )}
                                                            {!wastage.batch_no && !wastage.serial_number && <span className="text-xs text-gray-400">-</span>}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-sm text-gray-900">
                                                            {wastage.section_name}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right text-sm font-medium text-gray-900">
                                                            {Number(wastage.quantity).toFixed(2)}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right text-sm font-medium text-gray-900">
                                                            {(wastage.quantity * wastage.cost_price).toFixed(2)}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-sm text-gray-900">
                                                            {wastage.reason.charAt(0).toUpperCase() + wastage.reason.slice(1)}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-sm text-gray-900">
                                                            {new Date(wastage.recorded_at).toLocaleString('en-GB', {
                                                                year: 'numeric',
                                                                month: '2-digit',
                                                                day: '2-digit',
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                            })}
                                                        </td>
                                                        {(hasPermission('wastages.view') || hasPermission('wastages.edit') || hasPermission('wastages.delete')) && (
                                                            <td className="px-4 py-2.5 text-center whitespace-nowrap no-print">
                                                                <div className="flex items-center justify-center gap-3">
                                                                    {hasPermission('wastages.view') && (
                                                                        <Link
                                                                            href={`/wastages/${wastage.id}`}
                                                                            className="text-sky-600 hover:text-sky-800"
                                                                            title={t('View')}
                                                                        >
                                                                            <Eye className="h-4 w-4" />
                                                                        </Link>
                                                                    )}
                                                                    {hasPermission('wastages.edit') && (
                                                                        <Link
                                                                            href={`/wastages/${wastage.id}/edit`}
                                                                            className="text-sky-600 hover:text-sky-800"
                                                                            title={t('Edit')}
                                                                        >
                                                                            <Edit className="h-4 w-4" />
                                                                        </Link>
                                                                    )}
                                                                    {/* {hasPermission('wastages.delete') && (
                                                                        <button
                                                                            onClick={() => handleDelete(wastage.id)}
                                                                            className="text-red-500 hover:text-red-700"
                                                                            title={t('Delete')}
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </button>
                                                                    )} */}
                                                                </div>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="text-center mt-8 text-slate-600">
                                    <p className="text-sm">{t('Track wastage • Keep inventory clean')}</p>
                                </div>

                                {/* Print Footer */}
                                <div className="print-footer" style={{ display: 'none' }}>
                                    <span>Developed by Unitec Software Solution</span>
                                    <span>
                                        Printed on: {new Date().toLocaleString('en-GB', {
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            <style>{`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 10mm;
                        margin-top: 0;
                    }
                    
                    @page :first {
                        margin-top: 10mm;
                    }
                    
                    body * {
                        visibility: hidden;
                    }
                    
                    #printable-wastage,
                    #printable-wastage * {
                        visibility: visible;
                    }
                    
                    #printable-wastage {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        background: white;
                    }
                    
                    .no-print {
                        display: none !important;
                    }
                    
                    .print-header {
                        margin-bottom: 20px;
                        border-bottom: 2px solid #000;
                        padding-bottom: 10px;
                        display: block !important;
                    }
                    
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 9px;
                        page-break-inside: auto;
                        color: #000 !important;
                    }
                    
                    tr {
                        page-break-inside: avoid;
                        page-break-after: auto;
                    }
                    
                    thead {
                        display: table-header-group;
                    }
                    
                    th, td {
                        border: 1px solid #000;
                        padding: 3px;
                        color: #000 !important;
                    }
                    
                    th {
                        background-color: #e5e7eb !important;
                        font-weight: bold;
                        text-align: left;
                    }
                    
                    td:nth-child(4),
                    td:nth-child(5) {
                        text-align: right;
                    }
                    
                    .print-footer {
                        margin-top: 20px;
                        padding-top: 10px;
                        border-top: 1px solid #000;
                        font-size: 10px;
                        display: flex !important;
                        justify-content: space-between;
                        color: #000 !important;
                    }
                }
            `}</style>
        </AppLayout>
    );
}

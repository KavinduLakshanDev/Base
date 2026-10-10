import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Plus,
    Search,
    Printer,
    CheckCircle2,
    XCircle,
    Clock,
    LayoutGrid,
    ChevronRight,
    FileText,
    Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { usePermission } from '@/hooks/usePermission';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: t('Dashboard'),
        href: '/dashboard',
    },
    {
        title: t('Stock Adjustments'),
        href: '#',
    },
];

interface StockAdjustment {
    id: number;
    adjustment_number: string;
    section: {
        name: string;
    } | null;
    vehicle: {
        name: string;
        registration_no: string;
    } | null;
    adjustment_date: string;
    created_at: string;
    recorder: {
        name: string;
        email: string;
    } | null;
    status: 'pending' | 'approved' | 'rejected';
    items_count?: number;
    items?: any[];
}

interface Props {
    adjustments: {
        data: StockAdjustment[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    auth: {
        user: any;
    };
    flash?: {
        success?: string;
        error?: string;
    };
}

export default function StockAdjustmentIndex({ adjustments, auth, flash }: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const { hasPermission } = usePermission();

    const canApprove = auth?.user?.role?.level === 'company_admin' || auth?.user?.user_type === 'company_admin';

    const handlePrint = () => {
        window.print();
    };

    const filteredAdjustments = adjustments.data.filter(adj => {
        const matchesSearch = adj.adjustment_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (adj.section && adj.section.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (adj.vehicle && adj.vehicle.name.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = statusFilter === 'all' || adj.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getNetImpact = (items: any[]) => {
        if (!items || !items.length) return 0;
        const additions = items.filter(i => i.adjustment_type === 'addition').reduce((sum, item) => sum + (parseFloat(item.quantity || '0') * parseFloat(item.cost_price || '0')), 0);
        const subtractions = items.filter(i => i.adjustment_type === 'subtraction').reduce((sum, item) => sum + (parseFloat(item.quantity || '0') * parseFloat(item.cost_price || '0')), 0);
        return additions - subtractions;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Stock Adjustments')} />

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
                                    <LayoutGrid className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-lg sm:text-xl font-bold text-white truncate">
                                        {t('Stock Adjustments')}
                                    </h1>
                                    <p className="text-xs text-white/80 hidden sm:block">
                                        {t('Manage and view stock adjustment batches')}
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
                                {hasPermission('stock_adjustments.create') && (
                                    <Link href="/stock-adjustments/create" className="no-print">
                                        <Button className="shrink-0 inline-flex items-center rounded-lg bg-vismass-blue text-white px-3 sm:px-4 py-2 text-sm font-medium shadow hover:bg-vismass-blue/90 transition-all duration-200 border border-white/20">
                                            <Plus className="h-4 w-4 sm:mr-1.5" />
                                            <span className="hidden sm:inline">{t('New Adjustment')}</span>
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
                        {flash?.success && (
                            <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 no-print shadow-sm">
                                <div className="flex">
                                    <CheckCircle2 className="h-5 w-5 text-green-400 mr-3" />
                                    <p className="text-sm font-medium text-green-800">{flash.success}</p>
                                </div>
                            </div>
                        )}

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                    <div className="relative max-w-md w-full no-print">
                                        <Input
                                            type="text"
                                            placeholder={t('Search by adjustment number or section...')}
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-10 h-10 bg-white border-slate-200 focus:border-vismass-blue transition-all"
                                        />
                                        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap no-print">
                                        <span className="text-xs font-bold text-slate-500">{t('Filter')}:</span>
                                        {['all', 'pending', 'approved', 'rejected'].map((status) => (
                                            <button
                                                key={status}
                                                onClick={() => setStatusFilter(status)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                    statusFilter === status
                                                        ? status === 'pending' ? 'bg-amber-500 text-white' :
                                                          status === 'approved' ? 'bg-green-500 text-white' :
                                                          status === 'rejected' ? 'bg-red-500 text-white' :
                                                          'bg-vismass-blue text-white'
                                                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                                }`}
                                            >
                                                {status === 'all' ? t('All') : status.charAt(0).toUpperCase() + status.slice(1)}
                                                {status === 'pending' && (
                                                    <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-600/20 text-amber-700 text-[10px]">
                                                        {adjustments.data.filter(a => a.status === 'pending').length}
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto rounded-b-2xl">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
                                        <tr>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Adj Number')}</th>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Date')}</th>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Target')}</th>
                                            <th className="px-4 py-2.5 text-center text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Items')}</th>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Recorded By')}</th>
                                            <th className="px-4 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Net Impact')}</th>
                                            <th className="px-4 py-2.5 text-center text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Status')}</th>
                                            <th className="px-4 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider no-print">{t('Actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredAdjustments.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                                                    <div className="flex flex-col items-center justify-center text-gray-400">
                                                        <Search className="h-8 w-8 mb-2 opacity-30" />
                                                        <p className="text-sm text-gray-500">{t('No adjustments found')}</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredAdjustments.map((adj) => (
                                                <tr key={adj.id} className="hover:bg-sky-50/50 transition-colors duration-150 group">
                                                    <td className="px-4 py-2.5 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <div className="p-2 bg-sky-100 rounded-lg mr-3 text-sky-600 transition-colors group-hover:bg-sky-200">
                                                                <FileText className="w-4 h-4" />
                                                            </div>
                                                            <span className="text-sm font-medium text-gray-900">{adj.adjustment_number}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2.5 whitespace-nowrap">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm text-gray-900">
                                                                {adj.adjustment_date ? format(new Date(adj.adjustment_date), 'yyyy-MM-dd') : '-'}
                                                            </span>
                                                            <span className="text-xs text-gray-500 mt-0.5">
                                                                {adj.created_at ? format(new Date(adj.created_at), 'HH:mm:ss') : ''}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-sm text-gray-900">
                                                        {adj.section ? adj.section.name : (adj.vehicle ? `${adj.vehicle.name} (${adj.vehicle.registration_no})` : 'Unknown')}
                                                    </td>
                                                    <td className="px-4 py-2.5 whitespace-nowrap text-center">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                                            {adj.items?.length || 0}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2.5 whitespace-nowrap">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm text-gray-900">{adj.recorder?.name || t('System')}</span>
                                                            {adj.recorder?.email && (
                                                                <span className="text-xs text-sky-600 mt-0.5">{adj.recorder.email}</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2.5 whitespace-nowrap text-right">
                                                        {(() => {
                                                            const net = getNetImpact(adj.items || []);
                                                            return (
                                                                <span className={`text-sm font-bold ${net > 0 ? 'text-green-600' : net < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                                                    {net > 0 ? '+' : ''}Rs. {net.toFixed(2)}
                                                                </span>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className="px-4 py-2.5 whitespace-nowrap text-center">
                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                                            adj.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                            adj.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                            'bg-amber-100 text-amber-700'
                                                        }`}>
                                                            {adj.status === 'approved' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                                                            {adj.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                                                            {adj.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                                                            {adj.status.toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2.5 whitespace-nowrap text-right no-print">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Link
                                                                href={`/stock-adjustments/${adj.id}`}
                                                                className="inline-flex items-center text-sky-600 hover:text-sky-800 font-medium text-xs"
                                                                title={t('View')}
                                                            >
                                                                <Eye className="mr-1 h-3.5 w-3.5" />
                                                                {t('View')}
                                                            </Link>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </AppLayout>
    );
}

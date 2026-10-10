import AppSidebarLayout from '@/layouts/app/app-sidebar-layout';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import {
    ArrowLeft,
    ClipboardList,
    CheckCircle2,
    Clock,
    XCircle,
    Printer,
} from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Stock Taking', href: '/stock-takings' },
    { title: 'Details', href: '#' },
];

interface StockTakingItem {
    id: number;
    product_id: number;
    batch_no: string | null;
    system_stock: number;
    actual_stock: number;
    variance: number;
    cost_price: number;
    notes: string | null;
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
    taking: StockTaking;
}

const statusConfig: Record<string, { color: string; icon: React.ElementType; label: string }> = {
    draft: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Draft' },
    completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle2, label: 'Completed' },
    cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Cancelled' },
};

export default function StockTakingShow({ taking }: Props) {
    const status = statusConfig[taking.status] || statusConfig.draft;
    const StatusIcon = status.icon;

    const filteredItems = taking.items.filter(item => Number(item.system_stock) > 0);

    const totalSystemStock = filteredItems.reduce((sum, item) => sum + Number(item.system_stock), 0);
    const totalActualStock = filteredItems.reduce((sum, item) => sum + Number(item.actual_stock), 0);
    const totalVariance = filteredItems.reduce((sum, item) => sum + Number(item.variance), 0);
    const totalCostValue = filteredItems.reduce(
        (sum, item) => sum + Number(item.actual_stock) * Number(item.cost_price),
        0
    );

    const handlePrint = (type: 'full' | 'variance') => {
        window.open(`/stock-takings/${taking.id}/print?type=${type}`, '_blank');
    };

    return (
        <AppSidebarLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Stock Taking Details')} />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow no-print">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4">
                            <div className="flex items-center space-x-3">
                                <Link
                                    href="/stock-takings"
                                    className="rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </Link>
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <ClipboardList className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">
                                        {t('Stock Taking Details')}
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        {taking.taking_number}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => handlePrint('full')}
                                    className="inline-flex items-center rounded-lg bg-white px-3 py-2 text-xs font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                                >
                                    <Printer className="mr-1.5 h-3.5 w-3.5" />
                                    {t('Print Full')}
                                </Button>
                                <Button
                                    onClick={() => window.location.href = `/stock-takings/${taking.id}/download-csv?type=full`}
                                    className="inline-flex items-center rounded-lg bg-white px-3 py-2 text-xs font-medium text-green-700 border border-green-200 shadow-sm hover:bg-green-50 transition-all duration-200"
                                >
                                    <Printer className="mr-1.5 h-3.5 w-3.5" />
                                    {t('Full CSV')}
                                </Button>
                                <Button
                                    onClick={() => handlePrint('variance')}
                                    className="inline-flex items-center rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 border border-amber-200 shadow-sm hover:bg-amber-100 transition-all duration-200"
                                >
                                    <Printer className="mr-1.5 h-3.5 w-3.5" />
                                    {t('Print Variance')}
                                </Button>
                                <Button
                                    onClick={() => window.location.href = `/stock-takings/${taking.id}/download-csv?type=variance`}
                                    className="inline-flex items-center rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-700 border border-green-300 shadow-sm hover:bg-green-100 transition-all duration-200"
                                >
                                    <Printer className="mr-1.5 h-3.5 w-3.5" />
                                    {t('Variance CSV')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-7xl py-8 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0 space-y-6">
                        {/* Info Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
                                <p className="text-xs text-slate-500 uppercase tracking-wide">{t('Taking Number')}</p>
                                <p className="text-lg font-bold text-slate-800 font-mono">{taking.taking_number}</p>
                            </div>
                            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
                                <p className="text-xs text-slate-500 uppercase tracking-wide">{t('Date')}</p>
                                <p className="text-lg font-bold text-slate-800">
                                    {new Date(taking.taking_date).toLocaleDateString('en-GB')}
                                </p>
                            </div>
                            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
                                <p className="text-xs text-slate-500 uppercase tracking-wide">{t('Section')}</p>
                                <p className="text-lg font-bold text-slate-800">{taking.section?.name || '-'}</p>
                            </div>
                            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
                                <p className="text-xs text-slate-500 uppercase tracking-wide">{t('Status')}</p>
                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}>
                                    <StatusIcon className="h-3 w-3" />
                                    {status.label}
                                </span>
                            </div>
                        </div>

                        {taking.notes && (
                            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
                                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{t('Notes')}</p>
                                <p className="text-slate-700">{taking.notes}</p>
                            </div>
                        )}

                        {/* Items Table */}
                        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                                <h3 className="text-lg font-semibold text-slate-800">
                                    {t('Stock Count Items')} ({filteredItems.length})
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-100 border-b border-slate-200">
                                            <th className="px-4 py-3 text-left font-semibold text-slate-700 w-8">#</th>
                                            <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('Item Code')}</th>
                                            <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('Item Name')}</th>
                                            <th className="px-4 py-3 text-right font-semibold text-slate-700">{t('System Stock')}</th>
                                            <th className="px-4 py-3 text-right font-semibold text-slate-700">{t('Actual Stock')}</th>
                                            <th className="px-4 py-3 text-right font-semibold text-slate-700">{t('Variance')}</th>
                                            {/* <th className="px-4 py-3 text-right font-semibold text-slate-700">{t('Cost Price')}</th>
                                            <th className="px-4 py-3 text-right font-semibold text-slate-700">{t('Value')}</th> */}
                                            {/* <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('Notes')}</th> */}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredItems.map((item, idx) => {
                                            const variance = Number(item.variance);
                                            const varianceColor =
                                                variance > 0
                                                    ? 'text-green-600'
                                                    : variance < 0
                                                      ? 'text-red-600'
                                                      : 'text-slate-600';
                                            return (
                                                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                                                    <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                                                    <td className="px-4 py-3 font-mono text-xs">{item.product?.ItemCode || '-'}</td>
                                                    <td className="px-4 py-3">{item.product?.ItmNm || '-'}</td>
                                                    <td className="px-4 py-3 text-right font-medium">{Number(item.system_stock).toFixed(2)}</td>
                                                    <td className="px-4 py-3 text-right font-bold">{Number(item.actual_stock).toFixed(2)}</td>
                                                    <td className={`px-4 py-3 text-right font-bold ${varianceColor}`}>
                                                        {variance > 0 ? '+' : ''}{variance.toFixed(2)}
                                                    </td>
                                                    {/* <td className="px-4 py-3 text-right text-slate-600">{Number(item.cost_price).toFixed(2)}</td>
                                                    <td className="px-4 py-3 text-right text-slate-600">
                                                        {(Number(item.actual_stock) * Number(item.cost_price)).toFixed(2)}
                                                    </td> */}
                                                    {/* <td className="px-4 py-3 text-slate-600 text-xs">{item.notes || '-'}</td> */}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    {/* <tfoot>
                                        <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                                            <td colSpan={3} className="px-4 py-3 text-right text-slate-700">{t('Total')}</td>
                                            <td className="px-4 py-3 text-right">{totalSystemStock.toFixed(2)}</td>
                                            <td className="px-4 py-3 text-right">{totalActualStock.toFixed(2)}</td>
                                            <td className={`px-4 py-3 text-right ${totalVariance > 0 ? 'text-green-600' : totalVariance < 0 ? 'text-red-600' : 'text-slate-700'}`}>
                                                {totalVariance > 0 ? '+' : ''}{totalVariance.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-slate-600"></td>
                                            <td className="px-4 py-3 text-right text-slate-700">{totalCostValue.toFixed(2)}</td>
                                            <td></td>
                                        </tr>
                                    </tfoot> */}
                                </table>
                            </div>
                        </div>

                        <div className="text-xs text-slate-500">
                            {t('Recorded by')}: {taking.recorder?.name || '-'} | {t('Created at')}: {new Date(taking.created_at).toLocaleString('en-GB')}
                        </div>
                    </div>
                </main>
            </div>
        </AppSidebarLayout>
    );
}

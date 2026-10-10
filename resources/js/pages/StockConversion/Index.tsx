import { useState, useEffect, useRef } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { Input } from '@/components/ui/input';
import Pagination, { PaginationLink, PaginationMeta } from '@/components/pagination';
import { RefreshCw, Plus, Calendar, Package, ArrowRightLeft, Search, TrendingUp, Eye } from 'lucide-react';
import { t } from '@/lib/i18n';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem } from '@/types';
import { Badge } from '@/components/ui/badge';

interface StockConversion {
    id: number;
    conversion_number: string;
    section_code: string;
    item_id: number; // needed for reverse link
    item_code: string;
    item_name: string;
    input_quantity: number;
    output_quantity: number;
    conversion_factor: number;
    reverse: boolean;
    from_unit_name: string | null;
    to_unit_name: string | null;
    to_item_id?: number | null;
    to_item_code?: string | null;
    to_item_name?: string | null;
    conversion_date: string;
    notes: string | null;
    section: { name: string; section_code: string } | null;
}

interface ConversionsData extends PaginationMeta {
    data: StockConversion[];
    links: PaginationLink[];
}

interface IndexProps {
    conversions: ConversionsData;
    filters: { search?: string };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: t('Dashboard'), href: '/dashboard' },
    { title: t('Stock Conversions'), href: '#' },
];

export default function Index({ conversions, filters }: IndexProps) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const isFirstRender = useRef(true);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        const id = setTimeout(() => {
            router.get('/stock-conversions', { search: searchTerm }, { preserveState: true, replace: true });
        }, 300);
        return () => clearTimeout(id);
    }, [searchTerm]);

    const totalConversions = conversions.data.length;
    const totalInputQty = conversions.data.reduce((sum, c) => sum + Number(c.input_quantity), 0);
    const totalOutputQty = conversions.data.reduce((sum, c) => sum + Number(c.output_quantity), 0);
    const recentCount = conversions.data.filter((c) => {
        const d = new Date(c.conversion_date);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return d >= weekAgo;
    }).length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Stock Conversions" />

            <div className="min-h-screen bg-slate-50">
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
                                    <RefreshCw className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-lg sm:text-xl font-bold text-white truncate">{t('Stock Conversions')}</h1>
                                    <p className="text-xs text-white/80 hidden sm:block">
                                        {t('Convert received bundles or packs into individual units')}
                                    </p>
                                </div>
                            </div>
                            <Link
                                href="/stock-conversions/create"
                                className="shrink-0 inline-flex items-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                            >
                                <Plus className="h-4 w-4 sm:mr-1.5" />
                                <span className="hidden sm:inline">{t('New Conversion')}</span>
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
                                        <ArrowRightLeft className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Total Conversions')}</p>
                                        <p className="text-lg font-bold text-gray-900">{totalConversions}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-orange-500 p-2 shadow-sm">
                                        <Package className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Total Input Qty')}</p>
                                        <p className="text-lg font-bold text-gray-900">{totalInputQty.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-green-600 p-2 shadow-sm">
                                        <TrendingUp className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Total Output Qty')}</p>
                                        <p className="text-lg font-bold text-gray-900">{totalOutputQty.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue/60 p-2 shadow-sm">
                                        <Calendar className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Recent (7 days)')}</p>
                                        <p className="text-lg font-bold text-gray-900">{recentCount}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Content Card */}
                        <div className="rounded-lg border border-slate-200 bg-white shadow overflow-hidden">
                            {/* Card Header */}
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 py-3">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                                    <div>
                                        <h3 className="text-base font-semibold text-white">{t('Conversion History')}</h3>
                                        <p className="text-white/80 text-xs mt-0.5">{t('Browse and manage stock conversions')}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4">
                                {/* Search */}
                                <div className="bg-slate-50 p-3 rounded-lg mb-4 border border-slate-200">
                                    <div className="max-w-sm">
                                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('Search')}</label>
                                        <div className="relative">
                                            <Input
                                                type="text"
                                                placeholder={t('Search by item or conversion number…')}
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-full text-sm py-2 pl-9"
                                            />
                                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                        </div>
                                    </div>
                                </div>

                                {/* Table */}
                                <div className="overflow-x-auto rounded-lg border border-gray-200">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
                                            <tr>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Conversion #')}</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Date')}</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Section')}</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Item')}</th>
                                                <th className="px-4 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Input')}</th>
                                                <th className="px-4 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Output')}</th>
                                                <th className="px-4 py-2.5 text-center text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Factor')}</th>
                                                <th className="px-4 py-2.5 text-center text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Actions')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {conversions.data.length === 0 ? (
                                                <tr>
                                                    <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                                                        <div className="flex flex-col items-center justify-center text-gray-400">
                                                            <ArrowRightLeft className="h-8 w-8 mb-2 opacity-30" />
                                                            <p className="text-sm text-gray-500">{t('No conversions found.')}</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                conversions.data.map((conv) => (
                                                    <tr key={conv.id} className="hover:bg-sky-50/50 transition-colors duration-150">
                                                        <td className="px-4 py-2.5">
                                                            <div className="font-mono text-sm font-semibold text-gray-900">
                                                                {conv.conversion_number}
                                                                {conv.reverse && (
                                                                    <Badge variant="outline" className="ml-2 text-xs">
                                                                        {t('Reverse')}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <div className="flex items-center gap-1 text-sm text-gray-600">
                                                                {conv.conversion_date ? conv.conversion_date.split('T')[0] : '—'}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5 text-sm text-gray-900">
                                                            {conv.section?.name ?? conv.section_code}
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-100 to-blue-100 shrink-0">
                                                                    <Package className="h-3.5 w-3.5 text-sky-600" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-medium text-gray-900">{conv.item_name}</p>
                                                                    <p className="text-xs text-gray-500">{conv.item_code}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right">
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                                                {Number(conv.input_quantity).toFixed(2)} {conv.from_unit_name ?? ''}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right">
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                                {Number(conv.output_quantity).toFixed(2)} {conv.to_unit_name ?? ''}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2.5 text-center">
                                                            <div className="flex items-center justify-center gap-1 text-sm font-medium text-gray-900">
                                                                <ArrowRightLeft className="h-3 w-3 text-gray-400" />
                                                                ×{Number(conv.reverse ? 1 / conv.conversion_factor : conv.conversion_factor).toFixed(2)}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5 text-center whitespace-nowrap">
                                                            <div className="flex items-center justify-center gap-3 text-sky-600">
                                                                <Link
                                                                    href={`/stock-conversions/${conv.id}`}
                                                                    className="hover:text-sky-800 font-medium flex items-center text-xs"
                                                                >
                                                                    <Eye className="mr-1 h-3.5 w-3.5" />
                                                                    {t('View')}
                                                                </Link>
                                                                <span className="text-slate-300">|</span>
                                                                <Link
                                                                    href={`/stock-conversions/create?item_id=${conv.to_item_id || conv.item_id}&to_item_id=${conv.item_id}&section_code=${conv.section_code}&input_quantity=${conv.output_quantity}&reverse=1`}
                                                                    className="hover:text-sky-800 font-medium flex items-center text-xs"
                                                                >
                                                                    <RefreshCw className="mr-1 h-3.5 w-3.5" />
                                                                    {t('Reverse')}
                                                                </Link>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="mt-4">
                                    <Pagination links={conversions.links} meta={conversions} />
                                </div>
                            </div>
                        </div>

                    </div>
                </main>
                {/* Footer */}
                <footer className="mt-6 border-t border-sky-200 bg-gradient-to-r from-white to-sky-50">
                    <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
                        <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2">
                            <p className="text-xs text-gray-500">© VISMASS {t('Stock Conversions')} • v1.0.0</p>
                        </div>
                    </div>
                </footer>
            </div>
        </AppLayout>
    );
}

import ConfirmationModal from '@/components/ui/confirmation-modal';
import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    Edit,
    Plus,
    Search,
    AlertCircle,
    TrendingUp,
    Package,
    Trash2,
    CheckCircle2,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import Pagination, { PaginationLink, PaginationMeta } from '@/components/pagination';

interface Section {
    id: number;
    section_code: string;
    name: string;
    is_main_stock: boolean;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: t('Dashboard'),
        href: '/dashboard',
    },
    {
        title: t('Reorder Levels'),
        href: '#',
    },
];

interface ReorderLevel {
    id: number;
    item_code: string;
    item_name: string;
    section_code: string;
    section_name: string;
    reorder_level: number;
    current_stock: number;
    needs_reorder: boolean;
}

interface ItemNeedingReorder {
    item_code: string;
    item_name: string;
    section_name: string;
    current_stock: number;
    reorder_level: number;
    shortage: number;
}

interface Props {
    reorderLevels: {
        data: ReorderLevel[];
        links: PaginationLink[];
        meta: PaginationMeta;
        from?: number;
        to?: number;
        total?: number;
        current_page?: number;
        last_page?: number;
    };
    itemsNeedingReorder: ItemNeedingReorder[];
    sections: Section[];
    filters: {
        search?: string;
        section?: string;
    };
    flash?: {
        success?: string;
        error?: string;
    };
}

export default function ReorderLevelsIndex({
    reorderLevels,
    itemsNeedingReorder,
    sections,
    filters,
    flash
}: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [selectedSection, setSelectedSection] = useState(filters.section || '');
    const [deleteModal, setDeleteModal] = useState<{
        show: boolean;
        reorderLevel: ReorderLevel | null;
    }>({
        show: false,
        reorderLevel: null,
    });

    const [historyModal, setHistoryModal] = useState<{
        show: boolean;
        reorderLevel: ReorderLevel | null;
        logs: Array<any>;
    }>({
        show: false,
        reorderLevel: null,
        logs: [],
    });

    const { auth } = usePage().props as any;
    const company = auth?.user?.company;

    const totalReorderLevels = reorderLevels.meta?.total ?? 0;
    const filteredResults = reorderLevels.data.length;
    const lowStockCount = itemsNeedingReorder.length;

    const handleSearch = () => {
        router.get(route('pos.reorder-levels.index'), {
            search: search || undefined,
            section: selectedSection || undefined,
        });
    };

    const handleDelete = (reorderLevel: ReorderLevel) => {
        setDeleteModal({
            show: true,
            reorderLevel,
        });
    };

    const confirmDelete = () => {
        if (deleteModal.reorderLevel) {
            router.delete(route('pos.reorder-levels.destroy', deleteModal.reorderLevel.id), {
                onSuccess: () => {
                    setDeleteModal({ show: false, reorderLevel: null });
                    toast.success(t('Reorder level deleted successfully'));
                },
            });
        }
    };

    const showHistory = async (level: ReorderLevel) => {
        try {
            const response = await fetch(`/pos/reorder-levels/${level.id}/logs`, {
                headers: { Accept: 'application/json' },
                credentials: 'include',
            });
            if (response.ok) {
                const data = await response.json();
                setHistoryModal({ show: true, reorderLevel: level, logs: data.logs || [] });
            }
        } catch (err) {
            console.error('failed to load history', err);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Reorder Levels')} />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow no-print">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-wrap items-center justify-between gap-3 py-4">
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
                                    <TrendingUp className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-lg sm:text-xl font-bold text-white truncate">
                                        {t('Reorder Levels')}
                                    </h1>
                                    <p className="text-xs text-white/80 hidden sm:block truncate">
                                        {t('Manage reorder levels for products')}
                                    </p>
                                </div>
                            </div>
                            <Link
                                href={route('pos.reorder-levels.create')}
                                className="shrink-0 inline-flex items-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                            >
                                <Plus className="h-4 w-4 sm:mr-1.5" />
                                <span className="hidden sm:inline">{t('Add Reorder Level')}</span>
                            </Link>
                        </div>
                    </div>
                </header>
                
                {/* Company Banner */}
                {company && (
                    <div className="bg-white border-b border-slate-200">
                        <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
                            <div className="flex items-center text-xs font-medium text-slate-500">
                                <Package className="w-3 h-3 mr-1.5 text-vismass-blue" />
                                <span>{t('Currently viewing data for')}: <span className="text-slate-900 font-bold">{company.name}</span></span>
                                {auth?.user?.company_code && (
                                    <span className="ml-2 px-1.5 py-0.5 bg-slate-100 rounded text-slate-400 font-mono">{auth.user.company_code}</span>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-8 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4">
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-sky-500 p-2 shadow-sm">
                                        <TrendingUp className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Total Reorder Levels')}</p>
                                        <p className="text-lg font-bold text-gray-900">{totalReorderLevels}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-rose-500 p-2 shadow-sm">
                                        <AlertCircle className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Low Stock Items')}</p>
                                        <p className="text-lg font-bold text-gray-900">{lowStockCount}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue p-2 shadow-sm">
                                        <Search className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Filtered Results')}</p>
                                        <p className="text-lg font-bold text-gray-900">{filteredResults}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Low Stock Alerts - Dashboard Style */}
                        <div className="rounded-lg border border-slate-200 bg-white shadow-lg mb-6 overflow-hidden">
                            <div className="bg-slate-50/50 border-b px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                                        <AlertCircle className="h-5 w-5 text-rose-500" />
                                        {t('Low Stock Alerts')}
                                    </h2>
                                    {itemsNeedingReorder.length > 0 && (
                                        <span className="inline-flex items-center justify-center px-3 py-1 text-xs font-medium bg-rose-100 text-rose-800 rounded-full">
                                            {itemsNeedingReorder.length}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="px-6 py-6">
                                <div className="space-y-3 max-h-[300px] overflow-auto">
                                    {itemsNeedingReorder.length > 0 ? (
                                        itemsNeedingReorder.map((item) => (
                                            <div
                                                key={`${item.item_code}-${item.section_name}`}
                                                className="flex items-start justify-between p-4 rounded-lg bg-rose-50 border border-rose-100 hover:bg-rose-100 transition-colors"
                                            >
                                                <div className="space-y-1 flex-1 min-w-0">
                                                    <p className="text-sm font-semibold leading-none text-slate-900 truncate">{item.item_name}</p>
                                                    <p className="text-xs text-slate-500 font-mono">{item.item_code}</p>
                                                    <p className="text-xs text-slate-500">{item.section_name}</p>
                                                </div>
                                                <div className="text-right ml-4">
                                                    <div className="text-lg font-bold text-rose-600">{item.current_stock}</div>
                                                    <div className="text-xs text-slate-500">Min: {item.reorder_level}</div>
                                                    <div className="text-xs text-rose-600 font-semibold mt-1">Short: {item.shortage}</div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-12">
                                            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                                            <p className="text-sm font-medium text-slate-600">{t('All items well stocked')}</p>
                                            <p className="text-xs text-slate-500 mt-1">{t('No items require reordering')}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Search & Filter Card */}
                        <div className="rounded-lg border border-slate-200 bg-white shadow overflow-hidden mb-4">
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 py-3">
                                <h2 className="text-base font-semibold text-white">
                                    {t('Search & Filter')}
                                </h2>
                            </div>

                            <div className="p-4 bg-slate-50/50 border-b border-slate-100">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('Search')}</label>
                                        <div className="relative">
                                            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <input
                                                type="text"
                                                value={search}
                                                onChange={(e) => setSearch(e.target.value)}
                                                placeholder={t('Search by item name or code...')}
                                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition bg-white"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('Section')}</label>
                                        <select
                                            value={selectedSection}
                                            onChange={(e) => setSelectedSection(e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition bg-white"
                                        >
                                            <option value="">{t('All Sections')}</option>
                                            {sections.map((section) => (
                                                <option key={section.section_code} value={section.section_code}>
                                                    {section.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex items-end">
                                        <button
                                            onClick={handleSearch}
                                            className="bg-gradient-to-r from-sky-600 to-blue-600 text-white px-4 py-2 text-sm rounded-lg hover:from-sky-700 hover:to-blue-700 transition-all duration-200 font-medium inline-flex items-center w-full justify-center md:w-auto"
                                        >
                                            <Search className="mr-1.5 h-3.5 w-3.5" />
                                            {t('Search')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Reorder Levels Table Card */}
                        <div className="rounded-lg border border-slate-200 bg-white shadow overflow-hidden">
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 py-3">
                                <h2 className="text-base font-semibold text-white">
                                    {t('Reorder Levels')}
                                </h2>
                                <p className="text-white/80 text-xs mt-0.5">
                                    {t('Reorder configuration for all products')}
                                </p>
                            </div>

                            <div className="p-4">
                                {reorderLevels.data.length > 0 ? (
                                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                                        <table className="min-w-[720px] w-full divide-y divide-gray-200">
                                            <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
                                                <tr>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Item')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Section')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider text-center">
                                                        {t('Reorder Level')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider text-center">
                                                        {t('Current Stock')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Status')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Actions')}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 bg-white">
                                                {reorderLevels.data.map((level) => (
                                                    <tr key={level.id} className="hover:bg-sky-50/50 transition-colors duration-150">
                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            <div className="text-xs font-medium text-gray-900">{level.item_name}</div>
                                                            <div className="text-[10px] text-gray-500 font-mono mt-0.5">{level.item_code}</div>
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-700">
                                                            {level.section_name}
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap text-xs font-medium text-gray-900 text-center">
                                                            {Math.round(level.reorder_level)}
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap text-xs font-medium text-gray-900 text-center">
                                                            {level.current_stock}
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            {level.needs_reorder ? (
                                                                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 border border-red-200">
                                                                    <AlertCircle className="h-2.5 w-2.5" />
                                                                    {t('Needs Reorder')}
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200">
                                                                    <TrendingUp className="h-2.5 w-2.5" />
                                                                    {t('In Stock')}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap text-right">
                                                            <div className="flex items-center justify-end gap-2 text-xs">
                                                                <div className="flex items-center space-x-2">
                                                                <Link
                                                                    href={route('pos.reorder-levels.edit', level.id)}
                                                                    className="text-sky-600 hover:text-sky-800 transition-colors"
                                                                    title={t('Edit')}
                                                                >
                                                                    <Edit className="h-3.5 w-3.5" />
                                                                </Link>
                                                                <button
                                                                    onClick={() => showHistory(level)}
                                                                    className="text-gray-600 hover:text-gray-800 transition-colors"
                                                                    title={t('History')}
                                                                >
                                                                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                    </svg>
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(level)}
                                                                    className="text-red-600 hover:text-red-800 transition-colors"
                                                                    title={t('Delete')}
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </button>
                                                            </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="px-6 py-12 text-center">
                                        <Package className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                                        <h3 className="text-sm font-medium text-gray-900 mb-1">{t('No reorder levels found')}</h3>
                                        <p className="text-xs text-gray-500 mb-6">
                                            {t('Get started by creating your first reorder level configuration.')}
                                        </p>
                                        <Link
                                            href={route('pos.reorder-levels.create')}
                                            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 shadow-sm transition-all"
                                        >
                                            <Plus className="h-4 w-4" />
                                            {t('Add Reorder Level')}
                                        </Link>
                                    </div>
                                )}

                                {/* Pagination */}
                                {reorderLevels.data.length > 0 && (
                                    <div className="mt-4">
                                        <Pagination links={reorderLevels.links} meta={reorderLevels.meta} />
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
                            <p className="text-xs text-gray-500">© VISMASS {t('Reorder Levels Management')} • v1.0.0</p>
                        </div>
                    </div>
                </footer>
            </div>

            {/* History Modal */}
            {historyModal.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                    <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-lg">
                        <h2 className="text-lg font-semibold mb-4">{t('Change History')}</h2>
                        <div className="max-h-64 overflow-auto text-sm space-y-2">
                            {historyModal.logs.length > 0 ? (
                                historyModal.logs.map((log, idx) => (
                                    <div key={idx} className="border-b border-gray-200 pb-2">
                                        <div>
                                            <strong>{log.action.toUpperCase()}</strong> &ndash; {log.old_level ?? '-'} → {log.new_level ?? '-'}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {log.user?.name || t('System')} @ {new Date(log.created_at).toLocaleString()}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500">{t('No history available')}</p>
                            )}
                        </div>
                        <div className="mt-4 text-right">
                            <button
                                className="px-4 py-2 bg-slate-200 rounded hover:bg-slate-300"
                                onClick={() => setHistoryModal({ show: false, reorderLevel: null, logs: [] })}
                            >
                                {t('Close')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={deleteModal.show}
                onClose={() => setDeleteModal({ show: false, reorderLevel: null })}
                onConfirm={confirmDelete}
                title={t('Delete Reorder Level')}
                message={`${t('Are you sure you want to delete the reorder level for')} ${deleteModal.reorderLevel?.item_name}? ${t('This action cannot be undone.')}`}
                confirmText={t('Delete')}
                cancelText={t('Cancel')}
            />
        </AppLayout>
    );
}
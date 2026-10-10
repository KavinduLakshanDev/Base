import { useState, useEffect, useRef } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { ArrowRightLeft, Plus, Truck, Calendar, Package, TrendingUp, Download, Eye, Search, Filter } from 'lucide-react';
import { t } from '@/lib/i18n';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem } from '@/types';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Pagination from '@/components/pagination';

declare function route(name: string, params?: any): string;

interface StockTransfer {
    id: number;
    transfer_number?: string;
    from_section_code: string;
    to_section_code: string;
    item_id: number;
    quantity: number;
    cost_price: number;
    transfer_date: string;
    notes: string;
    company_code: string;
    brand?: string;
    model?: string;
    serial_number?: string;
    batch_no?: string;
    warranty?: string;
    fromSection: {
        name: string;
        section_code: string;
    } | null;
    toSection: {
        name: string;
        section_code: string;
    } | null;
    item: {
        ItemCode: string;
        ItmNm: string;
    };
}

interface IndexProps {
    stockTransfers: {
        data: StockTransfer[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from?: number;
        to?: number;
        links: any[];
    };
    filters?: {
        search?: string;
        per_page?: string;
        from_date?: string;
        to_date?: string;
    };
}

export default function Index({ stockTransfers, filters = {} }: IndexProps) {
    const [selectedTransfer, setSelectedTransfer] = useState<any>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [itemsPerPage, setItemsPerPage] = useState(filters.per_page || '10');
    const { data, setData } = useForm({
        search: filters.search || '',
        from_date: filters.from_date || '',
        to_date: filters.to_date || '',
    });

    const initialRender = useRef(true);

    useEffect(() => {
        if (initialRender.current) {
            initialRender.current = false;
            return;
        }

        const timeoutId = setTimeout(() => {
            router.get(
                '/printer-transfers',
                {
                    search: data.search,
                    from_date: data.from_date,
                    to_date: data.to_date,
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
    }, [data.search, data.from_date, data.to_date, itemsPerPage]);

    const handleClearFilters = () => {
        setData({ search: '', from_date: '', to_date: '' });
        setItemsPerPage('10');
    };

    // Show all transfers in history, not just invalid item_id=0.
    const transfers = stockTransfers.data;

    // Group transfers by transfer_number
    const groupedTransfers = transfers.reduce((acc, transfer) => {
        const key = transfer.transfer_number || `transfer-${transfer.id}`;
        if (!acc[key]) {
            acc[key] = {
                transfer_number: transfer.transfer_number,
                transfer_date: transfer.transfer_date,
                fromSection: transfer.fromSection,
                toSection: transfer.toSection,
                from_section_code: transfer.from_section_code,
                to_section_code: transfer.to_section_code,
                notes: transfer.notes,
                items: [],
                totalQuantity: 0,
                totalValue: 0,
            };
        }
        acc[key].items.push(transfer);
        acc[key].totalQuantity += Number(transfer.quantity) || 0;
        acc[key].totalValue += (Number(transfer.quantity) || 0) * (Number(transfer.cost_price) || 0);
        return acc;
    }, {} as Record<string, {
        transfer_number?: string;
        transfer_date: string;
        fromSection: any;
        toSection: any;
        from_section_code: string;
        to_section_code: string;
        notes: string;
        items: StockTransfer[];
        totalQuantity: number;
        totalValue: number;
    }>);

    const transferGroups = Object.values(groupedTransfers).sort((a, b) => {
        // Extract the numeric part from transfer numbers like "PRI-2026-00003"
        const aNum = parseInt((a.transfer_number || '0').split('-').pop() || '0', 10);
        const bNum = parseInt((b.transfer_number || '0').split('-').pop() || '0', 10);
        return bNum - aNum; // Sort in descending order (newest first)
    });

    const totalTransfers = transferGroups.length;
    const totalQuantity = transferGroups.reduce((sum, group) => sum + group.totalQuantity, 0);
    const totalValue = transferGroups.reduce((sum, group) => sum + group.totalValue, 0);

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('Dashboard'),
            href: '/dashboard',
        },
        {
            title: t('Printer Transfers'),
            href: '#',
        },
    ];

    const handleDownloadPdf = async (transferGroup: any) => {
        try {
            // Get all transfer IDs from the selected group
            const transferIds = transferGroup.items.map((item: any) => item.id);
            const ids = transferIds.join(',');

            const response = await fetch(`/printer-transfers/download-pdf-batch?ids=${ids}`, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to download PDF');
            }

            // Create a blob and trigger download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `printer-transfer-${transferGroup.transfer_number || 'batch'}-${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Error downloading PDF:', error);
            alert(t('Failed to download PDF'));
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Printer Transfers')} />
            
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
                                    <Truck className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-lg sm:text-xl font-bold text-white truncate">
                                        {t('Printer Transfers')}
                                    </h1>
                                    <p className="text-xs text-white/80 hidden sm:block">
                                        {t('Manage printer transfers between sections')}
                                    </p>
                                </div>
                            </div>
                            <Link
                                href="/printer-transfers/create"
                                className="shrink-0 inline-flex items-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                            >
                                <Plus className="h-4 w-4 sm:mr-1.5" />
                                <span className="hidden sm:inline">{t('New Printer Transfer')}</span>
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
                                        <p className="text-xs font-medium text-gray-600">{t('Total Transfers')}</p>
                                        <p className="text-lg font-bold text-gray-900">{totalTransfers}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-green-500 p-2 shadow-sm">
                                        <Package className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Total Quantity')}</p>
                                        <p className="text-lg font-bold text-gray-900">{totalQuantity.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-purple-500 p-2 shadow-sm">
                                        <TrendingUp className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Total Value')}</p>
                                        <p className="text-lg font-bold text-gray-900">Rs. {totalValue.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-orange-500 p-2 shadow-sm">
                                        <Calendar className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Recent Transfers')}</p>
                                        <p className="text-lg font-bold text-gray-900">
                                            {transferGroups.filter(g => {
                                                const transferDate = new Date(g.transfer_date);
                                                const weekAgo = new Date();
                                                weekAgo.setDate(weekAgo.getDate() - 7);
                                                return transferDate >= weekAgo;
                                            }).length}
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
                                            {t('Printer Transfer History')}
                                        </h3>
                                        <p className="text-white/80 text-xs mt-0.5">
                                            {t('Browse and manage printer transfers')}
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
                                                    placeholder={t('Search by Transfer No...')}
                                                    value={data.search || ''}
                                                    onChange={(e) => setData('search', e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                />
                                            </div>
                                        </div>

                                        {/* Date Filters */}
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="date"
                                                value={data.from_date || ''}
                                                onChange={(e) => setData('from_date', e.target.value)}
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                title={t('From Date')}
                                            />
                                            <span className="text-gray-400">-</span>
                                            <input
                                                type="date"
                                                value={data.to_date || ''}
                                                onChange={(e) => setData('to_date', e.target.value)}
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                title={t('To Date')}
                                            />
                                        </div>

                                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
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

                                {/* Transfer List */}
                                <div className="overflow-x-auto rounded-lg border border-gray-200">
                                    <table className="min-w-[900px] w-full divide-y divide-gray-200">
                                        <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
                                            <tr>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Transfer No')}</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('From Section')}</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('To Section')}</th>  
                                                <th className="px-4 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Total Value')}</th>
                                                <th className="px-4 py-2.5 text-center text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Action')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {transferGroups.map((group, index) => (
                                                <tr
                                                    key={group.transfer_number || group.items[0]?.id}
                                                    className="hover:bg-sky-50/50 transition-colors duration-150"
                                                >
                                                    <td className="px-4 py-2.5">
                                                        <div className="text-sm font-medium text-gray-900 block">
                                                            {((stockTransfers.current_page - 1) * stockTransfers.per_page) + index + 1}. {group.transfer_number || `TRF-${group.items[0]?.id}`}
                                                        </div>
                                                        <div className="text-xs text-gray-500 mt-0.5">
                                                            {new Date(group.transfer_date).toLocaleDateString()}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm text-gray-900">{group.fromSection?.name || group.from_section_code}</span>
                                                            <span className="text-xs text-gray-500 mt-0.5">{group.from_section_code}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm text-gray-900">{group.toSection?.name || group.to_section_code}</span>
                                                            <span className="text-xs text-gray-500 mt-0.5">{group.to_section_code}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium text-gray-900 font-mono block">
                                                                Rs. {group.totalValue.toFixed(2)}
                                                            </span>
                                                            <span className="text-xs text-gray-500 mt-0.5 block">
                                                                {group.items.length} item{group.items.length > 1 ? 's' : ''}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-center whitespace-nowrap">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedTransfer(group);
                                                                    setIsViewModalOpen(true);
                                                                }}
                                                                className="inline-flex items-center text-sky-600 hover:text-sky-800 font-medium text-xs"
                                                                title="View Details"
                                                            >
                                                                <Eye className="mr-1 h-3.5 w-3.5" />
                                                                {t('View')}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {transferGroups.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-4 py-12 text-center">
                                                        <div className="flex flex-col items-center justify-center text-gray-400">
                                                            <ArrowRightLeft className="h-8 w-8 mb-2 opacity-30" />
                                                            <p className="text-sm text-gray-500">{t('No transfers found')}</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                {stockTransfers.data.length > 0 && (
                                    <Pagination
                                        links={stockTransfers.links}
                                        meta={{
                                            current_page: stockTransfers.current_page,
                                            from: stockTransfers.from || 1,
                                            last_page: stockTransfers.last_page,
                                            to: stockTransfers.to || stockTransfers.total,
                                            total: stockTransfers.total,
                                            per_page: stockTransfers.per_page,
                                        }}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="mt-6 border-t border-sky-200 bg-gradient-to-r from-white to-sky-50">
                    <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
                        <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2">
                            <p className="text-xs text-gray-500">© VISMASS {t('Printer Transfer Management')} • v1.0.0</p>
                        </div>
                    </div>
                </footer>
            </div>

            <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t('Transfer Details')} - #{selectedTransfer?.transfer_number || 'N/A'}</DialogTitle>
                        <DialogDescription>
                            {selectedTransfer && (
                                <span>{new Date(selectedTransfer.transfer_date).toLocaleDateString()} • {selectedTransfer.items.length} item{selectedTransfer.items.length > 1 ? 's' : ''}</span>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedTransfer && (
                        <div className="space-y-6">
                            <div className="flex justify-end">
                                <Button onClick={() => handleDownloadPdf(selectedTransfer)} className="bg-vismass-blue text-white hover:bg-vismass-blue/90">
                                    <Download className="mr-2 h-4 w-4" />
                                    {t('Download PDF')}
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border p-4 rounded-lg bg-slate-50">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t('From Section')}</p>
                                    <p className="text-sm font-medium text-gray-900">{selectedTransfer.fromSection?.name || selectedTransfer.from_section_code}</p>
                                    <p className="text-xs text-gray-500">{selectedTransfer.from_section_code}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t('To Section')}</p>
                                    <p className="text-sm font-medium text-gray-900">{selectedTransfer.toSection?.name || selectedTransfer.to_section_code}</p>
                                    <p className="text-xs text-gray-500">{selectedTransfer.to_section_code}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Total Value')}</p>
                                    <p className="text-sm font-medium text-gray-900">Rs. {selectedTransfer.totalValue.toFixed(2)}</p>
                                    <p className="text-xs text-gray-500">{selectedTransfer.totalQuantity.toFixed(2)} units</p>
                                </div>
                            </div>

                            {selectedTransfer.notes && (
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{t('Notes')}</p>
                                    <p className="text-sm text-gray-900 p-2 bg-slate-50 rounded border">{selectedTransfer.notes}</p>
                                </div>
                            )}

                            <div>
                                <h5 className="text-sm font-medium text-gray-900 mb-2">{t('Printers Transferred')}</h5>
                                <div className="border rounded-md overflow-hidden">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
                                            <tr>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Brand')}</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Model')}</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Serial Number')}</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Warranty')}</th>
                                                <th className="px-4 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Unit Cost (Rs)')}</th>
                                                <th className="px-4 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Total (Rs)')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {selectedTransfer.items.map((item: any) => (
                                                <tr key={item.id} className="hover:bg-sky-50/50 transition-colors duration-150">
                                                    <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{item.brand || 'N/A'}</td>
                                                    <td className="px-4 py-2.5 text-sm text-gray-900">{item.model || 'N/A'}</td>
                                                    <td className="px-4 py-2.5 text-sm font-mono text-gray-900">{item.serial_number || 'N/A'}</td>
                                                    <td className="px-4 py-2.5 text-sm text-gray-900">{item.warranty || 'N/A'}</td>
                                                    <td className="px-4 py-2.5 text-right text-sm font-mono text-gray-900">{Number(item.cost_price).toFixed(2)}</td>
                                                    <td className="px-4 py-2.5 text-right text-sm font-mono font-medium text-gray-900">{((Number(item.quantity) || 0) * (Number(item.cost_price) || 0)).toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
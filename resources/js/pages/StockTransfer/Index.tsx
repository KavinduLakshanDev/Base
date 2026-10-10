import { useState, useEffect, useRef } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Pagination, { PaginationLink, PaginationMeta } from '@/components/pagination';
import { ArrowRightLeft, Plus, Truck, Calendar, Package, TrendingUp, Eye, Download, Search, Filter } from 'lucide-react';
import { t } from '@/lib/i18n';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem } from '@/types';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DatePicker } from '@/components/ui/date-picker';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface StockTransfer {
    id: number;
    transfer_number?: string;
    from_section_code: string;
    to_section_code: string;
    item_id: number;
    item_code?: string;
    item_name?: string;
    quantity: number;
    received_quantity?: number | null;
    conversion_factor?: number | null;
    sent_unit_id?: number | null;
    received_unit_id?: number | null;
    cost_price: number;
    transfer_date: string;
    notes: string;
    company_code: string;
    batch_no?: string;
    brand?: string;
    model?: string;
    serial_number?: string;
    warranty?: string;
    fromSection: {
        name: string;
        section_code: string;
        company_code?: string;
    } | null;
    toSection: {
        name: string;
        section_code: string;
        company_code?: string;
    } | null;
    item: {
        ItemCode: string;
        ItmNm: string;
    } | null;
}

interface StockTransfersData extends PaginationMeta {
    data: StockTransfer[];
    links: PaginationLink[];
}

interface IndexProps {
    stockTransfers: StockTransfersData;
    filters: {
        search?: string;
        per_page?: string;
        from_date?: string;
        to_date?: string;
        from_section?: string;
        to_section?: string;
    };
    sections: { section_code: string; name: string }[];
}

export default function Index({ stockTransfers, filters, sections = [] }: IndexProps) {
    const { auth } = usePage().props as any;
    const userCompany = auth?.user?.company_code || '';
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [itemsPerPage, setItemsPerPage] = useState(filters.per_page || '');
    const [fromDate, setFromDate] = useState(filters.from_date || '');
    const [toDate, setToDate] = useState(filters.to_date || '');
    const [fromSection, setFromSection] = useState(filters.from_section || 'all');
    const [toSection, setToSection] = useState(filters.to_section || 'all');
    const isFirstRender = useRef(true);
    const [selectedTransfer, setSelectedTransfer] = useState<any>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    const handleViewDetails = async (transferId: number) => {
        setIsLoadingDetails(true);
        setSelectedTransfer(null);
        setIsViewModalOpen(true);
        try {
            const response = await fetch(`/stock-transfers/${transferId}`);
            if (!response.ok) throw new Error('Failed to fetch details');
            const data = await response.json();
            setSelectedTransfer(data);
        } catch (error) {
            console.error('Error fetching transfer details:', error);
            alert(t('Failed to load transfer details'));
            setIsViewModalOpen(false);
        } finally {
            setIsLoadingDetails(false);
        }
    };

    // Auto-search effect
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const timeoutId = setTimeout(() => {
            router.get(
                '/stock-transfers',
                { search: searchTerm, per_page: itemsPerPage, from_date: fromDate, to_date: toDate, from_section: fromSection, to_section: toSection },
                {
                    preserveState: true,
                    replace: true,
                }
            );
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchTerm, itemsPerPage, fromDate, toDate, fromSection, toSection]);
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('Dashboard'),
            href: '/dashboard',
        },
        {
            title: t('Stock Transfers'),
            href: '#',
        },
    ];

    // Use backend filtered data directly
    const validTransfers = stockTransfers.data;

    // Group transfers by transfer_number
    const groupedTransfers = validTransfers.reduce((acc, transfer) => {
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
        return (b.transfer_number || '').localeCompare(a.transfer_number || '');
    });

    const totalTransfers = transferGroups.length;
    const totalQuantity = transferGroups.reduce((sum, group) => sum + group.totalQuantity, 0);
    const totalValue = transferGroups.reduce((sum, group) => sum + group.totalValue, 0);

    const handleDownloadPdf = async (transferId: number) => {
        try {
            const response = await fetch(`/stock-transfers/${transferId}/download-pdf`, {
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
            a.download = `stock-transfer-${transferId}-${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Error downloading PDF:', error);
            alert(t('Failed to download PDF'));
        }
    };

    const parseFilterDate = (dateString?: string) => {
        if (!dateString) return undefined;
        const [year, month, day] = dateString.split('-');
        const y = Number(year);
        const m = Number(month) - 1;
        const d = Number(day);
        if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return undefined;
        return new Date(y, m, d);
    };

    const formatFilterDate = (date?: Date) => {
        if (!date) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Stock Transfers')} />

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
                                        {t('Stock Transfers')}
                                    </h1>
                                    <p className="text-xs text-white/80 hidden sm:block">
                                        {t('Manage stock transfers between sections')}
                                    </p>
                                </div>
                            </div>
                            <Link
                                href="/stock-transfers/create"
                                className="shrink-0 inline-flex items-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                            >
                                <Plus className="h-4 w-4 sm:mr-1.5" />
                                <span className="hidden sm:inline">{t('New Transfer')}</span>
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
                                    <div className="rounded-lg bg-orange-500 p-2 shadow-sm">
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
                                    <div className="rounded-lg bg-vismass-grey p-2 shadow-sm">
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
                                    <div className="rounded-lg bg-vismass-blue/60 p-2 shadow-sm">
                                        <Calendar className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Recent Transfers')}</p>
                                        <p className="text-lg font-bold text-gray-900">
                                            {transferGroups.filter(t => {
                                                const transferDate = new Date(t.transfer_date);
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
                                            {t('Transfer History')}
                                        </h3>
                                        <p className="text-white/80 text-xs mt-0.5">
                                            {t('Browse and manage stock transfers')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4">
                                {/* Search Filter */}
                                <div className="bg-slate-50 p-3 rounded-lg mb-4 border border-slate-200">
                                    <div className="flex flex-col gap-3">
                                        {/* Row 1: Search + Per Page + Clear */}
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="relative">
                                                    <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        placeholder={t('Transfer #, Notes, Item...')}
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                    />
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
                                                onClick={() => { setSearchTerm(''); setItemsPerPage('15'); setFromDate(''); setToDate(''); setFromSection('all'); setToSection('all'); }}
                                                className="inline-flex items-center bg-gray-200 text-gray-700 px-3 py-2 text-sm rounded-lg hover:bg-gray-300 transition-all duration-200 font-medium whitespace-nowrap"
                                            >
                                                <Filter className="mr-1 h-3.5 w-3.5" />
                                                {t('Clear')}
                                            </button>
                                        </div>
                                        {/* Row 2: Date + Section filters */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                                            <div className="space-y-1">
                                                <Label className="text-xs font-medium text-gray-700">{t('From Date')}</Label>
                                                <DatePicker
                                                    date={fromDate ? new Date(fromDate + 'T00:00:00') : undefined}
                                                    onDateChange={(date) => setFromDate(date ? formatFilterDate(date) : '')}
                                                    placeholder={t('From Date')}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs font-medium text-gray-700">{t('To Date')}</Label>
                                                <DatePicker
                                                    date={toDate ? new Date(toDate + 'T00:00:00') : undefined}
                                                    onDateChange={(date) => setToDate(date ? formatFilterDate(date) : '')}
                                                    placeholder={t('To Date')}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs font-medium text-gray-700">{t('From Section')}</Label>
                                                <Select value={fromSection} onValueChange={setFromSection}>
                                                    <SelectTrigger className="border-slate-200 h-9 text-xs">
                                                        <SelectValue placeholder={t('All Sections')} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">{t('All Sections')}</SelectItem>
                                                        {sections.map((s) => (
                                                            <SelectItem key={s.section_code} value={s.section_code}>{s.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs font-medium text-gray-700">{t('To Section')}</Label>
                                                <Select value={toSection} onValueChange={setToSection}>
                                                    <SelectTrigger className="border-slate-200 h-9 text-xs">
                                                        <SelectValue placeholder={t('All Sections')} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">{t('All Sections')}</SelectItem>
                                                        {sections.map((s) => (
                                                            <SelectItem key={s.section_code} value={s.section_code}>{s.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* Transfer List */}
                                {/* Transfer List */}
                                <div className="overflow-x-auto rounded-lg border border-gray-200">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
                                            <tr>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Transfer Number')}</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('From Section')}</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('To Section')}</th>
                                                <th className="px-4 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Total Value')}</th>
                                                <th className="px-4 py-2.5 text-center text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Action')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {transferGroups.length > 0 ? (
                                                transferGroups.map((group) => (
                                                    <tr key={group.transfer_number || group.items[0].id} className="hover:bg-sky-50/50 transition-colors duration-150">
                                                        <td className="px-4 py-2.5">
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {group.transfer_number || 'N/A'}
                                                            </div>
                                                            <div className="text-xs text-gray-500 mt-0.5">
                                                                {new Date(group.transfer_date).toLocaleDateString()}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <div className="flex flex-col">
                                                                <span className="text-sm text-gray-900">{group.fromSection?.name || group.from_section_code}</span>
                                                                <span className="text-xs text-gray-500 mt-0.5">{group.from_section_code}</span>
                                                                {group.fromSection?.company_code && group.fromSection.company_code !== userCompany && (
                                                                    <div className="mt-1">
                                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800">
                                                                            {group.fromSection.company_code}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <div className="flex flex-col">
                                                                <span className="text-sm text-gray-900">{group.toSection?.name || group.to_section_code}</span>
                                                                <span className="text-xs text-gray-500 mt-0.5">{group.to_section_code}</span>
                                                                <div className="mt-1 flex gap-1 flex-wrap">
                                                                    {group.toSection?.company_code && group.toSection.company_code !== userCompany && (
                                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800">
                                                                            {group.toSection.company_code}
                                                                        </span>
                                                                    )}
                                                                    {group.fromSection?.company_code !== group.toSection?.company_code && (
                                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800">
                                                                            Cross-Company
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right">
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-medium text-gray-900 font-mono">Rs. {group.totalValue.toFixed(2)}</span>
                                                                <span className="text-xs text-gray-500 mt-0.5">{group.totalQuantity.toFixed(2)} units</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5 text-center whitespace-nowrap">
                                                            <button
                                                                onClick={() => handleViewDetails(group.items[0].id)}
                                                                className="inline-flex items-center text-sky-600 hover:text-sky-800 font-medium text-xs"
                                                                title="View Details"
                                                            >
                                                                <Eye className="mr-1 h-3.5 w-3.5" />
                                                                {t('View')}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
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
                                <Pagination links={stockTransfers.links} meta={stockTransfers} />
                            </div>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="mt-6 border-t border-sky-200 bg-gradient-to-r from-white to-sky-50">
                    <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
                        <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2">
                            <p className="text-xs text-gray-500">© VISMASS {t('Stock Transfer Management')} • v1.0.0</p>
                        </div>
                    </div>
                </footer>
            </div>

            <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t('Transfer Details')} - #{selectedTransfer?.transfer_number || (isLoadingDetails ? '...' : 'N/A')}</DialogTitle>
                        <DialogDescription>
                            {selectedTransfer && (
                                <span>{new Date(selectedTransfer.transfer_date).toLocaleDateString()} • {selectedTransfer.items.length} item{selectedTransfer.items.length > 1 ? 's' : ''}</span>
                            )}
                            {isLoadingDetails && <span>{t('Loading details...')}</span>}
                        </DialogDescription>
                    </DialogHeader>

                    {isLoadingDetails ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-vismass-blue mb-4"></div>
                            <p className="text-slate-500 font-medium">{t('Fetching all items...')}</p>
                        </div>
                    ) : selectedTransfer && (
                        <div className="space-y-6">
                            {/* Cross-Company Transfer Warning */}
                            {selectedTransfer.fromSection?.company_code !== selectedTransfer.toSection?.company_code && (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                    <div className="flex items-start">
                                        <div className="flex-shrink-0">
                                            <svg className="h-5 w-5 text-amber-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="ml-3">
                                            <h3 className="text-sm font-medium text-amber-800">Cross-Company Transfer</h3>
                                            <div className="mt-2 text-sm text-amber-700">
                                                <p>This transfer moved stock between {selectedTransfer.fromSection?.company_code} and {selectedTransfer.toSection?.company_code}. Stock ownership and location tracking are maintained separately.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end">
                                <Button onClick={() => handleDownloadPdf(selectedTransfer.items[0].id)} className="bg-vismass-blue text-white hover:bg-vismass-blue/90">
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
                                <h5 className="text-sm font-medium text-gray-900 mb-2">{t('Items Transferred')}</h5>
                                <div className="border rounded-md overflow-hidden">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
                                            <tr>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Item')}</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Batch')}</th>
                                                <th className="px-4 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Sent Qty')}</th>
                                                <th className="px-4 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Received Qty')}</th>
                                                <th className="px-4 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Unit Cost (Rs)')}</th>
                                                <th className="px-4 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Total (Rs)')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {selectedTransfer.items.map((item: any) => (
                                                <tr key={item.id} className="hover:bg-sky-50/50 transition-colors duration-150">
                                                    <td className="px-4 py-2.5">
                                                        <div className="flex items-center">
                                                            <div>
                                                                <div className="text-sm font-medium text-gray-900">
                                                                    {item.item?.ItmNm || item.item_name || 'Unknown Item'}
                                                                </div>
                                                                <div className="text-xs text-gray-500 mt-0.5">
                                                                    {item.item?.ItemCode || item.item_code || 'N/A'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-sm text-gray-900">{item.batch_no || 'N/A'}</td>
                                                    <td className="px-4 py-2.5 text-right text-sm text-gray-900">{Number(item.quantity) || 0}</td>
                                                    <td className="px-4 py-2.5 text-right text-sm text-gray-900">
                                                        {item.received_quantity && Number(item.conversion_factor) > 1 ? (
                                                            <span className="font-semibold text-amber-700">{Number(item.received_quantity).toFixed(4).replace(/\.?0+$/, '')}</span>
                                                        ) : Number(item.quantity) || 0}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right text-sm font-mono text-gray-900"> {Number(item.cost_price).toFixed(2)}</td>
                                                    <td className="px-4 py-2.5 text-right text-sm font-mono font-medium text-gray-900"> {((Number(item.quantity) || 0) * (Number(item.cost_price) || 0)).toFixed(2)}</td>
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
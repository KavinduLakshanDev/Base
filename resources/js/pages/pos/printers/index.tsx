import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { t } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';
import { Plus, Printer, Package, Edit, Eye, Power, PowerOff, Search, Filter } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import Pagination from '@/components/pagination';

interface PrinterItem {
    ItmKy: number;
    ItemCode: string;
    ItmNm: string;
    brand?: string;
    model?: string;
    category?: string;
    CosPri: number;
    SlsPri: number;
    RtDis1?: number;
    RtDisType1?: string;
    fInAct?: boolean;
    created_at: string;
}

interface CreateProps {
    printers: {
        data: PrinterItem[];
        current_page: number;
        last_page: number;
        total: number;
        per_page: number;
        from: number;
        to: number;
        links: any[];
    };
    filters?: {
        search?: string;
        status?: string;
        per_page?: string;
    };
    stats?: {
        totalCount: number;
        activeCount: number;
        totalValue: number;
    };
}

export default function PrinterIndex({ printers, filters = {}, stats }: CreateProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('Dashboard'), href: '/dashboard' },
        // { title: 'POS', href: '/pos' },
        { title: 'Printer Registration', href: '#' },
    ];

    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [itemsPerPage, setItemsPerPage] = useState(filters.per_page || '10');

    const initialRender = useRef(true);

    useEffect(() => {
        if (initialRender.current) {
            initialRender.current = false;
            return;
        }
        const timer = setTimeout(() => {
            router.get(
                '/pos/printers',
                { search, status: statusFilter, per_page: itemsPerPage, page: 1 },
                { preserveState: true, preserveScroll: true, replace: true }
            );
        }, 300);
        return () => clearTimeout(timer);
    }, [search, statusFilter, itemsPerPage]);

    const clearFilters = () => {
        setSearch('');
        setStatusFilter('');
        setItemsPerPage('10');
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'LKR',
        }).format(price);
    };

    // Use printers.data directly as backend already filters by PRN-
    const displayPrinters = printers.data;

    const totalPrinters = stats?.totalCount ?? printers.total;
    const activePrinters = stats?.activeCount ?? 0;
    const totalValue = stats?.totalValue ?? 0;


    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="min-h-screen bg-slate-50">
                <Head title="Registered Printers" />

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
                                    <Printer className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-lg sm:text-xl font-bold text-white truncate">Registered Printers</h1>
                                    <p className="text-xs text-white/80 hidden sm:block">Manage all registered printer models</p>
                                </div>
                            </div>
                            <Link
                                href="/pos/printers/create"
                                className="shrink-0 inline-flex items-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                            >
                                <Plus className="h-4 w-4 sm:mr-1.5" />
                                <span className="hidden sm:inline">Add Printer</span>
                            </Link>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-4">
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue p-2 shadow-sm">
                                        <Printer className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs text-slate-500 font-medium">Total Printers</p>
                                        <p className="text-2xl font-bold text-slate-900">{totalPrinters}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-orange-500 p-2 shadow-sm">
                                        <Package className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs text-slate-500 font-medium">Active</p>
                                        <p className="text-2xl font-bold text-slate-900">{activePrinters}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue/60 p-2 shadow-sm">
                                        <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs text-slate-500 font-medium">Total Value</p>
                                        <p className="text-lg font-bold text-slate-900">{formatPrice(totalValue)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Content Card */}
                        <div className="rounded-lg border border-slate-200 bg-white shadow overflow-hidden">
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 py-3">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                                    <div>
                                        <h2 className="text-lg font-semibold text-white">All Registered Printers</h2>
                                        <p className="text-xs text-white/80">Total: {totalPrinters} printer{totalPrinters !== 1 ? 's' : ''}</p>
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
                                                    placeholder="Search by name or code..."
                                                    value={search}
                                                    onChange={(e) => setSearch(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                />
                                            </div>
                                        </div>

                                        {/* Status + per-page + clear */}
                                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                            <div className="flex-1 min-w-[130px]">
                                                <div className="relative">
                                                    <Filter className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                    <select
                                                        value={statusFilter}
                                                        onChange={(e) => setStatusFilter(e.target.value)}
                                                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                    >
                                                        <option value="">All Status</option>
                                                        <option value="active">Active</option>
                                                        <option value="inactive">Inactive</option>
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
                                                    <option value="100">100 / {t('Page')}</option>
                                                </select>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={clearFilters}
                                                className="inline-flex items-center bg-gray-200 text-gray-700 px-3 py-2 text-sm rounded-lg hover:bg-gray-300 transition-all duration-200 font-medium whitespace-nowrap"
                                            >
                                                <Filter className="mr-1 h-3.5 w-3.5" />
                                                {t('Clear')}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Printers Table */}
                                {displayPrinters.length > 0 ? (
                                    <>
                                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
                                                    <tr>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">Code</th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">Name</th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">Brand</th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">Model</th>
                                                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">Sale Price (Rs.)</th>
                                                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">Discount</th>
                                                        <th className="px-4 py-2.5 text-center text-xs font-semibold text-sky-900 uppercase tracking-wider">Status</th>
                                                        <th className="px-4 py-2.5 text-center text-xs font-semibold text-sky-900 uppercase tracking-wider">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {displayPrinters.map((printer) => (
                                                        <tr key={printer.ItmKy} className="hover:bg-sky-50/50 transition-colors duration-150">
                                                            <td className="px-4 py-2.5">
                                                                <div className="flex items-center text-xs text-gray-900">
                                                                    <Badge variant="outline" className="font-mono text-xs">
                                                                        {printer.ItemCode}
                                                                    </Badge>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-2.5">
                                                                <div className="flex items-center">
                                                                    <div className="h-8 w-8 shrink-0">
                                                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-100 to-blue-100">
                                                                            <Printer className="h-3.5 w-3.5 text-sky-600" />
                                                                        </div>
                                                                    </div>
                                                                    <div className="ml-2.5">
                                                                        <div className="text-xs font-medium text-gray-900">
                                                                            {printer.ItmNm}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-2.5 text-xs text-gray-900">{printer.brand || '-'}</td>
                                                            <td className="px-4 py-2.5 text-xs text-gray-900">{printer.model || '-'}</td>
                                                            <td className="px-4 py-2.5 text-right text-xs font-medium text-gray-900 font-mono">
                                                                {parseFloat(printer.SlsPri.toString()).toFixed(2)}
                                                            </td>
                                                            <td className="px-4 py-2.5 text-right">
                                                                <div className="flex flex-col items-end">
                                                                    <span className="font-mono text-red-600 font-medium text-xs">
                                                                        {parseFloat((printer.RtDis1 || 0).toString()).toFixed(2)}
                                                                        {printer.RtDisType1 === 'percentage' ? '%' : ''}
                                                                    </span>
                                                                    <span className="text-[10px] uppercase text-slate-400 font-bold">
                                                                        {printer.RtDisType1 === 'percentage' ? 'Percentage' : 'Fixed'}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-2.5 whitespace-nowrap text-center">
                                                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${printer.fInAct ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                                                    {printer.fInAct ? 'Inactive' : 'Active'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-2.5 whitespace-nowrap text-xs font-medium text-center">
                                                                <div className="flex items-center justify-center space-x-2">
                                                                    <button
                                                                        onClick={() => window.location.href = `/pos/printers/${printer.ItmKy}`}
                                                                        className="inline-flex items-center text-sky-600 hover:text-sky-800"
                                                                        title="View Details"
                                                                    >
                                                                        <Eye className="mr-1 h-3.5 w-3.5" />
                                                                        {t('View')}
                                                                    </button>

                                                                    <button
                                                                        onClick={() => window.location.href = `/pos/printers/${printer.ItmKy}/edit`}
                                                                        className="inline-flex items-center p-1.5 rounded-md text-amber-600 hover:text-amber-800 hover:bg-amber-50 transition-colors"
                                                                        title="Edit Printer"
                                                                    >
                                                                        <Edit className="h-4 w-4" />
                                                                    </button>

                                                                    <button
                                                                        onClick={() => {
                                                                            if (!confirm('Toggle printer activation status?')) {
                                                                                return;
                                                                            }
                                                                            router.post(`/pos/printers/${printer.ItmKy}/toggle`, {}, {
                                                                                onSuccess: () => {
                                                                                    window.location.reload();
                                                                                },
                                                                                onError: (error) => {
                                                                                    console.error('Toggle failed', error);
                                                                                    alert('Failed to change printer status.');
                                                                                },
                                                                            });
                                                                        }}
                                                                        className={`inline-flex items-center p-1.5 rounded-md transition-colors ${printer.fInAct
                                                                            ? 'text-red-600 hover:text-red-800 hover:bg-red-50'
                                                                            : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                                                                            }`}
                                                                        title="Activate/Inactivate"
                                                                    >
                                                                        {printer.fInAct ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <Pagination
                                            links={printers.links}
                                            meta={{
                                                current_page: printers.current_page,
                                                from: printers.from,
                                                last_page: printers.last_page,
                                                to: printers.to,
                                                total: printers.total,
                                                per_page: printers.per_page
                                            }}
                                        />
                                    </>
                                ) : (
                                    <div className="text-center py-12">
                                        <Printer className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                        <h3 className="text-lg font-semibold text-slate-700">No printers registered yet</h3>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            Register your first printer to get started
                                        </p>
                                        <Link href="/pos/printers/create">
                                            <Button>
                                                <Plus className="h-4 w-4 mr-2" />
                                                Register Printer
                                            </Button>
                                        </Link>
                                    </div>
                                )}

                            </div>
                        </div>

                        {/* Info Card */}
                        <Card className="mt-4 bg-blue-50 border-blue-200">
                            <CardHeader>
                                <CardTitle className="text-blue-900">How to Use Registered Printers</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-blue-800 space-y-2">
                                <p>✓ Once a printer is registered, you can use it in GRN (Goods Received Note) entries</p>
                                <p>✓ Select the "Printer GRN" stock location type during GRN creation</p>
                                <p>✓ Search for and select the registered printer</p>
                                <p>✓ Enter multiple serial numbers (comma or line-separated) to create multiple line items</p>
                                <p>✓ Each serial number will be saved as a separate inventory record</p>
                            </CardContent>
                        </Card>
                    </div>
                </main>

                {/* Footer */}
                <footer className="mt-6 border-t border-sky-200 bg-gradient-to-r from-white to-sky-50">
                    <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
                        <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2">
                            <p className="text-xs text-gray-500">© VISMASS Printer Registration • v1.0.0</p>
                        </div>
                    </div>
                </footer>
            </div>
        </AppLayout>
    );
}

import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { Head, router } from '@inertiajs/react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PageProps, Address, Company } from '@/types';
import { Printer, FileText, X, Truck, Search, ArrowLeft, RotateCcw, Filter } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import ReportPrintHeader from '@/components/report-print-header';

interface SupplierDetailsProps extends PageProps {
    suppliers: Address[];
    company: Company;
    filters?: {
        from_date?: string;
        to_date?: string;
        search?: string;
    };
}

export default function SupplierDetails({ auth, suppliers, company, filters }: SupplierDetailsProps) {
    const [searchTerm, setSearchTerm] = useState(filters?.search || '');
    
    // Parse the date strings into local date objects if they exist
    const parseLocalDate = (dateStr?: string) => {
        if (!dateStr) return undefined;
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
    };

    const [fromDate, setFromDate] = useState<Date | undefined>(parseLocalDate(filters?.from_date));
    const [toDate, setToDate] = useState<Date | undefined>(parseLocalDate(filters?.to_date));

    // We now filter on the server, so just use the props directly
    const filteredSuppliers = suppliers;

    const formatDateLocal = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const handleApplyFilters = () => {
        const params = new URLSearchParams();
        if (searchTerm.trim()) params.append('search', searchTerm.trim());
        if (fromDate) params.append('from_date', formatDateLocal(fromDate));
        if (toDate) params.append('to_date', formatDateLocal(toDate));

        router.get(`/reports/supplier-details?${params.toString()}`, {}, {
            preserveState: true,
            replace: true,
        });
    };

    const clearFilters = () => {
        setSearchTerm('');
        setFromDate(undefined);
        setToDate(undefined);
        router.get('/reports/supplier-details', {}, {
            preserveState: false,
        });
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExportCsv = () => {
        if (!filteredSuppliers || filteredSuppliers.length === 0) return;

        const escape = (value: string | number | null | undefined) => {
            const str = value == null ? '' : String(value);
            return `"${str.replace(/"/g, '""')}"`;
        };

        const rows: Array<Array<string | number>> = [];
        rows.push(['Supplier ID', 'Name', 'Email', 'Phone', 'Address']);

        filteredSuppliers.forEach((supplier) => {
            rows.push([
                supplier.AdrCd || '',
                (supplier.FstNm || '').trim(),
                supplier.Email || '',
                supplier.TP1 || '',
                (supplier.Address || '').trim(),
            ]);
        });

        const csv = rows.map(row => row.map(col => escape(col)).join(',')).join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `supplier-details-${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <AppLayout
            breadcrumbs={[
                // { title: t('Reports'), href: '/reports' },
                { title: 'Dashboard', href: '/dashboard'},
                { title: t('Supplier Details'), href: '/reports/supplier-details' },
            ]}
        >
            <Head title={t('Supplier Details')} />
            
            <style>{`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 10mm;
                    }
                    
                    body, html {
                        height: auto !important;
                        overflow: visible !important;
                    }
                    
                    body * {
                        visibility: hidden;
                    }
                    
                    body,
                    body > div,
                    body > div > div,
                    [data-slot="sidebar-wrapper"],
                    [data-slot="sidebar-inset"],
                    main,
                    .min-h-screen,
                    .min-h-svh {
                        position: static !important;
                        overflow: visible !important;
                        height: auto !important;
                        min-height: 0 !important;
                        max-height: none !important;
                        display: block !important;
                    }
                    
                    #printable-suppliers,
                    #printable-suppliers * {
                        visibility: visible;
                    }
                    
                    #printable-suppliers {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        background: white;
                        height: auto !important;
                        overflow: visible !important;
                    }
                    
                    .no-print {
                        display: none !important;
                    }
                    
                    #printable-suppliers > table {
                        display: table !important;
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 10px;
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
                        padding: 4px;
                        color: #000 !important;
                    }
                    
                    th {
                        background-color: #e5e7eb !important;
                        font-weight: bold;
                        text-align: left;
                    }
                }
            `}</style>

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow no-print">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-center space-x-3">
                                <button
                                    onClick={() => window.history.back()}
                                    className="shrink-0 rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all"
                                    title={t('Go Back')}
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </button>
                                <div className="shrink-0 rounded-lg bg-white/20 p-2 shadow">
                                    <Truck className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="truncate text-lg sm:text-xl font-bold text-white">{t('Supplier Details')}</h1>
                                </div>
                            </div>

                            <div className="flex w-full items-center gap-2 sm:w-auto">
                                <Button onClick={handleExportCsv} className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200">
                                    <FileText className="mr-1.5 h-4 w-4" />
                                    {t('Export CSV')}
                                </Button>
                                <Button onClick={handlePrint} className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200">
                                    <Printer className="mr-1.5 h-4 w-4" />
                                    {t('Print')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div id="printable-suppliers">
                        <ReportPrintHeader
                            company={company}
                            title={t('Supplier Details Report')}
                            period={new Date().toLocaleDateString()}
                        />

                        <div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden no-print">
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 sm:px-6 py-4">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">{t('Supplier Details Report')}</h3>
                                        <p className="text-white/80 text-sm mt-1">{t('View and search supplier information')}</p>
                                    </div>
                                    <div className="text-white/80 text-sm">
                                        {t('Total Suppliers')}: {filteredSuppliers.length}
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 sm:p-6">
                                {/* Filters Section */}
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm no-print mb-6">
                                    <div className="flex flex-col">
                                        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                            <Filter className="h-4 w-4" />
                                            {t('Filters')}
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {/* Search */}
                                        <div className="md:col-span-1">
                                            <Label htmlFor="search">{t('Search Supplier')}</Label>
                                            <div className="relative mt-2">
                                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <Input
                                                    id="search"
                                                    type="text"
                                                    placeholder={t('ID or Name...')}
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="bg-white pl-10"
                                                />
                                            </div>
                                        </div>

                                        {/* From Date */}
                                        <div>
                                            <Label>{t('From Date (Joined)')}</Label>
                                            <div className="mt-2">
                                                <input
                                                    type="date"
                                                    id="from_date"
                                                    value={fromDate ? format(fromDate, 'yyyy-MM-dd') : ''}
                                                    onChange={(e) => {
                                                        if (e.target.value) {
                                                            const [y, m, d] = e.target.value.split('-');
                                                            setFromDate(new Date(parseInt(y), parseInt(m) - 1, parseInt(d)));
                                                        } else {
                                                            setFromDate(undefined);
                                                        }
                                                    }}
                                                    className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                                />
                                            </div>
                                        </div>

                                        {/* To Date */}
                                        <div>
                                            <Label>{t('To Date (Joined)')}</Label>
                                            <div className="mt-2">
                                                <input
                                                    type="date"
                                                    id="to_date"
                                                    value={toDate ? format(toDate, 'yyyy-MM-dd') : ''}
                                                    onChange={(e) => {
                                                        if (e.target.value) {
                                                            const [y, m, d] = e.target.value.split('-');
                                                            setToDate(new Date(parseInt(y), parseInt(m) - 1, parseInt(d)));
                                                        } else {
                                                            setToDate(undefined);
                                                        }
                                                    }}
                                                    className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                        </div>
                                        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                                            <Button onClick={handleApplyFilters} className="w-full sm:w-auto bg-vismass-blue hover:bg-vismass-blue/90 text-white">
                                                <Filter className="mr-2 h-4 w-4" />
                                                {t('Apply Filters')}
                                            </Button>
                                            <Button variant="outline" onClick={clearFilters} className="w-full sm:w-auto bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 gap-2">
                                                <RotateCcw className="h-4 w-4" />
                                                {t('Reset')}
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Table */}
                                <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                                    <Table className="min-w-[760px]">
                                        <TableHeader className="bg-slate-50">
                                            <TableRow>
                                                <TableHead className="w-12">#</TableHead>
                                                <TableHead>{t('Supplier ID')}</TableHead>
                                                <TableHead>{t('Name')}</TableHead>
                                                <TableHead>{t('Email')}</TableHead>
                                                <TableHead>{t('Phone')}</TableHead>
                                                <TableHead>{t('Address')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredSuppliers.map((supplier, index) => (
                                                <TableRow key={supplier.AdrKy}>
                                                    <TableCell className="text-slate-500 font-medium">{index + 1}</TableCell>
                                                    <TableCell className="font-semibold">{supplier.AdrCd}</TableCell>
                                                    <TableCell>{supplier.FstNm}</TableCell>
                                                    <TableCell>{supplier.Email}</TableCell>
                                                    <TableCell>{supplier.TP1}</TableCell>
                                                    <TableCell>{supplier.Address}</TableCell>
                                                </TableRow>
                                            ))}
                                            {filteredSuppliers.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                                                        {t('No suppliers found matching your criteria.')}
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>

                        {/* Print Table - Only visible in print */}
                        <table style={{ display: 'none' }}>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>{t('Supplier ID')}</th>
                                    <th>{t('Name')}</th>
                                    <th>{t('Email')}</th>
                                    <th>{t('Phone')}</th>
                                    <th>{t('Address')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSuppliers.map((supplier, index) => (
                                    <tr key={supplier.AdrKy}>
                                        <td style={{ textAlign: 'center' }}>{index + 1}</td>
                                        <td>{supplier.AdrCd}</td>
                                        <td>{supplier.FstNm}</td>
                                        <td>{supplier.Email}</td>
                                        <td>{supplier.TP1}</td>
                                        <td>{supplier.Address}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </main>
            </div>
        </AppLayout>
    );
}

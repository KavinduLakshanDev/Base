import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { Head, router } from '@inertiajs/react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Printer, FileText, Download, Filter, RotateCcw, Search } from 'lucide-react';
import { PageProps, Company } from '@/types';
import { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import Pagination, { PaginationLink, PaginationMeta } from '@/components/pagination';

interface SaleItemRecord {
    id: number;
    item_code: string;
    item_name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    brand?: string;
    model?: string;
    serial_number?: string;
    invoice_no?: string;
    transaction_date?: string;
    customer_name?: string;
    section_code?: string;
    section_name?: string;
}

interface PaginatedSaleItems extends PaginationMeta {
    data: SaleItemRecord[];
    links: PaginationLink[];
}

interface SaleItemsProps extends PageProps {
    records: PaginatedSaleItems;
    company: Company;
    cashiers: { id: number; name: string }[];
    filters?: {
        item_type?: 'all' | 'printer' | 'product';
        cashier_id?: string;
        invoice_no?: string;
        from_date?: string;
        to_date?: string;
        serial_number?: string;
        include_service_jobs?: boolean | string;
    };
}

export default function SaleItems({ records, company, cashiers = [], filters }: SaleItemsProps) {
    const [selectedItemType, setSelectedItemType] = useState<'all' | 'printer' | 'product'>(
        filters?.item_type || 'all',
    );
    const [selectedCashierId, setSelectedCashierId] = useState<string>(
        filters?.cashier_id || 'all'
    );
    const [invoiceNo, setInvoiceNo] = useState<string>(
        filters?.invoice_no || ''
    );
    const [serialNumber, setSerialNumber] = useState<string>(
        filters?.serial_number || ''
    );
    const [includeServiceJobs, setIncludeServiceJobs] = useState<boolean>(
        filters?.include_service_jobs === 'true' || filters?.include_service_jobs === true,
    );
    const formatLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const [startDate, setStartDate] = useState<string>(() => {
        if (filters?.from_date) return filters.from_date;
        const today = new Date();
        today.setDate(today.getDate() - 7);
        return formatLocal(today);
    });
    const [endDate, setEndDate] = useState<string>(() => {
        if (filters?.to_date) return filters.to_date;
        return formatLocal(new Date());
    });

    // Keep stable sorting on current server-filtered dataset
    const filteredRecords = useMemo(() => {
        const data = records?.data || [];
        return [...data].sort((a, b) => {
            const dateA = a.transaction_date ? new Date(a.transaction_date).getTime() : 0;
            const dateB = b.transaction_date ? new Date(b.transaction_date).getTime() : 0;
            if (dateA !== dateB) {
                return dateB - dateA;
            }
            const invoiceA = a.invoice_no || '';
            const invoiceB = b.invoice_no || '';
            return invoiceB.localeCompare(invoiceA);
        });
    }, [records]);

    const showPrinterColumns = selectedItemType !== 'product';
    const normalizedCompanyCode = (company?.company_code || 'VIS001').toUpperCase();
    const printLogoSrc = normalizedCompanyCode.startsWith('MAL')
        ? '/images/malibu-logo.png'
        : normalizedCompanyCode === 'MASS'
            ? '/images/mass-logo.svg'
            : '/images/Vismass-logo.png';

    const handlePrint = () => window.print();

    const handleExportCsv = () => {
        const params = new URLSearchParams();
        if (selectedItemType !== 'all') params.append('item_type', selectedItemType);
        if (selectedCashierId !== 'all') params.append('cashier_id', selectedCashierId);
        if (invoiceNo) params.append('invoice_no', invoiceNo);
        if (serialNumber && selectedItemType === 'printer') params.append('serial_number', serialNumber);
        
        if (includeServiceJobs) params.append('include_service_jobs', 'true');

        if (startDate) params.append('from_date', startDate);
        if (endDate) params.append('to_date', endDate);
        
        window.location.href = `/reports/sale-items/export?${params.toString()}`;
    };

    const handleApplyFilters = () => {
        const params: Record<string, string> = {
            item_type: selectedItemType,
            cashier_id: selectedCashierId,
        };
        
        if (invoiceNo) {
            params.invoice_no = invoiceNo;
        }

        if (serialNumber && selectedItemType === 'printer') {
            params.serial_number = serialNumber;
        }

        if (includeServiceJobs) {
            params.include_service_jobs = 'true';
        }

        if (startDate) params.from_date = startDate;
        if (endDate) params.to_date = endDate;

        router.get('/reports/sale-items', params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleResetFilters = () => {
        setSelectedItemType('all');
        setSelectedCashierId('all');
        setInvoiceNo('');
        setSerialNumber('');
        setIncludeServiceJobs(false);
        const today = new Date();
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(today.getMonth() - 3);
        setStartDate(formatLocal(threeMonthsAgo));
        setEndDate(formatLocal(today));
        router.get('/reports/sale-items', {}, { preserveState: true, preserveScroll: true, replace: true });
    };

    return (
        <AppLayout
            breadcrumbs={[{ title: t('Reports'), href: '/reports' }, { title: t('Sale Items'), href: '/reports/sale-items' }]}
        >
            <Head title={t('Sale Items Report')}>
                <style>{`
                        /* Print Table Container */
                        .print-table-container {
                            display: none;
                        }

                        @media print {
                            .print-table-container {
                                display: block !important;
                            }

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
                            
                            /* Reset all parent containers to allow multi-page flow */
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
                            
                            #printable-items,
                            #printable-items * {
                                visibility: visible;
                            }
                            
                            #printable-items {
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
                            
                            .print-header {
                                margin-bottom: 10px;
                                border-bottom: 2px solid #000;
                                padding-bottom: 6px;
                                display: block !important;
                            }

                            .print-logo-compact {
                                display: block !important;
                                visibility: visible !important;
                                height: 32px !important;
                                width: auto !important;
                                max-height: 32px !important;
                                margin: 0 auto 4px auto !important;
                                object-fit: contain !important;
                            }

                            .print-title-compact {
                                text-align: center;
                                font-size: 16px;
                                font-weight: 700;
                                margin: 0;
                                line-height: 1.2;
                            }
                            
                            .print-report-title {
                                font-size: 18px;
                                font-weight: bold;
                                text-align: center;
                                margin-bottom: 15px;
                            }
                            
                            .print-date-header {
                                font-size: 14px;
                                font-weight: bold;
                                margin-bottom: 5px;
                                border-bottom: 1px solid #ccc;
                                margin-top: 15px; /* Add spacing between date groups */
                                page-break-after: avoid; /* Keep header with table */
                            }
                            
                            .print-table {
                                display: table !important;
                                width: 100%;
                                border-collapse: collapse;
                                font-size: 9px;
                                page-break-inside: auto;
                                color: #000 !important;
                                margin-bottom: 20px;
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
                                color: #000 !important;
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
            </Head>

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow no-print">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-center space-x-3">
                                <div className="shrink-0 rounded-lg bg-white/20 p-2 shadow">
                                    <FileText className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="truncate text-lg sm:text-xl font-bold text-white">{t('Sale Items Report')}</h1>
                                    <p className="hidden text-xs text-white/80 sm:block">{t('List of sold items with transaction details')}</p>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                <Button onClick={handleExportCsv} className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200">
                                    <Download className="mr-1.5 h-4 w-4" />
                                    {t('Export CSV')}
                                </Button>
                                <Button onClick={handlePrint} className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200">
                                    <Printer className="mr-1.5 h-4 w-4" />
                                    {t('Print')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div id="printable-items">
                        <div className="print-header" style={{ display: 'none' }}>
                            <img
                                src={printLogoSrc}
                                alt={company?.name || 'Company'}
                                className="print-logo-compact"
                                onError={(e) => {
                                    const img = e.currentTarget;
                                    if (!img.dataset.fallback) {
                                        img.dataset.fallback = '1';
                                        img.src = '/images/vismass-logo.svg';
                                    }
                                }}
                            />
                            <div className="print-title-compact">{t('Sale Items Report')}</div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden no-print">
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 sm:px-6 py-4">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">{t('Sale Items Report')}</h3>
                                        <p className="text-white/80 text-sm mt-1">{t('Transactions and sold item lines')}</p>
                                    </div>
                                    <div className="text-white/80 text-sm whitespace-nowrap">{t('Generated on')}: {new Date().toLocaleDateString()}</div>
                                </div>
                            </div>

                            <div className="p-4 sm:p-6">
                                {/* Filters Section */}
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm mb-6">
                                    <div className="flex flex-col">
                                        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                            <Filter className="h-4 w-4" />
                                            {t('Sale Items Filters')}
                                        </h3>
                                        <div className={`grid grid-cols-1 md:grid-cols-3 ${selectedItemType === 'printer' ? 'lg:grid-cols-6' : 'lg:grid-cols-5'} gap-4 mb-4`}>
                                            {/* Item Type */}
                                            <div className="space-y-2">
                                                <Label htmlFor="item_type" className="text-sm font-medium text-gray-700">
                                                    {t('Item Type')}
                                                </Label>
                                                <Select
                                                    value={selectedItemType}
                                                    onValueChange={(value: 'all' | 'printer' | 'product') => setSelectedItemType(value)}
                                                >
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Filter by Sales Item" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">All Items</SelectItem>
                                                        <SelectItem value="printer">Printers</SelectItem>
                                                        <SelectItem value="product">Products</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Cashier Filter */}
                                            <div className="space-y-2">
                                                <Label htmlFor="cashier_id" className="text-sm font-medium text-gray-700">
                                                    {t('Cashier')}
                                                </Label>
                                                <Select
                                                    value={selectedCashierId}
                                                    onValueChange={(value: string) => setSelectedCashierId(value)}
                                                >
                                                    <SelectTrigger className="w-full bg-white border-slate-300">
                                                        <SelectValue placeholder={t('Filter by Cashier')} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">{t('All Cashiers')}</SelectItem>
                                                        {cashiers.map((cashier) => (
                                                            <SelectItem key={cashier.id} value={cashier.id.toString()}>
                                                                {cashier.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Invoice Filter */}
                                            <div className="space-y-2">
                                                <Label htmlFor="invoice_no" className="text-sm font-medium text-gray-700">
                                                    {t('Invoice No')}
                                                </Label>
                                                <Input
                                                    id="invoice_no"
                                                    placeholder={t('Search Invoice')}
                                                    value={invoiceNo}
                                                    onChange={(e) => setInvoiceNo(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleApplyFilters();
                                                        }
                                                    }}
                                                    className="w-full bg-white border-slate-300"
                                                />
                                            </div>

                                            {/* Serial Number Filter */}
                                            {selectedItemType === 'printer' && (
                                                <div className="space-y-2">
                                                    <Label htmlFor="serial_number" className="text-sm font-medium text-gray-700">
                                                        {t('Serial Number')}
                                                    </Label>
                                                    <Input
                                                        id="serial_number"
                                                        placeholder={t('Search Serial Number')}
                                                        value={serialNumber}
                                                        onChange={(e) => setSerialNumber(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                handleApplyFilters();
                                                            }
                                                        }}
                                                        className="w-full bg-white border-slate-300"
                                                    />
                                                </div>
                                            )}

                                            {/* Date Range Filters */}
                                            <div className="space-y-2">
                                                <Label htmlFor="from_date" className="text-sm font-medium text-gray-700">
                                                    {t('From Date')}
                                                </Label>
                                                <input
                                                type="date"
                                                id="from_date"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                                className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="to_date" className="text-sm font-medium text-gray-700">
                                                {t('To Date')}
                                            </Label>
                                                <input
                                                type="date"
                                                id="to_date"
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                                className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                            />
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-2 mt-4">
                                            <input
                                                type="checkbox"
                                                id="include_service_jobs"
                                                checked={includeServiceJobs}
                                                onChange={(e) => setIncludeServiceJobs(e.target.checked)}
                                                className="h-4 w-4 rounded border-gray-300 text-vismass-blue focus:ring-vismass-blue"
                                            />
                                            <Label htmlFor="include_service_jobs" className="text-sm font-medium text-gray-700">
                                                {t('Include Service Jobs')}
                                            </Label>
                                        </div>

                                        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                                            <Button
                                                onClick={handleApplyFilters}
                                                className="w-full sm:w-auto bg-vismass-blue hover:bg-vismass-blue/90 text-white gap-2"
                                            >
                                                <Search className="h-4 w-4" />
                                                {t('Apply')}
                                            </Button>
                                            <Button
                                                onClick={handleResetFilters}
                                                variant="outline"
                                                className="w-full sm:w-auto bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 gap-2"
                                            >
                                                <RotateCcw className="h-4 w-4" />
                                                {t('Reset')}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                                {/* Table */}
                                <div className="space-y-6">
                                    {Object.keys(
                                        filteredRecords.reduce((groups, record) => {
                                            const date = record.transaction_date ? new Date(record.transaction_date).toLocaleDateString() : 'Unknown Date';
                                            if (!groups[date]) {
                                                groups[date] = [];
                                            }
                                            groups[date].push(record);
                                            return groups;
                                        }, {} as Record<string, SaleItemRecord[]>)
                                    ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).map(date => {
                                        const dateRecords = filteredRecords.filter(r =>
                                            (r.transaction_date ? new Date(r.transaction_date).toLocaleDateString() : 'Unknown Date') === date
                                        );

                                        return (
                                            <div key={date} className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                                                <div className="bg-slate-100 px-4 py-2 font-semibold text-slate-700 border-b border-slate-200">
                                                    Date: {date}
                                                </div>
                                                <div className="overflow-x-auto">
                                                <Table className="min-w-[1100px]">
                                                    <TableHeader className="bg-slate-50">
                                                        <TableRow>
                                                            <TableHead>Invoice</TableHead>
                                                            <TableHead>Customer</TableHead>
                                                            <TableHead>Item Code</TableHead>
                                                            <TableHead>Item Name</TableHead>
                                                            {showPrinterColumns && <TableHead>Serial Number</TableHead>}
                                                            {/* {showPrinterColumns && <TableHead>Brand</TableHead>}
                                                            {showPrinterColumns && <TableHead>Model</TableHead>} */}
                                                            <TableHead className="text-right">Qty</TableHead>
                                                            <TableHead className="text-right">Unit Price</TableHead>
                                                            <TableHead className="text-right">Total Price</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {(() => {
                                                            const invoiceCounts: Record<string, number> = {};
                                                            dateRecords.forEach(r => {
                                                                if (r.invoice_no) {
                                                                    invoiceCounts[r.invoice_no] = (invoiceCounts[r.invoice_no] || 0) + 1;
                                                                }
                                                            });
                                                            
                                                            const renderedInvoices = new Set<string>();
                                                            
                                                            return dateRecords.map((r: SaleItemRecord) => {
                                                                const isFirst = r.invoice_no && !renderedInvoices.has(r.invoice_no);
                                                                if (isFirst && r.invoice_no) {
                                                                    renderedInvoices.add(r.invoice_no);
                                                                }
                                                                
                                                                return (
                                                                    <TableRow key={r.id}>
                                                                        {isFirst ? (
                                                                            <>
                                                                                <TableCell 
                                                                                    rowSpan={invoiceCounts[r.invoice_no!]} 
                                                                                    className="font-semibold align-top border-r bg-slate-50/30"
                                                                                >
                                                                                    {r.invoice_no}
                                                                                </TableCell>
                                                                                <TableCell 
                                                                                    rowSpan={invoiceCounts[r.invoice_no!]} 
                                                                                    className="align-top border-r"
                                                                                >
                                                                                    {r.customer_name || '-'}
                                                                                </TableCell>
                                                                            </>
                                                                        ) : !r.invoice_no ? (
                                                                            <>
                                                                                <TableCell className="font-semibold">-</TableCell>
                                                                                <TableCell>-</TableCell>
                                                                            </>
                                                                        ) : null}
                                                                        <TableCell>{r.item_code}</TableCell>
                                                                        <TableCell>{r.item_name}</TableCell>
                                                                        {showPrinterColumns && <TableCell>{r.serial_number || '-'}</TableCell>}
                                                                        {/* {showPrinterColumns && <TableCell>{r.brand || '-'}</TableCell>}
                                                                        {showPrinterColumns && <TableCell>{r.model || '-'}</TableCell>} */}
                                                                        <TableCell className="text-right">{Number(r.quantity).toFixed(2)}</TableCell>
                                                                        <TableCell className="text-right">{Number(r.unit_price).toFixed(2)}</TableCell>
                                                                        <TableCell className="text-right">{Number(r.line_total).toFixed(2)}</TableCell>
                                                                    </TableRow>
                                                                );
                                                            });
                                                        })()}
                                                    </TableBody>
                                                </Table>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {filteredRecords.length === 0 && (
                                        <div className="text-center py-10 text-gray-500">
                                            No records found for the selected criteria.
                                        </div>
                                    )}
                                </div>
                                <div className="mt-6">
                                    <Pagination links={records.links} meta={records} />
                                </div>
                            </div>
                        </div>

                        {/* Print Table - Only visible in print */}
                        <div className="print-table-container">
                            {Object.keys(
                                filteredRecords.reduce((groups, record) => {
                                    const date = record.transaction_date ? new Date(record.transaction_date).toLocaleDateString() : 'Unknown Date';
                                    if (!groups[date]) {
                                        groups[date] = [];
                                    }
                                    groups[date].push(record);
                                    return groups;
                                }, {} as Record<string, SaleItemRecord[]>)
                            ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).map(date => {
                                const dateRecords = filteredRecords.filter(r =>
                                    (r.transaction_date ? new Date(r.transaction_date).toLocaleDateString() : 'Unknown Date') === date
                                );

                                return (
                                    <div key={`print-${date}`}>
                                        <div className="print-date-header">
                                            Date: {date}
                                        </div>
                                        <table className="print-table">
                                            <thead>
                                                <tr>
                                                    <th>Invoice</th>
                                                    <th>Customer</th>
                                                    <th>Item Code</th>
                                                    <th>Item Name</th>
                                                    {showPrinterColumns && <th>Serial Number</th>}
                                                    {/* {showPrinterColumns && <th>Brand</th>}
                                                    {showPrinterColumns && <th>Model</th>} */}
                                                    <th style={{ textAlign: 'right' }}>Qty</th>
                                                    <th style={{ textAlign: 'right' }}>Unit Price</th>
                                                    <th style={{ textAlign: 'right' }}>Total Price</th>
                                                </tr>
                                            </thead>
                                             <tbody>
                                                 {(() => {
                                                     const invoiceCounts: Record<string, number> = {};
                                                     dateRecords.forEach(r => {
                                                         if (r.invoice_no) {
                                                             invoiceCounts[r.invoice_no] = (invoiceCounts[r.invoice_no] || 0) + 1;
                                                         }
                                                     });
                                                     
                                                     const renderedInvoices = new Set<string>();
                                                     
                                                     return dateRecords.map((r: SaleItemRecord) => {
                                                         const isFirst = r.invoice_no && !renderedInvoices.has(r.invoice_no);
                                                         if (isFirst && r.invoice_no) {
                                                             renderedInvoices.add(r.invoice_no);
                                                         }
                                                         
                                                         return (
                                                             <tr key={r.id}>
                                                                 {isFirst ? (
                                                                     <>
                                                                         <td rowSpan={invoiceCounts[r.invoice_no!]}>{r.invoice_no}</td>
                                                                         <td rowSpan={invoiceCounts[r.invoice_no!]}>{r.customer_name || '-'}</td>
                                                                     </>
                                                                 ) : !r.invoice_no ? (
                                                                     <>
                                                                         <td>-</td>
                                                                         <td>-</td>
                                                                     </>
                                                                 ) : null}
                                                                 <td>{r.item_code}</td>
                                                                 <td>{r.item_name}</td>
                                                                 {showPrinterColumns && <td>{r.serial_number || '-'}</td>}
                                                                 {/* {showPrinterColumns && <td>{r.brand || '-'}</td>}
                                                                 {showPrinterColumns && <td>{r.model || '-'}</td>} */}
                                                                 <td style={{ textAlign: 'right' }}>{Number(r.quantity).toFixed(2)}</td>
                                                                 <td style={{ textAlign: 'right' }}>{Number(r.unit_price).toFixed(2)}</td>
                                                                 <td style={{ textAlign: 'right' }}>{Number(r.line_total).toFixed(2)}</td>
                                                             </tr>
                                                         );
                                                     });
                                                 })()}
                                             </tbody>
                                        </table>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Print Footer - Only visible in print */}
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
                </main>
            </div>
        </AppLayout>
    );
}

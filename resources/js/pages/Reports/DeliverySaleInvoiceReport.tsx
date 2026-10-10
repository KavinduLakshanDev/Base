import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Filter, Calendar, Truck, Users, DollarSign, ArrowLeft, Printer } from 'lucide-react';
import { Link } from '@inertiajs/react';



interface InvoiceSummary {
    delivery_id: number;
    delivery_number: string;
    delivery_date: string;
    route_name: string;
    rep_name: string;
    customer_name: string;
    items_count: number;
    total_amount: number;
    outstanding: number;
    payment_method?: string;
    items: Array<{
        item_code: string;
        item_name: string;
        quantity: number;
        unit_price: number;
        line_total: number;
    }>;
}



interface Props {
    summary: {
        total_deliveries: number;
        total_items: number;
        total_sales: number;
        total_paid: number;
        outstanding: number;
        cash_total: number;
        cheque_total: number;
        card_total: number;
        bank_total: number;
        credit_total: number;
    };
    by_invoice: InvoiceSummary[];
    filters: {
        date_from?: string;
        date_to?: string;
        route_id?: string | null;
        rep_id?: string | null;
        granularity?: string;
    };
    routes: Array<{ id: number | string; name: string }>;
    salesReps: Array<{ id: number | string; first_name: string; last_name: string }>;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: t('Dashboard'), href: '/dashboard' },
    // { title: t('Reports'), href: '/reports' },
    { title: t('Delivery Sales'), href: '/reports/delivery-sales' },
];

export default function DeliverySaleInvoiceReport({ summary, by_invoice = [], filters, routes, salesReps }: Props) {
    const pageProps = usePage().props as any;
    const salesRepList = Array.isArray(salesReps) && salesReps.length > 0 ? salesReps : (Array.isArray(pageProps.salesReps) ? pageProps.salesReps : []);

    const getSalesRepName = (rep: any) => {
        if (!rep) return '';
        const firstName = rep.first_name ?? rep.FstNm ?? rep.name ?? '';
        const lastName = rep.last_name ?? rep.LstNm ?? '';
        return `${firstName} ${lastName}`.trim() || String(rep.id ?? '');
    };

    const [fromDate, setFromDate] = useState<string>(() => filters.date_from || new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString().split('T')[0]);
    const [toDate, setToDate] = useState<string>(() => filters.date_to || new Date().toISOString().split('T')[0]);
    const [routeId, setRouteId] = useState<string>(filters.route_id || 'all');
    const [repId, setRepId] = useState<string>(filters.rep_id || 'all');
    const [granularity, setGranularity] = useState<string>(filters.granularity || 'daily');

    const applyFilters = () => {
        if (!fromDate || !toDate) {
            alert('Please select a valid date range');
            return;
        }
        if (fromDate > toDate) {
            alert('From date cannot be after To date');
            return;
        }

        router.get('/reports/delivery-sale-invoices', {
            date_from: fromDate,
            date_to: toDate,
            route_id: routeId === 'all' ? '' : routeId,
            rep_id: repId === 'all' ? '' : repId,
            granularity,
        }, { preserveScroll: true });
    };

    const resetFilters = () => {
        setFromDate(new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString().split('T')[0]);
        setToDate(new Date().toISOString().split('T')[0]);
        setRouteId('all');
        setRepId('all');
        setGranularity('daily');
        router.get('/reports/delivery-sale-invoices', {}, { preserveState: false });
    };

    const formatCurrency = (val: number) => `Rs. ${val.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // grab company info for printing similar to profit page
    const company = pageProps.company ?? (pageProps.auth as any)?.user?.company ?? { name: '', branch: '', branch_code: '' };

    const normalizedCompanyCode = (company?.company_code || 'VIS001').toUpperCase();
    const printLogoSrc = normalizedCompanyCode.startsWith('MAL')
        ? '/images/malibu-logo.png'
        : normalizedCompanyCode === 'MASS'
            ? '/images/mass-logo.svg'
            : '/images/Vismass-logo.png';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Delivery Sale Invoices Report')}>
                <style>{`
                    .print-table-container {
                        display: none;
                    }
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

                        #printable-report,
                        #printable-report * {
                            visibility: visible;
                        }

                        #printable-report {
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
                        
                        .print-table-container {
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
                                font-size: 10px;
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
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow no-print">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4">
                            <div className="flex items-center space-x-3">
                                <Link href="/reports/delivery-summary" className="rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all">
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </Link>
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <Truck className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">{t('Delivery Sales')}</h1>
                                    <p className="text-xs text-white/80">{t('Route-wise and Sales-Rep-wise sales')}</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => window.print()} className="no-print inline-flex items-center rounded-lg bg-white px-3 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200">
                                    <Printer className="mr-2 h-4 w-4" />
                                    {t('Print / PDF')}
                                </button>
                                <a data-inertia="false" href={`/reports/delivery-sale-invoices/export?date_from=${fromDate}&date_to=${toDate}&route_id=${routeId === 'all' ? '' : routeId}&rep_id=${repId === 'all' ? '' : repId}`} className="no-print inline-flex items-center rounded-lg bg-white px-3 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200">
                                    <FileText className="mr-2 h-4 w-4" />
                                    {t('Export CSV')}
                                </a>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-7xl py-8 sm:px-6 lg:px-8">
                    <div id="printable-report" className="px-4 sm:px-0">
                        {/* Print header */}
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
                            <div className="print-title-compact">{t('Delivery Sale Invoices Report')}</div>
                        </div>

                        {/* Page Header Component (screen only) */}
                        {/* <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end no-print">
                            <div className="text-xs text-slate-600 mb-2 text-center">
                                {routeId !== 'all' ? `Route: ${(routes.find(r => String(r.id) === routeId)?.name ?? routeId)} • ` : ''}
                                {repId !== 'all' ? `Sales rep: ${(salesRepList.find((s: any) => String(s.id) === repId) ? getSalesRepName(salesRepList.find((s: any) => String(s.id) === repId)) : repId)} • ` : ''}
                                Total deliveries: {summary.total_deliveries} • Total items: {summary.total_items} • Total sales: Rs. {summary.total_sales.toFixed(2)}
                            </div>
                        </div> */}
                        {/* Payment Breakdown Table */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6 no-print">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead className="text-center font-bold text-slate-700 h-10 border-r">{t('Transactions')}</TableHead>
                                        <TableHead className="text-center font-bold text-slate-700 h-10 border-r">{t('Total Sales (Rs)')}</TableHead>
                                        <TableHead className="text-center font-bold text-slate-700 h-10 border-r">{t('Cash (Rs)')}</TableHead>
                                        <TableHead className="text-center font-bold text-slate-700 h-10 border-r">{t('Credit (Rs)')}</TableHead>
                                        <TableHead className="text-center font-bold text-slate-700 h-10 border-r">{t('Card (Rs)')}</TableHead>
                                        <TableHead className="text-center font-bold text-slate-700 h-10 border-r">{t('Cheque (Rs)')}</TableHead>
                                        <TableHead className="text-center font-bold text-slate-700 h-10">{t('Bank (Rs)')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow className="hover:bg-slate-50/50 transition-colors">
                                        <TableCell className="text-center text-vismass-blue font-bold text-lg border-r py-4">{summary.total_deliveries}</TableCell>
                                        <TableCell className="text-center text-green-600 font-bold text-lg border-r py-4">{summary.total_sales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                        <TableCell className="text-center text-green-600 font-bold text-lg border-r py-4">{summary.cash_total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                        <TableCell className="text-center text-green-600 font-bold text-lg border-r py-4">{summary.credit_total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                        <TableCell className="text-center text-green-600 font-bold text-lg border-r py-4">{summary.card_total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                        <TableCell className="text-center text-green-600 font-bold text-lg border-r py-4">{summary.cheque_total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                        <TableCell className="text-center text-green-600 font-bold text-lg py-4">{summary.bank_total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>

                        {/* KPI Cards */}
                        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4 no-print">
                            <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-blue-50 p-3">
                                        <DollarSign className="h-5 w-5 text-vismass-blue" />
                                    </div>
                                    <div className="ml-4 flex-1 min-w-0">
                                        <p className="text-xs font-medium text-slate-500 truncate">{t('Total Sales')}</p>
                                        <p className="text-base font-bold text-slate-900 truncate">{formatCurrency(summary.total_sales || 0)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-green-50 p-3">
                                        <Truck className="h-5 w-5 text-green-600" />
                                    </div>
                                    <div className="ml-4 flex-1 min-w-0">
                                        <p className="text-xs font-medium text-slate-500 truncate">{t('Deliveries')}</p>
                                        <p className="text-base font-bold text-slate-900 truncate">{summary.total_deliveries || 0}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-indigo-50 p-3">
                                        <Users className="h-5 w-5 text-indigo-600" />
                                    </div>
                                    <div className="ml-4 flex-1 min-w-0">
                                        <p className="text-xs font-medium text-slate-500 truncate">{t('Items Sold')}</p>
                                        <p className="text-base font-bold text-slate-900 truncate">{Number(summary.total_items || 0).toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-red-50 p-3">
                                        <DollarSign className="h-5 w-5 text-red-600" />
                                    </div>
                                    <div className="ml-4 flex-1 min-w-0">
                                        <p className="text-xs font-medium text-slate-500 truncate">{t('Outstanding')}</p>
                                        <p className="text-base font-bold text-slate-900 truncate">{formatCurrency(summary.outstanding || 0)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="mb-6 no-print">
                            <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                    <Label className="font-medium text-slate-700">{t('From')}</Label>
                                    <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-36 h-8" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Label className="font-medium text-slate-700">{t('To')}</Label>
                                    <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-36 h-8" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Label className="font-medium text-slate-700">{t('Route')}</Label>
                                    <Select value={routeId} onValueChange={(v) => setRouteId(v)}>
                                        <SelectTrigger className="w-36 h-8"><SelectValue placeholder={t('All Routes')} /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('All Routes')}</SelectItem>
                                            {routes.map(r => (<SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Label className="font-medium text-slate-700">{t('Sales Rep')}</Label>
                                    <Select value={repId} onValueChange={(v) => setRepId(v)}>
                                        <SelectTrigger className="w-36 h-8"><SelectValue placeholder={t('All Reps')} /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('All Reps')}</SelectItem>
                                            {salesRepList.map((s: any) => (
                                                <SelectItem key={s.id} value={String(s.id)}>
                                                    {getSalesRepName(s)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <button onClick={applyFilters} className="ml-2 inline-flex items-center text-vismass-blue hover:underline">
                                    {t('Apply')}
                                </button>
                                <button onClick={resetFilters} className="ml-2 inline-flex items-center text-slate-500 hover:underline">
                                    {t('Reset')}
                                </button>
                            </div>
                        </div>


                        <div className="no-print space-y-6">
                            {Object.keys(
                                by_invoice.reduce((groups, inv) => {
                                    const date = inv.delivery_date || 'Unknown Date';
                                    if (!groups[date]) {
                                        groups[date] = [];
                                    }
                                    groups[date].push(inv);
                                    return groups;
                                }, {} as Record<string, InvoiceSummary[]>)
                            ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).map(date => {
                                const dateInvoices = by_invoice.filter(inv => (inv.delivery_date || 'Unknown Date') === date);

                                return (
                                    <div key={`screen-${date}`} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                        <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-200">
                                            <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                                                <Calendar className="mr-2 h-5 w-5 text-vismass-blue" />
                                                {date}
                                            </h3>
                                        </div>
                                        <div className="p-0">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="bg-white hover:bg-white">
                                                        <TableHead className="font-semibold text-slate-700">{t('Invoice')}</TableHead>
                                                        <TableHead className="font-semibold text-slate-700">{t('Customer')}</TableHead>
                                                        <TableHead className="font-semibold text-slate-700">{t('Item Code')}</TableHead>
                                                        <TableHead className="font-semibold text-slate-700">{t('Item Name')}</TableHead>
                                                        <TableHead className="text-right font-semibold text-slate-700">{t('Qty')}</TableHead>
                                                        <TableHead className="text-right font-semibold text-slate-700">{t('Unit Price')}</TableHead>
                                                        <TableHead className="text-right font-semibold text-slate-700">{t('Total Price')}</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {dateInvoices.map((inv) => {
                                                        const itemsCount = inv.items?.length || 1;
                                                        
                                                        return (inv.items && inv.items.length > 0) ? (
                                                            inv.items.map((item, index) => (
                                                                <TableRow key={`${inv.delivery_id}-${index}`} className="hover:bg-slate-50/50 transition-colors group">
                                                                    {index === 0 && (
                                                                        <>
                                                                            <TableCell rowSpan={itemsCount} className="align-top border-r border-slate-100 bg-white group-hover:bg-white">
                                                                                <div className="font-mono text-sm text-vismass-blue font-medium">{inv.delivery_number}</div>
                                                                                {inv.payment_method && <div className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">{inv.payment_method}</div>}
                                                                            </TableCell>
                                                                            <TableCell rowSpan={itemsCount} className="align-top border-r border-slate-100 bg-white group-hover:bg-white">
                                                                                <div className="font-medium text-slate-800">{inv.customer_name || '-'}</div>
                                                                            </TableCell>
                                                                        </>
                                                                    )}
                                                                    <TableCell className="text-slate-600 font-mono text-sm">{item.item_code}</TableCell>
                                                                    <TableCell className="text-slate-700">{item.item_name}</TableCell>
                                                                    <TableCell className="text-right font-medium text-slate-700">{Number(item.quantity).toFixed(2)}</TableCell>
                                                                    <TableCell className="text-right text-slate-600">{Number(item.unit_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                                                                    <TableCell className="text-right font-semibold text-slate-800">{Number(item.line_total).toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                                                                </TableRow>
                                                            ))
                                                        ) : (
                                                            <TableRow key={inv.delivery_id} className="hover:bg-slate-50/50">
                                                                <TableCell className="align-top border-r border-slate-100 bg-white group-hover:bg-white">
                                                                    <div className="font-mono text-sm text-vismass-blue font-medium">{inv.delivery_number}</div>
                                                                    {inv.payment_method && <div className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">{inv.payment_method}</div>}
                                                                </TableCell>
                                                                <TableCell className="align-top font-medium text-slate-800 border-r border-slate-100">{inv.customer_name || '-'}</TableCell>
                                                                <TableCell className="text-center text-slate-400" colSpan={4}>{t('No items')}</TableCell>
                                                                <TableCell className="text-right font-semibold text-slate-800">0.00</TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Print Table - Only visible in print */}
                        <div className="print-table-container">
                            {Object.keys(
                                by_invoice.reduce((groups, inv) => {
                                    const date = inv.delivery_date || 'Unknown Date';
                                    if (!groups[date]) {
                                        groups[date] = [];
                                    }
                                    groups[date].push(inv);
                                    return groups;
                                }, {} as Record<string, InvoiceSummary[]>)
                            ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).map(date => {
                                const dateInvoices = by_invoice.filter(inv => (inv.delivery_date || 'Unknown Date') === date);

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
                                                    <th style={{ textAlign: 'right' }}>Qty</th>
                                                    <th style={{ textAlign: 'right' }}>Unit Price</th>
                                                    <th style={{ textAlign: 'right' }}>Total Price</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {dateInvoices.map((inv) => {
                                                    const itemsCount = inv.items?.length || 1;
                                                    
                                                    return (inv.items && inv.items.length > 0) ? (
                                                        inv.items.map((item, index) => (
                                                            <tr key={`${inv.delivery_id}-${index}`}>
                                                                {index === 0 && (
                                                                    <>
                                                                        <td rowSpan={itemsCount}>
                                                                            {inv.delivery_number}
                                                                            {inv.payment_method ? <><br/><span style={{fontSize: '9px', textTransform: 'uppercase', color: '#666'}}>{inv.payment_method}</span></> : ''}
                                                                        </td>
                                                                        <td rowSpan={itemsCount}>{inv.customer_name || '-'}</td>
                                                                    </>
                                                                )}
                                                                <td>{item.item_code}</td>
                                                                <td>{item.item_name}</td>
                                                                <td style={{ textAlign: 'right' }}>{Number(item.quantity).toFixed(2)}</td>
                                                                <td style={{ textAlign: 'right' }}>{Number(item.unit_price).toFixed(2)}</td>
                                                                <td style={{ textAlign: 'right' }}>{Number(item.line_total).toFixed(2)}</td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr key={inv.delivery_id}>
                                                            <td>
                                                                {inv.delivery_number}
                                                                {inv.payment_method ? <><br/><span style={{fontSize: '9px', textTransform: 'uppercase', color: '#666'}}>{inv.payment_method}</span></> : ''}
                                                            </td>
                                                            <td>{inv.customer_name || '-'}</td>
                                                            <td>-</td>
                                                            <td>-</td>
                                                            <td style={{ textAlign: 'right' }}>0.00</td>
                                                            <td style={{ textAlign: 'right' }}>0.00</td>
                                                            <td style={{ textAlign: 'right' }}>0.00</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer Note */}
                        <div className="text-center mt-8 text-slate-600 no-print">
                            <p className="text-sm">{t('Delivery sales — filter by route or sales rep to drill down')}</p>
                        </div>

                        {/* Print Footer */}
                        <div className="print-footer" style={{ display: 'none' }}>
                            <span>Developed by Unitec Software Solution</span>
                            <span>Printed on: {new Date().toLocaleString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                            })}</span>
                        </div>
                    </div>
                </main>
            </div>
        </AppLayout>
    );
}

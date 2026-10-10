import { useState } from 'react';
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

// structure returned from the controller for individual item aggregates
interface ItemInfo {
    name: string;
    quantity: number;
}

// for modal/detail view we need the full record
interface ItemDetail extends ItemInfo {
    delivery_number: string;
    item_code?: string | null;
    batch_no?: string | null;
    unit_price?: number | null;
    total_amount?: number | null;
}


interface ItemWiseSummary {
    item_code: string;
    item_name: string;
    quantity: number;
    total_amount: number;
    avg_price: number;
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
    by_item: ItemWiseSummary[];
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

export default function DeliverySaleItemsReport({ summary, by_item = [], filters, routes, salesReps }: Props) {
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

        router.get('/reports/delivery-sale-items', {
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
        router.get('/reports/delivery-sale-items', {}, { preserveState: false });
    };

    const formatCurrency = (val: number) => `Rs. ${val.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // grab company info for printing similar to profit page
    const company = pageProps.company ?? (pageProps.auth as any)?.user?.company ?? { name: '', branch: '', branch_code: '' };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Delivery Sale Items Report')}>
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

                        .print-header {
                            margin-bottom: 20px;
                            border-bottom: 2px solid #000;
                            padding-bottom: 10px;
                            display: block !important;
                        }

                        .print-company-name {
                            font-size: 24px;
                            font-weight: bold;
                            text-align: center;
                            margin-bottom: 5px;
                        }

                        .print-report-title {
                            font-size: 18px;
                            font-weight: bold;
                            text-align: center;
                            margin-bottom: 15px;
                        }

                        /* remove cards/borders */
                        #printable-report .rounded-2xl,
                        #printable-report .rounded-xl,
                        #printable-report .bg-white,
                        #printable-report .border,
                        #printable-report .shadow-md,
                        #printable-report .shadow-sm {
                            border: none !important;
                            box-shadow: none !important;
                        }

                        /* table styles */
                        table {
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
                            color: #000 !important;
                        }

                        .balance-row {
                            background-color: #f3f4f6 !important;
                            font-weight: bold;
                            color: #000 !important;
                            border-top: 2px solid #000 !important;
                        }

                        .closing-total {
                            text-align: right !important;
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
                                <a data-inertia="false" href={`/reports/delivery-sale-items/export?date_from=${fromDate}&date_to=${toDate}&route_id=${routeId === 'all' ? '' : routeId}&rep_id=${repId === 'all' ? '' : repId}`} className="no-print inline-flex items-center rounded-lg bg-white px-3 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200">
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
                        <div className="hidden print:block print-header mb-4">
                            <div className="mb-4 text-center">
                                <div className="print-company-name" style={{ marginBottom: '4px' }}>{company?.name || ''}</div>
                                <div className="text-sm font-medium">{company?.branch || ''}{company?.branch_code ? ` • ${company.branch_code}` : ''}</div>
                                <div className="print-report-title mt-2">{t('Delivery Sales Report')}</div>
                            </div>
                            <div className="flex justify-between text-[10px] mb-3">
                                <div>
                                    <strong>Report period:</strong> {fromDate} — {toDate}
                                </div>
                                <div className="text-right">
                                    {routeId !== 'all' && <><strong>Route:</strong> {routes.find(r => String(r.id) === routeId)?.name ?? routeId}<br /></>}
                                    {repId !== 'all' && <><strong>Sales rep:</strong> {(salesRepList.find((s: any) => String(s.id) === repId) ? getSalesRepName(salesRepList.find((s: any) => String(s.id) === repId)) : repId)}<br /></>}
                                </div>
                            </div>
                            <div className="text-xs text-slate-600 mb-2 text-center">
                                {routeId !== 'all' ? `Route: ${(routes.find(r => String(r.id) === routeId)?.name ?? routeId)} • ` : ''}
                                {repId !== 'all' ? `Sales rep: ${(salesRepList.find((s: any) => String(s.id) === repId) ? getSalesRepName(salesRepList.find((s: any) => String(s.id) === repId)) : repId)} • ` : ''}
                                Total deliveries: {summary.total_deliveries} • Total items: {summary.total_items} • Total sales: Rs. {summary.total_sales.toFixed(2)}
                            </div>
                        </div>
                        {/* Payment Breakdown Table */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
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
                                    <TableRow className="hover:bg-transparent">
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
                        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
                            <div className="rounded-xl bg-white p-3 shadow-sm border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue p-2">
                                        <DollarSign className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-2 flex-1 min-w-0">
                                        <p className="text-xs font-medium text-slate-600 truncate">{t('Total Sales')}</p>
                                        <p className="text-sm font-bold text-slate-900 truncate">{formatCurrency(summary.total_sales || 0)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl bg-white p-3 shadow-sm border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-green-600 p-2">
                                        <Truck className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-2 flex-1 min-w-0">
                                        <p className="text-xs font-medium text-slate-600 truncate">{t('Deliveries')}</p>
                                        <p className="text-sm font-bold text-slate-900 truncate">{summary.total_deliveries || 0}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl bg-white p-3 shadow-sm border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-indigo-600 p-2">
                                        <Users className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-2 flex-1 min-w-0">
                                        <p className="text-xs font-medium text-slate-600 truncate">{t('Items Sold')}</p>
                                        <p className="text-sm font-bold text-slate-900 truncate">{Number(summary.total_items || 0).toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl bg-white p-3 shadow-sm border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue p-2">
                                        <DollarSign className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-2 flex-1 min-w-0">
                                        <p className="text-xs font-medium text-slate-600 truncate">{t('Outstanding')}</p>
                                        <p className="text-sm font-bold text-slate-900 truncate">{formatCurrency(summary.outstanding || 0)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-slate-700">{t('From')}</Label>
                                    <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="border-slate-200" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-slate-700">{t('To')}</Label>
                                    <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="border-slate-200" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-slate-700">{t('Route')}</Label>
                                    <Select value={routeId} onValueChange={(v) => setRouteId(v)}>
                                        <SelectTrigger className="border-slate-200"><SelectValue placeholder={t('All Routes')} /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('All Routes')}</SelectItem>
                                            {routes.map(r => (<SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-slate-700">{t('Sales Rep')}</Label>
                                    <Select value={repId} onValueChange={(v) => setRepId(v)}>
                                        <SelectTrigger className="border-slate-200"><SelectValue placeholder={t('All Reps')} /></SelectTrigger>
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
                            </div>

                            <div className="flex gap-3 mt-4">
                                <button onClick={applyFilters} className="inline-flex items-center rounded-xl bg-vismass-blue px-4 py-2 text-sm font-medium text-white">
                                    <Filter className="mr-2 h-4 w-4" />
                                    {t('Apply')}
                                </button>
                                <button onClick={resetFilters} className="inline-flex items-center rounded-xl bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700">
                                    {t('Reset')}
                                </button>
                                <div className="ml-auto text-sm text-slate-500 flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    {fromDate} — {toDate}
                                </div>
                            </div>
                        </div>


                            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-6">
                                <h3 className="text-lg font-semibold text-slate-800 mb-4">{t('Sales by Item')}</h3>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Item Code')}</TableHead>
                                            <TableHead className="w-1/3">{t('Item Name')}</TableHead>
                                            <TableHead>{t('Total Qty Sold')}</TableHead>
                                            <TableHead>{t('Avg Price (Rs)')}</TableHead>
                                            <TableHead>{t('Total Sales (Rs)')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {by_item.length === 0 && (
                                            <TableRow><TableCell colSpan={5} className="text-center">{t('No data found')}</TableCell></TableRow>
                                        )}
                                        {by_item.map((it, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell className="font-mono">{it.item_code}</TableCell>
                                                <TableCell>{it.item_name}</TableCell>
                                                <TableCell>{Number(it.quantity || 0).toFixed(2)}</TableCell>
                                                <TableCell>{Number(it.avg_price).toFixed(2)}</TableCell>
                                                <TableCell className="font-semibold text-vismass-blue">{Number(it.total_amount).toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>


                        {/* Footer Note */}
                        <div className="text-center mt-8 text-slate-600">
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

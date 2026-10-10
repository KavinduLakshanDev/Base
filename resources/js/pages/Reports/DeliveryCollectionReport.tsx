import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import AppLogo from '@/components/app-logo';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem, PageProps } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Printer, ArrowLeft, DollarSign } from 'lucide-react';
import { Link } from '@inertiajs/react';

interface Props {
    summary: any;
    by_rep: Array<any>;
    filters: any;
    payment_methods: string[];
    salesReps: Array<any>;
    routes: Array<any>;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: t('Dashboard'), href: '/dashboard' },
    // { title: t('Reports'), href: '/reports' },
    { title: t('Delivery Collections'), href: '/reports/delivery-collections' },
];

export default function DeliveryCollectionReport({ summary, by_rep, filters, payment_methods, salesReps, routes }: Props) {
    const [fromDate, setFromDate] = useState<string>(() => filters.date_from || new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString().split('T')[0]);
    const [toDate, setToDate] = useState<string>(() => filters.date_to || new Date().toISOString().split('T')[0]);
    const [repId, setRepId] = useState<string>(filters.rep_id || 'all');
    const [routeId, setRouteId] = useState<string>(filters.route_id || 'all');
    const [paymentMethod, setPaymentMethod] = useState<string>(filters.payment_method || 'all');
    const [compareWithPrevious, setCompareWithPrevious] = useState<boolean>(filters.compare_with_previous ?? true);

    const { props: pageProps } = usePage<PageProps>();
    const company = (pageProps as any).company ?? (pageProps.auth as any)?.user?.company ?? { name: '', branch: '', branch_code: '', code: '' };

    const applyFilters = () => {
        if (!fromDate || !toDate) {
            alert('Please select a valid date range');
            return;
        }
        if (fromDate > toDate) {
            alert('From date cannot be after To date');
            return;
        }

        router.get('/reports/delivery-collections', {
            date_from: fromDate,
            date_to: toDate,
            rep_id: repId === 'all' ? '' : repId,
            route_id: routeId === 'all' ? '' : routeId,
            payment_method: paymentMethod === 'all' ? '' : paymentMethod,
            compare_with_previous: compareWithPrevious ? 1 : 0,
        }, { preserveScroll: true });
    };

    const resetFilters = () => {
        setFromDate(new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString().split('T')[0]);
        setToDate(new Date().toISOString().split('T')[0]);
        setRepId('all');
        setRouteId('all');
        setPaymentMethod('all');
        setCompareWithPrevious(true);
        router.get('/reports/delivery-collections', {}, { preserveState: false });
    };

    const formatCurrency = (val: number) => `Rs. ${val.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Delivery Collections')} />

            <div className="min-h-screen bg-slate-50">
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow no-print">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-center space-x-3">
                                <Link href="/reports/delivery-summary" className="rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all">
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </Link>
                                <div className="shrink-0 rounded-lg bg-white/20 p-2 shadow">
                                    <DollarSign className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="truncate text-lg sm:text-xl font-bold text-white">{t('Delivery Collections')}</h1>
                                    <p className="hidden text-xs text-white/80 sm:block">{t('Collections by payment method and sales rep')}</p>
                                </div>
                            </div>
                            <div className="flex w-full gap-2 sm:w-auto sm:gap-3">
                                <a data-inertia="false" href={`/reports/delivery-collections/export?date_from=${fromDate}&date_to=${toDate}&rep_id=${repId === 'all' ? '' : repId}&route_id=${routeId === 'all' ? '' : routeId}&payment_method=${paymentMethod === 'all' ? '' : paymentMethod}`} className="no-print inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-white px-3 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200">
                                    <FileText className="mr-2 h-4 w-4" />
                                    {t('Export CSV')}
                                </a>
                                <button onClick={() => window.print()} className="no-print inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-white px-3 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200">
                                    <Printer className="mr-2 h-4 w-4" />
                                    {t('Print')}
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        {/* print-only header */}
                        <div className="hidden print:block print-header mb-6">
                            <div className="mb-4 text-center">
                                <div className="mx-auto mb-2" style={{ width: '140px' }}>
                                    <AppLogo companyCode={company?.code} />
                                </div>
                                <div className="print-company-name" style={{ marginBottom: '4px' }}>{company?.name ?? ''}</div>
                                <div className="text-sm font-medium">{company?.branch ?? ''} {company?.branch_code ? ` • ${company.branch_code}` : ''}</div>
                                <div className="print-report-title mt-2">Delivery Collections</div>
                            </div>
                        </div>

                        {/* print-only filter summary */}
                        <div className="hidden print:block mb-6 text-sm text-slate-600">
                            <p>{t('Date Range')}: {fromDate} — {toDate}</p>
                            <p>{t('Sales Rep')}: {repId === 'all' ? t('All Reps') : (salesReps.find(r => String(r.id) === repId)?.first_name + ' ' + salesReps.find(r => String(r.id) === repId)?.last_name)}</p>
                            <p>{t('Route')}: {routeId === 'all' ? t('All Routes') : (routes.find(r => String(r.id) === routeId)?.name)}</p>
                            <p>{t('Payment Method')}: {paymentMethod === 'all' ? t('All Methods') : paymentMethod}</p>
                            <p>{t('Compare with previous period')}: {compareWithPrevious ? t('Yes') : t('No')}</p>
                        </div>

                        {/* KPI */}
                        <div className="no-print mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
                            <div className="rounded-xl bg-white p-3 shadow-sm border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue p-2">
                                        <DollarSign className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-2 flex-1 min-w-0">
                                        <p className="text-xs font-medium text-slate-600 truncate">{t('Total Collections')}</p>
                                        <p className="text-sm font-bold text-slate-900 truncate">{formatCurrency(summary.total_collections || 0)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl bg-white p-3 shadow-sm border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-green-600 p-2">
                                        <DollarSign className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-2 flex-1 min-w-0">
                                        <p className="text-xs font-medium text-slate-600 truncate">{t('Cash')}</p>
                                        <p className="text-sm font-bold text-slate-900 truncate">{formatCurrency(summary.payment_methods?.cash || 0)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl bg-white p-3 shadow-sm border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-indigo-600 p-2">
                                        <DollarSign className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-2 flex-1 min-w-0">
                                        <p className="text-xs font-medium text-slate-600 truncate">{t('Card')}</p>
                                        <p className="text-sm font-bold text-slate-900 truncate">{formatCurrency(summary.payment_methods?.card || 0)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl bg-white p-3 shadow-sm border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue p-2">
                                        <DollarSign className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-2 flex-1 min-w-0">
                                        <p className="text-xs font-medium text-slate-600 truncate">{t('Bank / Cheque')}</p>
                                        <p className="text-sm font-bold text-slate-900 truncate">{formatCurrency((summary.payment_methods?.bank || 0) + (summary.payment_methods?.cheque || 0))}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="no-print bg-white rounded-2xl shadow-lg border border-slate-200 p-4 sm:p-6 mb-6">
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
                                    <Label className="text-sm font-medium text-slate-700">{t('Sales Rep')}</Label>
                                    <Select value={repId} onValueChange={(v) => setRepId(v)}>
                                        <SelectTrigger className="border-slate-200"><SelectValue placeholder={t('All Reps')} /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('All Reps')}</SelectItem>
                                            {salesReps.map(s => (<SelectItem key={s.id} value={String(s.id)}>{s.first_name} {s.last_name}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-slate-700">{t('Payment Method')}</Label>
                                    <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v)}>
                                        <SelectTrigger className="border-slate-200"><SelectValue placeholder={t('All Methods')} /></SelectTrigger>
                                        <SelectContent>
                                            {payment_methods.map(m => (<SelectItem key={m} value={m}>{m === 'all' ? t('All Methods') : m.charAt(0).toUpperCase() + m.slice(1)}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                                <label className="inline-flex items-center gap-2 text-sm">
                                    <input type="checkbox" checked={compareWithPrevious} onChange={(e) => setCompareWithPrevious(e.target.checked)} className="h-4 w-4" />
                                    <span className="text-slate-700">{t('Compare with previous period')}</span>
                                </label>
                                <div className="flex w-full gap-3 sm:ml-auto sm:w-auto">
                                    <button onClick={applyFilters} className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl bg-vismass-blue px-4 py-2 text-sm font-medium text-white">
                                        {t('Apply')}
                                    </button>
                                    <button onClick={resetFilters} className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700">
                                        {t('Reset')}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* By Rep Table */}
                        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-4 sm:p-6 mb-6">
                            <h3 className="text-lg font-semibold text-slate-800 mb-4">{t('Collections by Sales Rep')}</h3>
                            <div className="overflow-x-auto">
                            <Table className="min-w-[680px]">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-1/3">{t('Sales Rep')}</TableHead>
                                        <TableHead>{t('This Period (Rs.)')}</TableHead>
                                        <TableHead>{t('Previous Period (Rs.)')}</TableHead>
                                        <TableHead>{t('Change (%)')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {by_rep.length === 0 && (
                                        <TableRow><TableCell colSpan={4} className="text-center">{t('No data found')}</TableCell></TableRow>
                                    )}
                                    {by_rep.map((r) => (
                                        <TableRow key={String(r.rep_id || r.rep_name)}>
                                            <TableCell>{r.rep_name}</TableCell>
                                            <TableCell>{formatCurrency(r.this_period || 0)}</TableCell>
                                            <TableCell>{formatCurrency(r.previous_period || 0)}</TableCell>
                                            <TableCell>{r.delta_percent}%</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            </div>
                        </div>

                        <div className="no-print text-center mt-8 text-slate-600">
                            <p className="text-sm">{t('Collection breakdown for deliveries — compare periods and filter by payment method or sales rep')}</p>
                        </div>
                    </div>
                </main>
            </div>
        </AppLayout>
    );
}

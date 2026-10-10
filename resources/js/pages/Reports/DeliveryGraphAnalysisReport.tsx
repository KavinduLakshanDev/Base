import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Filter, Calendar, Truck, Users, BarChart3, DollarSign, CheckCircle } from 'lucide-react';
import { Link } from '@inertiajs/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';

interface Props {
    summary: {
        total_deliveries: number;
        total_items: number;
        total_sales: number;
        total_collections: number;
        outstanding: number;
    };
    time_series: Array<any>;
    by_route: Array<any>;
    by_rep: Array<any>;
    filters: {
        date_from?: string;
        date_to?: string;
        route_id?: string | null;
        rep_id?: string | null;
        granularity?: string;
    };
    routes: Array<any>;
    salesReps: Array<any>;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: t('Dashboard'), href: '/dashboard' },
    // { title: t('Reports'), href: '/reports' },
    { title: t('Delivery Graph Analysis'), href: '/reports/delivery-graph-analysis' },
];

export default function DeliveryGraphAnalysisReport({ summary, time_series, by_route, by_rep, filters, routes, salesReps }: Props) {
    const [fromDate, setFromDate] = useState<string>(() => filters.date_from || new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString().split('T')[0]);
    const [toDate, setToDate] = useState<string>(() => filters.date_to || new Date().toISOString().split('T')[0]);
    const [routeId, setRouteId] = useState<string>(filters.route_id || 'all');
    const [repId, setRepId] = useState<string>(filters.rep_id || 'all');
    const [granularity, setGranularity] = useState<string>(filters.granularity || 'daily');

    const { props: pageProps } = usePage();
    const company = (pageProps as any).company ?? (pageProps.auth as any)?.user?.company ?? { name: '', branch: '', branch_code: '' };

    const applyFilters = () => {
        if (!fromDate || !toDate) {
            alert('Please select a valid date range');
            return;
        }
        if (fromDate > toDate) {
            alert('From date cannot be after To date');
            return;
        }

        router.get('/reports/delivery-graph-analysis', {
            date_from: fromDate,
            date_to: toDate,
            route_id: routeId === 'all' ? '' : routeId,
            rep_id: repId === 'all' ? '' : repId,
            granularity: granularity,
        }, { preserveScroll: true });
    };

    const resetFilters = () => {
        setFromDate(new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString().split('T')[0]);
        setToDate(new Date().toISOString().split('T')[0]);
        setRouteId('all');
        setRepId('all');
        setGranularity('daily');
        router.get('/reports/delivery-graph-analysis', {}, { preserveState: false });
    };

    const formatCurrency = (val: number) => `Rs. ${val.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Delivery Graph Analysis Report')} />

            <div className="min-h-screen bg-slate-50">
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow no-print">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-center space-x-3">
                                <Link href="/reports" className="shrink-0 rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all">
                                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                </Link>
                                <div className="shrink-0 rounded-lg bg-white/20 p-2 shadow">
                                    <BarChart3 className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="truncate text-lg sm:text-xl font-bold text-white">{t('Delivery Graph Analysis')}</h1>
                                    <p className="hidden text-xs text-white/80 sm:block">{t('Time-series and leaderboards for deliveries')}</p>
                                </div>
                            </div>
                            {/* <div className="flex gap-3">
                                <a data-inertia="false" href={`/reports/delivery-graph-analysis/export?date_from=${fromDate}&date_to=${toDate}&route_id=${routeId === 'all' ? '' : routeId}&rep_id=${repId === 'all' ? '' : repId}`} className="no-print inline-flex items-center rounded-lg bg-white px-3 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200">
                                    <FileText className="mr-2 h-4 w-4" />
                                    {t('Export CSV')}
                                </a>
                                <button onClick={() => window.print()} className="no-print inline-flex items-center rounded-lg bg-white px-3 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200">
                                    <Printer className="mr-2 h-4 w-4" />
                                    {t('Print')}
                                </button>
                            </div> */}
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">

                        {/* KPI Cards */}
                        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
                            <div className="rounded-xl bg-white p-3 shadow-sm border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue p-2">
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
                                        <p className="text-xs font-medium text-slate-600 truncate">{t('Items')}</p>
                                        <p className="text-sm font-bold text-slate-900 truncate">{summary.total_items || 0}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl bg-white p-3 shadow-sm border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-green-600 p-2">
                                        <DollarSign className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-2 flex-1 min-w-0">
                                        <p className="text-xs font-medium text-slate-600 truncate">{t('Sales')}</p>
                                        <p className="text-sm font-bold text-slate-900 truncate">{formatCurrency(summary.total_sales || 0)}</p>
                                        <div className="mt-2 h-8">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={(time_series || []).slice(-12)}>
                                                    <Line dataKey="sales" stroke="#10b981" strokeWidth={2} dot={false} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl bg-white p-3 shadow-sm border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue p-2">
                                        <CheckCircle className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-2 flex-1 min-w-0">
                                        <p className="text-xs font-medium text-slate-600 truncate">{t('Collections')}</p>
                                        <p className="text-sm font-bold text-slate-900 truncate">{formatCurrency(summary.total_collections || 0)}</p>
                                        <div className="mt-2 h-8">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={(time_series || []).slice(-12)}>
                                                    <Line dataKey="collections" stroke="#f97316" strokeWidth={2} dot={false} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-4 sm:p-6 mb-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
                                            {salesReps.map((s:any) => (<SelectItem key={s.id} value={String(s.id)}>{s.first_name} {s.last_name}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-slate-700">{t('Granularity')}</Label>
                                    <Select value={granularity} onValueChange={(v) => setGranularity(v)}>
                                        <SelectTrigger className="border-slate-200"><SelectValue placeholder={t('Daily')} /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="daily">Daily</SelectItem>
                                            <SelectItem value="weekly">Weekly</SelectItem>
                                            <SelectItem value="monthly">Monthly</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                                <button onClick={applyFilters} className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl bg-vismass-blue px-4 py-2 text-sm font-medium text-white">
                                    <Filter className="mr-2 h-4 w-4" />
                                    {t('Apply')}
                                </button>
                                <button onClick={resetFilters} className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700">
                                    {t('Reset')}
                                </button>
                                <div className="text-sm text-slate-500 flex items-center gap-2 sm:ml-auto">
                                    <Calendar className="h-4 w-4" />
                                    {fromDate} — {toDate}
                                </div>
                            </div>
                        </div>

                        {/* Time-series Chart */}
                        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-4 sm:p-6 mb-6">
                            <h3 className="text-lg font-semibold text-slate-800 mb-4">{t('Deliveries & Collections (Time-series)')}</h3>
                            <div style={{ width: '100%', height: 260 }} className="sm:h-[300px]">
                                <ResponsiveContainer>
                                    <LineChart data={time_series} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" />

                                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                        <YAxis tickFormatter={(v) => (v >= 1000 ? `${(v/1000).toFixed(1)}k` : `${v}`)} />
                                        <Tooltip formatter={(value: any) => `Rs. ${Number(value).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`} />
                                        <Legend verticalAlign="top" align="right" wrapperStyle={{ top: -10 }} />
                                        <Line type="monotone" dataKey="sales" stroke="var(--color-vismass-blue)" name="Sales" strokeWidth={2} dot={false} />
                                        <Line type="monotone" dataKey="collections" stroke="#10b981" name="Collections" strokeWidth={2} dot={false} />

                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="sales" stroke="var(--color-vismass-blue)" name="Sales" strokeWidth={2} />
                                        <Line type="monotone" dataKey="collections" stroke="#10b981" name="Collections" strokeWidth={2} />

                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* By Route & By Rep */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-4 sm:p-6">
                                <h3 className="text-lg font-semibold text-slate-800 mb-4">{t('Top Routes')}</h3>
                                <div style={{ width: '100%', height: 230 }} className="sm:h-[250px]">
                                    <ResponsiveContainer>
                                        <BarChart data={(by_route || []).slice(0, 8)}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="route_name" tick={{ fontSize: 12 }} />
                                            <YAxis tickFormatter={(v) => (v >= 1000 ? `${(v/1000).toFixed(1)}k` : `${v}`)} />
                                            <Tooltip formatter={(value: any) => `Rs. ${Number(value).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`} />
                                            <Bar dataKey="sales" fill="#6366F1" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="overflow-x-auto">
                                <Table className="mt-4 min-w-[560px]">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Route</TableHead>
                                            <TableHead className="text-right">Deliveries</TableHead>
                                            <TableHead className="text-right">Items</TableHead>
                                            <TableHead className="text-right">Sales</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {by_route.length === 0 && (
                                            <TableRow><TableCell colSpan={4} className="text-center">{t('No data found')}</TableCell></TableRow>
                                        )}
                                        {by_route.map((r:any) => (
                                            <TableRow key={r.route_id} className="hover:bg-slate-50">
                                                <TableCell><Link href={`/reports/delivery-sales?route_id=${r.route_id}`}>{r.route_name}</Link></TableCell>
                                                <TableCell className="text-right">{r.deliveries}</TableCell>
                                                <TableCell className="text-right">{r.items}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(r.sales)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-4 sm:p-6">
                                <h3 className="text-lg font-semibold text-slate-800 mb-4">{t('Top Sales Reps')}</h3>
                                <div style={{ width: '100%', height: 230 }} className="sm:h-[250px]">
                                    <ResponsiveContainer>
                                        <BarChart data={(by_rep || []).slice(0, 8)}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="rep_name" tick={{ fontSize: 12 }} />
                                            <YAxis tickFormatter={(v) => (v >= 1000 ? `${(v/1000).toFixed(1)}k` : `${v}`)} />
                                            <Tooltip formatter={(value: any) => `Rs. ${Number(value).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`} />
                                            <Bar dataKey="sales" fill="#f97316" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="overflow-x-auto">
                                <Table className="mt-4 min-w-[560px]">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Sales Rep</TableHead>
                                            <TableHead className="text-right">Deliveries</TableHead>
                                            <TableHead className="text-right">Items</TableHead>
                                            <TableHead className="text-right">Sales</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {by_rep.length === 0 && (
                                            <TableRow><TableCell colSpan={4} className="text-center">{t('No data found')}</TableCell></TableRow>
                                        )}
                                        {by_rep.map((r:any) => (
                                            <TableRow key={r.rep_id} className="hover:bg-slate-50">
                                                <TableCell><Link href={`/reports/delivery-sales?rep_id=${r.rep_id}`}>{r.rep_name}</Link></TableCell>
                                                <TableCell className="text-right">{r.deliveries}</TableCell>
                                                <TableCell className="text-right">{r.items}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(r.sales)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                </div>
                            </div>
                        </div>

                        <div className="text-center mt-8 text-slate-600">
                            <p className="text-sm">{t('Graph analysis — click any route or rep to drill down to the Delivery Sales report')}</p>
                        </div>
                    </div>
                </main>
            </div>
        </AppLayout>
    );
}

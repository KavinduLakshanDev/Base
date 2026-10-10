import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import AppLogo from '@/components/app-logo';
import { Head, router, usePage } from '@inertiajs/react';
import { t } from '@/lib/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Filter, Printer, ArrowLeft } from 'lucide-react';
import { PageProps } from '@/types';

interface ItemRow {
    itmky?: string;
    item_code: string;
    item_name: string;
    qty_sold: number;
    revenue: number;
    avg_price: number;
    movement_category?: string | null;
}

interface DeliveryItemMovementProps extends PageProps {
    items: ItemRow[];
    by_group?: Record<string, ItemRow[]>;
    summary: {
        total_qty: number;
        total_revenue: number;
    };
    filters: {
        date_from: string;
        date_to: string;
        group_by: string;
        route_id?: string | null;
        rep_id?: string | null;
        top_n: number;
    };
    routes: Array<{ id: number; name: string }>;
    salesReps: Array<{ id: number; first_name: string; last_name: string }>;
}

export default function DeliveryItemMovement({ items = [], by_group = {}, summary, filters, routes = [], salesReps = [] }: DeliveryItemMovementProps) {
    const [local, setLocal] = useState({
        date_from: filters.date_from || new Date().toISOString().split('T')[0],
        date_to: filters.date_to || new Date().toISOString().split('T')[0],
        group_by: filters.group_by || 'global',
        route_id: filters.route_id || 'all',
        rep_id: filters.rep_id || 'all',
        top_n: (filters.top_n || 20).toString(),
    });

    const handleChange = (key: string, value: string) => setLocal(prev => ({ ...prev, [key]: value }));

    const applyFilters = () => {
        const q: any = { ...local };
        if (q.route_id === 'all') q.route_id = '';
        if (q.rep_id === 'all') q.rep_id = '';
        router.get('/reports/delivery-item-movement', q, { preserveState: true, replace: true });
    };

    const resetFilters = () => {
        const today = new Date().toISOString().split('T')[0];
        const defaults = { date_from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0], date_to: today, group_by: 'global', route_id: 'all', rep_id: 'all', top_n: '20' };
        setLocal(defaults);
        router.get('/reports/delivery-item-movement', {}, { preserveState: false, replace: true });
    };

    const exportCsv = () => {
        const params = new URLSearchParams(local as any);
        if (params.get('route_id') === 'all') params.set('route_id', '');
        if (params.get('rep_id') === 'all') params.set('rep_id', '');
        window.location.href = `/reports/delivery-item-movement/export?${params.toString()}`;
    };

    const formatCurrency = (amount: number) => `Rs ${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const topItem = items.length ? items[0] : null;

    const { props: pageProps } = usePage<PageProps>();
    const company = (pageProps as any).company ?? (pageProps.auth as any)?.user?.company ?? { name: '', branch: '', branch_code: '' };

    return (
        <AppLayout
            breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }, { title: 'Fast/Slow Moving Items', href: '/reports/delivery-item-movement' }]}
        >
            <Head title={t('Fast / Slow Moving Items')}>
                <style>{`
                    @media print {
                        @page {
                            size: A4 portrait;
                            margin: 10mm;
                        }
                        body, html {
                            height: auto !important;
                            overflow: visible !important;
                            font-size: 10px !important;
                            font-family: Arial, Helvetica, sans-serif !important;
                        }
                        body * {
                            visibility: hidden;
                        }
                        /* reset container flow */
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
                        <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-center space-x-3">
                                <button onClick={() => window.history.back()} className="shrink-0 rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all" title="Go Back">
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </button>
                                <div className="shrink-0 rounded-lg bg-white/20 p-2 shadow">
                                    <BarChart3 className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="truncate text-lg sm:text-xl font-bold text-white">Fast / Slow Moving Items</h1>
                                    <p className="hidden text-xs text-white/80 sm:block">Route & sales-rep level movement analysis</p>
                                </div>
                            </div>

                            <div className="flex w-full gap-2 sm:w-auto">
                                <button onClick={exportCsv} className="no-print inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200">
                                    <Printer className="mr-1.5 h-4 w-4" />
                                    Export CSV
                                </button>
                                <button onClick={() => window.print()} className="no-print inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200">
                                    <Printer className="mr-1.5 h-4 w-4" />
                                    Print
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div id="printable-report" className="px-4 sm:px-0">
                        {/* Print Header - only visible in print preview */}
                        <div className="hidden print:block print-header mb-4">
                            <div className="mb-4 text-center">
                            <div className="mx-auto mb-2" style={{ width: '140px' }}>
                                <AppLogo companyCode={(company as any)?.code || (company as any)?.branch_code || ''} />
                            </div>
                            <div className="print-company-name" style={{ marginBottom: '4px' }}>{company?.name ?? ''}</div>
                            <div className="text-sm font-medium">{company?.branch ?? ''} {company?.branch_code ? ` • ${company.branch_code}` : ''}</div>
                            <div className="print-report-title mt-2">Fast / Slow Moving Items</div>
                        </div>

                            <div className="flex justify-between text-[10px] mb-3">
                                <div>
                                    <strong>Report period:</strong> {filters?.date_from ?? local.date_from} — {filters?.date_to ?? local.date_to}
                                </div>
                                <div className="text-right">
                                    <strong>Group:</strong> {(filters?.group_by ?? local.group_by) === 'global' ? 'Global' : (filters?.group_by ?? local.group_by) === 'route' ? 'Route' : 'Sales Rep'}<br />
                                    <strong>Top N:</strong> {filters?.top_n ?? local.top_n}
                                </div>
                            </div>

                            <div className="text-xs text-slate-600 mb-2 text-center">
                                {filters?.route_id && String(filters.route_id) !== 'all' ? `Route: ${(routes.find(r => String(r.id) === String(filters.route_id))?.name ?? filters.route_id)} • ` : ''}
                                {filters?.rep_id && String(filters.rep_id) !== 'all' ? `Sales rep: ${(salesReps.find(s => String(s.id) === String(filters.rep_id)) ? `${salesReps.find(s => String(s.id) === String(filters.rep_id))!.first_name} ${salesReps.find(s => String(s.id) === String(filters.rep_id))!.last_name}` : filters.rep_id)} • ` : ''}
                                Total units: {summary?.total_qty ?? 0} • Total revenue: Rs. {(summary?.total_revenue ?? 0).toFixed(2)}
                            </div>
                        </div>
                        {/* KPI cards */}
                        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="rounded-xl bg-white p-3 shadow-sm border border-slate-200">
                                <div className="ml-2 flex-1 min-w-0">
                                    <p className="text-xs font-medium text-gray-600 truncate">Total Units Sold</p>
                                    <p className="text-sm font-bold text-gray-900 truncate">{summary?.total_qty ?? 0}</p>
                                </div>
                            </div>

                            <div className="rounded-xl bg-white p-3 shadow-sm border border-slate-200">
                                <div className="ml-2 flex-1 min-w-0">
                                    <p className="text-xs font-medium text-gray-600 truncate">Total Revenue</p>
                                    <p className="text-sm font-bold text-gray-900 truncate">{formatCurrency(summary?.total_revenue ?? 0)}</p>
                                </div>
                            </div>

                            <div className="rounded-xl bg-white p-3 shadow-sm border border-slate-200">
                                <div className="ml-2 flex-1 min-w-0">
                                    <p className="text-xs font-medium text-gray-600 truncate">Top Item</p>
                                    <p className="text-sm font-bold text-gray-900 truncate">{topItem ? `${topItem.item_name} (${topItem.item_code})` : '—'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Filters */}
                        <Card className="rounded-2xl border-slate-200 bg-white shadow-md mb-6 no-print">
                            <CardHeader className="bg-gradient-to-r from-vismass-blue to-vismass-grey text-white rounded-t-2xl">
                                <CardTitle className="flex items-center gap-2"><Filter className="h-4 w-4" /> Filters</CardTitle>
                                <CardDescription className="text-slate-100">Choose time window and grouping</CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 sm:p-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-gray-700">From</Label>
                                        <Input type="date" value={local.date_from} onChange={e => handleChange('date_from', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-gray-700">To</Label>
                                        <Input type="date" value={local.date_to} onChange={e => handleChange('date_to', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-gray-700">Group By</Label>
                                        <Select value={local.group_by} onValueChange={(v) => handleChange('group_by', v)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="global">Global</SelectItem>
                                                <SelectItem value="route">Route</SelectItem>
                                                <SelectItem value="rep">Sales Rep</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-gray-700">Route</Label>
                                        <Select value={local.route_id ?? 'all'} onValueChange={(v) => handleChange('route_id', v)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="All routes" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All</SelectItem>
                                                {routes.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-gray-700">Sales Rep</Label>
                                        <Select value={local.rep_id ?? 'all'} onValueChange={(v) => handleChange('rep_id', v)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="All reps" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All</SelectItem>
                                                {salesReps.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.first_name} {s.last_name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-gray-700">Top N</Label>
                                        <Input value={local.top_n} onChange={e => handleChange('top_n', e.target.value)} />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 sm:flex-row">
                                    <Button className="w-full sm:w-auto" onClick={applyFilters}>Apply</Button>
                                    <Button className="w-full sm:w-auto" variant="secondary" onClick={resetFilters}>Reset</Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Table or grouped view */}
                        {local.group_by === 'global' ? (
                            <Card className="rounded-2xl border-slate-200 bg-white shadow-md">
                                <CardHeader>
                                    <CardTitle>Top / Bottom Items</CardTitle>
                                    <CardDescription>Sorted by quantity sold</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                    <Table className="min-w-[760px]">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Item Code</TableHead>
                                                <TableHead>Item Name</TableHead>
                                                <TableHead>Qty Sold</TableHead>
                                                <TableHead>Revenue</TableHead>
                                                <TableHead>Avg Unit Price</TableHead>
                                                <TableHead>Movement</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {items.map((it, idx) => (
                                                <TableRow key={idx}>
                                                    <TableCell>{it.item_code}</TableCell>
                                                    <TableCell>{it.item_name}</TableCell>
                                                    <TableCell>{it.qty_sold}</TableCell>
                                                    <TableCell>{formatCurrency(it.revenue)}</TableCell>
                                                    <TableCell>{formatCurrency(it.avg_price)}</TableCell>
                                                    <TableCell>{it.movement_category ?? (idx < (Number(local.top_n) / 2) ? <Badge variant="secondary">Fast</Badge> : <Badge>Slow</Badge>)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-6">
                                {Object.entries(by_group).map(([groupId, rows]) => {
                                    const label = local.group_by === 'route' ? (routes.find(r => String(r.id) === groupId)?.name ?? `Route ${groupId}`) : (salesReps.find(s => String(s.id) === groupId) ? `${salesReps.find(s => String(s.id) === groupId)!.first_name} ${salesReps.find(s => String(s.id) === groupId)!.last_name}` : `Rep ${groupId}`);
                                    return (
                                        <Card key={groupId} className="rounded-2xl border-slate-200 bg-white shadow-md">
                                            <CardHeader>
                                                <CardTitle>{label}</CardTitle>
                                                <CardDescription>Top {rows.length} items</CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="overflow-x-auto">
                                                <Table className="min-w-[700px]">
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Item Code</TableHead>
                                                            <TableHead>Item Name</TableHead>
                                                            <TableHead>Qty Sold</TableHead>
                                                            <TableHead>Revenue</TableHead>
                                                            <TableHead>Avg Unit Price</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {rows.map((it, i) => (
                                                            <TableRow key={i}>
                                                                <TableCell>{it.item_code}</TableCell>
                                                                <TableCell>{it.item_name}</TableCell>
                                                                <TableCell>{it.qty_sold}</TableCell>
                                                                <TableCell>{formatCurrency(it.revenue)}</TableCell>
                                                                <TableCell>{formatCurrency(it.avg_price)}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                        {/* Print footer - visible when printing */}
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

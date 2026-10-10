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
import { DollarSign, Filter, Printer, ArrowLeft } from 'lucide-react';

export default function DeliveryProfitReport({ items = [], by_group = {}, summary = { total_sales: 0, total_cost: 0, total_profit: 0 }, filters = {}, routes = [], salesReps = [] }: any) {
    const [local, setLocal] = useState({
        date_from: filters.date_from || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        date_to: filters.date_to || new Date().toISOString().split('T')[0],
        group_by: filters.group_by || 'item',
        route_id: filters.route_id || 'all',
        rep_id: filters.rep_id || 'all',
    });

    const handleChange = (k: string, v: string) => setLocal((s) => ({ ...s, [k]: v }));
    const apply = () => {
        const q: any = { ...local };
        if (q.route_id === 'all') q.route_id = '';
        if (q.rep_id === 'all') q.rep_id = '';
        router.get('/reports/delivery-profit', q, { preserveState: true, replace: true });
    };
    const reset = () => {
        setLocal({ date_from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0], date_to: new Date().toISOString().split('T')[0], group_by: 'item', route_id: 'all', rep_id: 'all' });
        router.get('/reports/delivery-profit', {}, { replace: true });
    };

    const exportCsv = () => {
        const params = new URLSearchParams(local as any);
        if (params.get('route_id') === 'all') params.set('route_id', '');
        if (params.get('rep_id') === 'all') params.set('rep_id', '');
        window.location.href = `/reports/delivery-profit/export?${params.toString()}`;
    };

    const formatCurrency = (n: number) => `Rs ${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const { props: pageProps } = usePage();
    const company = (pageProps as any).company ?? (pageProps.auth as any)?.user?.company ?? { name: '', branch: '', branch_code: '', code: '' };

    return (
        <AppLayout breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }, { title: 'Delivery Profit', href: '/reports/delivery-profit' }]}> 
            <Head title={t('Delivery Profit Report')}>
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

                        /* Print Table Styling */
                        .print-table {
                            display: table !important;
                            width: 100% !important;
                            border-collapse: collapse !important;
                            font-size: 8px !important;
                            page-break-inside: auto !important;
                            color: #000 !important;
                        }

                        .print-table th,
                        .print-table td {
                            border: 1px solid #000 !important;
                            padding: 3px !important;
                            color: #000 !important;
                        }

                        .print-table thead {
                            display: table-header-group !important;
                        }

                        tr {
                            page-break-inside: avoid !important;
                            page-break-after: auto !important;
                        }
                    }
                `}</style>
            </Head>

            <div className="min-h-screen bg-slate-50">
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow no-print">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-center space-x-3">
                                <button onClick={() => window.history.back()} className="shrink-0 rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all" title="Go Back"><ArrowLeft className="h-5 w-5 text-white" /></button>
                                <div className="shrink-0 rounded-lg bg-white/20 p-2 shadow"><DollarSign className="h-5 w-5 text-white" /></div>
                                <div className="min-w-0">
                                    <h1 className="truncate text-lg sm:text-xl font-bold text-white">Delivery Profit</h1>
                                    <p className="hidden text-xs text-white/80 sm:block">Profit analysis for deliveries</p>
                                </div>
                            </div>
                            <div className="flex w-full gap-2 sm:w-auto">
                                <button onClick={exportCsv} className="no-print inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"><Printer className="mr-1.5 h-4 w-4"/>Export CSV</button>
                                <button onClick={() => window.print()} className="no-print inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"><Printer className="mr-1.5 h-4 w-4"/>Print</button>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div id="printable-report" className="px-4 sm:px-0">
                        <div className="hidden print:block print-header mb-4">
                            <div className="mb-4 text-center">
                                <div className="mx-auto mb-3" style={{ width: '140px' }}>
                                    <AppLogo companyCode={(company as any)?.code || (company as any)?.company_code} />
                                </div>
                                <div className="print-company-name" style={{ marginBottom: '4px' }}>{company?.name ?? ''}</div>
                                <div className="text-sm font-medium">{company?.branch ?? ''}{company?.branch_code ? ` • ${company.branch_code}` : ''}</div>
                                <div className="print-report-title mt-2 text-2xl font-semibold">Delivery Profit</div>
                                <div className="text-xs mt-1">Generated: {new Date().toLocaleString('en-GB')}</div>
                            </div>
                        </div>

                        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3 no-print">
                            <div className="rounded-xl bg-white p-3 shadow-sm border border-slate-200">
                                <div className="ml-2 flex-1 min-w-0">
                                    <p className="text-xs font-medium text-gray-600 truncate">Total Sales</p>
                                    <p className="text-sm font-bold text-gray-900 truncate">{formatCurrency(summary.total_sales || 0)}</p>
                                </div>
                            </div>
                            <div className="rounded-xl bg-white p-3 shadow-sm border border-slate-200">
                                <div className="ml-2 flex-1 min-w-0">
                                    <p className="text-xs font-medium text-gray-600 truncate">Total Profit</p>
                                    <p className="text-sm font-bold text-gray-900 truncate">{formatCurrency(summary.total_profit || 0)}</p>
                                </div>
                            </div>
                        </div>

                        <Card className="rounded-2xl border-slate-200 bg-white shadow-md mb-6 no-print">
                            <CardHeader className="bg-gradient-to-r from-vismass-blue to-vismass-grey text-white rounded-t-2xl">
                                <CardTitle className="flex items-center gap-2"><Filter className="h-4 w-4"/> Filters</CardTitle>
                                <CardDescription className="text-slate-100">Choose time window and grouping</CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 sm:p-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <div className="space-y-2"><Label className="text-sm font-medium text-gray-700">From</Label><Input type="date" value={local.date_from} onChange={e => handleChange('date_from', e.target.value)} /></div>
                                    <div className="space-y-2"><Label className="text-sm font-medium text-gray-700">To</Label><Input type="date" value={local.date_to} onChange={e => handleChange('date_to', e.target.value)} /></div>
                                    <div className="space-y-2"><Label className="text-sm font-medium text-gray-700">Group By</Label>
                                        <Select value={local.group_by} onValueChange={v => handleChange('group_by', v)}>
                                            <SelectTrigger><SelectValue placeholder="Group"/></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="item">Item</SelectItem>
                                                <SelectItem value="route">Route</SelectItem>
                                                <SelectItem value="rep">Sales Rep</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <div className="space-y-2"><Label className="text-sm font-medium text-gray-700">Route</Label>
                                        <Select value={local.route_id ?? 'all'} onValueChange={v => handleChange('route_id', v)}>
                                            <SelectTrigger><SelectValue placeholder="All routes"/></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All</SelectItem>
                                                {routes.map((r:any) => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2"><Label className="text-sm font-medium text-gray-700">Sales Rep</Label>
                                        <Select value={local.rep_id ?? 'all'} onValueChange={v => handleChange('rep_id', v)}>
                                            <SelectTrigger><SelectValue placeholder="All reps"/></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All</SelectItem>
                                                {salesReps.map((s:any) => <SelectItem key={s.id} value={String(s.id)}>{s.first_name} {s.last_name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3"><Button className="w-full sm:w-auto" onClick={apply}>Apply</Button><Button className="w-full sm:w-auto" variant="secondary" onClick={reset}>Reset</Button></div>
                                </div>
                            </CardContent>
                        </Card>

                        {local.group_by === 'item' ? (
                            <Card className="rounded-2xl border-slate-200 bg-white shadow-md">
                                <CardContent>
                                    <div className="overflow-x-auto">
                                    <Table className="print-table min-w-[760px]">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Item Code</TableHead>
                                                <TableHead>Item Name</TableHead>
                                                <TableHead>Qty</TableHead>
                                                <TableHead>Sales</TableHead>
                                                <TableHead>Profit</TableHead>
                                                <TableHead>Margin</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {items.map((it:any, idx:number) => (
                                                <TableRow key={idx}>
                                                    <TableCell>{it.item_code}</TableCell>
                                                    <TableCell>{it.item_name}</TableCell>
                                                    <TableCell>{it.qty}</TableCell>
                                                    <TableCell>{formatCurrency(it.sales_value)}</TableCell>
                                                    <TableCell>{formatCurrency(it.profit)}</TableCell>
                                                    <TableCell>{it.margin_pct !== null ? `${it.margin_pct.toFixed(2)}%` : '—'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-6">
                                {Object.entries(by_group).map(([g, rows]: any) => (
                                    <Card key={g} className="rounded-2xl border-slate-200 bg-white shadow-md">
                                        <CardHeader><CardTitle>{local.group_by === 'route' ? (routes.find((r:any)=>String(r.id)===g)?.name ?? `Route ${g}`) : (salesReps.find((s:any)=>String(s.id)===g) ? `${salesReps.find((s:any)=>String(s.id)===g).first_name} ${salesReps.find((s:any)=>String(s.id)===g).last_name}` : `Rep ${g}`)}</CardTitle><CardDescription>Profit details</CardDescription></CardHeader>
                                        <CardContent>
                                            <div className="overflow-x-auto">
                                            <Table className="print-table min-w-[760px]">
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Item Code</TableHead>
                                                        <TableHead>Item Name</TableHead>
                                                        <TableHead>Qty</TableHead>
                                                        <TableHead>Sales</TableHead>
                                                        <TableHead>Profit</TableHead>
                                                        <TableHead>Margin</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {rows.map((it:any, i:number) => (
                                                        <TableRow key={i}>
                                                            <TableCell>{it.item_code}</TableCell>
                                                            <TableCell>{it.item_name}</TableCell>
                                                            <TableCell>{it.qty}</TableCell>
                                                            <TableCell>{formatCurrency(it.sales_value)}</TableCell>
                                                            <TableCell>{formatCurrency(it.profit)}</TableCell>
                                                            <TableCell>{it.margin_pct !== null ? `${it.margin_pct.toFixed(2)}%` : '—'}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </AppLayout>
    );
}

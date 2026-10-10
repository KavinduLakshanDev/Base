import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem, Company } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Calendar, Car, Printer, Download, Users } from 'lucide-react';
import { Link } from '@inertiajs/react';

interface Props {
    company: Company;
    vehicles: Array<any>;
    salesReps: Array<any>;
    filters: { date?: string; vehicle_id?: string; preferred_time?: string };
    selected_vehicle_id?: string | null;
    date?: string;
    preferred_time?: string | null;
    stockRows: Array<any>;
    deliveries: Array<any>;
    routesVisited: Array<string>;
    assignedSalesReps?: string[];
    kpis: {
        total_stock_items: number;
        distinct_skus: number;
        deliveries_count: number;
        deliveries_total: number;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: t('Dashboard'), href: '/dashboard' },
    // { title: t('Reports'), href: '/reports' },
    { title: t('Vehicle Stock Report'), href: '/reports/vehicle-stock' },
];

export default function VehicleStockReport({ company, vehicles, salesReps, filters, selected_vehicle_id, date: initialDate, preferred_time, stockRows, deliveries, routesVisited, assignedSalesReps = [], kpis }: Props) {
    const [date, setDate] = useState<string>(initialDate || new Date().toISOString().split('T')[0]);
    const [vehicleId, setVehicleId] = useState<string>(selected_vehicle_id ? String(selected_vehicle_id) : 'all');
    const [preferredTime, setPreferredTime] = useState<string>(preferred_time || '');

    const applyFilters = () => {
        if (!date) return alert('Please choose a date');
        if (vehicleId === 'all') return alert('Please select a vehicle first');
        router.get('/reports/vehicle-stock', { date, vehicle_id: vehicleId === 'all' ? '' : vehicleId, preferred_time: preferredTime }, { preserveState: true });
    };

    const resetFilters = () => {
        setDate(new Date().toISOString().split('T')[0]);
        setVehicleId('all');
        setPreferredTime('');
        router.get('/reports/vehicle-stock', {}, { preserveState: false });
    };

    const formatNumber = (n: number) => Number(n).toLocaleString('en-GB', { maximumFractionDigits: 3 });
    const formatCurrency = (v: number) => `Rs. ${v.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Vehicle Stock Report')}>
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
                        .print-customer-info {
                            margin-top: 10px;
                            /* no border for clean look */
                        }
                        .print-info-row {
                            display: flex;
                            justify-content: space-between;
                            font-size: 12px;
                            margin-bottom: 3px;
                        }
                        #printable-report .rounded-2xl,
                        #printable-report .rounded-xl,
                        #printable-report .bg-white,
                        #printable-report .border,
                        #printable-report .shadow-lg {
                            border: none !important;
                            box-shadow: none !important;
                        }
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
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <Car className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    {/* branding removed per request */}
                                <div className="text-lg font-bold text-white" />
                                    <h1 className="text-xl font-bold text-white">{t('Vehicle Stock Report')}</h1>
                                    <p className="text-xs text-white/80">{t('Stock snapshot per vehicle for selected date + deliveries/route summary')}</p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <a data-inertia="false" href={`/reports/vehicle-stock/export?date=${date}${vehicleId === 'all' ? '' : `&vehicle_id=${vehicleId}`}${preferredTime ? `&preferred_time=${preferredTime}` : ''}`} className="no-print inline-flex items-center rounded-lg bg-white px-3 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200">
                                    <Download className="mr-2 h-4 w-4" />
                                    {t('Export CSV')}
                                </a>
                                <button onClick={() => window.print()} className="no-print inline-flex items-center rounded-lg bg-white px-3 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200">
                                    <Printer className="mr-2 h-4 w-4" />
                                    {t('Print')}
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-7xl py-8 sm:px-6 lg:px-8">
                    <div id="printable-report" className="px-4 sm:px-0">
                        {/* Print header with logo and detail rows */}
                        <div className="hidden print:block print-header">
                            <div className="text-center">
                                <div className="print-company-name">{company?.name || ''}</div>
                                <div className="print-report-title">Vehicle Stock Report</div>
                            </div>
                            <div className="print-customer-info" style={{ padding: '10px', marginTop: '10px' }}>
                                <div className="print-info-row">
                                    <span><strong>Date:</strong> {date}</span>
                                    <span><strong>Vehicle:</strong> {vehicleId === 'all' ? 'All vehicles' : vehicles.find(v => String(v.id) === String(vehicleId))?.name || vehicleId}</span>
                                </div>
                                <div className="print-info-row">
                                    <span><strong>Preferred Time:</strong> {preferredTime || 'N/A'}</span>
                                    <span></span>
                                </div>
                                <div className="print-info-row">
                                    <span><strong>Total Units:</strong> {kpis.total_stock_items || 0}</span>
                                    <span><strong>Distinct SKUs:</strong> {kpis.distinct_skus || 0}</span>
                                </div>
                                <div className="print-info-row">
                                    <span><strong>Deliveries:</strong> {kpis.deliveries_count || 0}</span>
                                    <span><strong>Total Sales:</strong> Rs. {(kpis.deliveries_total || 0).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-6 no-print">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-slate-700">{t('Date')}</Label>
                                    <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="border-slate-200" disabled={vehicleId === 'all'} />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-slate-700">{t('Vehicle')}</Label>
                                    <Select value={vehicleId} onValueChange={(v) => setVehicleId(v)}>
                                        <SelectTrigger className="border-slate-200"><SelectValue placeholder="All vehicles" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All vehicles</SelectItem>
                                            {vehicles.map(v => (
                                                <SelectItem key={v.id} value={String(v.id)}>{v.name} {v.registration_no ? `(${v.registration_no})` : ''}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-slate-700">Preferred Time</Label>
                                    <Input type="time" value={preferredTime} onChange={e => setPreferredTime(e.target.value)} className="border-slate-200" disabled={vehicleId === 'all'} />
                                    <p className="text-xs text-slate-400">Show deliveries / sales-rep assigned at this time (optional)</p>
                                </div>

                                <div className="flex items-end gap-3">
                                    <button onClick={applyFilters} disabled={vehicleId === 'all'} className="inline-flex items-center rounded-xl bg-vismass-blue px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                                        <Calendar className="mr-2 h-4 w-4" />
                                        {t('Generate')}
                                    </button>
                                    <button onClick={resetFilters} className="inline-flex items-center rounded-xl bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700">
                                        {t('Reset')}
                                    </button>
                                    {/* <div className="ml-auto text-sm text-slate-500 flex items-center gap-2">
                                        <MapPin className="h-4 w-4" />
                                        {date}
                                    </div> */}
                                </div>
                                {vehicleId === 'all' && (
                                    <div className="mt-3 text-xs text-amber-600">Please select a vehicle first to enable date/time snapshot and Preferred Time.</div>
                                )}
                            </div>
                        </div>

                        {/* KPI Cards */}
                        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4 no-print">
                            <div className="rounded-xl bg-white p-3 shadow-sm border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue p-2">
                                        <Car className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-2 flex-1 min-w-0">
                                        <p className="text-xs font-medium text-slate-600 truncate">{t('Total units on vehicle')}</p>
                                        <p className="text-sm font-bold text-slate-900 truncate">{formatNumber(kpis.total_stock_items || 0)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl bg-white p-3 shadow-sm border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-indigo-600 p-2">
                                        <Users className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-2 flex-1 min-w-0">
                                        <p className="text-xs font-medium text-slate-600 truncate">{t('Distinct SKUs')}</p>
                                        <p className="text-sm font-bold text-slate-900 truncate">{kpis.distinct_skus || 0}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl bg-white p-3 shadow-sm border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-green-600 p-2">
                                        <Calendar className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-2 flex-1 min-w-0">
                                        <p className="text-xs font-medium text-slate-600 truncate">{t('Deliveries (selected day)')}</p>
                                        <p className="text-sm font-bold text-slate-900 truncate">{kpis.deliveries_count || 0}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl bg-white p-3 shadow-sm border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-rose-600 p-2">
                                        <FileText className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-2 flex-1 min-w-0">
                                        <p className="text-xs font-medium text-slate-600 truncate">{t('Deliveries — total sales')}</p>
                                        <p className="text-sm font-bold text-slate-900 truncate">{formatCurrency(kpis.deliveries_total || 0)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {preferredTime && assignedSalesReps.length > 0 && (
                            <div className="mb-6 no-print">
                                <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                                    <p className="text-sm text-slate-600">Sales rep(s) assigned at <strong>{preferredTime}</strong>:</p>
                                    <div className="mt-2 flex gap-2">
                                        {assignedSalesReps.map((r:any, idx:number) => (
                                            <span key={idx} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-100 text-sm text-slate-700">{r}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                 {/* Delivery summary chips: show Delivery # · Route · Sales Rep prominently */}
                            {deliveries.length > 0 && (
                                <div className="mb-4 flex flex-wrap gap-3 no-print">
                                    {deliveries.map((d:any) => (
                                        <Link key={d.id} href={`/deliveries/${d.id}`} className="inline-flex items-center gap-4 px-3 py-2 bg-white border border-slate-100 rounded-lg shadow-sm hover:shadow-md transition">
                                            <div className="text-sm font-semibold text-slate-800">{d.delivery_number}</div>
                                            <div className="text-xs text-slate-500">{d.route_name ?? '—'}</div>
                                            <div className="text-xs text-slate-500">{d.sales_rep ?? '—'}</div>
                                        </Link>
                                    ))}
                                </div>
                            )}

                        {/* Stock Snapshot */}
                        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-6">
                            <div className="flex items-center gap-2 mb-4">
                                <h3 className="text-lg font-semibold text-slate-800">{t('Vehicle Stock — snapshot')}</h3>
                                <span className="ml-auto text-sm text-slate-500">{vehicles.find(v => String(v.id) === String(vehicleId))?.name || '—'}</span>
                            </div>

                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Item</TableHead>
                                        <TableHead>Batch</TableHead>
                                        <TableHead className="text-right">Quantity</TableHead>
                                        <TableHead className="text-right">Last movement</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stockRows.length === 0 && (
                                        <TableRow><TableCell colSpan={4} className="text-center">No stock found for selected vehicle/date</TableCell></TableRow>
                                    )}
                                    {stockRows.map((r:any) => (
                                        <TableRow key={`${r.item_ky}-${r.batch_no ?? 'nb'}`} className="hover:bg-slate-50">
                                            <TableCell>
                                                <div className="font-medium text-slate-800">{r.item_name}</div>
                                                <div className="text-xs text-slate-400">{r.item_code}</div>
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-600">{r.batch_no ?? 'N/A'}</TableCell>
                                            <TableCell className="text-right font-semibold text-slate-800">{formatNumber(r.quantity)}</TableCell>
                                            <TableCell className="text-right text-sm text-slate-500">{r.last_date ?? '-'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                                              <div className="text-center mt-8 text-slate-600">
                            <p className="text-sm">{t('Use this report to inspect van stock at a point-in-time and verify deliveries / routes visited on that day')}</p>
                        </div>
                        {/* print footer */}
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

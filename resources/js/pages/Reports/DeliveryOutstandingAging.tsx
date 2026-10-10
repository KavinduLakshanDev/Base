import React from 'react';
import AppLayout from '@/layouts/app-layout';
import AppLogo from '@/components/app-logo';
import { Head, router } from '@inertiajs/react';
import { toast } from 'sonner';
import { PageProps, Company } from '@/types';
import { ArrowLeft, AlertTriangle, FileText, Printer, MessageSquare, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface DeliveryRow {
  id: number;
  delivery_number: string;
  customer_name: string;
  delivery_date: string;
  days: number;           // numeric day count
  bucket: string;
  outstanding: number;
  last_payment_date?: string | null;
  sales_rep?: string | null;
  route?: string | null;
  is_overdue_critical?: boolean;
  shop?: string | null;
}

interface BucketTotal {
  label: string;
  count: number;
  total_outstanding: number;
}

interface DeliveryOutstandingAgingProps extends PageProps {
  company: Company;
  deliveries?: DeliveryRow[];
  bucket_totals?: BucketTotal[];
  summary?: { total_outstanding?: number; total_deliveries?: number };
  filters?: {
    date_from?: string;
    date_to?: string;
    bucket?: string;
    route_id?: string | number | null;
    rep_id?: string | number | null;
    min_outstanding?: number;
    customer_id?: string | number | null;
  };
  routes?: Array<{ id: number; name: string }>;
  salesReps?: Array<{ id: number; first_name: string; last_name: string }>;
  customers?: Array<{ id: number | string; name: string; phone?: string | null }>;
}

export default function DeliveryOutstandingAging({ company, deliveries = [], bucket_totals = [], summary = {}, filters = {}, routes = [], salesReps = [], customers = [] }: DeliveryOutstandingAgingProps) {

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;

    // If the user typed a customer name/phone but didn't pick a suggestion,
    // try to auto-resolve it to a customer_id so the filter is applied.
    if ((selectedCustomerId === 'all' || !selectedCustomerId) && customerQuery?.trim()) {
      const q = customerQuery.trim().toLowerCase();
      const match = (customers || []).find((c: any) => {
        const name = (c.name || '').toLowerCase();
        const phone = (String(c.phone || '')).toLowerCase();
        return name === q || name.includes(q) || phone.includes(q) || String(c.id) === q;
      });

      if (match) {
        setSelectedCustomerId(String(match.id));
        const hidden = form.querySelector('input[name="customer_id"]') as HTMLInputElement | null;
        if (hidden) {
          hidden.value = String(match.id);
        } else {
          const h = document.createElement('input');
          h.type = 'hidden';
          h.name = 'customer_id';
          h.value = String(match.id);
          form.appendChild(h);
        }
      }
    }

    const params = new URLSearchParams(new FormData(form) as any).toString();
    router.get('/reports/delivery-outstanding' + (params ? `?${params}` : ''), {}, { preserveState: true });
  }

  function exportCsv() {
    const params = new URLSearchParams({
      date_from: filters.date_from ?? '',
      date_to: filters.date_to ?? '',
      bucket: filters.bucket ?? 'all',
      route_id: String(filters.route_id ?? 'all'),
      rep_id: String(filters.rep_id ?? 'all'),
      min_outstanding: String(filters.min_outstanding ?? 0),
      customer_id: String(filters.customer_id ?? 'all'),
    } as Record<string, string>).toString();

    window.location.href = `/reports/delivery-outstanding/export?${params}`;
  }

  // local state for searchable customer selector
  const [customerQuery, setCustomerQuery] = React.useState('');
  const [selectedCustomerId, setSelectedCustomerId] = React.useState(String(filters.customer_id ?? 'all'));

  const filteredCustomers = React.useMemo(() => {
    const q = (customerQuery || '').trim().toLowerCase();
    if (!q) return customers.slice(0, 200);
    return customers.filter((c: any) => {
      const name = (c.name || '').toLowerCase();
      const phone = (c.phone || '') as string;
      return name.includes(q) || phone.includes(q) || String(c.id).includes(q);
    }).slice(0, 200);
  }, [customerQuery, customers]);

  React.useEffect(() => {
    if (filters.customer_id && filters.customer_id !== 'all') {
      const sel = (customers || []).find((c: any) => String(c.id) === String(filters.customer_id));
      if (sel) {
        setCustomerQuery(sel.name);
        setSelectedCustomerId(String(sel.id));
      } else {
        setSelectedCustomerId(String(filters.customer_id));
      }
    } else {
      setCustomerQuery('');
      setSelectedCustomerId('all');
    }
  }, [filters.customer_id, customers]);

  // Use a plain fetch request for the reminder (returns JSON).
  const sendReminder = async (deliveryId: number) => {
    try {
      const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
      const res = await fetch(`/reports/delivery-outstanding/${deliveryId}/send-reminder`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': token,
        },
        body: JSON.stringify({}),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Reminder sent');
      } else {
        toast.error(data.message || 'Failed to send reminder');
      }
    } catch (err) {
      toast.error('Failed to send reminder');
    }
  };

  return (
    <AppLayout breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }, { title: 'Outstanding (Aging)', href: '/reports/delivery-outstanding' }]}>
      <Head title="Delivery — Outstanding / Aging">
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
                        
                        /* Reset containers for multi-page flow */
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
                        
                        /* remove card borders/shadows for print */
                        #printable-report .rounded-2xl,
                        #printable-report .rounded-xl,
                        #printable-report .bg-white,
                        #printable-report .border,
                        #printable-report .shadow-lg {
                            border: none !important;
                            box-shadow: none !important;
                        }
                        
                        /* table styling like ledger */
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
                        th:nth-child(6), td:nth-child(6) {
                            text-align: right !important;
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
                <button onClick={() => window.history.back()} className="shrink-0 rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all" title="Go Back"><ArrowLeft className="h-5 w-5 text-white" /></button>
                <div className="shrink-0 rounded-lg bg-white/20 p-2 shadow"><AlertTriangle className="h-5 w-5 text-white" /></div>
                <div className="min-w-0">
                  <h1 className="truncate text-lg sm:text-xl font-bold text-white">Delivery — Outstanding / Aging</h1>
                  <p className="hidden text-xs text-white/80 sm:block">Outstanding balances and aging buckets</p>
                </div>
              </div>

              <div className="flex w-full gap-2 sm:w-auto">
                <button onClick={exportCsv} className="no-print inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200">
                  <FileText className="mr-1.5 h-4 w-4" />Export CSV
                </button>
                {/* <button onClick={() => window.print()} className="no-print inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200">
                  <Printer className="mr-1.5 h-4 w-4" />Print
                </button> */}
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">

          <Card className="rounded-2xl border-slate-200 bg-white shadow-lg mb-6 no-print">
            <CardHeader className="bg-gradient-to-r from-vismass-blue to-vismass-grey text-white rounded-t-2xl">
              <CardTitle className="flex items-center gap-2">Filters</CardTitle>
              <CardDescription className="text-slate-100">Filter deliveries by date, bucket, route and sales rep</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={applyFilters} className="space-y-6">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">From</label>
                    <input name="date_from" type="date" defaultValue={filters.date_from} className="h-10 rounded-lg border-slate-200 bg-white px-3 text-sm shadow-sm focus:border-vismass-blue focus:ring-1 focus:ring-vismass-blue transition-all" />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">To</label>
                    <input name="date_to" type="date" defaultValue={filters.date_to} className="h-10 rounded-lg border-slate-200 bg-white px-3 text-sm shadow-sm focus:border-vismass-blue focus:ring-1 focus:ring-vismass-blue transition-all" />
                  </div>

                  <div className="flex flex-col gap-1.5 min-w-[160px]">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Route</label>
                    <select name="route_id" defaultValue={filters.route_id || 'all'} className="h-10 rounded-lg border-slate-200 bg-white px-3 text-sm shadow-sm focus:border-vismass-blue focus:ring-1 focus:ring-vismass-blue transition-all">
                      <option value="all">All Routes</option>
                      {routes.map((r: any) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5 min-w-[160px]">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sales Rep</label>
                    <select name="rep_id" defaultValue={filters.rep_id || 'all'} className="h-10 rounded-lg border-slate-200 bg-white px-3 text-sm shadow-sm focus:border-vismass-blue focus:ring-1 focus:ring-vismass-blue transition-all">
                      <option value="all">All Reps</option>
                      {salesReps.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5 min-w-[120px]">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bucket</label>
                    <select name="bucket" defaultValue={filters.bucket || 'all'} className="h-10 rounded-lg border-slate-200 bg-white px-3 text-sm shadow-sm focus:border-vismass-blue focus:ring-1 focus:ring-vismass-blue transition-all">
                      <option value="all">All Buckets</option>
                      <option value="0-30">0-30</option>
                      <option value="31-60">31-60</option>
                      <option value="61-90">61-90</option>
                      <option value=">90">&gt;90</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5 w-full sm:w-64">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</label>
                    <div className="relative">
                      <input
                        type="text"
                        className="h-10 w-full rounded-lg border-slate-200 bg-white px-3 text-sm shadow-sm focus:border-vismass-blue focus:ring-1 focus:ring-vismass-blue transition-all"
                        placeholder="Search customer..."
                        value={customerQuery}
                        onChange={(e) => {
                          setCustomerQuery(e.target.value);
                          if (e.target.value === '') setSelectedCustomerId('all');
                        }}
                      />
                      {customerQuery && filteredCustomers.length > 0 && (
                        <div className="absolute z-20 mt-1 w-full max-h-48 overflow-auto rounded-lg border border-slate-200 bg-white shadow-xl">
                          {filteredCustomers.map((c: any) => (
                            <button
                              key={String(c.id)}
                              type="button"
                              className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors"
                              onClick={() => {
                                setCustomerQuery(c.name);
                                setSelectedCustomerId(String(c.id));
                              }}
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex flex-col">
                                  <span className="font-medium text-slate-700">{c.name}</span>
                                  {String(c.id).startsWith('shop:') && (
                                    <span className="text-[9px] font-bold text-vismass-blue uppercase tracking-widest mt-0.5">Registered Shop</span>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-tighter">{c.phone ?? 'N/A'}</span>
                                  {String(c.id).startsWith('shop:') && (
                                    <span className="text-[9px] bg-vismass-blue/10 text-vismass-blue px-1.5 py-0.5 rounded-full font-bold uppercase">Shop</span>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      <input type="hidden" name="customer_id" value={selectedCustomerId === 'all' ? '' : selectedCustomerId} />
                    </div>
                  </div>

                  {/* <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Min Rs.</label>
                    <input name="min_outstanding" type="number" step="0.01" defaultValue={filters.min_outstanding || 0} className="h-10 w-24 rounded-lg border-slate-200 bg-white px-3 text-sm shadow-sm focus:border-vismass-blue focus:ring-1 focus:ring-vismass-blue transition-all" />
                  </div> */}
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-2">
                    <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-vismass-blue px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-vismass-blue/20 hover:bg-vismass-blue/90 transition-all active:scale-95">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                      Apply
                    </button>
                    <button type="button" onClick={() => router.visit(window.location.pathname)} className="rounded-lg bg-slate-100 px-6 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-all active:scale-95">
                      Reset
                    </button>
                  </div>

                  <div className="hidden sm:flex items-center gap-2 text-slate-400">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <span className="text-xs font-medium">{filters.date_from} — {filters.date_to}</span>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

      {/* Summary cards removed per user request */}

      <div id="printable-report" className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
        {/* Print header — visible only when printing */}
        <div className="hidden print:block print-header px-6 py-4 border-b border-slate-200">
          <div className="text-center">
            <div className="mx-auto mb-2" style={{ width: '140px' }}>
              <AppLogo companyCode={company?.code} />
            </div>
            <div className="print-company-name">{company?.name || ''}</div>
            <div className="print-report-title">Outstanding / Aging Results</div>
            <div className="text-xs text-slate-600 mt-1">
              {filters.date_from || '-'} — {filters.date_to || '-'}
              {' • '}Bucket: {filters.bucket ?? 'All'}
              {filters.customer_id && String(filters.customer_id) !== 'all' ? ` • Customer: ${(customers || []).find((c:any)=>String(c.id)===String(filters.customer_id))?.name ?? filters.customer_id}` : ''}
            </div>
            <div className="text-xs text-slate-600 mt-2">
              Total deliveries: {summary.total_deliveries ?? deliveries.length} • Total outstanding: Rs. {Number(summary.total_outstanding ?? deliveries.reduce((s,d)=>s + Number(d.outstanding || 0), 0)).toFixed(2)}
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 sm:px-6 py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Outstanding / Aging Results</h3>
              <p className="text-sm text-white/80 mt-1">Deliveries with outstanding balances</p>
            </div>
            <div className="text-white/80 text-sm">Total: {deliveries.length}</div>
          </div>
        </div>

        <div className="p-3 overflow-x-auto text-xs">
          <table className="min-w-[1100px] w-full text-xs border border-slate-200 divide-y divide-slate-200 border-collapse">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="px-2 py-1 text-xs text-left font-medium text-slate-600">Customer</th>
                <th className="px-2 py-1 text-xs text-left font-medium text-slate-600">Delivery #</th>
                <th className="px-2 py-1 text-xs text-left font-medium text-slate-600">Delivery Date</th>
                <th className="px-2 py-1 text-xs text-left font-medium text-slate-600">Days</th>
                <th className="px-2 py-1 text-xs text-left font-medium text-slate-600">Bucket</th>
                <th className="px-2 py-1 text-xs text-right font-medium text-slate-600">Outstanding (Rs.)</th>
                <th className="px-2 py-1 text-xs text-left font-medium text-slate-600">Last Payment Date</th>
                <th className="px-2 py-1 text-xs text-left font-medium text-slate-600">Sales Rep</th>
                <th className="px-2 py-1 text-xs text-left font-medium text-slate-600">Route</th>
                <th className="px-2 py-1 text-xs text-left font-medium text-slate-600 no-print">Actions</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((d: DeliveryRow) => (
                <tr key={d.id} className={`${d.is_overdue_critical ? 'bg-red-50' : ''} hover:bg-slate-50`}>
                  <td className="px-2 py-1.5 text-xs border-r border-slate-100 last:border-r-0">{d.shop ?? d.customer_name}</td>
                  <td className="px-2 py-1.5 text-xs border-r border-slate-100 last:border-r-0">{d.delivery_number}</td>
                  <td className="px-2 py-1.5 text-xs border-r border-slate-100 last:border-r-0">{d.delivery_date}</td>
                  <td className="px-2 py-1.5 text-xs border-r border-slate-100 last:border-r-0">{d.days} Days</td>
                  <td className="px-2 py-1.5 text-xs border-r border-slate-100 last:border-r-0">{d.bucket}</td>
                  <td className={`px-2 py-1.5 text-xs text-right border-r border-slate-100 last:border-r-0 ${d.is_overdue_critical ? 'text-red-700 font-semibold' : ''}`}>{Number(d.outstanding).toFixed(2)}</td>
                  <td className="px-2 py-1.5 text-xs border-r border-slate-100 last:border-r-0">{d.last_payment_date ?? '-'}</td>
                  <td className="px-2 py-1.5 text-xs border-r border-slate-100 last:border-r-0">{d.sales_rep}</td>
                  <td className="px-2 py-1.5 text-xs border-r border-slate-100 last:border-r-0">{d.route}</td>
                  <td className="px-2 py-1.5 text-xs no-print">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => sendReminder(d.id)}
                        title="Send SMS reminder"
                        aria-label="Send SMS reminder"
                        className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors duration-150"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span className="sr-only">Send SMS reminder</span>
                      </button>

                      <button
                        onClick={() => router.visit(`/deliveries/${d.id}`)}
                        title="Add payment"
                        aria-label="Add payment"
                        className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-vismass-blue text-white hover:bg-vismass-blue/90 transition-colors duration-150"
                      >
                        <CreditCard className="h-4 w-4" />
                        <span className="sr-only">Add payment</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {deliveries.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-3 text-center text-gray-500 text-xs">No outstanding deliveries found for the selected filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Print footer - only visible on print */}
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

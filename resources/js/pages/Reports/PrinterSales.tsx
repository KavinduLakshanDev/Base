import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { Head, router } from '@inertiajs/react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Printer, FileText } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { PageProps } from '@/types';
import { useState } from 'react';

interface PrinterSaleRecord {
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
}


interface PrinterSalesProps extends PageProps {
    records: PrinterSaleRecord[];
    company: any;
    filters?: {
        from_date?: string;
        to_date?: string;
    };
}

export default function PrinterSales({ records = [], company, filters }: PrinterSalesProps) {
    const [startDate, setStartDate] = useState<Date | undefined>(() => {
        if (filters?.from_date) {
            return new Date(filters.from_date);
        }
        const today = new Date();
        today.setMonth(today.getMonth() - 3);
        return today;
    });
    const [endDate, setEndDate] = useState<Date | undefined>(() => {
        if (filters?.to_date) {
            return new Date(filters.to_date);
        }
        return new Date();
    });

    const handleApplyFilters = () => {
        const params: Record<string, string> = {};
        if (startDate) params.from_date = startDate.toISOString().split('T')[0];
        if (endDate) params.to_date = endDate.toISOString().split('T')[0];

        router.get('/reports/printer-sales', params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleResetFilters = () => {
        const today = new Date();
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(today.getMonth() - 3);
        setStartDate(threeMonthsAgo);
        setEndDate(today);
        router.get('/reports/printer-sales', {}, { preserveState: true, preserveScroll: true, replace: true });
    };

    const handlePrint = () => window.print();

    return (
        <AppLayout breadcrumbs={[{ title: t('Reports'), href: '/reports' }, { title: t('Printer Sales'), href: '/reports/printer-sales' }]}>
            <Head title={t('Printer Sales Report')}>
                <style>{`
                    @media print {
                        @page {
                            size: A4 landscape;
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
                        
                        #printable-printer-sales,
                        #printable-printer-sales * {
                            visibility: visible;
                        }
                        
                        #printable-printer-sales {
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
                        
                        .print-report-title {
                            font-size: 18px;
                            font-weight: bold;
                            text-align: center;
                            margin-bottom: 15px;
                        }
                        
                        #printable-printer-sales > table {
                            display: table !important;
                            width: 100%;
                            border-collapse: collapse;
                            font-size: 9px;
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
                        <div className="flex items-center justify-between py-4">
                            <div className="flex items-center space-x-3">
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <FileText className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">{t('Printer Sales Report')}</h1>
                                    <p className="text-xs text-white/80">{t('Sales lines for printers')}</p>
                                </div>
                            </div>
                            <Button onClick={handlePrint} className="inline-flex items-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200">
                                <Printer className="mr-1.5 h-4 w-4" />
                                {t('Print')}
                            </Button>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-8 sm:px-6 lg:px-8">
                    <div id="printable-printer-sales">
                        {/* Print Header - Only visible in print */}
                        <div className="print-header" style={{ display: 'none' }}>
                            <div className="mb-4 text-center">
                                <div className="text-center">
                                    <div className="text-3xl font-black" style={{ marginBottom: '5px' }}>
                                        <span style={{ color: '#00aeef' }}>VIS</span>
                                        <span style={{ color: '#737578' }}>MASS</span>
                                    </div>
                                    <div className="text-sm text-slate-600">Printer Sales Report</div>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden no-print">
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-6 py-4">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">{t('Printer Sales Report')}</h3>
                                        <p className="text-white/80 text-sm mt-1">{t('Transactions and sold printers')}</p>
                                    </div>
                                    <div className="text-white/80 text-sm">{t('Generated on')}: {new Date().toLocaleDateString()}</div>
                                </div>
                            </div>

                            <div className="p-6">
                                {/* Filters */}
                                <div className="mb-6 flex flex-col items-end gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4 sm:flex-row sm:items-center no-print">
                                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                                        <div className="w-full sm:w-auto">
                                            <label className="mb-1.5 block text-xs font-medium text-slate-500 uppercase tracking-wider">{t('From Date')}</label>
                                            <DatePicker
                                                date={startDate}
                                                onDateChange={setStartDate}
                                            />
                                        </div>
                                        <div className="w-full sm:w-auto">
                                            <label className="mb-1.5 block text-xs font-medium text-slate-500 uppercase tracking-wider">{t('To Date')}</label>
                                            <DatePicker
                                                date={endDate}
                                                onDateChange={setEndDate}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex w-full items-center gap-2 sm:w-auto sm:self-end">
                                        <Button onClick={handleApplyFilters} className="flex-1 bg-vismass-blue hover:bg-vismass-blue/90 text-white sm:flex-none">
                                            {t('Apply Filters')}
                                        </Button>
                                        <Button onClick={handleResetFilters} variant="outline" className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-100 sm:flex-none">
                                            {t('Reset')}
                                        </Button>
                                    </div>
                                </div>

                                {/* Table */}
                                <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                                    <Table>
                                        <TableHeader className="bg-slate-50">
                                            <TableRow>
                                                <TableHead>Invoice</TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Customer</TableHead>
                                                {/* <TableHead>Item Code</TableHead> */}
                                                <TableHead>Item Name</TableHead>
                                                <TableHead className="text-right">Qty</TableHead>
                                                <TableHead className="text-right">Unit Price</TableHead>
                                                <TableHead className="text-right">Line Total</TableHead>
                                                <TableHead>Brand</TableHead>
                                                <TableHead>Model</TableHead>
                                                <TableHead>Serial</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {records.map(r => (
                                                <TableRow key={r.id}>
                                                    <TableCell className="font-semibold">{r.invoice_no}</TableCell>
                                                    <TableCell>{r.transaction_date ? new Date(r.transaction_date).toLocaleDateString() : '-'}</TableCell>
                                                    <TableCell>{r.customer_name || '-'}</TableCell>
                                                    {/* <TableCell>{r.item_code}</TableCell> */}
                                                    <TableCell>{r.item_name}</TableCell>
                                                    <TableCell className="text-right">{Number(r.quantity).toFixed(2)}</TableCell>
                                                    <TableCell className="text-right">{Number(r.unit_price).toFixed(2)}</TableCell>
                                                    <TableCell className="text-right">{Number(r.line_total).toFixed(2)}</TableCell>
                                                    <TableCell>{r.brand || '-'}</TableCell>
                                                    <TableCell>{r.model || '-'}</TableCell>
                                                    <TableCell>{r.serial_number || '-'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>

                        {/* Print Table - Only visible in print */}
                        <table style={{ display: 'none' }}>
                            <thead>
                                <tr>
                                    <th>Invoice</th>
                                    <th>Date</th>
                                    <th>Customer</th>
                                    <th>Item Code</th>
                                    <th>Item Name</th>
                                    <th style={{ textAlign: 'right' }}>Qty</th>
                                    <th style={{ textAlign: 'right' }}>Unit Price</th>
                                    <th style={{ textAlign: 'right' }}>Line Total</th>
                                    <th>Brand</th>
                                    <th>Model</th>
                                    <th>Serial</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map(r => (
                                    <tr key={r.id}>
                                        <td>{r.invoice_no}</td>
                                        <td>{r.transaction_date ? new Date(r.transaction_date).toLocaleDateString() : '-'}</td>
                                        <td>{r.customer_name || '-'}</td>
                                        <td>{r.item_code}</td>
                                        <td>{r.item_name}</td>
                                        <td style={{ textAlign: 'right' }}>{Number(r.quantity).toFixed(2)}</td>
                                        <td style={{ textAlign: 'right' }}>{Number(r.unit_price).toFixed(2)}</td>
                                        <td style={{ textAlign: 'right' }}>{Number(r.line_total).toFixed(2)}</td>
                                        <td>{r.brand || '-'}</td>
                                        <td>{r.model || '-'}</td>
                                        <td>{r.serial_number || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

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

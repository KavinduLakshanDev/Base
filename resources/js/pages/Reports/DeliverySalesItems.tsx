import React from 'react';
import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem, PageProps } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Printer, ArrowLeft } from 'lucide-react';

interface ItemDetail {
    delivery_number: string;
    name: string;
    item_code?: string | null;
    batch_no?: string | null;
    quantity: number;
    unit_price?: number | null;
    total_amount?: number | null;
}

interface Props {
    items: ItemDetail[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: t('Dashboard'), href: '/dashboard' },
    // { title: t('Reports'), href: '/reports' },
    { title: t('Delivery Sales'), href: '/reports/delivery-sales' },
    { title: t('Item Details'), href: '#' },
];

export default function DeliverySalesItems({ items }: Props) {
    const formatCurrency = (val: number) => `Rs. ${val.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const printPage = () => {
        window.print();
    };

    // company info for print header
    const { props: pageProps } = usePage<PageProps>();
    const company = (pageProps as any).company ?? (pageProps.auth as any)?.user?.company ?? { name: '', branch: '', branch_code: '' };

    // group items by delivery number so we can render a header row
    const itemsByDelivery: Record<string, ItemDetail[]> = items.reduce((acc, it) => {
        const key = it.delivery_number || 'Unknown';
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(it);
        return acc;
    }, {} as Record<string, ItemDetail[]>);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Item Details')}>
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
                        #printable-report .rounded-2xl,
                        #printable-report .rounded-xl,
                        #printable-report .bg-white,
                        #printable-report .border,
                        #printable-report .shadow-md,
                        #printable-report .shadow-sm {
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
                                <Link href="/reports/delivery-sales" className="shrink-0 rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all">
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </Link>
                                <div className="shrink-0 rounded-lg bg-white/20 p-2 shadow">
                                    <Printer className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="truncate text-lg sm:text-xl font-bold text-white">{t('Item Details')}</h1>
                                    <p className="hidden text-xs text-white/80 sm:block">{t('Detailed list of items')}</p>
                                </div>
                            </div>
                            <div className="flex w-full gap-3 sm:w-auto">
                                <button onClick={printPage} className="no-print inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-white px-3 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200">
                                    <Printer className="mr-2 h-4 w-4" />
                                    {t('Print')}
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div id="printable-report" className="px-4 sm:px-0">
                        {/* Print header */}
                        <div className="hidden print:block print-header mb-4">
                            <div className="mb-4 text-center">
                                <div className="print-company-name" style={{ marginBottom: '4px' }}>{company?.name || ''}</div>
                                <div className="text-sm font-medium">{company?.branch || ''}{company?.branch_code ? ` • ${company.branch_code}` : ''}</div>
                                <div className="print-report-title mt-2">{t('Item Details')}</div>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-4 sm:p-6">
                            <div className="overflow-x-auto">
                            <Table className="min-w-[760px]">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Item')}</TableHead>
                                        <TableHead>{t('Delivery #')}</TableHead>
                                        <TableHead>{t('Code')}</TableHead>
                                        <TableHead>{t('Batch')}</TableHead>
                                        <TableHead>{t('Qty')}</TableHead>
                                        <TableHead>{t('Unit Price')}</TableHead>
                                        <TableHead>{t('Total')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(itemsByDelivery).map(([delivery, list]) => (
                                        <React.Fragment key={delivery}>
                                            <TableRow className="bg-slate-100">
                                                <TableCell colSpan={7} className="font-semibold">
                                                    {t('Delivery')} {delivery}
                                                </TableCell>
                                            </TableRow>
                                            {list.map((it, idx) => (
                                                <TableRow key={`${delivery}-${idx}`}>
                                                    <TableCell>{it.name}</TableCell>
                                                    <TableCell>{it.delivery_number}</TableCell>
                                                    <TableCell>{it.item_code || '-'}</TableCell>
                                                    <TableCell>{it.batch_no || '-'}</TableCell>
                                                    <TableCell>{Number(it.quantity || 0).toFixed(2)}</TableCell>
                                                    <TableCell>{it.unit_price != null ? formatCurrency(Number(it.unit_price)) : '-'}</TableCell>
                                                    <TableCell>{it.total_amount != null ? formatCurrency(Number(it.total_amount)) : '-'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </TableBody>
                            </Table>
                            </div>
                        </div>

                        {/* Print footer */}
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

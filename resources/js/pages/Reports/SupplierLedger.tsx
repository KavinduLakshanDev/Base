import AppLayout from '@/layouts/app-layout';
import ReportPrintHeader from '@/components/report-print-header';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PageProps, Company } from '@/types';
import { Printer, Search, RotateCcw, FileText, Truck, ChevronDown, Check, Download, Filter } from 'lucide-react';
import { useState, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { format } from 'date-fns';

interface Supplier {
    AdrKy: number;
    AdrCd: string;
    FstNm: string;
    Address?: string;
    TP1?: string;
    TP2?: string;
    Email?: string;
    section_code?: string;
}

interface Transaction {
    id: number;
    date: string;
    description: string;
    reference: string;
    debit: number;
    credit: number;
    balance: number;
}

interface SupplierLedgerProps extends PageProps {
    suppliers: Supplier[];
    company: Company;
    sections: Array<{
        id: number;
        section_code: string;
        name: string;
    }>;
    transactions?: Transaction[];
    selectedSupplier?: Supplier;
    fromDate?: string;
    toDate?: string;
    openingBalance?: number;
    closingBalance?: number;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    // {
    //     title: 'Reports',
    //     href: '/reports',
    // },
    {
        title: 'Supplier Ledger Card',
        href: '/reports/supplier-ledger',
    },
];

export default function SupplierLedger({
    auth,
    suppliers = [],
    company,
    sections = [],
    transactions = [],
    selectedSupplier,
    fromDate = '',
    toDate = '',
    openingBalance = 0,
    closingBalance = 0,
}: SupplierLedgerProps) {
    const printRef = useRef<HTMLDivElement>(null);
    const [supplierId, setSupplierId] = useState(selectedSupplier?.AdrCd || '');
    const [startDate, setStartDate] = useState<Date | undefined>(() => {
        return (
            fromDate
                ? new Date(fromDate)
                : (() => {
                    const date = new Date();
                    date.setMonth(date.getMonth() - 3);
                    return date;
                })()
        );
    });
    const [endDate, setEndDate] = useState<Date | undefined>(() => {
        return (
            toDate
                ? new Date(toDate)
                : new Date()
        );
    });
    const [isLoading, setIsLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const printDateTime = new Date().toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    const totalDebit = transactions.reduce((sum, t) => sum + (Number(t.debit) || 0), 0);
    const totalCredit = transactions.reduce((sum, t) => sum + (Number(t.credit) || 0), 0);
    const calculatedClosingBalance = Number(openingBalance || 0) + totalCredit - totalDebit;

    const handleApplyFilters = () => {
        if (!supplierId) {
            alert('Please select a supplier');
            return;
        }

        setIsLoading(true);
        const params = new URLSearchParams();
        params.append('supplier_id', supplierId);
        if (startDate) params.append('from_date', startDate.toISOString().split('T')[0]);
        if (endDate) params.append('to_date', endDate.toISOString().split('T')[0]);

        router.get(
            `/reports/supplier-ledger?${params.toString()}`,
            {},
            {
                preserveState: true,
                preserveScroll: true,
                onFinish: () => setIsLoading(false),
                onError: () => setIsLoading(false),
            }
        );
    };

    const handleResetFilters = () => {
        setSupplierId('');
        setStartDate(undefined);
        setEndDate(undefined);
        router.get('/reports/supplier-ledger', {}, {
            preserveState: false,
            preserveScroll: false,
        });
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExportCsv = () => {
        if (!selectedSupplier) {
            alert('Please select a supplier');
            return;
        }

        const escape = (value: string) => `"${String(value).replace(/"/g, '""')}"`;

        const rows: string[][] = [];

        rows.push([`Supplier Ledger - ${selectedSupplier.AdrCd} - ${selectedSupplier.FstNm}`]);
        rows.push([`Period: ${startDate?.toLocaleDateString('en-GB') || ''} to ${endDate?.toLocaleDateString('en-GB') || ''}`]);
        rows.push([]);
        rows.push(['Date', 'Description', 'Reference', 'Debit (Rs.)', 'Credit (Rs.)', 'Balance (Rs.)']);

        rows.push(['', '', '', '', '', '']);
        rows.push(['Opening Balance', '', '', '', '', Number(openingBalance).toFixed(2)]);

        transactions.forEach((transaction: Transaction) => {
            rows.push([
                new Date(transaction.date).toLocaleDateString('en-GB'),
                transaction.description,
                transaction.reference,
                transaction.debit > 0 ? Number(transaction.debit).toFixed(2) : '0.00',
                transaction.credit > 0 ? Number(transaction.credit).toFixed(2) : '0.00',
                Number(transaction.balance).toFixed(2),
            ]);
        });

        rows.push(['', '', '', '', '', '']);
        rows.push([
            'Closing Balance',
            '',
            '',
            Number(totalDebit).toFixed(2),
            Number(totalCredit).toFixed(2),
            Number(calculatedClosingBalance).toFixed(2),
        ]);

        const csv = rows
            .map((row) => row.map((col) => escape(col)).join(','))
            .join('\r\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `supplier-ledger-${selectedSupplier.AdrCd}-${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const filteredSuppliers = suppliers;

    return (
        <AppLayout
            breadcrumbs={breadcrumbs}
        >
            <Head title={t('Supplier Ledger Card')}>
                <style>{`
                    @media print {
                        @page {
                            size: A4 portrait;
                            margin: 10mm;

                            /* Attempt to hide browser-added headers/footers (may be ignored by some browsers) */
                            @top-left { content: none; }
                            @top-center { content: none; }
                            @top-right { content: none; }
                            @bottom-left { content: none; }
                            @bottom-center { content: none; }
                            @bottom-right { content: none; }
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
                        
                        #printable-ledger,
                        #printable-ledger * {
                            visibility: visible;
                        }
                        
                        #printable-ledger {
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
                        
                        .print-supplier-info {
                            margin-bottom: 15px;
                        }
                        
                        .print-info-row {
                            display: flex;
                            justify-content: space-between;
                            font-size: 10px;
                            margin-bottom: 2px;
                        }
                        
                        /* remove card border/shadow in printed version */
                        #printable-ledger > .bg-white {
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
                        
                        th:nth-child(4), td:nth-child(4),
                        th:nth-child(5), td:nth-child(5),
                        th:nth-child(6), td:nth-child(6) {
                            text-align: right !important;
                        }
                        
                        .balance-row {
                            background-color: #f3f4f6 !important;
                            font-weight: bold;
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
                                <button
                                    onClick={() => window.history.back()}
                                    className="rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                    title={t('Go Back')}
                                >
                                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                </button>
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <FileText className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">
                                        {t('Supplier Ledger Card')}
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        {t('View supplier transaction history and balance')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    onClick={handleExportCsv}
                                    disabled={!selectedSupplier}
                                    className="inline-flex items-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                                >
                                    <Download className="mr-1.5 h-4 w-4" />
                                    {t('Export CSV')}
                                </Button>
                                <Button
                                    onClick={handlePrint}
                                    disabled={!selectedSupplier}
                                    className="inline-flex items-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                                >
                                    <Printer className="mr-1.5 h-4 w-4" />
                                    {t('Print Ledger')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-8 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        {/* Filters */}
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm no-print mb-6">
                            <div className="flex flex-col">
                                <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                    <Filter className="h-4 w-4" />
                                    {t('Ledger Filters')}
                                </h3>

                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                                    {/* Supplier Search & Selection - Combobox */}
                                    <div className="space-y-2 lg:col-span-1">
                                        <Label>{t('Search & Select Supplier')} *</Label>
                                        <Popover open={open} onOpenChange={setOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={open}
                                                    className="w-full justify-between border-slate-300 bg-white focus:border-vismass-blue focus:ring-vismass-blue"
                                                >
                                                    {supplierId
                                                        ? (() => {
                                                              const selected = suppliers.find(
                                                                  (supplier) => supplier.AdrCd === supplierId
                                                              );
                                                              return selected
                                                                  ? `${selected.AdrCd} - ${selected.FstNm}`
                                                                  : t('Select supplier');
                                                          })()
                                                        : t('Search and select supplier...')}
                                                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[400px] p-0" align="start">
                                                <Command>
                                                    <CommandInput 
                                                        placeholder={t('Search by name or code...')} 
                                                        className="h-9"
                                                    />
                                                    <CommandList>
                                                        <CommandEmpty>{t('No supplier found.')}</CommandEmpty>
                                                        <CommandGroup>
                                                            {suppliers.map((supplier) => (
                                                                <CommandItem
                                                                    key={supplier.AdrCd}
                                                                    value={`${supplier.AdrCd} ${supplier.FstNm} ${supplier.Address || ''}`}
                                                                    onSelect={() => {
                                                                        setSupplierId(supplier.AdrCd);
                                                                        setOpen(false);
                                                                    }}
                                                                >
                                                                    <div className="flex flex-col">
                                                                        <div className="font-medium">
                                                                            {supplier.AdrCd} - {supplier.FstNm}
                                                                        </div>
                                                                        {supplier.Address && (
                                                                            <div className="text-xs text-slate-500">
                                                                                {supplier.Address}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <Check
                                                                        className={cn(
                                                                            "ml-auto h-4 w-4",
                                                                            supplierId === supplier.AdrCd ? "opacity-100" : "opacity-0"
                                                                        )}
                                                                    />
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </div>

                                    {/* Date Range */}
                                    <div className="space-y-2">
                                        <Label htmlFor="from-date">{t('From Date')}</Label>
                                        <input
                                            type="date"
                                            id="from-date"
                                            value={startDate ? format(startDate, 'yyyy-MM-dd') : ''}
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    const [y, m, d] = e.target.value.split('-');
                                                    setStartDate(new Date(parseInt(y), parseInt(m) - 1, parseInt(d)));
                                                } else {
                                                    setStartDate(undefined);
                                                }
                                            }}
                                            className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="to-date">{t('To Date')}</Label>
                                        <input
                                            type="date"
                                            id="to-date"
                                            value={endDate ? format(endDate, 'yyyy-MM-dd') : ''}
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    const [y, m, d] = e.target.value.split('-');
                                                    setEndDate(new Date(parseInt(y), parseInt(m) - 1, parseInt(d)));
                                                } else {
                                                    setEndDate(undefined);
                                                }
                                            }}
                                            className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                                    <Button
                                        onClick={handleApplyFilters}
                                        disabled={isLoading || !supplierId}
                                        className="w-full sm:w-auto bg-vismass-blue hover:bg-vismass-blue/90 text-white gap-2"
                                    >
                                        <Search className="h-4 w-4" />
                                        {t('Generate Ledger')}
                                    </Button>
                                    <Button
                                        onClick={handleResetFilters}
                                        variant="outline"
                                        className="w-full sm:w-auto gap-2"
                                    >
                                        <RotateCcw className="h-4 w-4" />
                                        {t('Reset')}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Ledger Display */}
                        {selectedSupplier && startDate && endDate && (
                            <div id="printable-ledger">
                                <ReportPrintHeader
                                    company={company}
                                    title={t('Supplier Ledger Card')}
                                    period={`${startDate.toLocaleDateString('en-GB')} to ${endDate.toLocaleDateString('en-GB')}`}
                                    extraLines={[{ label: t('Report Date'), value: printDateTime }]}
                                />

                                <div className="print-supplier-info" style={{ padding: '10px', marginBottom: '10px' }}>
                                    {/* report generated date left, supplier details right */}
                                    <div key="supplier-code" className="print-info-row">
                                        <span><strong>Supplier Code:</strong> {selectedSupplier.AdrCd}</span>
                                        <span></span>
                                    </div>
                                    <div key="supplier-name" className="print-info-row">
                                        <span><strong>Supplier Name:</strong> {selectedSupplier.FstNm}</span>
                                        <span></span>
                                    </div>
                                </div>

                                <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                                    <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-6 py-4 no-print">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                                            <div>
                                                <h3 className="text-lg font-semibold text-white">
                                                    {t('Ledger Card')} - {selectedSupplier.FstNm}
                                                </h3>
                                                <p className="text-white/80 text-sm mt-1">
                                                    {t('Supplier Code')}: {selectedSupplier.AdrCd}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Supplier Details Card - Screen Only */}
                                    <div className="p-6 bg-slate-50 border-b border-slate-200 no-print">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm text-slate-600">{t('Address')}</p>
                                                <p key="address1" className="font-medium">{selectedSupplier.Address || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-slate-600">{t('Contact')}</p>
                                                <p key="contact" className="font-medium">{selectedSupplier.TP1 || selectedSupplier.TP2 || 'N/A'}</p>
                                                {selectedSupplier.Email && (
                                                    <p key="email" className="font-medium">{selectedSupplier.Email}</p>
                                                )}
                                            </div>
                                        </div>
                                        {startDate && endDate && (
                                            <div className="mt-4">
                                                <p className="text-sm text-slate-600">{t('Period')}</p>
                                                <p className="font-medium">
                                                    {startDate.toLocaleDateString('en-GB')} to {endDate.toLocaleDateString('en-GB')}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-6">
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="font-bold">{t('Date')}</TableHead>
                                                        <TableHead className="font-bold">{t('Description')}</TableHead>
                                                        <TableHead className="font-bold">{t('Reference')}</TableHead>
                                                        <TableHead className="font-bold text-right">{t('Debit (Rs.)')}</TableHead>
                                                        <TableHead className="font-bold text-right">{t('Credit (Rs.)')}</TableHead>
                                                        <TableHead className="font-bold text-right">{t('Balance (Rs.)')}</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {/* Opening Balance */}
                                                    <TableRow className="bg-slate-100 font-semibold balance-row">
                                                        <TableCell>{fromDate ? new Date(fromDate).toLocaleDateString('en-GB') : '-'}</TableCell>
                                                        <TableCell>{t('Opening Balance')}</TableCell>
                                                        <TableCell>-</TableCell>
                                                        <TableCell className="text-right">-</TableCell>
                                                        <TableCell className="text-right">-</TableCell>
                                                        <TableCell className="text-right">
                                                            {Number(openingBalance).toFixed(2)}
                                                        </TableCell>
                                                    </TableRow>

                                                    {/* Transactions */}
                                                    {transactions.length > 0 ? (
                                                        transactions.map((transaction) => (
                                                            <TableRow key={transaction.id}>
                                                                <TableCell>
                                                                    {new Date(transaction.date).toLocaleDateString('en-GB')}
                                                                </TableCell>
                                                                <TableCell>{transaction.description}</TableCell>
                                                                <TableCell>{transaction.reference}</TableCell>
                                                                <TableCell className="text-right">
                                                                    {transaction.debit > 0 ? Number(transaction.debit).toFixed(2) : '-'}
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    {transaction.credit > 0 ? Number(transaction.credit).toFixed(2) : '-'}
                                                                </TableCell>
                                                                <TableCell className="text-right font-medium">
                                                                    {Number(transaction.balance).toFixed(2)}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    ) : (
                                                        <TableRow>
                                                            <TableCell colSpan={6} className="text-center py-8">
                                                                <div className="flex flex-col items-center">
                                                                    <Truck className="h-10 w-10 text-slate-400 mb-2" />
                                                                    <p className="text-sm font-medium text-slate-900">{t('No Transactions Found')}</p>
                                                                    <p className="text-xs text-slate-600 mt-1">
                                                                        {t('No transactions available for the selected period')}
                                                                    </p>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    )}

                                                    {/* Closing Balance */}
                                                    <TableRow className="bg-slate-200 font-bold balance-row">
                                                        <TableCell colSpan={3}>{t('Closing Balance')}</TableCell>
                                                        <TableCell className="text-right">
                                                            {Number(totalDebit).toFixed(2)}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {Number(totalCredit).toFixed(2)}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {Number(calculatedClosingBalance).toFixed(2)}
                                                        </TableCell>
                                                    </TableRow>
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>

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
                            </div>
                        )}

                        {/* No Supplier Selected State */}
                        {!(selectedSupplier && startDate && endDate) && (
                            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                                <div className="text-center p-12">
                                    <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                                        <Truck className="h-8 w-8 text-white" />
                                    </div>
                                    <h3 className="text-lg font-medium text-slate-900">{t('Select Supplier and Date Range')}</h3>
                                    <p className="text-sm text-slate-600 mt-2">
                                        {t('Please select a supplier and date range to view the ledger card')}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </AppLayout>
    );
}

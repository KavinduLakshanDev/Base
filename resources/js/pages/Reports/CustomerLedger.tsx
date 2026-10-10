import AppLayout from '@/layouts/app-layout';
import AppLogo from '@/components/app-logo';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PageProps, Address, Company } from '@/types';
import { Printer, Search, RotateCcw, FileText, User, ChevronDown, Check, Download } from 'lucide-react';
import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { format } from 'date-fns';

interface Transaction {
    id: number;
    date: string;
    description: string;
    invoice_no: string;
    debit: number;
    credit: number;
    balance: number;
}

interface CustomerLedgerProps extends PageProps {
    customers: Address[];
    company: Company;
    sections: Array<{
        id: number;
        section_code: string;
        name: string;
    }>;
    transactions?: Transaction[];
    selectedCustomer?: Address;
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
        title: 'Customer Ledger Card',
        href: '/reports/customer-ledger',
    },
];

export default function CustomerLedger({
    auth,
    customers = [],
    company,
    sections = [],
    transactions = [],
    selectedCustomer,
    fromDate = '',
    toDate = '',
    openingBalance = 0,
    closingBalance = 0,
}: CustomerLedgerProps) {
    const [customerId, setCustomerId] = useState(selectedCustomer?.AdrCd || '');
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
    const calculatedClosingBalance = closingBalance !== undefined ? closingBalance : Number(openingBalance || 0) + totalDebit - totalCredit;

    // Format a balance with DR/CR label. Positive = DR (owes), Negative = CR (credit)
    const formatBalance = (amount: number) => {
        const abs = Math.abs(amount).toFixed(2);
        if (amount < -0.005) return { text: abs + ' CR', className: 'text-green-700 font-semibold' };
        if (amount > 0.005)  return { text: abs + ' DR', className: 'text-red-700 font-semibold' };
        return { text: '0.00', className: 'text-slate-600' };
    };

    const handleApplyFilters = () => {
        if (!customerId) {
            alert('Please select a customer');
            return;
        }

        setIsLoading(true);
        const params = new URLSearchParams();
        params.append('customer_id', customerId);
        if (startDate) params.append('from_date', format(startDate, 'yyyy-MM-dd'));
        if (endDate) params.append('to_date', format(endDate, 'yyyy-MM-dd'));

        router.get(
            `/reports/customer-ledger?${params.toString()}`,
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
        setCustomerId('');
        setStartDate(undefined);
        setEndDate(undefined);
        router.get('/reports/customer-ledger', {}, {
            preserveState: false,
            preserveScroll: false,
        });
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExportCsv = () => {
        if (!selectedCustomer) return;

        const headers = ['Date', 'Description', 'Invoice No', 'Debit (Rs.)', 'Credit (Rs.)', 'Balance (Rs.)'];
        const csvRows = [];
        
        // Add headers
        csvRows.push(headers.join(','));

        // Add opening balance
        const openingDate = fromDate ? new Date(fromDate).toLocaleDateString('en-GB') : '-';
        csvRows.push(`"${openingDate}","Opening Balance","-","-","-","${Number(openingBalance || 0).toFixed(2)}"`);

        // Add transactions
        transactions.forEach(t => {
            const date = new Date(t.date).toLocaleDateString('en-GB');
            const desc = `"${(t.description || '').replace(/"/g, '""')}"`;
            const inv = `"${t.invoice_no || '-'}"`;
            const debit = t.debit > 0 ? `"${Number(t.debit).toFixed(2)}"` : '"-"';
            const credit = t.credit > 0 ? `"${Number(t.credit).toFixed(2)}"` : '"-"';
            const bal = `"${Number(t.balance).toFixed(2)}"`;
            csvRows.push(`"${date}",${desc},${inv},${debit},${credit},${bal}`);
        });

        // Add closing balance
        csvRows.push(`"-","Closing Balance","-","${Number(totalDebit).toFixed(2)}","${Number(totalCredit).toFixed(2)}","${Number(calculatedClosingBalance).toFixed(2)}"`);

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Customer_Ledger_${selectedCustomer.AdrCd}_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <AppLayout
            breadcrumbs={breadcrumbs}
        >
            <Head title={t('Customer Ledger Card')}>
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
                        
                        .print-customer-info {
                            margin-bottom: 15px;
                            /* remove border around details for cleaner look */
                        }
                        
                        .print-info-row {
                            display: flex;
                            justify-content: space-between;
                            font-size: 10px; /* smaller for compactness */
                            margin-bottom: 2px;
                        }
                        
                        /* enhance closing balance appearance */
                        .balance-row {
                            background-color: #f3f4f6 !important;
                            font-weight: bold;
                            color: #000 !important;
                            border-top: 2px solid #000 !important;
                        }
                        
                        /* ensure totals align neatly on each side */
                        .closing-total {
                            text-align: right !important;
                        }
                        
                        /* remove card border/shadow for print version */
                        #printable-ledger > .bg-white {
                            border: none !important;
                            box-shadow: none !important;
                        }
                        
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            /* slightly smaller font to fit more data */
                            font-size: 10px;
                            page-break-inside: auto;
                            color: #000 !important;
                        }
                        /* January ledger-specific table inherits same size */
                        #printable-ledger table {
                            width: 100% !important;
                            font-size: 11px !important;
                            table-layout: auto !important;
                        }
                        #printable-ledger th, #printable-ledger td {
                            padding: 4px !important;
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
                        <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-center space-x-3">
                                <button
                                    onClick={() => window.history.back()}
                                    className="shrink-0 rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                    title={t('Go Back')}
                                >
                                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                </button>
                                <div className="shrink-0 rounded-lg bg-white/20 p-2 shadow">
                                    <FileText className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="truncate text-lg sm:text-xl font-bold text-white">
                                        {t('Customer Ledger Card')}
                                    </h1>
                                    <p className="hidden text-xs text-white/80 sm:block">
                                        {t('View customer transaction history and balance')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto mt-3 sm:mt-0">
                                <Button
                                    onClick={handleExportCsv}
                                    disabled={!selectedCustomer}
                                    className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                                >
                                    <Download className="mr-1.5 h-4 w-4" />
                                    {t('Export CSV')}
                                </Button>
                                <Button
                                    onClick={handlePrint}
                                    disabled={!selectedCustomer}
                                    className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                                >
                                    <Printer className="mr-1.5 h-4 w-4" />
                                    {t('Print Ledger')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        {/* Filters */}
                        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden no-print mb-6">
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 sm:px-6 py-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">
                                            {t('Ledger Filters')}
                                        </h3>
                                        <p className="text-white/80 text-sm mt-1">
                                            {t('Select customer and date range')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 sm:p-6">
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                                    {/* Customer Search & Selection - Combobox */}
                                    <div className="space-y-2 lg:col-span-1">
                                        <Label>{t('Search & Select Customer')} *</Label>
                                        <Popover open={open} onOpenChange={setOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={open}
                                                    className="w-full justify-between border-slate-300 bg-white focus:border-vismass-blue focus:ring-vismass-blue"
                                                >
                                                    {customerId
                                                        ? (() => {
                                                              const selected = customers.find(
                                                                  (customer) => customer.AdrCd === customerId
                                                              );
                                                              return selected
                                                                  ? `${selected.AdrCd} - ${selected.FstNm}`
                                                                  : t('Select customer');
                                                          })()
                                                        : t('Search and select customer...')}
                                                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[calc(100vw-2rem)] max-w-[400px] p-0" align="start">
                                                <Command>
                                                    <CommandInput 
                                                        placeholder={t('Search by name or code...')} 
                                                        className="h-9"
                                                    />
                                                    <CommandList>
                                                        <CommandEmpty>{t('No customer found.')}</CommandEmpty>
                                                        <CommandGroup>
                                                            {customers.map((customer) => (
                                                                <CommandItem
                                                                    key={customer.AdrCd}
                                                                    value={`${customer.AdrCd} ${customer.FstNm} ${customer.Address || ''}`}
                                                                    onSelect={() => {
                                                                        setCustomerId(customer.AdrCd);
                                                                        setOpen(false);
                                                                    }}
                                                                >
                                                                    <div className="flex flex-col">
                                                                        <div className="font-medium">
                                                                            {customer.AdrCd} - {customer.FstNm}
                                                                        </div>
                                                                        {customer.Address && (
                                                                            <div className="text-xs text-slate-500">
                                                                                {customer.Address}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <Check
                                                                        className={cn(
                                                                            "ml-auto h-4 w-4",
                                                                            customerId === customer.AdrCd ? "opacity-100" : "opacity-0"
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
                                        disabled={isLoading || !customerId}
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
                        {selectedCustomer && startDate && endDate && (
                            <div id="printable-ledger">
                                {/* Print Header - Only visible in print */}
                                <div className="print-header" style={{ display: 'none' }}>
                                    <div className="mb-4 text-center">
                                        <div className="mx-auto mb-3" style={{ width: '140px' }}>
                                            <AppLogo companyCode={(company as any)?.company_code || (company as any)?.code} />
                                        </div>
                                        {/* <div className="text-center">
                                            <div className="print-company-name">
                                                {company?.name || ''}
                                            </div>
                                            <div className="text-sm text-slate-600">
                                                {company?.company_code ? `Code: ${company.company_code}` : ''}
                                            </div>
                                            <div className="text-sm text-slate-600">Customer Ledger Card</div>
                                        </div> */}
                                    </div>

                                    <div className="print-customer-info" style={{ padding: '10px', marginBottom: '10px' }}>
                                        {/* report generated date on left, other details on right */}
                                        <div key="report-date" className="print-info-row">
                                            <span><strong>Report Date:</strong> {printDateTime}</span>
                                            <span></span>
                                        </div>
                                        <div key="customer-code" className="print-info-row">
                                            <span><strong>Customer Code:</strong> {selectedCustomer.AdrCd}</span>
                                            <span></span>
                                        </div>
                                        <div key="customer-name" className="print-info-row">
                                            <span><strong>Customer Name:</strong> {selectedCustomer.FstNm}</span>
                                            <span></span>
                                        </div>
                                        {/* <div key="customer-address" className="print-info-row">
                                            <span><strong>Address:</strong> {selectedCustomer.Address || ''} {selectedCustomer.Town || ''} {selectedCustomer.City || ''}</span>
                                            <span></span>
                                        </div> */}
                                        {/* <div key="customer-contact" className="print-info-row">
                                            <span><strong>Contact:</strong> {selectedCustomer.TP1 || selectedCustomer.TP2 || 'N/A'}</span>
                                            <span></span>
                                        </div> */}
                                        {startDate && endDate && (
                                            <div key="customer-period" className="print-info-row">
                                                <span><strong>Period:</strong> {new Date(startDate).toLocaleDateString('en-GB')} to {new Date(endDate).toLocaleDateString('en-GB')}</span>
                                                <span></span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                                    <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 sm:px-6 py-4 no-print">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                                            <div>
                                                <h3 className="text-lg font-semibold text-white">
                                                    {t('Ledger Card')} - {selectedCustomer.FstNm}
                                                </h3>
                                                <p className="text-white/80 text-sm mt-1">
                                                    {t('Customer Code')}: {selectedCustomer.AdrCd}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Customer Details Card - Screen Only */}
                                    <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-200 no-print">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm text-slate-600">{t('Address')}</p>
                                                <p key="address1" className="font-medium">{selectedCustomer.Address || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-slate-600">{t('Contact')}</p>
                                                <p key="contact" className="font-medium">{selectedCustomer.TP1 || selectedCustomer.TP2 || 'N/A'}</p>
                                                {selectedCustomer.Email && (
                                                    <p key="email" className="font-medium">{selectedCustomer.Email}</p>
                                                )}
                                            </div>
                                        </div>
                                        {startDate && endDate && (
                                            <div className="mt-4">
                                                <p className="text-sm text-slate-600">{t('Period')}</p>
                                                <p className="font-medium">
                                                    {new Date(startDate).toLocaleDateString('en-GB')} to {new Date(endDate).toLocaleDateString('en-GB')}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-4 sm:p-6">
                                        <div className="overflow-x-auto print:overflow-visible">
                                            <Table className="min-w-[840px] print:min-w-full">
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="font-bold">{t('Date')}</TableHead>
                                                        <TableHead className="font-bold">{t('Description')}</TableHead>
                                                        <TableHead className="font-bold">{t('Invoice No')}</TableHead>
                                                        <TableHead className="font-bold text-right">{t('Debit (Rs.)')}</TableHead>
                                                        <TableHead className="font-bold text-right">{t('Credit (Rs.)')}</TableHead>
                                                        <TableHead className="font-bold text-right">{t('Balance (Rs.)')}</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {/* Opening Balance */}
                                                    <TableRow className="bg-blue-50 font-semibold balance-row">
                                                        <TableCell>{fromDate ? new Date(fromDate).toLocaleDateString('en-GB') : '-'}</TableCell>
                                                        <TableCell className="text-blue-800 font-bold">{t('Opening Balance')}</TableCell>
                                                        <TableCell>-</TableCell>
                                                        <TableCell className="text-right closing-total">-</TableCell>
                                                        <TableCell className="text-right closing-total">-</TableCell>
                                                        <TableCell className="text-right closing-total">
                                                            {(() => { const f = formatBalance(Number(openingBalance)); return <span className={f.className}>{f.text}</span>; })()}
                                                        </TableCell>
                                                    </TableRow>

                                                    {/* Transactions */}
                                                    {transactions.length > 0 ? (
                                                        transactions.map((transaction) => (
                                                            <TableRow
                                                                key={transaction.id}
                                                                className={transaction.description.startsWith('Credit Balance Applied') ? 'bg-green-50' : ''}
                                                            >
                                                                <TableCell>
                                                                    {new Date(transaction.date).toLocaleDateString('en-GB')}
                                                                </TableCell>
                                                                <TableCell className={transaction.description.startsWith('Credit Balance Applied') ? 'text-green-700 font-medium' : ''}>
                                                                    {transaction.description}
                                                                </TableCell>
                                                                <TableCell>{transaction.invoice_no}</TableCell>
                                                                <TableCell className="text-right">
                                                                    {transaction.debit > 0 ? Number(transaction.debit).toFixed(2) : '-'}
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    {transaction.credit > 0 ? Number(transaction.credit).toFixed(2) : '-'}
                                                                </TableCell>
                                                                <TableCell className="text-right font-medium">
                                                                    {(() => { const f = formatBalance(Number(transaction.balance)); return <span className={f.className}>{f.text}</span>; })()}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    ) : (
                                                        <TableRow>
                                                            <TableCell colSpan={6} className="text-center py-8">
                                                                <div className="flex flex-col items-center">
                                                                    <User className="h-10 w-10 text-slate-400 mb-2" />
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
                                                        <TableCell className="text-right closing-total">
                                                            {Number(totalDebit).toFixed(2)}
                                                        </TableCell>
                                                        <TableCell className="text-right closing-total">
                                                            {Number(totalCredit).toFixed(2)}
                                                        </TableCell>
                                                        <TableCell className="text-right closing-total">
                                                            {(() => { const f = formatBalance(Number(calculatedClosingBalance)); return <span className={f.className}>{f.text}</span>; })()}
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

                        {/* No Customer Selected State */}
                        {!(selectedCustomer && startDate && endDate) && (
                            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                                <div className="text-center p-8 sm:p-12">
                                    <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                                        <User className="h-8 w-8 text-white" />
                                    </div>
                                    <h3 className="text-lg font-medium text-slate-900">{t('Select Customer and Date Range')}</h3>
                                    <p className="text-sm text-slate-600 mt-2">
                                        {t('Please select a customer and date range to view the ledger card')}
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

import AppLayout from '@/layouts/app-layout';
import AppLogo from '@/components/app-logo';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PageProps, Company } from '@/types';
import { Printer, Search, RotateCcw, FileText, Store, ChevronDown, Check, Download } from 'lucide-react';
import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { format } from 'date-fns';

interface Shop {
    id: number;
    name: string;
    address: string;
    contact_phone?: string;
    contact?: string;
    current_balance?: number;
}

interface Transaction {
    id: number;
    date: string;
    description: string;
    invoice_no: string;
    debit: number;
    credit: number;
    balance: number;
}

interface ShopLedgerProps extends PageProps {
    shops: Shop[];
    company: Company;
    transactions?: Transaction[];
    selectedShop?: Shop;
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
    {
        title: 'Shop Ledger Card',
        href: '/reports/shop-ledger',
    },
];

export default function ShopLedger({
    auth,
    shops = [],
    company,
    transactions = [],
    selectedShop,
    fromDate = '',
    toDate = '',
    openingBalance = 0,
    closingBalance = 0,
}: ShopLedgerProps) {
    const [shopId, setShopId] = useState(selectedShop?.id?.toString() || '');
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

    const handleApplyFilters = () => {
        if (!shopId) {
            alert('Please select a shop');
            return;
        }

        setIsLoading(true);
        const params = new URLSearchParams();
        params.append('shop_id', shopId);
        if (startDate) params.append('from_date', format(startDate, 'yyyy-MM-dd'));
        if (endDate) params.append('to_date', format(endDate, 'yyyy-MM-dd'));

        router.get(
            `/reports/shop-ledger?${params.toString()}`,
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
        setShopId('');
        setStartDate(undefined);
        setEndDate(undefined);
        router.get('/reports/shop-ledger', {}, {
            preserveState: false,
            preserveScroll: false,
        });
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExportCsv = () => {
        if (!selectedShop) return;

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
        link.setAttribute('download', `Shop_Ledger_${selectedShop.id}_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <AppLayout
            breadcrumbs={breadcrumbs}
        >
            <Head title={t('Shop Ledger Card')}>
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
                        
                        .print-shop-info {
                            margin-bottom: 15px;
                        }
                        
                        .print-info-row {
                            display: flex;
                            justify-content: space-between;
                            font-size: 10px;
                            margin-bottom: 2px;
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
                                        {t('Shop Ledger Card')}
                                    </h1>
                                    <p className="hidden text-xs text-white/80 sm:block">
                                        {t('View shop transaction history and balance')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto mt-3 sm:mt-0">
                                <Button
                                    onClick={handleExportCsv}
                                    disabled={!selectedShop}
                                    className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                                >
                                    <Download className="mr-1.5 h-4 w-4" />
                                    {t('Export CSV')}
                                </Button>
                                <Button
                                    onClick={handlePrint}
                                    disabled={!selectedShop}
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
                                            {t('Select shop and date range')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 sm:p-6">
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                                    {/* Shop Search & Selection - Combobox */}
                                    <div className="space-y-2 lg:col-span-1">
                                        <Label>{t('Search & Select Shop')} *</Label>
                                        <Popover open={open} onOpenChange={setOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={open}
                                                    className="w-full justify-between border-slate-300 bg-white focus:border-vismass-blue focus:ring-vismass-blue"
                                                >
                                                    {shopId
                                                        ? (() => {
                                                              const selected = shops.find(
                                                                  (shop) => shop.id.toString() === shopId
                                                              );
                                                              return selected
                                                                  ? `${selected.id} - ${selected.name}`
                                                                  : t('Select shop');
                                                          })()
                                                        : t('Search and select shop...')}
                                                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[calc(100vw-2rem)] max-w-[400px] p-0" align="start">
                                                <Command>
                                                    <CommandInput 
                                                        placeholder={t('Search by name or ID...')} 
                                                        className="h-9"
                                                    />
                                                    <CommandList>
                                                        <CommandEmpty>{t('No shop found.')}</CommandEmpty>
                                                        <CommandGroup>
                                                            {shops.map((shop) => (
                                                                <CommandItem
                                                                    key={shop.id}
                                                                    value={`${shop.id} ${shop.name} ${shop.address || ''}`}
                                                                    onSelect={() => {
                                                                        setShopId(shop.id.toString());
                                                                        setOpen(false);
                                                                    }}
                                                                >
                                                                    <div className="flex flex-col">
                                                                        <div className="font-medium">
                                                                            {shop.id} - {shop.name}
                                                                        </div>
                                                                        {shop.address && (
                                                                            <div className="text-xs text-slate-500">
                                                                                {shop.address}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <Check
                                                                        className={cn(
                                                                            "ml-auto h-4 w-4",
                                                                            shopId === shop.id.toString() ? "opacity-100" : "opacity-0"
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
                                        <DatePicker
                                            date={startDate}
                                            onDateChange={setStartDate}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="to-date">{t('To Date')}</Label>
                                        <DatePicker
                                            date={endDate}
                                            onDateChange={setEndDate}
                                        />
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                                    <Button
                                        onClick={handleApplyFilters}
                                        disabled={isLoading || !shopId}
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
                        {selectedShop && startDate && endDate && (
                            <div id="printable-ledger">
                                {/* Print Header - Only visible in print */}
                                <div className="print-header" style={{ display: 'none' }}>
                                    <div className="mb-4 text-center">
                                        <div className="mx-auto mb-3" style={{ width: '140px' }}>
                                            <AppLogo companyCode={(company as any)?.company_code || (company as any)?.code} />
                                        </div>
                                    </div>

                                    <div className="print-shop-info" style={{ padding: '10px', marginBottom: '10px' }}>
                                        {/* report generated date on left, other details on right */}
                                        <div key="report-date" className="print-info-row">
                                            <span><strong>Report Date:</strong> {printDateTime}</span>
                                            <span></span>
                                        </div>
                                        <div key="shop-id" className="print-info-row">
                                            <span><strong>Shop ID:</strong> {selectedShop.id}</span>
                                            <span></span>
                                        </div>
                                        <div key="shop-name" className="print-info-row">
                                            <span><strong>Shop Name:</strong> {selectedShop.name}</span>
                                            <span></span>
                                        </div>
                                        {startDate && endDate && (
                                            <div key="shop-period" className="print-info-row">
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
                                                    {t('Ledger Card')} - {selectedShop.name}
                                                </h3>
                                                <p className="text-white/80 text-sm mt-1">
                                                    {t('Shop ID')}: {selectedShop.id}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Shop Details Card - Screen Only */}
                                    <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-200 no-print">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <p className="text-sm text-slate-600">{t('Address')}</p>
                                                <p key="address1" className="font-medium">{selectedShop.address || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-slate-600">{t('Contact')}</p>
                                                <p key="contact" className="font-medium">{selectedShop.contact_phone || selectedShop.contact || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-slate-600">{t('Current Balance')}</p>
                                                <p key="balance" className={`font-semibold ${
                                                    Number(selectedShop.current_balance ?? calculatedClosingBalance) > 0.005
                                                        ? 'text-red-600'
                                                        : Number(selectedShop.current_balance ?? calculatedClosingBalance) < -0.005
                                                        ? 'text-green-600'
                                                        : ''
                                                }`}>
                                                    {Number(selectedShop.current_balance ?? calculatedClosingBalance) < -0.005
                                                        ? `Rs. ${Math.abs(Number(selectedShop.current_balance ?? calculatedClosingBalance)).toFixed(2)} CR`
                                                        : `Rs. ${Number(selectedShop.current_balance ?? calculatedClosingBalance).toFixed(2)}`}
                                                </p>
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
                                                    <TableRow className="bg-slate-100 font-semibold balance-row">
                                                        <TableCell>{fromDate ? new Date(fromDate).toLocaleDateString('en-GB') : '-'}</TableCell>
                                                        <TableCell>{t('Opening Balance')}</TableCell>
                                                        <TableCell>-</TableCell>
                                                        <TableCell className="text-right closing-total">-</TableCell>
                                                        <TableCell className="text-right closing-total">-</TableCell>
                                                        <TableCell className={`text-right closing-total font-semibold ${
                                                            Number(openingBalance) > 0.005 ? 'text-red-600' : Number(openingBalance) < -0.005 ? 'text-green-600' : ''
                                                        }`}>
                                                            {Number(openingBalance) < -0.005
                                                                ? `${Math.abs(Number(openingBalance)).toFixed(2)} CR`
                                                                : Number(openingBalance).toFixed(2)}
                                                        </TableCell>
                                                    </TableRow>

                                                    {/* Transactions */}
                                                    {transactions.length > 0 ? (
                                                        transactions.map((transaction) => {
                                                            const bal = Number(transaction.balance);
                                                            const balColor = bal > 0.005 ? 'text-red-600' : bal < -0.005 ? 'text-green-600' : 'text-slate-900';
                                                            const balLabel = bal < -0.005 ? `${Math.abs(bal).toFixed(2)} CR` : Number(bal).toFixed(2);
                                                            return (
                                                            <TableRow key={transaction.id}>
                                                                <TableCell>
                                                                    {new Date(transaction.date).toLocaleDateString('en-GB')}
                                                                </TableCell>
                                                                <TableCell>{transaction.description}</TableCell>
                                                                <TableCell>{transaction.invoice_no}</TableCell>
                                                                <TableCell className="text-right">
                                                                    {transaction.debit > 0 ? Number(transaction.debit).toFixed(2) : '-'}
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    {transaction.credit > 0 ? Number(transaction.credit).toFixed(2) : '-'}
                                                                </TableCell>
                                                                <TableCell className={`text-right font-medium ${balColor}`}>
                                                                    {balLabel}
                                                                </TableCell>
                                                            </TableRow>
                                                        );})
                                                    ) : (
                                                        <TableRow>
                                                            <TableCell colSpan={6} className="text-center py-8">
                                                                <div className="flex flex-col items-center">
                                                                    <Store className="h-10 w-10 text-slate-400 mb-2" />
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
                                                        <TableCell className={`text-right closing-total font-bold ${
                                                            Number(calculatedClosingBalance) > 0.005 ? 'text-red-600' : Number(calculatedClosingBalance) < -0.005 ? 'text-green-600' : ''
                                                        }`}>
                                                            {Number(calculatedClosingBalance) < -0.005
                                                                ? `${Math.abs(Number(calculatedClosingBalance)).toFixed(2)} CR`
                                                                : Number(calculatedClosingBalance).toFixed(2)}
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

                        {/* No Shop Selected State */}
                        {!(selectedShop && startDate && endDate) && (
                            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                                <div className="text-center p-8 sm:p-12">
                                    <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                                        <Store className="h-8 w-8 text-white" />
                                    </div>
                                    <h3 className="text-lg font-medium text-slate-900">{t('Select Shop and Date Range')}</h3>
                                    <p className="text-sm text-slate-600 mt-2">
                                        {t('Please select a shop and date range to view the ledger card')}
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

import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { PageProps } from '@/types';
import { Printer, Search, RotateCcw, ChevronDown, Check, Download, Filter } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { useState, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

interface Printer {
    serial_number: string;
    brand: string;
    model: string;
    item_code: string;
    item_name: string;
    balance: number;
}

interface Transaction {
    id: number;
    date: string;
    description: string;
    reference: string;
    received: number;
    issued: number;
    balance: number;
}

interface PrinterStockBinCardProps extends PageProps {
    printers: Printer[];
    company: {
        name: string;
        section: string;
        code: string;
        section_code: string;
    };
    sections: Array<{
        id: number;
        section_code: string;
        name: string;
    }>;
    transactions?: Transaction[];
    selectedPrinter?: Printer;
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
        title: 'Printer Stock Bin Card',
        href: '/reports/printer-stock-bin-card',
    },
];

export default function PrinterStockBinCard({
    auth,
    printers = [],
    company,
    sections = [],
    transactions = [],
    selectedPrinter,
    fromDate = '',
    toDate = '',
    openingBalance = 0,
    closingBalance = 0,
}: PrinterStockBinCardProps) {

    const [serialNumber, setSerialNumber] = useState(selectedPrinter?.serial_number || '');
    const [sectionCode, setSectionCode] = useState(() => {
        if (company.section && company.section.toLowerCase().includes('malibu')) {
            const sec = sections.find(s => s.name === company.section);
            return sec ? sec.section_code : 'all';
        }
        return 'all';
    });
    const [startDate, setStartDate] = useState<Date | undefined>(() => {
        return (
            fromDate
                ? new Date(fromDate)
                : (() => {
                    const today = new Date();
                    today.setDate(today.getDate() - 7);
                    return today;
                })()
        );
    });
    const [endDate, setEndDate] = useState<Date | undefined>(() => {
        return (
            toDate
                ? new Date(toDate)
                : (() => {
                    const today = new Date();
                    return today;
                })()
        );
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const visibleSections = useMemo(() => {
        let list = sections;
        if (company.section && company.section.toLowerCase().includes('malibu')) {
            list = list.filter(s => s.name === company.section);
        }
        return list;
    }, [sections, company.section]);

    // Filter printers based on search term
    const filteredPrinters = printers.filter(printer =>
        printer.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        printer.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        printer.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        printer.item_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleApplyFilters = () => {
        if (!serialNumber) {
            alert('Please select a printer');
            return;
        }

        setIsLoading(true);
        const params = new URLSearchParams();
        params.append('serial_number', serialNumber);
        if (sectionCode && sectionCode !== 'all') params.append('section', sectionCode);
        if (startDate) params.append('from_date', startDate.toISOString().split('T')[0]);
        if (endDate) params.append('to_date', endDate.toISOString().split('T')[0]);

        router.get('/reports/printer-stock-bin-card', Object.fromEntries(params), {
            preserveState: true,
            onFinish: () => setIsLoading(false),
        });
    };

    const handleReset = () => {
        setSerialNumber('');
        setSectionCode('all');
        setStartDate(undefined);
        setEndDate(undefined);
        setSearchTerm('');
        router.get('/reports/printer-stock-bin-card');
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExportCsv = () => {
        if (!selectedPrinter) return;

        const headers = ['Date', 'Description', 'Reference', 'Received', 'Issued', 'Balance'];
        const csvRows = [];
        csvRows.push(headers.join(','));

        // Opening Balance
        const openBal = Number(openingBalance || 0);
        csvRows.push(`"-","Opening Balance","-","-","-","${openBal}"`);

        // Transactions
        transactions.forEach(t => {
            const desc = `"${(t.description || '').replace(/"/g, '""')}"`;
            const ref = `"${(t.reference || '').replace(/"/g, '""')}"`;
            const received = t.received || '"-"';
            const issued = t.issued || '"-"';
            const bal = `"${t.balance}"`;
            csvRows.push(`"${t.date}",${desc},${ref},${received},${issued},${bal}`);
        });

        // Closing Balance
        const closeBal = Number(closingBalance || 0);
        csvRows.push(`"-","Closing Balance","-","-","-","${closeBal}"`);

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        
        const dateStr = new Date().getTime();
        link.setAttribute('download', `Printer_Stock_Bin_Card_${selectedPrinter.serial_number}_${dateStr}.csv`);
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <AppLayout
            breadcrumbs={breadcrumbs}
        >
            <Head title={t('Printer Stock Bin Card')}>
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
                        
                        #printable-card,
                        #printable-card * {
                            visibility: visible;
                        }
                        
                        #printable-card {
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
                            margin-bottom: 8px;
                            border-bottom: 1px solid #000;
                            padding-bottom: 6px;
                            display: block !important;
                        }
                        
                        .print-company-name {
                            font-size: 18px;
                            font-weight: bold;
                            text-align: center;
                            margin-bottom: 3px;
                        }
                        
                        .print-report-title {
                            font-size: 14px;
                            font-weight: bold;
                            text-align: center;
                            margin-bottom: 6px;
                        }
                        
                        .print-item-info {
                            margin-bottom: 15px;
                            /* ensure info rows span full width like stock-in-hand */
                        }
                        
                        .print-info-row {
                            display: flex;
                            justify-content: space-between;
                            font-size: 12px;
                            margin-bottom: 3px;
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
                        
                        /* Right align Received, Issued, Balance columns */
                        th:nth-child(4), th:nth-child(5), th:nth-child(6),
                        td:nth-child(4), td:nth-child(5), td:nth-child(6) {
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

                        /* hide card shadows/borders when printing */
                        #printable-card > .bg-white,
                        #printable-card .bg-white {
                            box-shadow: none !important;
                            border: none !important;
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
                                    <Printer className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">
                                        {t('Printer Stock Bin Card')}
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        {t('View printer stock movements and balance')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Button
                                    onClick={handleExportCsv}
                                    disabled={!selectedPrinter || transactions.length === 0}
                                    className="inline-flex items-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                                >
                                    <Download className="mr-1.5 h-4 w-4" />
                                    {t('Export CSV')}
                                </Button>
                                <Button
                                    onClick={handlePrint}
                                    disabled={!selectedPrinter || transactions.length === 0}
                                    className="inline-flex items-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                                >
                                    <Printer className="mr-1.5 h-4 w-4" />
                                    {t('Print Card')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        {/* Filters Section */}
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm no-print mb-4">
                            <div className="flex flex-col">
                                <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                    <Filter className="h-4 w-4" />
                                    {t('Printer Card Filters')}
                                </h3>
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                                    {/* Section Filter */}
                                    <div className="space-y-2">
                                        <Label htmlFor="section">{t('Section')}</Label>
                                        <Select
                                            value={sectionCode}
                                            onValueChange={(value) => {
                                                setSectionCode(value);
                                            }}
                                        >
                                            <SelectTrigger className="border-slate-300 bg-white focus:border-vismass-blue focus:ring-vismass-blue">
                                                <SelectValue placeholder={t('All Sections')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">{t('All Sections')}</SelectItem>
                                                {visibleSections.map((sec) => (
                                                    <SelectItem key={sec.id} value={sec.section_code}>
                                                        {sec.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Printer Search & Selection - Combobox */}
                                    <div className="space-y-2 lg:col-span-2">
                                        <Label>{t('Search & Select Printer')} *</Label>
                                        <Popover open={open} onOpenChange={setOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={open}
                                                    className="w-full justify-between border-slate-300 bg-white focus:border-vismass-blue focus:ring-vismass-blue"
                                                >
                                                    {serialNumber
                                                        ? (() => {
                                                            const selected = printers.find((printer) => printer.serial_number === serialNumber);
                                                            return selected ? `${selected.serial_number} - ${selected.brand} ${selected.model}` : t('Select printer');
                                                        })()
                                                        : t('Search and select printer...')}
                                                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[400px] p-0" align="start">
                                                <Command>
                                                    <CommandInput 
                                                        placeholder={t('Search by serial, brand, model...')} 
                                                        className="h-9"
                                                    />
                                                    <CommandList>
                                                        <CommandEmpty>{t('No printer found.')}</CommandEmpty>
                                                        <CommandGroup>
                                                            {filteredPrinters.slice(0, 50).map((printer) => (
                                                                <CommandItem
                                                                    key={printer.serial_number}
                                                                    value={`${printer.serial_number} ${printer.brand || ''} ${printer.model || ''} ${printer.item_name || ''}`}
                                                                    onSelect={() => {
                                                                        setSerialNumber(printer.serial_number);
                                                                        setOpen(false);
                                                                    }}
                                                                >
                                                                    <div className="flex flex-col flex-1 mr-2">
                                                                        <div className="font-medium flex justify-between items-center">
                                                                            <span>{printer.serial_number} - {printer.brand} {printer.model}</span>
                                                                            <span className="bg-slate-100 text-slate-800 text-xs px-2 py-0.5 rounded-full border border-slate-200 whitespace-nowrap ml-2">
                                                                                {t('Stock')}: {printer.balance}
                                                                            </span>
                                                                        </div>
                                                                        <div className="text-xs text-slate-500">
                                                                            {printer.item_name}
                                                                        </div>
                                                                    </div>
                                                                    <Check
                                                                        className={cn(
                                                                            "ml-auto h-4 w-4",
                                                                            serialNumber === printer.serial_number ? "opacity-100" : "opacity-0"
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
                                        disabled={isLoading || !serialNumber}
                                        className="w-full sm:w-auto bg-vismass-blue hover:bg-vismass-blue/90 text-white gap-2"
                                    >
                                        <Filter className="h-4 w-4" />
                                        {t('Generate Card')}
                                    </Button>
                                    <Button
                                        onClick={handleReset}
                                        variant="outline"
                                        className="w-full sm:w-auto bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 gap-2"
                                    >
                                        <RotateCcw className="h-4 w-4" />
                                        {t('Reset')}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Results Section */}
                        {selectedPrinter ? (
                            <div id="printable-card" className="rounded-lg border border-slate-200 bg-white shadow overflow-hidden">
                                {/* Print Header */}
                                <div className="print-header bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 py-3 no-print">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="rounded-lg bg-white/20 p-2">
                                                <Printer className="h-5 w-5 text-white" />
                                            </div>
                                            <div>
                                                <h2 className="text-base font-semibold text-white">
                                                    {t('Printer Stock Bin Card')}
                                                </h2>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Printable Content */}
                                <div className="p-6">
                                    <div className="print-header" style={{ display: 'none' }}>
                                        <div className="print-info-row" style={{ marginBottom: '6px' }}>
                                            <span><strong>Report Date:</strong> {(startDate ? startDate : new Date()).toLocaleDateString('en-GB')}</span>
                                            <span className="text-right"><strong>{t('Item Code')}:</strong> {selectedPrinter?.item_code}</span>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ flex: '0 0 20%' }}>
                                                <AppLogo companyCode={company?.code} />
                                            </div>

                                            <div style={{ flex: '1', textAlign: 'center' }}>
                                                <div className="print-report-title">{t('Printer Stock Bin Card')}</div>
                                            </div>

                                            <div style={{ flex: '0 0 20%', textAlign: 'right' }}>
                                                <div><strong>{t('Serial Number')}:</strong> {selectedPrinter?.serial_number}</div>
                                                <div><strong>{t('Section')}:</strong> {company.section}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="no-print">
                                        <div className="print-company-name text-center mb-4">
                                            <AppLogo companyCode={company?.code} />
                                        </div>

                                        <div className="print-report-title text-center mb-6">
                                            {t('Printer Stock Bin Card')}
                                        </div>
                                    </div>

                                    {/* Item Information */}
                                    <div className="print-item-info mb-6">
                                        <div
                                            className="text-sm"
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '12px',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            <span><strong>{t('Brand')}:</strong> {selectedPrinter.brand}</span>
                                            <span><strong>{t('Model')}:</strong> {selectedPrinter.model}</span>
                                            <span><strong>{t('Item Name')}:</strong> {selectedPrinter.item_name}</span>
                                        </div>

                                        <div className="print-info-row mt-2">
                                            <span><strong>{t('Period')}:</strong></span>
                                            <span>{startDate ? startDate.toLocaleDateString('en-GB') : 'N/A'} - {endDate ? endDate.toLocaleDateString('en-GB') : 'N/A'}</span>
                                        </div>
                                    </div>

                                    {/* Transactions Table */}
                                    <div className="overflow-x-auto">
                                        <table className="w-full border-collapse border border-slate-300">
                                            <thead>
                                                <tr className="bg-slate-100">
                                                    <th className="border border-slate-300 px-3 py-2 text-left font-semibold">
                                                        {t('Date')}
                                                    </th>
                                                    <th className="border border-slate-300 px-3 py-2 text-left font-semibold">
                                                        {t('Description')}
                                                    </th>
                                                    <th className="border border-slate-300 px-3 py-2 text-left font-semibold">
                                                        {t('Reference')}
                                                    </th>
                                                    <th className="border border-slate-300 px-3 py-2 text-right font-semibold">
                                                        {t('Received')}
                                                    </th>
                                                    <th className="border border-slate-300 px-3 py-2 text-right font-semibold">
                                                        {t('Issued')}
                                                    </th>
                                                    <th className="border border-slate-300 px-3 py-2 text-right font-semibold">
                                                        {t('Balance')}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {/* Opening Balance Row */}
                                                <tr className="balance-row bg-slate-50">
                                                    <td className="border border-slate-300 px-3 py-2 font-medium" colSpan={5}>
                                                        {t('Opening Balance')}
                                                    </td>
                                                    <td className="border border-slate-300 px-3 py-2 text-right font-bold">
                                                        {openingBalance}
                                                    </td>
                                                </tr>

                                                {/* Transaction Rows */}
                                                {transactions.length > 0 ? (
                                                    transactions.map((transaction) => (
                                                        <tr key={transaction.id} className="hover:bg-slate-50">
                                                            <td className="border border-slate-300 px-3 py-2">
                                                                {transaction.date}
                                                            </td>
                                                            <td className="border border-slate-300 px-3 py-2">
                                                                {transaction.description}
                                                            </td>
                                                            <td className="border border-slate-300 px-3 py-2">
                                                                {transaction.reference}
                                                            </td>
                                                            <td className="border border-slate-300 px-3 py-2 text-right">
                                                                {transaction.received || '-'}
                                                            </td>
                                                            <td className="border border-slate-300 px-3 py-2 text-right">
                                                                {transaction.issued || '-'}
                                                            </td>
                                                            <td className="border border-slate-300 px-3 py-2 text-right font-medium">
                                                                {transaction.balance}
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={6} className="border border-slate-300 px-3 py-8 text-center text-slate-500">
                                                            {t('No transactions found for the selected period.')}
                                                        </td>
                                                    </tr>
                                                )}

                                                {/* Closing Balance Row */}
                                                <tr className="balance-row bg-slate-50">
                                                    <td className="border border-slate-300 px-3 py-2 font-medium" colSpan={5}>
                                                        {t('Closing Balance')}
                                                    </td>
                                                    <td className="border border-slate-300 px-3 py-2 text-right font-bold">
                                                        {closingBalance}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Footer */}
                                    <div className="print-footer mt-8 pt-4 border-t border-slate-300">
                                        <div className="text-sm text-slate-600">
                                            <strong>{t('Report Generated')}:</strong> {new Date().toLocaleDateString()} {'  '}|{'  '}
                                            <strong>{t('Total Transactions')}:</strong> {transactions.length}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Printer Selection Prompt */
                            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12">
                                <div className="text-center">
                                    <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                        <Printer className="h-8 w-8 text-slate-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                                        {t('Select a Printer')}
                                    </h3>
                                    <p className="text-slate-600">
                                        {t('Choose a printer from the filters above to view its stock bin card.')}
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

import AppLayout from '@/layouts/app-layout';
import AppLogo from '@/components/app-logo';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PageProps, Company } from '@/types';
import { Printer, Search, RotateCcw, FileText, Download, Users } from 'lucide-react';
import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Address } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
interface CustomerOutstanding {
    id: number;
    customer_code: string;
    customer_name: string;
    phone: string;
    outstanding_balance: number;
}

interface CustomerOutstandingsProps extends PageProps {
    company: Company;
    customers: Address[];
    filters: {
        search?: string;
        show_zero?: boolean;
        customer_id?: string;
    };
    reportData: {
        items: CustomerOutstanding[];
        summary: {
            total_outstanding: number;
            total_customers: number;
        };
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Customer Outstandings',
        href: '/reports/customer-outstandings',
    },
];

export default function CustomerOutstandingsReport({
    auth,
    company,
    customers = [],
    filters,
    reportData,
}: CustomerOutstandingsProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [showZero, setShowZero] = useState(filters.show_zero || false);
    const [customerId, setCustomerId] = useState(filters.customer_id || '');
    const [isLoading, setIsLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const printDateTime = new Date().toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    const handleApplyFilters = () => {
        setIsLoading(true);
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (showZero) params.append('show_zero', 'true');
        if (customerId) params.append('customer_id', customerId);

        router.get(
            `/reports/customer-outstandings?${params.toString()}`,
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
        setSearch('');
        setShowZero(false);
        setCustomerId('');
        router.get('/reports/customer-outstandings', {}, {
            preserveState: false,
            preserveScroll: false,
        });
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExport = (format: 'pdf' | 'excel') => {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (showZero) params.append('show_zero', 'true');
        if (customerId) params.append('customer_id', customerId);
        params.append('format', format);

        window.location.href = `/reports/customer-outstandings/export?${params.toString()}`;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Customer Outstandings')}>
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
                        
                        .print-info-row {
                            display: flex;
                            justify-content: space-between;
                            font-size: 11px;
                            margin-bottom: 2px;
                        }
                        
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            font-size: 11px;
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
                            padding: 6px;
                            color: #000 !important;
                        }
                        
                        th {
                            background-color: #e5e7eb !important;
                            font-weight: bold;
                            text-align: left;
                        }
                        
                        .balance-row {
                            background-color: #f3f4f6 !important;
                            font-weight: bold;
                        }
                        
                        .print-footer {
                            margin-top: 20px;
                            padding-top: 10px;
                            border-top: 1px solid #000;
                            font-size: 10px;
                            display: flex !important;
                            justify-content: space-between;
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
                                    <Users className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="truncate text-lg sm:text-xl font-bold text-white">
                                        {t('Customer Outstandings')}
                                    </h1>
                                    <p className="hidden text-xs text-white/80 sm:block">
                                        {t('View outstanding balances for all customers')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto mt-3 sm:mt-0">
                                <Button
                                    onClick={() => handleExport('excel')}
                                    className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                                >
                                    <Download className="mr-1.5 h-4 w-4" />
                                    {t('Export CSV')}
                                </Button>
                                <Button
                                    onClick={() => handleExport('pdf')}
                                    className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                                >
                                    <FileText className="mr-1.5 h-4 w-4" />
                                    {t('Export PDF')}
                                </Button>
                                <Button
                                    onClick={handlePrint}
                                    className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                                >
                                    <Printer className="mr-1.5 h-4 w-4" />
                                    {t('Print')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        {/* Filters */}
                        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden no-print mb-6">
                            <div className="p-4 sm:p-6">
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                                    {/* <div className="space-y-2">
                                        <Label>{t('Search Customer')}</Label>
                                        <Input
                                            placeholder={t('Search by name or code')}
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                                        />
                                    </div> */}
                                    
                                    <div className="space-y-2">
                                        <Label>{t('Select Customer')}</Label>
                                        <Popover open={open} onOpenChange={setOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={open}
                                                    className="w-full justify-between border-slate-300 bg-white focus:border-vismass-blue focus:ring-vismass-blue font-normal"
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
                                                        : <span className="text-muted-foreground">{t('All customers...')}</span>}
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
                                                                        setCustomerId(customerId === customer.AdrCd ? '' : customer.AdrCd);
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
                                    
                                    <div className="space-y-2 flex flex-col justify-end">
                                        <div className="flex items-center space-x-2 pb-2">
                                            <Checkbox 
                                                id="show-zero" 
                                                checked={showZero} 
                                                onCheckedChange={(c) => setShowZero(c === true)} 
                                            />
                                            <Label htmlFor="show-zero" className="cursor-pointer font-normal">
                                                {t('Show customers with zero balance')}
                                            </Label>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                                    <Button
                                        onClick={handleApplyFilters}
                                        disabled={isLoading}
                                        className="w-full sm:w-auto bg-vismass-blue hover:bg-vismass-blue/90 text-white gap-2"
                                    >
                                        <Search className="h-4 w-4" />
                                        {t('Generate Report')}
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

                        {/* Report Display */}
                        <div id="printable-report">
                            <div className="print-header" style={{ display: 'none' }}>
                                <div className="mb-4 text-center">
                                    <div className="mx-auto mb-3" style={{ width: '140px' }}>
                                        <AppLogo companyCode={(company as any)?.company_code || (company as any)?.code} />
                                    </div>
                                </div>
                                <div className="print-info-row text-center font-bold text-lg mb-2 block">
                                    {t('Customer Outstandings Report')}
                                </div>
                                <div className="print-info-row">
                                    <span><strong>Generated Date:</strong> {printDateTime}</span>
                                </div>
                                {search && (
                                    <div className="print-info-row">
                                        <span><strong>Search Filter:</strong> {search}</span>
                                    </div>
                                )}
                            </div>

                            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                                <div className="p-4 sm:p-6">
                                    <div className="overflow-x-auto print:overflow-visible">
                                        <Table className="min-w-[840px] print:min-w-full">
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="font-bold">{t('Customer Code')}</TableHead>
                                                    <TableHead className="font-bold">{t('Customer Name')}</TableHead>
                                                    <TableHead className="font-bold">{t('Contact')}</TableHead>
                                                    <TableHead className="font-bold text-right">{t('Outstanding Balance (Rs.)')}</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {reportData.items.length > 0 ? (
                                                    reportData.items.map((item) => (
                                                        <TableRow key={item.id}>
                                                            <TableCell className="font-medium">{item.customer_code}</TableCell>
                                                            <TableCell>{item.customer_name}</TableCell>
                                                            <TableCell>{item.phone || '-'}</TableCell>
                                                            <TableCell className="text-right font-medium">
                                                                {Number(item.outstanding_balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={4} className="text-center py-8">
                                                            <div className="flex flex-col items-center">
                                                                <Users className="h-10 w-10 text-slate-400 mb-2" />
                                                                <p className="text-sm font-medium text-slate-900">{t('No Customers Found')}</p>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                                
                                                {/* Summary Row */}
                                                <TableRow className="bg-slate-100 font-bold balance-row border-t-2 border-slate-300">
                                                    <TableCell colSpan={3} className="text-right">{t('Total Outstanding')}</TableCell>
                                                    <TableCell className="text-right text-lg text-vismass-blue">
                                                        {Number(reportData.summary.total_outstanding).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <div className="mt-4 text-sm text-slate-500 no-print">
                                        Showing {reportData.summary.total_customers} customers.
                                    </div>
                                </div>

                                {/* Print Footer */}
                                <div className="print-footer" style={{ display: 'none' }}>
                                    <span>Developed by Unitec Software Solution</span>
                                    <span>Printed on: {printDateTime}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </AppLayout>
    );
}

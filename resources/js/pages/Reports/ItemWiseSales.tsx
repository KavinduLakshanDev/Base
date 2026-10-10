import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { Head, router } from '@inertiajs/react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Printer, FileText, Eye, Download, Check, ChevronDown, Filter, RotateCcw, Search } from 'lucide-react';
import { PageProps, Company } from '@/types';
import { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ItemWiseSaleRecord {
    item_code: string;
    item_name: string;
    total_quantity: number;
    total_sales: number;
}

interface ItemWiseSalesProps extends PageProps {
    records: ItemWiseSaleRecord[];
    company: Company;
    cashiers: { id: number; name: string }[];
    items?: { ItemCode: string; ItmNm: string }[];
    filters?: {
        item_type?: 'all' | 'printer' | 'product';
        item_name?: string;
        cashier_id?: string;
        from_date?: string;
        to_date?: string;
    };
}

export default function ItemWiseSales({ records = [], company, cashiers = [], items = [], filters }: ItemWiseSalesProps) {
    const [selectedItemType, setSelectedItemType] = useState<'all' | 'printer' | 'product'>(
        filters?.item_type || 'all',
    );
    const [selectedCashierId, setSelectedCashierId] = useState<string>(
        filters?.cashier_id || 'all'
    );
    const [itemName, setItemName] = useState<string>(filters?.item_name || '');
    
    const [openItemSearch, setOpenItemSearch] = useState(false);
    const [itemSearchTerm, setItemSearchTerm] = useState('');

    const filteredItems = useMemo(() => {
        if (!itemSearchTerm.trim()) return items;

        const lowerCaseSearch = itemSearchTerm.toLowerCase();
        return items.filter((item) =>
            item.ItemCode.toLowerCase().includes(lowerCaseSearch) ||
            item.ItmNm.toLowerCase().includes(lowerCaseSearch)
        );
    }, [items, itemSearchTerm]);

    const parseLocalDate = (dateStr?: string) => {
        if (!dateStr) return undefined;
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
    };

    const [startDate, setStartDate] = useState<Date | undefined>(() => {
        if (filters?.from_date) {
            return parseLocalDate(filters.from_date);
        }
        const today = new Date();
        today.setMonth(today.getMonth() - 3);
        return today;
    });
    const [endDate, setEndDate] = useState<Date | undefined>(() => {
        if (filters?.to_date) {
            return parseLocalDate(filters.to_date);
        }
        const today = new Date();
        return today;
    });

    const formatDateLocal = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const normalizedCompanyCode = (company?.company_code || 'VIS001').toUpperCase();
    const printLogoSrc = normalizedCompanyCode.startsWith('MAL')
        ? '/images/malibu-logo.png'
        : normalizedCompanyCode === 'MASS'
            ? '/images/mass-logo.svg'
            : '/images/Vismass-logo.png';

    const handlePrint = () => window.print();

    const handleExportCsv = () => {
        if (!records || records.length === 0) return;

        const headers = ['Item Code', 'Item Name', 'Quantity', 'Total Sales Value'];
        const csvRows = [];
        csvRows.push(headers.join(','));

        records.forEach(r => {
            const itemCode = `"${(r.item_code || '').replace(/"/g, '""')}"`;
            const itemName = `"${(r.item_name || '').replace(/"/g, '""')}"`;
            const quantity = `"${Number(r.total_quantity || 0).toFixed(2)}"`;
            const totalSales = `"${Number(r.total_sales || 0).toFixed(2)}"`;
            
            csvRows.push(`${itemCode},${itemName},${quantity},${totalSales}`);
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        
        const dateStr = new Date().getTime();
        link.setAttribute('download', `Item_Wise_Sales_Report_${dateStr}.csv`);
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleApplyFilters = () => {
        const params: Record<string, string> = {
            item_type: selectedItemType,
        };
        
        if (itemName) {
            params.item_name = itemName;
        }

        if (selectedCashierId && selectedCashierId !== 'all') {
            params.cashier_id = selectedCashierId;
        }

        if (startDate) {
            params.from_date = formatDateLocal(startDate);
        }
        if (endDate) {
            params.to_date = formatDateLocal(endDate);
        }

        router.get('/reports/item-wise-sales', params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleResetFilters = () => {
        setSelectedItemType('all');
        setSelectedCashierId('all');
        setItemName('');
        const today = new Date();
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(today.getMonth() - 3);
        setStartDate(threeMonthsAgo);
        setEndDate(today);
        router.get('/reports/item-wise-sales', {}, { preserveState: true, preserveScroll: true, replace: true });
    };

    return (
        <AppLayout
            breadcrumbs={[{ title: t('Reports'), href: '/reports' }, { title: t('Item-Wise Sales'), href: '/reports/item-wise-sales' }]}
        >
            <Head title={t('Item-Wise Sales Report')}>
                <style>{`
                        /* Print Table Container */
                        .print-table-container {
                            display: none;
                        }

                        @media print {
                            .print-table-container {
                                display: block !important;
                            }

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
                            
                            #printable-items,
                            #printable-items * {
                                visibility: visible;
                            }
                            
                            #printable-items {
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
                                margin-bottom: 10px;
                                border-bottom: 2px solid #000;
                                padding-bottom: 6px;
                                display: block !important;
                            }

                            .print-logo-compact {
                                display: block !important;
                                visibility: visible !important;
                                height: 32px !important;
                                width: auto !important;
                                max-height: 32px !important;
                                margin: 0 auto 4px auto !important;
                                object-fit: contain !important;
                            }

                            .print-title-compact {
                                text-align: center;
                                font-size: 16px;
                                font-weight: 700;
                                margin: 0;
                                line-height: 1.2;
                            }
                            
                            .print-table {
                                display: table !important;
                                width: 100%;
                                border-collapse: collapse;
                                font-size: 10px;
                                page-break-inside: auto;
                                color: #000 !important;
                                margin-bottom: 20px;
                                margin-top: 15px;
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
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow no-print">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-center space-x-3">
                                <div className="shrink-0 rounded-lg bg-white/20 p-2 shadow">
                                    <FileText className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="truncate text-lg sm:text-xl font-bold text-white">{t('Item-Wise Sales Report')}</h1>
                                    <p className="hidden text-xs text-white/80 sm:block">{t('Aggregated sales quantities and values by item')}</p>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                <Button onClick={handleExportCsv} className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200">
                                    <Download className="mr-1.5 h-4 w-4" />
                                    {t('Export CSV')}
                                </Button>
                                <Button onClick={handlePrint} className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200">
                                    <Printer className="mr-1.5 h-4 w-4" />
                                    {t('Print')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div id="printable-items">
                        <div className="print-header" style={{ display: 'none' }}>
                            <img
                                src={printLogoSrc}
                                alt={company?.name || 'Company'}
                                className="print-logo-compact"
                                onError={(e) => {
                                    const img = e.currentTarget;
                                    if (!img.dataset.fallback) {
                                        img.dataset.fallback = '1';
                                        img.src = '/images/vismass-logo.svg';
                                    }
                                }}
                            />
                            <div className="print-title-compact">{t('Item-Wise Sales Report')}</div>
                            <div style={{ textAlign: 'center', fontSize: '12px', marginTop: '4px' }}>
                                From: {filters?.from_date} To: {filters?.to_date}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden no-print">
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 sm:px-6 py-4">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">{t('Item-Wise Sales Report')}</h3>
                                        <p className="text-white/80 text-sm mt-1">{t('Aggregated sales by item')}</p>
                                    </div>
                                    <div className="text-white/80 text-sm whitespace-nowrap">{t('Generated on')}: {new Date().toLocaleDateString()}</div>
                                </div>
                            </div>

                            <div className="p-4 sm:p-6">
                                {/* Filters Section */}
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm mb-6">
                                    <div className="flex flex-col">
                                        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                            <Filter className="h-4 w-4" />
                                            {t('Sales Filters')}
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                            {/* Item Type */}
                                            <div className="space-y-2">
                                                <Label htmlFor="item_type" className="text-sm font-medium text-gray-700">
                                                    {t('Item Type')}
                                                </Label>
                                                <Select
                                                    value={selectedItemType}
                                                    onValueChange={(value: 'all' | 'printer' | 'product') => setSelectedItemType(value)}
                                                >
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Filter by Sales Item" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">All Items</SelectItem>
                                                        <SelectItem value="printer">Printers</SelectItem>
                                                        <SelectItem value="product">Products</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Item Name / Code */}
                                            <div className="space-y-2">
                                                <Label htmlFor="item_name" className="text-sm font-medium text-gray-700">
                                                    {t('Item Name / Code')}
                                                </Label>
                                                <Popover open={openItemSearch} onOpenChange={setOpenItemSearch}>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            role="combobox"
                                                            aria-expanded={openItemSearch}
                                                            className="w-full justify-between border-slate-300 bg-white hover:bg-slate-50"
                                                        >
                                                            <span className="truncate">
                                                                {itemName
                                                                    ? (() => {
                                                                        const selected = items.find((item) => item.ItemCode === itemName || item.ItmNm === itemName);
                                                                        return selected ? `${selected.ItemCode} - ${selected.ItmNm}` : itemName;
                                                                    })()
                                                                    : t('Search and select item...')}
                                                            </span>
                                                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[400px] p-0" align="start">
                                                        <Command>
                                                            <CommandInput
                                                                value={itemSearchTerm}
                                                                onValueChange={(value: string) => setItemSearchTerm(value)}
                                                                placeholder={t('Search by name or code...')}
                                                                className="h-9"
                                                            />
                                                            <CommandList>
                                                                <CommandEmpty>{t('No item found.')}</CommandEmpty>
                                                                <CommandGroup>
                                                                    <CommandItem
                                                                        value="all"
                                                                        onSelect={() => {
                                                                            setItemName('');
                                                                            setOpenItemSearch(false);
                                                                        }}
                                                                    >
                                                                        {t('Clear Selection')}
                                                                    </CommandItem>
                                                                    {filteredItems.slice(0, 50).map((item) => (
                                                                        <CommandItem
                                                                            key={item.ItemCode}
                                                                            value={`${item.ItemCode} ${item.ItmNm}`}
                                                                            onSelect={() => {
                                                                                setItemName(item.ItemCode);
                                                                                setOpenItemSearch(false);
                                                                            }}
                                                                        >
                                                                            <div className="flex flex-col">
                                                                                <div className="font-medium">
                                                                                    {item.ItemCode} - {item.ItmNm}
                                                                                </div>
                                                                            </div>
                                                                            <Check
                                                                                className={cn(
                                                                                    "ml-auto h-4 w-4",
                                                                                    itemName === item.ItemCode ? "opacity-100" : "opacity-0"
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

                                            {/* Cashier */}
                                            <div className="space-y-2">
                                                <Label htmlFor="cashier" className="text-sm font-medium text-gray-700">
                                                    {t('Cashier')}
                                                </Label>
                                                <Select
                                                    value={selectedCashierId}
                                                    onValueChange={(value: string) => setSelectedCashierId(value)}
                                                >
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Filter by Cashier" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">All Cashiers</SelectItem>
                                                        {cashiers.map((cashier) => (
                                                            <SelectItem key={cashier.id} value={cashier.id.toString()}>
                                                                {cashier.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Date Range Filters */}
                                            <div className="space-y-2">
                                                <Label htmlFor="from_date" className="text-sm font-medium text-gray-700">
                                                    {t('From Date')}
                                                </Label>
                                                <input
                                                    type="date"
                                                    id="from_date"
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
                                                <Label htmlFor="to_date" className="text-sm font-medium text-gray-700">
                                                    {t('To Date')}
                                                </Label>
                                                <input
                                                    type="date"
                                                    id="to_date"
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

                                        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                                            <Button
                                                onClick={handleApplyFilters}
                                                className="w-full sm:w-auto bg-vismass-blue hover:bg-vismass-blue/90 text-white gap-2"
                                            >
                                                <Search className="h-4 w-4" />
                                                {t('Apply')}
                                            </Button>
                                            <Button
                                                onClick={handleResetFilters}
                                                variant="outline"
                                                className="w-full sm:w-auto bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 gap-2"
                                            >
                                                <RotateCcw className="h-4 w-4" />
                                                {t('Reset')}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Table */}
                                <div className="space-y-6">
                                    <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                                        <div className="overflow-x-auto">
                                            <Table className="min-w-[800px]">
                                                <TableHeader className="bg-slate-50">
                                                    <TableRow>
                                                        <TableHead>Item Code</TableHead>
                                                        <TableHead>Item Name</TableHead>
                                                        <TableHead className="text-right">Quantity</TableHead>
                                                        <TableHead className="text-right">Total Sales Value</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {records.map((r, index) => (
                                                        <TableRow key={index}>
                                                            <TableCell className="font-medium">{r.item_code}</TableCell>
                                                            <TableCell>{r.item_name}</TableCell>
                                                            <TableCell className="text-right">{Number(r.total_quantity).toFixed(2)}</TableCell>
                                                            <TableCell className="text-right">{Number(r.total_sales).toFixed(2)}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                    {records.length === 0 && (
                                                        <TableRow>
                                                            <TableCell colSpan={4} className="text-center py-10 text-gray-500">
                                                                No records found for the selected criteria.
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Print Table - Only visible in print */}
                        <div className="print-table-container">
                            <table className="print-table">
                                <thead>
                                    <tr>
                                        <th>Item Code</th>
                                        <th>Item Name</th>
                                        <th style={{ textAlign: 'right' }}>Quantity</th>
                                        <th style={{ textAlign: 'right' }}>Total Sales Value</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {records.map((r, index) => (
                                        <tr key={index}>
                                            <td>{r.item_code}</td>
                                            <td>{r.item_name}</td>
                                            <td style={{ textAlign: 'right' }}>{Number(r.total_quantity).toFixed(2)}</td>
                                            <td style={{ textAlign: 'right' }}>{Number(r.total_sales).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                    {records.length === 0 && (
                                        <tr>
                                            <td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>
                                                No records found for the selected criteria.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
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
                </main>
            </div>
        </AppLayout>
    );
}

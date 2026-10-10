import { useState, useMemo } from 'react';
import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { Head, router } from '@inertiajs/react';
import ReportPrintHeader from '@/components/report-print-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    Printer,
    Filter,
    Calendar,
    TrendingUp,
    DollarSign,
    Package,
    ArrowLeft,
    RotateCcw,
    FileText,
} from 'lucide-react';
import { PageProps, Company } from '@/types';
import { cn } from '@/lib/utils';

interface SalesItem {
    id: number;
    transaction_date: string;
    invoice_no: string;
    item_code: string;
    item_name: string;
    quantity: number;
    sales_price: number;
    cost_price: number;
    total_sales: number;
    total_cost: number;
    profit: number;
    unit?: string;
    unit_info?: string;
    is_secondary_unit?: boolean;
    conversion_factor?: number;
}

interface ProfitReportProps extends PageProps {
    salesItems: SalesItem[];
    summary: {
        total_sales: number;
        total_cost: number;
        total_profit: number;
    };
    company: Company;
    filters: {
        start_date: string;
        end_date: string;
        item_type?: 'all' | 'printer' | 'stationary';
        section_code?: string;
    };
    sections?: Array<{ section_code: string; name: string }>;
}

export default function ProfitReport({
    salesItems = [],
    summary,
    company,
    filters,
    sections = [],
}: ProfitReportProps) {

    const parseFilterDate = (dateString: string) => {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day);
    };

    const formatFilterDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [startDate, setStartDate] = useState<string>(
        filters.start_date || formatFilterDate(new Date())
    );
    const [endDate, setEndDate] = useState<string>(
        filters.end_date || formatFilterDate(new Date())
    );
    const [itemType, setItemType] = useState<'all' | 'printer' | 'stationary'>(filters.item_type || 'all');
    const [sectionCode, setSectionCode] = useState<string>(filters.section_code || 'all');

    const printExtraLines: Array<{ label: string; value: string }> = [];
    if (itemType !== 'all') {
        printExtraLines.push({
            label: 'Item Type',
            value: itemType === 'printer' ? 'Printer' : 'Stationary',
        });
    }
    if (sectionCode !== 'all') {
        printExtraLines.push({
            label: 'Section',
            value: sections.find((s) => s.section_code === sectionCode)?.name || sectionCode,
        });
    }

    // Group items by date for the "day by day" display
    const groupedData = useMemo(() => {
        const groups: Record<string, SalesItem[]> = {};
        salesItems.forEach((item) => {
            const date = item.transaction_date;
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(item);
        });

        // Return sorted keys (descending dates)
        return Object.keys(groups).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).map(date => {
            // Sort items within each date by invoice number to ensure grouping logic works
            const sortedItems = [...groups[date]].sort((a, b) => {
                const invA = a.invoice_no || "";
                const invB = b.invoice_no || "";
                return invA.localeCompare(invB);
            });
            
            return {
                date,
                items: sortedItems,
                dailyTotalSales: groups[date].reduce((sum, item) => sum + item.total_sales, 0),
                dailyTotalCost: groups[date].reduce((sum, item) => sum + item.total_cost, 0),
                dailyTotalProfit: groups[date].reduce((sum, item) => sum + item.profit, 0),
            };
        });
    }, [salesItems]);

    // Function to handle filter changes
    const handleFilterChange = (key: 'start_date' | 'end_date' | 'item_type' | 'section_code', value: string) => {
        if (key === 'start_date') setStartDate(value);
        if (key === 'end_date') setEndDate(value);
        if (key === 'item_type') setItemType(value as any);
        if (key === 'section_code') setSectionCode(value);

        const params: any = {
            start_date: key === 'start_date' ? value : startDate,
            end_date: key === 'end_date' ? value : endDate,
            item_type: key === 'item_type' ? value : itemType,
            section_code: key === 'section_code' ? value : sectionCode,
        };

        // don't send default marker values
        if (params.item_type === 'all') delete params.item_type;
        if (params.section_code === 'all') delete params.section_code;

        router.get(
            '/reports/profit-report',
            params,
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const handleResetFilters = () => {
        const today = new Date().toISOString().split('T')[0];
        setStartDate(today);
        setEndDate(today);
        setItemType('all');
        setSectionCode('all');

        router.get('/reports/profit-report', {}, {
            preserveState: false,
            preserveScroll: false,
        });
    };

    const handleExportCsv = () => {
        if (!salesItems || salesItems.length === 0) return;

        const escape = (value: string | number | null | undefined) => {
            const str = value == null ? '' : String(value);
            return `"${str.replace(/"/g, '""')}"`;
        };

        const rows: Array<Array<string | number>> = [];
        rows.push([`Profit Report`]);
        rows.push([`Period: ${startDate} - ${endDate}`]);
        rows.push([]);
        rows.push(['Date', 'Invoice', 'Item Code', 'Item Name', 'Unit', 'Qty', 'Sales Price', 'Cost Price', 'SubTotal Sales', 'SubTotal Cost', 'Profit']);

        salesItems.forEach((item) => {
            rows.push([
                item.transaction_date,
                item.invoice_no,
                item.item_code,
                item.item_name,
                getDisplayUnit(item),
                item.quantity.toFixed(2),
                item.sales_price.toFixed(2),
                item.cost_price.toFixed(2),
                item.total_sales.toFixed(2),
                item.total_cost.toFixed(2),
                item.profit.toFixed(2),
            ]);
        });

        rows.push([]);
        rows.push(['', '', '', '', '', '', '', 'Totals', summary.total_sales.toFixed(2), summary.total_cost.toFixed(2), summary.total_profit.toFixed(2)]);

        const csv = rows.map((row) => row.map((col) => escape(col)).join(',')).join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `profit-report-${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handlePrint = () => {
        window.print();
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-LK', {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 2
        }).format(amount);
    };

    const getDisplayUnit = (item: SalesItem) => {
        // Prefer unit_info (a more human-friendly unit label).
        // Fallback to unit. If still missing, show '-' so table is consistent.
        return item.unit_info || item.unit || '-';
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Dashboard', href: '/dashboard' },
                // { title: 'Reports', href: '/reports' },
                { title: 'Profit Report', href: '/reports/profit-report' },
            ]}
        >
            <Head title={t('')}>
                <style>{`
                    @media print {
                        @page {
                            size: A4 landscape;
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
                        
                        /* Print Table Styling */
                        .print-table {
                            display: table !important;
                            width: 100%;
                            border-collapse: collapse;
                            font-size: 10px; /* match ledger font size */
                            page-break-inside: auto;
                            color: #000 !important;
                            margin-bottom: 15px;
                        }
                        
                        .print-table tr {
                            page-break-inside: avoid;
                            page-break-after: auto;
                        }
                        
                        .print-table thead {
                            display: table-header-group;
                        }
                        
                        .print-table th, .print-table td {
                            border: 1px solid #000;
                            padding: 2px;
                            color: #000 !important;
                        }
                        
                        .print-table th {
                            background-color: #e5e7eb !important;
                            font-weight: bold;
                            text-align: left;
                        }
                        
                        .print-date-group-header {
                            font-size: 10px;
                            font-weight: bold;
                            margin-top: 10px;
                            margin-bottom: 5px;
                            border-bottom: 1px solid #000;
                            display: block !important;
                        }

                        .text-right {
                            text-align: right !important;
                        }
                        
                        .text-center {
                            text-align: center !important;
                        }

                        /* remove card borders/shadows in print view */
                        #printable-report .rounded-2xl,
                        #printable-report .rounded-xl,
                        #printable-report .bg-white {
                            border: none !important;
                            box-shadow: none !important;
                        }

                        /* style for summary/total rows similar to ledger */
                        .balance-row {
                            background-color: #f3f4f6 !important;
                            font-weight: bold;
                            color: #000 !important;
                            border-top: 2px solid #000 !important;
                        }

                        /* Column Width Priorities for Profit Report (Print) */
                        .print-table th:nth-child(1) { width: 10%; } /* Invoice */
                        .print-table th:nth-child(2) { width: 11%; } /* Item Code */
                        .print-table th:nth-child(3) { width: 31%; } /* Item Name */
                        .print-table th:nth-child(4) { width: 5%; text-align: right; } /* Qty */
                        .print-table th:nth-child(5) { width: 8%; text-align: right; } /* Sale */
                        .print-table th:nth-child(6) { width: 8%; text-align: right; } /* Cost */
                        .print-table th:nth-child(7) { width: 9%; text-align: right; } /* Sub-Tot Sale */
                        .print-table th:nth-child(8) { width: 9%; text-align: right; } /* Sub-Tot Cost */
                        .print-table th:nth-child(9) { width: 9%; text-align: right; } /* Profit */

                        .print-footer {
                            margin-top: 20px;
                            padding-top: 10px;
                            border-top: 1px solid #000;
                            font-size: 10px;
                            display: flex !important;
                            justify-content: space-between;
                            color: #000 !important;
                        }
                        
                        /* Summary section for print */
                        .print-summary-main {
                            display: flex !important;
                            justify-content: space-between;
                            border: 1px solid #000;
                            padding: 5px;
                            margin-bottom: 10px;
                            font-size: 9px;
                            font-weight: bold;
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
                                    className="shrink-0 rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all"
                                    title="Go Back"
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </button>
                                <div className="shrink-0 rounded-lg bg-white/20 p-2 shadow">
                                    <TrendingUp className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="truncate text-lg sm:text-xl font-bold text-white">{t('Profit Report')}</h1>
                                    <p className="hidden text-xs text-white/80 sm:block">{t('Day by day profit analysis')}</p>
                                </div>
                            </div>

                            <div className="flex w-full items-center gap-2 sm:w-auto sm:gap-3">
                                <button onClick={handleExportCsv} className="no-print inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200">
                                    <FileText className="mr-1.5 h-4 w-4" />
                                    {t('Export CSV')}
                                </button>
                                <button onClick={handlePrint} className="no-print inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200">
                                    <Printer className="mr-1.5 h-4 w-4" />
                                    {t('Print')}
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        {/* Stats Cards */}
                        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="rounded-xl bg-white p-3 shadow-sm border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-blue-600 p-2">
                                        <DollarSign className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-2 flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-600 truncate">{t('Total Sales')}</p>
                                        <p className="text-sm font-bold text-gray-900 truncate">{formatCurrency(summary.total_sales)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl bg-white p-3 shadow-sm border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-red-600 p-2">
                                        <Package className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-2 flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-600 truncate">{t('Total Cost')}</p>
                                        <p className="text-sm font-bold text-gray-900 truncate">{formatCurrency(summary.total_cost)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl bg-white p-3 shadow-sm border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-green-600 p-2">
                                        <TrendingUp className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-2 flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-600 truncate">{t('Total Profit')}</p>
                                        <p className={cn(
                                            "text-sm font-bold truncate",
                                            summary.total_profit >= 0 ? "text-green-700" : "text-red-700"
                                        )}>
                                            {formatCurrency(summary.total_profit)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Filters Section */}
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm no-print mb-6">
                            <div className="flex flex-col">
                                <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                    <Filter className="h-4 w-4" />
                                    {t('Filters')}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-gray-700">{t('From Date')}</Label>
                                        <input
                                            type="date"
                                            id="from_date"
                                            value={startDate}
                                            onChange={(e) => handleFilterChange('start_date', e.target.value)}
                                            className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-gray-700">{t('To Date')}</Label>
                                        <input
                                            type="date"
                                            id="to_date"
                                            value={endDate}
                                            onChange={(e) => handleFilterChange('end_date', e.target.value)}
                                            className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-gray-700">{t('Item Type')}</Label>
                                        <Select value={itemType} onValueChange={(v: string) => handleFilterChange('item_type', v)}>
                                            <SelectTrigger><SelectValue placeholder={t('All Items')} /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">{t('All Items')}</SelectItem>
                                                <SelectItem value="printer">{t('Printer')}</SelectItem>
                                                <SelectItem value="stationary">{t('Stationary Item')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-gray-700">{t('Section')}</Label>
                                        <Select value={sectionCode} onValueChange={(v: string) => handleFilterChange('section_code', v)}>
                                            <SelectTrigger><SelectValue placeholder={t('All Sections')} /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">{t('All Sections')}</SelectItem>
                                                {sections?.map((s) => (
                                                    <SelectItem key={s.section_code} value={s.section_code}>
                                                        {s.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                                    <button
                                        onClick={handleResetFilters}
                                        className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-white border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                    >
                                        <RotateCcw className="mr-2 h-4 w-4" />
                                        {t('Reset')}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div id="printable-report">
                            {/* Print Header - Only visible in print */}
                            <ReportPrintHeader
                                company={company}
                                title="Profit Report"
                                subtitle={t('Day by day profit analysis')}
                                period={`${startDate} - ${endDate}`}
                                extraLines={printExtraLines}
                            />


                            {/* Print Summary - Only visible in print */}
                            <div className="hidden print:flex print-summary-main">
                                <div>Total Sales: {formatCurrency(summary.total_sales)}</div>
                                <div>Total Cost: {formatCurrency(summary.total_cost)}</div>
                                <div>Total Profit: {formatCurrency(summary.total_profit)}</div>
                            </div>

                            {/* Main Profit Groups */}
                            <div className="space-y-8">
                                {groupedData.length > 0 ? (
                                    groupedData.map((group) => (
                                        <div key={group.date}>
                                            {/* Date Header "above day" style like SaleItems.tsx */}
                                            <div className="mb-4 no-print">
                                                <div className="inline-flex items-center rounded-lg bg-vismass-blue/5 px-4 py-2 border border-vismass-blue/10">
                                                    <Calendar className="mr-2 h-4 w-4 text-vismass-blue" />
                                                    <span className="font-bold text-vismass-blue">Date: {new Date(group.date).toLocaleDateString()}</span>
                                                </div>
                                            </div>

                                            {/* Print Date Header */}
                                            <div className="print-date-group-header" style={{ display: 'none' }}>
                                                Date: {new Date(group.date).toLocaleDateString()}
                                            </div>

                                            <Card className="rounded-2xl border-slate-200 bg-white shadow-sm overflow-hidden">
                                                <CardContent className="p-0">
                                                    <div className="overflow-x-auto">
                                                        <Table className="print-table min-w-[1200px] print:min-w-0 print:w-full">
                                                            <TableHeader className="bg-slate-50 border-b border-slate-100">
                                                                <TableRow>
                                                                    <TableHead className="font-bold text-gray-700">{t('Invoice')}</TableHead>
                                                                    <TableHead className="font-bold text-gray-700">{t('Item Code')}</TableHead>
                                                                    <TableHead className="font-bold text-gray-700">{t('Item Name')}</TableHead>
                                                                    {/* <TableHead className="font-bold text-gray-700">{t('Unit')}</TableHead> */}
                                                                    <TableHead className="font-bold text-gray-700 text-right">{t('Qty')}</TableHead>
                                                                    <TableHead className="font-bold text-gray-700 text-right">{t('Sales Price')}</TableHead>
                                                                    <TableHead className="font-bold text-gray-700 text-right">{t('Cost Price')}</TableHead>
                                                                    <TableHead className="font-bold text-gray-700 text-right">{t('SubTotal Sales')}</TableHead>
                                                                    <TableHead className="font-bold text-gray-700 text-right">{t('SubTotal Cost')}</TableHead>
                                                                    <TableHead className="font-bold text-gray-700 text-right">{t('Profit')}</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {(() => {
                                                                    const invoiceCounts: Record<string, number> = {};
                                                                    group.items.forEach(item => {
                                                                        if (item.invoice_no) {
                                                                            invoiceCounts[item.invoice_no] = (invoiceCounts[item.invoice_no] || 0) + 1;
                                                                        }
                                                                    });
                                                                    const renderedInvoices = new Set<string>();
                                                                    
                                                                    return group.items.map((item, idx) => {
                                                                        const invNo = item.invoice_no || "-";
                                                                        const isFirst = idx === 0 || group.items[idx-1].invoice_no !== item.invoice_no;
                                                                        const rowSpan = isFirst ? group.items.filter(i => i.invoice_no === item.invoice_no).length : 0;
                                                                        
                                                                        return (
                                                                            <TableRow key={item.id + idx} className="border-b border-slate-50 hover:bg-slate-50/50">
                                                                                {isFirst && (
                                                                                    <TableCell 
                                                                                        rowSpan={rowSpan} 
                                                                                        className="text-sm font-medium text-vismass-blue align-top border-r bg-slate-50/30"
                                                                                    >
                                                                                        {item.invoice_no || "-"}
                                                                                    </TableCell>
                                                                                )}
                                                                                <TableCell className="text-sm font-mono text-gray-500">{item.item_code}</TableCell>
                                                                                <TableCell className="text-sm max-w-[200px] truncate" title={item.item_name}>{item.item_name}</TableCell>
                                                                                {/* <TableCell className="text-sm" title={item.unit_info || item.unit}>
                                                                                    <span className="text-gray-600 text-[10px]">{getDisplayUnit(item)}</span>
                                                                                </TableCell> */}
                                                                                <TableCell className="text-sm text-right">{item.quantity.toFixed(2)}</TableCell>
                                                                                <TableCell className="text-sm text-right">{item.sales_price.toFixed(2)}</TableCell>
                                                                                <TableCell className="text-sm text-right text-gray-500">{item.cost_price.toFixed(2)}</TableCell>
                                                                                <TableCell className="text-sm text-right font-medium">{item.total_sales.toFixed(2)}</TableCell>
                                                                                <TableCell className="text-sm text-right text-gray-500">{item.total_cost.toFixed(2)}</TableCell>
                                                                                <TableCell className={cn(
                                                                                    "text-sm text-right font-bold",
                                                                                    item.profit >= 0 ? "text-green-600" : "text-red-600"
                                                                                )}>
                                                                                    {item.profit.toFixed(2)}
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        );
                                                                    });
                                                                })()}
                                                                {/* Daily Summary Row */}
                                                                <TableRow className="bg-slate-50/50 font-bold balance-row">
                                                                    <TableCell colSpan={6} className="text-right py-3">
                                                                        <div className="flex flex-col items-end text-right">
                                                                            <span>{t('Daily Total for')} {new Date(group.date).toLocaleDateString()}:</span>
                                                                            <span className="text-[10px] font-normal text-gray-400">
                                                                                ({new Set(group.items.map(i => i.invoice_no)).size} {t('Invoices')}, {group.items.length} {t('Items')})
                                                                            </span>
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="text-right text-vismass-blue closing-total">{group.dailyTotalSales.toFixed(2)}</TableCell>
                                                                    <TableCell className="text-right text-gray-600 closing-total">{group.dailyTotalCost.toFixed(2)}</TableCell>
                                                                    <TableCell className={cn(
                                                                        "text-right closing-total",
                                                                        group.dailyTotalProfit >= 0 ? "text-green-700" : "text-red-700"
                                                                    )}>
                                                                        {group.dailyTotalProfit.toFixed(2)}
                                                                    </TableCell>
                                                                </TableRow>
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-20 text-center">
                                        <div className="flex flex-col items-center justify-center text-gray-400">
                                            <Calendar className="h-16 w-16 mb-4 opacity-10" />
                                            <p className="text-xl font-medium text-gray-900">{t('No data found for this period')}</p>
                                            <p className="text-sm text-gray-500 mt-1">{t('Try selecting a different date range.')}</p>
                                        </div>
                                    </div>
                                )}
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
                </main>

                {/* Footer */}
                <footer className="mt-12 border-t border-slate-200 bg-gradient-to-r from-white to-slate-50 py-6 no-print">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <p className="text-center text-sm text-gray-600">&copy; 2024 Unitec Software Solution. All rights reserved.</p>
                    </div>
                </footer>
            </div>
        </AppLayout>
    );
}

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { t } from '@/lib/i18n';
import { Head, router } from '@inertiajs/react';
import { Calendar, FileText, Loader, RotateCcw, Search, Printer, Eye, ArrowLeft, Download } from 'lucide-react';
import { useState, useMemo } from 'react';
import AppSidebarLayout from '../../layouts/app/app-sidebar-layout';
import AppLogo from '@/components/app-logo';
import { BreadcrumbItem } from '@/types';

interface Category {
    catkey: string;
    cname: string;
}

interface Supplier {
    id: number;
    name: string;
}

interface Section {
    id: number;
    name: string;
    company_code?: string; // included by controller for filtering
}

interface Item {
    id: number;
    code: string;
    name: string;
}

interface Company {
    name: string;
    section: string;
    code: string;
    section_code: string;
}

interface StockMovement {
    date: string;
    description: string;
    in_qty: number;
    out_qty: number;
    balance: number;
    reference: string;
}

interface ItemStockMovements {
    item_code: string;
    item_name: string;
    batch_no?: string;
    unit_name?: string;           // primary unit name (e.g. Bundle)
    secondary_unit_name?: string; // secondary unit name (e.g. Nos)
    primary_stock?: number;       // qty in primary units
    secondary_stock?: number;     // qty in secondary units
    // NOTE: current_stock is used for display and valuation; breakdown no longer shown
    brand?: string;
    model?: string;
    serial_number?: string;
    category_name: string;
    cost_price: number;
    retail_price: number;
    movements: StockMovement[];
    running_balance: number;
    current_stock: number; // also used for cost calculations (primary + secondary/conversion)
    first_received_date?: string | null;
    last_received_date?: string | null;
    item_type?: string;
    originalBatches?: ItemStockMovements[];
}

interface PrinterDetail {
    brand: string | null;
    model: string | null;
    serial_number: string | null;
    label: string;
}

interface CategoryGroup {
    category_name: string;
    items: ItemStockMovements[];
    total_cost_value: number;
    total_retail_value: number;
}

interface Props {
    categories: Category[];
    suppliers: Supplier[];
    sections: Section[];
    items: Item[];
    printerDetails: PrinterDetail[];
    company: Company;
    filters: {
        category?: string;
        as_at_date?: string;
        item_code?: string;
        supplier?: string;
        section?: string;
        item_type?: string;
        brand?: string;
        model?: string;
        serial_number?: string;
    };
    groupedStock?: CategoryGroup[];
    overallTotalCostValue?: number;
    overallTotalRetailValue?: number;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },

    {
        title: 'Stock In Hand',
        href: '/reports/stock-in-hand',
    },
];

export default function StockInHand({
    categories = [],
    suppliers = [],
    sections = [],
    items = [],
    printerDetails = [],
    company,
    filters,
    groupedStock = [],
    overallTotalCostValue = 0,
    overallTotalRetailValue = 0,
}: Props) {
    const [category, setCategory] = useState(filters.category || 'all');
    const [asAtDate, setAsAtDate] = useState<Date | undefined>(() => {
        return filters.as_at_date
            ? new Date(filters.as_at_date)
            : (() => {
                const today = new Date();
                return today;
            })();
    });
    const [itemCode, setItemCode] = useState(filters.item_code || 'all');
    const [supplier, setSupplier] = useState(filters.supplier || 'all');
    const [itemType, setItemType] = useState(filters.item_type || 'all');
    // If the user is logged in from the Malibu section we only want to
    // display that one option in the dropdown; otherwise show all sections
    const [section, setSection] = useState(() => {
        const userSection = sections.find(s => s.id.toString() === filters.section);
        if (userSection) return userSection.id.toString();

        const defaultSection = sections.find(s => s.name === company.section);
        return defaultSection ? defaultSection.id.toString() : '';
    });

    // compute visible sections for the dropdown based on login context
    const visibleSections = useMemo(() => {
        // first restrict to current company
        let list = sections;
        if (company.code) {
            list = list.filter(s => s.company_code === company.code);
        }
        // additional malibu user rule: only show the exact section name
        if (company.section && company.section.toLowerCase().includes('malibu')) {
            list = list.filter(s => s.name === company.section);
        }
        return list;
    }, [sections, company.code, company.section]);
    const [brand, setBrand] = useState(filters.brand || '');
    const [model, setModel] = useState(filters.model || '');
    const [serialNumber, setSerialNumber] = useState(filters.serial_number || '');
    const [isLoading, setIsLoading] = useState(false);


    const handlePrint = () => {
        window.print();
    };

    const handleExportCsv = () => {
        if (!aggregatedGroupedStock || aggregatedGroupedStock.length === 0) return;

        const localShowSerialColumn = itemType !== 'product' && itemType !== 'printer';
        const headers = ['Category', 'Date', 'Item Code', 'Item Name'];
        if (itemType !== 'product') headers.push('Brand/Model');
        if (localShowSerialColumn) headers.push('Serial Number');
        headers.push('Unit', 'Stock', 'Cost Value (RS)');

        const csvRows = [];
        csvRows.push(headers.join(','));

        aggregatedGroupedStock.forEach(group => {
            group.items.forEach(item => {
                const row = [];
                row.push(`"${group.category_name}"`);
                
                const date = item.last_received_date ? new Date(item.last_received_date).toLocaleDateString('en-GB') : '-';
                row.push(`"${date}"`);
                
                row.push(`"${item.item_code}"`);
                row.push(`"${(item.item_name || '').replace(/"/g, '""')}"`);
                
                if (itemType !== 'product') {
                    const brandModel = item.item_type === 'printer' && (item.brand || item.model) ? `${item.brand || ''} ${item.model ? `(${item.model})` : ''}`.trim() : '-';
                    row.push(`"${brandModel.replace(/"/g, '""')}"`);
                }
                
                if (localShowSerialColumn) {
                    const serial = item.item_type === 'printer' && item.serial_number ? item.serial_number : '-';
                    row.push(`"${serial.replace(/"/g, '""')}"`);
                }
                
                let unitStr = item.unit_name || 'N/A';
                if (item.secondary_unit_name) {
                    unitStr += ` / ${item.secondary_unit_name}`;
                }
                row.push(`"${unitStr}"`);
                
                row.push(`"${Number(item.current_stock).toFixed(2)}"`);
                row.push(`"${Number(item.cost_price * item.current_stock).toFixed(2)}"`);
                
                csvRows.push(row.join(','));
            });
            
            const catSumStock = group.items.reduce((s, item) => s + item.current_stock, 0);
            const catSumCostValue = group.items.reduce((s, item) => s + item.cost_price * item.current_stock, 0);
            const totalRow = [];
            totalRow.push(`"Total for ${group.category_name}"`);
            totalRow.push('""');
            totalRow.push('""');
            totalRow.push('""');
            if (itemType !== 'product') totalRow.push('""');
            if (localShowSerialColumn) totalRow.push('""');
            
            const uniqueUnits = new Set(group.items.map(item => item.unit_name));
            const hasSecondaryUnits = group.items.some(item => item.secondary_unit_name);
            const showStockTotal = uniqueUnits.size === 1 && !hasSecondaryUnits;
            
            totalRow.push(`"${showStockTotal ? (group.items[0]?.unit_name || '') : 'Mixed Units'}"`);
            totalRow.push(`"${Number(catSumStock).toFixed(2)}"`);
            totalRow.push(`"${Number(catSumCostValue).toFixed(2)}"`);
            
            csvRows.push(totalRow.join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        
        const dateStr = asAtDate ? asAtDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        link.setAttribute('download', `Stock_In_Hand_${dateStr}.csv`);
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    const [hasAppliedFilters, setHasAppliedFilters] = useState(true);
    const [searchItem, setSearchItem] = useState('');
    const [itemDropdownOpen, setItemDropdownOpen] = useState(false);
    const [searchPrinter, setSearchPrinter] = useState('');
    const [printerDropdownOpen, setPrinterDropdownOpen] = useState(false);
    const [selectedItemBatches, setSelectedItemBatches] = useState<ItemStockMovements[]>([]);
    const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');

    // eslint-disable-next-line react-hooks/preserve-manual-memoization
    const aggregatedGroupedStock = useMemo(() => {
        return groupedStock.map((categoryGroup) => {
            const aggregatedItemsMap = new Map<string, ItemStockMovements>();

            categoryGroup.items.forEach((item) => {
                const key = item.item_code;
                
                if (!aggregatedItemsMap.has(key)) {
                    aggregatedItemsMap.set(key, { ...item, originalBatches: [item] });
                } else {
                    const existing = aggregatedItemsMap.get(key)!;
                    existing.current_stock += item.current_stock;
                    if (existing.primary_stock !== undefined && item.primary_stock !== undefined) {
                        existing.primary_stock += item.primary_stock;
                    }
                    if (existing.secondary_stock !== undefined && item.secondary_stock !== undefined) {
                        existing.secondary_stock += item.secondary_stock;
                    }
                    
                    if (item.last_received_date && existing.last_received_date) {
                        if (new Date(item.last_received_date) > new Date(existing.last_received_date)) {
                            existing.last_received_date = item.last_received_date;
                            existing.cost_price = item.cost_price;
                            existing.retail_price = item.retail_price;
                        }
                    } else if (item.last_received_date && !existing.last_received_date) {
                        existing.last_received_date = item.last_received_date;
                        existing.cost_price = item.cost_price;
                        existing.retail_price = item.retail_price;
                    }
                    
                    if (existing.originalBatches) {
                        existing.originalBatches.push(item);
                    }
                }
            });

            // Filter out items that have 0 or less current stock
            const itemsWithStock = Array.from(aggregatedItemsMap.values()).filter(item => item.current_stock > 0);

            return {
                ...categoryGroup,
                items: itemsWithStock,
            };
        }).filter(categoryGroup => categoryGroup.items.length > 0);
    }, [groupedStock]);

    const filteredItems = useMemo(() => {
        const search = searchItem.toLowerCase();
        return items.filter((item) =>
            item.code.toLowerCase().includes(search) ||
            item.name.toLowerCase().includes(search)
        ).slice(0, 50);
    }, [items, searchItem]);

    const filteredPrinters = useMemo(() => {
        const search = searchPrinter.toLowerCase();
        if (!search) return printerDetails.slice(0, 50);

        return printerDetails.filter((printer) =>
            printer.label.toLowerCase().includes(search)
        ).slice(0, 50);
    }, [printerDetails, searchPrinter]);

    // Calculate overall sums
    const overallSumCostValue = groupedStock.reduce(
        (sum, cat) =>
            sum +
            cat.items.reduce(
                (s, item) => s + item.cost_price * item.current_stock,
                0,
            ),
        0,
    );
    const overallSumRetailValue = groupedStock.reduce(
        (sum, cat) =>
            sum +
            cat.items.reduce(
                (s, item) => s + item.retail_price * item.current_stock,
                0,
            ),
        0,
    );

    // when a specific item code is selected, compute its total stock across all categories/batches
    const totalStockForItem = useMemo(() => {
        if (itemCode && itemCode !== 'all') {
            return groupedStock.reduce(
                (sum, cat) =>
                    sum + cat.items.reduce((s, i) => s + i.current_stock, 0),
                0,
            );
        }
        return 0;
    }, [groupedStock, itemCode]);

    const showSerialColumn = itemType !== 'product' && itemType !== 'printer';
    const categoryTotalColSpan = itemType === 'product' ? 5 : itemType === 'printer' ? 6 : 7;

    // Manual filter application
    const handleApplyFilters = () => {
        if (category && asAtDate) {
            setIsLoading(true);
            setHasAppliedFilters(true);
            const params = new URLSearchParams();
            params.append('category', category === 'all' ? '' : category);
            params.append('as_at_date', asAtDate.toISOString().split('T')[0]);
            if (itemCode && itemCode !== 'all')
                params.append('item_code', itemCode);
            if (supplier && supplier !== 'all')
                params.append('supplier', supplier);
            if (section) params.append('section', section);
            if (itemType && itemType !== 'all')
                params.append('item_type', itemType);
            if (brand) params.append('brand', brand);
            if (model) params.append('model', model);
            if (serialNumber) params.append('serial_number', serialNumber);

            router.get(
                `/reports/stock-in-hand?${params.toString()}`,
                {},
                {
                    preserveState: true,
                    preserveScroll: true,
                    onFinish: () => setIsLoading(false),
                    onError: () => setIsLoading(false),
                },
            );
        }
    };

    const handleResetFilters = () => {
        setIsLoading(true);
        setCategory('all');
        setAsAtDate(() => {
            const today = new Date();
            return today;
        });
        setItemCode('all');
        setSupplier('all');
        setItemType('all');
        const userSection = sections.find(s => s.name === company.section);
        setSection(userSection ? userSection.id.toString() : '');
        setBrand('');
        setModel('');
        setSerialNumber('');
        setSearchPrinter('');
        setHasAppliedFilters(false);
        // Navigate to the base URL without filters
        router.get(
            '/reports/stock-in-hand',
            {},
            {
                preserveState: false,
                preserveScroll: false,
                onFinish: () => setIsLoading(false),
                onError: () => setIsLoading(false),
            },
        );
    };

    return (
        <AppSidebarLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Stock In Hand Report')}>
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
                        
                        tfoot {
                            display: table-footer-group;
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
                        
                        th:nth-child(6), td:nth-child(6),
                        th:nth-child(7), td:nth-child(7),
                        th:nth-child(8), td:nth-child(8),
                        th:nth-child(9), td:nth-child(9),
                        th:nth-child(10), td:nth-child(10) {
                            text-align: right !important;
                        }
                        
                        /* Column widths for better layout */
                        th:nth-child(1), td:nth-child(1) { width: 10%; } /* Date */
                        th:nth-child(2), td:nth-child(2) { width: 10%; } /* Item Code */
                        th:nth-child(3), td:nth-child(3) { width: 20%; } /* Item Name - priority */
                        th:nth-child(4), td:nth-child(4) { width: 20%; } /* Batch No */
                        th:nth-child(5), td:nth-child(5) { width: 10%; } /* Unit */
                        th:nth-child(6), td:nth-child(6) { width: 10%; } /* Stock */
                        th:nth-child(7), td:nth-child(7) { width: 10%; } /* Cost Price */
                        th:nth-child(8), td:nth-child(8) { width: 10%; } /* Sales Price */
                        th:nth-child(9), td:nth-child(9) { width: 10%; } /* Cost Value */
                        th:nth-child(10), td:nth-child(10) { width: 10%; } /* Sales Value */
                        
                        .category-header {
                            background-color: #dbeafe !important;
                            font-weight: bold;
                            padding: 8px 4px;
                            color: #000 !important;
                        }
                        
                        .category-total {
                            background-color: #f3f4f6 !important;
                            font-weight: bold;
                            color: #000 !important;
                        }
                        
                        .overall-total {
                            background-color: #d1d5db !important;
                            font-weight: bold;
                            font-size: 11px;
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

                        /* drop shadows and borders from main white container when printing */
                        #printable-report > .bg-white,
                        #printable-report .bg-white {
                            box-shadow: none !important;
                            border: none !important;
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
                                        {t('Stock In Hand Report')}
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        {t('View and analyze current stock levels')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Button
                                    onClick={handleExportCsv}
                                    disabled={isLoading || !groupedStock || groupedStock.length === 0}
                                    className="inline-flex items-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                                >
                                    <Download className="mr-1.5 h-4 w-4" />
                                    {t('Export CSV')}
                                </Button>
                                <Button
                                    onClick={handlePrint}
                                    disabled={isLoading || !groupedStock || groupedStock.length === 0}
                                    className="inline-flex items-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                                >
                                    <Printer className="mr-1.5 h-4 w-4" />
                                    {t('Print Report')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-8 sm:px-6 lg:px-8">
                    {viewMode === 'list' && (
                        <div className="px-4 sm:px-0">

                        {/* Filters */}
                        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden no-print">
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-6 py-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">
                                            {t('Report Filters')}
                                        </h3>
                                        <p className="text-white/80 text-sm mt-1">
                                            {t('Configure filters to generate stock reports')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6">
                                {isLoading && (
                                    <div className="flex items-center justify-center p-4">
                                        <Loader className="h-6 w-6 animate-spin mr-2 text-vismass-blue" />
                                        <span className="text-gray-600">{t('Loading stock data...')}</span>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                                    {/* Section Filter */}
                                    <div className="space-y-2">
                                        <Label htmlFor="section">{t('Section')}</Label>
                                        <Select
                                            value={section}
                                            onValueChange={(value) => {
                                                setSection(value);
                                            }}
                                        >
                                            <SelectTrigger className="border-slate-300 bg-white focus:border-vismass-blue focus:ring-vismass-blue">
                                                <SelectValue placeholder={t('Select section')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {visibleSections.map((sec) => (
                                                    <SelectItem key={sec.id} value={sec.id.toString()}>
                                                        {sec.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Category Filter */}
                                    <div className="space-y-2">
                                        <Label htmlFor="category">{t('Category')}</Label>
                                        <Select
                                            value={category}
                                            onValueChange={(value) => {
                                                setCategory(value);
                                            }}
                                        >
                                            <SelectTrigger className="border-slate-300 bg-white focus:border-vismass-blue focus:ring-vismass-blue">
                                                <SelectValue placeholder={t('Select category')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">{t('All Categories')}</SelectItem>
                                                {categories.map((cat) => (
                                                    <SelectItem key={cat.catkey} value={cat.catkey}>
                                                        {cat.cname}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Item Code Filter */}
                                    <div className="space-y-2">
                                        <Label htmlFor="item_code">{t('Item Code (Optional)')}</Label>
                                        <Select
                                            value={itemCode}
                                            onValueChange={(value) => {
                                                setItemCode(value);
                                                setSearchItem('');
                                                setItemDropdownOpen(false);
                                            }}
                                            open={itemDropdownOpen}
                                            onOpenChange={setItemDropdownOpen}
                                        >
                                            <SelectTrigger className="border-slate-300 bg-white focus:border-vismass-blue focus:ring-vismass-blue">
                                                <SelectValue placeholder={t('Select item code')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <div className="p-2">
                                                    <div className="relative">
                                                        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                                                        <input
                                                            type="text"
                                                            placeholder={t('Search code or name...')}
                                                            className="w-full rounded-md border py-2 pr-3 pl-9 text-sm"
                                                            value={searchItem}
                                                            onChange={(e) => setSearchItem(e.target.value)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            onKeyDown={(e) => e.stopPropagation()}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="max-h-[200px] overflow-y-auto">
                                                    <SelectItem value="all">{t('All Items')}</SelectItem>
                                                    {filteredItems.length > 0 ? (
                                                        filteredItems.map((item, index) => (
                                                            <SelectItem key={`${item.code}-${index}`} value={item.code}>
                                                                {item.code} - {item.name}
                                                            </SelectItem>
                                                        ))
                                                    ) : (
                                                        <div className="px-2 py-3 text-center text-sm text-gray-500">
                                                            {t('No items found')}
                                                        </div>
                                                    )}
                                                </div>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Supplier Filter */}
                                    {/* <div className="space-y-2">
                                        <Label htmlFor="supplier">{t('Supplier (Optional)')}</Label>
                                        <Select
                                            value={supplier}
                                            onValueChange={(value) => {
                                                setSupplier(value);
                                            }}
                                        >
                                            <SelectTrigger className="border-slate-300 bg-white focus:border-vismass-blue focus:ring-vismass-blue">
                                                <SelectValue placeholder={t('Select supplier')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">{t('All Suppliers')}</SelectItem>
                                                {suppliers.map((sup) => (
                                                    <SelectItem key={sup.id} value={sup.id.toString()}>
                                                        {sup.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div> */}

                                    {/* Item Type Filter */}
                                    <div className="space-y-2">
                                        <Label htmlFor="item_type">{t('Item Type')}</Label>
                                        <Select
                                            value={itemType}
                                            onValueChange={(value) => {
                                                setItemType(value);
                                            }}
                                        >
                                            <SelectTrigger className="border-slate-300 bg-white focus:border-vismass-blue focus:ring-vismass-blue">
                                                <SelectValue placeholder={t('Select item type')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">{t('All Types')}</SelectItem>
                                                <SelectItem value="product">{t('Product')}</SelectItem>
                                                <SelectItem value="printer">{t('Printer')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* As at Date */}
                                    <div className="space-y-2">
                                        <Label htmlFor="as_at_date">{t('As at Date')}</Label>
                                        <div className="flex items-center">
                                            <Calendar className="mr-2 h-4 w-4" />
                                            <Input
                                                type="date"
                                                value={asAtDate ? asAtDate.toISOString().split('T')[0] : ''}
                                                onChange={(e) => setAsAtDate(e.target.value ? new Date(e.target.value) : undefined)}
                                                className="border-slate-300 bg-white focus:border-vismass-blue focus:ring-vismass-blue"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="mt-6 flex justify-end gap-3">
                                    <Button
                                        onClick={handleApplyFilters}
                                        disabled={isLoading || !asAtDate}
                                        className="bg-gradient-to-r from-vismass-blue to-vismass-grey hover:from-vismass-blue/90 hover:to-vismass-grey/90 text-white border-0"
                                    >
                                        {isLoading ? (
                                            <Loader className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <FileText className="mr-2 h-4 w-4" />
                                        )}
                                        {isLoading ? t('Loading...') : t('Apply Filters')}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={handleResetFilters}
                                        disabled={isLoading}
                                        className="border-slate-300 hover:bg-slate-50"
                                    >
                                        {isLoading ? (
                                            <Loader className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <RotateCcw className="mr-2 h-4 w-4" />
                                        )}
                                        {isLoading ? t('Resetting...') : t('Reset Filters')}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Stock In Hand Section */}
                        {isLoading ? (
                            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                                <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-6 py-4">
                                    <h3 className="text-lg font-semibold text-white">
                                        {t('Stock In Hand Report')}
                                    </h3>
                                </div>
                                <div className="flex items-center justify-center p-12">
                                    <div className="text-center">
                                        <Loader className="h-8 w-8 animate-spin mx-auto mb-4 text-vismass-blue" />
                                        <h3 className="text-lg font-medium text-gray-900">{t('Loading Stock Data')}</h3>
                                        <p className="text-sm text-gray-500 mt-2">
                                            {t('Please wait while we fetch the latest stock data...')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : hasAppliedFilters && groupedStock && groupedStock.length > 0 ? (
                            <div id="printable-report">
                                {/* Print Header - Only visible in print */}                                
                                {itemCode && itemCode !== 'all' && (
                                    <div className="mb-4">
                                        <p className="text-sm font-medium">
                                            {/* {t('Total stock for')} {itemCode}: {Number(totalStockForItem).toFixed(2)} */}
                                            <span><strong>Report Date:</strong> {(asAtDate ? asAtDate : new Date()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                        </p>
                                    </div>
                                )}                                
                                <div className="print-header" style={{ display: 'none' }}>
                                    <div className="mb-4 text-center">
                                    <AppLogo companyCode={company?.code} />
                                    {/* <div className="print-company-name">
                                        {company?.name || ''}
                                    </div> */}
                                    </div>
                                    <div className="print-report-title">Stock In Hand Report</div>
                                    <div className="print-info-row">
                                        <span><strong>Section:</strong> {sections.find(s => s.id.toString() === section)?.name || 'All Sections'}</span>
                                        {itemCode && itemCode !== 'all' && (
                                            <span className="text-right"><strong>Item Code:</strong> {itemCode}</span>
                                        )}
                                    </div>
                                    <div className="print-info-row">
                                        <span><strong>Category:</strong> {category === 'all' ? 'All Categories' : categories.find(c => c.catkey === category)?.cname || category}</span>
                                        {itemCode && itemCode !== 'all' && (
                                            <span className="text-right"><strong>Total Stock:</strong> {Number(totalStockForItem).toFixed(2)}</span>
                                        )}
                                    </div>
                                    {supplier && supplier !== 'all' && (
                                        <div className="print-info-row">
                                            <span><strong>Supplier:</strong> {suppliers.find(s => s.id.toString() === supplier)?.name || supplier}</span>
                                            <span></span>
                                        </div>
                                    )}
                                    {itemType && itemType !== 'all' && (
                                        <div className="print-info-row">
                                            <span><strong>Item Type:</strong> {itemType === 'printer' ? 'Printer' : 'Product'}</span>
                                            <span></span>
                                        </div>
                                    )}
                                    {brand && (
                                        <div className="print-info-row">
                                            <span><strong>Brand:</strong> {brand}</span>
                                            <span></span>
                                        </div>
                                    )}
                                    {model && (
                                        <div className="print-info-row">
                                            <span><strong>Model:</strong> {model}</span>
                                            <span></span>
                                        </div>
                                    )}
                                    {serialNumber && (
                                        <div className="print-info-row">
                                            <span><strong>Serial Number:</strong> {serialNumber}</span>
                                            <span></span>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                                    <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-6 py-4 no-print">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                                            <div>
                                                <h3 className="text-lg font-semibold text-white">
                                                    {t('Stock In Hand Report')}
                                                </h3>
                                                <p className="text-white/80 text-sm mt-1">
                                                    {t('Detailed stock information by category')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6">
                                        {aggregatedGroupedStock.map((categoryGroup, categoryIndex) => (
                                            <div key={categoryIndex} className="mb-8 last:mb-0">
                                                <h3 className="text-lg font-semibold mb-4">
                                                    {categoryGroup.category_name} ({categoryGroup.items.length} {t('items')})
                                                </h3>

                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-sm border border-slate-300">
                                                        <thead className="bg-gradient-to-r from-vismass-blue to-vismass-grey text-white">
                                                            <tr>
                                                                <th className="px-4 py-3 text-left font-bold border-b border-slate-300">{t('Date')}</th>
                                                                <th className="px-4 py-3 text-left font-bold border-b border-slate-300">{t('Item Code')}</th>
                                                                <th className="px-4 py-3 text-left font-bold border-b border-slate-300">{t('Item Name')}</th>
                                                                {itemType !== 'product' && (
                                                                    <>
                                                                        <th className="px-4 py-3 text-left font-bold border-b border-slate-300">{t('Brand/Model')}</th>
                                                                        {showSerialColumn && (
                                                                            <th className="px-4 py-3 text-left font-bold border-b border-slate-300">{t('Serial Number')}</th>
                                                                        )}
                                                                    </>
                                                                )}
                                                                <th className="px-4 py-3 text-left font-bold border-b border-slate-300">{t('Unit')}</th>
                                                                <th className="px-4 py-3 text-right font-bold border-b border-slate-300">{t('Stock')}</th>
                                                                <th className="px-4 py-3 text-right font-bold border-b border-slate-300">{t('Cost Value')} (RS)</th>
                                                                {/* <th className="px-4 py-3 text-right font-bold border-b border-slate-300">{t('Cost Price')} (RS)</th>
                                                                <th className="px-4 py-3 text-right font-bold border-b border-slate-300">{t('Sales Price')} (RS)</th>
                                                                <th className="px-4 py-3 text-right font-bold border-b border-slate-300">{t('Sales Value')} (RS)</th> */}
                                                                <th className="px-4 py-3 text-center font-bold border-b border-slate-300 print:hidden">{t('Action')}</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y">
                                                            {categoryGroup.items.map((item, itemIndex) => (
                                                                <tr key={itemIndex} className="hover:bg-slate-50">
                                                                    <td className="px-4 py-3 text-left border-b border-slate-200">
                                                                        {item.last_received_date ? new Date(item.last_received_date).toLocaleDateString('en-GB') : '-'}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-left font-medium border-b border-slate-200">{item.item_code}</td>
                                                                    <td className="px-4 py-3 text-left border-b border-slate-200">{item.item_name}</td>
                                                                    {itemType !== 'product' && (
                                                                        <>
                                                                            <td className="px-4 py-3 text-left border-b border-slate-200">
                                                                                {item.item_type === 'printer' && (item.brand || item.model) ? (
                                                                                    <span className="text-xs">
                                                                                        {item.brand || ''} {item.model ? `(${item.model})` : ''}
                                                                                    </span>
                                                                                ) : '-'}
                                                                            </td>
                                                                            {showSerialColumn && (
                                                                                <td className="px-4 py-3 text-left border-b border-slate-200">
                                                                                    {item.item_type === 'printer' && item.serial_number ? (
                                                                                        <span className="text-xs font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                                                                            {item.serial_number}
                                                                                        </span>
                                                                                    ) : '-'}
                                                                                </td>
                                                                            )}
                                                                        </>
                                                                    )}
                                                                    <td className="px-4 py-3 text-left border-b border-slate-200">
                                                                        {item.secondary_unit_name ? (
                                                                            <div className="flex flex-col gap-0.5">
                                                                                <span className="inline-flex items-center rounded-md bg-green-100 text-green-700 px-2 py-1 text-xs font-medium">
                                                                                    {item.unit_name || 'N/A'}
                                                                                </span>
                                                                                <span className="inline-flex items-center rounded-md bg-blue-100 text-blue-600 px-2 py-1 text-xs font-medium">
                                                                                    {item.secondary_unit_name}
                                                                                </span>
                                                                            </div>
                                                                        ) : (
                                                                            <span className="inline-flex items-center rounded-md bg-green-100 text-green-700 px-2 py-1 text-xs font-medium">
                                                                                {item.unit_name || 'N/A'}
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right font-bold border-b border-slate-200">
                                                                        {/* Display stock with unit conversion breakdown when applicable */}
                                                                        {item.secondary_unit_name ? (
                                                                            <div className="flex flex-col gap-0.5">
                                                                                <div className="text-vismass-blue font-semibold">
                                                                                    {Number(item.primary_stock || 0).toFixed(2)} {item.unit_name || ''}
                                                                                </div>
                                                                                <div className="text-gray-600 text-xs">
                                                                                    {Number(item.secondary_stock || 0).toFixed(2)} {item.secondary_unit_name}
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            Number(item.current_stock).toFixed(2)
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right border-b border-slate-200">
                                                                        {Number(item.cost_price * item.current_stock).toFixed(2)}
                                                                    </td>
                                                                    {/* <td className="px-4 py-3 text-right border-b border-slate-200">
                                                                        {Number(item.cost_price).toFixed(2)}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right border-b border-slate-200">
                                                                        {Number(item.retail_price).toFixed(2)}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right border-b border-slate-200">
                                                                        {Number(item.retail_price * item.current_stock).toFixed(2)}
                                                                    </td> */}
                                                                    <td className="px-4 py-3 text-center border-b border-slate-200 print:hidden">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => {
                                                                                setSelectedItemBatches(item.originalBatches || []);
                                                                                setViewMode('detail');
                                                                            }}
                                                                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                                                        >
                                                                            <Eye className="w-4 h-4 mr-1" />
                                                                            View
                                                                        </Button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                            {/* Category Totals */}
                                                            {(() => {
                                                                // totals use current_stock (primary converted) for valuation
                                                                const catSumStock = categoryGroup.items.reduce((s, item) => s + item.current_stock, 0);
                                                                const catSumCostValue = categoryGroup.items.reduce((s, item) => s + item.cost_price * item.current_stock, 0);
                                                                const catSumRetailValue = categoryGroup.items.reduce((s, item) => s + item.retail_price * item.current_stock, 0);
                                                                
                                                                // Check if all items have the same unit configuration
                                                                const uniqueUnits = new Set(categoryGroup.items.map(item => item.unit_name));
                                                                const hasSecondaryUnits = categoryGroup.items.some(item => item.secondary_unit_name);
                                                                const showStockTotal = uniqueUnits.size === 1 && !hasSecondaryUnits;
                                                                
                                                                return (
                                                                    <tr className="bg-slate-100 font-bold">
                                                                <td className="px-4 py-3 text-right border-b border-slate-300" colSpan={categoryTotalColSpan - 1}>
                                                                            {t('Total for')} {categoryGroup.category_name}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-right border-b border-slate-300">
                                                                            {showStockTotal ? (
                                                                                <>
                                                                                    {Number(catSumStock).toFixed(2)}{categoryGroup.items[0]?.unit_name ? ` ${categoryGroup.items[0].unit_name}` : ''}
                                                                                </>
                                                                            ) : (
                                                                                <span className="text-gray-600 text-xs italic">{t('Mixed Units')}</span>
                                                                            )}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-right border-b border-slate-300">{Number(catSumCostValue).toFixed(2)}</td>
                                                                        {/* <td className="px-4 py-3 text-right border-b border-slate-300"></td>
                                                                        <td className="px-4 py-3 text-right border-b border-slate-300"></td>
                                                                        <td className="px-4 py-3 text-right border-b border-slate-300"></td>
                                                                        <td className="px-4 py-3 text-right border-b border-slate-300">{Number(catSumRetailValue).toFixed(2)}</td> */}
                                                                        <td className="px-4 py-3 text-right border-b border-slate-300 print:hidden"></td>
                                                                    </tr>
                                                                );
                                                            })()}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        ))}

                                        {/* Overall Totals */}
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm border border-slate-300">
                                                <thead className="bg-gradient-to-r from-vismass-blue to-vismass-grey text-white">
                                                    <tr>
                                                        {/* <th className="px-4 py-3 text-left font-bold border-b border-slate-300">{t('NO')}</th>
                                            <th className="px-4 py-3 text-left font-bold border-b border-slate-300">{t('Item Code')}</th>
                                            <th className="px-4 py-3 text-left font-bold border-b border-slate-300">{t('Item Name')}</th>
                                            <th className="px-4 py-3 text-left font-bold border-b border-slate-300">{t('Batch No')}</th>
                                            <th className="px-4 py-3 text-right font-bold border-b border-slate-300">{t('Stock')}</th>
                                            <th className="px-4 py-3 text-right font-bold border-b border-slate-300">{t('Cost Price')} (RS)</th>
                                            <th className="px-4 py-3 text-right font-bold border-b border-slate-300">{t('Sales Price')} (RS)</th>
                                            <th className="px-4 py-3 text-right font-bold border-b border-slate-300">{t('Cost Value')} (RS)</th>
                                            <th className="px-4 py-3 text-right font-bold border-b border-slate-300">{t('Sales Value')} (RS)</th> */}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {/* <tr className="bg-gradient-to-r from-vismass-blue to-vismass-grey text-white font-bold">
                                            <td className="px-4 py-3 text-left border-b border-slate-300" colSpan={7}>
                                                {t('Overall Total')}
                                            </td>
                                            <td className="px-4 py-3 text-right border-b border-slate-300">{Number(overallSumCostValue).toFixed(2)}</td>
                                            <td className="px-4 py-3 text-right border-b border-slate-300">{Number(overallSumRetailValue).toFixed(2)}</td>
                                        </tr> */}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Print Footer - Only visible in print */}
                                    <div className="print-footer" style={{ display: 'none' }}>
                                        <span>Developed by Unitec Software Solution</span>
                                        <span>Printed on: {new Date().toLocaleString('en-GB', {
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}</span>
                                    </div>
                                </div>
                            </div>
                        ) : hasAppliedFilters ? (
                            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                                <div className="text-center p-8">
                                    <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                                        <FileText className="h-8 w-8 text-white" />
                                    </div>
                                    <h3 className="text-lg font-medium text-slate-900">{t('No Stock Data Found')}</h3>
                                    <p className="text-sm text-slate-600 mt-2">
                                        {t('No stock data was found for the selected filters. Try selecting different filters.')}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                                <div className="text-center p-8">
                                    <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                                        <FileText className="h-8 w-8 text-white" />
                                    </div>
                                    <h3 className="text-lg font-medium text-slate-900">{t('Ready to Load Stock Data')}</h3>
                                    <p className="text-sm text-slate-600 mt-2">
                                        {t('Please select filters and click "Apply Filters" to load stock data.')}
                                    </p>
                                </div>
                            </div>
                        )}
                        </div>
                    )}

                    {/* Detail View */}
                    {viewMode === 'detail' && selectedItemBatches.length > 0 && (
                        <div className="px-4 sm:px-0">
                            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                                <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center gap-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setViewMode('list')}
                                        className="flex items-center text-slate-600 hover:text-slate-900"
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        {t('Back to Report')}
                                    </Button>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-800">{t('Batch-wise Stock Breakdown')}</h2>
                                        <p className="text-sm text-slate-500">{selectedItemBatches[0].item_name} ({selectedItemBatches[0].item_code})</p>
                                    </div>
                                </div>
                                <div className="p-6 overflow-x-auto">
                                    <table className="w-full text-sm border border-slate-300">
                                        <thead className="bg-gradient-to-r from-vismass-blue to-vismass-grey text-white">
                                            <tr>
                                                <th className="px-4 py-3 text-left font-bold border-b border-slate-300">{t('Batch No')}</th>
                                                {/* <th className="px-4 py-3 text-left font-bold border-b border-slate-300">{t('Unit')}</th> */}
                                                <th className="px-4 py-3 text-right font-bold border-b border-slate-300">{t('Stock')}</th>
                                                <th className="px-4 py-3 text-right font-bold border-b border-slate-300">{t('Cost Price')} (RS)</th>
                                                <th className="px-4 py-3 text-right font-bold border-b border-slate-300">{t('Sales Price')} (RS)</th>
                                                <th className="px-4 py-3 text-right font-bold border-b border-slate-300">{t('Cost Value')} (RS)</th>
                                                <th className="px-4 py-3 text-right font-bold border-b border-slate-300">{t('Sales Value')} (RS)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {selectedItemBatches.map((batch, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3 text-left border-b border-slate-200">
                                                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${batch.batch_no === 'N/A'
                                                                ? 'bg-gray-100 text-gray-600'
                                                                : 'bg-blue-100 text-blue-700'
                                                            }`}>
                                                            {batch.batch_no || 'N/A'}
                                                        </span>
                                                    </td>
                                                    {/* <td className="px-4 py-3 text-left border-b border-slate-200">
                                                        {batch.secondary_unit_name ? (
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="inline-flex items-center rounded-md bg-green-100 text-green-700 px-2 py-1 text-xs font-medium">
                                                                    {batch.unit_name || 'N/A'}
                                                                </span>
                                                                <span className="inline-flex items-center rounded-md bg-blue-100 text-blue-600 px-2 py-1 text-xs font-medium">
                                                                    {batch.secondary_unit_name}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="inline-flex items-center rounded-md bg-green-100 text-green-700 px-2 py-1 text-xs font-medium">
                                                                {batch.unit_name || 'N/A'}
                                                            </span>
                                                        )}
                                                    </td> */}
                                                    <td className="px-4 py-3 text-right font-bold border-b border-slate-200">
                                                        {batch.secondary_unit_name ? (
                                                            <div className="flex flex-col gap-0.5">
                                                                <div className="text-vismass-blue font-semibold">
                                                                    {Number(batch.primary_stock || 0).toFixed(2)} {batch.unit_name || ''}
                                                                </div>
                                                                <div className="text-gray-600 text-xs">
                                                                    {Number(batch.secondary_stock || 0).toFixed(2)} {batch.secondary_unit_name}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            Number(batch.current_stock).toFixed(2)
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-right border-b border-slate-200">{Number(batch.cost_price).toFixed(2)}</td>
                                                    <td className="px-4 py-3 text-right border-b border-slate-200">{Number(batch.retail_price).toFixed(2)}</td>
                                                    <td className="px-4 py-3 text-right border-b border-slate-200">{Number(batch.cost_price * batch.current_stock).toFixed(2)}</td>
                                                    <td className="px-4 py-3 text-right border-b border-slate-200">{Number(batch.retail_price * batch.current_stock).toFixed(2)}</td>
                                                </tr>
                                            ))}
                                            {/* Modal Totals */}
                                            <tr className="bg-slate-100 font-bold">
                                                <td className="px-4 py-3 text-right border-b border-slate-300" colSpan={1}>{t('Total')}</td>
                                                <td className="px-4 py-3 text-right border-b border-slate-300">
                                                    {/* We can just sum the current stock */}
                                                    {Number(selectedItemBatches.reduce((acc, b) => acc + b.current_stock, 0)).toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3 text-right border-b border-slate-300"></td>
                                                <td className="px-4 py-3 text-right border-b border-slate-300"></td>
                                                <td className="px-4 py-3 text-right border-b border-slate-300">
                                                    {Number(selectedItemBatches.reduce((acc, b) => acc + (b.cost_price * b.current_stock), 0)).toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3 text-right border-b border-slate-300">
                                                    {Number(selectedItemBatches.reduce((acc, b) => acc + (b.retail_price * b.current_stock), 0)).toFixed(2)}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </AppSidebarLayout>
    );
}

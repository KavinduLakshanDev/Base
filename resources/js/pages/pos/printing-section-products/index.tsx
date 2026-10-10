// Printing Section Products - Index Page
import { useState, useEffect, useRef } from 'react';
import { Head, router } from '@inertiajs/react';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { toast } from 'sonner';
import { type BreadcrumbItem, PageProps, Company } from '@/types';
import {
    Calendar,
    Package,
    Printer,
    DollarSign,
    Building2,
    FileText,
    X,
    Filter,
    ChevronDown,
    Download
} from 'lucide-react';
import Pagination, { PaginationLink, PaginationMeta } from '@/components/pagination';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: t('Dashboard'),
        href: '/dashboard',
    },
    {
        title: t('POS System'),
        href: '/pos',
    },
    {
        title: t('Printing Section Products'),
        href: '#',
    },
];

interface Product {
    id: number;
    product_name: string;
    brand: string;
    model: string;
    serial_number: string;
    barcode: string;
    qty: number;
    cost_price: number;
    retail_price: number;
    wholesale_price: number;
    VehicleSalePrice: number;
    grn_no: string;
    grn_date: string;
    supplier_name: string;
    batch_no: string;
    created_at: string;
    is_available: boolean;
    section_code?: string | null;
}

interface Section {
    id: number;
    name: string;
    section_code: string;
}

interface ProductsData extends PaginationMeta {
    data: Product[];
    links: PaginationLink[];
}

interface Props extends PageProps {
    company: Company;
    products: ProductsData;
    sections: Section[];
    batches: string[];
    filters: {
        search?: string;
        stock_location?: string;
        batch?: string;
        availability?: 'all' | 'available' | 'sold';
    };
}


export default function PrintingSectionProductsIndex({ company, products, sections = [], batches = [], filters }: Props) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [stockLocation, setStockLocation] = useState(filters.stock_location || 'all');
    const [selectedBatch, setSelectedBatch] = useState(filters.batch || 'all');
    const [batchOpen, setBatchOpen] = useState(false);
    const [availability, setAvailability] = useState<'all'|'available'|'sold'>(
        (filters.availability as 'all'|'available'|'sold') || 'all'
    );
    const isFirstRender = useRef(true);

    // stock-location-specific statistics (mirrors printer transfer logic)
    const [totalSectionStock, setTotalSectionStock] = useState<number | null>(null);
    const [fetchingStock, setFetchingStock] = useState(false);

    // Safe wrapper for products data
    const safeProducts = {
        data: Array.isArray(products?.data) ? products.data : [],
        links: Array.isArray(products?.links) ? products.links : [],
        meta: products,
    };

    // Auto-search effect
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const timeoutId = setTimeout(() => {
            router.get(
                '/pos/printing-section-products',
                {
                    search: searchTerm,
                    stock_location: stockLocation === 'all' ? '' : stockLocation,
                    batch: selectedBatch === 'all' ? '' : selectedBatch,
                    availability: availability === 'all' ? '' : availability,
                },
                {
                    preserveState: true,
                    replace: true,
                }
            );
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchTerm, stockLocation, selectedBatch, availability]);

    // when user picks a specific stock location, fetch available printer count
    useEffect(() => {
        if (stockLocation && stockLocation !== 'all') {
            fetchTotalSectionStock(stockLocation);
        } else {
            setTotalSectionStock(null);
        }
    }, [stockLocation]);

    const fetchTotalSectionStock = (sectionCode: string) => {
        setFetchingStock(true);
        fetch(`/printer-transfers/section-trf-in-stock?section_code=${sectionCode}`)
            .then((res) => {
                if (res.ok) return res.json();
                throw new Error('network');
            })
            .then((data) => {
                if (data && typeof data.total_trf_in_stock !== 'undefined') {
                    setTotalSectionStock(data.total_trf_in_stock);
                }
            })
            .catch((err) => console.error('Error fetching section stock:', err))
            .finally(() => setFetchingStock(false));
    };

    // Calculate statistics
    const totalProducts = safeProducts.data.length;
    const totalValue = safeProducts.data.reduce((sum, product) => sum + (product.cost_price * product.qty), 0);
    const uniqueBrands = new Set(safeProducts.data.map(p => p.brand).filter(b => b)).size;
    const uniqueSuppliers = new Set(safeProducts.data.map(p => p.supplier_name).filter(s => s !== 'N/A')).size;
    const availableCount = safeProducts.data.filter(p => p.is_available).length;
    const soldCount = safeProducts.data.filter(p => !p.is_available).length;



    const clearFilters = () => {
        setSearchTerm('');
        setStockLocation('all');
        setSelectedBatch('all');
        setAvailability('all');
        router.get('/pos/printing-section-products', {}, {
            preserveState: true,
            replace: true,
        });
    };

    // print handler (similar to customer ledger)
    const handlePrint = () => {
        window.print();
    };

    const [exporting, setExporting] = useState(false);

    const handleExportCSV = async () => {
        try {
            setExporting(true);
            const params = new URLSearchParams({
                export: 'json',
                search: searchTerm || '',
                stock_location: stockLocation === 'all' ? '' : stockLocation,
                batch: selectedBatch === 'all' ? '' : selectedBatch,
                availability: availability === 'all' ? '' : availability,
            });

            const res = await fetch(`/pos/printing-section-products?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch data for export');
            
            const allProducts: Product[] = await res.json();
            
            if (allProducts.length === 0) {
                toast.error(t('No data to export'));
                return;
            }

            const headers = [
                '#',
                t('Product Name'),
                t('Brand'),
                t('Model'),
                t('Serial Number'),
                t('Barcode'),
                t('Status'),
                t('Section'),
                t('Cost Price'),
                t('Retail Price'),
                t('Wholesale Price'),
                t('Vehicle Sale Price'),
                t('GRN No'),
                t('GRN Date'),
                t('Batch No'),
                t('Supplier')
            ];

            const rows = allProducts.map((product, index) => [
                index + 1,
                `"${(product.product_name || '').replace(/"/g, '""')}"`,
                `"${(product.brand || '').replace(/"/g, '""')}"`,
                `"${(product.model || '').replace(/"/g, '""')}"`,
                `"${(product.serial_number || '').replace(/"/g, '""')}"`,
                `"${(product.barcode || '').replace(/"/g, '""')}"`,
                product.is_available ? t('Available') : t('Sold'),
                `"${product.section_code ? (sections.find(s => s.section_code === product.section_code)?.name || product.section_code).replace(/"/g, '""') : ''}"`,
                product.cost_price,
                product.retail_price,
                product.wholesale_price,
                product.VehicleSalePrice,
                `"${(product.grn_no || '').replace(/"/g, '""')}"`,
                `"${(product.grn_date || '').replace(/"/g, '""')}"`,
                `"${(product.batch_no || '').replace(/"/g, '""')}"`,
                `"${(product.supplier_name || '').replace(/"/g, '""')}"`
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `printing-section-products-${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Export error:', error);
            // Fallback: the page probably has sonner toast available
        } finally {
            setExporting(false);
        }
    };

    const formatPrice = (price: number | undefined | null) => {
        if (price === undefined || price === null) return 'Rs 0.00';
        return `Rs ${Number(price).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <>
            <AppLayout breadcrumbs={breadcrumbs}>
                <div className="min-h-screen bg-slate-50">
                    <Head title={t('Printing Section Products')}>
                        <style>{`@media print {
                            @page {
                                size: A4 portrait;
                                margin: 10mm;
                                margin-top: 0;
                            }

                            @page :first {
                                margin-top: 10mm;
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

                            /* Reset containers for multi-page flow */
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

                            #printable-products,
                            #printable-products * {
                                visibility: visible;
                            }

                            #printable-products {
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

                            /* remove card borders/shadows for print */
                            #printable-products .rounded-lg,
                            #printable-products .bg-white,
                            #printable-products .border,
                            #printable-products .shadow,
                            #printable-products .shadow-sm {
                                border: none !important;
                                box-shadow: none !important;
                            }
                        }`}</style>
                    </Head>

                    {/* Header */}
                    <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow no-print">
                        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                            <div className="flex flex-wrap items-center justify-between gap-3 py-4">
                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                    <button
                                        onClick={() => window.history.back()}
                                        className="shrink-0 rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                        title="Go Back"
                                    >
                                        <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                        </svg>
                                    </button>
                                    <div className="shrink-0 rounded-lg bg-white/20 p-2 shadow border border-white/30">
                                        <Printer className="h-5 w-5 text-white" />
                                    </div>
                                    <div className="min-w-0">
                                        <h1 className="text-lg sm:text-xl font-bold text-white truncate">
                                            {t('Printing Section Products')}
                                        </h1>
                                        <p className="text-xs text-white/80 hidden sm:block truncate">
                                            {t('View all products from GRN entries in printing section')}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <Button
                                        onClick={handleExportCSV}
                                        disabled={safeProducts.data.length === 0 || exporting}
                                        className="shrink-0 inline-flex flex-1 justify-center sm:flex-none sm:w-auto items-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                                    >
                                        {exporting ? (
                                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-vismass-blue border-t-transparent" />
                                        ) : (
                                            <Download className="mr-1.5 h-4 w-4" />
                                        )}
                                        {exporting ? t('Exporting...') : t('Export CSV')}
                                    </Button>
                                    <Button
                                        onClick={handlePrint}
                                        disabled={safeProducts.data.length === 0}
                                        className="shrink-0 inline-flex flex-1 justify-center sm:flex-none sm:w-auto items-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                                    >
                                        <Printer className="mr-1.5 h-4 w-4" />
                                        {t('Print')}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* Main Content */}
                    <div id="printable-products">
                    <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                        {/* print-only header */}
                        <div className="print-header hidden">
                            <div className="print-company-name">{company?.name || ''}</div>
                            <div className="print-report-title">{t('Printing Section Products')}</div>
                        </div>
                        <div className="px-4 sm:px-0">
                            {/* Stats Cards */}
                            <div className="no-print grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-4">
                                <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-lg bg-vismass-blue p-2 shadow-sm">
                                            <Package className="h-4 w-4 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-gray-600">{t('Total Products')}</p>
                                            <p className="text-lg font-bold text-gray-900">{totalProducts}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-green-200">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-lg bg-green-500 p-2 shadow-sm">
                                            <Package className="h-4 w-4 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-gray-600">{t('Available')}</p>
                                            <p className="text-lg font-bold text-green-700">{availableCount}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-red-200">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-lg bg-red-400 p-2 shadow-sm">
                                            <Package className="h-4 w-4 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-gray-600">{t('Sold')}</p>
                                            <p className="text-lg font-bold text-red-600">{soldCount}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-lg bg-orange-500 p-2 shadow-sm">
                                            <DollarSign className="h-4 w-4 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-gray-600">{t('Total Value')}</p>
                                            <p className="text-lg font-bold text-gray-900">{formatPrice(totalValue)}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-lg bg-vismass-grey p-2 shadow-sm">
                                            <Building2 className="h-4 w-4 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-gray-600">{t('Unique Brands')}</p>
                                            <p className="text-lg font-bold text-gray-900">{uniqueBrands}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-lg bg-vismass-blue/60 p-2 shadow-sm">
                                            <FileText className="h-4 w-4 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-gray-600">{t('Suppliers')}</p>
                                            <p className="text-lg font-bold text-gray-900">{uniqueSuppliers}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Main Content Card */}
                            <div className="rounded-lg border border-slate-200 bg-white shadow overflow-hidden">
                                <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 py-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                                        <div>
                                            <h3 className="text-base font-semibold text-white">
                                                {t('Printing Section Product List')}
                                            </h3>
                                            <p className="text-white/80 text-xs mt-0.5">
                                                {t('Products from GRN entries in printing section')}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4">
                                    {/* Filters */}
                                    <div className="no-print bg-slate-50 p-3 rounded-lg mb-4 border border-slate-200">
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                                        {t('Search')}
                                                    </label>
                                                    <Input
                                                        type="text"
                                                        placeholder={t('Product name, brand, model...')}
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                        className="w-full text-sm py-2"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                                        {t('Section')}
                                                    </label>
                                                    <Select
                                                        value={stockLocation}
                                                        onValueChange={setStockLocation}
                                                    >
                                                        <SelectTrigger className="w-full text-sm py-2">
                                                            <SelectValue placeholder={t('Select a location')} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="all">{t('All Sections')}</SelectItem>
                                                            {sections.map((section) => (
                                                                <SelectItem key={section.id} value={section.section_code}>
                                                                    {section.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {stockLocation !== 'all' && (
                                                        <div className="mt-1 text-xs text-vismass-blue">
                                                            {fetchingStock
                                                                ? t('Calculating current printers...')
                                                                : `${t('Total Printers in Section')}: ${totalSectionStock ?? 0}`}
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                                        {t('Availability')}
                                                    </label>
                                                    <Select
                                                        value={availability}
                                                        onValueChange={(v) => setAvailability(v as 'all'|'available'|'sold')}
                                                    >
                                                        <SelectTrigger className="w-full text-sm py-2">
                                                            <SelectValue placeholder={t('All')} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="all">{t('All')}</SelectItem>
                                                            <SelectItem value="available">{t('Available')}</SelectItem>
                                                            <SelectItem value="sold">{t('Sold')}</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                                        {t('Batch')}
                                                    </label>
                                                    <Popover open={batchOpen} onOpenChange={setBatchOpen}>
                                                        <PopoverTrigger asChild>
                                                            <Button
                                                                variant="outline"
                                                                role="combobox"
                                                                aria-expanded={batchOpen}
                                                                className="w-full justify-between text-sm py-2 h-auto border-slate-300 bg-white focus:border-vismass-blue focus:ring-vismass-blue"
                                                            >
                                                                {selectedBatch === 'all' ? t('All Batches') : selectedBatch || t('Select batch...')}
                                                                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-full p-0" align="start">
                                                            <Command>
                                                                <CommandInput placeholder={t('Search batch...')} className="h-9" />
                                                                <CommandList>
                                                                    <CommandEmpty>{t('No batch found.')}</CommandEmpty>
                                                                    <CommandGroup>
                                                                        <CommandItem
                                                                            value="all"
                                                                            onSelect={() => {
                                                                                setSelectedBatch('all');
                                                                                setBatchOpen(false);
                                                                            }}
                                                                        >
                                                                            {t('All Batches')}
                                                                        </CommandItem>
                                                                        {batches.map((batch) => (
                                                                            <CommandItem
                                                                                key={batch}
                                                                                value={batch}
                                                                                onSelect={() => {
                                                                                    setSelectedBatch(batch);
                                                                                    setBatchOpen(false);
                                                                                }}
                                                                            >
                                                                                {batch}
                                                                            </CommandItem>
                                                                        ))}
                                                                    </CommandGroup>
                                                                </CommandList>
                                                            </Command>
                                                        </PopoverContent>
                                                    </Popover>
                                                </div>
                                            </div>
                                            <div className="flex justify-end">
                                                <button
                                                    onClick={clearFilters}
                                                    className="inline-flex w-full justify-center sm:w-auto items-center bg-gray-200 text-gray-700 px-4 py-2 text-sm rounded-lg hover:bg-gray-300 transition-all duration-200 font-medium"
                                                >
                                                    <Filter className="mr-1.5 h-3.5 w-3.5" />
                                                    {t('Clear')}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Products Table */}
                                    <div className="overflow-hidden rounded-lg border border-gray-200">
                                        <div className="overflow-x-auto">
                                            <table className="min-w-[720px] divide-y divide-gray-200">
                                                <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
                                                    <tr>
                                                        <th className="px-2 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                            #
                                                        </th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                            {t('Product Details')}
                                                        </th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                            {t('Pricing')}
                                                        </th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                            {t('GRN Info')}
                                                        </th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                            {t('Supplier')}
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {safeProducts.data.map((product, idx) => (
                                                        <tr key={product.id} className="hover:bg-sky-50/50 transition-colors duration-150">
                                                            <td className="px-2 py-2.5 text-xs text-gray-600">
                                                                {idx + 1}
                                                            </td>
                                                            <td className="px-4 py-2.5">
                                                                <div className="flex items-center">
                                                                    <div className="flex-shrink-0 h-8 w-8">
                                                                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                                                                            product.is_available ? 'bg-green-100' : 'bg-red-100'
                                                                        }`}>
                                                                            <Package className={`h-3.5 w-3.5 ${
                                                                                product.is_available ? 'text-green-600' : 'text-red-400'
                                                                            }`} />
                                                                        </div>
                                                                    </div>
                                                                    <div className="ml-2.5">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span className="text-xs font-medium text-gray-900">
                                                                                {product.product_name || 'Unknown Product'}
                                                                            </span>
                                                                            {product.is_available ? (
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <span className="inline-flex items-center rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 ring-1 ring-inset ring-green-600/20">
                                                                                        {t('Available')}
                                                                                    </span>
                                                                                    {product.section_code && (
                                                                                        <span className="inline-flex items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/20">
                                                                                            {sections.find(s => s.section_code === product.section_code)?.name || product.section_code}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            ) : (
                                                                                <span className="inline-flex items-center rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 ring-1 ring-inset ring-red-600/20">
                                                                                    {t('Sold')}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="text-xs text-gray-500">
                                                                            {product.brand && <span>{t('Brand')}: {product.brand}</span>}
                                                                            {product.brand && product.model && <span> • </span>}
                                                                            {product.model && <span>{t('Model')}: {product.model}</span>}
                                                                        </div>
                                                                        <div className="text-xs text-gray-400 mt-0.5">
                                                                            {product.serial_number && <span>{t('SN')}: {product.serial_number}</span>}
                                                                            {product.barcode && <span> • {t('Barcode')}: {product.barcode}</span>}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-2.5">
                                                                <div className="text-xs text-gray-900">
                                                                    <div>{t('Cost')}: {formatPrice(product.cost_price)}</div>
                                                                    <div>{t('Retail')}: {formatPrice(product.retail_price)}</div>
                                                                    <div>{t('Wholesale')}: {formatPrice(product.wholesale_price)}</div>
                                                                    <div>{t('VS Price')}: {formatPrice(product.VehicleSalePrice)}</div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-2.5">
                                                                <div className="text-xs text-gray-900">
                                                                    <div className="font-medium">{product.grn_no}</div>
                                                                    <div className="text-gray-500 flex items-center mt-0.5">
                                                                        <Calendar className="h-3 w-3 mr-1" />
                                                                        {product.grn_date}
                                                                    </div>
                                                                    {product.batch_no && (
                                                                        <div className="text-gray-500">
                                                                            {t('Batch')}: {product.batch_no}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-2.5 text-xs text-gray-500">
                                                                {product.supplier_name}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Pagination */}
                                        <Pagination links={safeProducts.links} meta={safeProducts.meta} />

                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>
                    </div>
                    {/* Footer */}
                    <footer className="mt-6 border-t border-sky-200 bg-gradient-to-r from-white to-sky-50">
                        <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
                            <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2">
                                <p className="text-xs text-gray-500">© VISMASS {t('Printing Section Products')} • v1.0.0</p>
                            </div>
                        </div>
                    </footer>
                </div>
            </AppLayout>
        </>
    );
}
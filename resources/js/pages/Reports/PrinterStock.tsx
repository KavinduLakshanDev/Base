import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Head, router } from '@inertiajs/react';
import { Download, Loader, Search, Printer, FileText, CheckCircle, TrendingUp, Layers, Filter } from 'lucide-react';
import { useState, useMemo, useEffect, useRef } from 'react';
import AppSidebarLayout from '../../layouts/app/app-sidebar-layout';
import { BreadcrumbItem } from '@/types';
import { t } from '@/lib/i18n';
import Pagination, { PaginationLink, PaginationMeta } from '@/components/pagination';

interface Section {
    id: number;
    name: string;
    section_code: string;
}

interface StockData {
    brand: string;
    model: string;
    serial_number?: string;
    batch_no: string;
    warranty: string;
    section_code: string;
    section_name: string;
    ItemCode: string | null;
    item_name: string | null;
    balance: number;
}

interface Props {
    stockData: {
        data: StockData[];
        links: PaginationLink[];
        meta: PaginationMeta;
    };
    sections: Section[];
    filters: {
        section?: string;
        search?: string;
        per_page?: string;
    };
    companyInfo: {
        name: string;
        section: string;
        code: string;
        section_code: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Printer Stock In Hand',
        href: '/reports/printer-stock',
    },
];

export default function PrinterStock({ stockData, sections = [], filters, companyInfo }: Props) {
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [search, setSearch] = useState(filters.search || '');
    const [section, setSection] = useState(filters.section || 'all');    const [perPage, setPerPage] = useState(filters.per_page || '10');

    // Initial render ref to prevent double fetch on mount
    const isFirstRender = useRef(true);

    // Safe access to stock data
    const safeStockData = stockData?.data || [];
    const meta = stockData?.meta;
    const links = stockData?.links || [];

    useEffect(() => {
        console.log('PrinterStock safeStockData', safeStockData);
    }, [safeStockData]);

    useEffect(() => {
        // Skip first render (initial data already passed via props)
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const timeoutId = setTimeout(() => {
            setLoading(true);
            router.get(
                '/reports/printer-stock',
                {
                    search,
                    section: section === 'all' ? '' : section,
                    per_page: perPage
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                    onFinish: () => setLoading(false),
                }
            );
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [search, section, perPage]);
    
    const handleSearch = () => {
        setLoading(true);
        router.get(
            '/reports/printer-stock',
            { search, section: section === 'all' ? '' : section },
            {
                preserveState: true,
                onFinish: () => setLoading(false),
            }
        );
    };

    const handleReset = () => {
        setSearch('');
        setSection('all');
        setPerPage('10');
    };

    const handleDownload = () => {
        setDownloading(true);
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (section && section !== 'all') params.append('section', section);
        if (perPage) params.append('per_page', perPage);

        const url = `/reports/printer-stock/download?${params.toString()}`;
        window.location.href = url;
        setTimeout(() => setDownloading(false), 2000);
    };

    // Group data by item_name, brand, model, and batch/section/warranty combination
    const groupedData = useMemo(() => {
        const groups: Record<string, Record<string, Record<string, Record<string, { rows: StockData[], total: number }>>>> = {};
        
        safeStockData.forEach(row => {
            const item = row.item_name || 'Unknown';
            const brand = row.brand || 'Unknown';
            const model = row.model || 'Unknown';
            const key = `${row.batch_no || ''}-${row.section_code || ''}-${row.warranty || ''}`;
            
            if (!groups[item]) groups[item] = {};
            if (!groups[item][brand]) groups[item][brand] = {};
            if (!groups[item][brand][model]) groups[item][brand][model] = {};
            if (!groups[item][brand][model][key]) groups[item][brand][model][key] = { rows: [], total: 0 };
            
            groups[item][brand][model][key].rows.push(row);
            groups[item][brand][model][key].total += Number(row.balance) || 0;
        });
        
        return groups;
    }, [safeStockData]);

    // Calculate rowspan for each level
    const getItemRowspan = (itemGroups: Record<string, Record<string, Record<string, { rows: StockData[], total: number }>>>) => {
        return Object.values(itemGroups).reduce((total, brandGroups) => {
            return total + Object.values(brandGroups).reduce((brandTotal, modelGroups) => {
                return brandTotal + Object.keys(modelGroups).length;
            }, 0);
        }, 0);
    };

    const getBrandRowspan = (brandGroups: Record<string, Record<string, { rows: StockData[], total: number }>>) => {
        return Object.values(brandGroups).reduce((total, modelGroups) => total + Object.keys(modelGroups).length, 0);
    };

    const getModelRowspan = (modelGroups: Record<string, { rows: StockData[], total: number }>) => {
        return Object.keys(modelGroups).length;
    };

    // Calculate Stats
    const totalPrinters = meta?.total || safeStockData.length;
    const uniqueModels = new Set(safeStockData.map(s => s.model?.toLowerCase())).size;
    const uniqueBrands = new Set(safeStockData.map(s => s.brand?.toLowerCase())).size;
    const activeSections = new Set(safeStockData.map(s => s.section_code)).size;

    return (
        <AppSidebarLayout breadcrumbs={breadcrumbs}>
            <div className="min-h-screen bg-slate-50">
                <Head title={t('Printer Stock In Hand')}>
                    <style>{`
                        @media print {
                            @page {
                                size: A4 landscape;
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
                                margin-bottom: 20px;
                                border-bottom: 2px solid #000;
                                padding-bottom: 10px;
                                display: block !important;
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
                
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4">
                            <div className="flex items-center space-x-3">
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <Printer className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">
                                        {t('Printer Stock In Hand')}
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        {t('Manage and track serialized printer inventory')}
                                    </p>
                                </div>
                            </div>
                            <Button
                                onClick={handleDownload}
                                className="inline-flex items-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                                disabled={downloading}
                            >
                                {downloading ? (
                                    <Loader className="mr-1.5 h-4 w-4 animate-spin" />
                                ) : (
                                    <Download className="mr-1.5 h-4 w-4" />
                                )}
                                {t('Export PDF')}
                            </Button>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        {/* Print Header */}
                        <div className="print-header" style={{ display: 'none' }}>
                            <div className="mb-4 text-center">
                                <div className="text-center">
                                    <div className="print-company-name">{companyInfo?.name || ''}</div>
                                    <div className="text-sm text-slate-600">Printer Stock In Hand Report</div>
                                </div>
                            </div>
                        </div>

                        <div id="printable-report">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue p-2 shadow-sm">
                                        <Printer className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Total Printers')}</p>
                                        <p className="text-lg font-bold text-gray-900">{totalPrinters}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-green-500 p-2 shadow-sm">
                                        <Layers className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Unique Models')}</p>
                                        <p className="text-lg font-bold text-gray-900">{uniqueModels}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-grey p-2 shadow-sm">
                                        <FileText className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Total Brands')}</p>
                                        <p className="text-lg font-bold text-gray-900">{uniqueBrands}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-orange-500 p-2 shadow-sm">
                                        <CheckCircle className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Locations')}</p>
                                        <p className="text-lg font-bold text-gray-900">{activeSections}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Content Card */}
                        <div className="rounded-lg border border-slate-200 bg-white shadow overflow-hidden no-print">
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 py-3">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                                    <div>
                                        <h3 className="text-base font-semibold text-white">
                                            {t('Stock Inventory Data')}
                                        </h3>
                                        <p className="text-white/80 text-xs mt-0.5">
                                            {t('Filter and search across all sections')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4">
                                {/* Filters */}
                                <div className="bg-slate-50 p-3 rounded-lg mb-4 border border-slate-200">
                                    <div className="space-y-3 md:space-y-0 md:flex md:space-x-3">
                                        <div className="flex-1">
                                            <div className="relative">
                                                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <Input
                                                    type="text"
                                                    placeholder={t('Search by Brand, Model or Serial Number...')}
                                                    value={search}
                                                    onChange={(e) => setSearch(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="md:w-48">
                                            <div className="relative">
                                                <Layers className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <Select value={section} onValueChange={setSection}>
                                                    <SelectTrigger className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition">
                                                <SelectValue placeholder={t('All Sections')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">{t('All Sections')}</SelectItem>
                                                {sections.map((s) => (
                                                    <SelectItem key={s.id} value={s.id.toString()}>
                                                        {s.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                            </div>
                                        </div>

                                        <div className="w-full sm:w-auto">
                                            <select
                                                value={perPage}
                                                onChange={(e) => setPerPage(e.target.value)}
                                                className="w-full sm:w-32 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-vismass-blue focus:ring-2 focus:ring-vismass-blue/20"
                                            >
                                                <option value="10">10 / {t('Page')}</option>
                                                <option value="25">25 / {t('Page')}</option>
                                                <option value="50">50 / {t('Page')}</option>
                                                <option value="100">100 / {t('Page')}</option>
                                            </select>
                                        </div>
                                        
                                        <div className="flex space-x-2">
                                            <button
                                                type="button"
                                                onClick={handleReset}
                                                className="inline-flex items-center bg-gray-200 text-gray-700 px-4 py-2 text-sm rounded-lg hover:bg-gray-300 transition-all duration-200 font-medium"
                                            >
                                                <Filter className="mr-1.5 h-3.5 w-3.5" />
                                                {t('Clear')}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Table */}
                                <div className="overflow-hidden rounded-lg border border-gray-200">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
                                            <tr>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Printer Name')}</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Brand')}</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Model')}</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Serial Number')}</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Batch / GRN')}</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Section')}</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Warranty')}</th>
                                                <th className="px-4 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Stock')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {Object.keys(groupedData).length > 0 ? (
                                                Object.entries(groupedData).map(([itemName, itemGroups]) => {
                                                    const itemRowspan = getItemRowspan(itemGroups);
                                                    let itemRendered = false;
                                                    
                                                    return Object.entries(itemGroups).map(([brand, brandGroups]) => {
                                                        const brandRowspan = getBrandRowspan(brandGroups);
                                                        let brandRendered = false;
                                                        
                                                        return Object.entries(brandGroups).map(([model, modelGroups]) => {
                                                            const modelRowspan = getModelRowspan(modelGroups);
                                                            let modelRendered = false;
                                                            
                                                            return Object.entries(modelGroups).map(([key, { rows, total }]) => {
                                                                const row = rows[0]; // Use first row for details
                                                                const isFirstItem = !itemRendered;
                                                                const isFirstBrand = !brandRendered;
                                                                const isFirstModel = !modelRendered;
                                                                
                                                                if (isFirstItem) itemRendered = true;
                                                                if (isFirstBrand) brandRendered = true;
                                                                if (isFirstModel) modelRendered = true;
                                                                
                                                                return (
                                                                    <tr key={`${itemName}-${brand}-${model}-${key}`} className="hover:bg-sky-50/50 transition-colors duration-150">
                                                                        {isFirstItem && (
                                                                            <td rowSpan={itemRowspan} className="px-4 py-2.5">
                                                                                <div className="text-xs font-medium text-gray-900">
                                                                                    {itemName}
                                                                                </div>
                                                                                <div className="text-xs text-gray-500">{row.ItemCode || ''}</div>
                                                                            </td>
                                                                        )}
                                                                        {isFirstBrand && (
                                                                            <td rowSpan={brandRowspan} className="px-4 py-2.5">
                                                                                <div className="text-xs font-medium text-gray-900">
                                                                                    {brand}
                                                                                </div>
                                                                            </td>
                                                                        )}
                                                                        {isFirstModel && (
                                                                            <td rowSpan={modelRowspan} className="px-4 py-2.5">
                                                                                <div className="text-xs text-gray-900">
                                                                                    {model}
                                                                                </div>
                                                                            </td>
                                                                        )}
                                                                        <td className="px-4 py-2.5">
                                                                            <span className="text-xs font-mono text-gray-700 bg-gray-100 px-2 py-1 rounded">
                                                                                {row.serial_number || '-'}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-4 py-2.5 text-xs text-gray-500">
                                                                            {row.batch_no || '-'}
                                                                        </td>
                                                                        <td className="px-4 py-2.5">
                                                                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-sky-100 text-sky-700">
                                                                                {row.section_name}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-4 py-2.5 text-xs text-gray-600">
                                                                            {row.warranty || '-'}
                                                                        </td>
                                                                        <td className="px-4 py-2.5 text-right">
                                                                            <span className="text-xs font-semibold text-green-600">
                                                                                {Number(total).toFixed(0)}
                                                                            </span>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            });
                                                        }).flat();
                                                    }).flat();
                                                }).flat()
                                            ) : (
                                                <tr>
                                                    <td colSpan={7} className="px-4 py-8 text-center">
                                                        <div className="flex flex-col items-center justify-center">
                                                            <div className="mx-auto h-10 w-10 text-gray-400 mb-3">
                                                                <Printer className="h-10 w-10" />
                                                            </div>
                                                            <h3 className="text-xs font-medium text-gray-900 mb-1.5">{t('No printers found')}</h3>
                                                            <p className="text-xs text-gray-500 mb-3">
                                                                {t('Try adjusting your search criteria.')}
                                                            </p>
                                                            <button
                                                                onClick={handleReset}
                                                                className="text-xs text-sky-600 hover:text-sky-800 font-medium"
                                                            >
                                                                {t('Clear filters')}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                
                                {(links || []).length > 0 && (
                                    <Pagination links={links} meta={meta} />
                                )}
                            </div>
                        </div>
                        </div>

                        {/* Print Table */}
                        <div id="printable-report" className="hidden print:block">
                            <div className="overflow-hidden rounded-lg border border-gray-200">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
                                        <tr>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Printer Name')}</th>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Brand')}</th>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Model')}</th>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Batch / GRN')}</th>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Section')}</th>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Warranty')}</th>
                                            <th className="px-4 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Stock')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {Object.keys(groupedData).length > 0 ? (
                                            Object.entries(groupedData).map(([itemName, itemGroups]) => {
                                                const itemRowspan = getItemRowspan(itemGroups);
                                                let itemRendered = false;
                                                
                                                return Object.entries(itemGroups).map(([brand, brandGroups]) => {
                                                    const brandRowspan = getBrandRowspan(brandGroups);
                                                    let brandRendered = false;
                                                    
                                                    return Object.entries(brandGroups).map(([model, modelGroups]) => {
                                                        const modelRowspan = getModelRowspan(modelGroups);
                                                        let modelRendered = false;
                                                        
                                                        return Object.entries(modelGroups).map(([key, { rows, total }]) => {
                                                            const row = rows[0]; // Use first row for details
                                                            const isFirstItem = !itemRendered;
                                                            const isFirstBrand = !brandRendered;
                                                            const isFirstModel = !modelRendered;
                                                            
                                                            if (isFirstItem) itemRendered = true;
                                                            if (isFirstBrand) brandRendered = true;
                                                            if (isFirstModel) modelRendered = true;
                                                            
                                                            return (
                                                                <tr key={`${itemName}-${brand}-${model}-${key}`} className="hover:bg-sky-50/50 transition-colors duration-150">
                                                                    {isFirstItem && (
                                                                        <td rowSpan={itemRowspan} className="px-4 py-2.5">
                                                                            <div className="text-xs font-medium text-gray-900">
                                                                                {itemName}
                                                                            </div>
                                                                            <div className="text-xs text-gray-500">{row.ItemCode || ''}</div>
                                                                        </td>
                                                                    )}
                                                                    {isFirstBrand && (
                                                                        <td rowSpan={brandRowspan} className="px-4 py-2.5">
                                                                            <div className="text-xs font-medium text-gray-900">
                                                                                {brand}
                                                                            </div>
                                                                        </td>
                                                                    )}
                                                                    {isFirstModel && (
                                                                        <td rowSpan={modelRowspan} className="px-4 py-2.5">
                                                                            <div className="text-xs text-gray-900">
                                                                                {model}
                                                                            </div>
                                                                        </td>
                                                                    )}
                                                                    <td className="px-4 py-2.5 text-xs text-gray-500">
                                                                        {row.batch_no || '-'}
                                                                    </td>
                                                                    <td className="px-4 py-2.5">
                                                                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-sky-100 text-sky-700">
                                                                            {row.section_name}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-2.5 text-xs text-gray-600">
                                                                        {row.warranty || '-'}
                                                                    </td>
                                                                    <td className="px-4 py-2.5 text-right">
                                                                        <span className="text-xs font-semibold text-green-600">
                                                                            {Number(total).toFixed(0)}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        });
                                                    }).flat();
                                                }).flat();
                                            }).flat()
                                        ) : (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-8 text-center">
                                                    <p className="text-xs text-gray-500">{t('No data available')}</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Print Footer */}
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
            </div>
        </AppSidebarLayout>
    );
}

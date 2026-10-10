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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { t } from '@/lib/i18n';
import { Head, router } from '@inertiajs/react';
import { Calendar, FileText, Loader, RotateCcw, Search, Printer, Trash2, Package } from 'lucide-react';
import { useState, useMemo } from 'react';
import AppSidebarLayout from '../../layouts/app/app-sidebar-layout';
import { BreadcrumbItem } from '@/types';

interface Section {
    id: number;
    name: string;
}

interface CompanyInfo {
    name: string;
    section: string;
    code: string;
    section_code: string;
}

interface WastageItem {
    date: string;
    item_code: string;
    item_name: string;
    batch_no: string;
    serial_number: string;
    brand: string;
    model: string;
    quantity: number;
    cost_price: number;
    category: string;
    section: string;
    reason: string;
    table_key: string;
}

interface Props {
    companyInfo: CompanyInfo;
    sections: Section[];
    wastageData: WastageItem[];
    filters: {
        from_date: string;
        to_date: string;
        section?: string;
    };
}

export default function WastageReport({ companyInfo, sections, wastageData, filters }: Props) {
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSection, setSelectedSection] = useState(filters.section || 'all');
    const [fromDate, setFromDate] = useState(filters.from_date ? filters.from_date.split('T')[0] : '');
    const [toDate, setToDate] = useState(filters.to_date ? filters.to_date.split('T')[0] : '');

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('Dashboard'),
            href: '/dashboard',
        },
        // {
        //     title: t('Reports'),
        //     href: '#',
        // },
        {
            title: t('Wastage Report'),
            href: '#',
        },
    ];

    const filteredData = useMemo(() => {
        return wastageData.filter(item => {
            const matchesSearch = searchTerm === '' ||
                item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.batch_no.toLowerCase().includes(searchTerm.toLowerCase());

            return matchesSearch;
        });
    }, [wastageData, searchTerm]);

    const totalWastage = useMemo(() => {
        return filteredData.reduce((sum, item) => sum + item.quantity, 0);
    }, [filteredData]);

    const totalWastageValue = useMemo(() => {
        return filteredData.reduce((sum, item) => sum + (item.cost_price || 0) * item.quantity, 0);
    }, [filteredData]);

    const handleFilter = () => {
        setLoading(true);
        const params = new URLSearchParams({
            from_date: fromDate,
            to_date: toDate,
        });

        if (selectedSection && selectedSection !== 'all') {
            params.append('section', selectedSection);
        }

        router.get('/reports/wastage', Object.fromEntries(params), {
            preserveState: true,
            onFinish: () => setLoading(false),
        });
    };

    const handlePrint = () => {
        window.print();
    };

    const handleReset = () => {
        setSearchTerm('');
        setSelectedSection('all');
        setFromDate(filters.from_date);
        setToDate(filters.to_date);
        router.get('/reports/wastage');
    };

    return (
        <AppSidebarLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Wastage Report')} />
            <style>{`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 10mm;
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
                    
                    body * {
                        visibility: hidden;
                    }
                    
                    #printable-area,
                    #printable-area * {
                        visibility: visible;
                    }
                    
                    #printable-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        background: white;
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
                    
                    #printable-area .overflow-hidden,
                    #printable-area .overflow-auto {
                        overflow: visible !important;
                        border: none !important;
                        border-radius: 0 !important;
                        box-shadow: none !important;
                    }

                    #printable-area .print-table {
                        width: 100%;
                        border-collapse: collapse;
                        table-layout: fixed;
                        font-size: 9px;
                        page-break-inside: auto;
                        color: #000 !important;
                    }
                    
                    #printable-area thead {
                        display: table-header-group;
                    }

                    #printable-area tbody {
                        display: table-row-group;
                    }

                    tr {
                        page-break-inside: avoid;
                        page-break-after: auto;
                    }

                    th, td {
                        border: 1px solid #000;
                        padding: 3px;
                        color: #000 !important;
                        vertical-align: top;
                        word-break: break-word;
                    }
                    
                    th {
                        background-color: #e5e7eb !important;
                        font-weight: bold;
                        text-align: left;
                        color: #000 !important;
                    }

                    /* Column Widths */
                     th:nth-child(1), td:nth-child(1) { width: 10%; } /* Date */
                     th:nth-child(2), td:nth-child(2) { width: 14%; font-weight: bold; } /* Product */
                     th:nth-child(3), td:nth-child(3) { width: 8%; } /* Category */
                     th:nth-child(4), td:nth-child(4) { width: 12%; } /* Batch / Serial */
                     th:nth-child(5), td:nth-child(5) { width: 8%; } /* Section */
                     th:nth-child(6), td:nth-child(6) { width: 6%; text-align: right; } /* Qty */
                     th:nth-child(7), td:nth-child(7) { width: 8%; text-align: right; } /* Cost Price */
                    th:nth-child(8), td:nth-child(8) { width: 8%; text-align: right; } /* Total Cost */
                    th:nth-child(9), td:nth-child(9) { width: 12%; } /* Reason */
                    
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

            <div className="min-h-screen bg-slate-50 report-content">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow no-print">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4">
                            <div className="flex items-center space-x-3">
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <Trash2 className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">
                                        {t('Wastage Report')}
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        {t('Track wastage items by date period')}
                                    </p>
                                </div>
                            </div>
                            <Button
                                onClick={handlePrint}
                                className="inline-flex items-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200 print-button"
                            >
                                <Printer className="mr-1.5 h-4 w-4" />
                                {t('Print Report')}
                            </Button>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 no-print">
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue p-2 shadow-sm">
                                        <Trash2 className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Total Wastage Items')}</p>
                                        <p className="text-lg font-bold text-gray-900">{filteredData.length}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-red-500 p-2 shadow-sm">
                                        <Package className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Total Wastage Quantity')}</p>
                                        <p className="text-lg font-bold text-gray-900">{totalWastage.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-green-500 p-2 shadow-sm">
                                        <FileText className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Total Wastage Value')}</p>
                                        <p className="text-lg font-bold text-gray-900">{totalWastageValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-orange-500 p-2 shadow-sm">
                                        <Calendar className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Period')}</p>
                                        <p className="text-sm font-bold text-gray-900">
                                            {new Date(fromDate).toLocaleDateString()} - {new Date(toDate).toLocaleDateString()}
                                        </p>
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
                                            {t('Wastage Details')}
                                        </h3>
                                        <p className="text-white/80 text-xs mt-0.5">
                                            {t('Browse and manage wastage records')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4">
                                {/* Filters and Search */}
                                <div className="flex flex-col md:flex-row gap-4 mb-4 no-print">
                                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                        <div>
                                            <Label htmlFor="from_date" className="text-xs font-medium text-gray-600">{t('From Date')}</Label>
                                            <Input
                                                id="from_date"
                                                type="date"
                                                value={fromDate}
                                                onChange={(e) => setFromDate(e.target.value)}
                                                className="mt-1"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="to_date" className="text-xs font-medium text-gray-600">{t('To Date')}</Label>
                                            <Input
                                                id="to_date"
                                                type="date"
                                                value={toDate}
                                                onChange={(e) => setToDate(e.target.value)}
                                                className="mt-1"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="section" className="text-xs font-medium text-gray-600">{t('Section')}</Label>
                                            <Select value={selectedSection} onValueChange={setSelectedSection}>
                                                <SelectTrigger className="mt-1">
                                                    <SelectValue placeholder={t('All Sections')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">{t('All Sections')}</SelectItem>
                                                    {sections.map((section) => (
                                                        <SelectItem key={section.id} value={section.id.toString()}>
                                                            {section.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="flex items-end gap-2">
                                        <Button onClick={handleFilter} disabled={loading} className="w-full sm:w-auto">
                                            {loading ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                                            {t('Filter')}
                                        </Button>
                                        <Button onClick={handleReset} variant="outline" className="w-full sm:w-auto">
                                            <RotateCcw className="mr-2 h-4 w-4" />
                                            {t('Reset')}
                                        </Button>
                                    </div>
                                </div>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder={t('Search by item name, code, or batch...')}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 w-full"
                                    />
                                </div>

                                {/* Transfer List */}
                                <div id="printable-area">
                                    <div className="print-header" style={{ display: 'none' }}>
                                        <div className="text-center">
                                            <div className="text-3xl font-black" style={{ marginBottom: '5px' }}>
                                                <span style={{ color: '#00aeef' }}>VIS</span>
                                                <span style={{ color: '#737578' }}>MASS</span>
                                            </div>
                                            <div className="text-sm text-slate-600">Wastage Report</div>
                                            <div className="text-xs text-slate-500">
                                                {new Date(fromDate).toLocaleDateString()} - {new Date(toDate).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="overflow-hidden rounded-lg border border-gray-200 mt-4">
                                        <Table className="print-table">
                                            <TableHeader className="bg-gradient-to-r from-sky-50 to-blue-50">
                                                <TableRow>
                                                    <TableHead className="px-3 py-2 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Date')}</TableHead>
                                                    <TableHead className="px-3 py-2 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Product')}</TableHead>
                                                    <TableHead className="px-3 py-2 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Category')}</TableHead>
                                                    <TableHead className="px-3 py-2 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Batch / Serial')}</TableHead>
                                                    <TableHead className="px-3 py-2 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Section')}</TableHead>
                                                    <TableHead className="px-3 py-2 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Qty')}</TableHead>
                                                    <TableHead className="px-3 py-2 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Cost Price')}</TableHead>
                                                    <TableHead className="px-3 py-2 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Total Cost')}</TableHead>
                                                    <TableHead className="px-3 py-2 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Reason')}</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody className="bg-white divide-y divide-gray-200">
                                                {filteredData.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={9} className="px-4 py-8 text-center text-gray-500">
                                                            <Trash2 className="mx-auto h-10 w-10 text-gray-400 mb-3" />
                                                            <h3 className="text-xs font-medium text-gray-900 mb-1.5">
                                                                {t('No wastage data found')}
                                                            </h3>
                                                            <p className="text-xs text-gray-500">
                                                                {t('No records match the current filters.')}
                                                            </p>
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    filteredData.map((item, index) => (
                                                        <TableRow key={index} className="hover:bg-sky-50/50 transition-colors duration-150">
                                                            <TableCell className="px-3 py-2 text-xs font-medium text-gray-900">
                                                                {new Date(item.date).toLocaleString('en-GB', {
                                                                    year: 'numeric',
                                                                    month: '2-digit',
                                                                    day: '2-digit',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                })}
                                                            </TableCell>
                                                            <TableCell className="px-3 py-2 text-xs text-gray-900 font-medium">{item.item_name}</TableCell>
                                                            <TableCell className="px-3 py-2 text-xs text-gray-900">{item.category || '-'}</TableCell>
                                                            <TableCell className="px-3 py-2 text-xs text-gray-900">
                                                                {item.batch_no && item.serial_number 
                                                                    ? `${item.batch_no} / ${item.serial_number}`
                                                                    : item.batch_no || item.serial_number || '-'
                                                                }
                                                            </TableCell>
                                                            <TableCell className="px-3 py-2 text-xs text-gray-900">{item.section || '-'}</TableCell>
                                                            <TableCell className="px-3 py-2 text-right text-xs font-bold text-red-600">{item.quantity}</TableCell>
                                                            <TableCell className="px-3 py-2 text-right text-xs font-medium text-gray-600">{(item.cost_price || 0).toLocaleString()}</TableCell>
                                                            <TableCell className="px-3 py-2 text-right text-xs font-bold text-orange-600">{((item.cost_price || 0) * item.quantity).toFixed(2)}</TableCell>
                                                            <TableCell className="px-3 py-2 text-xs text-gray-900">{item.reason ? item.reason.charAt(0).toUpperCase() + item.reason.slice(1) : '-'}</TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
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
                        </div>
                    </div>
                </main>
            </div>
        </AppSidebarLayout>
    );
}

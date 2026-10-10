import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { Head, router } from '@inertiajs/react';
import {
    Download,
    FileText,
    ArrowLeft,
    PackageSearch,
    Filter,
    Calendar,
    RefreshCw,
} from 'lucide-react';
import AppSidebarLayout from '@/layouts/app/app-sidebar-layout';
import { useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

interface Company {
    name: string;
    branch: string;
    code: string;
    branch_code: string;
}

interface ReportItem {
    id: number;
    job_id: number;
    job_number: string;
    received_date: string;
    customer_name: string;
    item_code: string;
    item_name: string;
    item_type: string;
    batch_no: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
    current_stock: number;
}

interface ReportSummary {
    total_quantity: number;
    total_amount: number;
    total_records: number;
}

interface ReportData {
    items: ReportItem[];
    summary: ReportSummary;
}

interface Props {
    company: Company;
    filters: {
        group_by?: string;
        from_date?: string;
        to_date?: string;
    };
    reportData?: ReportData;
}

const breadcrumbs = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Service Jobs Item Usage Report', href: '/reports/service-job-item-usage' },
];

export default function ServiceJobItemUsageReport({
    company,
    filters,
    reportData,
}: Props) {
    const [groupBy, setGroupBy] = useState(filters.group_by || 'job');
    const [fromDate, setFromDate] = useState(filters.from_date || '');
    const [toDate, setToDate] = useState(filters.to_date || '');

    const applyFilters = (gb = groupBy, from = fromDate, to = toDate) => {
        const params = new URLSearchParams();
        params.append('group_by', gb);
        if (from) params.append('from_date', from);
        if (to) params.append('to_date', to);
        
        router.get(`/reports/service-job-item-usage?${params.toString()}`, {}, {
            preserveScroll: true,
            preserveState: true,
        });
    };

    const handleGroupByChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newGroupBy = e.target.value;
        setGroupBy(newGroupBy);
        applyFilters(newGroupBy, fromDate, toDate);
    };

    const handleExport = (format: 'pdf' | 'excel') => {
        const params = new URLSearchParams();
        params.append('format', format);
        params.append('group_by', groupBy);
        if (fromDate) params.append('from_date', fromDate);
        if (toDate) params.append('to_date', toDate);
        
        window.location.href = `/reports/service-job-item-usage/export?${params.toString()}`;
    };

    const isItemWise = filters.group_by === 'item';

    const formatCurrency = (amount: number) => {
        return `Rs ${new Intl.NumberFormat('en-GB', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount)}`;
    };

    return (
        <AppSidebarLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Service Jobs Item Usage Report')} />
            
            <div className="min-h-screen bg-slate-50">
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-center space-x-3">
                                <div className="shrink-0 rounded-lg bg-white/20 p-2 shadow">
                                    <PackageSearch className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="truncate text-lg sm:text-xl font-bold text-white">
                                        {t('Service Jobs Reserved Items')}
                                    </h1>
                                    <p className="hidden text-xs text-white/80 sm:block">
                                        {t('Detailed report of parts and items reserved in service jobs')}
                                    </p>
                                </div>
                            </div>
                            <Button
                                onClick={() => router.visit('/dashboard')}
                                className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                {t('Back to Dashboard')}
                            </Button>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        <div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 sm:px-6 py-4">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">{t('Item Usage Report')}</h3>
                                    </div>
                                    <div className="text-white/80 text-sm whitespace-nowrap">{t('Generated on')}: {new Date().toLocaleDateString()}</div>
                                </div>
                            </div>

                            <div className="p-4 sm:p-6">
                                {/* Filters */}
                                <div className="bg-slate-50 p-3 rounded-lg mb-4 border border-slate-200">
                                    <form onSubmit={(e) => { e.preventDefault(); applyFilters(); }} className="space-y-3 md:space-y-0 md:flex md:space-x-3">
                                        <div className="md:w-72">
                                            <div className="relative">
                                                <Filter className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <select
                                                    value={groupBy}
                                                    onChange={handleGroupByChange}
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                >
                                                    <option value="job">{t('Job Wise (Grouped by Job Number)')}</option>
                                                    <option value="item">{t('Item Wise (Grouped by Item)')}</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="md:w-48">
                                            <div className="relative">
                                                <Calendar className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <input
                                                    type="date"
                                                    title={t('From Date')}
                                                    value={fromDate}
                                                    onChange={(e) => setFromDate(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                />
                                            </div>
                                        </div>

                                        <div className="md:w-48">
                                            <div className="relative">
                                                <Calendar className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <input
                                                    type="date"
                                                    title={t('To Date')}
                                                    value={toDate}
                                                    onChange={(e) => setToDate(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex space-x-2">
                                            <button
                                                type="button"
                                                onClick={() => applyFilters()}
                                                className="inline-flex items-center bg-vismass-blue text-white px-4 py-2 text-sm rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium"
                                            >
                                                <Filter className="mr-1.5 h-3.5 w-3.5" />
                                                {t('Filter')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setFromDate('');
                                                    setToDate('');
                                                    setGroupBy('job');
                                                    applyFilters('job', '', '');
                                                }}
                                                className="inline-flex items-center bg-gray-200 text-gray-700 px-4 py-2 text-sm rounded-lg hover:bg-gray-300 transition-all duration-200 font-medium"
                                            >
                                                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                                                {t('Clear')}
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                {/* Report Data */}
                                {reportData && reportData.items && (
                                    <div className="space-y-4">
                                        <Card>
                                            <CardHeader className="bg-gradient-to-r from-vismass-blue to-vismass-grey flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                                <CardTitle className="text-white flex items-center">
                                                    <PackageSearch className="mr-2 h-5 w-5" />
                                                    {t('Items Used')}
                                                </CardTitle>
                                                
                                                <div className="flex items-center gap-3">
                                                    <Button
                                                        onClick={() => handleExport('pdf')}
                                                        variant="outline"
                                                        size="sm"
                                                        className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                                                    >
                                                        <FileText className="mr-2 h-4 w-4" />
                                                        {t('Export PDF')}
                                                    </Button>
                                                    <Button
                                                        onClick={() => handleExport('excel')}
                                                        variant="outline"
                                                        size="sm"
                                                        className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                                                    >
                                                        <Download className="mr-2 h-4 w-4" />
                                                        {t('Export Excel')}
                                                    </Button>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="p-0">
                                                <div className="overflow-x-auto">
                                                    <Table className="min-w-[1000px]">
                                                        <TableHeader>
                                                            <TableRow>
                                                                {!isItemWise && <TableHead>{t('Date')}</TableHead>}
                                                                {!isItemWise && <TableHead>{t('Job Number')}</TableHead>}
                                                                {!isItemWise && <TableHead>{t('Customer')}</TableHead>}
                                                                <TableHead>{t('Item Code')}</TableHead>
                                                                <TableHead>{t('Item Name')}</TableHead>
                                                                <TableHead className="text-center">{t('Qty Used')}</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {reportData.items.map((item, idx) => {
                                                                const isSameJobAsPrev = !isItemWise && idx > 0 && reportData.items[idx - 1].job_id === item.job_id;
                                                                
                                                                return (
                                                                <TableRow key={idx} className={`hover:bg-gray-50 ${isSameJobAsPrev ? 'border-t-0' : 'border-t-2 border-t-gray-100'}`}>
                                                                    {!isItemWise && (
                                                                        <TableCell className="whitespace-nowrap align-top">
                                                                            {!isSameJobAsPrev && item.received_date}
                                                                        </TableCell>
                                                                    )}
                                                                    {!isItemWise && (
                                                                        <TableCell className="font-medium text-vismass-blue whitespace-nowrap align-top">
                                                                            {!isSameJobAsPrev && (
                                                                                <a href={`/service-jobs/${item.job_id}`} target="_blank" rel="noreferrer" className="hover:underline">
                                                                                    {item.job_number}
                                                                                </a>
                                                                            )}
                                                                        </TableCell>
                                                                    )}
                                                                    {!isItemWise && (
                                                                        <TableCell className="align-top">
                                                                            {!isSameJobAsPrev && item.customer_name}
                                                                        </TableCell>
                                                                    )}
                                                                    <TableCell>{item.item_code}</TableCell>
                                                                    <TableCell>
                                                                        {item.item_name}
                                                                        {item.item_type === 'service' && (
                                                                            <span className="ml-2 inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10">
                                                                                {t('Service')}
                                                                            </span>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell className="text-center font-bold text-red-600">
                                                                        {Number(item.quantity).toFixed(2)}
                                                                    </TableCell>
                                                                </TableRow>
                                                            )})}
                                                            {reportData.items.length === 0 && (
                                                                <TableRow>
                                                                    <TableCell colSpan={isItemWise ? 3 : 6} className="text-center py-8 text-gray-500">
                                                                        {t('No items found')}
                                                                    </TableCell>
                                                                </TableRow>
                                                            )}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* Summary Section */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                                            <Card className="bg-gradient-to-br from-white to-slate-50 border-slate-200">
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                                                        {t('Total Records')}
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="text-3xl font-bold text-slate-800">
                                                        {reportData.summary.total_records}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                            
                                            <Card className="bg-gradient-to-br from-white to-slate-50 border-slate-200">
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                                                        {t('Total Quantity Used')}
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="text-3xl font-bold text-red-600">
                                                        {reportData.summary.total_quantity}
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            <Card className="bg-gradient-to-br from-white to-slate-50 border-slate-200">
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                                                        {t('Total Value')}
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="text-3xl font-bold text-vismass-blue">
                                                        {formatCurrency(reportData.summary.total_amount)}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </AppSidebarLayout>
    );
}

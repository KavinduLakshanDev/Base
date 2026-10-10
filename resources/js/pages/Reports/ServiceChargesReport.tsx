import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { Head, router } from '@inertiajs/react';
import {
    Download,
    FileText,
    Loader,
    ArrowLeft,
    Filter,
    BarChart3,
    FileCode,
    RotateCcw,
    Calendar,
    RefreshCw,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import AppSidebarLayout from '@/layouts/app/app-sidebar-layout';
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

interface ProductItem {
    item_code: string;
    item_name: string;
    quantity: number;
    unit_price: number;
    total: number;
}

interface ReportItem {
    job_id: number;
    job_number: string;
    completion_date: string;
    customer_name: string;
    technician_name: string;
    service_charge: string;
    quantity: number;
    unit_price: number;
    total: number;
    status: string;
    products?: ProductItem[];
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

interface Technician {
    id: number;
    first_name: string;
    last_name: string;
}

interface Props {
    company: Company;
    filters: {
        from_date?: string;
        to_date?: string;
        section_code?: string;
        technician_id?: string;
        include_products?: boolean;
    };
    reportData?: ReportData;
    technicians?: Technician[];
}

const breadcrumbs = [
    { title: t('Dashboard'), href: '/dashboard' },
    { title: t('Service Charges Report'), href: '/reports/service-charges' },
];

export default function ServiceChargesReport({
    company,
    filters,
    reportData,
    technicians = [],
}: Props) {
    const [fromDate, setFromDate] = useState<Date | undefined>(() => {
        return filters.from_date ? new Date(filters.from_date) : undefined;
    });
    const [toDate, setToDate] = useState<Date | undefined>(() => {
        return filters.to_date ? new Date(filters.to_date) : undefined;
    });
    const [technicianId, setTechnicianId] = useState<string>(filters.technician_id || '');
    const [includeProducts, setIncludeProducts] = useState<boolean>(
        filters.include_products ?? false
    );
    const [isLoading, setIsLoading] = useState(false);
    
    const formatLocalDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
    };

    // Date range presets
    const applyDatePreset = (preset: string) => {
        const today = new Date();
        let from, to;

        switch (preset) {
            case 'today':
                from = to = new Date(today);
                break;
            case 'yesterday':
                from = to = new Date(today.setDate(today.getDate() - 1));
                break;
            case 'this_week':
                from = new Date(today.setDate(today.getDate() - today.getDay()));
                to = new Date();
                break;
            case 'last_week':
                const lastWeekEnd = new Date(today.setDate(today.getDate() - today.getDay() - 1));
                const lastWeekStart = new Date(lastWeekEnd);
                lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
                from = lastWeekStart;
                to = lastWeekEnd;
                break;
            case 'this_month':
                from = new Date(today.getFullYear(), today.getMonth(), 1);
                to = new Date();
                break;
            case 'last_month':
                from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                to = new Date(today.getFullYear(), today.getMonth(), 0);
                break;
            case 'this_quarter':
                const quarter = Math.floor(today.getMonth() / 3);
                from = new Date(today.getFullYear(), quarter * 3, 1);
                to = new Date();
                break;
            case 'this_year':
                from = new Date(today.getFullYear(), 0, 1);
                to = new Date();
                break;
            default:
                return;
        }

        setFromDate(from);
        setToDate(to);
    };

    useEffect(() => {
        if (filters.from_date) setFromDate(new Date(filters.from_date));
    }, [filters.from_date]);

    useEffect(() => {
        if (filters.to_date) setToDate(new Date(filters.to_date));
    }, [filters.to_date]);

    const handleApplyFilters = () => {
        setIsLoading(true);

        const params = new URLSearchParams();

        if (!fromDate || !toDate) {
            toast.error(t('Please select both From Date and To Date.'));
            setIsLoading(false);
            return;
        }

        if (fromDate > toDate) {
            toast.error(t('From Date cannot be after To Date.'));
            setIsLoading(false);
            return;
        }

        params.append('from_date', formatLocalDate(fromDate));
        params.append('to_date', formatLocalDate(toDate));
        if (technicianId) params.append('technician_id', technicianId);
        if (includeProducts) params.append('include_products', '1');

        const finalUrl = `/reports/service-charges?${params.toString()}`;

        router.get(finalUrl, {}, {
            preserveScroll: true,
            onFinish: () => setIsLoading(false),
            onError: (errors) => {
                console.error('Error fetching report data:', errors);
                setIsLoading(false);
            },
        });
    };

    const handleResetFilters = () => {
        setIsLoading(true);
        setFromDate(undefined);
        setToDate(undefined);
        setTechnicianId('');

        router.get('/reports/service-charges', {}, {
            preserveState: false,
            preserveScroll: false,
            onFinish: () => setIsLoading(false),
            onError: () => setIsLoading(false),
        });
    };

    const handleExport = (format: 'pdf' | 'excel') => {
        if (!fromDate || !toDate) {
            toast.error(t('Please apply filters first'));
            return;
        }

        const params = new URLSearchParams();
        params.append('from_date', fromDate.toISOString().split('T')[0]);
        params.append('to_date', toDate.toISOString().split('T')[0]);
        params.append('format', format);
        if (technicianId) params.append('technician_id', technicianId);
        if (includeProducts) params.append('include_products', '1');
        
        window.location.href = `/reports/service-charges/export?${params.toString()}`;
    };

    const formatCurrency = (amount: number) => {
        return `Rs ${new Intl.NumberFormat('en-GB', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount)}`;
    };

    return (
        <AppSidebarLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Service Charges Report')} />
            
            <div className="min-h-screen bg-slate-50">
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-center space-x-3">
                                <button
                                    onClick={() => window.history.back()}
                                    className="shrink-0 rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                    title="Go Back"
                                >
                                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                </button>
                                <div className="shrink-0 rounded-lg bg-white/20 p-2 shadow">
                                    <FileCode className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="truncate text-lg sm:text-xl font-bold text-white">
                                        {t('Service Charges Report')}
                                    </h1>
                                    <p className="hidden text-xs text-white/80 sm:block">
                                        {t('Detailed report of service charges by job')}
                                    </p>
                                </div>
                            </div>
                            {/* <Button
                                onClick={() => router.visit('/dashboard')}
                                className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                {t('Back to Dashboard')}
                            </Button> */}
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        <div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 sm:px-6 py-4">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">{t('Service Charges Report')}</h3>
                                    </div>
                                    <div className="text-white/80 text-sm whitespace-nowrap">{t('Generated on')}: {new Date().toLocaleDateString()}</div>
                                </div>
                            </div>

                            <div className="p-4 sm:p-6">
                {/* Filters Section */}
                <div className="bg-slate-50 p-3 rounded-lg mb-4 border border-slate-200 no-print">
                    {/* Date Range Presets */}
                    <div className="mb-3 flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => applyDatePreset('today')} className="h-7 text-xs bg-white">{t('Today')}</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => applyDatePreset('yesterday')} className="h-7 text-xs bg-white">{t('Yesterday')}</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => applyDatePreset('this_week')} className="h-7 text-xs bg-white">{t('This Week')}</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => applyDatePreset('last_week')} className="h-7 text-xs bg-white">{t('Last Week')}</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => applyDatePreset('this_month')} className="h-7 text-xs bg-white">{t('This Month')}</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => applyDatePreset('last_month')} className="h-7 text-xs bg-white">{t('Last Month')}</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => applyDatePreset('this_quarter')} className="h-7 text-xs bg-white">{t('This Qtr')}</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => applyDatePreset('this_year')} className="h-7 text-xs bg-white">{t('This Year')}</Button>
                    </div>
                    <form onSubmit={(e) => { e.preventDefault(); handleApplyFilters(); }} className="flex flex-col lg:flex-row lg:flex-wrap gap-3">
                        <div className="w-full lg:w-48 shrink-0">
                            <div className="relative">
                                <Calendar className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="date"
                                    title={t('From Date')}
                                    value={fromDate ? format(fromDate, 'yyyy-MM-dd') : ''}
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            const [y, m, d] = e.target.value.split('-');
                                            setFromDate(new Date(parseInt(y), parseInt(m) - 1, parseInt(d)));
                                        } else {
                                            setFromDate(undefined);
                                        }
                                    }}
                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                />
                            </div>
                        </div>

                        <div className="w-full lg:w-48 shrink-0">
                            <div className="relative">
                                <Calendar className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="date"
                                    title={t('To Date')}
                                    value={toDate ? format(toDate, 'yyyy-MM-dd') : ''}
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            const [y, m, d] = e.target.value.split('-');
                                            setToDate(new Date(parseInt(y), parseInt(m) - 1, parseInt(d)));
                                        } else {
                                            setToDate(undefined);
                                        }
                                    }}
                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                />
                            </div>
                        </div>

                        <div className="w-full lg:w-56 shrink-0">
                            <select
                                id="technician"
                                title={t('Technician')}
                                value={technicianId}
                                onChange={(e) => setTechnicianId(e.target.value)}
                                className="w-full h-[38px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue focus:ring-2 transition"
                            >
                                <option value="">{t('All Technicians')}</option>
                                {technicians.map((tech) => (
                                    <option key={tech.id} value={tech.id}>
                                        {tech.first_name} {tech.last_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center shrink-0 h-[38px] px-2">
                            <input
                                type="checkbox"
                                id="include_products"
                                checked={includeProducts}
                                onChange={(e) => setIncludeProducts(e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-vismass-blue focus:ring-vismass-blue cursor-pointer"
                            />
                            <Label htmlFor="include_products" className="ml-2 cursor-pointer text-sm font-medium text-slate-700">
                                {t('Include Products')}
                            </Label>
                        </div>

                        <div className="flex space-x-2 w-full lg:w-auto">
                            <button
                                type="button"
                                onClick={handleApplyFilters}
                                disabled={isLoading}
                                className="inline-flex items-center justify-center flex-1 lg:flex-none bg-vismass-blue text-white px-4 h-[38px] text-sm rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium disabled:opacity-70"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                        {t('Loading...')}
                                    </>
                                ) : (
                                    <>
                                        <Filter className="mr-1.5 h-3.5 w-3.5" />
                                        {t('Filter')}
                                    </>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={handleResetFilters}
                                disabled={isLoading}
                                className="inline-flex items-center justify-center flex-1 lg:flex-none bg-gray-200 text-gray-700 px-4 h-[38px] text-sm rounded-lg hover:bg-gray-300 transition-all duration-200 font-medium disabled:opacity-70"
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
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-gradient-to-r from-vismass-blue to-vismass-grey p-4 rounded-xl shadow-sm gap-4">
                            <h3 className="text-white font-semibold flex items-center text-lg">
                                <BarChart3 className="mr-2 h-5 w-5" />
                                {t('Service Charges Data')}
                            </h3>
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
                        </div>

                        <Card>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <Table className="min-w-[980px]">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('#')}</TableHead>
                                                <TableHead>{t('Date')}</TableHead>
                                                <TableHead>{t('Job Number')}</TableHead>
                                                <TableHead>{t('Customer')}</TableHead>
                                                <TableHead>{t('Technician')}</TableHead>
                                                <TableHead>{t('Service Name')}</TableHead>
                                                <TableHead className="text-center">{t('Status')}</TableHead>
                                                {includeProducts ? (
                                                    <>
                                                        <TableHead className="text-right">{t('Service Price')}</TableHead>
                                                        <TableHead>{t('Products Used')}</TableHead>
                                                        <TableHead className="text-right bg-slate-50">{t('Job Total')}</TableHead>
                                                    </>
                                                ) : (
                                                    <TableHead className="text-right">{t('Total')}</TableHead>
                                                )}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {reportData.items.map((item, idx) => {
                                                const productTotal = item.products
                                                    ? item.products.reduce((sum, p) => sum + p.total, 0)
                                                    : 0;
                                                const jobTotal = item.total + productTotal;
                                                return (
                                                <TableRow key={idx} className="hover:bg-gray-50 align-top">
                                                    <TableCell>{idx + 1}</TableCell>
                                                    <TableCell>{item.completion_date}</TableCell>
                                                    <TableCell className="font-medium text-vismass-blue">
                                                        <a href={`/service-jobs/${item.job_id}`} target="_blank" rel="noreferrer" className="hover:underline">
                                                            {item.job_number}
                                                        </a>
                                                    </TableCell>
                                                    <TableCell>{item.customer_name}</TableCell>
                                                    <TableCell>{item.technician_name}</TableCell>
                                                    <TableCell>{item.service_charge}</TableCell>
                                                    <TableCell className="text-center">
                                                        <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                                                            {item.status.replace('_', ' ')}
                                                        </span>
                                                    </TableCell>
                                                    {includeProducts ? (
                                                        <>
                                                            {/* Service Price */}
                                                            <TableCell className="text-right font-semibold text-blue-700">
                                                                {(item.total).toFixed(2)}
                                                            </TableCell>
                                                            {/* Products Used */}
                                                            <TableCell>
                                                                {item.products && item.products.length > 0 ? (
                                                                    <div className="flex flex-col gap-2 min-w-[250px]">
                                                                        {item.products.map((p, pIdx) => (
                                                                            <div key={pIdx} className="flex justify-between items-start text-sm border-b border-slate-100 pb-1.5 last:border-0 last:pb-0">
                                                                                <div className="flex flex-col">
                                                                                    <span className="font-medium text-slate-800">{p.item_name}</span>
                                                                                    <span className="text-xs text-slate-500">Qty: {(p.quantity).toFixed(2)}</span>
                                                                                </div>
                                                                                <div className="font-medium text-slate-700 whitespace-nowrap ml-4 mt-0.5">
                                                                                    {formatCurrency(p.total)}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-xs text-slate-400 italic">{t('No products')}</span>
                                                                )}
                                                            </TableCell>
                                                            {/* Job Total */}
                                                            <TableCell className="text-right font-bold text-green-700 bg-slate-50">
                                                                {(jobTotal).toFixed(2)}
                                                            </TableCell>
                                                        </>
                                                    ) : (
                                                        <TableCell className="text-right font-semibold">
                                                            {(item.total).toFixed(2)}
                                                        </TableCell>
                                                    )}
                                                </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-gray-600">
                                        {t('Total Records')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {reportData.summary.total_records}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-gray-600">
                                        {t('Total Amount')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-green-600">
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

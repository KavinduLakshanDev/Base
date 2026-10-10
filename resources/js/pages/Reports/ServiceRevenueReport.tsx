import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { Head, router } from '@inertiajs/react';
import {
    DollarSign,
    Download,
    FileText,
    Loader,
    TrendingUp,
    Wrench,
    ArrowLeft,
    Filter,
    Users,
    User,
    BarChart3,
    RotateCcw,
    Calendar,
    RefreshCw,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
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

interface Technician {
    id: number;
    first_name: string;
    last_name: string;
}

interface Customer {
    AccKy: number;
    AccNm: string;
    AccCd: string;
}

interface RevenueSummary {
    total_revenue: number;
    total_parts_revenue: number;
    total_service_revenue: number;
    total_vat_collected: number;
    total_jobs_count: number;
    average_job_value: number;
    parts_percentage: number;
    service_percentage: number;
    total_profit: number;
    profit_margin: number;
    previous_revenue: number;
    revenue_change: number;
    previous_jobs_count: number;
    jobs_change: number;
}

interface TechnicianRevenue {
    technician_id: number | null;
    technician_name: string;
    jobs_count: number;
    total_revenue: number;
    parts_revenue: number;
    service_revenue: number;
    vat_collected: number;
    total_profit: number;
    avg_job_value: number;
    profit_margin: number;
}

interface CustomerRevenue {
    customer_id: number | null;
    customer_name: string;
    jobs_count: number;
    total_revenue: number;
    parts_revenue: number;
    service_revenue: number;
    vat_collected: number;
    total_profit: number;
    avg_job_value: number;
    profit_margin: number;
}

interface JobDetail {
    job_number: string;
    job_id: number;
    customer_name: string;
    technician_name: string;
    completion_date: string;
    total_revenue: number;
    parts_revenue: number;
    service_revenue: number;
    vat_collected: number;
    is_vat_invoice: boolean;
}

interface GroupedData {
    period: string;
    display_period: string;
    jobs_count: number;
    total_revenue: number;
    parts_revenue: number;
    service_revenue: number;
    vat_collected: number;
    jobs: JobDetail[];
}

interface RevenueData {
    summary: RevenueSummary;
    revenue_by_technician: TechnicianRevenue[];
    revenue_by_customer: CustomerRevenue[];
    grouped_data: GroupedData[];
    from_date: string;
    to_date: string;
    comparison_period: {
        from: string;
        to: string;
    };
}

interface Props {
    company: Company;
    filters: {
        from_date?: string;
        to_date?: string;
        section_code?: string;
        technician_id?: string;
        customer_id?: string;
        vat_filter?: 'all' | 'vat' | 'non_vat';
        group_by?: 'daily' | 'weekly' | 'monthly';
    };
    revenueData?: RevenueData;
    technicians: Technician[];
    customers: Customer[];
}

const breadcrumbs = [
    { title: t('Dashboard'), href: '/dashboard' },
    // { title: t('Reports'), href: '#' },
    { title: t('Service Revenue Report'), href: '/reports/service-revenue' },
];

export default function ServiceRevenueReport({
    company,
    filters,
    revenueData,
    technicians,
    customers,
}: Props) {
    const [fromDate, setFromDate] = useState<Date | undefined>(() => {
        return filters.from_date ? new Date(filters.from_date) : undefined;
    });
    const [toDate, setToDate] = useState<Date | undefined>(() => {
        return filters.to_date ? new Date(filters.to_date) : undefined;
    });
    const formatLocalDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    const [technicianId, setTechnicianId] = useState<string>(filters.technician_id || 'all');
    const [customerId, setCustomerId] = useState<string>(filters.customer_id || 'all');
    const [vatFilter, setVatFilter] = useState<'all' | 'vat' | 'non_vat'>(filters.vat_filter || 'all');
    const [groupBy, setGroupBy] = useState<'daily' | 'weekly' | 'monthly'>(filters.group_by || 'daily');
    const [isLoading, setIsLoading] = useState(false);
    const [expandedPeriods, setExpandedPeriods] = useState<Set<string>>(new Set());
    const [customerSearch, setCustomerSearch] = useState('');

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

    const filteredCustomers = customers.filter(cust =>
        cust.AccNm.toLowerCase().includes(customerSearch.toLowerCase()) ||
        cust.AccCd.toLowerCase().includes(customerSearch.toLowerCase())
    );

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
        params.append('group_by', groupBy);
        params.append('vat_filter', vatFilter);

        if (technicianId && technicianId !== 'all') {
            params.append('technician_id', technicianId);
        }

        if (customerId && customerId !== 'all') {
            params.append('customer_id', customerId);
        }

        const finalUrl = `/reports/service-revenue?${params.toString()}`;

        router.get(finalUrl, {}, {
            preserveScroll: true,
            onFinish: () => setIsLoading(false),
            onError: (errors) => {
                console.error('Error fetching revenue data:', errors);
                setIsLoading(false);
            },
        });
    };

    const handleResetFilters = () => {
        setIsLoading(true);
        setFromDate(undefined);
        setToDate(undefined);
        setTechnicianId('all');
        setCustomerId('all');
        setVatFilter('all');
        setGroupBy('daily');

        router.get('/reports/service-revenue', {}, {
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
        params.append('group_by', groupBy);
        params.append('vat_filter', vatFilter);
        params.append('format', format);

        if (technicianId && technicianId !== 'all') {
            params.append('technician_id', technicianId);
        }

        if (customerId && customerId !== 'all') {
            params.append('customer_id', customerId);
        }

        window.location.href = `/reports/service-revenue/export?${params.toString()}`;
    };

    const formatCurrency = (amount: number) => {
        return `Rs ${new Intl.NumberFormat('en-GB', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount)}`;
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const togglePeriod = (period: string) => {
        setExpandedPeriods(prev => {
            const next = new Set(prev);
            if (next.has(period)) {
                next.delete(period);
            } else {
                next.add(period);
            }
            return next;
        });
    };

    return (
        <AppSidebarLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Service Revenue Report')} />

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
                                    <DollarSign className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="truncate text-lg sm:text-xl font-bold text-white">
                                        {t('Service Revenue Summary Report')}
                                    </h1>
                                    <p className="hidden text-xs text-white/80 sm:block">
                                        {t('Track revenue from service operations')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        <div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 sm:px-6 py-4">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">{t('Service Revenue Summary Report')}</h3>
                                        <p className="text-white/80 text-sm mt-1">{t('Revenue performance by period, technician, and customer')}</p>
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

                                        <div className="w-full lg:w-40 shrink-0">
                                            <Select value={groupBy} onValueChange={(value: any) => setGroupBy(value)}>
                                                <SelectTrigger className="w-full h-[38px] text-sm border-gray-300 focus:ring-2 focus:ring-vismass-blue rounded-lg bg-white">
                                                    <SelectValue placeholder={t('Group By')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="daily">{t('Daily')}</SelectItem>
                                                    <SelectItem value="weekly">{t('Weekly')}</SelectItem>
                                                    <SelectItem value="monthly">{t('Monthly')}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="w-full lg:w-48 shrink-0">
                                            <Select value={technicianId} onValueChange={setTechnicianId}>
                                                <SelectTrigger className="w-full h-[38px] text-sm border-gray-300 focus:ring-2 focus:ring-vismass-blue rounded-lg bg-white">
                                                    <SelectValue placeholder={t('All Technicians')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">{t('All Technicians')}</SelectItem>
                                                    {technicians.map((tech) => (
                                                        <SelectItem key={tech.id} value={tech.id.toString()}>
                                                            {tech.first_name} {tech.last_name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="w-full lg:w-56 shrink-0">
                                            <Select value={customerId} onValueChange={setCustomerId}>
                                                <SelectTrigger className="w-full h-[38px] text-sm border-gray-300 focus:ring-2 focus:ring-vismass-blue rounded-lg bg-white">
                                                    <SelectValue placeholder={t('All Customers')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <div className="p-2">
                                                        <Input
                                                            placeholder={t('Search customers...')}
                                                            value={customerSearch}
                                                            onChange={(e) => setCustomerSearch(e.target.value)}
                                                            className="mb-2"
                                                        />
                                                    </div>
                                                    <SelectItem value="all">{t('All Customers')}</SelectItem>
                                                    {filteredCustomers.slice(0, 50).map((cust) => (
                                                        <SelectItem key={cust.AccKy} value={cust.AccKy.toString()}>
                                                            {cust.AccNm} ({cust.AccCd})
                                                        </SelectItem>
                                                    ))}
                                                    {filteredCustomers.length > 50 && (
                                                        <div className="p-2 text-xs text-gray-500 text-center">
                                                            {t('Showing')} 50 {t('of')} {filteredCustomers.length} {t('customers')}. {t('Use search to find more.')}
                                                        </div>
                                                    )}
                                                </SelectContent>
                                            </Select>
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

                                {/* Revenue Data */}
                                {revenueData && (
                                    <div className="space-y-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-gradient-to-r from-vismass-blue to-vismass-grey p-4 rounded-xl shadow-sm gap-4">
                                            <h3 className="text-white font-semibold flex items-center text-lg">
                                                <DollarSign className="mr-2 h-5 w-5" />
                                                {t('Revenue Details')}
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

                                        {/* Summary Cards */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <Card>
                                                <CardHeader className="pb-3">
                                                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                                                        <DollarSign className="h-4 w-4 mr-2 text-green-600" />
                                                        {t('Total Revenue')}
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="text-2xl font-bold text-green-600">
                                                        {formatCurrency(revenueData.summary.total_revenue)}
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {revenueData.summary.total_jobs_count} {t('jobs completed')}
                                                        {revenueData.summary.jobs_change !== 0 && (
                                                            <span className={`ml-2 font-semibold ${revenueData.summary.jobs_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                ({revenueData.summary.jobs_change > 0 ? '+' : ''}{revenueData.summary.jobs_change.toFixed(1)}%)
                                                            </span>
                                                        )}
                                                    </p>
                                                    {revenueData.summary.revenue_change !== 0 && (
                                                        <p className={`text-xs font-semibold mt-1 ${revenueData.summary.revenue_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            <TrendingUp className="h-3 w-3 inline mr-1" />
                                                            {revenueData.summary.revenue_change > 0 ? '+' : ''}{revenueData.summary.revenue_change.toFixed(1)}% {t('vs previous period')}
                                                        </p>
                                                    )}
                                                </CardContent>
                                            </Card>

                                            <Card className="border-l-4 border-l-emerald-500">
                                                <CardHeader className="pb-3">
                                                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                                                        <TrendingUp className="h-4 w-4 mr-2 text-emerald-600" />
                                                        {t('Total Profit')}
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="text-2xl font-bold text-emerald-600">
                                                        {formatCurrency(revenueData.summary.total_profit)}
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {t('Profit Margin')}: <span className="font-semibold">{revenueData.summary.profit_margin.toFixed(1)}%</span>
                                                    </p>
                                                </CardContent>
                                            </Card>

                                            <Card>
                                                <CardHeader className="pb-3">
                                                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                                                        <Wrench className="h-4 w-4 mr-2 text-blue-600" />
                                                        {t('Parts Revenue')}
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="text-2xl font-bold text-blue-600">
                                                        {formatCurrency(revenueData.summary.total_parts_revenue)}
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {revenueData.summary.parts_percentage.toFixed(1)}% {t('of total')}
                                                    </p>
                                                </CardContent>
                                            </Card>

                                            <Card>
                                                <CardHeader className="pb-3">
                                                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                                                        <Users className="h-4 w-4 mr-2 text-purple-600" />
                                                        {t('Service Charges')}
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="text-2xl font-bold text-purple-600">
                                                        {formatCurrency(revenueData.summary.total_service_revenue)}
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {revenueData.summary.service_percentage.toFixed(1)}% {t('of total')}
                                                    </p>
                                                </CardContent>
                                            </Card>

                                            <Card>
                                                <CardContent>
                                                    <div className="text-2xl font-bold text-orange-600">
                                                        {formatCurrency(revenueData.summary.total_vat_collected)}
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {t('Avg Job')}: {formatCurrency(revenueData.summary.average_job_value)}
                                                    </p>
                                                </CardContent>
                                            </Card>
                                        </div>

                                        {/* Revenue by Period */}
                                        <Card>
                                            <CardHeader className="bg-gradient-to-r from-vismass-blue to-vismass-grey">
                                                <CardTitle className="text-white flex items-center">
                                                    <BarChart3 className="mr-2 h-5 w-5" />
                                                    {t('Revenue by Period')}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-0">
                                                <div className="overflow-x-auto">
                                                    <Table className="min-w-[980px]">
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>{t('Period')}</TableHead>
                                                                <TableHead className="text-right">{t('Jobs')}</TableHead>
                                                                <TableHead className="text-right">{t('Total Revenue')}</TableHead>
                                                                <TableHead className="text-right">{t('Parts')}</TableHead>
                                                                <TableHead className="text-right">{t('Service')}</TableHead>
                                                                {/* <TableHead className="text-right">{t('VAT')}</TableHead> */}
                                                                <TableHead className="text-center">{t('Details')}</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {revenueData.grouped_data.map((group) => (
                                                                <React.Fragment key={group.period}>
                                                                    <TableRow className="hover:bg-gray-50">
                                                                        <TableCell className="font-medium">{group.display_period}</TableCell>
                                                                        <TableCell className="text-right">{group.jobs_count}</TableCell>
                                                                        <TableCell className="text-right font-semibold text-green-600">
                                                                            {formatCurrency(group.total_revenue)}
                                                                        </TableCell>
                                                                        <TableCell className="text-right">{formatCurrency(group.parts_revenue)}</TableCell>
                                                                        <TableCell className="text-right">{formatCurrency(group.service_revenue)}</TableCell>
                                                                        {/* <TableCell className="text-right">{formatCurrency(group.vat_collected)}</TableCell> */}
                                                                        <TableCell className="text-center">
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                onClick={() => togglePeriod(group.period)}
                                                                                className={expandedPeriods.has(group.period) ? "text-red-600 hover:text-red-700 hover:bg-red-50" : "text-vismass-blue hover:text-blue-700 hover:bg-blue-50"}
                                                                            >
                                                                                {expandedPeriods.has(group.period) ? t('Hide') : t('Show')}
                                                                            </Button>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                    {expandedPeriods.has(group.period) && group.jobs.map((job) => (
                                                                        <TableRow key={job.job_id} className="bg-gray-50">
                                                                            <TableCell className="pl-8 text-sm text-gray-600">
                                                                                {job.job_number}
                                                                                <br />
                                                                                <span className="text-xs">{job.customer_name}</span>
                                                                            </TableCell>
                                                                            <TableCell className="text-right text-sm">
                                                                                {job.technician_name}
                                                                            </TableCell>
                                                                            <TableCell className="text-right font-medium text-sm">
                                                                                {formatCurrency(job.total_revenue)}
                                                                            </TableCell>
                                                                            <TableCell className="text-right text-sm">
                                                                                {formatCurrency(job.parts_revenue)}
                                                                            </TableCell>
                                                                            <TableCell className="text-right text-sm">
                                                                                {formatCurrency(job.service_revenue)}
                                                                            </TableCell>
                                                                            <TableCell className="text-right text-sm">
                                                                                {formatCurrency(job.vat_collected)}
                                                                            </TableCell>
                                                                            <TableCell className="text-center text-xs">
                                                                                {job.is_vat_invoice && (
                                                                                    <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded">
                                                                                        VAT
                                                                                    </span>
                                                                                )}
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </React.Fragment>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* Revenue by Technician */}
                                        <Card>
                                            <CardHeader className="bg-gradient-to-r from-vismass-blue to-vismass-grey">
                                                <CardTitle className="text-white flex items-center">
                                                    <Users className="mr-2 h-5 w-5" />
                                                    {t('Revenue by Technician')}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-0">
                                                <div className="overflow-x-auto">
                                                    <Table className="min-w-[980px]">
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>{t('Technician')}</TableHead>
                                                                <TableHead className="text-right">{t('Jobs')}</TableHead>
                                                                <TableHead className="text-right">{t('Total Revenue')}</TableHead>
                                                                <TableHead className="text-right">{t('Total Profit')}</TableHead>
                                                                <TableHead className="text-right">{t('Profit %')}</TableHead>
                                                                <TableHead className="text-right">{t('Avg Job Value')}</TableHead>
                                                                <TableHead className="text-right">{t('Parts')}</TableHead>
                                                                <TableHead className="text-right">{t('Service')}</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {revenueData.revenue_by_technician.map((tech, index) => (
                                                                <TableRow key={index} className="hover:bg-gray-50">
                                                                    <TableCell className="font-medium">{tech.technician_name}</TableCell>
                                                                    <TableCell className="text-right">{tech.jobs_count}</TableCell>
                                                                    <TableCell className="text-right font-semibold text-green-600">
                                                                        {formatCurrency(tech.total_revenue)}
                                                                    </TableCell>
                                                                    <TableCell className="text-right font-semibold text-emerald-600">
                                                                        {formatCurrency(tech.total_profit)}
                                                                    </TableCell>
                                                                    <TableCell className="text-right">
                                                                        <span className={`px-2 py-1 rounded text-xs ${tech.profit_margin >= 20 ? 'bg-green-100 text-green-700' : tech.profit_margin >= 10 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                                                            {tech.profit_margin.toFixed(1)}%
                                                                        </span>
                                                                    </TableCell>
                                                                    <TableCell className="text-right">{formatCurrency(tech.avg_job_value)}</TableCell>
                                                                    <TableCell className="text-right">{formatCurrency(tech.parts_revenue)}</TableCell>
                                                                    <TableCell className="text-right">{formatCurrency(tech.service_revenue)}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* Revenue by Customer */}
                                        <Card>
                                            <CardHeader className="bg-gradient-to-r from-vismass-blue to-vismass-grey">
                                                <CardTitle className="text-white flex items-center">
                                                    <User className="mr-2 h-5 w-5" />
                                                    {t('Revenue by Customer (Top 20)')}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-0">
                                                <div className="overflow-x-auto">
                                                    <Table className="min-w-[980px]">
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>{t('Customer')}</TableHead>
                                                                <TableHead className="text-right">{t('Jobs')}</TableHead>
                                                                <TableHead className="text-right">{t('Total Revenue')}</TableHead>
                                                                <TableHead className="text-right">{t('Total Profit')}</TableHead>
                                                                <TableHead className="text-right">{t('Profit %')}</TableHead>
                                                                <TableHead className="text-right">{t('Avg Job Value')}</TableHead>
                                                                <TableHead className="text-right">{t('Parts')}</TableHead>
                                                                <TableHead className="text-right">{t('Service')}</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {revenueData.revenue_by_customer.slice(0, 20).map((cust, index) => (
                                                                <TableRow key={index} className="hover:bg-gray-50">
                                                                    <TableCell className="font-medium">{cust.customer_name}</TableCell>
                                                                    <TableCell className="text-right">{cust.jobs_count}</TableCell>
                                                                    <TableCell className="text-right font-semibold text-green-600">
                                                                        {formatCurrency(cust.total_revenue)}
                                                                    </TableCell>
                                                                    <TableCell className="text-right font-semibold text-emerald-600">
                                                                        {formatCurrency(cust.total_profit)}
                                                                    </TableCell>
                                                                    <TableCell className="text-right">
                                                                        <span className={`px-2 py-1 rounded text-xs ${cust.profit_margin >= 20 ? 'bg-green-100 text-green-700' : cust.profit_margin >= 10 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                                                            {cust.profit_margin.toFixed(1)}%
                                                                        </span>
                                                                    </TableCell>
                                                                    <TableCell className="text-right">{formatCurrency(cust.avg_job_value)}</TableCell>
                                                                    <TableCell className="text-right">{formatCurrency(cust.parts_revenue)}</TableCell>
                                                                    <TableCell className="text-right">{formatCurrency(cust.service_revenue)}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                )}

                                {/* No Data Message */}
                                {!revenueData && !isLoading && (
                                    <Card>
                                        <CardContent className="py-12">
                                            <div className="text-center text-gray-500">
                                                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                                <p className="text-lg font-medium">{t('No data available')}</p>
                                                <p className="text-sm mt-2">{t('Please select a date range and apply filters to generate the report.')}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </AppSidebarLayout>
    );
}

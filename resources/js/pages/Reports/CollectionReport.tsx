import React, { useState} from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Printer,
    Filter,
    Calendar,
    DollarSign,
    Users,
    RotateCcw,
    CreditCard,
    TrendingUp,
    BarChart3,
    ArrowLeft,
    Wallet,
    Banknote,
    Building2,
    CreditCard as CreditCardIcon,
    Wrench,
    ShoppingCart,
    Truck,
    ChevronDown,
    Check,
} from 'lucide-react';
import { 
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
    Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

interface Payment {
    id: number | string;
    customer_id: number | null;
    customer_code: string;
    amount: number;
    date: string;
    method: string;
    reference?: string;
    notes?: string;
    source_type: 'service' | 'sales' | 'delivery' | 'supplier';
    customer: {
        AdrKy: number;
        FstNm: string;
        AdrCd: string;
    };
    serviceJob?: {
        job_number: string;
        device_serial: string;
        technician_name?: string;
        technician?: {
            first_name: string;
            last_name: string;
        };
    };
    salesTransaction?: any;
    delivery?: any;
}

interface CollectionReportProps {
    payments: Payment[];
    customers: Array<{
        AdrKy: number;
        FstNm: string;
        AdrCd: string;
        company_code?: string;
        section_code?: string;
    }>;
    technicians?: Array<{
        id: number;
        name: string;
    }>;
    companies?: Array<{
        id: number;
        name: string;
        company_code: string;
    }>;
    sections?: Array<{
        id: number;
        name: string;
        section_code: string;
        company_code?: string;
    }>;
    paymentMethods: string[];
    filters: {
        start_date: string;
        end_date: string;
        customer_id?: string;
        payment_method?: string;
        payment_source?: string;
        technician_id?: string;
        serial_number?: string;
        job_number?: string;
        report_type?: string;
        company_code?: string;
        section_code?: string;
    };
    summary: {
        total_amount: number;
        total_payments: number;
        average_payment: number;
        payment_methods: {
            cash: number;
            cheque: number;
            bank: number;
            card: number;
            credit: number;
        };
        payment_sources: {
            service: number;
            sales: number;
            delivery: number;
            supplier: number;
        };
        top_customers_count: number;
        top_customers: Array<{
            name: string;
            code: string;
            total: number;
            count: number;
        }>;
        technician_performance?: Array<{
            name: string;
            total: number;
            count: number;
        }>;
    };
    chartData?: Array<{
        date: string;
        full_date: string;
        total: number;
        cash: number;
        cheque: number;
        bank: number;
        card: number;
        credit: number;
        count: number;
    }>;
    customerSummary?: {
        name: string;
        code: string;
        phone: string;
        email: string;
        total_paid: number;
        total_outstanding: number;
        job_count: number;
        last_payment?: string;
    };
}

const PAYMENT_METHOD_COLORS: Record<string, string> = {
    cash: '#10B981',
    cheque: '#3B82F6',
    bank: '#8B5CF6',
    card: '#F59E0B',
    credit: '#EF4444'
};

const PAYMENT_METHOD_ICONS: Record<string, React.ReactNode> = {
    cash: <Wallet className="h-5 w-5" />,
    cheque: <Banknote className="h-5 w-5" />,
    bank: <Building2 className="h-5 w-5" />,
    card: <CreditCardIcon className="h-5 w-5" />,
    credit: <CreditCard className="h-5 w-5" />,
};

const PAYMENT_SOURCE_COLORS: Record<string, string> = {
    service: '#0EA5E9',
    sales: '#8B5CF6',
    delivery: '#F59E0B',
    supplier: '#EF4444',
};

const PAYMENT_SOURCE_ICONS: Record<string, React.ReactNode> = {
    service: <Wrench className="h-5 w-5" />,
    sales: <ShoppingCart className="h-5 w-5" />,
    delivery: <Truck className="h-5 w-5" />,
    supplier: <Building2 className="h-5 w-5" />,
};

export default function CollectionReport({
    payments,
    customers,
    technicians,
    companies,
    sections,
    paymentMethods,
    filters,
    summary,
    chartData,
    customerSummary,
}: CollectionReportProps) {
    const [localFilters, setLocalFilters] = useState({
        start_date: filters.start_date || new Date().toISOString().split('T')[0].replace(/\d{2}$/, '01'),
        end_date: filters.end_date || new Date().toISOString().split('T')[0],
        customer_id: filters.customer_id || 'all',
        payment_method: filters.payment_method || 'all',
        payment_source: filters.payment_source || 'all',
        technician_id: filters.technician_id || 'all',
        serial_number: filters.serial_number || '',
        job_number: filters.job_number || '',
        report_type: filters.report_type || 'daily',
        company_code: filters.company_code || 'all',
        section_code: filters.section_code || 'all',
    });

    const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);

    const handleFilterChange = (key: string, value: string) => {
        setLocalFilters(prev => ({ ...prev, [key]: value }));
        
        // Auto-apply filters when company or section changes to reload dropdowns
        if (key === 'company_code' || key === 'section_code') {
            const newFilters = { ...localFilters, [key]: value };
            
            // Reset dependent filters
            if (key === 'company_code') {
                newFilters.section_code = 'all';
                newFilters.customer_id = 'all';
            } else if (key === 'section_code') {
                newFilters.customer_id = 'all';
            }
            
            // Sanitize filters
            const sanitizedFilters = { ...newFilters };
            if (sanitizedFilters.customer_id === 'all') sanitizedFilters.customer_id = '';
            if (sanitizedFilters.payment_method === 'all') sanitizedFilters.payment_method = '';
            if (sanitizedFilters.payment_source === 'all') sanitizedFilters.payment_source = '';
            if (sanitizedFilters.technician_id === 'all') sanitizedFilters.technician_id = '';
            if (sanitizedFilters.company_code === 'all') sanitizedFilters.company_code = '';
            if (sanitizedFilters.section_code === 'all') sanitizedFilters.section_code = '';
            
            // Apply immediately
            router.get('/reports/collection-report', sanitizedFilters, {
                preserveState: true,
                replace: true,
                preserveScroll: true,
            });
        }
    };

    const applyFilters = () => {
        const sanitizedFilters = { ...localFilters };
        if (sanitizedFilters.customer_id === 'all') sanitizedFilters.customer_id = '';
        if (sanitizedFilters.payment_method === 'all') sanitizedFilters.payment_method = '';
        if (sanitizedFilters.payment_source === 'all') sanitizedFilters.payment_source = '';
        if (sanitizedFilters.technician_id === 'all') sanitizedFilters.technician_id = '';
        if (sanitizedFilters.company_code === 'all') sanitizedFilters.company_code = '';
        if (sanitizedFilters.section_code === 'all') sanitizedFilters.section_code = '';

        router.get('/reports/collection-report', sanitizedFilters, {
            preserveState: true,
            replace: true
        });
    };

    const resetFilters = () => {
        const defaultFilters = {
            start_date: new Date().toISOString().split('T')[0].replace(/\d{2}$/, '01'),
            end_date: new Date().toISOString().split('T')[0],
            customer_id: 'all',
            payment_method: 'all',
            payment_source: 'all',
            technician_id: 'all',
            serial_number: '',
            job_number: '',
            report_type: 'daily',
            company_code: 'all',
            section_code: 'all',
        };
        setLocalFilters(defaultFilters);

        const resetQuery = { 
            start_date: defaultFilters.start_date, 
            end_date: defaultFilters.end_date,
            report_type: defaultFilters.report_type 
        };
        router.get('/reports/collection-report', resetQuery, {
            preserveState: true,
            replace: true
        });
    };

    const formatCurrency = (amount: number) => {
        return `Rs ${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const parseLocalDate = (isoDate: string) => {
        const [year, month, day] = isoDate.split('-').map(Number);
        return new Date(year, month - 1, day);
    };

    const formatLocalDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Prepare pie chart data for payment methods
    const pieChartData = Object.entries(summary.payment_methods)
        .filter(([_, value]) => value > 0)
        .map(([method, value]) => ({
            name: method.charAt(0).toUpperCase() + method.slice(1),
            value: value,
            color: PAYMENT_METHOD_COLORS[method] || '#6B7280'
        }));

    // Filter sections based on selected company
    const filteredSections = sections?.filter(s => {
        if (localFilters.company_code === 'all') return true;
        return s.company_code === localFilters.company_code;
    }) || [];

    // Filter customers based on selected company and section
    const filteredCustomers = customers?.filter(c => {
        if (localFilters.company_code !== 'all' && c.company_code !== localFilters.company_code) return false;
        if (localFilters.section_code !== 'all' && c.section_code !== localFilters.section_code) return false;
        return true;
    }) || [];

    // Use payments directly - backend already filters correctly
    const filteredData = payments;

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Dashboard', href: '/dashboard' },
                // { title: 'Reports', href: '/reports' },
                { title: 'Collection Report', href: '/reports/collection-report' }
            ]}
        >
            <Head title="Collection Report">
                <style>{`
                    .print-only {
                        display: none;
                    }
                    
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
                        
                        .print-only {
                            display: block !important;
                        }
                        
                        #printable-collection,
                        #printable-collection * {
                            visibility: visible !important;
                        }
                        
                        #printable-collection {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            height: auto !important;
                            overflow: visible !important;
                        }
                        
                        .print-header {
                            margin-bottom: 10px;
                            border-bottom: 2px solid #000;
                            padding-bottom: 6px;
                            display: none;
                        }

                        .print-logo-compact {
                            display: block !important;
                            visibility: visible !important;
                            height: 48px !important;
                            width: auto !important;
                            max-height: 48px !important;
                            margin: 0 auto 4px auto !important;
                            object-fit: contain !important;
                        }

                        .print-title-compact {
                            text-align: center;
                            font-size: 16px;
                            font-weight: 700;
                            margin: 0;
                            line-height: 1.2;
                            text-transform: uppercase;
                        }
                        
                        .no-print {
                            display: none !important;
                        }
                        
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            font-size: 10px;
                            page-break-inside: auto;
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
                            text-align: left;
                        }

                        .text-right {
                            text-align: right !important;
                        }
                        
                        th {
                            background-color: #f0f0f0 !important;
                            font-weight: bold;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
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
                                    <BarChart3 className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="truncate text-lg sm:text-xl font-bold text-white">Collection Report</h1>
                                    <p className="hidden text-xs text-white/80 sm:block">Payment analytics and summaries</p>
                                </div>
                            </div>

                            <button onClick={() => window.print()} className="no-print inline-flex w-full items-center justify-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200 sm:w-auto">
                                <Printer className="mr-1.5 h-4 w-4" />
                                Print
                            </button>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        {/* Summary Stats Cards */}
                        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 no-print">
                            <div className="rounded-xl bg-white p-3 shadow-sm border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-green-600 p-2">
                                        <DollarSign className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-2 flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-600 truncate">Total Collections</p>
                                        <p className="text-sm font-bold text-gray-900 truncate">{formatCurrency(summary.total_amount)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl bg-white p-3 shadow-sm border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue p-2">
                                        <CreditCard className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-2 flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-600 truncate">Total Payments</p>
                                        <p className="text-sm font-bold text-gray-900 truncate">{summary.total_payments}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl bg-white p-3 shadow-sm border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-purple-600 p-2">
                                        <TrendingUp className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-2 flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-600 truncate">Average</p>
                                        <p className="text-sm font-bold text-gray-900 truncate">{formatCurrency(summary.average_payment)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl bg-white p-3 shadow-sm border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-orange-600 p-2">
                                        <Users className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-2 flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-600 truncate">Customers</p>
                                        <p className="text-sm font-bold text-gray-900 truncate">{summary.top_customers_count}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl bg-white p-3 shadow-sm border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-indigo-600 p-2">
                                        <Calendar className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-2 flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-600 truncate">Period</p>
                                        <p className="text-sm font-bold text-gray-900 truncate">
                                            {parseLocalDate(localFilters.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - {parseLocalDate(localFilters.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Charts Row */}
                        {chartData && chartData.length > 0 && (
                            <div className="grid gap-6 mb-6 md:grid-cols-2 no-print">
                                {/* Pie Chart - Payment Method Distribution */}
                                <Card className="rounded-2xl border-slate-200 bg-white shadow-md">
                                    <CardHeader>
                                        <CardTitle>Payment Method Distribution</CardTitle>
                                        <CardDescription>Breakdown by payment type</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <PieChart>
                                                <Pie
                                                    data={pieChartData}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(0) : '0'}%`}
                                                    outerRadius={80}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                >
                                                    {pieChartData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip 
                                                    formatter={(value: number | undefined) => value !== undefined ? formatCurrency(value) : 'N/A'}
                                                />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>

                                {/* Bar Chart - Collections Over Time */}
                                <Card className="rounded-2xl border-slate-200 bg-white shadow-md">
                                    <CardHeader>
                                        <CardTitle>Collections Over Time</CardTitle>
                                        <CardDescription>
                                            {localFilters.report_type === 'daily' ? 'Daily' : 'Monthly'} collection trend
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={chartData}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="date" />
                                                <YAxis />
                                                <Tooltip 
                                                    formatter={(value: number | undefined) => value !== undefined ? formatCurrency(value) : 'N/A'}
                                                />
                                                <Legend />
                                                <Bar dataKey="cash" stackId="a" fill={PAYMENT_METHOD_COLORS.cash} name="Cash" />
                                                <Bar dataKey="cheque" stackId="a" fill={PAYMENT_METHOD_COLORS.cheque} name="Cheque" />
                                                <Bar dataKey="bank" stackId="a" fill={PAYMENT_METHOD_COLORS.bank} name="Bank" />
                                                <Bar dataKey="card" stackId="a" fill={PAYMENT_METHOD_COLORS.card} name="Card" />
                                                <Bar dataKey="credit" stackId="a" fill={PAYMENT_METHOD_COLORS.credit} name="Credit" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Filters Section */}
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm no-print mb-6">
                            <div className="flex flex-col">
                                <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                    <Filter className="h-4 w-4" />
                                    Filters
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-gray-700">Start Date</Label>
                                        <input
                                            type="date"
                                            id="start_date"
                                            value={localFilters.start_date || ''}
                                            onChange={(e) => handleFilterChange('start_date', e.target.value)}
                                            className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-gray-700">End Date</Label>
                                        <input
                                            type="date"
                                            id="end_date"
                                            value={localFilters.end_date || ''}
                                            onChange={(e) => handleFilterChange('end_date', e.target.value)}
                                            className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-gray-700">Report Type</Label>
                                        <Select value={localFilters.report_type} onValueChange={(v) => handleFilterChange('report_type', v)}>
                                            <SelectTrigger className="border-slate-200">
                                                <SelectValue placeholder="Select Type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="daily">Daily Breakdown</SelectItem>
                                                <SelectItem value="monthly">Monthly Breakdown</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {companies && companies.length > 1 && (
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium text-gray-700">Company</Label>
                                            <Select value={localFilters.company_code} onValueChange={(v) => handleFilterChange('company_code', v)}>
                                                <SelectTrigger className="border-slate-200">
                                                    <SelectValue placeholder="All Companies" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All Companies</SelectItem>
                                                    {companies.map((c) => (
                                                        <SelectItem key={c.company_code} value={c.company_code}>
                                                            {c.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                    {sections && sections.length > 1 && (
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium text-gray-700">Section (Branch)</Label>
                                            <Select 
                                                value={localFilters.section_code} 
                                                onValueChange={(v) => handleFilterChange('section_code', v)}
                                                disabled={localFilters.company_code === 'all' && filteredSections.length === 0}
                                            >
                                                <SelectTrigger className="border-slate-200">
                                                    <SelectValue placeholder="All Sections" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All Sections</SelectItem>
                                                    {filteredSections.map((s) => (
                                                        <SelectItem key={s.section_code} value={s.section_code}>
                                                            {s.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-gray-700">Payment Source (Business Function)</Label>
                                        <Select value={localFilters.payment_source} onValueChange={(v) => handleFilterChange('payment_source', v)}>
                                            <SelectTrigger className="border-slate-200">
                                                <SelectValue placeholder="All Sources" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Sources</SelectItem>
                                                <SelectItem value="service">
                                                    <div className="flex items-center gap-2">
                                                        <Wrench className="h-4 w-4" />
                                                        Service Jobs
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="sales">
                                                    <div className="flex items-center gap-2">
                                                        <ShoppingCart className="h-4 w-4" />
                                                        Sales (Printing/Import)
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="delivery">
                                                    <div className="flex items-center gap-2">
                                                        <Truck className="h-4 w-4" />
                                                        Delivery
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="supplier">
                                                    <div className="flex items-center gap-2">
                                                        <Building2 className="h-4 w-4" />
                                                        Supplier Payments
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-gray-700">Customer</Label>
                                        <Popover open={customerDropdownOpen} onOpenChange={setCustomerDropdownOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={customerDropdownOpen}
                                                    className="w-full justify-between border-slate-200 bg-white hover:bg-slate-50"
                                                >
                                                    {localFilters.customer_id !== 'all'
                                                        ? (() => {
                                                            const selected = filteredCustomers.find((c) => c.AdrKy.toString() === localFilters.customer_id);
                                                            return selected ? `${selected.AdrCd} - ${selected.FstNm}` : 'Select customer';
                                                        })()
                                                        : 'All Customers'}
                                                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[calc(100vw-2rem)] max-w-[400px] p-0" align="start">
                                                <Command>
                                                    <CommandInput 
                                                        placeholder="Search by name or code..." 
                                                        className="h-9"
                                                    />
                                                    <CommandList>
                                                        <CommandEmpty>No customer found.</CommandEmpty>
                                                        <CommandGroup>
                                                            <CommandItem
                                                                value="all-customers-option"
                                                                onSelect={() => {
                                                                    handleFilterChange('customer_id', 'all');
                                                                    setCustomerDropdownOpen(false);
                                                                }}
                                                            >
                                                                <div className="flex flex-col">
                                                                    <div className="font-medium">All Customers</div>
                                                                    <div className="text-xs text-slate-500">Show all customer payments</div>
                                                                </div>
                                                                <Check
                                                                    className={cn(
                                                                        "ml-auto h-4 w-4",
                                                                        localFilters.customer_id === 'all' ? "opacity-100" : "opacity-0"
                                                                    )}
                                                                />
                                                            </CommandItem>
                                                            {filteredCustomers.map((c) => (
                                                                <CommandItem
                                                                    key={c.AdrKy}
                                                                    value={`${c.AdrKy} ${c.AdrCd} ${c.FstNm}`}
                                                                    onSelect={() => {
                                                                        handleFilterChange('customer_id', c.AdrKy.toString());
                                                                        setCustomerDropdownOpen(false);
                                                                    }}
                                                                >
                                                                    <div className="flex flex-col">
                                                                        <div className="font-medium">
                                                                            {c.AdrCd} - {c.FstNm}
                                                                        </div>
                                                                        {(c.company_code || c.section_code) && (
                                                                            <div className="text-xs text-slate-500">
                                                                                {c.company_code && `Company: ${c.company_code}`}
                                                                                {c.company_code && c.section_code && ' | '}
                                                                                {c.section_code && `Section: ${c.section_code}`}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <Check
                                                                        className={cn(
                                                                            "ml-auto h-4 w-4",
                                                                            localFilters.customer_id === c.AdrKy.toString() ? "opacity-100" : "opacity-0"
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
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-gray-700">Payment Method</Label>
                                        <Select value={localFilters.payment_method} onValueChange={(v) => handleFilterChange('payment_method', v)}>
                                            <SelectTrigger className="border-slate-200">
                                                <SelectValue placeholder="All Methods" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Methods</SelectItem>
                                                {paymentMethods.map((m) => (
                                                    <SelectItem key={m} value={m}>
                                                        {m.charAt(0).toUpperCase() + m.slice(1)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {technicians && technicians.length > 0 && (
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium text-gray-700">Technician</Label>
                                            <Select value={localFilters.technician_id} onValueChange={(v) => handleFilterChange('technician_id', v)}>
                                                <SelectTrigger className="border-slate-200">
                                                    <SelectValue placeholder="All Technicians" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All Technicians</SelectItem>
                                                    {technicians.map((t) => (
                                                        <SelectItem key={t.id} value={t.id.toString()}>
                                                            {t.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-gray-700">Job Number</Label>
                                        <div className="relative">
                                            <Wrench className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                            <input
                                                type="text"
                                                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-9 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-vismass-blue"
                                                placeholder="Search job number..."
                                                value={localFilters.job_number}
                                                onChange={(e) => handleFilterChange('job_number', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-gray-700">Device Serial</Label>
                                        <div className="relative">
                                            <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                            <input
                                                type="text"
                                                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-9 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-vismass-blue"
                                                placeholder="Search serial number..."
                                                value={localFilters.serial_number}
                                                onChange={(e) => handleFilterChange('serial_number', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                                    <button
                                        onClick={applyFilters}
                                        className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-vismass-blue px-4 py-2 text-sm font-medium text-white hover:bg-vismass-blue/90"
                                    >
                                        <Filter className="mr-2 h-4 w-4" />
                                        Apply Filters
                                    </button>
                                    <button
                                        onClick={resetFilters}
                                        className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-white border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                    >
                                        <RotateCcw className="mr-2 h-4 w-4" />
                                        Reset
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Print Table - Print Only */}
                        <div id="printable-collection" className="print-only">
                            {/* Company Logo Header */}
                            <div className="print-header" style={{ display: 'block' }}>
                                <img
                                    src={localFilters.company_code !== 'all' 
                                        ? (localFilters.company_code.startsWith('MAL') ? '/images/malibu-logo.png' 
                                           : localFilters.company_code === 'MASS' ? '/images/mass-logo.svg' 
                                           : '/images/Vismass-logo.png')
                                        : '/images/Vismass-logo.png'
                                    }
                                    alt="Company Logo"
                                    className="print-logo-compact"
                                />
                                <div className="print-title-compact">COLLECTION REPORT</div>
                            </div>

                            <div style={{ marginBottom: '20px', textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '10px' }}>
                                <h2 style={{ fontSize: '14px', marginBottom: '5px' }}>Payment Collection Summary</h2>
                                <p style={{ fontSize: '11px' }}>Period: {new Date(localFilters.start_date).toLocaleDateString('en-GB')} to {new Date(localFilters.end_date).toLocaleDateString('en-GB')}</p>
                                {(localFilters.company_code !== 'all' || localFilters.section_code !== 'all') && (
                                    <p style={{ fontSize: '10px', marginTop: '3px' }}>
                                        {localFilters.company_code !== 'all' && `Company: ${companies?.find(c => c.company_code === localFilters.company_code)?.name || localFilters.company_code}`}
                                        {localFilters.company_code !== 'all' && localFilters.section_code !== 'all' && ' | '}
                                        {localFilters.section_code !== 'all' && `Section: ${sections?.find(s => s.section_code === localFilters.section_code)?.name || localFilters.section_code}`}
                                    </p>
                                )}
                            </div>
                            
                            {/* Summary Statistics */}
                            <div style={{ marginBottom: '15px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px' }}>
                                <div style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                                    <div style={{ fontSize: '10px', color: '#666' }}>Total Collections</div>
                                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{formatCurrency(summary.total_amount)}</div>
                                </div>
                                <div style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                                    <div style={{ fontSize: '10px', color: '#666' }}>Total Payments</div>
                                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{summary.total_payments}</div>
                                </div>
                                <div style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                                    <div style={{ fontSize: '10px', color: '#666' }}>Average Payment</div>
                                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{formatCurrency(summary.average_payment)}</div>
                                </div>
                                <div style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                                    <div style={{ fontSize: '10px', color: '#666' }}>Customers</div>
                                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{summary.top_customers_count}</div>
                                </div>
                            </div>
                            
                            {/* Payment Method Summary */}
                            <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f9fafb', border: '1px solid #ddd' }}>
                                <h3 style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', borderBottom: '1px solid #ccc', paddingBottom: '4px' }}>Payment Method Breakdown</h3>
                                <table style={{ width: '100%', fontSize: '10px' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#e5e7eb' }}>
                                            <th style={{ textAlign: 'left', padding: '6px', border: '1px solid #ccc' }}>Method</th>
                                            <th style={{ textAlign: 'right', padding: '6px', border: '1px solid #ccc' }}>Amount (Rs.)</th>
                                            <th style={{ textAlign: 'center', padding: '6px', border: '1px solid #ccc' }}>Count</th>
                                            <th style={{ textAlign: 'right', padding: '6px', border: '1px solid #ccc' }}>Percentage</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(summary.payment_methods)
                                            .filter(([_, amount]) => amount > 0)
                                            .map(([method, amount]) => {
                                                const count = filteredData.filter(p => p.method === method).length;
                                                return (
                                                    <tr key={method}>
                                                        <td style={{ padding: '4px', textTransform: 'capitalize', border: '1px solid #ddd' }}>{method}</td>
                                                        <td style={{ textAlign: 'right', padding: '4px', fontWeight: 'bold', border: '1px solid #ddd' }}>{formatCurrency(amount)}</td>
                                                        <td style={{ textAlign: 'center', padding: '4px', border: '1px solid #ddd' }}>{count}</td>
                                                        <td style={{ textAlign: 'right', padding: '4px', border: '1px solid #ddd' }}>{((amount / summary.total_amount) * 100).toFixed(1)}%</td>
                                                    </tr>
                                                );
                                            })}
                                        <tr style={{ borderTop: '2px solid #000', fontWeight: 'bold', backgroundColor: '#f3f4f6' }}>
                                            <td style={{ padding: '6px', border: '1px solid #000' }}>TOTAL</td>
                                            <td style={{ textAlign: 'right', padding: '6px', border: '1px solid #000' }}>{summary.total_amount}</td>
                                            <td style={{ textAlign: 'center', padding: '6px', border: '1px solid #000' }}>{filteredData.length}</td>
                                            <td style={{ textAlign: 'right', padding: '6px', border: '1px solid #000' }}>100%</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Payment Source Summary */}
                            <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f9fafb', border: '1px solid #ddd' }}>
                                <h3 style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', borderBottom: '1px solid #ccc', paddingBottom: '4px' }}>Income by Business Function</h3>
                                <table style={{ width: '100%', fontSize: '10px' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#e5e7eb' }}>
                                            <th style={{ textAlign: 'left', padding: '6px', border: '1px solid #ccc' }}>Source</th>
                                            <th style={{ textAlign: 'right', padding: '6px', border: '1px solid #ccc' }}>Amount (Rs.)</th>
                                            <th style={{ textAlign: 'center', padding: '6px', border: '1px solid #ccc' }}>Count</th>
                                            <th style={{ textAlign: 'right', padding: '6px', border: '1px solid #ccc' }}>Percentage</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(summary.payment_sources)
                                            .filter(([_, amount]) => amount > 0)
                                            .map(([source, amount]) => {
                                                const count = filteredData.filter(p => p.source_type === source).length;
                                                const displaySource = source === 'sales' ? 'Sales (Printing/Import)' : source.charAt(0).toUpperCase() + source.slice(1);
                                                return (
                                                    <tr key={source}>
                                                        <td style={{ padding: '4px', border: '1px solid #ddd' }}>{displaySource}</td>
                                                        <td style={{ textAlign: 'right', padding: '4px', fontWeight: 'bold', border: '1px solid #ddd' }}>{amount}</td>
                                                        <td style={{ textAlign: 'center', padding: '4px', border: '1px solid #ddd' }}>{count}</td>
                                                        <td style={{ textAlign: 'right', padding: '4px', border: '1px solid #ddd' }}>{((amount / summary.total_amount) * 100).toFixed(1)}%</td>
                                                    </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Transaction Details */}
                            <div style={{ marginBottom: '6px', fontSize: '10px', fontWeight: '600' }}>
                                Showing {filteredData.length} transaction{filteredData.length !== 1 ? 's' : ''} | Total: {formatCurrency(filteredData.reduce((sum, p) => sum + parseFloat(String(p.amount || 0)), 0))}
                            </div>
                            <h3 style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', marginTop: '10px', borderBottom: '1px solid #000', paddingBottom: '4px' }}>Detailed Transaction List</h3>
                            <table style={{ width: '100%', fontSize: '9px' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#e5e7eb' }}>
                                        <th style={{ padding: '6px', border: '1px solid #000' }}>#</th>
                                        <th style={{ padding: '6px', border: '1px solid #000' }}>Date</th>
                                        <th style={{ padding: '6px', border: '1px solid #000' }}>Customer Code</th>
                                        <th style={{ padding: '6px', border: '1px solid #000' }}>Customer Name</th>
                                        <th style={{ padding: '6px', border: '1px solid #000', textAlign: 'right' }}>Amount (Rs.)</th>
                                        <th style={{ padding: '6px', border: '1px solid #000' }}>Method</th>
                                        <th style={{ padding: '6px', border: '1px solid #000' }}>Source</th>
                                        <th style={{ padding: '6px', border: '1px solid #000' }}>Reference</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredData.map((p, i) => (
                                        <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                                            <td style={{ padding: '4px', border: '1px solid #ddd', textAlign: 'center' }}>{i + 1}</td>
                                            <td style={{ padding: '4px', border: '1px solid #ddd' }}>{new Date(p.date).toLocaleDateString('en-GB')}</td>
                                            <td style={{ padding: '4px', border: '1px solid #ddd' }}>{p.customer.AdrCd}</td>
                                            <td style={{ padding: '4px', border: '1px solid #ddd' }}>{p.customer.FstNm}</td>
                                            <td style={{ textAlign: 'right', padding: '4px', fontWeight: 'bold', border: '1px solid #ddd' }}>{(parseFloat(String(p.amount || 0)))}</td>
                                            <td style={{ padding: '4px', textTransform: 'capitalize', border: '1px solid #ddd' }}>{p.method}</td>
                                            <td style={{ padding: '4px', textTransform: 'capitalize', border: '1px solid #ddd' }}>{p.source_type === 'sales' ? 'Sales' : p.source_type}</td>
                                            <td style={{ padding: '4px', border: '1px solid #ddd' }}>{p.reference || '-'}</td>
                                        </tr>
                                    ))}
                                    <tr style={{ fontWeight: 'bold', backgroundColor: '#e5e7eb', borderTop: '2px solid #000' }}>
                                        <td colSpan={4} style={{ padding: '6px', border: '1px solid #000', textAlign: 'right' }}>TOTAL:</td>
                                        <td style={{ textAlign: 'right', padding: '6px', border: '1px solid #000' }}>
                                            {formatCurrency(filteredData.reduce((sum, p) => sum + parseFloat(String(p.amount || 0)), 0))}
                                        </td>
                                        <td colSpan={3} style={{ padding: '6px', border: '1px solid #000' }}>
                                            {filteredData.length} transaction{filteredData.length !== 1 ? 's' : ''}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            
                            <div style={{ marginTop: '30px', paddingTop: '10px', borderTop: '2px solid #000', fontSize: '9px', display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                    <strong>Generated by:</strong> Unitec Software Solution<br />
                                    <strong>Report Type:</strong> {localFilters.report_type === 'daily' ? 'Daily Breakdown' : 'Monthly Breakdown'}
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <strong>Generated at:</strong><br />
                                    {new Date().toLocaleString('en-GB', { 
                                        day: '2-digit', 
                                        month: '2-digit', 
                                        year: 'numeric', 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Data Table */}
                        <Card className="rounded-2xl border-slate-200 bg-white shadow-md">
                            <CardHeader className="bg-gradient-to-r from-vismass-blue to-vismass-grey text-white rounded-t-2xl">
                                <CardTitle>Payment Transactions</CardTitle>
                                <CardDescription className="text-slate-100">
                                    Showing {filteredData.length} transaction{filteredData.length !== 1 ? 's' : ''} | Total: {formatCurrency(filteredData.reduce((sum, p) => sum + parseFloat(String(p.amount || 0)), 0))}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <Table className="min-w-[980px]">
                                        <TableHeader>
                                            <TableRow className="bg-slate-50 border-b-2 border-slate-200">
                                                <TableHead className="w-12 font-bold text-gray-700">#</TableHead>
                                                <TableHead className="font-bold text-gray-700">Date</TableHead>
                                                <TableHead className="font-bold text-gray-700">Customer Code</TableHead>
                                                <TableHead className="font-bold text-gray-700">Customer Name</TableHead>
                                                <TableHead className="font-bold text-gray-700 text-right">Amount (Rs.)</TableHead>
                                                <TableHead className="font-bold text-gray-700">Payment Method</TableHead>
                                                <TableHead className="font-bold text-gray-700">Source</TableHead>
                                                <TableHead className="font-bold text-gray-700">Reference</TableHead>
                                                {localFilters.technician_id === 'all' && (
                                                    <TableHead className="font-bold text-gray-700">Technician</TableHead>
                                                )}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredData.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={localFilters.technician_id === 'all' ? 8 : 7} className="text-center py-8 text-gray-500">
                                                        No payment transactions found for the selected filters.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredData.map((p, i) => (
                                                    <TableRow key={i} className="border-b border-slate-100 hover:bg-slate-50">
                                                        <TableCell className="text-xs text-gray-400">
                                                            {i + 1}
                                                        </TableCell>
                                                        <TableCell className="text-sm">
                                                            {new Date(p.date).toLocaleDateString('en-GB')}
                                                        </TableCell>
                                                        <TableCell className="text-sm font-medium text-vismass-blue">
                                                            {p.customer.AdrCd}
                                                        </TableCell>
                                                        <TableCell className="text-sm font-medium">
                                                            {p.customer.FstNm}
                                                        </TableCell>
                                                        <TableCell className="text-sm font-bold text-green-600 text-right">
                                                            {p.amount}
                                                        </TableCell>
                                                        <TableCell className="text-sm">
                                                            <Badge 
                                                                style={{ 
                                                                    backgroundColor: PAYMENT_METHOD_COLORS[p.method],
                                                                    color: 'white'
                                                                }}
                                                                className="capitalize"
                                                            >
                                                                {p.method}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-sm">
                                                            <Badge 
                                                                style={{ 
                                                                    backgroundColor: PAYMENT_SOURCE_COLORS[p.source_type],
                                                                    color: 'white'
                                                                }}
                                                                className="capitalize"
                                                            >
                                                                {p.source_type === 'sales' ? 'Sales/Printing' : p.source_type === 'supplier' ? 'Supplier' : p.source_type}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-sm text-gray-600">
                                                            {p.reference || '-'}
                                                        </TableCell>
                                                        {localFilters.technician_id === 'all' && (
                                                            <TableCell className="text-sm text-gray-600">
                                                                {p.serviceJob?.technician_name || 
                                                                 (p.serviceJob?.technician ? 
                                                                  `${p.serviceJob.technician.first_name} ${p.serviceJob.technician.last_name}` : 
                                                                  '-')}
                                                            </TableCell>
                                                        )}
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </main>

                {/* Footer */}
                <footer className="mt-12 border-t border-slate-200 bg-gradient-to-r from-white to-slate-50 py-6 no-print">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <p className="text-center text-sm text-gray-600">© 2026 VISMASS</p>
                    </div>
                </footer>
            </div>
        </AppLayout>
    );
}

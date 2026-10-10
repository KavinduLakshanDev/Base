import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
import { TrendingUp, Users, Package, ShoppingCart, AlertTriangle, DollarSign, Wrench, CheckCircle, Clock, Truck, UserCheck, ArrowUpRight, ArrowDownRight, Box, FileText, TrendingDown, Activity, Wallet, Building2, BarChart3, PackageX, LogOut, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Company Dashboard',
        href: '/company/dashboard',
    },
];

interface CompanyDashboardProps extends SharedData {
    stats: {
        // Sales
        total_sales: number;
        today_sales: number;
        total_sales_count: number;

        // Purchases
        total_purchases: number;
        total_purchase_count: number;

        // Service Jobs
        total_service_jobs: number;
        pending_jobs: number;
        completed_jobs: number;
        service_revenue: number;

        // Customers & Suppliers
        total_customers: number;
        total_suppliers: number;
        new_customers: number;

        // Stock
        total_products: number;
        low_stock_items: number;
        out_of_stock_items: number;
        total_stock_value: number;
        wastage_count: number;
        wastage_value: number;

        // Deliveries
        total_deliveries: number;
        pending_deliveries: number;
        completed_deliveries: number;

        // Payments
        customer_payments: number;
        supplier_payments: number;

        // Transfers & Quotations
        stock_transfers: number;
        total_quotations: number;
        quotation_value: number;

        // Recent Activities
        recent_sales: Array<{
            id: number;
            customer_name: string;
            total_amount: number;
            created_at: string;
        }>;
        recent_service_jobs: Array<{
            id: number;
            job_number: string;
            customer_name: string;
            status: string;
            device: string;
            received_date: string;
        }>;
    };
    chartData: {
        sales_purchases_trend: Array<{
            month: string;
            sales: number;
            purchases: number;
        }>;
        service_job_status: Array<{
            name: string;
            value: number;
        }>;
        top_products: Array<{
            name: string;
            quantity: number;
            value: number;
        }>;
        revenue_breakdown: Array<{
            name: string;
            value: number;
        }>;
    };
}

// Professional Color Palette
const COLORS = ['#0ea5e9', '#64748b', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const STATUS_COLORS: Record<string, string> = {
    'Pending': '#f59e0b',
    'In progress': '#3b82f6',
    'Completed': '#10b981',
    'Cancelled': '#ef4444',
    'Delivered': '#8b5cf6',
};

export default function CompanyDashboard() {
    const { auth, stats, chartData } = usePage<CompanyDashboardProps>().props;
    const user = auth.user;

    const handleLogout = () => {
        router.post('/company/logout');
    };

    const formatCurrency = (amount: number | string | undefined | null) => {
        const value = typeof amount === 'number' ? amount : parseFloat(amount || '0');
        return new Intl.NumberFormat('en-LK', {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(isNaN(value) ? 0 : value);
    };

    const formatNumber = (num: number | string | undefined | null) => {
        const value = typeof num === 'number' ? num : parseFloat(num || '0');
        return new Intl.NumberFormat('en-US').format(isNaN(value) ? 0 : value);
    };

    const getStatusColor = (status: string | undefined | null) => {
        const s = (status || '').toLowerCase();
        const statusColors: Record<string, string> = {
            'pending': 'bg-amber-50 text-amber-700 border-amber-200',
            'in_progress': 'bg-blue-50 text-blue-700 border-blue-200',
            'completed': 'bg-emerald-50 text-emerald-700 border-emerald-200',
            'cancelled': 'bg-rose-50 text-rose-700 border-rose-200',
            'delivered': 'bg-violet-50 text-violet-700 border-violet-200',
        };
        return statusColors[s] || 'bg-slate-50 text-slate-700 border-slate-200';
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Company Dashboard - Overview" />

            <div className="flex h-full flex-1 flex-col gap-8 p-8 bg-gradient-to-br from-gray-50 to-blue-50/30">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            Dashboard Overview
                        </h1>
                        <div className="flex items-center gap-2 mt-2 text-slate-500">
                            <Calendar className="h-4 w-4" />
                            <p className="text-sm font-medium">System performance for {new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex flex-col items-end mr-2">
                            <span className="text-sm font-semibold text-slate-900">{user?.name || 'Administrator'}</span>
                            <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Administrator</span>
                        </div>
                        <Button
                            onClick={handleLogout}
                            variant="outline"
                            className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-rose-600 transition-all shadow-sm"
                        >
                            <LogOut className="h-4 w-4 mr-2" />
                            Sign Out
                        </Button>
                    </div>
                </div>

                {/* Main KPIs Row */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {/* Sales KPI */}
                    <Card className="rounded-2xl bg-sky-50 border border-gray-100 shadow-xl overflow-hidden group hover:ring-1 hover:ring-sky-200 transition-all duration-300 border-l-4 border-sky-200">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Total Sales</CardTitle>
                            <div className="p-2 bg-sky-100 rounded-lg text-sky-600 group-hover:bg-sky-600 group-hover:text-white transition-colors duration-300">
                                <DollarSign className="h-5 w-5" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">
                                {formatCurrency(stats?.total_sales)}
                            </div>
                            <div className="flex items-center mt-3 gap-2">
                                <span className="flex items-center text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                                    <TrendingUp className="h-3 w-3 mr-1" />
                                    {stats?.total_sales_count || 0} Sales
                                </span>
                                <span className="text-xs text-slate-400">vs prev. month</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Service Jobs KPI */}
                    <Card className="rounded-2xl bg-sky-50 border border-gray-100 shadow-xl overflow-hidden group hover:ring-1 hover:ring-sky-200 transition-all duration-300 border-l-4 border-sky-200">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Services</CardTitle>
                            <div className="p-2 bg-sky-100 rounded-lg text-sky-600 group-hover:bg-sky-600 group-hover:text-white transition-colors duration-300">
                                <Wrench className="h-5 w-5" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">
                                {formatCurrency(stats?.service_revenue)}
                            </div>
                            <div className="flex items-center mt-3 gap-2">
                                <span className="flex items-center text-amber-600 text-xs font-bold bg-amber-50 px-2 py-0.5 rounded-full">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {stats?.pending_jobs || 0} Pending
                                </span>
                                <span className="text-xs text-slate-400">active jobs</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Purchases KPI */}
                    <Card className="rounded-2xl bg-sky-50 border border-gray-100 shadow-xl overflow-hidden group hover:ring-1 hover:ring-sky-200 transition-all duration-300 border-l-4 border-sky-200">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Total Purchases</CardTitle>
                            <div className="p-2 bg-sky-100 rounded-lg text-sky-600 group-hover:bg-sky-600 group-hover:text-white transition-colors duration-300">
                                <ShoppingCart className="h-5 w-5" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">
                                {formatCurrency(stats?.total_purchases)}
                            </div>
                            <div className="flex items-center mt-3 gap-2">
                                <span className="flex items-center text-slate-600 text-xs font-bold bg-slate-100 px-2 py-0.5 rounded-full">
                                    <Building2 className="h-3 w-3 mr-1" />
                                    {stats?.total_suppliers || 0} Vendors
                                </span>
                                <span className="text-xs text-slate-400">PO units</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Inventory KPI */}
                    <Card className="rounded-2xl bg-sky-50 border border-gray-100 shadow-xl overflow-hidden group hover:ring-1 hover:ring-sky-200 transition-all duration-300 border-l-4 border-sky-200">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Stock Value</CardTitle>
                            <div className="p-2 bg-sky-100 rounded-lg text-sky-600 group-hover:bg-sky-600 group-hover:text-white transition-colors duration-300">
                                <Package className="h-5 w-5" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">
                                {formatCurrency(stats?.total_stock_value)}
                            </div>
                            <div className="flex items-center mt-3 gap-2">
                                <span className="flex items-center text-rose-600 text-xs font-bold bg-rose-50 px-2 py-0.5 rounded-full">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    {stats?.low_stock_items || 0} Low Stock
                                </span>
                                <span className="text-xs text-slate-400">{stats?.total_products || 0} items</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sub-metrics Section */}
                <div className="grid gap-5 md:grid-cols-3 lg:grid-cols-5">
                    {[
                        { icon: Users, label: 'Customers', value: stats?.total_customers, sub: `+${stats?.new_customers || 0} new`, color: 'text-blue-600', alert: false },
                        { icon: Truck, label: 'Deliveries', value: stats?.total_deliveries, sub: `${stats?.pending_deliveries || 0} pending`, color: 'text-orange-600', alert: false },
                        // { icon: FileText, label: 'Quotes', value: stats?.total_quotations, sub: formatCurrency(stats?.quotation_value), color: 'text-indigo-600', alert: false },
                        { icon: Wallet, label: 'Collections', value: formatCurrency(stats?.customer_payments), sub: 'Received', color: 'text-emerald-600', alert: false },
                        { icon: Activity, label: 'Transfers', value: stats?.stock_transfers, sub: 'Movements', color: 'text-slate-600', alert: false },
                        { icon: PackageX, label: 'Wastage', value: stats?.wastage_count, sub: formatCurrency(stats?.wastage_value), color: 'text-indigo-600', alert: (stats?.wastage_count || 0) > 0 },
                    ].map((item, idx) => (
                        <div key={idx} className={`bg-indigo-50 p-4 rounded-xl shadow-sm border border-indigo-100 flex flex-col gap-1 ${item.alert ? 'bg-rose-50/30' : ''}`}>
                            <div className="flex items-center gap-2 mb-1">
                                <div className={`p-2 rounded-md ${item.alert ? 'bg-rose-50/40' : 'bg-indigo-100'}`}>
                                    <item.icon className={`h-4 w-4 ${item.color}`} />
                                </div>
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{item.label}</span>
                            </div>
                            <div className="text-lg font-bold text-slate-900">{typeof item.value === 'number' ? formatNumber(item.value) : (item.value || '0')}</div>
                            <div className={`text-[10px] font-medium ${item.alert ? 'text-rose-600' : 'text-slate-400'}`}>{item.sub}</div>
                        </div>
                    ))}
                </div>

                {/* Charts Grid */}
                <div className="grid gap-8 md:grid-cols-2">
                    <Card className="border-none shadow-sm bg-white overflow-hidden">
                        <CardHeader className="border-b border-slate-50 pb-4">
                            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-sky-500" />
                                Sales vs Purchases Trend
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <ResponsiveContainer width="100%" height={320}>
                                <LineChart data={chartData?.sales_purchases_trend || []}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis
                                        dataKey="month"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fill: '#64748b' }}
                                    />
                                    <YAxis
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fill: '#64748b' }}
                                        tickFormatter={(value) => `${value / 1000}k`}
                                    />
                                    <Tooltip
                                        cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }}
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="bg-white p-3 border border-slate-100 shadow-xl rounded-lg">
                                                        <p className="text-xs font-bold text-slate-900 mb-2">{label}</p>
                                                        {payload.map((p, i) => (
                                                            <div key={i} className="flex items-center gap-4 text-xs py-1">
                                                                <span className="flex items-center gap-1.5 font-medium text-slate-600">
                                                                    <div className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                                                                    {p.name}:
                                                                </span>
                                                                <span className="font-bold text-slate-900">{formatCurrency(p.value as number)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Legend verticalAlign="top" align="right" iconType="circle" />
                                    <Line
                                        type="monotone"
                                        dataKey="sales"
                                        stroke="#0ea5e9"
                                        strokeWidth={3}
                                        name="Sales"
                                        dot={false}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="purchases"
                                        stroke="#94a3b8"
                                        strokeWidth={3}
                                        name="Purchases"
                                        dot={false}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-white overflow-hidden">
                        <CardHeader className="border-b border-slate-50 pb-4">
                            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Activity className="h-5 w-5 text-emerald-500" />
                                Service Distribution
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <ResponsiveContainer width="100%" height={320}>
                                <PieChart>
                                    <Pie
                                        data={chartData?.service_job_status || []}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={70}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {(chartData?.service_job_status || []).map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]}
                                                strokeWidth={0}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="bg-white p-2 border border-slate-100 shadow-xl rounded-lg">
                                                        <p className="text-xs font-bold text-slate-900">{payload[0].name}: {payload[0].value} Jobs</p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex flex-wrap justify-center gap-4 mt-2">
                                {(chartData?.service_job_status || []).map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-1.5">
                                        <div className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[item.name] || COLORS[idx % COLORS.length] }} />
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">{item.name}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Bottom Lists Section */}
                <div className="grid gap-8 md:grid-cols-2">
                    {/* Recent Sales List */}
                    <Card className="border-none shadow-sm bg-white overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 pb-4">
                            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <ShoppingCart className="h-5 w-5 text-sky-500" />
                                Recent Transactions
                            </CardTitle>
                            <Badge variant="outline" className="text-slate-500 bg-slate-50 border-slate-200">
                                {stats?.recent_sales?.length || 0} Recent
                            </Badge>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-slate-50">
                                {(stats?.recent_sales || []).map((sale) => (
                                    <div key={sale.id} className="flex items-center justify-between p-5 hover:bg-slate-50 transition-colors cursor-pointer group">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-full bg-sky-50 flex items-center justify-center text-sky-600 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                                                <UserCheck className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">{sale.customer_name || 'Walking Customer'}</p>
                                                <p className="text-xs font-medium text-slate-400">{sale.created_at}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-slate-900">
                                                {formatCurrency(sale.total_amount)}
                                            </p>
                                            <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border-none px-1 h-4">PAID</Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <Button variant="ghost" className="w-full rounded-none h-12 text-sky-600 hover:text-sky-700 hover:bg-slate-50 font-semibold text-xs uppercase tracking-widest border-t border-slate-50">
                                View All Transactions
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Recent Service Jobs List */}
                    <Card className="border-none shadow-sm bg-white overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 pb-4">
                            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Wrench className="h-5 w-5 text-emerald-500" />
                                Latest Service Jobs
                            </CardTitle>
                            <Badge variant="outline" className="text-slate-500 bg-slate-50 border-slate-200">
                                {stats?.recent_service_jobs?.length || 0} Recent
                            </Badge>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-slate-50">
                                {(stats?.recent_service_jobs || []).map((job) => (
                                    <div key={job.id} className="flex items-center justify-between p-5 hover:bg-slate-50 transition-colors cursor-pointer group">
                                        <div className="flex items-center gap-4 overflow-hidden">
                                            <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                                                <Activity className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-bold text-slate-900 truncate">{job.job_number}</p>
                                                    <Badge className={`text-[10px] font-bold border-none ${getStatusColor(job.status)} px-1.5 h-4`}>
                                                        {(job.status || '').replace('_', ' ').toUpperCase()}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs font-medium text-slate-500 mt-0.5 truncate">{job.customer_name} • {job.device}</p>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-xs font-bold text-slate-400">{job.received_date}</p>
                                            <ArrowUpRight className="h-4 w-4 text-slate-300 ml-auto mt-1 group-hover:text-emerald-500 transition-colors" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <Button variant="ghost" className="w-full rounded-none h-12 text-emerald-600 hover:text-emerald-700 hover:bg-slate-50 font-semibold text-xs uppercase tracking-widest border-t border-slate-50">
                                View All Service Jobs
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Critical Stock Alerts */}
                {((stats?.low_stock_items || 0) > 0 || (stats?.out_of_stock_items || 0) > 0) && (
                    <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-500">
                            <AlertTriangle className="h-24 w-24 text-rose-900" />
                        </div>
                        <div className="flex items-center gap-6 relative">
                            <div className="h-14 w-14 rounded-2xl bg-white flex items-center justify-center shadow-sm text-rose-600">
                                <AlertTriangle className="h-8 w-8" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-rose-900">Inventory Status Warning</h3>
                                <p className="text-rose-700/70 font-medium">Critical attention required for {(stats?.low_stock_items || 0) + (stats?.out_of_stock_items || 0)} items in stock</p>
                            </div>
                        </div>
                        <div className="flex gap-4 relative">
                            <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-rose-100/50">
                                <span className="text-xs font-black text-rose-900/40 uppercase tracking-widest block">Low Stock</span>
                                <span className="text-2xl font-black text-rose-600">{stats?.low_stock_items || 0}</span>
                            </div>
                            <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-rose-100/50">
                                <span className="text-xs font-black text-rose-900/40 uppercase tracking-widest block">Out of Stock</span>
                                <span className="text-2xl font-black text-rose-600">{stats?.out_of_stock_items || 0}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

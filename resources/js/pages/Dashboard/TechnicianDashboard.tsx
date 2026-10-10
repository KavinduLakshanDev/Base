import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Link } from '@inertiajs/react';
import { CheckCircle, Clock, Wrench, TrendingUp, DollarSign, Users, Star, Zap, AlertCircle, Calendar, Target, Award, BarChart3, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, ScatterChart, Scatter } from 'recharts';

interface TechnicianStats {
    active_jobs_count: number;
    pending_jobs_count: number;
    completed_today_count: number;
    my_active_jobs: Array<{
        id: number;
        job_number: string;
        customer_name: string;
        device: string;
        status: string;
        created_at: string;
    }>;
    available_jobs: Array<{
        id: number;
        job_number: string;
        device: string;
        issue: string;
        created_at: string;
    }>;
    // Enhanced stats for professional dashboard
    revenue_today?: number;
    revenue_this_month?: number;
    avg_completion_time?: string;
    customer_satisfaction?: number;
    parts_used_today?: number;
    efficiency_rating?: number;
    recent_activities?: Array<{
        id: number;
        type: 'job_completed' | 'job_started' | 'payment_received';
        description: string;
        timestamp: string;
    }>;
    // Chart data
    performance_chart?: Array<{
        date: string;
        jobs_completed: number;
        revenue: number;
    }>;
    job_status_distribution?: Array<{
        name: string;
        value: number;
        color: string;
    }>;
}

interface TechnicianDashboardProps {
    stats: TechnicianStats;
}

export default function TechnicianDashboard({ stats }: TechnicianDashboardProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-LK', {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const getStatusColor = (status: string) => {
        const statusColors: Record<string, string> = {
            'pending': 'bg-yellow-100 text-yellow-800 border-yellow-300',
            'in_progress': 'bg-blue-100 text-blue-800 border-blue-300',
            'completed': 'bg-green-100 text-green-800 border-green-300',
            'cancelled': 'bg-red-100 text-red-800 border-red-300',
        };
        return statusColors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
    };

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'job_completed':
                return <CheckCircle className="h-4 w-4 text-green-600" />;
            case 'job_started':
                return <Wrench className="h-4 w-4 text-blue-600" />;
            case 'payment_received':
                return <DollarSign className="h-4 w-4 text-green-600" />;
            default:
                return <Clock className="h-4 w-4 text-gray-600" />;
        }
    };

    // Vismass color scheme
    const vismassColors = {
        primary: '#0ea5e9', // match Company Dashboard primary
        secondary: '#64748b', // match Company Dashboard secondary
        accent: '#3b82f6', // blue-600 from login
        success: '#10b981', // green
        warning: '#f59e0b', // amber
        danger: '#ef4444', // red
    };

    // Company-dashboard color palette (keeps dashboards consistent)
    const COLORS = ['#0ea5e9', '#64748b', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    const STATUS_COLORS: Record<string, string> = {
        'Pending': '#f59e0b',
        'In progress': '#3b82f6',
        'Completed': '#10b981',
        'Cancelled': '#ef4444',
        'Delivered': '#8b5cf6',
    };
    const PURCHASES_COLOR = '#94a3b8';
    const chartColors = COLORS;

    // Derived datasets for UI charts
    const activeJobsByDevice = (stats.my_active_jobs || []).reduce((acc: { device: string; count: number }[], job) => {
        const device = job.device || 'Unknown';
        const found = acc.find((d) => d.device === device);
        if (found) found.count += 1;
        else acc.push({ device, count: 1 });
        return acc;
    }, [] as { device: string; count: number }[]).sort((a, b) => b.count - a.count);

    const availableJobsByDevice = (stats.available_jobs || []).reduce((acc: { device: string; count: number }[], job) => {
        const device = job.device || 'Unknown';
        const found = acc.find((d) => d.device === device);
        if (found) found.count += 1;
        else acc.push({ device, count: 1 });
        return acc;
    }, [] as { device: string; count: number }[]).sort((a, b) => b.count - a.count);

    return (
        <div className="flex flex-col gap-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
            {/* Header */}
            <div className="bg-white rounded-lg p-4 md:p-6 shadow-md border border-slate-200">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            Technician Dashboard
                        </h1>
                        <p className="text-sm font-medium text-slate-500 mt-1">Manage your service jobs and track performance</p>
                        <p className="text-sm text-slate-500 mt-1">Welcome back! Here's your daily overview</p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <Link href={route('service-jobs.index')}>
                            <Button style={{ background: `linear-gradient(135deg, ${vismassColors.primary}, ${vismassColors.accent})` }} className="shadow-lg hover:opacity-90 text-white border-0 w-full sm:w-auto">
                                <Wrench className="mr-2 h-4 w-4" />
                                View Job Pool
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Key Performance Indicators */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                <Card className="rounded-2xl bg-sky-50 border border-gray-100 shadow-md overflow-hidden group hover:ring-1 hover:ring-sky-100 transition-all duration-300 border-l-4 border-sky-200">
                    <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between pb-2 px-3">
                        <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">My Active Jobs</CardTitle>
                        <div className="p-2 bg-sky-100 rounded-md text-sky-600">
                            <Wrench className="h-5 w-5" />
                        </div>
                    </CardHeader>
                    <CardContent className="px-3 pb-4 pt-2">
                        <div className="text-2xl font-semibold text-slate-900">{stats.active_jobs_count}</div>
                        <p className="text-xs text-slate-500 mt-1">Currently assigned to you</p>
                        {stats.efficiency_rating && (
                            <div className="flex items-center mt-2 text-xs">
                                <Award className="h-3 w-3 text-yellow-600 mr-1" />
                                <span className="text-yellow-600 font-medium">{stats.efficiency_rating}% efficiency</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="rounded-2xl bg-sky-50 border border-gray-100 shadow-md overflow-hidden group hover:ring-1 hover:ring-sky-100 transition-all duration-300 border-l-4 border-sky-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 px-3">
                        <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Available Jobs</CardTitle>
                        <div className="p-2 bg-sky-100 rounded-md text-sky-600">
                            <Clock className="h-5 w-5" />
                        </div>
                    </CardHeader>
                    <CardContent className="px-3 pb-4 pt-2">
                        <div className="text-2xl font-semibold text-slate-900">{stats.pending_jobs_count}</div>
                        <p className="text-xs text-slate-500 mt-1">Unassigned jobs waiting</p>
                        <div className="flex items-center mt-2 text-xs">
                            <AlertCircle className="h-3 w-3 text-orange-600 mr-1" />
                            <span className="text-orange-600 font-medium">Ready for assignment</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl bg-sky-50 border border-gray-100 shadow-md overflow-hidden group hover:ring-1 hover:ring-sky-100 transition-all duration-300 border-l-4 border-sky-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 px-3">
                        <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Completed Today</CardTitle>
                        <div className="p-2 bg-sky-100 rounded-md text-sky-600">
                            <CheckCircle className="h-5 w-5" />
                        </div>
                    </CardHeader>
                    <CardContent className="px-3 pb-4 pt-2">
                        <div className="text-2xl font-semibold text-slate-900">{stats.completed_today_count}</div>
                        <p className="text-xs text-slate-500 mt-1">Jobs finished today</p>
                        {stats.avg_completion_time && (
                            <div className="flex items-center mt-2 text-xs">
                                <Target className="h-3 w-3 text-green-600 mr-1" />
                                <span className="text-green-600 font-medium">Avg: {stats.avg_completion_time}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="rounded-2xl bg-sky-50 border border-gray-100 shadow-md overflow-hidden group hover:ring-1 hover:ring-sky-100 transition-all duration-300 border-l-4 border-sky-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 px-3">
                        <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Today's Revenue</CardTitle>
                        <div className="p-2 bg-sky-100 rounded-md text-sky-600">
                            <DollarSign className="h-5 w-5" />
                        </div>
                    </CardHeader>
                    <CardContent className="px-3 pb-4 pt-2">
                        <div className="text-2xl font-semibold text-slate-900">
                            {stats.revenue_today ? formatCurrency(stats.revenue_today) : 'Rs 0'}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Revenue from completed jobs</p>
                        {stats.revenue_this_month && (
                            <div className="flex items-center mt-2 text-xs">
                                <TrendingUp className="h-3 w-3 text-blue-600 mr-1" />
                                <span className="text-blue-600 font-medium">
                                    This month: {formatCurrency(stats.revenue_this_month)}
                                </span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Additional Metrics Row */}
            {(stats.customer_satisfaction || stats.parts_used_today) && (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                    {stats.customer_satisfaction && (
                        <Card className="shadow-lg hover:shadow-xl transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-semibold">Customer Satisfaction</CardTitle>
                                <Star className="h-5 w-5 text-yellow-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-yellow-600">{stats.customer_satisfaction}/5</div>
                                <p className="text-xs text-muted-foreground mt-1">Average rating from customers</p>
                            </CardContent>
                        </Card>
                    )}

                    {stats.parts_used_today && (
                        <Card className="shadow-lg hover:shadow-xl transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-semibold">Parts Used Today</CardTitle>
                                <Zap className="h-5 w-5 text-orange-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-orange-600">{stats.parts_used_today}</div>
                                <p className="text-xs text-muted-foreground mt-1">Components utilized in repairs</p>
                            </CardContent>
                        </Card>
                    )}

                    <Card className="shadow-lg hover:shadow-xl transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
                            <Users className="h-5 w-5 text-blue-500" />
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Link href={route('service-jobs.index')}>
                                <Button variant="outline" size="sm" className="w-full justify-start">
                                    <Wrench className="mr-2 h-4 w-4" />
                                    View Job Pool
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Performance Chart */}
            {stats.performance_chart && stats.performance_chart.length > 0 && (
                <Card className="shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" style={{ color: vismassColors.primary }} />
                            Performance Overview
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6">
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={stats.performance_chart}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#64748b"
                                        fontSize={12}
                                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    />
                                    <YAxis
                                        stroke="#64748b"
                                        fontSize={12}
                                        tickFormatter={(value) => `${value}`}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'white',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '8px',
                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                        }}
                                        labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                        formatter={(value, name) => [
                                            name === 'jobs_completed' ? `${value || 0} jobs` : formatCurrency(Number(value || 0)),
                                            name === 'jobs_completed' ? 'Jobs Completed' : 'Revenue'
                                        ]}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="jobs_completed"
                                        stroke={COLORS[0]}
                                        strokeWidth={3}
                                        dot={{ fill: COLORS[0], strokeWidth: 2, r: 4 }}
                                        activeDot={{ r: 6, stroke: COLORS[0], strokeWidth: 2 }}
                                        name="jobs_completed"
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="revenue"
                                        stroke={PURCHASES_COLOR}
                                        strokeWidth={3}
                                        dot={{ fill: PURCHASES_COLOR, strokeWidth: 2, r: 4 }}
                                        activeDot={{ r: 6, stroke: PURCHASES_COLOR, strokeWidth: 2 }}
                                        name="revenue"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex items-center justify-center gap-6 mt-4 text-sm text-slate-600">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[0] }}></div>
                                <span>Jobs Completed</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PURCHASES_COLOR }}></div>
                                <span>Revenue</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Job Status Distribution Chart */}
            {stats.job_status_distribution && stats.job_status_distribution.length > 0 && (
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                    <Card className="shadow-lg">
                        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="h-5 w-5" style={{ color: vismassColors.accent }} />
                                Job Status Distribution
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={stats.job_status_distribution}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {stats.job_status_distribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value) => [`${value || 0} jobs`, 'Count']}
                                            contentStyle={{
                                                backgroundColor: 'white',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '8px',
                                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex flex-wrap justify-center gap-4 mt-4">
                                {stats.job_status_distribution.map((entry, index) => (
                                    <div key={entry.name} className="flex items-center gap-2 text-sm">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: STATUS_COLORS[entry.name] || COLORS[index % COLORS.length] }}
                                        ></div>
                                        <span className="text-slate-600">{entry.name}: {entry.value}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Weekly Performance Bar Chart */}
                    <Card className="shadow-lg">
                        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5" style={{ color: vismassColors.success }} />
                                Weekly Performance
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.performance_chart?.slice(-7) || []}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                        <XAxis
                                            dataKey="date"
                                            stroke="#64748b"
                                            fontSize={12}
                                            tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { weekday: 'short' })}
                                        />
                                        <YAxis stroke="#64748b" fontSize={12} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'white',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '8px',
                                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                            }}
                                            labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', {
                                                weekday: 'long',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                            formatter={(value, name) => [
                                                name === 'jobs_completed' ? `${value || 0} jobs` : formatCurrency(Number(value || 0)),
                                                name === 'jobs_completed' ? 'Jobs Completed' : 'Revenue'
                                            ]}
                                        />
                                        <Bar
                                            dataKey="jobs_completed"
                                            fill={COLORS[0]}
                                            radius={[4, 4, 0, 0]}
                                            name="jobs_completed"
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Productivity Metrics Chart */}
            {stats.performance_chart && stats.performance_chart.length > 0 && (
                <Card className="shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5" style={{ color: vismassColors.accent }} />
                            Productivity Metrics
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6">
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            {/* Efficiency Trend */}
                            <div>
                                <h4 className="text-sm font-semibold text-slate-700 mb-4">Jobs Completed Trend</h4>
                                <div className="h-48">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={stats.performance_chart}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                            <XAxis
                                                dataKey="date"
                                                stroke="#64748b"
                                                fontSize={11}
                                                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            />
                                            <YAxis stroke="#64748b" fontSize={11} />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: 'white',
                                                    border: '1px solid #e2e8f0',
                                                    borderRadius: '8px',
                                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                                }}
                                                labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', {
                                                    weekday: 'short',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                                formatter={(value) => [`${value || 0} jobs`, 'Completed']}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="jobs_completed"
                                                stroke={COLORS[0]}
                                                fill={`url(#colorJobs)`}
                                                strokeWidth={2}
                                            />
                                            <defs>
                                                <linearGradient id="colorJobs" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0.1}/>
                                                </linearGradient>
                                            </defs>
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Revenue vs Jobs Correlation */}
                            <div>
                                <h4 className="text-sm font-semibold text-slate-700 mb-4">Revenue vs Jobs Completed</h4>
                                <div className="h-48">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ScatterChart data={stats.performance_chart}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                            <XAxis
                                                dataKey="jobs_completed"
                                                name="Jobs Completed"
                                                stroke="#64748b"
                                                fontSize={11}
                                            />
                                            <YAxis
                                                dataKey="revenue"
                                                name="Revenue"
                                                stroke="#64748b"
                                                fontSize={11}
                                                tickFormatter={(value) => `Rs ${(value / 1000).toFixed(0)}k`}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: 'white',
                                                    border: '1px solid #e2e8f0',
                                                    borderRadius: '8px',
                                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                                }}
                                                formatter={(value, name) => [
                                                    name === 'revenue' ? formatCurrency(Number(value || 0)) : `${value || 0} jobs`,
                                                    name === 'revenue' ? 'Revenue' : 'Jobs Completed'
                                                ]}
                                                labelFormatter={() => ''}
                                            />
                                            <Scatter
                                                name="performance"
                                                dataKey="revenue"
                                                fill={COLORS[1]}
                                            />
                                        </ScatterChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Summary Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t border-slate-200">
                            <div className="text-center">
                                <div className="text-2xl font-bold" style={{ color: COLORS[0] }}>
                                    {stats.performance_chart.reduce((sum, day) => sum + (day.jobs_completed || 0), 0)}
                                </div>
                                <div className="text-xs text-slate-600">Total Jobs (Period)</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold" style={{ color: COLORS[1] }}>
                                    {formatCurrency(stats.performance_chart.reduce((sum, day) => sum + (day.revenue || 0), 0))}
                                </div>
                                <div className="text-xs text-slate-600">Total Revenue</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold" style={{ color: vismassColors.success }}>
                                    {(stats.performance_chart.reduce((sum, day) => sum + (day.jobs_completed || 0), 0) / Math.max(stats.performance_chart.length, 1)).toFixed(1)}
                                </div>
                                <div className="text-xs text-slate-600">Avg Jobs/Day</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold" style={{ color: vismassColors.warning }}>
                                    {formatCurrency((stats.performance_chart.reduce((sum, day) => sum + (day.revenue || 0), 0) / Math.max(stats.performance_chart.reduce((sum, day) => sum + (day.jobs_completed || 0), 0), 1)))}
                                </div>
                                <div className="text-xs text-slate-600">Avg Revenue/Job</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Main Content Grid */}
            <div className="grid gap-6 lg:grid-cols-7">
                {/* My Active Jobs */}
                <Card className="lg:col-span-4 shadow-lg">
                    <CardHeader className="bg-gradient-to-r" style={{ background: `linear-gradient(135deg, ${vismassColors.primary}15, ${vismassColors.secondary}15)` }}>
                        <CardTitle className="flex items-center gap-2">
                            <Wrench className="h-5 w-5" style={{ color: vismassColors.primary }} />
                            My Active Jobs
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                    {activeJobsByDevice.length > 0 ? (
                        <>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={activeJobsByDevice} margin={{ left: 8, right: 8 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                        <XAxis dataKey="device" tick={{ fontSize: 12 }} />
                                        <YAxis allowDecimals={false} />
                                        <Tooltip formatter={(value) => [`${value} jobs`, 'Count']} />
                                        <Bar dataKey="count" fill={vismassColors.primary} radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-3">
                                {activeJobsByDevice.map((d) => (
                                    <div key={d.device} className="text-sm text-slate-600">
                                        {d.device}: <span className="font-semibold text-slate-900">{d.count}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-8">
                            <Wrench className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">No active jobs assigned. Check available jobs below!</p>
                        </div>
                    )}
                </CardContent> 
                </Card>

                {/* Available Jobs & Recent Activity */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Available Jobs */}
                    <Card className="shadow-lg">
                        <CardHeader className="bg-gradient-to-r" style={{ background: `linear-gradient(135deg, ${vismassColors.warning}15, ${vismassColors.warning}08)` }}>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5" style={{ color: vismassColors.warning }} />
                                Available Jobs
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 md:p-6">
                            {availableJobsByDevice.length > 0 ? (
                                <>
                                    <div className="h-48">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={availableJobsByDevice} layout="vertical" margin={{ left: 8, right: 8 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                                <XAxis type="number" allowDecimals={false} />
                                                <YAxis dataKey="device" type="category" width={120} tick={{ fontSize: 12 }} />
                                                <Tooltip formatter={(value) => [`${value} jobs`, 'Count']} />
                                                <Bar dataKey="count" fill={vismassColors.accent} radius={[6, 6, 6, 6]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>

                                    <div className="mt-4 text-sm text-slate-600">
                                        Total available jobs: <span className="font-semibold text-slate-900">{stats.available_jobs.length}</span>
                                    </div>

                                    {stats.available_jobs.length > 5 && (
                                        <div className="mt-4 border-t pt-3">
                                            <Link href={route('service-jobs.index', { status: 'pending' })}>
                                                <Button variant="ghost" className="w-full">View all {stats.available_jobs.length} available jobs</Button>
                                            </Link>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-8">
                                    <CheckCircle className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                                    <p className="text-sm text-muted-foreground">No pending jobs available</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Activity */}
                    {stats.recent_activities && stats.recent_activities.length > 0 && (
                        <Card className="shadow-lg">
                            <CardHeader className="bg-gradient-to-r" style={{ background: `linear-gradient(135deg, ${vismassColors.success}15, ${vismassColors.success}08)` }}>
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="h-5 w-5" style={{ color: vismassColors.success }} />
                                    Recent Activity
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {stats.recent_activities.slice(0, 5).map((activity) => (
                                        <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50">
                                            {getActivityIcon(activity.type)}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-900">{activity.description}</p>
                                                <p className="text-xs text-slate-500">
                                                    {new Date(activity.timestamp).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}

// resources/js/Pages/ServiceJobs/Index.tsx
import React, { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppSidebarLayout from '@/layouts/app/app-sidebar-layout';
import { t } from '@/lib/i18n';
import { ServiceJob, PageProps, BreadcrumbItem } from '@/types';
import { 
    Wrench, 
    Search, 
    Filter, 
    X, 
    Plus,
    Eye,
    Calendar,
    User,
    Smartphone,
    RefreshCw,
    CheckCircle2,
    UserPlus,
    MapPin
} from 'lucide-react';

interface Technician {
    id: number;
    first_name: string;
    last_name: string;
}

interface IndexProps extends PageProps {
    jobs: {
        data: ServiceJob[];
        links: any[];
    };
    filters: {
        search?: string;
        status?: string;
        start_date?: string;
        end_date?: string;
        technician_id?: string;
    };
    statuses: Record<string, string>;
    technicians: Technician[];
    stats: {
        active_jobs: number;
        total_jobs: number;
        pending: number;
        completed: number;
        in_progress: number;
        delivered: number;
        cancelled: number;
    };
}

const Index: React.FC<IndexProps> = ({ jobs, filters, statuses, technicians = [], stats, auth }) => {
    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [technicianFilter, setTechnicianFilter] = useState(filters.technician_id || 'all');
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');

    // Mirrors the backend date-column logic so the label always matches
    const getDateFilterInfo = (status: string): { label: string; color: string; description: string } => {
        if (status === 'delivered') {
            return { label: t('Delivery Date'), color: 'bg-teal-100 text-teal-700 border-teal-200', description: t('Filters by delivered_date') };
        }
        if (status === 'completed') {
            return { label: t('Completion Date'), color: 'bg-green-100 text-green-700 border-green-200', description: t('Filters by actual_completion_date') };
        }
        return { label: t('Received Date'), color: 'bg-blue-100 text-blue-700 border-blue-200', description: t('Filters by received_date') };
    };
    const dateInfo = getDateFilterInfo(statusFilter);

    // Refresh data periodically and when navigating back to this page
    useEffect(() => {
        const refreshData = () => {
            router.reload({ 
                only: ['jobs', 'stats']
            });
        };

        const handleVisibilityChange = () => {
            if (!document.hidden) {
                refreshData();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        // Auto-refresh every 30 seconds
        const interval = setInterval(refreshData, 30000);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            clearInterval(interval);
        };
    }, []);

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('Dashboard'),
            href: '/dashboard',
        },
        {
            title: t('Service Jobs'),
            href: '#',
        },
    ];

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/service-jobs', {
            search,
            status: statusFilter,
            technician_id: technicianFilter !== 'all' ? technicianFilter : undefined,
            start_date: startDate,
            end_date: endDate
        }, {
            preserveState: true,
            replace: true
        });
    };

    const clearFilters = () => {
        setSearch('');
        setStatusFilter('all');
        setTechnicianFilter('all');
        setStartDate('');
        setEndDate('');
        router.get('/service-jobs', {}, {
            preserveState: true,
            replace: true
        });
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            pending: 'bg-yellow-100 text-yellow-800',
            assigned: 'bg-blue-100 text-blue-800',
            in_progress: 'bg-purple-100 text-purple-800',
            waiting_for_parts: 'bg-orange-100 text-orange-800',
            quotation_received: 'bg-indigo-100 text-indigo-800',
            quotation_rejected: 'bg-red-100 text-red-800',
            quotation_approved: 'bg-cyan-100 text-cyan-800',
            completed: 'bg-green-100 text-green-800',
            delivered: 'bg-teal-100 text-teal-800',
            cancelled: 'bg-red-100 text-red-800',
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            pending: t('Pending'),
            assigned: t('Assigned'),
            in_progress: t('In Progress'),
            waiting_for_parts: t('Waiting for Parts'),
            quotation_received: t('Quotation Generated'),
            quotation_rejected: t('Quotation Rejected'),
            quotation_approved: t('Quotation Approved'),
            completed: t('Completed'),
            delivered: t('Delivered'),
            cancelled: t('Cancelled'),
        };
        return labels[status] || status.replace('_', ' ');
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-GB');
    };

    const formatCurrency = (amount: string | number): string => {
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        return `Rs ${numAmount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const renderJobActions = (job: ServiceJob) => {
        const userRole = (auth.user as any)?.role;
        const isTechnician = userRole && (userRole.slug === 'technician' || userRole.level === 'technician' || userRole.id === 3);

        return (
            <div className="flex flex-wrap items-center gap-2">
                <Link
                    href={`/service-jobs/${job.id}`}
                    className="inline-flex items-center text-sky-600 hover:text-sky-800"
                >
                    <Eye className="mr-1 h-3.5 w-3.5" />
                    {t('View')}
                </Link>

                {isTechnician && job.assigned_technician_id === null && (
                    <button
                        onClick={() => router.post(`/service-jobs/${job.id}/update-status`, {
                            assigned_technician_id: auth.user.id,
                            status: 'in_progress'
                        }, {
                            onSuccess: () => window.location.reload()
                        })}
                        className="inline-flex items-center bg-green-500 px-2 py-1 text-xs text-white rounded hover:bg-green-600 transition-colors duration-200"
                    >
                        <UserPlus className="mr-1 h-3.5 w-3.5" />
                        {t('Assign to Me')}
                    </button>
                )}

                {isTechnician && job.assigned_technician_id === auth.user.id && (
                    <span className="inline-flex items-center bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 rounded">
                        <UserPlus className="mr-1 h-3.5 w-3.5" />
                        {t('Assigned to You')}
                    </span>
                )}

                {job.status === 'quotation_received' && (isTechnician || userRole?.id === 1) && (
                    <div className="flex flex-wrap gap-1">
                        <button
                            onClick={() => router.post(`/service-jobs/${job.id}/update-status`, {
                                status: 'quotation_approved'
                            }, {
                                onSuccess: () => window.location.reload()
                            })}
                            className="inline-flex items-center bg-green-500 px-2 py-1 text-xs text-white rounded hover:bg-green-600 transition-colors duration-200"
                        >
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            {t('Approve')}
                        </button>
                        <button
                            onClick={() => router.post(`/service-jobs/${job.id}/update-status`, {
                                status: 'quotation_rejected'
                            }, {
                                onSuccess: () => window.location.reload()
                            })}
                            className="inline-flex items-center bg-red-500 px-2 py-1 text-xs text-white rounded hover:bg-red-600 transition-colors duration-200"
                        >
                            <X className="mr-1 h-3 w-3" />
                            {t('Reject')}
                        </button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <AppSidebarLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Service Jobs')} />
            
            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between gap-3 py-4">
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
                                    <Wrench className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="truncate text-lg sm:text-xl font-bold text-white">
                                        {t('Service Jobs')}
                                    </h1>
                                    <p className="hidden text-xs text-white/80 sm:block">
                                        {t('Manage and track all service jobs')}
                                    </p>
                                </div>
                            </div>
                            <Link
                                href="/service-jobs/create"
                                className="shrink-0 inline-flex items-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow transition-all duration-200 hover:bg-slate-100"
                            >
                                <Plus className="h-4 w-4 sm:mr-1.5" />
                                <span className="hidden sm:inline">{t('Create New Job')}</span>
                            </Link>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        {/* Stats Cards — clickable filters */}
                        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 mb-4">
                            {/* Total Jobs */}
                            <div
                                onClick={() => { setStatusFilter('all'); setTechnicianFilter('all'); router.get('/service-jobs', { search, status: 'all', start_date: startDate || undefined, end_date: endDate || undefined }, { preserveState: true, replace: true }); }}
                                className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md hover:border-vismass-blue border border-slate-200 cursor-pointer"
                            >
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue p-2 shadow-sm">
                                        <Wrench className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Total Jobs')}</p>
                                        <p className="text-lg font-bold text-gray-900">{stats.total_jobs}</p>
                                    </div>
                                </div>
                            </div>

                            {/* In Progress */}
                            <div
                                onClick={() => { setStatusFilter('in_progress'); setTechnicianFilter('all'); router.get('/service-jobs', { search, status: 'in_progress', start_date: startDate || undefined, end_date: endDate || undefined }, { preserveState: true, replace: true }); }}
                                className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md hover:border-purple-400 border border-slate-200 cursor-pointer"
                            >
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-purple-500 p-2 shadow-sm">
                                        <RefreshCw className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('In Progress')}</p>
                                        <p className="text-lg font-bold text-gray-900">{stats.in_progress}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Completed */}
                            <div
                                onClick={() => { setStatusFilter('completed'); setTechnicianFilter('all'); router.get('/service-jobs', { search, status: 'completed', start_date: startDate || undefined, end_date: endDate || undefined }, { preserveState: true, replace: true }); }}
                                className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md hover:border-green-400 border border-slate-200 cursor-pointer"
                            >
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-green-500 p-2 shadow-sm">
                                        <CheckCircle2 className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Completed')}</p>
                                        <p className="text-lg font-bold text-gray-900">{stats.completed}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Delivered */}
                            <div
                                onClick={() => { setStatusFilter('delivered'); setTechnicianFilter('all'); router.get('/service-jobs', { search, status: 'delivered', start_date: startDate || undefined, end_date: endDate || undefined }, { preserveState: true, replace: true }); }}
                                className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md hover:border-teal-400 border border-slate-200 cursor-pointer"
                            >
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-teal-500 p-2 shadow-sm">
                                        <Smartphone className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Delivered')}</p>
                                        <p className="text-lg font-bold text-gray-900">{stats.delivered}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Pending */}
                            <div
                                onClick={() => { setStatusFilter('pending'); setTechnicianFilter('all'); router.get('/service-jobs', { search, status: 'pending', start_date: startDate || undefined, end_date: endDate || undefined }, { preserveState: true, replace: true }); }}
                                className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md hover:border-yellow-400 border border-slate-200 cursor-pointer"
                            >
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-yellow-500 p-2 shadow-sm">
                                        <Calendar className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Pending')}</p>
                                        <p className="text-lg font-bold text-gray-900">{stats.pending}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Cancelled */}
                            <div
                                onClick={() => { setStatusFilter('cancelled'); setTechnicianFilter('all'); router.get('/service-jobs', { search, status: 'cancelled', start_date: startDate || undefined, end_date: endDate || undefined }, { preserveState: true, replace: true }); }}
                                className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md hover:border-red-400 border border-slate-200 cursor-pointer"
                            >
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-red-500 p-2 shadow-sm">
                                        <X className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Cancelled')}</p>
                                        <p className="text-lg font-bold text-gray-900">{stats.cancelled}</p>
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
                                            {t('Service Jobs List')}
                                        </h3>
                                        <p className="text-white/80 text-xs mt-0.5">
                                            {t('View and manage all service jobs')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4">
                                {/* Filters */}
                                <div className="bg-slate-50 p-3 rounded-lg mb-4 border border-slate-200">
                                    <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="relative">
                                                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder={t('Search by job number, customer, device, address...')}
                                                    value={search}
                                                    onChange={(e) => setSearch(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="w-full sm:w-48">
                                            <div className="relative">
                                                <Filter className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <select
                                                    value={statusFilter}
                                                    onChange={(e) => setStatusFilter(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                >
                                                    <option value="all">{t('All Status')}</option>
                                                    {Object.entries(statuses).map(([value, label]) => (
                                                        <option key={value} value={value}>
                                                            {label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Technician Filter */}
                                        {technicians.length > 0 && (
                                            <div className="w-full sm:w-48">
                                                <div className="relative">
                                                    <User className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                    <select
                                                        value={technicianFilter}
                                                        onChange={(e) => setTechnicianFilter(e.target.value)}
                                                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                    >
                                                        <option value="all">{t('All Technicians')}</option>
                                                        {technicians.map((tech) => (
                                                            <option key={tech.id} value={tech.id.toString()}>
                                                                {tech.first_name} {tech.last_name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* Date range with dynamic label */}
                                        <div className="flex flex-col gap-1 w-full sm:w-auto">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${dateInfo.color}`}
                                                    title={dateInfo.description}>
                                                    <Calendar className="mr-1 h-3 w-3" />
                                                    {dateInfo.label}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-full sm:w-36">
                                                    <input
                                                        type="date"
                                                        value={startDate}
                                                        onChange={(e) => setStartDate(e.target.value)}
                                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                        title={`${dateInfo.label} - ${t('From')}`}
                                                    />
                                                </div>
                                                <span className="text-gray-400 text-xs shrink-0">{t('to')}</span>
                                                <div className="w-full sm:w-36">
                                                    <input
                                                        type="date"
                                                        value={endDate}
                                                        onChange={(e) => setEndDate(e.target.value)}
                                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                        title={`${dateInfo.label} - ${t('To')}`}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                            <button
                                                type="submit"
                                                className="inline-flex items-center whitespace-nowrap rounded-lg bg-gradient-to-r from-sky-600 to-blue-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:from-sky-700 hover:to-blue-700"
                                            >
                                                <Search className="mr-1.5 h-3.5 w-3.5" />
                                                {t('Search')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={clearFilters}
                                                className="inline-flex items-center whitespace-nowrap rounded-lg bg-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-gray-300"
                                            >
                                                <Filter className="mr-1 h-3.5 w-3.5" />
                                                {t('Clear')}
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                {/* Jobs Table */}
                                {jobs.data.length > 0 ? (
                                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
                                                <tr>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Job #')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Customer')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Device')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Status')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Technician')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Total')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Actions')}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {jobs.data.map((job) => (
                                                    <tr key={job.id} className="hover:bg-sky-50/50 transition-colors duration-150">
                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            <div className="text-xs font-medium text-gray-900">
                                                                {job.job_number}
                                                            </div>
                                                            <div className="text-xs text-gray-500 flex items-center mt-0.5">
                                                                <Calendar className="mr-1 h-3 w-3" />
                                                                {formatDate(job.received_date)}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <div className="flex items-start">
                                                                <User className="mr-1.5 h-3.5 w-3.5 text-gray-400 mt-0.5" />
                                                                <div>
                                                                    <div className="text-xs font-medium text-gray-900">
                                                                        {job.customer_name}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500 flex items-center mt-0.5">
                                                                        <Smartphone className="mr-1 h-2.5 w-2.5 shrink-0" />
                                                                        {job.customer_phone}
                                                                    </div>
                                                                    {((job as any).customer?.addresses?.[0]?.Address || job.customer_address) && (
                                                                        <div className="text-xs text-gray-500 flex items-start mt-0.5 max-w-[200px]">
                                                                            <MapPin className="mr-1 h-2.5 w-2.5 shrink-0 mt-0.5" />
                                                                            <span className="line-clamp-1" title={(job as any).customer?.addresses?.[0]?.Address || job.customer_address}>
                                                                                {(job as any).customer?.addresses?.[0]?.Address || job.customer_address}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <div className="text-xs font-medium text-gray-900">
                                                                {job.device_name}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {job.device_model}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(job.status)}`}>
                                                                {getStatusLabel(job.status)}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <div className="text-xs text-gray-900">
                                                                {job.technician ? `${job.technician.first_name} ${job.technician.last_name}` : (job.technician_name || '-')}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap text-right text-xs font-medium text-gray-900">
                                                            {formatCurrency(job.total_amount)}
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap text-xs font-medium">
                                                            {renderJobActions(job)}
                                                        </td>
                                                    </tr>
                                                ))}

                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <div className="mx-auto h-10 w-10 text-gray-400 mb-3">
                                            <Wrench className="h-10 w-10" />
                                        </div>
                                        <h3 className="text-xs font-medium text-gray-900 mb-1.5">{t('No service jobs found')}</h3>
                                        <p className="text-xs text-gray-500 mb-3">
                                            {t('Get started by creating a new service job.')}
                                        </p>
                                        <Link
                                            href="/service-jobs/create"
                                            className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded-lg text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                                        >
                                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                                            {t('Create Service Job')}
                                        </Link>
                                    </div>
                                )}

                                {/* Pagination */}
                                {jobs.links.length > 3 && (
                                    <div className="mt-4">
                                        <div className="flex flex-wrap items-center justify-center gap-2 sm:hidden">
                                            {jobs.links.map((link, index) => (
                                                <Link
                                                    key={index}
                                                    href={link.url || '#'}
                                                    preserveScroll
                                                    className={`relative inline-flex items-center rounded-xl border px-3 py-1.5 text-xs font-medium ${
                                                        link.active
                                                            ? 'z-10 bg-sky-50 border-sky-500 text-sky-600'
                                                            : link.url
                                                                ? 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                                                : 'bg-gray-100 border-gray-200 text-gray-400 pointer-events-none'
                                                    }`}
                                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                                />
                                            ))}
                                        </div>
                                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-center">
                                            <div>
                                                <nav className="relative z-0 inline-flex rounded-xl shadow-sm -space-x-px" aria-label="Pagination">
                                                    {jobs.links.map((link, index) => (
                                                        <Link
                                                            key={index}
                                                            href={link.url || '#'}
                                                            preserveScroll
                                                            className={`relative inline-flex items-center px-4 py-2 text-sm font-medium ${
                                                                link.active
                                                                    ? 'z-10 bg-sky-50 border-sky-500 text-sky-600'
                                                                    : link.url
                                                                        ? 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                                                        : 'bg-gray-100 border-gray-200 text-gray-400 pointer-events-none'
                                                            } border rounded-xl mx-1`}
                                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                                        />
                                                    ))}
                                                </nav>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="mt-6 border-t border-sky-200 bg-gradient-to-r from-white to-sky-50">
                    <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
                        <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2">
                            <p className="text-xs text-gray-500">© VISMASS {t('Service Management')} • v1.0.0</p>
                        </div>
                    </div>
                </footer>
            </div>
        </AppSidebarLayout>
    );
};

export default Index;

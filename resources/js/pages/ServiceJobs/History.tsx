import React, { useState, useEffect, useRef } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { PageProps, ServiceJob, Technician, ServiceJobStatus, ServiceJobItem } from '@/types';
import AppSidebarLayout from '@/layouts/app/app-sidebar-layout';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Search,
    History as HistoryIcon,
    Wrench,
    User,
    Calendar,
    Plus,
    CreditCard,
    Truck,
    MapPin,
    Filter,
} from 'lucide-react';
import { t } from '@/lib/i18n';
import { BreadcrumbItem } from '@/types';
import Pagination from '@/components/pagination';

interface HistoryPageProps extends PageProps {
    jobs: {
        data: (ServiceJob & {
            customer: { AccNm: string };
            technician: Technician;
            statusHistory: (ServiceJobStatus & { changedBy: { first_name: string; last_name: string } })[];
        })[];
        links: { url: string | null; label: string; active: boolean }[];
        current_page: number;
        last_page: number;
    };
    filters: {
        search?: string;
        serial?: string;
        technician_id?: string;
        customer_accky?: string;
        per_page?: string;
    };
    technicians?: Technician[];
}

const JobHistory: React.FC<HistoryPageProps> = ({ jobs, filters, technicians = [], auth }) => {
    const [searchMode, setSearchMode] = useState<'general' | 'customer' | 'technician' | 'serial'>(
        filters.customer_accky ? 'customer' :
        filters.technician_id ? 'technician' :
        filters.serial ? 'serial' : 'general'
    );
    const [itemsPerPage, setItemsPerPage] = useState(filters.per_page || '20');

    const { data, setData } = useForm({
        search: filters.search || '',
        customer_accky: filters.customer_accky || '',
        technician_id: filters.technician_id || '',
        serial: filters.serial || '',
    });

    const [customerQuery, setCustomerQuery] = useState('');
    const [customerResults, setCustomerResults] = useState<any[]>([]);

    const [selectedJob, setSelectedJob] = useState<(ServiceJob & { items?: ServiceJobItem[]; statusHistory?: (ServiceJobStatus & { changedBy?: { first_name: string; last_name: string } })[] }) | null>(null);
    const [showDetails, setShowDetails] = useState(false);

    const initialRender = useRef(true);

    useEffect(() => {
        if (initialRender.current) {
            initialRender.current = false;
            return;
        }

        const timeoutId = setTimeout(() => {
            const queryParams: any = {
                per_page: itemsPerPage,
                page: 1,
            };

            if (searchMode === 'customer' && data.customer_accky) {
                queryParams.customer_accky = data.customer_accky;
            } else if (searchMode === 'technician' && data.technician_id) {
                queryParams.technician_id = data.technician_id;
            } else if (searchMode === 'serial' && data.serial) {
                queryParams.serial = data.serial;
            } else if (searchMode === 'general' && data.search) {
                queryParams.search = data.search;
            }

            router.get(
                '/service-jobs/history',
                queryParams,
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                }
            );
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [data.search, data.customer_accky, data.technician_id, data.serial, itemsPerPage, searchMode]);

    const handleClearFilters = () => {
        setSearchMode('general');
        setCustomerQuery('');
        setData({ search: '', customer_accky: '', technician_id: '', serial: '' });
        setItemsPerPage('20');
        
        router.get('/service-jobs/history', { per_page: '20' }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    useEffect(() => {
        let active = true;
        if (searchMode === 'customer' && customerQuery.length >= 2 && !data.customer_accky) {
            fetch(`/service-jobs/search/customers?search=${encodeURIComponent(customerQuery)}`)
                .then(res => res.json())
                .then((data) => {
                    if (!active) return;
                    setCustomerResults(data || []);
                }).catch(() => setCustomerResults([]));
        } else {
            setCustomerResults([]);
        }
        return () => { active = false; };
    }, [customerQuery, searchMode, data.customer_accky]);

    const formatCurrency = (amount: string | number | null): string => {
        if (amount === null || amount === undefined) return 'Rs 0.00';
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        return `Rs ${numAmount.toLocaleString('en-LK', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'N/A';
        return format(new Date(dateString), 'yyyy-MM-dd');
    };

    const calculateTotals = (job: ServiceJob) => {
        const partsTotal = (job.items || [])
            .filter(item => item.item_type === 'part')
            .reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        
        const serviceTotal = (job.items || [])
            .filter(item => item.item_type === 'service_charge')
            .reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        
        const subtotal = partsTotal + serviceTotal;
        const advancedPayment = parseFloat(job.advanced_payment?.toString() || '0');
        const paidAmount = parseFloat(job.paid_amount?.toString() || '0');
        const netTotal = subtotal - advancedPayment;
        const balance = job.balance_amount !== null ? parseFloat(job.balance_amount.toString()) : netTotal - paidAmount;
        
        return { partsTotal, serviceTotal, subtotal, advancedPayment, paidAmount, netTotal, balance };
    };

    const handleDeliverJob = async (jobId: number) => {
        if (!confirm(t('Are you sure you want to mark this job as delivered?'))) {
            return;
        }

        try {
            const response = await fetch(`/service-jobs/${jobId}/update-status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    status: 'delivered',
                }),
            });

            if (response.ok) {
                // Refresh the page to show updated status
                window.location.reload();
            } else {
                alert(t('Failed to update job status. Please try again.'));
            }
        } catch (error) {
            console.error('Error updating job status:', error);
            alert(t('An error occurred while updating the job status.'));
        }
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('Dashboard'), href: '/dashboard' },
        { title: t('Service Jobs'), href: '/service-jobs' },
        { title: t('Job History'), href: '#' },
    ];

    return (
        <AppSidebarLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Service Job History')} />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between gap-3 py-4">
                            <div className="flex min-w-0 items-center space-x-3">
                                <button
                                    onClick={() => window.history.back()}
                                    className="shrink-0 rounded-lg bg-white/20 p-2 transition-all duration-200 hover:bg-white/30"
                                    title="Go Back"
                                >
                                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                </button>
                                <div className="shrink-0 rounded-lg bg-white/20 p-2 shadow">
                                    <HistoryIcon className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="truncate text-lg sm:text-xl font-bold text-white">
                                        {t('Service Job History')}
                                    </h1>
                                    <p className="hidden sm:block text-xs text-white/80">
                                        {t('Search and view all service jobs')}
                                    </p>
                                </div>
                            </div>
                            {/* <Link
                                href="/service-jobs/create"
                                className="shrink-0 inline-flex items-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow transition-all duration-200 hover:bg-slate-100"
                            >
                                <Plus className="h-4 w-4 sm:mr-1.5" />
                                <span className="hidden sm:inline">{t('Create New Job')}</span>
                            </Link> */}
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        {/* Search Card */}
                        <div className="bg-slate-50 p-3 rounded-lg mb-4 border border-slate-200 shadow-sm">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                                
                                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-1">
                                    {/* Search Mode */}
                                    <div className="w-32 shrink-0">
                                        <select 
                                            value={searchMode} 
                                            onChange={e => {
                                                setSearchMode(e.target.value as any);
                                                // Reset other search fields when switching modes
                                                setData({ search: '', customer_accky: '', technician_id: '', serial: '' });
                                                setCustomerQuery('');
                                            }} 
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition bg-white"
                                        >
                                            <option value="general">{t('General')}</option>
                                            <option value="customer">{t('Customer')}</option>
                                            <option value="technician">{t('Technician')}</option>
                                            <option value="serial">{t('Serial')}</option>
                                        </select>
                                    </div>

                                    {/* Inputs based on Mode */}
                                    <div className="flex-1 min-w-[200px] relative">
                                        {searchMode === 'general' && (
                                            <>
                                                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <Input
                                                    type="text"
                                                    value={data.search}
                                                    onChange={(e: any) => setData('search', e.target.value)}
                                                    placeholder={t('Search by Job #, Serial #, Customer...')}
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue transition bg-white"
                                                />
                                            </>
                                        )}
                                        {searchMode === 'customer' && (
                                            <>
                                                <User className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <Input
                                                    type="text"
                                                    value={customerQuery}
                                                    onChange={(e: any) => { 
                                                        setCustomerQuery(e.target.value); 
                                                        setData('customer_accky', '');
                                                    }}
                                                    placeholder={t('Enter customer name or code')}
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue transition bg-white"
                                                />
                                                {customerResults.length > 0 && (
                                                    <div className="absolute z-10 bg-white border mt-1 w-full max-h-40 overflow-auto shadow-lg rounded-lg">
                                                        {customerResults.map(c => (
                                                            <div key={c.AccKy} className="p-3 hover:bg-slate-50 cursor-pointer text-gray-900 text-sm border-b border-gray-100 last:border-b-0" onClick={() => { setData('customer_accky', c.AccKy); setCustomerQuery(c.AccNm); setCustomerResults([]); }}>
                                                                <div className="font-medium">{c.AccNm}</div>
                                                                <div className="text-xs text-gray-500 mt-0.5">{t('Code')}: {c.AccCd}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        {searchMode === 'technician' && (
                                            <select 
                                                value={data.technician_id} 
                                                onChange={e => setData('technician_id', e.target.value)} 
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue transition bg-white"
                                            >
                                                <option value="">-- {t('Select Technician')} --</option>
                                                {technicians.map(tn => (
                                                    <option key={tn.id} value={tn.id}>{tn.first_name} {tn.last_name}</option>
                                                ))}
                                            </select>
                                        )}
                                        {searchMode === 'serial' && (
                                            <>
                                                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <Input
                                                    type="text"
                                                    value={data.serial}
                                                    onChange={(e: any) => setData('serial', e.target.value)}
                                                    placeholder={t('Enter device serial')}
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue transition bg-white"
                                                />
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Per Page + Clear */}
                                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
                                    <div className="w-28">
                                        <select
                                            value={itemsPerPage}
                                            onChange={(e) => setItemsPerPage(e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-vismass-blue focus:ring-2 focus:ring-vismass-blue/20"
                                        >
                                            <option value="15">15 / {t('Page')}</option>
                                            <option value="20">20 / {t('Page')}</option>
                                            <option value="50">50 / {t('Page')}</option>
                                            <option value="100">100 / {t('Page')}</option>
                                        </select>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleClearFilters}
                                        className="inline-flex items-center bg-gray-200 text-gray-700 px-3 py-2 text-sm rounded-lg hover:bg-gray-300 transition-all duration-200 font-medium whitespace-nowrap"
                                    >
                                        <Filter className="mr-1 h-3.5 w-3.5" />
                                        {t('Clear')}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Results Card */}
                        <div className="rounded-lg border border-slate-200 bg-white shadow overflow-hidden">
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 py-3">
                                <h2 className="text-base font-semibold text-white">
                                    {t('Service Jobs')}
                                </h2>
                                <p className="text-white/80 text-xs mt-0.5">
                                    {t('All service jobs in the system')}
                                </p>
                            </div>

                            <div className="p-4">
                                {jobs.data.length > 0 ? (
                                    <>
                                        <div className="space-y-3 md:hidden">
                                            {jobs.data.map(job => (
                                                <div key={job.id} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedJob(job);
                                                                    setShowDetails(true);
                                                                }}
                                                                className="truncate text-sm font-semibold text-sky-700 hover:underline"
                                                            >
                                                                {job.job_number}
                                                            </button>
                                                            <p className="mt-0.5 text-xs text-gray-500">{formatDate(job.created_at)}</p>
                                                        </div>
                                                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                                                            job.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                                                            job.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-slate-100 text-slate-600'
                                                        }`}>
                                                            {t(job.status || 'pending')}
                                                        </span>
                                                    </div>

                                                    <div className="mt-2 space-y-1.5 text-xs text-gray-700">
                                                        <p><span className="font-medium">{t('Customer')}:</span> {job.customer_name}</p>
                                                        {((job as any).customer?.addresses?.[0]?.Address || job.customer_address) && (
                                                            <p><span className="font-medium">{t('Address')}:</span> {(job as any).customer?.addresses?.[0]?.Address || job.customer_address}</p>
                                                        )}
                                                        <p><span className="font-medium">{t('Device Serial')}:</span> <span className="font-mono">{job.device_serial || 'N/A'}</span></p>
                                                        <p><span className="font-medium">{t('Technician')}:</span> {job.technician ? `${job.technician.first_name}` : 'N/A'}</p>
                                                        <p><span className="font-medium">{t('Completed')}:</span> {formatDate(job.actual_completion_date)}</p>
                                                        {job.delivered_date && (
                                                            <p><span className="font-medium">{t('Delivered')}:</span> {formatDate(job.delivered_date)}</p>
                                                        )}
                                                        <p className="font-bold text-gray-900 border-t border-gray-100 pt-1 mt-1 flex justify-between items-center">
                                                            <span>{t('Total')}:</span>
                                                            <span className="text-vismass-blue">{formatCurrency(job.total_amount)}</span>
                                                        </p>
                                                    </div>

                                                    <div className="mt-3 flex items-center gap-3 border-t border-gray-100 pt-2">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedJob(job);
                                                                setShowDetails(true);
                                                            }}
                                                            className="inline-flex items-center text-xs font-medium text-sky-600 hover:text-sky-800"
                                                        >
                                                            <Wrench className="mr-1 h-3.5 w-3.5" />
                                                            {t('View')}
                                                        </button>
                                                        {job.status === 'completed' && (function() {
                                                            const slug = auth?.user?.role?.slug;
                                                            return slug === 'cashier' || slug?.endsWith('_cashier');
                                                        })() && (
                                                            <button
                                                                onClick={() => handleDeliverJob(job.id)}
                                                                className="inline-flex items-center text-xs font-medium text-emerald-600 hover:text-emerald-800"
                                                                title={t('Mark as Delivered')}
                                                            >
                                                                <Truck className="mr-1 h-3.5 w-3.5" />
                                                                {t('Deliver')}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="hidden overflow-x-auto rounded-lg border border-gray-200 md:block">
                                        <table className="min-w-[980px] divide-y divide-gray-200">
                                            <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
                                                <tr>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Job #')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Customer')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Device Serial')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Status')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Technician')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Completed')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Total')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Actions')}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {jobs.data.map(job => (
                                                    <tr key={job.id} className="hover:bg-sky-50/50 transition-colors duration-150">
                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            <div className="text-xs font-medium text-gray-900">
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedJob(job);
                                                                        setShowDetails(true);
                                                                    }}
                                                                    className="text-vismass-blue font-bold hover:text-sky-800 cursor-pointer hover:underline"
                                                                >
                                                                    {job.job_number}
                                                                </button>
                                                            </div>
                                                            <div className="text-xs text-gray-500 flex items-center mt-0.5">
                                                                <Calendar className="mr-1 h-3 w-3" />
                                                                {formatDate(job.created_at)}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <div className="flex items-start">
                                                                <User className="mr-1.5 h-3.5 w-3.5 text-gray-400 mt-0.5" />
                                                                <div>
                                                                    <div className="text-xs font-medium text-gray-900">
                                                                        {job.customer_name}
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
                                                        <td className="px-4 py-2.5 text-xs text-slate-500 font-mono">
                                                            {job.device_serial || 'N/A'}
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border ${
                                                                job.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                                job.status === 'completed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                                'bg-slate-50 text-slate-600 border-slate-200'
                                                            }`}>
                                                                {t(job.status || 'pending').toUpperCase()}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <div className="text-xs text-gray-900">
                                                                {job.technician ? (
                                                                    `${job.technician.first_name}`
                                                                ) : <span className="text-slate-400">N/A</span>}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5 text-xs text-gray-900">
                                                            {formatDate(job.actual_completion_date)}
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap text-xs font-bold text-gray-900 text-right">
                                                            {formatCurrency(job.total_amount)}
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap text-xs font-medium">
                                                            <div className="flex items-center justify-center space-x-2">
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedJob(job);
                                                                        setShowDetails(true);
                                                                    }}
                                                                    className="inline-flex items-center text-sky-600 hover:text-sky-800"
                                                                >
                                                                    <Wrench className="mr-1 h-3.5 w-3.5" />
                                                                    {/* {t('View')} */}
                                                                </button>
                                                                {job.status === 'completed' && (function() {
                                                                    const slug = auth?.user?.role?.slug;
                                                                    return slug === 'cashier' || slug?.endsWith('_cashier');
                                                                })() && (
                                                                    <button
                                                                        onClick={() => handleDeliverJob(job.id)}
                                                                        className="inline-flex items-center text-emerald-600 hover:text-emerald-800"
                                                                        title={t('Mark as Delivered')}
                                                                    >
                                                                        <Truck className="h-3.5 w-3.5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    </>
                                ) : (
                                    <div className="text-center py-8">
                                        <div className="mx-auto h-10 w-10 text-gray-400 mb-3">
                                            <HistoryIcon className="h-10 w-10" />
                                        </div>
                                        <h3 className="text-xs font-medium text-gray-900 mb-1.5">{t('No service jobs found')}</h3>
                                        <p className="text-xs text-gray-500 mb-3">
                                            {t('Try adjusting your search criteria or create a new service job.')}
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
                                <div className="p-4 border-t border-slate-200">
                                    <Pagination links={jobs.links as any} meta={jobs as any} />
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="mt-6 border-t border-sky-200 bg-gradient-to-r from-white to-sky-50">
                    <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
                        <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2">
                            <p className="text-xs text-gray-500">© VISMASS {t('Service Job History')} • v1.0.0</p>
                        </div>
                    </div>
                </footer>
            </div>

            {/* Job Details Modal */}
            <Dialog open={showDetails} onOpenChange={setShowDetails}>
                <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center space-x-2">
                            <Wrench className="w-5 h-5 text-sky-600" />
                            <span>{t('Service Job Details')}</span>
                        </DialogTitle>
                    </DialogHeader>

                    {selectedJob && (
                        <div className="space-y-6">
                            {/* Job Header */}
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-xs font-medium text-gray-600">{t('Job Number')}</label>
                                        <p className="text-sm font-semibold text-gray-900 mt-1">{selectedJob.job_number}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-gray-600">{t('Status')}</label>
                                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full mt-1 ${
                                            selectedJob.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                                            selectedJob.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                            'bg-slate-100 text-slate-600'
                                        }`}>
                                            {t(selectedJob.status || 'pending')}
                                        </span>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-gray-600">{t('Total Amount')}</label>
                                        <p className="text-sm font-semibold text-gray-900 mt-1">{formatCurrency(selectedJob.total_amount)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Summary Card */}
                            <div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                                <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 py-2.5">
                                    <div className="flex items-center">
                                        <CreditCard className="mr-2 h-4 w-4 text-white" />
                                        <h3 className="text-base font-semibold text-white">
                                            {t('Payment Summary')}
                                        </h3>
                                    </div>
                                </div>
                                <div className="p-4">
                                    {(() => {
                                        const totals = calculateTotals(selectedJob);
                                        return (
                                            <div className="space-y-1.5 mb-3 text-xs">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-600">{t('Parts Total')}:</span>
                                                    <span className="font-medium text-gray-900">{formatCurrency(totals.partsTotal)}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-600">{t('Service Charges')}:</span>
                                                    <span className="font-medium text-gray-900">{formatCurrency(totals.serviceTotal)}</span>
                                                </div>
                                                <div className="flex justify-between items-center border-t border-slate-100 pt-1.5 mt-1">
                                                    <span className="text-gray-700 font-medium text-xs">{t('Subtotal')}:</span>
                                                    <span className="font-semibold text-gray-900 text-xs">{formatCurrency(totals.subtotal)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="text-gray-600">{t('Less: Advanced Payment')}:</span>
                                                    <span className="font-medium text-red-600 text-xs">{formatCurrency(-totals.advancedPayment)}</span>
                                                </div>
                                                <div className="flex justify-between items-center border-t border-slate-100 pt-1.5 bg-blue-50 -mx-4 px-4 py-1.5">
                                                    <span className="text-gray-800 font-semibold text-xs">{t('Amount Due')}:</span>
                                                    <span className="font-bold text-vismass-blue text-xs">{formatCurrency(totals.netTotal)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs mt-2">
                                                    <span className="text-gray-600">{t('Additional Payments')}:</span>
                                                    <span className="font-medium text-emerald-600">{formatCurrency(selectedJob.paid_amount)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs bg-emerald-50 -mx-4 px-4 py-1">
                                                    <span className="text-gray-600">{t('Total Paid (Advance + Additional)')}:</span>
                                                    <span className="font-semibold text-emerald-700">{formatCurrency(totals.advancedPayment + (parseFloat(selectedJob.paid_amount?.toString() || '0')))}</span>
                                                </div>
                                                <div className="flex justify-between items-center border-t-2 border-slate-200 pt-1.5 bg-slate-50 -mx-4 px-4 py-2 rounded-b-xl">
                                                    <span className="text-gray-800 font-bold text-xs">{t('Outstanding Balance')}:</span>
                                                    <span className={`font-bold text-sm ${totals.netTotal - parseFloat(selectedJob.paid_amount?.toString() || '0') > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                                        {formatCurrency(totals.netTotal - parseFloat(selectedJob.paid_amount?.toString() || '0'))}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Customer Information */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm flex items-center space-x-2">
                                        <User className="w-4 h-4" />
                                        <span>{t('Customer Information')}</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <label className="text-xs font-medium text-gray-600">{t('Name')}</label>
                                        <p className="text-gray-900 mt-1">{selectedJob.customer_name}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-gray-600">{t('Phone')}</label>
                                        <p className="text-gray-900 mt-1">{selectedJob.customer_phone || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-gray-600">{t('Email')}</label>
                                        <p className="text-gray-900 mt-1">{selectedJob.customer_email || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-gray-600">{t('Address')}</label>
                                        <p className="text-gray-900 mt-1">{selectedJob.customer_address || 'N/A'}</p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Device Information */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm flex items-center space-x-2">
                                        <Wrench className="w-4 h-4" />
                                        <span>{t('Device Information')}</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <label className="text-xs font-medium text-gray-600">{t('Brand')}</label>
                                        <p className="text-gray-900 mt-1">{selectedJob.device_brand || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-gray-600">{t('Model')}</label>
                                        <p className="text-gray-900 mt-1">{selectedJob.device_model || 'N/A'}</p>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-xs font-medium text-gray-600">{t('Serial Number')}</label>
                                        <p className="text-gray-900 font-mono mt-1">{selectedJob.device_serial || 'N/A'}</p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Service Items */}
                            {selectedJob.items && selectedJob.items.length > 0 && (
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm flex items-center space-x-2">
                                            <Wrench className="w-4 h-4" />
                                            <span>{t('Service Items')}</span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="text-xs">{t('Item')}</TableHead>
                                                    <TableHead className="text-xs">{t('Quantity')}</TableHead>
                                                    <TableHead className="text-xs">{t('Unit Price')}</TableHead>
                                                    <TableHead className="text-xs">{t('Total')}</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {selectedJob.items.map((item, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell className="text-xs">{item.item_name || 'N/A'}</TableCell>
                                                        <TableCell className="text-xs">{item.quantity}</TableCell>
                                                        <TableCell className="text-xs">{formatCurrency(item.unit_price)}</TableCell>
                                                        <TableCell className="text-xs">{formatCurrency(item.total_price)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </AppSidebarLayout>
    );
};

export default JobHistory;

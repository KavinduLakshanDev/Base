import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
//   AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
    CheckCircle,
    Download,
    Edit,
    Eye,
    Filter,
    Mail,
    MapPin,
    Phone,
    Plus,
    Printer,
    Power,
    PowerOff,
    Search,
    Trash2,
    User,
    Users,
    XCircle,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

import { t } from '@/lib/i18n';
import { create, show, edit } from '@/routes/admin/customers';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: t('Dashboard'),
        href: '/dashboard',
    },
    {
        title: t('Admin'),
        href: '#',
    },
    {
        title: t('Customer Management'),
        href: '#',
    },
];

interface Customer {
    AdrKy: number;
    AdrCd: string;
    FstNm: string;
    CPerson?: string;
    EMail?: string;
    TP1?: string;
    Address?: string;
    Country?: string;
    flnAct: boolean;
    full_name: string;
    formatted_address: string;
    CurBal?: number;
    CrLmt?: number;
    BRNo?: string;
    TINNo?: string;
}

interface Filters {
    search?: string;
    status?: string;
    per_page?: string;
    company_code?: string;
    branch_code?: string;
}

interface Props {
    customers: {
        data: Customer[];
        links: any[];
        meta: any;
        from?: number;
        to?: number;
        total?: number;
        current_page?: number;
        last_page?: number;
        first_page_url?: string;
        last_page_url?: string;
        prev_page_url?: string;
        next_page_url?: string;
    };
    filters: Filters;
    companies: Array<{
        value: string;
        label: string;
    }>;
    branches: Array<{
        value: string;
        label: string;
    }>;
    stats: {
        total: number;
        active: number;
        inactive: number;
    };
    flash?: {
        success?: string;
        error?: string;
    };
}

export default function CustomerIndex({ customers, filters, companies, branches, flash, stats }: Props) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [selectedStatus, setSelectedStatus] = useState(filters.status || '');
    const [itemsPerPage, setItemsPerPage] = useState(filters.per_page || '10');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
    const [deleteProcessing, setDeleteProcessing] = useState(false);

    // toggle dialog state
    const [showToggleDialog, setShowToggleDialog] = useState(false);
    const [customerToToggle, setCustomerToToggle] = useState<Customer | null>(null);
    const [toggleProcessing, setToggleProcessing] = useState(false);

    const initialRender = useRef(true);

    useEffect(() => {
        if (initialRender.current) {
            initialRender.current = false;
            return;
        }

        const delayDebounceFn = setTimeout(() => {
            router.get(
                '/admin/customers',
                {
                    search: searchTerm,
                    status: selectedStatus,
                    per_page: itemsPerPage,
                    page: 1, // Reset to page 1 on filter change
                },
                {
                    preserveState: true,
                    replace: true,
                    preserveScroll: true,
                },
            );
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, selectedStatus, itemsPerPage]);

    // Reset the customerToToggle reference when dialog is closed
    useEffect(() => {
        if (!showToggleDialog) {
            setCustomerToToggle(null);
        }
    }, [showToggleDialog]);

    const clearFilters = () => {
        setSearchTerm('');
        setSelectedStatus('');
        setItemsPerPage('10');
    };

    const handleDelete = (customer: Customer) => {
        setCustomerToDelete(customer);
        setIsDeleteModalOpen(true);
    };

    const handleToggleStatus = (customer: Customer) => {
        setCustomerToToggle(customer);
        setShowToggleDialog(true);
    };

    const confirmToggle = () => {
        if (!customerToToggle) {
            setShowToggleDialog(false);
            return;
        }
        setToggleProcessing(true);
        router.post(`/admin/customers/${customerToToggle.AdrKy}/toggle`, {}, {
            preserveScroll: true,
            onFinish: () => {
                setToggleProcessing(false);
                setShowToggleDialog(false);
                setCustomerToToggle(null);
            },
        });
    };

    const confirmDelete = () => {
        if (customerToDelete) {
            setDeleteProcessing(true);
            router.delete(`/admin/customers/${customerToDelete.AdrKy}`, {
                preserveScroll: true,
                onSuccess: () => {
                    setIsDeleteModalOpen(false);
                    setCustomerToDelete(null);
                    setDeleteProcessing(false);
                },
                onError: (errors) => {
                    console.error('Delete error:', errors);
                    alert('Failed to delete customer. Please try again.');
                    setDeleteProcessing(false);
                },
                onFinish: () => {
                    setDeleteProcessing(false);
                },
            });
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExportCsv = () => {
        const queryParams = new URLSearchParams();
        if (searchTerm) queryParams.append('search', searchTerm);
        if (selectedStatus) queryParams.append('status', selectedStatus);
        
        window.location.href = `/admin/customers/export?${queryParams.toString()}`;
    };

    const safeCustomers = {
        data: Array.isArray(customers?.data) ? customers.data : [],
        links: Array.isArray(customers?.links) ? customers.links : [],
        meta: customers?.meta || {
            from: customers?.from || 0,
            to: customers?.to || 0,
            total: customers?.total || 0,
            current_page: customers?.current_page || 1,
            last_page: customers?.last_page || 1,
        },
    };

    const safeCompanies = Array.isArray(companies) ? companies : [];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Customer Management - Admin')}>
                <style>{`
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        #printable-area, #printable-area * {
                            visibility: visible;
                        }
                        #printable-area {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                        }
                        .print-hidden {
                            display: none !important;
                        }
                        .print-header {
                            display: block !important;
                            margin-bottom: 20px;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                        }
                        th, td {
                            border: 1px solid #ddd;
                            padding: 8px;
                            text-align: left;
                        }
                        th {
                            background-color: #f8f9fa !important;
                            color: #333 !important;
                            -webkit-print-color-adjust: exact;
                        }
                    }
                `}</style>
            </Head>

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4 gap-3">
                            <div className="flex items-center space-x-3 min-w-0">
                                <button
                                    onClick={() => window.history.back()}
                                    className="shrink-0 rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                    title={t('Go Back')}
                                >
                                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                </button>
                                <div className="shrink-0 rounded-lg bg-white/20 p-2 shadow">
                                    <Users className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-lg sm:text-xl font-bold text-white truncate">
                                        {t('Customer Management')}
                                    </h1>
                                    <p className="text-xs text-white/80 hidden sm:block">
                                        {t('Manage customer information and relationships')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleExportCsv}
                                    className="shrink-0 inline-flex items-center rounded-lg bg-emerald-600 px-3 sm:px-4 py-2 text-sm font-medium text-white shadow hover:bg-emerald-700 transition-all duration-200"
                                >
                                    <Download className="h-4 w-4 sm:mr-1.5" />
                                    <span className="hidden sm:inline">{t('Export CSV')}</span>
                                </button>
                                <button
                                    onClick={handlePrint}
                                    className="shrink-0 inline-flex items-center rounded-lg bg-rose-600 px-3 sm:px-4 py-2 text-sm font-medium text-white shadow hover:bg-rose-700 transition-all duration-200"
                                >
                                    <Printer className="h-4 w-4 sm:mr-1.5" />
                                    <span className="hidden sm:inline">{t('Download PDF')}</span>
                                </button>
                                <Link
                                    href={create().url}
                                    className="shrink-0 inline-flex items-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                                >
                                    <Plus className="h-4 w-4 sm:mr-1.5" />
                                    <span className="hidden sm:inline">{t('Create Customer')}</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content Area */}
                <div className="mx-auto max-w-7xl py-8 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">

                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue p-2 shadow-sm">
                                        <Users className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Total Customers')}</p>
                                        <p className="text-lg font-bold text-gray-900">
                                            {stats.total}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-green-500 p-2 shadow-sm">
                                        <Power className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Active Customers')}</p>
                                        <p className="text-lg font-bold text-gray-900">
                                            {stats.active}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-red-500 p-2 shadow-sm">
                                        <PowerOff className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Inactive Customers')}</p>
                                        <p className="text-lg font-bold text-gray-900">
                                            {stats.inactive}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-purple-500 p-2 shadow-sm">
                                        <User className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Companies')}</p>
                                        <p className="text-lg font-bold text-gray-900">
                                            {safeCompanies.length}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Content Card */}
                        <div className="rounded-lg border border-slate-200 bg-white shadow overflow-hidden">
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 py-3">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">
                                            {t('Customer Management')}
                                        </h3>
                                        <p className="text-white/80 text-sm mt-1">
                                            {t('Browse and manage customer information and relationships')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6">
                                {/* Success/Error Messages */}
                                {flash?.success && (
                                    <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 shadow-sm">
                                        <div className="flex">
                                            <div className="shrink-0">
                                                <CheckCircle className="h-4 w-4 text-green-600" />
                                            </div>
                                            <div className="ml-2">
                                                <p className="text-xs font-semibold text-green-800">{flash.success}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {flash?.error && (
                                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 shadow-sm">
                                        <div className="flex">
                                            <div className="shrink-0">
                                                <XCircle className="h-4 w-4 text-red-600" />
                                            </div>
                                            <div className="ml-2">
                                                <p className="text-xs font-semibold text-red-800">{flash.error}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {/* Filters */}
                                <div className="bg-slate-50 p-3 rounded-lg mb-4 border border-slate-200">
                                    <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                                        <div className="flex-1">
                                            <div className="relative">
                                                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder={t('Search by name, email, phone...')}
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                />
                                            </div>
                                        </div>

                                        <div className="md:w-32">
                                            <div className="relative">
                                                <select
                                                    value={itemsPerPage}
                                                    onChange={(e) => setItemsPerPage(e.target.value)}
                                                    className="w-full pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition appearance-none"
                                                >
                                                    <option value="10">10 / {t('page')}</option>
                                                    <option value="25">25 / {t('page')}</option>
                                                    <option value="50">50 / {t('page')}</option>
                                                    <option value="100">100 / {t('page')}</option>
                                                </select>
                                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="md:w-40">
                                            <div className="relative">
                                                <Filter className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <select
                                                    value={selectedStatus}
                                                    onChange={(e) => setSelectedStatus(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                >
                                                    <option value="">{t('All Status')}</option>
                                                    <option value="active">{t('Active')}</option>
                                                    <option value="inactive">{t('Inactive')}</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="flex space-x-2">
                                            <button
                                                type="button"
                                                onClick={clearFilters}
                                                className="inline-flex items-center bg-gray-200 text-gray-700 px-4 py-2 text-sm rounded-lg hover:bg-gray-300 transition-all duration-200 font-medium"
                                            >
                                                <Filter className="mr-1.5 h-3.5 w-3.5" />
                                                {t('Clear')}
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                <div id="printable-area" className="overflow-x-auto rounded-lg border border-gray-200">
                                    <div className="hidden print:block print-header text-center mb-6">
                                        <h2 className="text-2xl font-bold mb-2">{t('Customer List')}</h2>
                                        <p className="text-gray-600">{new Date().toLocaleDateString('en-GB')}</p>
                                    </div>
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
                                            <tr>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                    {t('Code')}
                                                </th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                    {t('Name')}
                                                </th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                    {t('Business Name')}
                                                </th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                    {t('BR No')}
                                                </th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                    {t('TIN No')}
                                                </th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                    {t('Contact')}
                                                </th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                    {t('Balance')}
                                                </th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                    {t('Limit')}
                                                </th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                    {t('Status')}
                                                </th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider print-hidden">
                                                    {t('Actions')}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {safeCustomers.data.length > 0 ? (
                                                safeCustomers.data.map((customer) => (
                                                    <tr key={customer.AdrKy} className="hover:bg-sky-50/50 transition-colors duration-150">
                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            <div className="text-xs font-medium text-gray-900">{customer.AdrCd}</div>
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <div className="text-xs font-medium text-gray-900">{customer.full_name}</div>
                                                            <div className="text-xs text-gray-500 flex items-center mt-0.5">
                                                                <MapPin className="mr-1 h-3 w-3" />
                                                                {customer.formatted_address || '-'}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            <div className="text-xs text-gray-900">{customer.CPerson || '-'}</div>
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            <div className="text-xs text-gray-900">{customer.BRNo || '-'}</div>
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            <div className="text-xs text-gray-900">{customer.TINNo || '-'}</div>
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            <div className="text-xs text-gray-900">
                                                                {customer.EMail && (
                                                                    <div className="flex items-center mb-0.5">
                                                                        <Mail className="mr-1 h-3 w-3 text-gray-400" />
                                                                        <span className="truncate max-w-[120px]">{customer.EMail}</span>
                                                                    </div>
                                                                )}
                                                                {customer.TP1 && (
                                                                    <div className="flex items-center">
                                                                        <Phone className="mr-1 h-3 w-3 text-gray-400" />
                                                                        <span>{customer.TP1}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            <div className={`text-xs font-semibold ${(customer.CurBal || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                                Rs. {Number(customer.CurBal || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            <div className="text-xs text-gray-600">
                                                                Rs. {Number(customer.CrLmt || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${customer.flnAct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                                {customer.flnAct ? t('Active') : t('Inactive')}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap text-xs font-medium text-right print-hidden">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <Link
                                                                    href={show(customer.AdrKy).url}
                                                                    className="inline-flex items-center p-1.5 rounded-md text-sky-600 hover:text-sky-800 hover:bg-sky-50 transition-colors"
                                                                    title={t('View')}
                                                                >
                                                                    <Eye className="h-4 w-4" />
                                                                </Link>
                                                                <Link
                                                                    href={edit(customer.AdrKy).url}
                                                                    className="inline-flex items-center p-1.5 rounded-md text-amber-600 hover:text-amber-800 hover:bg-amber-50 transition-colors"
                                                                    title={t('Edit')}
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                </Link>
                                                                <button
                                                                    onClick={() => handleToggleStatus(customer)}
                                                                    className={`inline-flex items-center p-1.5 rounded-md ${customer.flnAct ? 'text-red-600 hover:text-red-800 hover:bg-red-50' : 'text-green-600 hover:text-green-800 hover:bg-green-50'}`}
                                                                    title={customer.flnAct ? t('Deactivate') : t('Activate')}
                                                                >
                                                                    {customer.flnAct ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                                                                </button>
                                                                {/* <button
                                                                    onClick={() => handleDelete(customer)}
                                                                    className="inline-flex items-center p-1.5 rounded-md text-red-600 hover:text-red-800 hover:bg-red-50 transition-colors"
                                                                    title={t('Delete')}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button> */}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={5} className="text-center py-12">
                                                        <div className="mx-auto h-10 w-10 text-gray-400 mb-3">
                                                            <Users className="h-10 w-10" />
                                                        </div>
                                                        <h3 className="text-xs font-medium text-gray-900 mb-1.5">{t('No customers found')}</h3>
                                                        <p className="text-xs text-gray-500 mb-3">
                                                            {t('Get started by creating a new customer.')}
                                                        </p>
                                                        <Link
                                                            href={create().url}
                                                            className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded-lg text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                                                        >
                                                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                                                            {t('Create Customer')}
                                                        </Link>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                {safeCustomers.data.length > 0 && (
                                    <div className="border-t border-gray-200 px-6 py-4 dark:border-gray-700">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                {t('Showing')} {safeCustomers.meta.from || 0} {t('to')}{' '}
                                                {safeCustomers.meta.to || 0} {t('of')}{' '}
                                                {safeCustomers.meta.total || 0} {t('results')}
                                            </div>
                                            <div className="flex space-x-2">
                                                {safeCustomers.links.map((link: any, index: number) => (
                                                    <button
                                                        key={index}
                                                        onClick={() =>
                                                            link.url &&
                                                            router.visit(link.url, {
                                                                preserveScroll: true,
                                                                preserveState: true,
                                                            })
                                                        }
                                                        disabled={!link.url}
                                                        className={`rounded px-3 py-1 text-sm ${link.active
                                                            ? 'bg-blue-600 text-white'
                                                            : link.url
                                                                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                                                                : 'cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                                                            }`}
                                                        dangerouslySetInnerHTML={{
                                                            __html: link.label,
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Toggle Confirmation Dialog */}
                <AlertDialog open={showToggleDialog} onOpenChange={setShowToggleDialog}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{t('Change Customer Status')}</AlertDialogTitle>
                            <AlertDialogDescription>
                                {customerToToggle && (
                                    <>
                                        {t('Are you sure you want to')}{' '}
                                        <span className="font-semibold text-gray-900">
                                            {customerToToggle.flnAct ? t('deactivate') : t('activate')}
                                        </span>{' '}
                                        {t('customer')} "{customerToToggle.full_name}"?{' '}
                                        {t('This will also activate or deactivate any linked privilege account.')} 
                                    </>
                                )}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel asChild>
                                <Button variant="outline" className="w-full sm:w-auto">
                                    {t('Cancel')}
                                </Button>
                            </AlertDialogCancel>
                            <AlertDialogAction asChild>
                                <Button variant="destructive" className="w-full sm:w-auto" disabled={toggleProcessing} onClick={confirmToggle}>
                                    {toggleProcessing ? t('Processing...') : t('Confirm')}
                                </Button>
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Delete Confirmation Dialog */}
                <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{t('Delete Customer')}</AlertDialogTitle>
                        </AlertDialogHeader>
                        <AlertDialogDescription>
                            {t('Are you sure you want to delete customer')} "{customerToDelete?.full_name}"? {t('This action cannot be undone.')}
                        </AlertDialogDescription>
                        <AlertDialogFooter>
                            <AlertDialogCancel asChild>
                                <Button variant="outline" className="w-full sm:w-auto">
                                    {t('Cancel')}
                                </Button>
                            </AlertDialogCancel>
                            <AlertDialogAction asChild>
                                <Button variant="destructive" className="w-full sm:w-auto" disabled={deleteProcessing} onClick={confirmDelete}>
                                    {deleteProcessing ? t('Deleting...') : t('Delete')}
                                </Button>
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Footer */}
                <footer className="mt-6 border-t border-sky-200 bg-gradient-to-r from-white to-sky-50">
                    <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
                        <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2">
                            <p className="text-xs text-gray-500">© VISMASS {t('Customer Management')} • v1.0.0</p>
                        </div>
                    </div>
                </footer>
            </div>
        </AppLayout>
    );
}

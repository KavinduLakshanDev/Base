import AppLayout from '@/layouts/app-layout';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    CheckCircle,
    Edit,
    Eye,
    Filter,
    Plus,
    Search,
    Building2,
    CreditCard,
    XCircle,
    RefreshCw,
    CheckCircle2,
    Power,
    PowerOff,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

import { t } from '@/lib/i18n';

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
        title: t('Accounts Management'),
        href: '#',
    },
];

interface BankAccount {
    id: number;
    account_name: string;
    account_number: string;
    bank_name: string;
    branch_name: string;
    account_type: string;
    opening_balance: number;
    current_balance: number;
    currency: string;
    status: string;
    company_code: string;
    section_code: string;
    created_at: string;
    creator?: {
        name: string;
    };
    company?: {
        company_name: string;
    };
    section?: {
        name: string;
    };
}

interface Filters {
    search?: string;
    status?: string;
}

interface Props {
    bankAccounts: {
        data: BankAccount[];
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
    flash?: {
        success?: string;
        error?: string;
    };
}

export default function BankAccountIndex({ bankAccounts, filters, flash }: Props) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [selectedStatus, setSelectedStatus] = useState(filters.status || '');
    const [toggleModal, setToggleModal] = useState<{ show: boolean; account: BankAccount | null }>({
        show: false,
        account: null,
    });
    const [toggleProcessing, setToggleProcessing] = useState(false);
    const initialRender = useRef(true);

    const handleToggleStatus = (account: BankAccount) => {
        setToggleModal({ show: true, account });
    };

    const confirmToggle = () => {
        if (toggleModal.account) {
            setToggleProcessing(true);
            router.patch(`/admin/bank-accounts/${toggleModal.account.id}/toggle-status`, {}, {
                onSuccess: () => {
                    setToggleModal({ show: false, account: null });
                },
                onError: () => {
                    setToggleModal({ show: false, account: null });
                },
                onFinish: () => {
                    setToggleProcessing(false);
                },
            });
        }
    };

    useEffect(() => {
        if (initialRender.current) {
            initialRender.current = false;
            return;
        }

        const delayDebounceFn = setTimeout(() => {
            router.get(
                '/admin/bank-accounts',
                {
                    search: searchTerm,
                    status: selectedStatus,
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
    }, [searchTerm, selectedStatus]);

    const clearFilters = () => {
        setSearchTerm('');
        setSelectedStatus('');
    };

    // Calculate stats
    const totalAccounts = bankAccounts.data.length;
    const activeAccounts = bankAccounts.data.filter(account => account.status === 'active').length;
    const inactiveAccounts = bankAccounts.data.filter(account => account.status === 'inactive').length;
    const closedAccounts = bankAccounts.data.filter(account => account.status === 'closed').length;

    // deletion handlers removed; use toggleStatus instead

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {t('Active')}
                    </span>
                );
            case 'inactive':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <XCircle className="w-3 h-3 mr-1" />
                        {t('Inactive')}
                    </span>
                );
            case 'closed':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <XCircle className="w-3 h-3 mr-1" />
                        {t('Closed')}
                    </span>
                );
            default:
                return null;
        }
    };

    const getAccountTypeBadge = (type: string) => {
        const colors = {
            savings: 'bg-blue-100 text-blue-800',
            current: 'bg-purple-100 text-purple-800',
            checking: 'bg-indigo-100 text-indigo-800',
        };

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
                {t(type.charAt(0).toUpperCase() + type.slice(1))}
            </span>
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Accounts Management')} />
            
            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4">
                            <div className="flex items-center space-x-3">
                                <button
                                    onClick={() => window.history.back()}
                                    className="rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                    title="Go Back"
                                >
                                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                </button>
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <Building2 className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">
                                        {t('Accounts Management')}
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        {t('Manage your organization\'s bank and finance accounts')}
                                    </p>
                                </div>
                            </div>
                            <Link
                                href="/admin/bank-accounts/create"
                                className="inline-flex w-full items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200 sm:w-auto"
                            >
                                <Plus className="mr-1.5 h-4 w-4" />
                                {t('Add Bank Account')}
                            </Link>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue p-2 shadow-sm">
                                        <Building2 className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Total Accounts')}</p>
                                        <p className="text-lg sm:text-xl font-bold text-gray-900">
                                            {totalAccounts}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-green-500 p-2 shadow-sm">
                                        <CheckCircle2 className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Active')}</p>
                                        <p className="text-lg sm:text-xl font-bold text-gray-900">
                                            {activeAccounts}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-yellow-500 p-2 shadow-sm">
                                        <RefreshCw className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Inactive')}</p>
                                        <p className="text-lg sm:text-xl font-bold text-gray-900">
                                            {inactiveAccounts}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-red-500 p-2 shadow-sm">
                                        <XCircle className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Closed')}</p>
                                        <p className="text-lg sm:text-xl font-bold text-gray-900">
                                            {closedAccounts}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Flash Messages */}
                        {flash?.success && (
                            <div className="mb-6 rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-4">
                                <div className="flex">
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-green-800">
                                            {flash.success}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {flash?.error && (
                            <div className="mb-6 rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-pink-50 p-4">
                                <div className="flex">
                                    <XCircle className="h-5 w-5 text-red-500" />
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-red-800">
                                            {flash.error}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tabs */}
                        <div className="mb-6 overflow-x-auto pb-2">
                            <nav className="flex space-x-2 bg-white p-1.5 rounded-xl border border-slate-200 w-max" aria-label="Tabs">
                                <Link
                                    href="/admin/bank-accounts"
                                    className="bg-vismass-blue text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-all"
                                >
                                    {t('Bank Accounts')}
                                </Link>
                                <Link
                                    href="/admin/finance-accounts"
                                    className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-5 py-2.5 rounded-lg text-sm font-medium transition-all"
                                >
                                    {t('Finance Accounts')}
                                </Link>
                            </nav>
                        </div>

                        {/* Main Content Card */}
                        <div className="rounded-lg border border-slate-200 bg-white shadow overflow-hidden">
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 py-3">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                                    <div>
                                        <h3 className="text-base font-semibold text-white">
                                            {t('Bank Accounts List')}
                                        </h3>
                                        <p className="text-white/80 text-xs mt-0.5">
                                            {t('View and manage all bank accounts')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4">
                                {/* Filters */}
                                <div className="bg-slate-50 p-3 rounded-lg mb-4 border border-slate-200">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                                        {/* Search */}
                                        <div className="flex-1 min-w-0">
                                            <div className="relative">
                                                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder={t('Search bank accounts...')}
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                            <div className="w-full sm:w-44">
                                                <select
                                                    value={selectedStatus}
                                                    onChange={(e) => setSelectedStatus(e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-vismass-blue focus:ring-2 focus:ring-vismass-blue/20"
                                                >
                                                    <option value="">{t('All Statuses')}</option>
                                                    <option value="active">{t('Active')}</option>
                                                    <option value="inactive">{t('Inactive')}</option>
                                                    <option value="closed">{t('Closed')}</option>
                                                </select>
                                            </div>
                                            <button
                                                onClick={clearFilters}
                                                className="inline-flex items-center bg-gray-200 text-gray-700 px-3 py-2 text-sm rounded-lg hover:bg-gray-300 transition-all duration-200 font-medium whitespace-nowrap"
                                            >
                                                <Filter className="mr-1 h-3.5 w-3.5" />
                                                {t('Clear')}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Bank Accounts Table */}
                                <div className="space-y-4">
                                    <div className="md:hidden space-y-4">
                                        {bankAccounts.data.length === 0 ? (
                                            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
                                                <Building2 className="mx-auto h-12 w-12 text-slate-400" />
                                                <h3 className="mt-2 text-sm font-medium text-slate-900">{t('No bank accounts')}</h3>
                                                <p className="mt-1 text-sm text-slate-500">
                                                    {t('Get started by creating a new bank account.')}
                                                </p>
                                                <div className="mt-6">
                                                    <Link
                                                        href="/admin/bank-accounts/create"
                                                        className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-vismass-blue hover:bg-vismass-blue/90"
                                                    >
                                                        <Plus className="mr-2 h-5 w-5" />
                                                        {t('Add Bank Account')}
                                                    </Link>
                                                </div>
                                            </div>
                                        ) : (
                                            bankAccounts.data.map((bankAccount) => (
                                                <div key={bankAccount.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                        <div className="min-w-0">
                                                            <div className="text-sm font-semibold text-slate-900 truncate">{bankAccount.account_name}</div>
                                                            <div className="text-xs text-slate-500 truncate">{bankAccount.account_number}</div>
                                                            <div className="mt-2 text-sm text-slate-700">{bankAccount.bank_name}</div>
                                                            <div className="text-xs text-slate-500">{bankAccount.branch_name}</div>
                                                        </div>
                                                        <div className="text-left sm:text-right">
                                                            {getStatusBadge(bankAccount.status)}
                                                        </div>
                                                    </div>
                                                    <div className="mt-3 grid grid-cols-1 gap-3 text-xs text-slate-600 sm:grid-cols-2">
                                                        <div>
                                                            <div className="font-medium text-slate-900">{t('Type')}</div>
                                                            <div>{getAccountTypeBadge(bankAccount.account_type)}</div>
                                                        </div>
                                                        <div className="text-left sm:text-right">
                                                            <div className="font-medium text-slate-900">{t('Balance')}</div>
                                                            <div>Rs {bankAccount.current_balance?.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                        </div>
                                                    </div>
                                                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                                                        <Link
                                                            href={`/admin/bank-accounts/${bankAccount.id}`}
                                                            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-vismass-blue hover:bg-slate-50 sm:w-auto"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                            {t('View')}
                                                        </Link>
                                                        <Link
                                                            href={`/admin/bank-accounts/${bankAccount.id}/edit`}
                                                            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                            {t('Edit')}
                                                        </Link>
                                                        <button
                                                            onClick={() => handleToggleStatus(bankAccount)}
                                                            className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${bankAccount.status === 'active'
                                                                ? 'text-red-600 bg-red-50 hover:bg-red-100'
                                                                : 'text-green-600 bg-green-50 hover:bg-green-100'
                                                            } sm:w-auto`}
                                                        >
                                                            {bankAccount.status === 'active' ? (
                                                                <PowerOff className="h-4 w-4" />
                                                            ) : (
                                                                <Power className="h-4 w-4" />
                                                            )}
                                                            {bankAccount.status === 'active' ? t('Deactivate') : t('Activate')}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200">
                                        <table className="min-w-full divide-y divide-slate-200">
                                            <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
                                                <tr>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Account Details')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Bank & Branch')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Type & Balance')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Status')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Actions')}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-slate-200">
                                                {bankAccounts.data.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="px-4 py-12 text-center">
                                                            <Building2 className="mx-auto h-12 w-12 text-slate-400" />
                                                            <h3 className="mt-2 text-sm font-medium text-slate-900">{t('No bank accounts')}</h3>
                                                            <p className="mt-1 text-sm text-slate-500">
                                                                {t('Get started by creating a new bank account.')}
                                                            </p>
                                                            <div className="mt-6">
                                                                <Link
                                                                    href="/admin/bank-accounts/create"
                                                                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-vismass-blue hover:bg-vismass-blue/90"
                                                                >
                                                                    <Plus className="mr-2 h-5 w-5" />
                                                                    {t('Add Bank Account')}
                                                                </Link>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    bankAccounts.data.map((bankAccount) => (
                                                        <tr key={bankAccount.id} className="hover:bg-slate-50">
                                                            <td className="px-4 py-2.5 whitespace-nowrap">
                                                                <div className="flex items-center">
                                                                    <div className="flex-shrink-0 h-10 w-10">
                                                                        <div className="h-10 w-10 rounded-lg bg-vismass-blue/10 flex items-center justify-center">
                                                                            <CreditCard className="h-5 w-5 text-vismass-blue" />
                                                                        </div>
                                                                    </div>
                                                                    <div className="ml-4">
                                                                        <div className="text-xs font-medium text-slate-900">
                                                                            {bankAccount.account_name}
                                                                        </div>
                                                                        <div className="text-xs text-slate-500">
                                                                            {bankAccount.account_number}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-2.5 whitespace-nowrap">
                                                                <div className="text-xs text-slate-900">{bankAccount.bank_name}</div>
                                                                <div className="text-xs text-slate-500">{bankAccount.branch_name}</div>
                                                            </td>
                                                            <td className="px-4 py-2.5 whitespace-nowrap">
                                                                <div className="text-xs text-slate-900">
                                                                    {getAccountTypeBadge(bankAccount.account_type)}
                                                                </div>
                                                                <div className="text-xs text-slate-500">
                                                                    Rs {bankAccount.current_balance?.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-2.5 whitespace-nowrap">
                                                                {getStatusBadge(bankAccount.status)}
                                                            </td>
                                                            <td className="px-4 py-2.5 whitespace-nowrap text-xs font-medium">
                                                                <div className="flex items-center space-x-2">
                                                                    <Link
                                                                        href={`/admin/bank-accounts/${bankAccount.id}`}
                                                                        className="text-vismass-blue hover:text-vismass-blue/80"
                                                                    >
                                                                        <Eye className="h-4 w-4" />
                                                                    </Link>
                                                                    <Link
                                                                        href={`/admin/bank-accounts/${bankAccount.id}/edit`}
                                                                        className="text-slate-600 hover:text-slate-800"
                                                                    >
                                                                        <Edit className="h-4 w-4" />
                                                                    </Link>
                                                                    <button
                                                                        onClick={() => handleToggleStatus(bankAccount)}
                                                                        className={`inline-flex items-center p-1.5 rounded-md transition-colors ${bankAccount.status === 'active'
                                                                            ? 'text-red-600 hover:text-red-800 hover:bg-red-50'
                                                                            : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                                                                            }`}
                                                                        title={bankAccount.status === 'active' ? t('Deactivate') : t('Activate')}
                                                                    >
                                                                        {bankAccount.status === 'active' ? (
                                                                            <PowerOff className="h-4 w-4" />
                                                                        ) : (
                                                                            <Power className="h-4 w-4" />
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination */}
                                    {bankAccounts.meta && bankAccounts.meta.last_page > 1 && (
                                        <div className="bg-white px-4 py-3 border-t border-slate-200 sm:px-6">
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="text-sm text-slate-700">
                                                    {t('Showing')} {bankAccounts.meta.from} {t('to')} {bankAccounts.meta.to} {t('of')} {bankAccounts.meta.total} {t('results')}
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {bankAccounts.links.map((link, index) => (
                                                        <Link
                                                            key={index}
                                                            href={link.url || '#'}
                                                            className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl ${
                                                                link.active
                                                                    ? 'bg-vismass-blue text-white'
                                                                    : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50'
                                                            }`}
                                                            dangerouslySetInnerHTML={{ __html: link.label }}
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
                </main>

                {/* Footer */}
                <footer className="mt-6 border-t border-sky-200 bg-gradient-to-r from-white to-sky-50">
                    <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
                        <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2">
                            <p className="text-xs text-gray-500">© VISMASS {t('Accounts Management')} • v1.0.0</p>
                        </div>
                    </div>
                </footer>
            </div>

            {/* Toggle Status Confirmation Dialog */}
            <AlertDialog open={toggleModal.show} onOpenChange={(open) => {
                if (!open) setToggleModal({ show: false, account: null });
            }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('Change Account Status')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {toggleModal.account && (
                                <>
                                    {t('Are you sure you want to')}{' '}
                                    <span className="font-semibold text-gray-900">
                                        {toggleModal.account.status === 'active' ? t('deactivate') : t('activate')}
                                    </span>{' '}
                                    {t('account')} "{toggleModal.account.account_name}"?
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel asChild>
                            <button className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                {t('Cancel')}
                            </button>
                        </AlertDialogCancel>
                        <AlertDialogAction asChild>
                            <button
                                className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                                disabled={toggleProcessing}
                                onClick={confirmToggle}
                            >
                                {toggleProcessing ? t('Processing...') : t('Confirm')}
                            </button>
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}

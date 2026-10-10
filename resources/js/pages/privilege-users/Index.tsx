import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '../../types';
import { Check, X, AlertCircle, Filter, Search, UserPlus, Users, Download, Printer, Tag, Package, Eye, Pencil, Plus, FileDown, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: t('Dashboard'),
        href: '/dashboard',
    },
    {
        title: t('Privilege User Management'),
        href: '#',
    },
];

interface PrivilegeUser {
    id: number;
    company_code: number;
    section_code: number;
    customer_code: string;
    privCusName: string;
    NIC: string | null;
    address: string;
    town: string | null;
    city: string;
    country: string;
    phone: string | null;
    gender: 'male' | 'female' | null;
    card_no: string | null;
    regdate: string;
    ent_user: string | null;
    finAct: boolean;
    is_active: boolean;
    notes: string | null;
    created_at: string;
    updated_at: string;
    section?: {
        name: string;
        section_code: string;
    };
    company?: {
        name: string;
    };
}

interface Props {
    privilegeUsers: {
        data: PrivilegeUser[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    filters: {
        search?: string;
        customer_code?: string;
        name?: string;
        privilege_level?: string;
        status?: string;
    };
    privilegeLevels: Array<{
        value: string;
        label: string;
    }>;
    flash?: {
        success?: string;
        error?: string;
    };
}

export default function PrivilegeUserIndex({
    privilegeUsers,
    filters,
    privilegeLevels,
    flash,
}: Props) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [customerCodeFilter, setCustomerCodeFilter] = useState(
        filters.customer_code || '',
    );
    const [nameFilter, setNameFilter] = useState(filters.name || '');
    const [selectedPrivilegeLevel, setSelectedPrivilegeLevel] = useState(
        filters.privilege_level || '',
    );
    const [selectedStatus, setSelectedStatus] = useState(filters.status || '');
    const [showFilters, setShowFilters] = useState(false);

    const handleSearch = () => {
        router.get(
            '/admin/privilege-users',
            {
                search: searchTerm,
                customer_code: customerCodeFilter,
                name: nameFilter,
                privilege_level: selectedPrivilegeLevel,
                status: selectedStatus,
            },
            {
                preserveState: true,
            },
        );
    };

    const handleResetFilters = () => {
        setSearchTerm('');
        setCustomerCodeFilter('');
        setNameFilter('');
        setSelectedPrivilegeLevel('');
        setSelectedStatus('');
        router.get(
            '/admin/privilege-users',
            {},
            {
                preserveState: true,
            },
        );
    };

    const handleToggleStatus = (privilegeUser: PrivilegeUser) => {
        if (
            confirm(
                t('Are you sure you want to {{action}} this privilege user?', {
                    action: privilegeUser.is_active ? t('deactivate') : t('activate')
                })
            )
        ) {
            router.post(
                `/admin/privilege-users/${privilegeUser.id}/toggle`,
                {},
                {
                    preserveState: true,
                },
            );
        }
    };

    const handleDelete = (privilegeUser: PrivilegeUser) => {
        if (
            confirm(
                t('Are you sure you want to delete {{name}}? This action cannot be undone.', {
                    name: privilegeUser.privCusName
                })
            )
        ) {
            router.delete(`/admin/privilege-users/${privilegeUser.id}`, {
                preserveState: true,
            });
        }
    };

    const getFullName = (user: PrivilegeUser) => {
        return user.privCusName;
    };

    // Calculate statistics
    const activeUsers = privilegeUsers.data.filter(user => user.is_active).length;
    const inactiveUsers = privilegeUsers.data.filter(user => !user.is_active).length;
    const totalUsers = privilegeUsers.total;
    const cardHolders = privilegeUsers.data.filter(user => user.card_no).length;

    // Clear messages
    const clearError = () => {
        // Error message will auto clear
    };

    const clearSuccess = () => {
        // Success message will auto clear
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Privilege User Management')} />
            
            <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50">
                {/* Header - Promotional Discount style */}
                <header className="bg-gradient-to-r from-sky-900 via-sky-800 to-blue-900 shadow-lg">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-6">
                            <div className="flex items-center space-x-4">
                                         {/* Back Button - ADD THIS */}
                <button
                    onClick={() => window.history.back()}
                    className="mr-2 rounded-lg bg-white/20 backdrop-blur-sm p-2 hover:bg-white/30 transition-all duration-200 border border-white/30"
                    title={t('Go Back')}
                >
                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>
                                <div className="rounded-xl bg-gradient-to-br from-sky-600 to-blue-700 p-3 shadow-lg">
                                    <Users className="h-7 w-7 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-white">
                                        {t('Privilege User Management')}
                                    </h1>
                                    <p className="text-sm text-sky-200">
                                        {t('Manage privileged customers and their details')}
                                    </p>
                                </div>
                            </div>
                            <div className="rounded-xl bg-white/10 px-4 py-2 backdrop-blur-sm">
                                <span className="text-sm text-white font-medium">
                                    {new Date().toLocaleDateString('en-GB', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                </span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-8 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        {/* Stats Cards */}
                        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
                            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-sky-50 p-6 shadow-md transition-all duration-300 hover:shadow-xl border border-sky-100">
                                <div className="flex items-center">
                                    <div className="rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 p-3 shadow">
                                        <Users className="h-6 w-6 text-white" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">{t('Total Users')}</p>
                                        <p className="text-2xl font-bold text-gray-900">{totalUsers}</p>
                                    </div>
                                </div>
                                <div className="absolute -right-4 -bottom-4 h-16 w-16 rounded-full bg-sky-200/20"></div>
                            </div>

                            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-sky-50 p-6 shadow-md transition-all duration-300 hover:shadow-xl border border-sky-100">
                                <div className="flex items-center">
                                    <div className="rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 p-3 shadow">
                                        <Tag className="h-6 w-6 text-white" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">{t('Active Users')}</p>
                                        <p className="text-2xl font-bold text-gray-900">{activeUsers}</p>
                                    </div>
                                </div>
                                <div className="absolute -right-4 -bottom-4 h-16 w-16 rounded-full bg-sky-200/20"></div>
                            </div>

                            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-sky-50 p-6 shadow-md transition-all duration-300 hover:shadow-xl border border-sky-100">
                                <div className="flex items-center">
                                    <div className="rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 p-3 shadow">
                                        <Package className="h-6 w-6 text-white" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">{t('Card Holders')}</p>
                                        <p className="text-2xl font-bold text-gray-900">{cardHolders}</p>
                                    </div>
                                </div>
                                <div className="absolute -right-4 -bottom-4 h-16 w-16 rounded-full bg-sky-200/20"></div>
                            </div>

                            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-sky-50 p-6 shadow-md transition-all duration-300 hover:shadow-xl border border-sky-100">
                                <div className="flex items-center">
                                    <div className="rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 p-3 shadow">
                                        <Users className="h-6 w-6 text-white" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">{t('Inactive Users')}</p>
                                        <p className="text-2xl font-bold text-gray-900">{inactiveUsers}</p>
                                    </div>
                                </div>
                                <div className="absolute -right-4 -bottom-4 h-16 w-16 rounded-full bg-sky-200/20"></div>
                            </div>
                        </div>

                        {/* Enhanced Notifications */}
                        <div className="mb-6">
                            {flash?.success && (
                                <div className="mb-4 rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-4">
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <Check className="h-5 w-5 text-green-400" />
                                        </div>
                                        <div className="ml-3 flex-1">
                                            <h3 className="text-sm font-medium text-green-800">
                                                {t('Success')}
                                            </h3>
                                            <div className="mt-1 text-sm text-green-700">
                                                {flash.success}
                                            </div>
                                        </div>
                                        <div className="ml-auto pl-3">
                                            <button
                                                onClick={clearSuccess}
                                                className="inline-flex rounded-lg bg-green-50 p-1.5 text-green-500 hover:bg-green-100 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:outline-none"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {flash?.error && (
                                <div className="mb-4 rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-pink-50 p-4">
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <AlertCircle className="h-5 w-5 text-red-400" />
                                        </div>
                                        <div className="ml-3 flex-1">
                                            <h3 className="text-sm font-medium text-red-800">
                                                {t('Error')}
                                            </h3>
                                            <div className="mt-1 text-sm text-red-700">
                                                {flash.error}
                                            </div>
                                        </div>
                                        <div className="ml-auto pl-3">
                                            <button
                                                onClick={clearError}
                                                className="inline-flex rounded-lg bg-red-50 p-1.5 text-red-500 hover:bg-red-100 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Main Content Card */}
                        <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-white to-sky-50 shadow-lg overflow-hidden">
                            <div className="bg-gradient-to-r from-sky-900 via-sky-800 to-blue-900 px-6 py-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">
                                           {t('Privilege Users List')} 
                                        </h3>
                                        <p className="text-sky-200 text-sm mt-1">
                                            {t('Manage all privileged customers in the system')}
                           </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Link
                                            href="/admin/privilege-users/create"
                                            className="inline-flex items-center rounded-xl bg-white/20 backdrop-blur-sm px-4 py-2 text-sm font-medium text-white transition-all hover:bg-white/30 hover:shadow-lg border border-white/30"
                                        >
                                            <UserPlus className="mr-2 h-4 w-4" />
                                            {t('Add New User')}
                                        </Link>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6">
                                {/* Search and Filters */}
                                <div className="mb-6 rounded-xl border border-sky-200 bg-gradient-to-r from-sky-50 to-blue-50 p-4">
                                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="relative">
                                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                    <Search className="h-5 w-5 text-gray-400" />
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder={t('Search by name, customer code, or phone...')}
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                                    className="block w-full rounded-xl border border-gray-300 bg-white py-2.5 pr-3 pl-10 text-gray-900 focus:border-sky-500 focus:ring-sky-500 focus:outline-none placeholder-gray-400"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setShowFilters(!showFilters)}
                                                className="inline-flex items-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:outline-none"
                                            >
                                                <Filter className="mr-2 h-4 w-4" />
                                                {t('Filters')}
                                            </button>
                                            <button
                                                onClick={handleSearch}
                                                className="inline-flex items-center rounded-xl border border-transparent bg-gradient-to-r from-sky-600 to-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:from-sky-700 hover:to-blue-700 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:outline-none"
                                            >
                                                <Search className="mr-2 h-4 w-4" />
                                                {t('Search')}
                                            </button>
                                            <button
                                                onClick={handleResetFilters}
                                                className="inline-flex items-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:outline-none"
                                            >
                                                <X className="mr-2 h-4 w-4" />
                                                {t('Reset')}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const params = new URLSearchParams();
                                                    if (searchTerm) params.append('search', searchTerm);
                                                    if (customerCodeFilter) params.append('customer_code', customerCodeFilter);
                                                    if (nameFilter) params.append('name', nameFilter);
                                                    if (selectedPrivilegeLevel) params.append('privilege_level', selectedPrivilegeLevel);
                                                    if (selectedStatus) params.append('status', selectedStatus);
                                                    window.location.href = `/admin/privilege-users-export?${params.toString()}`;
                                                }}
                                                className="inline-flex items-center rounded-xl border border-transparent bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:from-green-700 hover:to-emerald-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:outline-none"
                                            >
                                                <Download className="mr-2 h-4 w-4" />
                                                {t('Download PDF')}
                                            </button>
                                        </div>
                                    </div>

                                    {showFilters && (
                                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-gray-700">
                                                    {t('Customer Code')}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={customerCodeFilter}
                                                    onChange={(e) => setCustomerCodeFilter(e.target.value)}
                                                    placeholder="Enter customer code"
                                                    className="block w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-sky-500 focus:ring-sky-500 focus:outline-none"
                                                />
                                            </div>

                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-gray-700">
                                                    {t('Name')}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={nameFilter}
                                                    onChange={(e) => setNameFilter(e.target.value)}
                                                    placeholder="Enter customer name"
                                                    className="block w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-sky-500 focus:ring-sky-500 focus:outline-none"
                                                />
                                            </div>

                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-gray-700">
                                                    {t('Privilege Level')}
                                                </label>
                                                <select
                                                    value={selectedPrivilegeLevel}
                                                    onChange={(e) => setSelectedPrivilegeLevel(e.target.value)}
                                                    className="block w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-sky-500 focus:ring-sky-500 focus:outline-none"
                                                >
                                                    <option value="">
                                                        {t('All Levels')}
                                                    </option>
                                                    {privilegeLevels.map((level) => (
                                                        <option key={level.value} value={level.value}>
                                                            {level.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-gray-700">
                                                    {t('Status')}
                                                </label>
                                                <select
                                                    value={selectedStatus}
                                                    onChange={(e) => setSelectedStatus(e.target.value)}
                                                    className="block w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-sky-500 focus:ring-sky-500 focus:outline-none"
                                                >
                                                    <option value="">
                                                        {t('All Status')}
                                                    </option>
                                                    <option value="active">
                                                        {t('Active')}
                                                    </option>
                                                    <option value="inactive">
                                                        {t('Inactive')}
                                                    </option>
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Privilege Users Table */}
                                <div className="rounded-xl border border-sky-200 bg-white shadow-sm overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-700 uppercase">
                                                        {t('Customer Code')}
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-700 uppercase">
                                                        {t('Name')}
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-700 uppercase">
                                                        {t('Contact')}
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-700 uppercase">
                                                        {t('Status')}
                                                    </th>
                                                    <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-700 uppercase">
                                                        {t('Actions')}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 bg-white">
                                                {privilegeUsers.data.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="px-6 py-12 text-center">
                                                            <div className="flex flex-col items-center justify-center">
                                                                <Users className="h-12 w-12 text-gray-400 mb-4" />
                                                                <h3 className="text-sm font-medium text-gray-900 mb-2">
                                                                    {t('No Privilege Users Found')}
                                                                </h3>
                                                                <p className="text-sm text-gray-600 mb-4">
                                                                    {t('No privilege users match your search criteria.')}
                                                                </p>
                                                                <Link
                                                                    href="/admin/privilege-users/create"
                                                                    className="inline-flex items-center rounded-xl border border-transparent bg-gradient-to-r from-sky-600 to-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:from-sky-700 hover:to-blue-700 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:outline-none"
                                                                >
                                                                    <UserPlus className="mr-2 h-4 w-4" />
                                                                    {t('Add New User')}
                                                                </Link>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    privilegeUsers.data.map((user) => (
                                                        <tr key={user.id} className="hover:bg-gray-50">
                                                            <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-gray-900">
                                                                {user.customer_code}
                                                            </td>
                                                            <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
                                                                <div className="font-medium">{getFullName(user)}</div>
                                                                {user.gender && (
                                                                    <div className="text-xs text-gray-500">
                                                                        {user.gender === 'male' ? t('Male') : t('Female')}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                                                                <div className="space-y-1">
                                                                    {user.NIC && (
                                                                        <div className="text-xs">{t('NIC')}: {user.NIC}</div>
                                                                    )}
                                                                    {user.phone && (
                                                                        <div className="text-xs">{t('Phone')}: {user.phone}</div>
                                                                    )}
                                                                    {user.card_no && (
                                                                        <div className="text-xs text-sky-600">{t('Card')}: {user.card_no}</div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                                    user.is_active
                                                                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                                                                        : 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
                                                                }`}>
                                                                    {user.is_active ? t('Active') : t('Inactive')}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-right text-sm font-medium whitespace-nowrap">
                                                                <div className="flex justify-end space-x-2">
                                                                    <Link
                                                                        href={`/admin/privilege-users/${user.id}`}
                                                                        className="inline-flex items-center rounded-lg border border-gray-300 bg-white p-1.5 text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:outline-none"
                                                                    >
                                                                        <Eye className="h-4 w-4" />
                                                                    </Link>
                                                                    <Link
                                                                        href={`/admin/privilege-users/${user.id}/edit`}
                                                                        className="inline-flex items-center rounded-lg border border-gray-300 bg-white p-1.5 text-sky-700 hover:bg-sky-50 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:outline-none"
                                                                    >
                                                                        <Pencil className="h-4 w-4" />
                                                                    </Link>
                                                                    <button
                                                                        onClick={() => handleToggleStatus(user)}
                                                                        className={`inline-flex items-center rounded-lg border border-gray-300 bg-white p-1.5 hover:bg-gray-50 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:outline-none ${
                                                                            user.is_active
                                                                                ? 'text-red-600 hover:text-red-900'
                                                                                : 'text-green-600 hover:text-green-900'
                                                                        }`}
                                                                    >
                                                                        {user.is_active ? (
                                                                            <XCircle className="h-4 w-4" />
                                                                        ) : (
                                                                            <Check className="h-4 w-4" />
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
                                    {privilegeUsers.last_page > 1 && (
                                        <div className="border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                                            <div className="flex items-center justify-between">
                                                <div className="text-sm text-gray-700">
                                                    {t('Showing')}{' '}
                                                    {(privilegeUsers.current_page - 1) *
                                                        privilegeUsers.per_page +
                                                        1}{' '}
                                                    {t('to')}{' '}
                                                    {Math.min(
                                                        privilegeUsers.current_page *
                                                            privilegeUsers.per_page,
                                                        privilegeUsers.total,
                                                    )}{' '}
                                                    {t('of')}{' '}
                                                    {privilegeUsers.total}{' '}
                                                    {t('results')}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {privilegeUsers.current_page > 1 && (
                                                        <Link
                                                            href={`/admin/privilege-users?page=${privilegeUsers.current_page - 1}&search=${searchTerm}&privilege_level=${selectedPrivilegeLevel}&status=${selectedStatus}`}
                                                            className="relative inline-flex items-center rounded-l-xl border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                                        >
                                                            {t('Previous')}
                                                        </Link>
                                                    )}
                                                    {privilegeUsers.current_page <
                                                        privilegeUsers.last_page && (
                                                        <Link
                                                            href={`/admin/privilege-users?page=${privilegeUsers.current_page + 1}&search=${searchTerm}&privilege_level=${selectedPrivilegeLevel}&status=${selectedStatus}`}
                                                            className="relative inline-flex items-center rounded-r-xl border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                                        >
                                                            {t('Next')}
                                                        </Link>
                                                    )}
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
                <footer className="mt-12 border-t border-sky-200 bg-gradient-to-r from-white to-sky-50">
                    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
                            <p className="text-xs text-gray-600">© UNITEC POS System • {t('Privilege User Management')}</p>
                            <p className="text-xs text-gray-500">v1.0.0 • {t('Professional POS Solution')}</p>
                        </div>
                    </div>
                </footer>
            </div>
        </AppLayout>
    );
}
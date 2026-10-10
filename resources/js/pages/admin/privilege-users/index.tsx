import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { Check, X, Filter, Search, UserPlus, Users, Download, Tag, Eye, Pencil, XCircle, CheckCircle, User, Phone, CreditCard } from 'lucide-react';
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

            {/* Radiant Layout Structure with Blue and White Mix */}
            <div className="min-h-screen bg-slate-50">
                <Head title={t('Privilege User Management')} />

                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4">
                            <div className="flex items-center space-x-3">
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <Users className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">
                                        {t('Privilege User Management')}
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        {t('Manage privileged customers and their details')}
                                    </p>
                                </div>
                            </div>
                            <Link
                                href="/sales/create"
                                className="inline-flex items-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                            >
                                <UserPlus className="mr-1.5 h-4 w-4" />
                                {t('Back to sale')}
                            </Link>
                            <Link
                                href="/admin/privilege-users/create"
                                className="inline-flex items-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                            >
                                <UserPlus className="mr-1.5 h-4 w-4" />
                                {t('Add New User')}
                            </Link>
                        </div>
                    </div>
                </header>

                {/* Main Content Area */}
                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue p-2 shadow-sm">
                                        <Users className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Total Users')}</p>
                                        <p className="text-lg font-bold text-gray-900">{totalUsers}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-green-500 p-2 shadow-sm">
                                        <CheckCircle className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Active Users')}</p>
                                        <p className="text-lg font-bold text-gray-900">{activeUsers}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-grey p-2 shadow-sm">
                                        <Tag className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Card Holders')}</p>
                                        <p className="text-lg font-bold text-gray-900">{cardHolders}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-red-500 p-2 shadow-sm">
                                        <XCircle className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Inactive Users')}</p>
                                        <p className="text-lg font-bold text-gray-900">{inactiveUsers}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Content Card */}
                        <div className="rounded-lg border border-slate-200 bg-white shadow overflow-hidden">
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 py-3">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 text-white">
                                    <div>
                                        <h3 className="text-base font-semibold">
                                            {t('Privilege Users Management')}
                                        </h3>
                                        <p className="text-white/80 text-xs mt-0.5">
                                            {t('Browse and manage privileged customers in the system')}
                                        </p>
                                    </div>
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
                                        className="inline-flex items-center rounded-lg bg-white/20 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-white hover:bg-white/30 transition-all border border-white/30"
                                    >
                                        <Download className="mr-1.5 h-3.5 w-3.5" />
                                        {t('Download PDF')}
                                    </button>
                                </div>
                            </div>

                            <div className="p-4">
                                {/* Search and Filters */}
                                <div className="bg-slate-50 p-3 rounded-lg mb-4 border border-slate-200">
                                    <div className="space-y-3">
                                        <div className="flex flex-col md:flex-row gap-3">
                                            <div className="flex-1">
                                                <div className="relative">
                                                    <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        placeholder={t('Search by name, customer code, or phone...')}
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => setShowFilters(!showFilters)}
                                                    className="inline-flex items-center bg-white border border-gray-300 text-gray-700 px-4 py-2 text-sm rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium shadow-sm"
                                                >
                                                    <Filter className="mr-1.5 h-3.5 w-3.5 text-gray-400" />
                                                    {t('Filters')}
                                                </button>
                                                <button
                                                    onClick={handleSearch}
                                                    className="inline-flex items-center bg-vismass-blue text-white px-4 py-2 text-sm rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium shadow-sm"
                                                >
                                                    {t('Search')}
                                                </button>
                                                <button
                                                    onClick={handleResetFilters}
                                                    className="inline-flex items-center bg-gray-200 text-gray-700 px-4 py-2 text-sm rounded-lg hover:bg-gray-300 transition-all duration-200 font-medium"
                                                >
                                                    <X className="mr-1.5 h-3.5 w-3.5" />
                                                    {t('Reset')}
                                                </button>
                                            </div>
                                        </div>

                                        {showFilters && (
                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-4 pt-3 border-t border-gray-200">
                                                <div>
                                                    <label className="mb-1 block text-xs font-medium text-gray-700">
                                                        {t('Customer Code')}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={customerCodeFilter}
                                                        onChange={(e) => setCustomerCodeFilter(e.target.value)}
                                                        placeholder={t('Enter code')}
                                                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="mb-1 block text-xs font-medium text-gray-700">
                                                        {t('Name')}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={nameFilter}
                                                        onChange={(e) => setNameFilter(e.target.value)}
                                                        placeholder={t('Enter name')}
                                                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="mb-1 block text-xs font-medium text-gray-700">
                                                        {t('Privilege Level')}
                                                    </label>
                                                    <select
                                                        value={selectedPrivilegeLevel}
                                                        onChange={(e) => setSelectedPrivilegeLevel(e.target.value)}
                                                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                    >
                                                        <option value="">{t('All Levels')}</option>
                                                        {privilegeLevels.map((level) => (
                                                            <option key={level.value} value={level.value}>
                                                                {level.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="mb-1 block text-xs font-medium text-gray-700">
                                                        {t('Status')}
                                                    </label>
                                                    <select
                                                        value={selectedStatus}
                                                        onChange={(e) => setSelectedStatus(e.target.value)}
                                                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                    >
                                                        <option value="">{t('All Status')}</option>
                                                        <option value="active">{t('Active')}</option>
                                                        <option value="inactive">{t('Inactive')}</option>
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Table */}
                                <div className="overflow-hidden rounded-lg border border-gray-200">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
                                            <tr>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                    {t('Customer Code')}
                                                </th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                    {t('Name')}
                                                </th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                    {t('Contact & Identification')}
                                                </th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                    {t('Status')}
                                                </th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                    {t('Actions')}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {privilegeUsers.data.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="px-4 py-8 text-center">
                                                        <div className="flex flex-col items-center">
                                                            <Users className="h-10 w-10 text-gray-400 mb-3" />
                                                            <p className="text-xs font-medium text-gray-900 mb-1">{t('No Privilege Users Found')}</p>
                                                            <p className="text-xs text-gray-500 mb-3">{t('No privilege users match your search criteria.')}</p>
                                                            <Link
                                                                href="/admin/privilege-users/create"
                                                                className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded-lg text-white bg-vismass-blue hover:bg-blue-700"
                                                            >
                                                                <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                                                                {t('Add New User')}
                                                            </Link>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                privilegeUsers.data.map((user) => (
                                                    <tr key={user.id} className="hover:bg-sky-50/50 transition-colors duration-150">
                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            <div className="flex items-center">
                                                                <div className="h-8 w-8 shrink-0">
                                                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-100 to-blue-100">
                                                                        <Tag className="h-3.5 w-3.5 text-sky-600" />
                                                                    </div>
                                                                </div>
                                                                <div className="ml-2.5">
                                                                    <div className="text-xs font-medium text-gray-900">{user.customer_code}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <div className="text-xs font-medium text-gray-900">{getFullName(user)}</div>
                                                            {user.gender && (
                                                                <div className="text-[10px] text-gray-500">{user.gender === 'male' ? t('Male') : t('Female')}</div>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <div className="space-y-0.5">
                                                                {user.NIC && (
                                                                    <div className="text-[10px] text-gray-600 flex items-center">
                                                                        <CreditCard className="w-2.5 h-2.5 mr-1 text-gray-400" />
                                                                        {user.NIC}
                                                                    </div>
                                                                )}
                                                                {user.phone && (
                                                                    <div className="text-[10px] text-gray-600 flex items-center">
                                                                        <Phone className="w-2.5 h-2.5 mr-1 text-gray-400" />
                                                                        {user.phone}
                                                                    </div>
                                                                )}
                                                                {user.card_no && (
                                                                    <div className="text-[10px] text-vismass-blue font-medium">{t('Card')}: {user.card_no}</div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${user.is_active
                                                                ? 'bg-green-100 text-green-800'
                                                                : 'bg-red-100 text-red-800'
                                                                }`}>
                                                                {user.is_active ? t('Active') : t('Inactive')}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap text-xs font-medium space-x-2">
                                                            <Link
                                                                href={`/admin/privilege-users/${user.id}`}
                                                                className="inline-flex items-center text-sky-600 hover:text-sky-800"
                                                            >
                                                                <Eye className="w-3.5 h-3.5 mr-1" />
                                                                {t('View')}
                                                            </Link>
                                                            <Link
                                                                href={`/admin/privilege-users/${user.id}/edit`}
                                                                className="inline-flex items-center p-1.5 rounded-md text-amber-600 hover:text-amber-800 hover:bg-amber-50"
                                                                title={t('Edit')}
                                                            >
                                                                <Pencil className="w-3.5 h-3.5" />
                                                            </Link>
                                                            <button
                                                                onClick={() => handleToggleStatus(user)}
                                                                className={`inline-flex items-center p-1.5 rounded-md ${user.is_active
                                                                    ? 'text-red-600 hover:text-red-800 hover:bg-red-50'
                                                                    : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                                                                    }`}
                                                                title={user.is_active ? t('Deactivate') : t('Activate')}
                                                            >
                                                                {user.is_active ? (
                                                                    <XCircle className="w-3.5 h-3.5" />
                                                                ) : (
                                                                    <CheckCircle className="w-3.5 h-3.5" />
                                                                )}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                {privilegeUsers.last_page > 1 && (
                                    <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
                                        <div className="text-xs text-gray-500">
                                            {t('Showing')} {' '}
                                            {(privilegeUsers.current_page - 1) * privilegeUsers.per_page + 1} {' '}
                                            {t('to')} {' '}
                                            {Math.min(privilegeUsers.current_page * privilegeUsers.per_page, privilegeUsers.total)} {' '}
                                            {t('of')} {privilegeUsers.total} {t('results')}
                                        </div>
                                        <div className="flex space-x-2">
                                            {privilegeUsers.current_page > 1 && (
                                                <Link
                                                    href={`/admin/privilege-users?page=${privilegeUsers.current_page - 1}&search=${searchTerm}&privilege_level=${selectedPrivilegeLevel}&status=${selectedStatus}`}
                                                    className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                                                >
                                                    {t('Previous')}
                                                </Link>
                                            )}
                                            {privilegeUsers.current_page < privilegeUsers.last_page && (
                                                <Link
                                                    href={`/admin/privilege-users?page=${privilegeUsers.current_page + 1}&search=${searchTerm}&privilege_level=${selectedPrivilegeLevel}&status=${selectedStatus}`}
                                                    className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                                                >
                                                    {t('Next')}
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="mt-6 border-t border-sky-200 bg-gradient-to-r from-white to-sky-50">
                    <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8 text-center">
                        <p className="text-xs text-gray-500">© UNITEC POS System • {t('Privilege User Management')} • v1.0.0</p>
                    </div>
                </footer>
            </div>
        </AppLayout>
    );
}
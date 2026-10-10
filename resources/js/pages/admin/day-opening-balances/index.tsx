import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    Plus,
    Eye,
    Edit,
    Filter,
    DollarSign,
    CheckCircle,
    XCircle,
    User
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import Pagination from '@/components/pagination';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: t('Dashboard'),
        href: '/dashboard',
    },
    {
        title: t('Day Opening Balances'),
        href: '#',
    },
];

interface User {
    id: number;
    name: string;
    role?: {
        id: number;
        slug: string;
        name: string;
    };
}

interface DayOpeningBalance {
    id: number;
    user_id: number;
    balance_date: string;
    opening_balance: number;
    currency: string;
    status: string;
    notes: string;
    created_at: string;
    user: {
        id: number;
        name: string;
        username?: string;
    };
    creator: {
        id: number;
        name: string;
    };
    approver?: {
        id: number;
        name: string;
    };
}

interface Props {
    balances: {
        data: DayOpeningBalance[];
        links: any[];
        meta: any;
        from?: number;
        to?: number;
        total?: number;
        current_page?: number;
        last_page?: number;
    };
    users: User[];
    filters: {
        date?: string;
        status?: string;
        user_id?: string;
        per_page?: string;
    };
    auth?: {
        user?: {
            id: number;
            name: string;
            role?: {
                id: number;
                slug: string;
                name: string;
            };
        };
    };
    flash?: {
        success?: string;
        error?: string;
    };
}

export default function DayOpeningBalanceIndex({ balances, users, filters, auth, flash }: Props) {
    const [itemsPerPage, setItemsPerPage] = useState(filters.per_page || '15');
    
    const { data, setData } = useForm({
        date: filters.date || '',
        user_id: filters.user_id || '',
    });

    const initialRender = useRef(true);

    const isCashier = auth?.user?.role?.slug === 'cashier' || auth?.user?.role?.slug?.endsWith('_cashier');
    const isSuperAdmin = auth?.user?.role?.id === 1;
    const isCompanyAdmin = auth?.user?.role?.id === 2;
    const isAdmin = isSuperAdmin || isCompanyAdmin;

    useEffect(() => {
        if (initialRender.current) {
            initialRender.current = false;
            return;
        }

        const timeoutId = setTimeout(() => {
            router.get(
                '/admin/day-opening-balances',
                {
                    date: data.date,
                    user_id: data.user_id,
                    per_page: itemsPerPage,
                    page: 1,
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                }
            );
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [data.date, data.user_id, itemsPerPage]);

    const handleClearFilters = () => {
        setData({ date: '', user_id: '' });
        setItemsPerPage('15');
        
        router.get('/admin/day-opening-balances', { per_page: '15' }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };



    const formatCurrency = (amount: number, currency: string) => {
        return `${currency} ${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Day Opening Balances')} />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4">
                            <div className="flex flex-wrap items-center gap-3">
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
                                    <DollarSign className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">
                                        {t('Day Opening Balances')}
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        {t('Manage daily opening cash balances')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                <Link
                                    href="/sales/create"
                                    className="inline-flex justify-center w-full sm:w-auto items-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                                >
                                    <Plus className="mr-1.5 h-4 w-4" />
                                    {t('Back To Sale')}
                                </Link>
                                <Link
                                    href="/admin/day-opening-balances/create"
                                    className="inline-flex justify-center w-full sm:w-auto items-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                                >
                                    <Plus className="mr-1.5 h-4 w-4" />
                                    {t('Add Opening Balance')}
                                </Link>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-4 px-4 sm:px-6 lg:px-8">
                    <div className="sm:px-0">
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
                                    <div className="shrink-0">
                                        <XCircle className="h-5 w-5 text-red-500" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-red-800">
                                            {flash.error}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Main Content Card */}
                        <div className="rounded-lg border border-slate-200 bg-white shadow overflow-hidden">
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 py-3">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                                    <div>
                                        <h3 className="text-base font-semibold text-white">
                                            {t('Opening Balances List')}
                                        </h3>
                                        <p className="text-white/80 text-xs mt-0.5">
                                            {t('View and manage all day opening balances')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4">
                                {/* Filters */}
                                <div className="bg-slate-50 p-3 rounded-lg mb-4 border border-slate-200">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                                        
                                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-1">
                                            {/* Date Filter */}
                                            <div className="flex-1 min-w-[130px]">
                                                <input
                                                    type="date"
                                                    value={data.date}
                                                    onChange={(e) => setData('date', e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition text-gray-600"
                                                />
                                            </div>

                                            {/* User Filter - Only show for admins */}
                                            {isAdmin && (
                                                <div className="flex-1 min-w-[150px]">
                                                    <select
                                                        value={data.user_id}
                                                        onChange={(e) => setData('user_id', e.target.value)}
                                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition text-gray-600"
                                                    >
                                                        <option value="">{t('All Users')}</option>
                                                        {users.map((user) => (
                                                            <option key={user.id} value={user.id}>
                                                                {user.name}{user.role ? ` (${user.role.name})` : ''}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                        </div>

                                        {/* Filters + clear */}
                                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
                                            <div className="w-28">
                                                <select
                                                    value={itemsPerPage}
                                                    onChange={(e) => setItemsPerPage(e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-vismass-blue focus:ring-2 focus:ring-vismass-blue/20"
                                                >
                                                    <option value="15">15 / {t('Page')}</option>
                                                    <option value="25">25 / {t('Page')}</option>
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

                                {/* Balances Table */}
                                <div className="space-y-4 md:hidden">
                                    {balances.data.length === 0 ? (
                                        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
                                            <DollarSign className="mx-auto h-12 w-12 text-slate-400" />
                                            <h3 className="mt-4 text-sm font-semibold text-slate-900">{t('No opening balances')}</h3>
                                            <p className="mt-2 text-sm text-slate-500">
                                                {t('Get started by creating a new opening balance.')}
                                            </p>
                                            <div className="mt-5">
                                                <Link
                                                    href="/admin/day-opening-balances/create"
                                                    className="inline-flex w-full justify-center items-center rounded-xl bg-vismass-blue px-4 py-2 text-sm font-medium text-white hover:bg-vismass-blue/90"
                                                >
                                                    <Plus className="mr-2 h-4 w-4" />
                                                    {t('Add Opening Balance')}
                                                </Link>
                                            </div>
                                        </div>
                                    ) : (
                                        balances.data.map((balance) => (
                                            <div key={balance.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-900">{balance.user.name}</p>
                                                        {balance.user.username && (
                                                            <p className="text-xs text-slate-500">{balance.user.username}</p>
                                                        )}
                                                    </div>
                                                    <p className="text-sm font-semibold text-slate-900">{formatCurrency(balance.opening_balance, balance.currency)}</p>
                                                </div>
                                                <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-slate-600 sm:grid-cols-2">
                                                    <div>
                                                        <p className="font-medium text-slate-500">{t('Created')}</p>
                                                        <p>{new Date(balance.created_at).toLocaleDateString('en-GB')}</p>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-500">{t('Actions')}</p>
                                                        <div className="mt-2 flex items-center gap-3">
                                                            <Link
                                                                href={`/admin/day-opening-balances/${balance.id}`}
                                                                className="text-vismass-blue hover:text-vismass-blue/80"
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </Link>
                                                            <Link
                                                                href={`/admin/day-opening-balances/${balance.id}/edit`}
                                                                className="text-slate-600 hover:text-slate-800"
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="overflow-x-auto rounded-b-lg">
                                    <table className="min-w-full divide-y divide-gray-200 hidden md:table">
                                        <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
                                            <tr>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                    {t('Cashier')}
                                                </th>
                                                <th className="px-4 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                    {t('Opening Balance')}
                                                </th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                    {t('Created')}
                                                </th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                    {t('Actions')}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {balances.data.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-12 text-center">
                                                        <DollarSign className="mx-auto h-12 w-12 text-slate-400" />
                                                        <h3 className="mt-2 text-sm font-medium text-slate-900">{t('No opening balances')}</h3>
                                                        <p className="mt-1 text-sm text-slate-500">
                                                            {t('Get started by creating a new opening balance.')}
                                                        </p>
                                                        <div className="mt-6">
                                                            <Link
                                                                href="/admin/day-opening-balances/create"
                                                                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-vismass-blue hover:bg-vismass-blue/90"
                                                            >
                                                                <Plus className="mr-2 h-5 w-5" />
                                                                {t('Add Opening Balance')}
                                                            </Link>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                balances.data.map((balance) => (
                                                    <tr key={balance.id} className="hover:bg-sky-50/50 transition-colors duration-150">
                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            <div className="flex items-center">
                                                                <div className="flex-shrink-0 h-10 w-10">
                                                                    <div className="h-10 w-10 rounded-lg bg-vismass-blue/10 flex items-center justify-center">
                                                                        <User className="h-5 w-5 text-vismass-blue" />
                                                                    </div>
                                                                </div>
                                                                <div className="ml-4">
                                                                    <div className="text-sm font-medium text-slate-900">
                                                                        {balance.user.name}
                                                                    </div>
                                                                    {balance.user.username && (
                                                                        <div className="text-xs text-slate-500">
                                                                            {balance.user.username}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap text-right">
                                                            <div className="text-sm font-medium text-slate-900">
                                                                {(balance.opening_balance)}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            <div className="text-sm text-slate-900">
                                                                {new Date(balance.created_at).toLocaleDateString('en-GB')}
                                                            </div>
                                                            <div className="text-sm text-slate-500">
                                                                {balance.creator.name}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap text-sm font-medium">
                                                            <div className="flex items-center gap-4">
                                                                <Link
                                                                    href={`/admin/day-opening-balances/${balance.id}`}
                                                                    className="inline-flex items-center text-sky-600 hover:text-sky-800 font-medium text-xs"
                                                                    title={t('View')}
                                                                >
                                                                    <Eye className="mr-1 h-3.5 w-3.5" />
                                                                    {t('View')}
                                                                </Link>
                                                                <Link
                                                                    href={`/admin/day-opening-balances/${balance.id}/edit`}
                                                                    className="inline-flex items-center text-slate-600 hover:text-slate-800 font-medium text-xs"
                                                                    title={t('Edit')}
                                                                >
                                                                    <Edit className="mr-1 h-3.5 w-3.5" />
                                                                    {t('Edit')}
                                                                </Link>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>

                                    {/* Pagination */}
                                    <div className="p-4 border-t border-slate-200">
                                        <Pagination links={balances.links ?? (balances.meta as any)?.links} meta={balances.meta ?? balances as any} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="mt-6 border-t border-sky-200 bg-gradient-to-r from-white to-sky-50">
                    <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
                        <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2">
                            <p className="text-xs text-gray-500">© VISMASS {t('Day Opening Balances')} • v1.0.0</p>
                        </div>
                    </div>
                </footer>
            </div>

        </AppLayout>
    );
}
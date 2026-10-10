import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, router, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    Plus,
    History,
    Search,
    CreditCard,
    Building2,
    Calendar,
    Filter,
    CheckCircle,
    XCircle,
    DollarSign,
    TrendingUp,
    RefreshCw,
    AlertCircle
} from 'lucide-react';
import { t } from '@/lib/i18n';

interface ReturnHistoryItem {
    id: string;
    return_number: string;
    base_return_number: string;
    cheque_no: string | null;
    bank_name: string | null;
    branch_name: string | null;
    amount: number;
    return_date: string;
    reason: string | null;
    customer_name: string;
    customer_code: string | null;
    is_service_charge: boolean;
    is_delivery?: boolean;
    original_payment_id: number | null;
    created_at: string;
}

interface Props {
    returnHistory: ReturnHistoryItem[];
    success?: string;
    error?: string;
}

const breadcrumbs = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Cheque Return', href: '/pos/cheque-return' },
];

export default function ChequeReturnIndex({ returnHistory, success, error }: Props) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredHistory = returnHistory.filter(item => {
        const search = searchTerm.toLowerCase();
        return (
            item.cheque_no?.toLowerCase().includes(search) ||
            item.customer_name?.toLowerCase().includes(search) ||
            item.bank_name?.toLowerCase().includes(search) ||
            item.return_number?.toLowerCase().includes(search)
        );
    });

    // Calculate stats
    const mainReturns = returnHistory.filter(r => !r.is_service_charge);
    const totalReturns = mainReturns.length;
    const totalAmount = mainReturns.reduce((sum, item) => sum + item.amount, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayReturnsList = mainReturns.filter(item => {
        const d = new Date(item.created_at);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
    });
    
    const todayReturnsCount = todayReturnsList.length;
    const todayReturnsAmount = todayReturnsList.reduce((sum, item) => sum + item.amount, 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Return History')} />
            
            <div className="min-h-screen bg-slate-50 pb-12">
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
                                    <RefreshCw className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">
                                        {t('Cheque Return History')}
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        {t('View all processed cheque returns')}
                                    </p>
                                </div>
                            </div>
                            <Link
                                href={route('pos.cheque-return.create')}
                                className="inline-flex w-full items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200 sm:w-auto"
                            >
                                <Plus className="mr-1.5 h-4 w-4" />
                                {t('New Return')}
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
                                        <AlertCircle className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Total Returns')}</p>
                                        <p className="text-lg sm:text-xl font-bold text-gray-900">
                                            {totalReturns}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-red-500 p-2 shadow-sm">
                                        <DollarSign className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Total Amount')}</p>
                                        <p className="text-lg sm:text-xl font-bold text-gray-900">
                                            Rs.{totalAmount.toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-yellow-500 p-2 shadow-sm">
                                        <Calendar className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Today Returns')}</p>
                                        <p className="text-lg sm:text-xl font-bold text-gray-900">
                                            {todayReturnsCount}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-indigo-500 p-2 shadow-sm">
                                        <TrendingUp className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Today Amount')}</p>
                                        <p className="text-lg sm:text-xl font-bold text-gray-900">
                                            Rs.{todayReturnsAmount.toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Notifications */}
                        {success && (
                            <div className="mb-6 rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-4">
                                <div className="flex">
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-green-800">
                                            {success}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="mb-6 rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-pink-50 p-4">
                                <div className="flex">
                                    <XCircle className="h-5 w-5 text-red-500" />
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-red-800">
                                            {error}
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
                                            {t('Return Records')}
                                        </h3>
                                        <p className="text-white/80 text-xs mt-0.5">
                                            {t('List of all processed cheque returns')}
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
                                                    placeholder={t('Search by cheque no, customer, bank, return no...')}
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                            <button
                                                onClick={() => setSearchTerm('')}
                                                className="inline-flex items-center bg-gray-200 text-gray-700 px-3 py-2 text-sm rounded-lg hover:bg-gray-300 transition-all duration-200 font-medium whitespace-nowrap"
                                            >
                                                <Filter className="mr-1 h-3.5 w-3.5" />
                                                {t('Clear')}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Desktop Table View */}
                                <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200">
                                    <table className="min-w-full divide-y divide-slate-200">
                                        <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
                                            <tr>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                    {t('Return Details')}
                                                </th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                    {t('Customer')}
                                                </th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                    {t('Cheque & Bank')}
                                                </th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                    {t('Reason / Info')}
                                                </th>
                                                <th className="px-4 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                    {t('Amount')}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-200">
                                            {filteredHistory.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="px-4 py-12 text-center">
                                                        <History className="mx-auto h-12 w-12 text-slate-400" />
                                                        <h3 className="mt-2 text-sm font-medium text-slate-900">{t('No returns found')}</h3>
                                                        <p className="mt-1 text-sm text-slate-500">
                                                            {searchTerm ? t('No results match your search criteria.') : t('You haven\'t processed any cheque returns yet.')}
                                                        </p>
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredHistory.map((item) => (
                                                    <tr key={item.id} className="hover:bg-slate-50">
                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            <div className="flex items-center">
                                                                <div className="flex-shrink-0 h-10 w-10">
                                                                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                                                                        item.is_service_charge 
                                                                            ? 'bg-yellow-100 text-yellow-600'
                                                                            : 'bg-red-100 text-red-600'
                                                                    }`}>
                                                                        <AlertCircle className="h-5 w-5" />
                                                                    </div>
                                                                </div>
                                                                <div className="ml-4">
                                                                    <div className="text-sm font-bold text-slate-900">
                                                                        {item.return_number}
                                                                    </div>
                                                                    <div className="text-xs text-slate-500">
                                                                        {t('Date')}: {new Date(item.return_date).toLocaleDateString('en-GB')}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            <div className="text-sm font-medium text-slate-900">{item.customer_name}</div>
                                                            {item.customer_code && (
                                                                <div className="text-xs text-slate-500">{t('Code')}: {item.customer_code}</div>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            {item.cheque_no ? (
                                                                <>
                                                                    <div className="text-sm text-slate-900 flex items-center gap-1.5 font-medium">
                                                                        <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                                                                        {item.cheque_no}
                                                                    </div>
                                                                    <div className="text-xs text-slate-500 mt-0.5 ml-5 flex items-center gap-1">
                                                                        <Building2 className="h-3 w-3" />
                                                                        {item.bank_name} {item.branch_name ? `(${item.branch_name})` : ''}
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <span className="text-xs text-slate-400 italic">{t('N/A')}</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            {item.is_service_charge ? (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                                                                    {t('Service Charge')}
                                                                </span>
                                                            ) : (
                                                                <span className="text-sm text-slate-600">
                                                                    {item.reason || t('Bounced')}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap text-right">
                                                            <span className="text-sm font-bold text-red-600">
                                                                Rs.{Number(item.amount).toFixed(2)}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile List View */}
                                <div className="md:hidden space-y-4">
                                    {filteredHistory.length === 0 ? (
                                        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
                                            <History className="mx-auto h-12 w-12 text-slate-400" />
                                            <h3 className="mt-2 text-sm font-medium text-slate-900">{t('No returns found')}</h3>
                                            <p className="mt-1 text-sm text-slate-500">
                                                {searchTerm ? t('No results match your search criteria.') : t('You haven\'t processed any cheque returns yet.')}
                                            </p>
                                        </div>
                                    ) : (
                                        filteredHistory.map((item) => (
                                            <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                                            <AlertCircle className={`h-4 w-4 ${item.is_service_charge ? 'text-yellow-500' : 'text-red-500'}`} />
                                                            {item.return_number}
                                                        </div>
                                                        <div className="text-xs text-slate-500 ml-5">{item.customer_name}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-sm font-bold text-red-600">Rs.{Number(item.amount).toFixed(2)}</div>
                                                        <div className="text-[10px] text-slate-400">{new Date(item.return_date).toLocaleDateString('en-GB')}</div>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-3">
                                                    <div>
                                                        <span className="text-slate-400 block mb-0.5">{t('Cheque')}</span>
                                                        <span className="font-medium text-slate-700">{item.cheque_no || t('N/A')}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-400 block mb-0.5">{t('Reason/Type')}</span>
                                                        {item.is_service_charge ? (
                                                            <span className="text-yellow-600 font-medium">{t('Service Charge')}</span>
                                                        ) : (
                                                            <span className="font-medium text-slate-700">{item.reason || t('Bounced')}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </AppLayout>
    );
}

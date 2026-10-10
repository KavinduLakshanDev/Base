import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import {
    CreditCard,
    ArrowLeft,
    CheckCircle,
    FileText,
    Eye,
    XCircle,
    ArrowDownCircle,
    ArrowUpCircle,
    TrendingUp,
    Filter,
    Download,
    Calendar,
} from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: t('Dashboard'),
        href: '/dashboard',
    },
    {
        title: t('Finance Account Management'),
        href: '/admin/finance-accounts',
    },
    {
        title: t('View Finance Account'),
        href: '#',
    },
];

interface Transaction {
    id: string;
    date: string;
    type: 'credit' | 'debit';
    source: string;
    description: string;
    amount: number;
    method: string;
    ref: string | null;
    running_balance: number;
}

interface FinanceAccount {
    id: number;
    account_name: string;
    main_category: string;
    account_type: string;
    opening_balance: number;
    cut_off_date: string | null;
    current_balance: number;
    status: number | boolean;
    company_code: string;
    section_code: string;
    created_at: string;
    creator?: {
        name: string;
    };
    company?: {
        name: string;
    };
    section?: {
        name: string;
    };
}

interface Props {
    financeAccount: FinanceAccount;
    transactions?: Transaction[];
    flash?: {
        success?: string;
        error?: string;
    };
    stats?: {
        openingBalance: number;
        totalCredits: number;
        totalDebits: number;
        closingBalance: number;
    };
    filters?: {
        from_date?: string;
        to_date?: string;
    };
}

export default function Show({ financeAccount, transactions = [], flash, stats, filters }: Props) {
    const [fromDate, setFromDate] = useState(filters?.from_date || '');
    const [toDate, setToDate] = useState(filters?.to_date || '');

    const handleFilter = () => {
        router.get(`/admin/finance-accounts/${financeAccount.id}`, {
            from_date: fromDate,
            to_date: toDate,
        }, { preserveState: true });
    };

    const handleClear = () => {
        setFromDate('');
        setToDate('');
        router.get(`/admin/finance-accounts/${financeAccount.id}`);
    };
    const getStatusBadge = (status: number | boolean) => {
        if (status) {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {t('Active')}
                </span>
            );
        } else {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    <XCircle className="w-3 h-3 mr-1" />
                    {t('Inactive')}
                </span>
            );
        }
    };

    const getAccountTypeBadge = (type: string) => {
        const colors = {
            cash: 'bg-green-100 text-green-800',
            cheque: 'bg-blue-100 text-blue-800',
            online: 'bg-purple-100 text-purple-800',
            qr_payment: 'bg-indigo-100 text-indigo-800',
        };

        const typeFormatted = type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
                {t(typeFormatted)}
            </span>
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('View Finance Account')} />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between py-4">
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
                                    <Eye className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">
                                        {t('View Finance Account')}
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        {t('Finance account details and information')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
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

                        {/* Finance Account Details Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            {/* Card Header */}
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-6 py-4">
                                <div className="flex items-center space-x-3">
                                    <div className="rounded-lg bg-white/20 p-2">
                                        <CreditCard className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold text-white">{financeAccount.account_name}</h2>
                                    </div>
                                </div>
                            </div>

                            {/* Account Details */}
                            <div className="p-6 border-b border-slate-200 bg-slate-50/50">
                                <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-x-4 gap-y-6">
                                    <div className="sm:col-span-1">
                                        <dt className="text-sm font-medium text-slate-500">{t('Account Name')}</dt>
                                        <dd className="mt-1 text-sm font-semibold text-slate-900">{financeAccount.account_name}</dd>
                                    </div>
                                    <div className="sm:col-span-1">
                                        <dt className="text-sm font-medium text-slate-500">{t('Main Category')}</dt>
                                        <dd className="mt-1 text-sm font-semibold text-slate-900 capitalize">{financeAccount.main_category}</dd>
                                    </div>
                                    <div className="sm:col-span-1">
                                        <dt className="text-sm font-medium text-slate-500">{t('Account Type')}</dt>
                                        <dd className="mt-1 text-sm font-semibold text-slate-900 capitalize">{financeAccount.account_type}</dd>
                                    </div>
                                    <div className="sm:col-span-1">
                                        <dt className="text-sm font-medium text-slate-500">{t('Company')}</dt>
                                        <dd className="mt-1 text-sm font-semibold text-slate-900">{financeAccount.company?.name || '-'}</dd>
                                    </div>
                                    <div className="sm:col-span-1">
                                        <dt className="text-sm font-medium text-slate-500">{t('Section')}</dt>
                                        <dd className="mt-1 text-sm font-semibold text-slate-900">{financeAccount.section?.name || '-'}</dd>
                                    </div>
                                    <div className="sm:col-span-1">
                                        <dt className="text-sm font-medium text-slate-500 flex items-center">
                                            <Calendar className="w-3.5 h-3.5 mr-1 text-vismass-blue" />
                                            {t('Cut-off Date')}
                                        </dt>
                                        <dd className="mt-1 text-sm font-semibold text-slate-900">
                                            {financeAccount.cut_off_date
                                                ? new Date(financeAccount.cut_off_date).toLocaleString('en-GB', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })
                                                : '-'
                                            }
                                        </dd>
                                    </div>
                                </dl>
                            </div>

                            {/* Card Content (Stats) */}
                            {stats && (
                                <div className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                                            <div className="flex items-center text-slate-500 mb-2">
                                                <span className="text-sm font-medium">
                                                    {filters?.from_date ? t('Brought Forward Balance') : t('Opening Balance')}
                                                </span>
                                            </div>
                                            <div className="text-2xl font-bold text-slate-800">
                                                Rs {stats.openingBalance.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        </div>

                                        {/* Total Debits */}
                                        <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-5 shadow-sm">
                                            <div className="flex items-center text-emerald-600 mb-2">
                                                <ArrowUpCircle className="w-4 h-4 mr-1.5" />
                                                <span className="text-sm font-medium">{t('Total Debits')}</span>
                                            </div>
                                            <div className="text-2xl font-bold text-emerald-700">
                                                Rs {stats.totalDebits.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        </div>

                                        {/* Total Credits */}
                                        <div className="bg-rose-50 rounded-xl border border-rose-100 p-5 shadow-sm">
                                            <div className="flex items-center text-rose-600 mb-2">
                                                <ArrowDownCircle className="w-4 h-4 mr-1.5" />
                                                <span className="text-sm font-medium">{t('Total Credits')}</span>
                                            </div>
                                            <div className="text-2xl font-bold text-rose-700">
                                                Rs {stats.totalCredits.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        </div>

                                        {/* Closing Balance */}
                                        <div className="bg-vismass-blue/5 rounded-xl border border-vismass-blue/10 p-5 shadow-sm">
                                            <div className="flex items-center text-vismass-blue mb-2">
                                                <CreditCard className="w-4 h-4 mr-1.5" />
                                                <span className="text-sm font-medium">{t('Closing Balance')}</span>
                                            </div>
                                            <div className="text-2xl font-bold text-vismass-blue">
                                                Rs {stats.closingBalance.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Transaction Ledger */}
                        <div className="mt-8 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="flex items-center space-x-3 w-full md:w-auto">
                                    <div className="rounded-lg bg-white/20 p-2">
                                        <TrendingUp className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-white">{t('Transaction Ledger')}</h2>
                                        <p className="text-white/70 text-xs">{t('All credits and debits affecting this account')}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto">
                                    <input 
                                        type="date" 
                                        className="text-sm rounded-lg border-none focus:ring-2 focus:ring-vismass-blue py-1.5 px-3 bg-white/10 text-white placeholder-white/50" 
                                        value={fromDate}
                                        onChange={(e) => setFromDate(e.target.value)}
                                        title={t('From Date')}
                                    />
                                    <span className="text-white/50">{t('to')}</span>
                                    <input 
                                        type="date" 
                                        className="text-sm rounded-lg border-none focus:ring-2 focus:ring-vismass-blue py-1.5 px-3 bg-white/10 text-white placeholder-white/50" 
                                        value={toDate}
                                        onChange={(e) => setToDate(e.target.value)}
                                        title={t('To Date')}
                                    />
                                    <Button 
                                        onClick={handleFilter} 
                                        size="sm" 
                                        className="bg-vismass-blue hover:bg-blue-600 text-white border-none shadow-none"
                                    >
                                        <Filter className="w-4 h-4 mr-2" />
                                        {t('Filter')}
                                    </Button>
                                    {(fromDate || toDate) && (
                                        <Button 
                                            onClick={handleClear} 
                                            size="sm" 
                                            className="bg-slate-600 hover:bg-slate-500 text-white border-none shadow-none"
                                        >
                                            <XCircle className="w-4 h-4 mr-2" />
                                            {t('Clear')}
                                        </Button>
                                    )}
                                    <div className="h-6 w-px bg-white/20 mx-1"></div>
                                    <a href={`/admin/finance-accounts/${financeAccount.id}/export-csv?from_date=${fromDate}&to_date=${toDate}`}>
                                        <Button 
                                            size="sm" 
                                            className="bg-white hover:bg-slate-100 text-slate-800 border-none shadow-none"
                                        >
                                            <FileText className="w-4 h-4 mr-2 text-slate-500" />
                                            {t('CSV')}
                                        </Button>
                                    </a>
                                    <a href={`/admin/finance-accounts/${financeAccount.id}/download-pdf?from_date=${fromDate}&to_date=${toDate}`} target="_blank" rel="noopener noreferrer">
                                        <Button 
                                            size="sm" 
                                            className="bg-rose-600 hover:bg-rose-700 text-white border-none shadow-none"
                                        >
                                            <Download className="w-4 h-4 mr-2" />
                                            {t('PDF')}
                                        </Button>
                                    </a>
                                    <span className="text-xs text-white/60 bg-white/10 px-3 py-1.5 rounded-full whitespace-nowrap ml-2">
                                        {transactions.length} {t('entries')}
                                    </span>
                                </div>
                            </div>

                            {transactions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                    <FileText className="h-12 w-12 mb-3 opacity-20" />
                                    <p className="text-sm font-medium">{t('No transactions recorded yet')}</p>
                                    <p className="text-xs mt-1">{t('Transactions will appear here once payments are made')}</p>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-4 md:hidden">
                                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                            <div className="flex justify-between items-center gap-4">
                                                <div>
                                                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t('Opening Balance')}</p>
                                                    <p className="text-base font-semibold text-slate-900">Rs {financeAccount.opening_balance?.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t('Current Balance')}</p>
                                                    <p className="text-base font-semibold text-slate-900">Rs {financeAccount.current_balance?.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                                </div>
                                            </div>
                                            <div className="mt-3 text-xs text-slate-500">
                                                {transactions.length} {t('entries')}
                                            </div>
                                        </div>
                                        {transactions.map((trx) => (
                                            <div key={trx.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                                                <div className="flex flex-col gap-3">
                                                    <div className="flex items-center justify-between gap-4">
                                                        <div>
                                                            <p className="text-sm font-semibold text-slate-900">{new Date(trx.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                                                            <p className="text-xs text-slate-500">{trx.source}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            {trx.id === 'OB-0' ? (
                                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                                                    {t('Brought Forward')}
                                                                </span>
                                                            ) : trx.type === 'debit' ? (
                                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                                                    <ArrowUpCircle className="h-3 w-3" /> {t('Debit')}
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                                                                    <ArrowDownCircle className="h-3 w-3" /> {t('Credit')}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-2 text-xs text-slate-600">
                                                        <div>
                                                            <p className="font-medium text-slate-700">{t('Description')}</p>
                                                            <p className="whitespace-normal break-words">{trx.description}</p>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-4">
                                                            <div className="min-w-0">
                                                                <p className="font-medium text-slate-700">{t('Method')}</p>
                                                                <p className="capitalize">{trx.method?.replace('_', ' ')}</p>
                                                            </div>
                                                            <div className="text-right min-w-[120px]">
                                                                <p className="font-medium text-slate-700">{t('Balance')}</p>
                                                                <p className="font-semibold text-slate-900">Rs {trx.running_balance.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {trx.id !== 'OB-0' && (
                                                        <div className="flex items-center justify-between gap-4 text-xs font-semibold">
                                                            <span className={trx.type === 'debit' ? 'text-emerald-700' : 'text-rose-700'}>
                                                                {trx.type === 'debit'
                                                                    ? `+ Rs ${trx.amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                                    : `- Rs ${trx.amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                                }
                                                            </span>
                                                            {trx.ref && <span className="text-slate-500">{t('Ref')}: {trx.ref}</span>}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="hidden md:block overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-200">
                                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('Date')}</th>
                                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('Type')}</th>
                                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('Source')}</th>
                                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('Description')}</th>
                                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('Method')}</th>
                                                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('Debit')}</th>
                                                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('Credit')}</th>
                                                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('Balance')}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {transactions.map((trx) => (
                                                    <tr key={trx.id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                                                            {new Date(trx.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {trx.id === 'OB-0' ? (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                                    {t('B/F')}
                                                                </span>
                                                            ) : trx.type === 'debit' ? (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                                                    <ArrowUpCircle className="h-3 w-3" /> {t('Debit')}
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
                                                                    <ArrowDownCircle className="h-3 w-3" /> {t('Credit')}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-600 text-xs font-medium">{trx.source}</td>
                                                        <td className="px-4 py-3 text-slate-700 truncate break-words" title={trx.description}>{trx.description}</td>
                                                        <td className="px-4 py-3 text-slate-500 text-xs capitalize">{trx.method?.replace('_', ' ')}</td>
                                                        <td className="px-4 py-3 text-right font-mono">
                                                            {trx.id !== 'OB-0' && trx.type === 'debit' ? (
                                                                <span className="text-emerald-700 font-semibold">
                                                                    {trx.amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                </span>
                                                            ) : trx.id === 'OB-0' ? '-' : null}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-mono">
                                                            {trx.id !== 'OB-0' && trx.type === 'credit' ? (
                                                                <span className="text-rose-700 font-semibold">
                                                                    {trx.amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                </span>
                                                            ) : trx.id === 'OB-0' ? '-' : null}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                                                            {trx.running_balance.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr className="bg-slate-800 text-white">
                                                    <td colSpan={5} className="px-4 py-3 text-sm font-bold uppercase tracking-wide">{t('Current Balance')}</td>
                                                     <td className="px-4 py-3 text-right text-rose-300 font-mono font-bold text-sm">
                                                        {transactions.filter((t) => t.type === 'debit' && t.id !== 'OB-0').reduce((s, t) => s + t.amount, 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-emerald-300 font-mono font-bold text-sm">
                                                        {transactions.filter((t) => t.type === 'credit' && t.id !== 'OB-0').reduce((s, t) => s + t.amount, 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono font-extrabold text-white text-base">
                                                        {financeAccount.current_balance?.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Back button below ledger */}
                        <div className="mt-6 flex justify-start">
                            <Button
                                onClick={() => router.visit('/admin/finance-accounts')}
                                variant="outline"
                                className="px-8 py-3 rounded-xl border-slate-200 hover:bg-slate-50 transition-all duration-200 font-medium"
                            >
                                <ArrowLeft className="w-5 h-5 mr-2" />
                                {t('Back to Finance Accounts')}
                            </Button>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="mt-6 border-t border-sky-200 bg-gradient-to-r from-white to-sky-50">
                    <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
                        <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2">
                            <p className="text-xs text-gray-500">© VISMASS {t('Finance Account Management')} • v1.0.0</p>
                        </div>
                    </div>
                </footer>
            </div>
        </AppLayout>
    );
}

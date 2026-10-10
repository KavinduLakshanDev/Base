import { useEffect, useState, useRef } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Plus, Search, Filter, RotateCcw, ArrowLeft, Receipt, FileText, Building2, Eye, Download, CheckCircle } from 'lucide-react';
import { t } from '@/lib/i18n';
import Pagination, { PaginationLink, PaginationMeta } from '@/components/pagination';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: t('Dashboard'),
        href: '/dashboard',
    },
    {
        title: t('Finance Voucher'),
        href: '/admin/finance-transfers',
    },
];

interface FinanceAccount {
    id: number;
    account_name: string;
    account_type: string;
}

interface BankAccount {
    id: number;
    account_name: string;
    bank_name: string;
    account_number: string;
}

interface FinanceTransfer {
    id: number;
    cash_book_no: string;
    finance_voucher_no: string;
    date: string;
    type: string;
    finance_account_id: number | null;
    bank_account_id: number | null;
    finance_account: FinanceAccount | null;
    bank_account: BankAccount | null;
    expense_account: { account_name: string } | null;
    petty_cash_category: { name: string } | null;
    delivery_petty_cash_category: { name: string } | null;
    to_finance_account: FinanceAccount | null;
    to_bank_account: BankAccount | null;
    to_expense_account: { account_name: string } | null;
    to_petty_cash_category: { name: string } | null;
    to_delivery_petty_cash_category: { name: string } | null;
    payer_account: string;
    description: string | null;
    amount: string;
    slip_path: string | null;
}

interface Filters {
    search?: string;
    per_page?: string;
    date_from?: string;
    date_to?: string;
}

interface Props {
    Transfers: {
        data: FinanceTransfer[];
        links: PaginationLink[];
        meta?: PaginationMeta;
        from?: number;
        to?: number;
        total?: number;
        current_page?: number;
        last_page?: number;
    };
    filters: Filters;
    flash?: {
        success?: string;
        error?: string;
        created_voucher_id?: number;
    };
}

export default function FinanceTransferIndex({ Transfers, filters = {}, flash }: Props) {
    const [itemsPerPage, setItemsPerPage] = useState(filters.per_page || '15');
    
    const { data, setData } = useForm({
        search: filters.search || '',
        date_from: filters.date_from || '',
        date_to: filters.date_to || '',
    });

    const initialRender = useRef(true);

    // Debounced filtering
    useEffect(() => {
        if (initialRender.current) {
            initialRender.current = false;
            return;
        }

        const timeoutId = setTimeout(() => {
            router.get(
                '/admin/finance-transfers',
                {
                    search: data.search,
                    date_from: data.date_from,
                    date_to: data.date_to,
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
    }, [data.search, data.date_from, data.date_to, itemsPerPage]);

    const handleClearFilters = () => {
        setData({ search: '', date_from: '', date_to: '' });
        setItemsPerPage('15');
        
        router.get('/admin/finance-transfers', { per_page: '15' }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const money = (val: string | number) => Number(val).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const safeTransfers = {
        data: Transfers.data || [],
        links: Transfers.links || [],
        meta: Transfers.meta || {
            from: Transfers.from || 0,
            to: Transfers.to || 0,
            total: Transfers.total || 0,
            current_page: Transfers.current_page || 1,
            last_page: Transfers.last_page || 1,
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Finance Transfers')} />

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
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </button>
                                <div className="shrink-0 rounded-lg bg-white/20 p-2 shadow">
                                    <Receipt className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-lg sm:text-xl font-bold text-white truncate">
                                        {t('Finance Voucher')}
                                    </h1>
                                    <p className="text-xs text-white/80 hidden sm:block">
                                        {t('Manage deposits, withdrawals, and transfers')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex space-x-3">
                                <a
                                    href={`/admin/finance-transfers/export?${new URLSearchParams({ search: data.search, date_from: data.date_from, date_to: data.date_to }).toString()}`}
                                    className="shrink-0 inline-flex items-center rounded-lg bg-white/10 px-3 sm:px-4 py-2 text-sm font-medium text-white shadow hover:bg-white/20 transition-all duration-200"
                                >
                                    <Download className="h-4 w-4 sm:mr-1.5" />
                                    <span className="hidden sm:inline">{t('Export CSV')}</span>
                                </a>
                                <Link
                                    href="/admin/finance-transfers/create"
                                    className="shrink-0 inline-flex items-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                                >
                                    <Plus className="h-4 w-4 sm:mr-1.5" />
                                    <span className="hidden sm:inline">{t('Create Voucher')}</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        {/* Flash Success Message */}
                        {flash?.success && (
                            <div className="mb-4 rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex">
                                        <div className="shrink-0">
                                            <CheckCircle className="h-5 w-5 text-green-500" />
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm font-medium text-green-800">
                                                {flash.success}
                                            </p>
                                        </div>
                                    </div>
                                    {flash.created_voucher_id && (
                                        <a
                                            href={`/admin/finance-transfers/${flash.created_voucher_id}/receipt`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 transition-colors"
                                        >
                                            <Receipt className="h-4 w-4" />
                                            {t('Print Receipt')}
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}
                        {/* Main Content Card */}
                        <div className="rounded-lg border border-slate-200 bg-white shadow overflow-hidden">
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 py-3">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                                    <div>
                                        <h3 className="text-base font-semibold text-white">
                                            {t('All Finance Voucher')}
                                        </h3>
                                        <p className="text-white/80 text-xs mt-0.5">
                                            {t('Total')}: {safeTransfers.meta.total} {t('Voucher')}{safeTransfers.meta.total !== 1 ? 's' : ''}
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
                                                    placeholder={t('Search by transaction no, payer or description...')}
                                                    value={data.search || ''}
                                                    onChange={(e) => setData('search', e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                />
                                            </div>
                                        </div>

                                        {/* Filters + clear */}
                                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                            <div className="flex-1 min-w-[130px]">
                                                <input
                                                    type="date"
                                                    value={data.date_from || ''}
                                                    onChange={(e) => setData('date_from', e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition text-gray-600"
                                                />
                                            </div>
                                            
                                            <div className="flex-1 min-w-[130px]">
                                                <input
                                                    type="date"
                                                    value={data.date_to || ''}
                                                    onChange={(e) => setData('date_to', e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition text-gray-600"
                                                />
                                            </div>

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

                                {/* List */}
                                {safeTransfers.data.length > 0 ? (
                                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
                                                <tr>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Transaction No.')}</th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Type')}</th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Date')}</th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('From Account')}</th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('To Account')}</th>
                                                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Amount (Rs)')}</th>
                                                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Actions')}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {safeTransfers.data.map((Transfer) => (
                                                    <tr key={Transfer.id} className="hover:bg-slate-50 transition-colors duration-150">
                                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-vismass-blue ring-1 ring-inset ring-blue-200">
                                                                {Transfer.finance_voucher_no}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 font-medium capitalize">
                                                            {Transfer.type}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 font-medium">
                                                            {new Date(Transfer.date).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                                            <div className="flex items-center">
                                                                <div className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center mr-2">
                                                                    <Building2 className="w-3 h-3 text-gray-500" />
                                                                </div>
                                                                {Transfer.finance_account && (
                                                                    <span>{Transfer.finance_account.account_name} <span className="text-xs text-gray-400">({t('Finance')})</span></span>
                                                                )}
                                                                {Transfer.bank_account && (
                                                                    <span>{Transfer.bank_account.account_name} <span className="text-xs text-gray-400">({t('Bank')})</span></span>
                                                                )}
                                                                {Transfer.expense_account && (
                                                                    <span>{Transfer.expense_account.account_name} <span className="text-xs text-gray-400">({t('Expense')})</span></span>
                                                                )}
                                                                {Transfer.petty_cash_category && (
                                                                    <span>{Transfer.petty_cash_category.name} <span className="text-xs text-gray-400">({t('Shop Petty Cash')})</span></span>
                                                                )}
                                                                {Transfer.delivery_petty_cash_category && (
                                                                    <span>{Transfer.delivery_petty_cash_category.name} <span className="text-xs text-gray-400">({t('Delivery Petty Cash')})</span></span>
                                                                )}
                                                                {!Transfer.finance_account && !Transfer.bank_account && !Transfer.expense_account && !Transfer.petty_cash_category && !Transfer.delivery_petty_cash_category && '-'}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                                            <div className="flex items-center">
                                                                <div className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center mr-2">
                                                                    <Building2 className="w-3 h-3 text-gray-500" />
                                                                </div>
                                                                {Transfer.to_finance_account && (
                                                                    <span>{Transfer.to_finance_account.account_name} <span className="text-xs text-gray-400">({t('Finance')})</span></span>
                                                                )}
                                                                {Transfer.to_bank_account && (
                                                                    <span>{Transfer.to_bank_account.account_name} <span className="text-xs text-gray-400">({t('Bank')})</span></span>
                                                                )}
                                                                {Transfer.to_expense_account && (
                                                                    <span>{Transfer.to_expense_account.account_name} <span className="text-xs text-gray-400">({t('Expense')})</span></span>
                                                                )}
                                                                {Transfer.to_petty_cash_category && (
                                                                    <span>{Transfer.to_petty_cash_category.name} <span className="text-xs text-gray-400">({t('Shop Petty Cash')})</span></span>
                                                                )}
                                                                {Transfer.to_delivery_petty_cash_category && (
                                                                    <span>{Transfer.to_delivery_petty_cash_category.name} <span className="text-xs text-gray-400">({t('Delivery Petty Cash')})</span></span>
                                                                )}
                                                                {!Transfer.to_finance_account && !Transfer.to_bank_account && !Transfer.to_expense_account && !Transfer.to_petty_cash_category && !Transfer.to_delivery_petty_cash_category && '-'}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-right">
                                                            <span className="text-sm font-bold text-amber-600">
                                                                {Transfer.type === 'deposit' ? '+' : Transfer.type === 'withdraw' ? '-' : '⇄'} {money(Transfer.amount)}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-center">
                                                            <div className="flex justify-center items-center gap-2">
                                                                <a
                                                                    href={`/admin/finance-transfers/${Transfer.id}/receipt`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center text-green-600 hover:text-green-800 font-medium text-xs bg-green-50 hover:bg-green-100 px-2 py-1 rounded transition-colors"
                                                                    title={t('Print Receipt')}
                                                                >
                                                                    <Receipt className="mr-1 h-3.5 w-3.5" />
                                                                    {t('Receipt')}
                                                                </a>
                                                                <Link
                                                                    href={`/admin/finance-transfers/${Transfer.id}`}
                                                                    className="inline-flex items-center text-sky-600 hover:text-sky-800 font-medium text-xs bg-sky-50 hover:bg-sky-100 px-2 py-1 rounded transition-colors"
                                                                    title={t('View Details')}
                                                                >
                                                                    <Eye className="mr-1 h-3.5 w-3.5" />
                                                                    {t('View')}
                                                                </Link>
                                                                {Transfer.slip_path && (
                                                                    <a
                                                                        href={`/storage/${Transfer.slip_path}`}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="inline-flex items-center text-sky-600 hover:text-sky-800 font-medium text-xs bg-sky-50 hover:bg-sky-100 px-2 py-1 rounded transition-colors"
                                                                        title={t('View Slip')}
                                                                    >
                                                                        <FileText className="mr-1 h-3.5 w-3.5" />
                                                                        {t('Slip')}
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <div className="mx-auto h-10 w-10 text-gray-400 mb-3">
                                            <RotateCcw className="h-10 w-10" />
                                        </div>
                                        <h3 className="text-xs font-medium text-gray-900 mb-1.5">{t('No Transactions found')}</h3>
                                        <p className="text-xs text-gray-500 mb-3">
                                            {t('Try adjusting your filters or create a new transaction.')}
                                        </p>
                                        <Link
                                            href="/admin/finance-transfers/create"
                                            className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded-lg text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                                        >
                                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                                            {t('Add Transaction')}
                                        </Link>
                                    </div>
                                )}

                                {/* Pagination */}
                                {(safeTransfers.links || []).length > 0 && (
                                    <Pagination links={safeTransfers.links} meta={safeTransfers.meta} />
                                )}
                            </div>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="mt-6 border-t border-sky-200 bg-gradient-to-r from-white to-sky-50">
                    <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
                        <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2">
                            <p className="text-xs text-gray-500">© VISMASS {t('Finance Transactions')} • v1.0.0</p>
                        </div>
                    </div>
                </footer>
            </div>
        </AppLayout>
    );
}

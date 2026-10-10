import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import {
    Receipt,
    ArrowLeft,
    Calendar,
    Building2,
    FileText,
    Banknote,
    User,
    Download,
    CreditCard,
    Globe
} from 'lucide-react';

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

interface User {
    id: number;
    name: string;
}

interface FinanceTransfer {
    id: number;
    finance_voucher_no: string;
    date: string;
    type: string;
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
    payment_method: 'cash' | 'cheque' | 'online';
    cheque_number: string | null;
    cheque_date: string | null;
    reference_number: string | null;
    amount: string;
    slip_path: string | null;
    created_by: User | null;
}

interface Props {
    Transfer: FinanceTransfer;
}

export default function ShowFinanceTransfer({ Transfer }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('Dashboard'),
            href: '/dashboard',
        },
        {
            title: t('Finance Voucher'),
            href: '/admin/finance-transfers',
        },
        {
            title: Transfer.finance_voucher_no,
            href: '#',
        },
    ];

    const getAccountDisplay = () => {
        if (Transfer.finance_account) {
            return `${Transfer.finance_account.account_name} (${t('Finance')} - ${Transfer.finance_account.account_type})`;
        }
        if (Transfer.bank_account) {
            return `${Transfer.bank_account.account_name} - ${Transfer.bank_account.bank_name} (${Transfer.bank_account.account_number})`;
        }
        if (Transfer.expense_account) {
            return `${Transfer.expense_account.account_name} (${t('Expense')})`;
        }
        if (Transfer.petty_cash_category) {
            return `${Transfer.petty_cash_category.name} (${t('Shop Petty Cash')})`;
        }
        if (Transfer.delivery_petty_cash_category) {
            return `${Transfer.delivery_petty_cash_category.name} (${t('Delivery Petty Cash')})`;
        }
        return '-';
    };

    const getToAccountDisplay = () => {
        if (Transfer.to_finance_account) {
            return `${Transfer.to_finance_account.account_name} (${t('Finance')} - ${Transfer.to_finance_account.account_type})`;
        }
        if (Transfer.to_bank_account) {
            return `${Transfer.to_bank_account.account_name} - ${Transfer.to_bank_account.bank_name} (${Transfer.to_bank_account.account_number})`;
        }
        if (Transfer.to_expense_account) {
            return `${Transfer.to_expense_account.account_name} (${t('Expense')})`;
        }
        if (Transfer.to_petty_cash_category) {
            return `${Transfer.to_petty_cash_category.name} (${t('Shop Petty Cash')})`;
        }
        if (Transfer.to_delivery_petty_cash_category) {
            return `${Transfer.to_delivery_petty_cash_category.name} (${t('Delivery Petty Cash')})`;
        }
        return '-';
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Voucher')} ${Transfer.finance_voucher_no}`} />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between py-4">
                            <div className="flex items-center space-x-3">
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <Receipt className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white flex items-center gap-3">
                                        {t('Voucher Details')}
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${
                                            Transfer.type === 'transfer'
                                                ? 'bg-amber-500/20 text-amber-700 border border-amber-500/30'
                                                : Transfer.type === 'deposit' 
                                                    ? 'bg-emerald-500/20 text-emerald-700 border border-emerald-500/30'
                                                    : 'bg-rose-500/20 text-rose-700 border border-rose-500/30'
                                        }`}>
                                            {Transfer.type === 'transfer' ? t('Transfer') : Transfer.type === 'deposit' ? t('Deposit') : t('Withdrawal')}
                                        </span>
                                    </h1>
                                    <p className="text-xs text-white/80 mt-1">
                                        {Transfer.finance_voucher_no}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <Link href="/admin/finance-transfers">
                                    <Button variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-sm">
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        {t('Back to List')}
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-8 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                        {/* Left Column: Details */}
                        <div className="md:col-span-2 space-y-6">
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                                    <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                                        <FileText className="w-5 h-5 mr-2 text-vismass-blue" />
                                        {t('Transaction Information')}
                                    </h2>
                                </div>
                                <div className="p-6">
                                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-8">
                                        <div className="sm:col-span-1">
                                            <dt className="text-sm font-medium text-slate-500 flex items-center gap-2">
                                                <Calendar className="w-4 h-4" />
                                                {t('Date')}
                                            </dt>
                                            <dd className="mt-2 text-base text-slate-900 font-semibold">
                                                {new Date(Transfer.date).toLocaleDateString()}
                                            </dd>
                                        </div>

                                        <div className="sm:col-span-1">
                                            <dt className="text-sm font-medium text-slate-500 flex items-center gap-2">
                                                <Building2 className="w-4 h-4" />
                                                {Transfer.type === 'transfer' ? t('From Account') : t('Account')}
                                            </dt>
                                            <dd className="mt-2 text-base text-slate-900 font-semibold">
                                                {getAccountDisplay()}
                                            </dd>
                                        </div>

                                        {Transfer.type === 'transfer' ? (
                                            <div className="sm:col-span-1">
                                                <dt className="text-sm font-medium text-slate-500 flex items-center gap-2">
                                                    <Building2 className="w-4 h-4" />
                                                    {t('To Account')}
                                                </dt>
                                                <dd className="mt-2 text-base text-slate-900 font-semibold">
                                                    {getToAccountDisplay()}
                                                </dd>
                                            </div>
                                        ) : (
                                            <div className="sm:col-span-1">
                                                {/* <dt className="text-sm font-medium text-slate-500 flex items-center gap-2">
                                                    <User className="w-4 h-4" />
                                                    {t('Payer / Payee')}
                                                </dt>
                                                <dd className="mt-2 text-base text-slate-900 font-semibold">
                                                    {Transfer.payer_account}
                                                </dd> */}
                                            </div>
                                        )}

                                        <div className="sm:col-span-1">
                                            <dt className="text-sm font-medium text-slate-500 flex items-center gap-2">
                                                <Banknote className="w-4 h-4" />
                                                {t('Amount')}
                                            </dt>
                                            <dd className={`mt-2 text-lg font-bold ${
                                                Transfer.type === 'transfer' ? 'text-amber-600' : Transfer.type === 'deposit' ? 'text-emerald-600' : 'text-rose-600'
                                            }`}>
                                                {Transfer.type === 'transfer' ? '⇄ ' : Transfer.type === 'deposit' ? '+ ' : '- '}Rs {Number(Transfer.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </dd>
                                        </div>

                                        <div className="sm:col-span-1">
                                            <dt className="text-sm font-medium text-slate-500 flex items-center gap-2">
                                                <CreditCard className="w-4 h-4" />
                                                {t('Payment Method')}
                                            </dt>
                                            <dd className="mt-2 text-base text-slate-900 font-semibold flex flex-col gap-1">
                                                <span className="capitalize">{Transfer.payment_method || 'Cash'}</span>
                                                {Transfer.payment_method === 'cheque' && (
                                                    <span className="text-sm font-normal text-slate-500">
                                                        {t('Cheque')}: {Transfer.cheque_number} ({Transfer.cheque_date})
                                                    </span>
                                                )}
                                                {Transfer.payment_method === 'online' && (
                                                    <span className="text-sm font-normal text-slate-500">
                                                        {t('Ref')}: {Transfer.reference_number}
                                                    </span>
                                                )}
                                            </dd>
                                        </div>

                                        <div className="sm:col-span-2">
                                            <dt className="text-sm font-medium text-slate-500 flex items-center gap-2">
                                                <FileText className="w-4 h-4" />
                                                {t('Description')}
                                            </dt>
                                            <dd className="mt-2 text-sm text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                {Transfer.description || <span className="text-slate-400 italic">{t('No description provided')}</span>}
                                            </dd>
                                        </div>
                                    </dl>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Meta & Attachments */}
                        <div className="space-y-6">
                            {/* Attachment Card */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                                    <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                                        <Receipt className="w-5 h-5 mr-2 text-vismass-blue" />
                                        {t('Attachment')}
                                    </h2>
                                </div>
                                <div className="p-6">
                                    {Transfer.slip_path ? (
                                        <div className="space-y-4">
                                            <div className="aspect-video relative rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                                                {Transfer.slip_path.toLowerCase().endsWith('.pdf') ? (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                                                        <FileText className="w-12 h-12 mb-2" />
                                                        <span className="text-sm font-medium">PDF Document</span>
                                                    </div>
                                                ) : (
                                                    <img 
                                                        src={`/storage/${Transfer.slip_path}`} 
                                                        alt="Transaction Slip" 
                                                        className="w-full h-full object-cover"
                                                    />
                                                )}
                                            </div>
                                            <a 
                                                href={`/storage/${Transfer.slip_path}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-full flex items-center justify-center px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                                            >
                                                <Download className="w-4 h-4 mr-2" />
                                                {t('Download Attachment')}
                                            </a>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                                                <FileText className="w-6 h-6 text-slate-400" />
                                            </div>
                                            <p className="text-sm text-slate-500 font-medium">
                                                {t('No attachment provided')}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Meta Info */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="p-6 space-y-4">
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">{t('Created By')}</p>
                                        <p className="text-sm text-slate-900 mt-1 flex items-center">
                                            <User className="w-4 h-4 mr-2 text-slate-400" />
                                            {Transfer.created_by?.name || '-'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">{t('Transaction Number')}</p>
                                        <p className="text-sm text-slate-900 mt-1 font-mono">
                                            {Transfer.finance_voucher_no}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </main>
            </div>
        </AppLayout>
    );
}



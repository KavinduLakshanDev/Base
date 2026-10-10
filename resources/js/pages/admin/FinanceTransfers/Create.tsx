import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import {
    Receipt,
    Save,
    ArrowLeft,
    CheckCircle,
    Building2,
    UploadCloud,
    Wallet,
    CreditCard,
    Banknote,
    FileText,
    Globe
} from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: t('Dashboard'),
        href: '/dashboard',
    },
    {
        title: t('Finance Transfers'),
        href: '/admin/finance-transfers',
    },
    {
        title: t('Create Transaction'),
        href: '#',
    },
];

interface FinanceAccount {
    id: number;
    account_name: string;
    account_type: string;
    main_category?: string;
}

interface BankAccount {
    id: number;
    account_name: string;
    bank_name: string;
    account_number: string;
}

interface ExpenseAccount {
    id: number;
    account_name: string;
}

interface PettyCashCategory {
    id: number;
    name: string;
}

interface Props {
    next_voucher_no: string;
    finance_accounts: FinanceAccount[];
    bank_accounts: BankAccount[];
    expense_accounts: ExpenseAccount[];
    petty_cash_accounts: PettyCashCategory[];
    delivery_petty_cash_accounts: PettyCashCategory[];
    payer_accounts: string[];
    descriptions: string[];
    flash?: {
        success?: string;
        error?: string;
        created_voucher_id?: number;
    };
}

export default function CreateFinanceTransfer({ next_voucher_no, finance_accounts, bank_accounts, expense_accounts, petty_cash_accounts, delivery_petty_cash_accounts, payer_accounts, descriptions, flash }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        date: new Date().toISOString().split('T')[0],
        type: 'transfer',
        selected_account: '',
        destination_account: '',
        payer_account: '',
        description: '',
        amount: '',
        payment_method: 'cash',
        cheque_number: '',
        cheque_date: '',
        reference_number: '',
        slip: null as File | null,
    });

    const [filteredPayers, setFilteredPayers] = useState<string[]>([]);
    const [showPayers, setShowPayers] = useState(false);
    const [filteredDescriptions, setFilteredDescriptions] = useState<string[]>([]);
    const [showDescriptions, setShowDescriptions] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const handlePayerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setData('payer_account', val);

        if (val) {
            const matches = payer_accounts.filter(p => p.toLowerCase().includes(val.toLowerCase()));
            setFilteredPayers(matches);
            setShowPayers(true);
        } else {
            setShowPayers(false);
        }
    };

    const selectPayer = (payer: string) => {
        setData('payer_account', payer);
        setShowPayers(false);
    };

    const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setData('description', val);

        if (val) {
            const matches = descriptions?.filter(d => d.toLowerCase().includes(val.toLowerCase())) || [];
            setFilteredDescriptions(matches);
            setShowDescriptions(true);
        } else {
            setShowDescriptions(false);
        }
    };

    const selectDescription = (desc: string) => {
        setData('description', desc);
        setShowDescriptions(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setShowConfirmModal(true);
    };

    const handleConfirmSubmit = () => {
        setShowConfirmModal(false);
        post('/admin/finance-transfers', {
            onSuccess: () => {
                reset();
                toast.success(t('Transaction created successfully.'));
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Create Transaction')} />

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
                                    <h1 className="text-xl font-bold text-white">
                                        {t('Create Transaction')}
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        {t('Record a manual deposit, withdrawal, or transfer')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        {/* Form Container */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
                            {/* Success/Error Messages */}
                            {flash?.success && (
                                <div className="mb-6 rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-4">
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

                            {flash?.error && (
                                <div className="mb-6 rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-pink-50 p-4">
                                    <div className="flex">
                                        <div className="shrink-0">
                                            <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm font-medium text-red-800">
                                                {flash.error}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                    {/* Left Column - General Information */}
                                    <div className="space-y-6">
                                        <div className="space-y-6">
                                            <div className="flex items-center space-x-3 mb-6">
                                                <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                                    <Receipt className="w-5 h-5 text-vismass-blue" />
                                                </div>
                                                <h2 className="text-xl font-semibold text-slate-800">{t('Transaction Details')}</h2>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700">
                                                    {t('Transaction Type')} *
                                                </label>
                                                <div className="flex gap-2">
                                                     <button
                                                        type="button"
                                                        onClick={() => setData(data => ({ ...data, type: 'withdraw', destination_account: '' }))}
                                                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                                                            data.type === 'withdraw'
                                                                ? 'bg-vismass-blue text-white shadow-sm border border-vismass-blue'
                                                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        {t('Withdrawal / Payment')}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setData(data => ({ ...data, type: 'deposit', destination_account: '' }))}
                                                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                                                            data.type === 'deposit'
                                                                ? 'bg-vismass-blue text-white shadow-sm border border-vismass-blue'
                                                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        {t('Deposit')}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setData(data => ({ ...data, type: 'transfer', payer_account: '' }))}
                                                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                                                            data.type === 'transfer'
                                                                ? 'bg-vismass-blue text-white shadow-sm border border-vismass-blue'
                                                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        {t('Transfer')}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700">
                                                    {t('Transaction No.')}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={next_voucher_no}
                                                    readOnly
                                                    className="block border w-full rounded-xl border-slate-200 bg-slate-50 px-4 py-3 cursor-not-allowed font-mono text-slate-500"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700">
                                                    {t('Date')} *
                                                </label>
                                                <input
                                                    type="date"
                                                    value={data.date}
                                                    onChange={(e) => setData('date', e.target.value)}
                                                    className="block border w-full rounded-xl border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                    required
                                                />
                                                {errors.date && (
                                                    <div className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                                                        {errors.date}
                                                    </div>
                                                )}
                                            </div>

                                                {['transfer', 'withdraw'].includes(data.type) && (
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-slate-700 flex items-center">
                                                        <Building2 className="w-4 h-4 mr-2 text-amber-500" />
                                                        {data.type === 'transfer' ? t('To Account') : t('To Account')} {data.type === 'transfer' ? '*' : ''}
                                                    </label>
                                                    <select
                                                        value={data.destination_account}
                                                        onChange={(e) => setData('destination_account', e.target.value)}
                                                        className="block border w-full rounded-xl border-slate-200 focus:border-amber-500 focus:ring-amber-500/20 px-4 py-3"
                                                        required={data.type === 'transfer'}
                                                    >
                                                        <option value="">{data.type === 'transfer' ? t('Select Destination Account...') : t('Select Expense Category (Optional)...')}</option>
                                                        
                                                        {finance_accounts.length > 0 && (
                                                            Object.entries(
                                                                finance_accounts
                                                                    .filter(acc => {
                                                                        if (data.type === 'transfer') return acc.main_category === 'assets';
                                                                        if (data.type === 'withdraw') return ['liabilities', 'revenue', 'equity', 'expenses'].includes(acc.main_category || '');
                                                                        return false;
                                                                    })
                                                                    .reduce((acc, current) => {
                                                                        const category = current.main_category || 'Other';
                                                                        if (!acc[category]) acc[category] = [];
                                                                        acc[category].push(current);
                                                                        return acc;
                                                                    }, {} as Record<string, typeof finance_accounts>)
                                                            ).map(([type, accounts]) => (
                                                                <optgroup key={`dest_finance_group_${type}`} label={type}>
                                                                    {accounts.map(acc => (
                                                                        <option 
                                                                            key={`dest_finance_${acc.id}`} 
                                                                            value={`finance_${acc.id}`}
                                                                            disabled={data.selected_account === `finance_${acc.id}`}
                                                                        >
                                                                            {acc.account_name}
                                                                        </option>
                                                                    ))}
                                                                </optgroup>
                                                            ))
                                                        )}

                                                        {data.type === 'transfer' && bank_accounts.length > 0 && (
                                                            <optgroup label={t('Bank Accounts')}>
                                                                {bank_accounts.map(acc => (
                                                                    <option 
                                                                        key={`dest_bank_${acc.id}`} 
                                                                        value={`bank_${acc.id}`}
                                                                        disabled={data.selected_account === `bank_${acc.id}`}
                                                                    >
                                                                        {acc.account_name} - {acc.bank_name} ({acc.account_number})
                                                                    </option>
                                                                ))}
                                                            </optgroup>
                                                        )}

                                                        {expense_accounts?.length > 0 && (
                                                            <optgroup label={t('Expense Accounts')}>
                                                                {expense_accounts.map(acc => (
                                                                    <option 
                                                                        key={`dest_expense_${acc.id}`} 
                                                                        value={`expense_${acc.id}`}
                                                                        disabled={data.selected_account === `expense_${acc.id}`}
                                                                    >
                                                                        {acc.account_name}
                                                                    </option>
                                                                ))}
                                                            </optgroup>
                                                        )}

                                                        {data.type === 'transfer' && petty_cash_accounts?.length > 0 && (
                                                            <optgroup label={t('Shop Petty Cash')}>
                                                                {petty_cash_accounts.map(acc => (
                                                                    <option 
                                                                        key={`dest_pettycash_${acc.id}`} 
                                                                        value={`pettycash_${acc.id}`}
                                                                        disabled={data.selected_account === `pettycash_${acc.id}`}
                                                                    >
                                                                        {acc.name}
                                                                    </option>
                                                                ))}
                                                            </optgroup>
                                                        )}

                                                        {data.type === 'transfer' && delivery_petty_cash_accounts?.length > 0 && (
                                                            <optgroup label={t('Delivery Petty Cash')}>
                                                                {delivery_petty_cash_accounts.map(acc => (
                                                                    <option 
                                                                        key={`dest_delpetty_${acc.id}`} 
                                                                        value={`delpetty_${acc.id}`}
                                                                        disabled={data.selected_account === `delpetty_${acc.id}`}
                                                                    >
                                                                        {acc.name}
                                                                    </option>
                                                                ))}
                                                            </optgroup>
                                                        )}
                                                    </select>
                                                    {errors.destination_account && (
                                                        <div className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                                                            {errors.destination_account}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            <input type="hidden" name="type" value={data.type} />

                                            {/* {data.type !== 'transfer' && (
                                                <div className="space-y-2 relative">
                                                    <label className="text-sm font-medium text-slate-700">
                                                        {data.type === 'deposit' ? t('Payer Account') : t('Payee Account')}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={data.payer_account}
                                                        onChange={handlePayerChange}
                                                        onFocus={() => { if (filteredPayers.length > 0) setShowPayers(true); }}
                                                        onBlur={() => setTimeout(() => setShowPayers(false), 200)}
                                                        placeholder={data.type === 'deposit' ? t('Type or select payer name') : t('Type or select payee name')}
                                                        className="block border w-full rounded-xl border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                        autoComplete="off"
                                                    />
                                                    {showPayers && filteredPayers.length > 0 && (
                                                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-auto">
                                                            {filteredPayers.map((payer, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className="px-4 py-3 hover:bg-slate-100 cursor-pointer text-sm"
                                                                    onClick={() => selectPayer(payer)}
                                                                >
                                                                    {payer}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {errors.payer_account && (
                                                        <div className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                                                            {errors.payer_account}
                                                        </div>
                                                    )}
                                                </div>
                                            )} */}
                                        </div>
                                    </div>

                                    {/* Right Column - Financial Information */}
                                    <div className="space-y-6">
                                        <div className="space-y-6">
                                            <div className="flex items-center space-x-3 mb-6">
                                                <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                                    <Wallet className="w-5 h-5 text-vismass-blue" />
                                                </div>
                                                <h2 className="text-xl font-semibold text-slate-800">{t('Account Details')}</h2>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700 flex items-center">
                                                    <Building2 className="w-4 h-4 mr-2 text-vismass-blue" />
                                                    {data.type === 'transfer' ? t('From Account') : t('From Account')} *
                                                </label>
                                                <select
                                                    value={data.selected_account}
                                                    onChange={(e) => setData('selected_account', e.target.value)}
                                                    className="block border w-full rounded-xl border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                    required
                                                >
                                                    <option value="">{t('Select Account...')}</option>
                                                    
                                                    {finance_accounts.length > 0 && (
                                                        Object.entries(
                                                            finance_accounts
                                                                .filter(acc => acc.main_category === 'assets')
                                                                .reduce((acc, current) => {
                                                                    const category = current.main_category || 'Other';
                                                                    if (!acc[category]) acc[category] = [];
                                                                    acc[category].push(current);
                                                                    return acc;
                                                                }, {} as Record<string, typeof finance_accounts>)
                                                        ).map(([type, accounts]) => (
                                                            <optgroup key={`finance_group_${type}`} label={type}>
                                                                {accounts.map(acc => (
                                                                    <option key={`finance_${acc.id}`} value={`finance_${acc.id}`}>
                                                                        {acc.account_name}
                                                                    </option>
                                                                ))}
                                                            </optgroup>
                                                        ))
                                                    )}

                                                    {bank_accounts.length > 0 && (
                                                        <optgroup label={t('Bank Accounts')}>
                                                            {bank_accounts.map(acc => (
                                                                <option key={`bank_${acc.id}`} value={`bank_${acc.id}`}>
                                                                    {acc.account_name} - {acc.bank_name} ({acc.account_number})
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                    )}



                                                    {petty_cash_accounts?.length > 0 && (
                                                        <optgroup label={t('Shop Petty Cash')}>
                                                            {petty_cash_accounts.map(acc => (
                                                                <option key={`pettycash_${acc.id}`} value={`pettycash_${acc.id}`}>
                                                                    {acc.name}
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                    )}

                                                    {delivery_petty_cash_accounts?.length > 0 && (
                                                        <optgroup label={t('Delivery Petty Cash')}>
                                                            {delivery_petty_cash_accounts.map(acc => (
                                                                <option key={`delpetty_${acc.id}`} value={`delpetty_${acc.id}`}>
                                                                    {acc.name}
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                    )}
                                                </select>
                                                {errors.selected_account && (
                                                    <div className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                                                        {errors.selected_account}
                                                    </div>
                                                )}
                                            </div>

                                            

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700">
                                                    {t('Amount (Rs.)')} *
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0.01"
                                                    value={data.amount}
                                                    onChange={(e) => setData('amount', e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (['e', 'E', '+', '-'].includes(e.key)) {
                                                            e.preventDefault();
                                                        }
                                                    }}
                                                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                    className="block border w-full rounded-xl border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                    placeholder="0.00"
                                                    required
                                                />
                                                {errors.amount && (
                                                    <div className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                                                        {errors.amount}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Payment Method */}
                                            <div className="space-y-3">
                                                <label className="text-sm font-medium text-slate-700 flex items-center">
                                                    <CreditCard className="w-4 h-4 mr-2 text-vismass-blue" />
                                                    {t('Payment Method')} *
                                                </label>
                                                <div className="grid grid-cols-3 gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => setData('payment_method', 'cash')}
                                                        className={`flex flex-col items-center justify-center py-3 px-4 rounded-xl border transition-all ${
                                                            data.payment_method === 'cash'
                                                                ? 'bg-vismass-blue/10 border-vismass-blue text-vismass-blue shadow-sm'
                                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        <Banknote className="w-6 h-6 mb-2" />
                                                        <span className="text-sm font-medium">{t('Cash')}</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setData('payment_method', 'cheque')}
                                                        className={`flex flex-col items-center justify-center py-3 px-4 rounded-xl border transition-all ${
                                                            data.payment_method === 'cheque'
                                                                ? 'bg-vismass-blue/10 border-vismass-blue text-vismass-blue shadow-sm'
                                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        <FileText className="w-6 h-6 mb-2" />
                                                        <span className="text-sm font-medium">{t('Cheque')}</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setData('payment_method', 'online')}
                                                        className={`flex flex-col items-center justify-center py-3 px-4 rounded-xl border transition-all ${
                                                            data.payment_method === 'online'
                                                                ? 'bg-vismass-blue/10 border-vismass-blue text-vismass-blue shadow-sm'
                                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        <Globe className="w-6 h-6 mb-2" />
                                                        <span className="text-sm font-medium text-center">{t('Online Transfer')}</span>
                                                    </button>
                                                </div>
                                                {errors.payment_method && (
                                                    <div className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                                                        {errors.payment_method}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Conditional Cheque Fields */}
                                            {data.payment_method === 'cheque' && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium text-slate-700">
                                                            {t('Cheque Number')} *
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={data.cheque_number}
                                                            onChange={(e) => {
                                                                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                                                setData('cheque_number', val);
                                                            }}
                                                            maxLength={6}
                                                            pattern="\d{6}"
                                                            className="block border w-full rounded-xl border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                            placeholder="e.g. 123456"
                                                            required
                                                        />
                                                        {errors.cheque_number && (
                                                            <div className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                                                                {errors.cheque_number}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium text-slate-700">
                                                            {t('Cheque Date')} *
                                                        </label>
                                                        <input
                                                            type="date"
                                                            value={data.cheque_date}
                                                            onChange={(e) => setData('cheque_date', e.target.value)}
                                                            className="block border w-full rounded-xl border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                            required
                                                        />
                                                        {errors.cheque_date && (
                                                            <div className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                                                                {errors.cheque_date}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Conditional Online Transfer Fields */}
                                            {data.payment_method === 'online' && (
                                                <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                                    <label className="text-sm font-medium text-slate-700">
                                                        {t('Reference Number')} *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={data.reference_number}
                                                        onChange={(e) => setData('reference_number', e.target.value)}
                                                        className="block border w-full rounded-xl border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                        placeholder="e.g. REF-12345678"
                                                        required
                                                    />
                                                    {errors.reference_number && (
                                                        <div className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                                                            {errors.reference_number}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className="space-y-2 relative">
                                                <label className="text-sm font-medium text-slate-700">
                                                    {t('Description')}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={data.description}
                                                    onChange={handleDescriptionChange}
                                                    onFocus={() => { if (filteredDescriptions.length > 0) setShowDescriptions(true); }}
                                                    onBlur={() => setTimeout(() => setShowDescriptions(false), 200)}
                                                    className="block border w-full rounded-xl border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                    placeholder={t('Optional description...')}
                                                    autoComplete="off"
                                                />
                                                {showDescriptions && filteredDescriptions.length > 0 && (
                                                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-auto">
                                                        {filteredDescriptions.map((desc, idx) => (
                                                            <div
                                                                key={`desc-${idx}`}
                                                                className="px-4 py-3 hover:bg-slate-100 cursor-pointer text-sm"
                                                                onClick={() => selectDescription(desc)}
                                                            >
                                                                {desc}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {errors.description && (
                                                    <div className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                                                        {errors.description}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Slip Upload */}
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700">
                                                    {t('Upload Slip')}
                                                </label>
                                                <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative">
                                                    <input
                                                        type="file"
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                        onChange={e => setData('slip', e.target.files ? e.target.files[0] : null)}
                                                        accept="image/*,.pdf"
                                                    />
                                                    <UploadCloud className="h-8 w-8 text-slate-400 mb-2" />
                                                    <div className="text-sm font-medium text-slate-700">
                                                        {data.slip ? data.slip.name : t('Click or drag file to upload')}
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-1">{t('Max size: 5MB. Formats: JPG, PNG, PDF.')}</p>
                                                </div>
                                                {errors.slip && (
                                                    <div className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                                                        {errors.slip}
                                                    </div>
                                                )}
                                            </div>

                                        </div>
                                    </div>
                                </div>

                                {/* Submit Buttons */}
                                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end pt-6 border-t border-slate-200">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => router.visit('/admin/finance-transfers')}
                                        className="w-full sm:w-auto px-8 py-3 rounded-xl border-slate-200 hover:bg-slate-50 transition-all duration-200 font-medium"
                                    >
                                        <ArrowLeft className="w-5 h-5 mr-2" />
                                        {t('Cancel')}
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={processing}
                                        className="w-full sm:w-auto bg-vismass-blue hover:bg-vismass-blue/90 text-white px-8 py-3 rounded-xl shadow-sm transition-all duration-200 font-medium"
                                    >
                                        {processing ? (
                                            <div className="flex items-center space-x-2">
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                <span>{t('Saving...')}</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center space-x-2">
                                                <Save className="w-5 h-5" />
                                                <span>{t('Save Transaction')}</span>
                                            </div>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="mt-6 border-t border-sky-200 bg-gradient-to-r from-white to-sky-50">
                    <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
                        <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2">
                            <p className="text-xs text-gray-500">© VISMASS {t('Finance Voucher')} • v1.0.0</p>
                        </div>
                    </div>
                </footer>
            </div>
            <AlertDialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('Confirm Action')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('Are you sure you want to save this Transaction?')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setShowConfirmModal(false)}>{t('Cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmSubmit} className="bg-vismass-blue hover:bg-vismass-blue/90 text-white" disabled={processing}>
                            {processing ? t('Saving...') : t('Yes, save it!')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}



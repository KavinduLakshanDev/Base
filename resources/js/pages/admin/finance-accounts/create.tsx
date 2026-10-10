import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import {
    Building2,
    CreditCard,
    Calendar,
    Save,
    ArrowLeft,
    CheckCircle,
} from 'lucide-react';

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
        title: t('Register Finance Account'),
        href: '#',
    },
];

interface FinanceAccountFormData {
    account_name: string;
    main_category: string;
    account_type: string;
    opening_balance: string;
    status: number;
    [key: string]: any; // Index signature for Inertia router compatibility
}

interface Props {
    flash?: {
        success?: string;
        error?: string;
    };
}

export default function Create({ flash }: Props) {
    const { data, setData, processing, errors, reset } =
        useForm<FinanceAccountFormData>({
            account_name: '',
            main_category: 'assets',
            account_type: 'cash',
            opening_balance: '',
            status: 1,
        });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        router.post('/admin/finance-accounts', data as any, {
            onSuccess: () => {
                reset();
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Register Finance Account')} />
            
            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between py-4">
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
                                        {t('Register Finance Account')}
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        {t('Add a new finance account to your organization')}
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

                            {/* Registration Form */}
                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                    {/* Left Column - Bank Information */}
                                    <div className="space-y-6">
                                        {/* Bank Information Section */}
                                        <div className="space-y-6">
                                            <div className="flex items-center space-x-3 mb-6">
                                                <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                                    <Building2 className="w-5 h-5 text-vismass-blue" />
                                                </div>
                                                <h2 className="text-xl font-semibold text-slate-800">{t('Account Details')}</h2>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700 flex items-center">
                                                    <Building2 className="w-4 h-4 mr-2 text-vismass-blue" />
                                                    {t('Account Name')} *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={data.account_name}
                                                    onChange={(e) => setData('account_name', e.target.value)}
                                                    className="block border w-full rounded-xl border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                    placeholder="e.g., Main Cash Account"
                                                    required
                                                />
                                                {errors.account_name && (
                                                    <div className="mt-2 text-sm text-red-600">
                                                        {errors.account_name}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700">
                                                    {t('Main Category')} *
                                                </label>
                                                <select
                                                    value={data.main_category}
                                                    onChange={(e) => setData('main_category', e.target.value)}
                                                    className="block border w-full rounded-xl border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                    required
                                                >
                                                    <option value="assets">{t('Assets')}</option>
                                                    <option value="liabilities">{t('Liabilities')}</option>
                                                    <option value="equity">{t('Equity')}</option>
                                                    <option value="revenue">{t('Revenue')}</option>
                                                    <option value="expenses">{t('Expenses')}</option>
                                                </select>
                                                {errors.main_category && (
                                                    <div className="mt-2 text-sm text-red-600">
                                                        {errors.main_category}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700">
                                                    {t('Account Type')} *
                                                </label>
                                                <select
                                                    value={data.account_type}
                                                    onChange={(e) => setData('account_type', e.target.value)}
                                                    className="block border w-full rounded-xl border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                    required
                                                >
                                                    <option value="cash">{t('Cash')}</option>
                                                    <option value="cheque">{t('Cheque')}</option>
                                                    <option value="online">{t('Online')}</option>
                                                    <option value="qr_payment">{t('QR Payment')}</option>
                                                    {/* <option value="petty_cash">{t('Petty Cash')}</option>
                                                    <option value="delivery_petty_cash">{t('Delivery Petty Cash')}</option> */}
                                                </select>
                                                {errors.account_type && (
                                                    <div className="mt-2 text-sm text-red-600">
                                                        {errors.account_type}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700">
                                                    {t('Status')} *
                                                </label>
                                                <select
                                                    value={data.status}
                                                    onChange={(e) => setData('status', parseInt(e.target.value))}
                                                    className="block border w-full rounded-xl border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                    required
                                                >
                                                    <option value={1}>{t('Active')}</option>
                                                    <option value={0}>{t('Inactive')}</option>
                                                </select>
                                                {errors.status && (
                                                    <div className="mt-2 text-sm text-red-600">
                                                        {errors.status}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column - Financial & Organization Information */}
                                    <div className="space-y-6">
                                        {/* Financial Information */}
                                        <div className="space-y-6">
                                            <div className="flex items-center space-x-3 mb-6">
                                                <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                                    <CreditCard className="w-5 h-5 text-vismass-blue" />
                                                </div>
                                                <h2 className="text-xl font-semibold text-slate-800">{t('Financial Information')}</h2>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700 flex items-center">
                                                    <CreditCard className="w-4 h-4 mr-2 text-vismass-blue" />
                                                    {t('Opening Balance (Rs.)')}
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={data.opening_balance}
                                                    onChange={(e) => setData('opening_balance', e.target.value)}
                                                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                    className="block border w-full rounded-xl border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                    placeholder="0.00"
                                                />
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {t('Cut-off date will be automatically recorded when opening balance is set.')}
                                                </p>
                                                {errors.opening_balance && (
                                                    <div className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                                                        {errors.opening_balance}
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
                                        onClick={() => router.visit('/admin/finance-accounts')}
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
                                                <span>{t('Registering...')}</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center space-x-2">
                                                <Save className="w-5 h-5" />
                                                <span>{t('Register Finance Account')}</span>
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
                            <p className="text-xs text-gray-500">© VISMASS {t('Finance Account Management')} • v1.0.0</p>
                        </div>
                    </div>
                </footer>
            </div>
        </AppLayout>
    );
}

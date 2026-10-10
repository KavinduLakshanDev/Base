import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import {
    DollarSign,
    User,
    Save,
    ArrowLeft,
    CheckCircle,
    FileText,
    XCircle,
    Edit,
    Shield,
    Lock
} from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: t('Dashboard'),
        href: '/dashboard',
    },
    {
        title: t('Day Opening Balances'),
        href: '/admin/day-opening-balances',
    },
    {
        title: t('Edit Opening Balance'),
        href: '#',
    },
];

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
        email?: string;
        phone?: string;
        role?: {
            id: number;
            name: string;
            level: number;
        };
        company?: {
            company_code: string;
            name: string;
        };
        section?: {
            section_code: string;
            name: string;
        };
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

interface DayOpeningBalanceFormData {
    opening_balance: string;
    currency: string;
    notes: string;
    // admin credentials are handled separately to avoid persistence in Inertia
    [key: string]: any;
}

interface Props {
    balance: DayOpeningBalance;
    canEditDirectly: boolean;
    flash?: {
        success?: string;
        error?: string;
    };
}

export default function EditDayOpeningBalance({ balance, canEditDirectly, flash }: Props) {
    const [showAdminAuth, setShowAdminAuth] = useState(!canEditDirectly);

    const { data, setData, processing, errors, reset } =
        useForm<DayOpeningBalanceFormData>({
            opening_balance: balance.opening_balance.toString(),
            currency: balance.currency,
            notes: balance.notes || '',
        });

    // keep admin credentials locally rather than in form state
    const [adminUsername, setAdminUsername] = useState('');
    const [adminPassword, setAdminPassword] = useState('');

    const clearAdminFields = () => {
        setAdminUsername('');
        setAdminPassword('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // merge credentials only when submitting
        router.put(`/admin/day-opening-balances/${balance.id}`, {
            ...data,
            admin_username: adminUsername,
            admin_password: adminPassword,
        }, {
            onSuccess: clearAdminFields,
            onError: clearAdminFields,
        });
    };

    const formatCurrency = (amount: number, currency: string) => {
        return `${currency} ${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Edit Opening Balance')} />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4">
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <Edit className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">
                                        {t('Edit Opening Balance')}
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        {t('Update opening balance information')}
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

                    {/* Balance Information Display */}
                    <div className="mb-8 bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4">{t('Balance Information')}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* User Information */}
                            <div className="md:col-span-2 lg:col-span-1">
                                <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center">
                                    <User className="h-4 w-4 mr-2" />
                                    {t('User Details')}
                                </h4>
                                <div className="space-y-2">
                                    <div>
                                        <span className="text-xs font-medium text-slate-500">{t('Name')}:</span>
                                        <p className="text-sm text-slate-900 font-medium">{balance.user.name}</p>
                                    </div>
                                    {balance.user.username && (
                                        <div>
                                            <span className="text-xs font-medium text-slate-500">{t('Username')}:</span>
                                            <p className="text-sm text-slate-900">{balance.user.username}</p>
                                        </div>
                                    )}
                                    {balance.user.email && (
                                        <div>
                                            <span className="text-xs font-medium text-slate-500">{t('Email')}:</span>
                                            <p className="text-sm text-slate-900">{balance.user.email}</p>
                                        </div>
                                    )}
                                    {balance.user.phone && (
                                        <div>
                                            <span className="text-xs font-medium text-slate-500">{t('Phone')}:</span>
                                            <p className="text-sm text-slate-900">{balance.user.phone}</p>
                                        </div>
                                    )}
                                    {balance.user.role && (
                                        <div>
                                            <span className="text-xs font-medium text-slate-500">{t('Role')}:</span>
                                            <p className="text-sm text-slate-900">{balance.user.role.name}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Company & Section Information */}
                            <div>
                                <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center">
                                    <FileText className="h-4 w-4 mr-2" />
                                    {t('Organization')}
                                </h4>
                                <div className="space-y-2">
                                    {balance.user.company && (
                                        <div>
                                            <span className="text-xs font-medium text-slate-500">{t('Company')}:</span>
                                            <p className="text-sm text-slate-900">{balance.user.company.name}</p>
                                        </div>
                                    )}
                                    {balance.user.section && (
                                        <div>
                                            <span className="text-xs font-medium text-slate-500">{t('Section')}:</span>
                                            <p className="text-sm text-slate-900">{balance.user.section.name}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Balance Details */}
                            <div>
                                <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center">
                                    <DollarSign className="h-4 w-4 mr-2" />
                                    {t('Balance Details')}
                                </h4>
                                <div className="space-y-2">
                                    <div>
                                        <span className="text-xs font-medium text-slate-500">{t('Date')}:</span>
                                        <p className="text-sm text-slate-900">{new Date(balance.balance_date).toLocaleDateString('en-GB')}</p>
                                    </div>
                                    <div>
                                        <span className="text-xs font-medium text-slate-500">{t('Current Balance')}:</span>
                                        <p className="text-sm font-medium text-slate-900">{formatCurrency(balance.opening_balance, balance.currency)}</p>
                                    </div>
                                    <div>
                                        <span className="text-xs font-medium text-slate-500">{t('Status')}:</span>
                                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                            balance.status === 'active'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-gray-100 text-gray-800'
                                        }`}>
                                            {balance.status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Admin Authorization Warning */}
                    {!canEditDirectly && (
                        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex">
                                <Shield className="h-5 w-5 text-yellow-500" />
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-yellow-800">
                                        {t('Admin Approval Required')}
                                    </h3>
                                    <p className="mt-1 text-sm text-yellow-700">
                                        {t('You are editing your own opening balance. Admin approval is required to make changes.')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Edit Form */}
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            {/* Left Column - Financial Information */}
                            <div className="space-y-6">
                                {/* Financial Information */}
                                <div className="space-y-6">
                                    <div className="flex items-center space-x-3 mb-6">
                                        <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                            <DollarSign className="w-5 h-5 text-vismass-blue" />
                                        </div>
                                        <h2 className="text-xl font-semibold text-slate-800">{t('Financial Information')}</h2>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 flex items-center">
                                            <DollarSign className="w-4 h-4 mr-2 text-vismass-blue" />
                                            {t('Opening Balance (Rs.)')} *
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={data.opening_balance}
                                            readOnly={!canEditDirectly}
                                            onChange={(e) => canEditDirectly && setData('opening_balance', e.target.value)}
                                            className={`block w-full border border-slate-200 px-4 py-3 font-medium rounded-xl ${
                                                canEditDirectly
                                                    ? 'focus:border-vismass-blue focus:ring-vismass-blue/20 text-slate-900'
                                                    : 'bg-slate-100 cursor-not-allowed text-slate-600'
                                            }`}
                                            placeholder="0.00"
                                            required
                                        />
                                        {errors.opening_balance && (
                                            <div className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                                                {errors.opening_balance}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">
                                            {t('Currency')} *
                                        </label>
                                        <input type="hidden" name="currency" value="LKR" />
                                        <p className="text-sm text-slate-900 font-medium">LKR - Sri Lankan Rupee</p>
                                        {errors.currency && (
                                            <div className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                                                {errors.currency}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column - Additional Information & Admin Auth */}
                            <div className="space-y-6">
                                {/* Additional Information */}
                                <div className="space-y-6">
                                    <div className="flex items-center space-x-3 mb-6">
                                        <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                            <FileText className="w-5 h-5 text-vismass-blue" />
                                        </div>
                                        <h2 className="text-xl font-semibold text-slate-800">{t('Additional Information')}</h2>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 flex items-center">
                                            <FileText className="w-4 h-4 mr-2 text-vismass-blue" />
                                            {t('Notes')}
                                        </label>
                                        <textarea
                                            value={data.notes}
                                            onChange={(e) => setData('notes', e.target.value)}
                                            rows={3}
                                            className="block w-full rounded-xl border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                            placeholder="Additional notes about this opening balance"
                                        />
                                        {errors.notes && (
                                            <div className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                                                {errors.notes}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Admin Authorization Section */}
                                {!canEditDirectly && (
                                    <div className="space-y-6">
                                        <div className="flex items-center space-x-3 mb-6">
                                            <div className="p-2 bg-red-100 rounded-lg">
                                                <Lock className="w-5 h-5 text-red-600" />
                                            </div>
                                            <h2 className="text-xl font-semibold text-slate-800">{t('Admin Authorization')}</h2>
                                        </div>

                                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-red-700">
                                                        {t('Admin Email')} *
                                                    </label>
                                                    <input
                                                        type="email"
                                                        autoComplete="off"
                                                        value={adminUsername}
                                                        onChange={(e) => setAdminUsername(e.target.value)}
                                                        className="block w-full rounded-xl border-red-200 focus:border-red-500 focus:ring-red-500/20 px-4 py-3"
                                                        placeholder="Enter admin email"
                                                        required={!canEditDirectly}
                                                    />
                                                    {errors.admin_username && (
                                                        <div className="mt-2 text-sm text-red-600">
                                                            {errors.admin_username}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-red-700">
                                                        {t('Admin Password')} *
                                                    </label>
                                                    <input
                                                        type="password"
                                                        autoComplete="new-password"
                                                        value={adminPassword}
                                                        onChange={(e) => setAdminPassword(e.target.value)}
                                                        className="block w-full rounded-xl border-red-200 focus:border-red-500 focus:ring-red-500/20 px-4 py-3"
                                                        placeholder="Enter admin password"
                                                        required={!canEditDirectly}
                                                    />
                                                    {errors.admin_password && (
                                                        <div className="mt-2 text-sm text-red-600">
                                                            {errors.admin_password}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Submit Buttons */}
                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end pt-6 border-t border-slate-200">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.visit('/admin/day-opening-balances')}
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
                                        <span>{t('Updating...')}</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center space-x-2">
                                        <Save className="w-5 h-5" />
                                        <span>{t('Update Opening Balance')}</span>
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
                            <p className="text-xs text-gray-500">© VISMASS {t('Day Opening Balances')} • v1.0.0</p>
                        </div>
                    </div>
                </footer>
            </div>
        </AppLayout>
    );
}
import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { toast } from 'sonner';
import { Save, Calculator, TrendingUp, Gift, Award, CreditCard } from 'lucide-react';
import { type BreadcrumbItem } from '@/types';

interface PointsRule {
    id: number;
    company_code: string;
    currency_amount: number;
    points_earned: number;
    created_at: string;
    updated_at: string;
}

interface Props {
    rule: PointsRule | null;
    success?: string;
    error?: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
 
    {
        title: 'Points Rules',
        href: '#',
    },
];

export default function PointsRules({ rule, success, error }: Props) {
    const [currencyAmount, setCurrencyAmount] = useState(rule?.currency_amount?.toString() || '100');
    const [pointsEarned, setPointsEarned] = useState(rule?.points_earned?.toString() || '1');
    const [isSubmitting, setIsSubmitting] = useState(false);

    React.useEffect(() => {
        if (success) {
            toast.success(success);
        }
        if (error) {
            toast.error(error);
        }
    }, [success, error]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const formData = {
            currency_amount: parseFloat(currencyAmount),
            points_earned: parseInt(pointsEarned),
        };

        router.post('/points-rules', formData, {
            onSuccess: () => {
                setIsSubmitting(false);
                toast.success('Points rule updated successfully');
            },
            onError: () => {
                setIsSubmitting(false);
                toast.error('Failed to update points rule');
            },
        });
    };

    const calculateExample = () => {
        const amount = parseFloat(currencyAmount) || 0;
        const points = parseInt(pointsEarned) || 0;
        const exampleAmount = 500;
        const examplePoints = (exampleAmount / amount) * points;
        return { amount: exampleAmount, points: Math.floor(examplePoints) };
    };

    const example = calculateExample();

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Points Earning Rules')} />
            
            <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50">
                {/* Header - CheckInvoice style */}
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
                                    <Gift className="h-7 w-7 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-white">
                                        {t('Points Earning Rules')}
                                    </h1>
                                    <p className="text-sm text-sky-200">
                                        {t('Configure how customers earn loyalty points')}
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
                        {/* Stats Cards - CheckInvoice style */}
                        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
                            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-sky-50 p-6 shadow-md transition-all duration-300 hover:shadow-xl border border-sky-100">
                                <div className="flex items-center">
                                    <div className="rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 p-3 shadow">
                                        <Calculator className="h-6 w-6 text-white" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">{t('Current Rate')}</p>
                                        <p className="text-2xl font-bold text-gray-900">
                                            Rs. {rule?.currency_amount || 100} : {rule?.points_earned || 1}
                                        </p>
                                    </div>
                                </div>
                                <div className="absolute -right-4 -bottom-4 h-16 w-16 rounded-full bg-sky-200/20"></div>
                            </div>

                            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-sky-50 p-6 shadow-md transition-all duration-300 hover:shadow-xl border border-sky-100">
                                <div className="flex items-center">
                                    <div className="rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 p-3 shadow">
                                        <TrendingUp className="h-6 w-6 text-white" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">{t('Example Purchase')}</p>
                                        <p className="text-2xl font-bold text-gray-900">
                                            Rs. {example.amount}
                                        </p>
                                    </div>
                                </div>
                                <div className="absolute -right-4 -bottom-4 h-16 w-16 rounded-full bg-sky-200/20"></div>
                            </div>

                            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-sky-50 p-6 shadow-md transition-all duration-300 hover:shadow-xl border border-sky-100">
                                <div className="flex items-center">
                                    <div className="rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 p-3 shadow">
                                        <Award className="h-6 w-6 text-white" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">{t('Points Earned')}</p>
                                        <p className="text-2xl font-bold text-gray-900">
                                            {example.points} {t('Pts')}
                                        </p>
                                    </div>
                                </div>
                                <div className="absolute -right-4 -bottom-4 h-16 w-16 rounded-full bg-sky-200/20"></div>
                            </div>

                            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-sky-50 p-6 shadow-md transition-all duration-300 hover:shadow-xl border border-sky-100">
                                <div className="flex items-center">
                                    <div className="rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 p-3 shadow">
                                        <CreditCard className="h-6 w-6 text-white" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">{t('Value per Point')}</p>
                                        <p className="text-2xl font-bold text-gray-900">
                                            Rs. {((rule?.currency_amount || 100) / (rule?.points_earned || 1)).toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                                <div className="absolute -right-4 -bottom-4 h-16 w-16 rounded-full bg-sky-200/20"></div>
                            </div>
                        </div>

                        {/* Main Content Card - CheckInvoice style */}
                        <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-white to-sky-50 shadow-lg overflow-hidden">
                            <div className="bg-gradient-to-r from-sky-900 via-sky-800 to-blue-900 px-6 py-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">
                                            {t('Points Earning Rules Configuration')}
                                        </h3>
                                        <p className="text-sky-200 text-sm mt-1">
                                            {t('Manage and configure loyalty points earning rules')}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {rule && (
                                            <span className="rounded-full bg-gradient-to-r from-green-600 to-emerald-600 px-3 py-1 text-xs font-medium text-white">
                                                ✅ {t('Rule Active')}
                                            </span>
                                        )}
                                        <span className="rounded-full bg-gradient-to-r from-sky-600 to-blue-600 px-3 py-1 text-xs font-medium text-white">
                                            {rule ? t('Last Updated') : t('New Rule')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6">
                                {/* Current Rule Display */}
                                {rule && (
                                    <div className="mb-6 rounded-xl border border-sky-200 bg-gradient-to-r from-sky-50 to-blue-50 p-4">
                                        <h4 className="mb-3 flex items-center text-sm font-semibold text-sky-900">
                                            <Calculator className="mr-2 h-4 w-4" />
                                            {t('Current Active Rule')}
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="flex items-center justify-between rounded-lg border border-sky-200 bg-white p-4">
                                                <div>
                                                    <div className="text-sm text-gray-600">{t('Currency Amount')}</div>
                                                    <div className="text-lg font-bold text-sky-700">Rs. {rule.currency_amount}</div>
                                                </div>
                                                <div className="text-sky-600 font-bold">=</div>
                                                <div>
                                                    <div className="text-sm text-gray-600">{t('Points Earned')}</div>
                                                    <div className="text-lg font-bold text-emerald-700">{rule.points_earned} {t('Points')}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between rounded-lg border border-sky-200 bg-white p-4">
                                                <div>
                                                    <div className="text-sm text-gray-600">{t('Example Calculation')}</div>
                                                    <div className="text-lg font-bold text-gray-900">Rs. {example.amount}</div>
                                                </div>
                                                <div className="text-sky-600 font-bold">=</div>
                                                <div>
                                                    <div className="text-sm text-gray-600">{t('Earns')}</div>
                                                    <div className="text-lg font-bold text-amber-700">{example.points} {t('Points')}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Configuration Form */}
                                <div className="mb-6 rounded-xl border border-sky-200 bg-gradient-to-r from-sky-50 to-blue-50 p-6">
                                    <h4 className="mb-4 text-lg font-semibold text-sky-900">
                                        {t('Configure Points Rule')}
                                    </h4>
                                    
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-gray-700">
                                                    {t('Currency Amount (Rs)')} <span className="text-red-500">*</span>
                                                </label>
                                                <div className="relative rounded-lg shadow-sm">
                                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                        <span className="text-gray-500 sm:text-sm">Rs.</span>
                                                    </div>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0.01"
                                                        value={currencyAmount}
                                                        onChange={(e) => setCurrencyAmount(e.target.value)}
                                                        placeholder="100.00"
                                                        required
                                                        className="block w-full rounded-xl border border-gray-300 bg-white py-2 pl-12 pr-4 text-gray-900 shadow-sm focus:border-sky-500 focus:ring-sky-500 focus:outline-none transition-colors duration-200"
                                                    />
                                                </div>
                                                <p className="mt-1 text-xs text-gray-600">
                                                    {t('Amount of money required to earn points')}
                                                </p>
                                            </div>

                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-gray-700">
                                                    {t('Points Earned')} <span className="text-red-500">*</span>
                                                </label>
                                                <div className="relative rounded-lg shadow-sm">
                                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                        <Gift className="h-4 w-4 text-gray-400" />
                                                    </div>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={pointsEarned}
                                                        onChange={(e) => setPointsEarned(e.target.value)}
                                                        placeholder="1"
                                                        required
                                                        className="block w-full rounded-xl border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 shadow-sm focus:border-sky-500 focus:ring-sky-500 focus:outline-none transition-colors duration-200"
                                                    />
                                                </div>
                                                <p className="mt-1 text-xs text-gray-600">
                                                    {t('Number of points to award')}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Preview */}
                                        <div className="rounded-xl border border-sky-200 bg-white p-4">
                                            <h5 className="mb-3 flex items-center text-sm font-semibold text-sky-900">
                                                <Calculator className="mr-2 h-4 w-4" />
                                                {t('Rule Preview')}
                                            </h5>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="flex items-center justify-between rounded-lg bg-gradient-to-r from-sky-50 to-blue-50 p-4">
                                                    <div>
                                                        <div className="text-sm text-gray-600">{t('New Rule')}</div>
                                                        <div className="text-lg font-bold text-sky-700">
                                                            Rs. {currencyAmount} = {pointsEarned} {t('Points')}
                                                        </div>
                                                    </div>
                                                    <div className="text-sky-600 font-bold text-xl">=</div>
                                                </div>
                                                <div className="flex items-center justify-between rounded-lg bg-gradient-to-r from-emerald-50 to-green-50 p-4">
                                                    <div>
                                                        <div className="text-sm text-gray-600">{t('Example')}: Rs. {example.amount}</div>
                                                        <div className="text-lg font-bold text-emerald-700">
                                                            {t(`Earns ${example.points} ${t('Points')}`)}
                                                        </div>
                                                    </div>
                                                    <div className="text-emerald-600">
                                                        <Award className="h-6 w-6" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-end">
                                            <button
                                                type="submit"
                                                disabled={isSubmitting}
                                                className="inline-flex items-center rounded-xl border border-transparent bg-gradient-to-r from-sky-600 to-blue-600 px-6 py-3 text-sm font-medium text-white shadow-sm hover:from-sky-700 hover:to-blue-700 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"
                                            >
                                                {isSubmitting ? (
                                                    <>
                                                        <svg className="mr-2 h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        {t('Saving...')}
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save className="mr-2 h-4 w-4" />
                                                        {t('Save Rule')}
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                {/* Information Card */}
                                <div className="rounded-xl border border-sky-200 bg-gradient-to-r from-sky-50 to-blue-50 p-6">
                                    <h4 className="mb-4 text-lg font-semibold text-sky-900">
                                        {t('How Points are Calculated')}
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div className="flex items-start space-x-3">
                                                <div className="mt-1 rounded-lg bg-gradient-to-r from-sky-500 to-blue-500 p-2">
                                                    <Calculator className="h-4 w-4 text-white" />
                                                </div>
                                                <div>
                                                    <h5 className="text-sm font-medium text-gray-900">{t('Calculation Formula')}</h5>
                                                    <p className="text-xs text-gray-600">
                                                        {t('Points = (Total Bill Amount ÷ Currency Amount) × Points Earned')}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-start space-x-3">
                                                <div className="mt-1 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 p-2">
                                                    <Gift className="h-4 w-4 text-white" />
                                                </div>
                                                <div>
                                                    <h5 className="text-sm font-medium text-gray-900">{t('Rounded Down')}</h5>
                                                    <p className="text-xs text-gray-600">
                                                        {t('Partial points are always rounded down to nearest whole number')}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="flex items-start space-x-3">
                                                <div className="mt-1 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 p-2">
                                                    <Award className="h-4 w-4 text-white" />
                                                </div>
                                                <div>
                                                    <h5 className="text-sm font-medium text-gray-900">{t('One Rule per Company')}</h5>
                                                    <p className="text-xs text-gray-600">
                                                        {t('Only one points earning rule can exist per company at a time')}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-start space-x-3">
                                                <div className="mt-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 p-2">
                                                    <TrendingUp className="h-4 w-4 text-white" />
                                                </div>
                                                <div>
                                                    <h5 className="text-sm font-medium text-gray-900">{t('Instant Application')}</h5>
                                                    <p className="text-xs text-gray-600">
                                                        {t('Rule changes apply immediately to all new purchases')}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Footer - CheckInvoice style */}
                <footer className="mt-12 border-t border-sky-200 bg-gradient-to-r from-white to-sky-50">
                    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
                            <p className="text-xs text-gray-600">© UNITEC POS System • {t('Points Earning Rules')}</p>
                            <p className="text-xs text-gray-500">v1.0.0 • {t('Professional POS Solution')}</p>
                        </div>
                    </div>
                </footer>
            </div>
        </AppLayout>
    );
}
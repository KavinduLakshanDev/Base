import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import {
    DollarSign,
    User,
    Calendar,
    Save,
    ArrowLeft,
    CheckCircle,
    FileText,
    XCircle
} from 'lucide-react';
import { useEffect } from 'react';

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
        title: t('Add Opening Balance'),
        href: '#',
    },
];

interface User {
    id: number;
    name: string;
    // when returned from the controller we'll include a small role object for clarity
    role?: {
        id: number;
        slug: string;
        name: string;
    };
    closing_bbf?: number;
}

interface DayOpeningBalanceFormData {
    user_id: string;
    balance_date: string;
    opening_balance: string;
    currency: string;
    notes: string;
    [key: string]: any;
}

interface Props {
    users: User[]; // list of available users (may be limited for cashiers)
    currentUser?: User; // logged-in user info, used when cashier
    isCashier?: boolean;
    flash?: {
        success?: string;
        error?: string;
    };
}

export default function Create({ users, currentUser, isCashier = false, flash }: Props) {
    const { data, setData, processing, errors, reset } =
        useForm<DayOpeningBalanceFormData>({
            user_id: '',
            balance_date: new Date().toISOString().split('T')[0], // Today's date
            opening_balance: '',
            currency: 'LKR',
            notes: '',
        });

    useEffect(() => {
        if (isCashier && currentUser) {
            setData('user_id', String(currentUser.id));
        }
    }, [isCashier, currentUser]); // removed setData from dependency array

    useEffect(() => {
        if (data.user_id) {
            const selectedUser = users.find(u => String(u.id) === String(data.user_id));
            if (selectedUser && selectedUser.closing_bbf !== undefined) {
                setData('opening_balance', String(selectedUser.closing_bbf));
            } else {
                setData('opening_balance', '0');
            }
        } else {
            setData('opening_balance', '');
        }
    }, [data.user_id, users]); // removed setData from dependency array

    const selectedUser = users.find(u => String(u.id) === String(data.user_id));
    const closingBbf = selectedUser?.closing_bbf ?? 0;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        router.post('/admin/day-opening-balances', data, {
            onSuccess: () => {
                reset();
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Add Opening Balance')} />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4">
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <DollarSign className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">
                                        {t('Add Opening Balance')}
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        {t('Set the opening cash balance for a user')}
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

                    {/* Registration Form */}
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            {/* Left Column - User & Date Information */}
                            <div className="space-y-6">
                                {/* User & Date Information Section */}
                                <div className="space-y-6">
                                    <div className="flex items-center space-x-3 mb-6">
                                        <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                            <User className="w-5 h-5 text-vismass-blue" />
                                        </div>
                                        <h2 className="text-xl font-semibold text-slate-800">{t('User & Date Information')}</h2>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 flex items-center">
                                            <User className="w-4 h-4 mr-2 text-vismass-blue" />
                                            {t('Select User')} *
                                        </label>
                                        {!isCashier ? (
                                            <>
                                                <select
                                                    value={data.user_id}
                                                    onChange={(e) => setData('user_id', e.target.value)}
                                                    className="block w-full rounded-xl border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                    required
                                                >
                                                    <option value="">{t('Choose a user...')}</option>
                                                    {users.map((user) => (
                                                        <option key={user.id} value={user.id}>
                                                            {user.name} {user.role ? `(${user.role.name})` : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                                {errors.user_id && (
                                                    <div className="mt-2 text-sm text-red-600">
                                                        {errors.user_id}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            // cashier – fixed to themselves; include hidden field
                                            <>
                                                <input type="hidden" name="user_id" value={data.user_id} />
                                                <p className="text-sm font-medium text-slate-900 flex items-center">
                                                    {currentUser?.name}
                                                    {currentUser?.role ? ` (${currentUser.role.name})` : ''}
                                                    <CheckCircle className="ml-2 h-4 w-4 text-green-500" />
                                                </p>
                                            </>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 flex items-center">
                                            <Calendar className="w-4 h-4 mr-2 text-vismass-blue" />
                                            {t('Balance Date')} *
                                        </label>
                                        <input
                                            type="date"
                                            value={data.balance_date}
                                            onChange={(e) => setData('balance_date', e.target.value)}
                                            max={new Date().toISOString().split('T')[0]} // Cannot select future dates
                                            className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                            required
                                        />
                                        {errors.balance_date && (
                                            <div className="mt-2 text-sm text-red-600">
                                                {errors.balance_date}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column - Financial Information */}
                            <div className="space-y-6">
                                {/* Financial Information */}
                                <div className="space-y-6">
                                    <div className="flex items-center space-x-3 mb-6">
                                        <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                            <DollarSign className="w-5 h-5 text-vismass-blue" />
                                        </div>
                                        <h2 className="text-xl font-semibold text-slate-800">{t('Financial Information')}</h2>
                                    </div>

                                    {data.user_id && (
                                        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 mb-4">
                                            <p className="text-sm text-blue-800 font-medium mb-1">{t('Previous Closing B/B/F')}</p>
                                            <p className="text-2xl font-bold text-blue-900">
                                                Rs. {closingBbf.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                            {closingBbf === 0 && (
                                                <p className="text-xs text-blue-600 mt-2">
                                                    {t('New user — contact admin to set initial opening balance.')}
                                                </p>
                                            )}
                                        </div>
                                    )}

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
                                            readOnly
                                            className="block w-full border border-slate-200 px-4 py-3 bg-slate-100 cursor-not-allowed text-slate-600 font-medium rounded-xl"
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
                                        {/* fixed currency LKR */}
                                        <input type="hidden" name="currency" value="LKR" />
                                        <p className="text-sm text-slate-900 font-medium">LKR - Sri Lankan Rupee</p>
                                        {errors.currency && (
                                            <div className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                                                {errors.currency}
                                            </div>
                                        )}
                                    </div>
                                </div>

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
                                            className="block w-full border rounded-xl border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                            placeholder="Additional notes about this opening balance"
                                        />
                                        {errors.notes && (
                                            <div className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                                                {errors.notes}
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
                                        <span>{t('Creating...')}</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center space-x-2">
                                        <Save className="w-5 h-5" />
                                        <span>{t('Create Opening Balance')}</span>
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
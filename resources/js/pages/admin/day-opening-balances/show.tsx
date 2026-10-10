import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import {
    DollarSign,
    User,
    ArrowLeft,
    CheckCircle,
    FileText,
    XCircle,
    Eye,
    Edit,
    Shield
} from 'lucide-react';

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
        title: t('View Opening Balance'),
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
    updated_at: string;
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
    company: {
        company_code: string;
        name: string;
    };
    section: {
        section_code: string;
        name: string;
    };
}

interface Props {
    balance: DayOpeningBalance;
    flash?: {
        success?: string;
        error?: string;
    };
}

export default function Show({ balance, flash }: Props) {
    const formatCurrency = (amount: number, currency: string) => {
        return `${currency} ${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-GB', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('View Opening Balance')} />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4">
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <Eye className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">
                                        {t('View Opening Balance')}
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        {t('Opening balance details')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => router.visit(`/admin/day-opening-balances/${balance.id}/edit`)}
                                    className="w-full sm:w-auto justify-center bg-white/10 border-white/20 text-white hover:bg-white/20"
                                >
                                    <Edit className="h-4 w-4 mr-2" />
                                    {t('Edit')}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => router.visit('/admin/day-opening-balances')}
                                    className="w-full sm:w-auto justify-center bg-white/10 border-white/20 text-white hover:bg-white/20"
                                >
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    {t('Back to List')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
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
                                            <span className="text-xs font-medium text-slate-500">{t('Opening Balance')}:</span>
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

                        {/* Additional Details */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Balance Notes */}
                            <div className="bg-white rounded-lg p-6 border border-slate-200">
                                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                                    <FileText className="h-5 w-5 mr-2" />
                                    {t('Notes')}
                                </h3>
                                <div className="bg-slate-50 rounded-lg p-4">
                                    {balance.notes ? (
                                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{balance.notes}</p>
                                    ) : (
                                        <p className="text-sm text-slate-500 italic">{t('No notes provided')}</p>
                                    )}
                                </div>
                            </div>

                            {/* Audit Information */}
                            <div className="bg-white rounded-lg p-6 border border-slate-200">
                                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                                    <Shield className="h-5 w-5 mr-2" />
                                    {t('Audit Information')}
                                </h3>
                                <div className="space-y-3">
                                    <div>
                                        <span className="text-sm font-medium text-slate-600">{t('Created By')}:</span>
                                        <p className="text-sm text-slate-900">{balance.creator.name}</p>
                                    </div>
                                    <div>
                                        <span className="text-sm font-medium text-slate-600">{t('Created At')}:</span>
                                        <p className="text-sm text-slate-900">{formatDateTime(balance.created_at)}</p>
                                    </div>
                                    {balance.approver && (
                                        <div>
                                            <span className="text-sm font-medium text-slate-600">{t('Approved By')}:</span>
                                            <p className="text-sm text-slate-900">{balance.approver.name}</p>
                                        </div>
                                    )}
                                    <div>
                                        <span className="text-sm font-medium text-slate-600">{t('Last Updated')}:</span>
                                        <p className="text-sm text-slate-900">{formatDateTime(balance.updated_at)}</p>
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
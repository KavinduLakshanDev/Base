import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { Receipt, ArrowLeft } from 'lucide-react';
import CustomerPaymentForm from './PaymentForm';

interface Customer {
    AdrKy: number;
    FstNm: string;
    AdrCd: string;
    AccKy: number;
}

export default function CustomerPaymentCreate({ customers, bankAccounts }: { customers: Customer[]; bankAccounts?: any[] }) {
    const { flash } = usePage().props as any;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('Dashboard'), href: '/dashboard' },
        { title: t('Customer Payments'), href: '/admin/customer-payments' },
        { title: t('Create Payment'), href: '#' }
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="min-h-screen bg-slate-50">
                <Head title={t('Create Customer Payment')} />

                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4 gap-3">
                            <div className="flex min-w-0 items-center space-x-3">
                                <button
                                    onClick={() => window.history.back()}
                                    className="shrink-0 rounded-lg bg-white/20 p-2 transition-all duration-200 hover:bg-white/30"
                                    title="Go Back"
                                >
                                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                </button>
                                <div className="rounded-lg bg-white/20 p-2 shadow shrink-0">
                                    <Receipt className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="truncate text-lg sm:text-xl font-bold text-white">
                                        {t('Create Customer Payment')}
                                    </h1>
                                    <p className="text-xs text-white/80 hidden sm:block">
                                        {t('Record and process customer payment transactions')}
                                    </p>
                                </div>
                            </div>

                            <Link
                                href="/admin/customer-payments"
                                className="shrink-0 inline-flex items-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                            >
                                <ArrowLeft className="h-4 w-4 sm:mr-1.5" />
                                <span className="hidden sm:inline">{t('Back to List')}</span>
                            </Link>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-8 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        {/* Success Message */}
                        {flash?.success && (
                            <div className="mb-6 rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-4">
                                <div className="flex items-start gap-3">
                                    <div className="shrink-0">
                                        <Receipt className="h-5 w-5 text-green-500" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-green-800 break-words">{flash.success}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Form Container */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 py-3">
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="rounded-lg bg-white/20 p-1.5 shadow shrink-0">
                                        <Receipt className="w-4 h-4 text-white" />
                                    </div>
                                    <h2 className="truncate text-base font-semibold text-white">{t('Payment Details')}</h2>
                                </div>
                            </div>

                            <div className="p-4">
                                <CustomerPaymentForm customers={customers} bankAccounts={bankAccounts} />
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </AppLayout>
    );
}

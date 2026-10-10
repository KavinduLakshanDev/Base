import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Eye, CreditCard, DollarSign, Receipt, CheckCircle, AlertCircle, Building2, FileText, User } from 'lucide-react';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';

interface Payment {
    id: number;
    payment_no: string;
    supplier_code: string;
    supplier_name: string;
    payment_method: string;
    paid_amount: number;
    payment_date: string;
    bank_name?: string;
    bank_reference_no?: string;
    cheque_no?: string;
    transfer_transaction_id?: string;
    notes?: string;
    status: string;
    created_by: string;
    created_at: string;
    invoice_allocations?: {
        invoice_no: string;
        supplier_invoice_no?: string;
        amount: number;
    }[];
}

interface Props {
    payment: Payment;
    flash?: {
        success?: string;
        error?: string;
    };
}

export default function Show({ payment, flash }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('Supplier Payments'), href: '/admin/supplier-payments' },
        { title: payment.payment_no, href: '#' },
    ];

    const getPaymentMethodIcon = (method: string) => {
        switch (method) {
            case 'Cash':
                return <DollarSign className="w-4 h-4" />;
            case 'Cheque':
                return <Receipt className="w-4 h-4" />;
            case 'Bank':
            case 'Online Transfer':
                return <CreditCard className="w-4 h-4" />;
            default:
                return <Receipt className="w-4 h-4" />;
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Supplier Payment Details')} />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4">
                            <div className="flex flex-wrap items-center gap-3">
                                <Link
                                    href="/admin/supplier-payments"
                                    className="rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </Link>
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <Receipt className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">{payment.payment_no}</h1>
                                    <p className="text-xs text-white/80">{t('Supplier Payment Details')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-8 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        {flash?.success && (
                            <div className="mb-6 rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-4">
                                <div className="flex">
                                    <div className="shrink-0">
                                        <CheckCircle className="h-5 w-5 text-green-500" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-green-800">{flash.success}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {flash?.error && (
                            <div className="mb-6 rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-pink-50 p-4">
                                <div className="flex">
                                    <div className="shrink-0">
                                        <AlertCircle className="h-5 w-5 text-red-500" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-red-800">{flash.error}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Main Info */}
                            <div className="lg:col-span-2 space-y-6">
                                <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
                                    <div className="flex items-center space-x-3 mb-6">
                                        <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                            <Building2 className="w-5 h-5 text-vismass-blue" />
                                        </div>
                                        <h2 className="text-xl font-semibold text-slate-800">{t('Supplier Information')}</h2>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <div className="flex items-center space-x-3">
                                                <User className="w-4 h-4 text-vismass-blue" />
                                                <div>
                                                    <p className="text-sm text-slate-500">{t('Supplier Name')}</p>
                                                    <p className="font-medium text-slate-800">{payment.supplier_name}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-3">
                                                <FileText className="w-4 h-4 text-vismass-blue" />
                                                <div>
                                                    <p className="text-sm text-slate-500">{t('Supplier Code')}</p>
                                                    <p className="font-medium text-slate-800">{payment.supplier_code}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center space-x-3">
                                                <Receipt className="w-4 h-4 text-vismass-blue" />
                                                <div>
                                                    <p className="text-sm text-slate-500">{t('Payment Number')}</p>
                                                    <p className="font-medium text-slate-800">{payment.payment_no}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-3">
                                                <CreditCard className="w-4 h-4 text-vismass-blue" />
                                                <div>
                                                    <p className="text-sm text-slate-500">{t('Payment Method')}</p>
                                                    <p className="font-medium text-slate-800">{payment.payment_method}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
                                    <div className="flex items-center space-x-3 mb-6">
                                        <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                            {getPaymentMethodIcon(payment.payment_method)}
                                        </div>
                                        <h2 className="text-xl font-semibold text-slate-800">{t('Payment Details')}</h2>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <p className="text-sm text-slate-500">{t('Amount')}</p>
                                            <p className="font-semibold text-vismass-blue text-xl">
                                                Rs. {payment.paid_amount.toLocaleString()}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500">{t('Payment Date')}</p>
                                            <p className="font-medium text-slate-800">{payment.payment_date}</p>
                                        </div>
                                    </div>

                                    {(payment.bank_name || payment.bank_reference_no || payment.cheque_no || payment.transfer_transaction_id) && (
                                        <div className="mt-6 border-t border-slate-200 pt-4">
                                            <p className="text-sm text-slate-500 mb-2">{t('Bank / Reference Details')}</p>
                                            <p className="font-medium text-slate-800">{payment.bank_name || '-'}</p>
                                            <p className="text-sm text-slate-600 break-words">
                                                {payment.bank_reference_no || payment.cheque_no || payment.transfer_transaction_id || '-'}
                                            </p>
                                        </div>
                                    )}

                                    {payment.notes && (
                                        <div className="mt-6 border-t border-slate-200 pt-4">
                                            <p className="text-sm text-slate-500 mb-2">{t('Notes')}</p>
                                            <p className="text-slate-800 whitespace-pre-wrap break-words">{payment.notes}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Invoice Allocations */}
                                {payment.invoice_allocations && payment.invoice_allocations.length > 0 && (
                                    <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
                                        <div className="flex items-center space-x-3 mb-6">
                                            <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                                <FileText className="w-5 h-5 text-vismass-blue" />
                                            </div>
                                            <h2 className="text-xl font-semibold text-slate-800">{t('Invoice Allocations')}</h2>
                                        </div>

                                        <div className="overflow-x-auto border border-slate-200 rounded-lg">
                                            <table className="w-full text-sm text-left">
                                                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                                                    <tr>
                                                        <th className="px-4 py-3 font-medium">{t('Purchase No')}</th>
                                                        <th className="px-4 py-3 font-medium">{t('Supplier Invoice No')}</th>
                                                        <th className="px-4 py-3 text-right font-medium">{t('Allocated Amount')}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {payment.invoice_allocations.map((allocation, index) => (
                                                        <tr key={index} className="border-b border-slate-100 hover:bg-slate-50/50">
                                                            <td className="px-4 py-3 font-medium text-slate-800">{allocation.invoice_no}</td>
                                                            <td className="px-4 py-3 text-slate-600">{allocation.supplier_invoice_no || '-'}</td>
                                                            <td className="px-4 py-3 text-right font-semibold text-vismass-blue">
                                                                {allocation.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Sidebar */}
                            <div className="space-y-6">
                                <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
                                    <h2 className="text-xl font-semibold text-slate-800 mb-4">{t('Status')}</h2>
                                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium capitalize">
                                        {payment.status}
                                    </div>
                                    <div className="mt-4">
                                        <p className="text-sm text-slate-500">{t('Recorded By')}</p>
                                        <p className="font-medium text-slate-800">{payment.created_by}</p>
                                    </div>
                                    <div className="mt-3">
                                        <p className="text-sm text-slate-500">{t('Created At')}</p>
                                        <p className="font-medium text-slate-800">{payment.created_at}</p>
                                    </div>
                                </div>

                                <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
                                    <h2 className="text-xl font-semibold text-slate-800 mb-4">{t('Actions')}</h2>
                                    <div className="space-y-3">
                                        <Button
                                            onClick={() => window.open(`/admin/supplier-payments/${payment.id}/receipt`, '_blank')}
                                            className="w-full bg-vismass-blue hover:bg-vismass-blue/90 text-white"
                                        >
                                            <Eye className="w-4 h-4 mr-2" />
                                            {t('View Receipt')}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="text-center mt-12 text-slate-600">
                            <p className="text-sm">{t('Supplier payment details • Part of your financial workflow')}</p>
                        </div>
                    </div>
                </main>
            </div>
        </AppLayout>
    );
}

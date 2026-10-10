import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { Head, Link, router } from '@inertiajs/react';
import { Building2, MapPin, Phone, User, ArrowLeft, Tag, Mail, Globe, CreditCard, CheckCircle, FileText, RotateCcw } from 'lucide-react';

interface Props {
    customer: Record<string, any>;
}

export default function ShowCustomer({ customer }: Props) {

    const formatCurrency = (amount: number) => {
        return `Rs. ${Number(amount || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
    };

    return (
        <AppLayout breadcrumbs={[
            { title: t('Customer Management'), href: '/admin/customers' },
            { title: `${customer.Title} ${customer.FstNm}`, href: '#' }
        ]}>
            <Head title={t('Customer Details')} />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4">
                            <div className="flex flex-wrap items-center gap-3">
                                <Link
                                    href="/admin/customers"
                                    className="rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </Link>
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <User className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">
                                        {customer.Title} {customer.FstNm}
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        Customer Details
                                    </p>
                                </div>
                            </div>
                            {/* <Link
                                href={`/admin/customers/${customer.AdrKy}/edit`}
                                className="inline-flex items-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                            >
                                <Edit className="mr-1.5 h-4 w-4" />
                                {t('Edit Customer')}
                            </Link> */}
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-8 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">

                    {/* Main Content Container */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Information Card */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Basic Information */}
                            <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
                                <div className="flex items-center space-x-3 mb-6">
                                    <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                        <User className="w-5 h-5 text-vismass-blue" />
                                    </div>
                                    <h2 className="text-xl font-semibold text-slate-800">{t('Basic Information')}</h2>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <div className="flex items-center space-x-3">
                                            <Tag className="w-4 h-4 text-vismass-blue" />
                                            <div>
                                                <p className="text-sm text-slate-500">{t('Customer Code')}</p>
                                                <p className="font-medium text-slate-800">{customer.AdrCd || 'N/A'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <User className="w-4 h-4 text-vismass-blue" />
                                            <div>
                                                <p className="text-sm text-slate-500">{t('Full Name')}</p>
                                                <p className="font-medium text-slate-800">{customer.Title} {customer.FstNm}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <FileText className="w-4 h-4 text-vismass-blue" />
                                            <div>
                                                <p className="text-sm text-slate-500">{t('NIC Number')}</p>
                                                <p className="font-medium text-slate-800">{customer.IDNo || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center space-x-3">
                                            <CheckCircle className="w-4 h-4 text-vismass-blue" />
                                            <div>
                                                <p className="text-sm text-slate-500">{t('Status')}</p>
                                                <p className={`font-medium ${customer.Status === 'A' ? 'text-green-600' : 'text-red-600'}`}>
                                                    {customer.Status === 'A' ? t('Active') : t('Inactive')}
                                                </p>
                                            </div>
                                        </div>
                                        {/* privilege user indicator */}
                                        <div className="flex items-center space-x-3">
                                            <CreditCard className="w-4 h-4 text-vismass-blue" />
                                            <div>
                                                <p className="text-sm text-slate-500">{t('Privilege User')}</p>
                                                <p className={`font-medium ${customer.is_privilege ? 'text-green-600' : 'text-gray-600'}`}>
                                                    {customer.is_privilege ? t('Yes') : t('No')}
                                                </p>
                                                {customer.is_privilege && customer.privilege_card_no && (
                                                    <p className="text-xs text-slate-500">{t('Card')} {customer.privilege_card_no}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <CreditCard className="w-4 h-4 text-vismass-blue" />
                                            <div>
                                                <p className="text-sm text-slate-500">
                                                    {customer.is_credit ? t('Credit Balance') : t('Outstanding Balance')}
                                                </p>
                                                <p className={`font-medium ${customer.is_credit ? 'text-green-600' : 'text-red-600'}`}>
                                                    {customer.is_credit 
                                                        ? `Rs. ${Number(customer.display_balance || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`
                                                        : `Rs. ${Number(customer.display_balance || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <CreditCard className="w-4 h-4 text-vismass-blue" />
                                            <div>
                                                <p className="text-sm text-slate-500">{t('Credit Limit')}</p>
                                                <p className="font-medium text-slate-800">{formatCurrency(customer.CrLmt)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Address Information */}
                            <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
                                <div className="flex items-center space-x-3 mb-6">
                                    <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                        <MapPin className="w-5 h-5 text-vismass-blue" />
                                    </div>
                                    <h2 className="text-xl font-semibold text-slate-800">{t('Address Information')}</h2>
                                </div>

                                <div className="space-y-4">
                                    {customer.Address && (
                                        <div className="flex items-start space-x-3">
                                            <MapPin className="w-4 h-4 text-vismass-blue mt-1" />
                                            <div>
                                                <p className="text-sm text-slate-500">{t('Street Address')}</p>
                                                <p className="font-medium text-slate-800 whitespace-pre-line">{customer.Address}</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ml-7">
                                        {customer.Country && (
                                            <div>
                                                <p className="text-sm text-slate-500">{t('Country')}</p>
                                                <p className="font-medium text-slate-800">{customer.Country}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Contact Information Sidebar */}
                        <div className="space-y-6">
                            {/* Contact Card */}
                            <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
                                <div className="flex items-center space-x-3 mb-6">
                                    <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                        <Phone className="w-5 h-5 text-vismass-blue" />
                                    </div>
                                    <h2 className="text-xl font-semibold text-slate-800">{t('Contact Information')}</h2>
                                </div>

                                <div className="space-y-4">
                                    {customer.TP1 && (
                                        <div className="flex items-center space-x-3">
                                            <Phone className="w-4 h-4 text-vismass-blue" />
                                            <div>
                                                <p className="text-sm text-slate-500">{t('Phone')}</p>
                                                <a href={`tel:${customer.TP1}`} className="font-medium text-vismass-blue hover:text-vismass-blue/80 transition-colors">
                                                    {customer.TP1}
                                                </a>
                                            </div>
                                        </div>
                                    )}

                                    {customer.Fax && (
                                        <div className="flex items-center space-x-3">
                                            <FileText className="w-4 h-4 text-vismass-blue" />
                                            <div>
                                                <p className="text-sm text-slate-500">{t('Fax')}</p>
                                                <p className="font-medium text-slate-800">{customer.Fax}</p>
                                            </div>
                                        </div>
                                    )}

                                    {customer.Email && (
                                        <div className="flex items-center space-x-3">
                                            <Mail className="w-4 h-4 text-vismass-blue" />
                                            <div>
                                                <p className="text-sm text-slate-500">{t('Email')}</p>
                                                <a href={`mailto:${customer.Email}`} className="font-medium text-vismass-blue hover:text-vismass-blue/80 transition-colors break-all">
                                                    {customer.Email}
                                                </a>
                                            </div>
                                        </div>
                                    )}

                                    {customer.Website && (
                                        <div className="flex items-center space-x-3">
                                            <Globe className="w-4 h-4 text-vismass-blue" />
                                            <div>
                                                <p className="text-sm text-slate-500">{t('Website')}</p>
                                                <a href={customer.Website} target="_blank" rel="noopener noreferrer" className="font-medium text-vismass-blue hover:text-vismass-blue/80 transition-colors break-all">
                                                    {customer.Website}
                                                </a>
                                            </div>
                                        </div>
                                    )}

                                    {(!customer.TP1 && !customer.Fax && !customer.Email && !customer.Website) && (
                                        <p className="text-slate-500 text-sm italic">{t('No contact information available')}</p>
                                    )}
                                </div>
                            </div>

                            {/* VAT Information */}
                            <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
                                <div className="flex items-center space-x-3 mb-6">
                                    <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                        <Building2 className="w-5 h-5 text-vismass-blue" />
                                    </div>
                                    <h2 className="text-xl font-semibold text-slate-800">{t('VAT Information')}</h2>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex items-center space-x-3">
                                            <CheckCircle className="w-4 h-4 text-vismass-blue" />
                                            <div>
                                                <p className="text-sm text-slate-500">{t('VAT Status')}</p>
                                                <p className={`font-medium ${customer.fVATRegistered ? 'text-green-600' : 'text-gray-600'}`}>
                                                    {customer.fVATRegistered ? t('Registered') : t('Not Registered')}
                                                </p>
                                            </div>
                                        </div>
                                        {customer.fVATRegistered && customer.VATNo && (
                                            <div className="flex items-center space-x-3">
                                                <Tag className="w-4 h-4 text-vismass-blue" />
                                                <div>
                                                    <p className="text-sm text-slate-500">{t('VAT Number')}</p>
                                                    <p className="font-medium text-slate-800">{customer.VATNo}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Actions Card */}
                            {/* <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
                                <h2 className="text-xl font-semibold text-slate-800 mb-4">{t('Actions')}</h2>
                                <div className="space-y-3">
                                    <Link
                                        href={`/admin/customers/${customer.AdrKy}/edit`}
                                        className="w-full bg-vismass-blue hover:bg-vismass-blue/90 text-white px-4 py-3 rounded-xl shadow-lg transition-all duration-200 font-medium inline-flex items-center justify-center space-x-2"
                                    >
                                        <Edit className="w-4 h-4" />
                                        <span>{t('Edit Customer')}</span>
                                    </Link>
                                    <button
                                        onClick={() => router.post(`/admin/customers/${customer.AdrKy}/toggle`, {}, {
                                            onSuccess: () => window.location.reload(),
                                        })}
                                        className="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg transition-all duration-200 font-medium inline-flex items-center justify-center space-x-2"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                        <span>{customer.Status === 'A' ? t('Deactivate') : t('Activate')}</span>
                                    </button>
                                </div>
                            </div> */}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-12 text-slate-600">
                        <p className="text-sm">{t('Customer details • Part of your distribution network')}</p>
                    </div>
                </div>
                </main>
            </div>
        </AppLayout>
    );
}

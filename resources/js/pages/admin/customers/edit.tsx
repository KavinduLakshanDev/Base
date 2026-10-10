import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    Building,
    CreditCard,
    FileText,
    MapPin,
    Phone,
    Save,
    User,
    TrendingUp,
    Edit,
    CheckCircle,
    ArrowLeft,
    Wrench
} from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: t('Dashboard'),
        href: '/dashboard',
    },
    {
        title: t('Customer Management'),
        href: '/admin/customers',
    },
    {
        title: t('Edit Customer'),
        href: '#',
    },
];

interface CustomerFormData {
    Title: string;
    FstNm: string;
    LstNm: string;
    CtPerson: string;
    Address: string;
    AddressLine2: string;
    Locality: string;
    Town: string;
    City: string;
    PostalCode: string;
    Country: string;
    TP1: string;
    TP2: string;
    Fax: string;
    Email: string;
    Website: string;
    CurBal: string;
    CrLmt: string;
    fVATRegistered: boolean;
    VATNo: string;
    IDNo: string;
    BRNo: string;
    TINNo: string;
    Status: string;
    // privilege
    register_as_privilege: boolean;
    privilege_card_no: string;
}

interface Customer {
    AdrKy: number;
    company_code?: string;
    Title: string;
    FstNm: string;
    LstNm?: string;
    CtPerson: string;
    Address: string;
    AddressLine2?: string;
    Locality?: string;
    Town?: string;
    City?: string;
    PostalCode?: string;
    Country: string;
    TP1: string;
    TP2?: string;
    Fax: string;
    Email: string;
    Website: string;
    CurBal: number;
    CrLmt: number;
    fVATRegistered: boolean;
    VATNo: string;
    IDNo?: string;
    BRNo?: string;
    TINNo?: string;
    Status: string;
}

interface Props {
    customer: Customer;
    privilege?: {
        card_no?: string;
    } | null;
    flash?: {
        success?: string;
        error?: string;
    };
}

export default function EditCustomer({ customer, privilege, flash }: Props) {
    const [formData, setFormData] = useState<CustomerFormData>({
        Title: customer.Title || '',
        FstNm: customer.FstNm || '',
        LstNm: customer.LstNm || '',
        CtPerson: customer.CtPerson || '',
        Address: customer.Address || '',
        AddressLine2: customer.AddressLine2 || '',
        Locality: customer.Locality || '',
        Town: customer.Town || '',
        City: customer.City || '',
        PostalCode: customer.PostalCode || '',
        Country: customer.Country || '',
        TP1: customer.TP1 || '',
        TP2: customer.TP2 || '',
        Fax: customer.Fax || '',
        Email: customer.Email || '',
        Website: customer.Website || '',
        CurBal: customer.CurBal ? customer.CurBal.toString() : '',
        CrLmt: customer.CrLmt ? customer.CrLmt.toString() : '',
        fVATRegistered: customer.fVATRegistered || false,
        VATNo: customer.VATNo || '',
        IDNo: customer.IDNo || '',
        BRNo: customer.BRNo || '',
        TINNo: customer.TINNo || '',
        Status: customer.Status || 'A',
        register_as_privilege: Boolean(privilege && privilege.card_no),
        privilege_card_no: privilege?.card_no || '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showVatField, setShowVatField] = useState(customer.fVATRegistered || false);

    const handleInputChange = (field: keyof CustomerFormData, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const handleVatCheckboxChange = (checked: boolean) => {
        setFormData(prev => ({ ...prev, fVATRegistered: checked }));
        setShowVatField(checked);
        if (!checked) {
            setFormData(prev => ({ ...prev, VATNo: '' }));
        }
    };

    const handleSubmit = () => {
        const normalizedCurBal = String(
            parseFloat(String(formData.CurBal).replace(/,/g, '')) || 0,
        );
        const normalizedCrLmt = String(
            parseFloat(String(formData.CrLmt).replace(/,/g, '')) || 0,
        );

        const payload = {
            ...formData,
            CurBal: normalizedCurBal,
            CrLmt: normalizedCrLmt,
        };

        router.put(`/admin/customers/${customer.AdrKy}`, payload, {
            onSuccess: () => {
                // Success handled by redirect in controller
            },
            onError: (errs) => {
                setErrors(errs);
            },
            preserveScroll: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Edit Customer')} />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4">
                            <div className="flex items-center space-x-3">
                                <Link
                                    href={`/admin/customers/${customer.AdrKy}`}
                                    className="rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </Link>
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <Edit className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">
                                        {t('Edit Customer')}
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        {customer.FstNm} {customer.LstNm || ''}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-8 sm:px-6 lg:px-8">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
                        {/* flash messages */}
                        {flash?.success && (
                            <div className="mb-6 rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-4">
                                <div className="flex">
                                    <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-green-800">{flash.success}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {flash?.error && (
                            <div className="mb-6 rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-pink-50 p-4">
                                <div className="flex">
                                    <svg className="h-5 w-5 text-red-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-red-800">{flash.error}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-8">
                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                {/* Left Column */}
                                <div className="space-y-6">
                                    {/* Personal Information */}
                                    <div className="space-y-6">
                                        <div className="flex items-center space-x-3 mb-6">
                                            <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                                <User className="w-5 h-5 text-vismass-blue" />
                                            </div>
                                            <h2 className="text-xl font-semibold text-slate-800">{t('Personal Information')}</h2>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700 flex items-center">
                                                    <User className="w-4 h-4 mr-2 text-vismass-blue" />
                                                    {t('Title')}
                                                </label>
                                                <select
                                                    value={formData.Title}
                                                    onChange={(e) => handleInputChange('Title', e.target.value)}
                                                    className="block w-full rounded-xl border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                    required
                                                >
                                                    <option value="">{t('Select Title')}</option>
                                                    <option value="Mr">Mr</option>
                                                    <option value="Ms">Ms</option>
                                                    <option value="Mrs">Mrs</option>
                                                    <option value="Miss">Miss</option>
                                                    <option value="Dr">Dr</option>
                                                    <option value="Prof">Prof</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700 flex items-center">
                                                    <FileText className="w-4 h-4 mr-2 text-vismass-blue" />
                                                    {t('NIC Number')}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.IDNo}
                                                    onChange={(e) => handleInputChange('IDNo', e.target.value)}
                                                    className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                    placeholder="NIC Number"
                                                />
                                                {errors.IDNo && <div className="mt-2 text-sm text-red-600">{errors.IDNo}</div>}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700">{t('First Name')} {!formData.CtPerson && '*'}</label>
                                                <input
                                                    type="text"
                                                    value={formData.FstNm}
                                                    onChange={(e) => handleInputChange('FstNm', e.target.value)}
                                                    className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                    placeholder="First name"
                                                    required={!formData.CtPerson}
                                                />
                                                {errors.FstNm && <div className="mt-2 text-sm text-red-600">{errors.FstNm}</div>}
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700">{t('Last Name')}</label>
                                                <input
                                                    type="text"
                                                    value={formData.LstNm}
                                                    onChange={(e) => handleInputChange('LstNm', e.target.value)}
                                                    className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                    placeholder="Last name"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700">{t('Business Name')} {!formData.FstNm && '*'}</label>
                                            <input
                                                type="text"
                                                value={formData.CtPerson}
                                                onChange={(e) => handleInputChange('CtPerson', e.target.value)}
                                                className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                placeholder="Business name"
                                                required={!formData.FstNm}
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700 flex items-center">
                                                    <FileText className="w-4 h-4 mr-2 text-vismass-blue" />
                                                    {t('BR Number')}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.BRNo}
                                                    onChange={(e) => handleInputChange('BRNo', e.target.value)}
                                                    className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                    placeholder="Business Registration Number"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700 flex items-center">
                                                    <FileText className="w-4 h-4 mr-2 text-vismass-blue" />
                                                    {t('TIN Number')}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.TINNo}
                                                    onChange={(e) => handleInputChange('TINNo', e.target.value)}
                                                    className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                    placeholder="Tax Identification Number"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Address Information */}
                                    <div className="space-y-6">
                                        <div className="flex items-center space-x-3 mb-6">
                                            <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                                <MapPin className="w-5 h-5 text-vismass-blue" />
                                            </div>
                                            <h2 className="text-xl font-semibold text-slate-800">{t('Address Information')}</h2>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700 flex items-center">
                                                <MapPin className="w-4 h-4 mr-2 text-vismass-blue" />
                                                {t('Address Line 1')}
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.Address}
                                                onChange={(e) => handleInputChange('Address', e.target.value)}
                                                className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                placeholder="Address line 1"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700">{t('Address Line 2')}</label>
                                            <input
                                                type="text"
                                                value={formData.AddressLine2}
                                                onChange={(e) => handleInputChange('AddressLine2', e.target.value)}
                                                className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                placeholder="Address line 2"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700">{t('Locality / Village')}</label>
                                                <input
                                                    type="text"
                                                    value={formData.Locality}
                                                    onChange={(e) => handleInputChange('Locality', e.target.value)}
                                                    className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                    placeholder="Locality / Village"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700">{t('Postal Town / City')}</label>
                                                <input
                                                    type="text"
                                                    value={formData.City}
                                                    onChange={(e) => handleInputChange('City', e.target.value)}
                                                    className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                    placeholder="Town / City"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700">{t('Postal Code')}</label>
                                                <input
                                                    type="text"
                                                    value={formData.PostalCode}
                                                    onChange={(e) => handleInputChange('PostalCode', e.target.value)}
                                                    className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                    placeholder="Postal code"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700">{t('Country')}</label>
                                                <input
                                                    type="text"
                                                    value={formData.Country}
                                                    onChange={(e) => handleInputChange('Country', e.target.value)}
                                                    className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                    placeholder="Country"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column */}
                                <div className="space-y-6">
                                    {/* Contact Information */}
                                    <div className="space-y-6">
                                        <div className="flex items-center space-x-3 mb-6">
                                            <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                                <Phone className="w-5 h-5 text-vismass-blue" />
                                            </div>
                                            <h2 className="text-xl font-semibold text-slate-800">{t('Contact Information')}</h2>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700 flex items-center">
                                                    <Phone className="w-4 h-4 mr-2 text-vismass-blue" />
                                                    {t('Phone 1')}
                                                </label>
                                                <input
                                                    type="tel"
                                                    value={formData.TP1}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        if (value.startsWith('+')) {
                                                            const cleaned = '+' + value.slice(1).replace(/\D/g, '');
                                                            if (cleaned.length <= 13) handleInputChange('TP1', cleaned);
                                                        } else {
                                                            const cleaned = value.replace(/\D/g, '');
                                                            if (cleaned.length <= 10) handleInputChange('TP1', cleaned);
                                                        }
                                                    }}
                                                    className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                    placeholder="07X XXX XXXX"
                                                />
                                                {errors.TP1 && <div className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">{errors.TP1}</div>}
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700 flex items-center">
                                                    <Phone className="w-4 h-4 mr-2 text-vismass-blue" />
                                                    {t('Phone 2')}
                                                </label>
                                                <input
                                                    type="tel"
                                                    value={formData.TP2}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        if (value.startsWith('+')) {
                                                            const cleaned = '+' + value.slice(1).replace(/\D/g, '');
                                                            if (cleaned.length <= 13) handleInputChange('TP2', cleaned);
                                                        } else {
                                                            const cleaned = value.replace(/\D/g, '');
                                                            if (cleaned.length <= 10) handleInputChange('TP2', cleaned);
                                                        }
                                                    }}
                                                    className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                    placeholder="07X XXX XXXX"
                                                />
                                            </div>
                                        </div>

                                        {/* <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700 flex items-center">
                                                <Phone className="w-4 h-4 mr-2 text-vismass-blue" />
                                                {t('Fax Number')}
                                            </label>
                                            <input
                                                type="tel"
                                                value={formData.Fax}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    if (value.startsWith('+')) {
                                                        const cleaned = '+' + value.slice(1).replace(/\D/g, '');
                                                        if (cleaned.length <= 13) handleInputChange('Fax', cleaned);
                                                    } else {
                                                        const cleaned = value.replace(/\D/g, '');
                                                        if (cleaned.length <= 10) handleInputChange('Fax', cleaned);
                                                    }
                                                }}
                                                className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                placeholder="Fax number"
                                            />
                                        </div> */}

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700 flex items-center">
                                                <MapPin className="w-4 h-4 mr-2 text-vismass-blue" />
                                                {t('Email Address')}
                                            </label>
                                            <input
                                                type="email"
                                                value={formData.Email}
                                                onChange={(e) => handleInputChange('Email', e.target.value)}
                                                className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                placeholder="email@example.com"
                                            />
                                            {errors.Email && <div className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">{errors.Email}</div>}
                                        </div>

                                        {/* <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700 flex items-center">
                                                <MapPin className="w-4 h-4 mr-2 text-vismass-blue" />
                                                {t('Website')}
                                            </label>
                                            <input
                                                type="url"
                                                value={formData.Website}
                                                onChange={(e) => handleInputChange('Website', e.target.value)}
                                                className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                placeholder="https://www.example.com"
                                            />
                                        </div> */}

                                        {/* Privilege user toggle */}
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    id="register_as_privilege"
                                                    type="checkbox"
                                                    checked={formData.register_as_privilege}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, register_as_privilege: e.target.checked }))}
                                                    className="h-4 w-4 rounded border-slate-300 text-vismass-blue focus:ring-vismass-blue/20"
                                                />
                                                <label htmlFor="register_as_privilege" className="text-sm font-semibold text-slate-800">
                                                    {t('Also register as privilege user')}
                                                </label>
                                            </div>
                                            {formData.register_as_privilege && (
                                                <div className="mt-2">
                                                    <label className="text-sm font-medium text-slate-700 flex items-center">
                                                        <CreditCard className="w-4 h-4 mr-2 text-vismass-blue" />
                                                        {t('Privilege Card Number')}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={formData.privilege_card_no}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, privilege_card_no: e.target.value }))}
                                                        className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                        placeholder={t('Enter card number')}
                                                        required={formData.register_as_privilege}
                                                    />
                                                    {errors.privilege_card_no && <div className="mt-2 text-sm text-red-600">{errors.privilege_card_no}</div>}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* VAT Information */}
                                    <div className="space-y-6">
                                        <div className="flex items-center space-x-3 mb-6">
                                            <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                                <Building className="w-5 h-5 text-vismass-blue" />
                                            </div>
                                            <h2 className="text-xl font-semibold text-slate-800">{t('VAT Information')}</h2>
                                        </div>

                                        <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-4 border border-slate-200">
                                            <input
                                                id="vat-registered"
                                                type="checkbox"
                                                checked={formData.fVATRegistered}
                                                onChange={(e) => handleVatCheckboxChange(e.target.checked)}
                                                className="h-4 w-4 rounded border-slate-300 text-vismass-blue focus:ring-vismass-blue/20"
                                            />
                                            <label htmlFor="vat-registered" className="block text-sm font-semibold text-slate-800">
                                                {t('VAT Registered')}
                                            </label>
                                        </div>

                                        {showVatField && (
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700 flex items-center">
                                                    <FileText className="w-4 h-4 mr-2 text-vismass-blue" />
                                                    {t('VAT Number')} *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.VATNo}
                                                    onChange={(e) => handleInputChange('VATNo', e.target.value)}
                                                    className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                    placeholder="Enter VAT number"
                                                    required={formData.fVATRegistered}
                                                />
                                                {errors.VATNo && <div className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">{errors.VATNo}</div>}
                                            </div>
                                        )}
                                    </div>

                                    {/* Financial Information */}
                                    <div className="space-y-6">
                                        <div className="flex items-center space-x-3 mb-6">
                                            <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                                <CreditCard className="w-5 h-5 text-vismass-blue" />
                                            </div>
                                            <h2 className="text-xl font-semibold text-slate-800">{t('Credit & Financial Information')}</h2>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700 flex items-center">
                                                    <CreditCard className="w-4 h-4 mr-2 text-vismass-blue" />
                                                    {t('Current Balance (Rs.)')}
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={formData.CurBal}
                                                    readOnly
                                                    onChange={(e) => handleInputChange('CurBal', e.target.value)}
                                                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                    className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3 bg-slate-50"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700 flex items-center">
                                                    <CreditCard className="w-4 h-4 mr-2 text-vismass-blue" />
                                                    {t('Credit Limit (Rs.)')}
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={formData.CrLmt}
                                                    onChange={(e) => handleInputChange('CrLmt', e.target.value)}
                                                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                    className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status */}
                                    <div className="space-y-6">
                                        <div className="flex items-center space-x-3 mb-6">
                                            <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                                <CheckCircle className="w-5 h-5 text-vismass-blue" />
                                            </div>
                                            <h2 className="text-xl font-semibold text-slate-800">{t('Status')}</h2>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <div className="flex items-center gap-3 bg-green-50 rounded-xl p-4 border border-green-200">
                                                <input
                                                    id="status-active"
                                                    type="radio"
                                                    name="status"
                                                    value="A"
                                                    checked={formData.Status === 'A'}
                                                    onChange={(e) => handleInputChange('Status', e.target.value)}
                                                    className="h-4 w-4 border-green-300 text-green-600 focus:ring-green-200"
                                                />
                                                <label htmlFor="status-active" className="block text-sm font-semibold text-green-800">
                                                    {t('Active')}
                                                </label>
                                            </div>

                                            <div className="flex items-center gap-3 bg-red-50 rounded-xl p-4 border border-red-200">
                                                <input
                                                    id="status-inactive"
                                                    type="radio"
                                                    name="status"
                                                    value="I"
                                                    checked={formData.Status === 'I'}
                                                    onChange={(e) => handleInputChange('Status', e.target.value)}
                                                    className="h-4 w-4 border-red-300 text-red-600 focus:ring-red-200"
                                                />
                                                <label htmlFor="status-inactive" className="block text-sm font-semibold text-red-800">
                                                    {t('Inactive')}
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end pt-6 border-t border-slate-200">
                                <button
                                    type="submit"
                                    className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-vismass-blue hover:bg-vismass-blue/90 text-white px-8 py-3 font-semibold transition-all duration-200 shadow-lg"
                                >
                                    <Save className="mr-2 h-4 w-4" />
                                    {t('Update Customer')}
                                </button>
                            </div>
                        </form>
                    </div>
                </main>
            </div>
        </AppLayout>
    );
}

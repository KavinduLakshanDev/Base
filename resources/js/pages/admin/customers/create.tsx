import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import {
    Building,
    CreditCard,
    MapPin,
    Phone,
    Save,
    User,
    UserPlus,
    CheckCircle,
    FileText,
    Wrench,
    ArrowLeft
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
        title: t('Register Customer'),
        href: '#',
    },
];

interface CustomerFormData {
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
    fVATRegistered: boolean;
    VATNo: string;
    CurBal: string;
    CrLmt: string;
    Status: string;
    IDNo: string;
    BRNo: string;
    TINNo: string;
    Title: string;
    Website: string;
    register_as_privilege: boolean;
    privilege_card_no: string;
}

interface Props {
    flash?: {
        success?: string;
        error?: string;
    };
}

export default function CustomerCreate({ flash }: Props) {
    const [showVatField, setShowVatField] = useState(false);

    const { data, setData, processing, errors, reset } =
        useForm<CustomerFormData>({
            FstNm: '',
            LstNm: '',
            CtPerson: '',
            Address: '',
            AddressLine2: '',
            Locality: '',
            Town: '',
            City: '',
            PostalCode: '',
            Country: 'Sri Lanka',
            TP1: '',
            TP2: '',
            Fax: '',
            Email: '',
            fVATRegistered: false,
            VATNo: '',
            CurBal: '',
            CrLmt: '',
            Status: 'A',
            IDNo: '',
            BRNo: '',
            TINNo: '',
            Title: 'Mr',
            Website: '',
            register_as_privilege: false,
            privilege_card_no: '',
        });

    const handleVatCheckboxChange = (checked: boolean) => {
        setData('fVATRegistered', checked);
        setShowVatField(checked);
        if (!checked) {
            setData('VATNo', '');
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const target = e.target as HTMLFormElement;
        const submitButton = target.querySelector('button[type="submit"]:focus') as HTMLButtonElement;
        const action = submitButton?.value || 'register';

        const normalizedCurBal = String(
            parseFloat(String(data.CurBal).replace(/,/g, '')) || 0,
        );
        const normalizedCrLmt = String(
            parseFloat(String(data.CrLmt).replace(/,/g, '')) || 0,
        );

        const payload = {
            ...data,
            CurBal: normalizedCurBal,
            CrLmt: normalizedCrLmt,
            action: action,
        };

        router.post('/admin/customers', payload, {
            onSuccess: (page: any) => {
                try {
                    const params = new URLSearchParams(window.location.search);
                    const returnTo = params.get('return_to');

                    const createdCustomerData = page?.props?.flash?.created_customer;

                    if (returnTo && createdCustomerData) {
                        const customerDetails = {
                            AccKy: createdCustomerData.AccKy || '',
                            customer_name: createdCustomerData.full_name || data.FstNm,
                            customer_phone: createdCustomerData.TP1 || data.TP1,
                            customer_email: createdCustomerData.EMail || data.Email,
                            customer_address: createdCustomerData.Address || data.Address,
                        };

                        sessionStorage.setItem('reServiceData', JSON.stringify(customerDetails));
                        window.location.href = returnTo;
                        return;
                    }

                    if (action === 'register_and_go_to_service' && createdCustomerData) {
                        return;
                    }
                } catch (err) {
                    console.error('Return flow after customer creation failed:', err);
                }

                reset();
                setShowVatField(false);
            },
            preserveScroll: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Customer Registration')} />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4">
                            <div className="flex items-center space-x-3">
                                <Link
                                    href="/admin/customers"
                                    className="rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </Link>
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <UserPlus className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">
                                        {t('Register New Customer')}
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        {t('Create a new customer account in the system')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-8 sm:px-6 lg:px-8">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
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

                        <form onSubmit={handleSubmit} className="space-y-8">
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
                                                    value={data.Title}
                                                    onChange={(e) => setData('Title', e.target.value)}
                                                    className="block w-full rounded-xl border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                    required
                                                >
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
                                                    value={data.IDNo}
                                                    onChange={(e) => setData('IDNo', e.target.value)}
                                                    className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                    placeholder="NIC Number"
                                                />
                                                {errors.IDNo && <div className="mt-2 text-sm text-red-600">{errors.IDNo}</div>}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700">{t('First Name')} {!data.CtPerson && '*'}</label>
                                                <input
                                                    type="text"
                                                    value={data.FstNm}
                                                    onChange={(e) => setData('FstNm', e.target.value)}
                                                    className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                    placeholder="First name"
                                                    required={!data.CtPerson}
                                                />
                                                {errors.FstNm && <div className="mt-2 text-sm text-red-600">{errors.FstNm}</div>}
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700">{t('Last Name')}</label>
                                                <input
                                                    type="text"
                                                    value={data.LstNm}
                                                    onChange={(e) => setData('LstNm', e.target.value)}
                                                    className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                    placeholder="Last name"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700">{t('Business Name')} {!data.FstNm && '*'}</label>
                                            <input
                                                type="text"
                                                value={data.CtPerson}
                                                onChange={(e) => setData('CtPerson', e.target.value)}
                                                className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                placeholder="Business name"
                                                required={!data.FstNm}
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
                                                    value={data.BRNo}
                                                    onChange={(e) => setData('BRNo', e.target.value)}
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
                                                    value={data.TINNo}
                                                    onChange={(e) => setData('TINNo', e.target.value)}
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
                                                value={data.Address}
                                                onChange={(e) => setData('Address', e.target.value)}
                                                className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                placeholder="Address line 1"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700">{t('Address Line 2')}</label>
                                            <input
                                                type="text"
                                                value={data.AddressLine2}
                                                onChange={(e) => setData('AddressLine2', e.target.value)}
                                                className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                placeholder="Address line 2"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700">{t('Locality / Village')}</label>
                                                <input
                                                    type="text"
                                                    value={data.Locality}
                                                    onChange={(e) => setData('Locality', e.target.value)}
                                                    className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                    placeholder="Locality / Village"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700">{t('Postal Town / City')}</label>
                                                <input
                                                    type="text"
                                                    value={data.City}
                                                    onChange={(e) => setData('City', e.target.value)}
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
                                                    value={data.PostalCode}
                                                    onChange={(e) => setData('PostalCode', e.target.value)}
                                                    className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                    placeholder="Postal code"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700">{t('Country')}</label>
                                                <input
                                                    type="text"
                                                    value={data.Country}
                                                    onChange={(e) => setData('Country', e.target.value)}
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
                                                    value={data.TP1}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        if (value.startsWith('+')) {
                                                            const cleaned = '+' + value.slice(1).replace(/\D/g, '');
                                                            if (cleaned.length <= 13) setData('TP1', cleaned);
                                                        } else {
                                                            const cleaned = value.replace(/\D/g, '');
                                                            if (cleaned.length <= 10) setData('TP1', cleaned);
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
                                                    value={data.TP2}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        if (value.startsWith('+')) {
                                                            const cleaned = '+' + value.slice(1).replace(/\D/g, '');
                                                            if (cleaned.length <= 13) setData('TP2', cleaned);
                                                        } else {
                                                            const cleaned = value.replace(/\D/g, '');
                                                            if (cleaned.length <= 10) setData('TP2', cleaned);
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
                                                value={data.Fax}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    if (value.startsWith('+')) {
                                                        const cleaned = '+' + value.slice(1).replace(/\D/g, '');
                                                        if (cleaned.length <= 13) setData('Fax', cleaned);
                                                    } else {
                                                        const cleaned = value.replace(/\D/g, '');
                                                        if (cleaned.length <= 10) setData('Fax', cleaned);
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
                                                value={data.Email}
                                                onChange={(e) => setData('Email', e.target.value)}
                                                className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                placeholder="email@example.com"
                                            />
                                        </div>

                                        {/* <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700 flex items-center">
                                                <MapPin className="w-4 h-4 mr-2 text-vismass-blue" />
                                                {t('Website')}
                                            </label>
                                            <input
                                                type="url"
                                                value={data.Website}
                                                onChange={(e) => setData('Website', e.target.value)}
                                                className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                placeholder="https://www.example.com"
                                            />
                                        </div> */}

                                        {/* Privilege user */}
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    id="register_as_privilege"
                                                    type="checkbox"
                                                    checked={data.register_as_privilege}
                                                    onChange={(e) => setData('register_as_privilege', e.target.checked)}
                                                    className="h-4 w-4 rounded border-slate-300 text-vismass-blue focus:ring-vismass-blue/20"
                                                />
                                                <label htmlFor="register_as_privilege" className="text-sm font-semibold text-slate-800">
                                                    {t('Also register as privilege user')}
                                                </label>
                                            </div>
                                            {data.register_as_privilege && (
                                                <div className="mt-2">
                                                    <label className="text-sm font-medium text-slate-700 flex items-center">
                                                        <CreditCard className="w-4 h-4 mr-2 text-vismass-blue" />
                                                        {t('Privilege Card Number')}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={data.privilege_card_no}
                                                        onChange={(e) => setData('privilege_card_no', e.target.value)}
                                                        className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                        placeholder={t('Enter card number')}
                                                        required={data.register_as_privilege}
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
                                                checked={data.fVATRegistered}
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
                                                    {t('VAT Number')}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={data.VATNo}
                                                    onChange={(e) => setData('VATNo', e.target.value)}
                                                    className="block w-full rounded-xl border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                    placeholder="Enter VAT number"
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
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={data.CurBal}
                                                    onChange={(e) => setData('CurBal', e.target.value)}
                                                    className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700 flex items-center">
                                                    <CreditCard className="w-4 h-4 mr-2 text-vismass-blue" />
                                                    {t('Credit Limit (Rs.)')}
                                                </label>
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={data.CrLmt}
                                                    onChange={(e) => setData('CrLmt', e.target.value)}
                                                    className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Submit Buttons */}
                            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end pt-6 border-t border-slate-200">
                                <Button
                                    type="submit"
                                    name="action"
                                    value="register_and_go_to_service"
                                    disabled={processing}
                                    className="w-full sm:w-auto bg-vismass-blue hover:bg-vismass-blue/90 text-white px-8 py-3 rounded-xl shadow-sm transition-all duration-200 font-medium"
                                >
                                    {processing ? (
                                        <div className="flex items-center space-x-2">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span>{t('Processing...')}</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center space-x-2">
                                            <Wrench className="w-5 h-5" />
                                            <span>{t('Register and Go to Service Form')}</span>
                                        </div>
                                    )}
                                </Button>
                                <Button
                                    type="submit"
                                    name="action"
                                    value="register"
                                    disabled={processing}
                                    className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl shadow-sm transition-all duration-200 font-medium"
                                >
                                    {processing ? (
                                        <div className="flex items-center space-x-2">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span>{t('Registering...')}</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center space-x-2">
                                            <Save className="w-5 h-5" />
                                            <span>{t('Register Customer')}</span>
                                        </div>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </main>
            </div>
        </AppLayout>
    );
}

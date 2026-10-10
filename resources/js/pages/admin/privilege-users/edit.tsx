import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    CreditCard,
    MapPin,
    PencilIcon,
    RotateCcw,
    Save,
    User,
} from 'lucide-react';
import { useState } from 'react';
// import { AlertCircle, Check, X } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: t('Dashboard'),
        href: '/dashboard',
    },
    {
        title: t('Privilege User Management'),
        href: '/admin/privilege-users',
    },
    {
        title: t('Edit Privilege User'),
        href: '#',
    },
];

interface PrivilegeUser {
    id: number;
    company_code: number;
    section_code: number;
    customer_code: string;
    privCusName: string;
    NIC: string | null;
    address: string;
    town: string | null;
    city: string;
    country: string;
    phone: string | null;
    gender: 'male' | 'female' | null;
    card_no: string | null;
    regdate: string;
    ent_user: string | null;
    finAct: boolean;
    notes: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

interface PrivilegeUserFormData {
    section_code: number;
    privCusName: string;
    NIC: string;
    address: string;
    town: string;
    city: string;
    country: string;
    phone: string;
    gender: 'male' | 'female' | '';
    card_no: string;
    regdate: string;
    finAct: boolean;
    is_active: boolean;
}

interface Props {
    privilegeUser: PrivilegeUser;
    sections?: Array<{
        value: number;
        label: string;
    }>;
    flash?: {
        success?: string;
        error?: string;
    };
}

export default function PrivilegeUserEdit({
    privilegeUser,
    sections = [],
    flash,
}: Props) {
    const [validationErrors, setValidationErrors] = useState<{
        [key: string]: string;
    }>({});

    const { data, setData, put, processing, reset } =
        useForm<PrivilegeUserFormData>({
            section_code: privilegeUser.section_code,
            privCusName: privilegeUser.privCusName,
            NIC: privilegeUser.NIC || '',
            address: privilegeUser.address,
            town: privilegeUser.town || '',
            city: privilegeUser.city,
            country: privilegeUser.country,
            phone: privilegeUser.phone || '',
            gender: privilegeUser.gender || '',
            card_no: privilegeUser.card_no || '',
            regdate: privilegeUser.regdate.split('T')[0],
            finAct: privilegeUser.finAct,
            is_active: privilegeUser.is_active,
        });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        put(`/admin/privilege-users/${privilegeUser.id}`, {
            onSuccess: () => {
                // Handle success
            },
            onError: (errors) => {
                setValidationErrors(errors);
            },
        });
    };

    // Clear messages
    const clearError = () => {
        setValidationErrors({});
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Edit Privilege User')} />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4">
                            <div className="flex items-center space-x-3">
                                <Link
                                    href="/admin/privilege-users"
                                    className="mr-2 rounded-lg bg-white/20 p-2 text-white hover:bg-white/30 transition-all"
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </Link>
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <PencilIcon className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">
                                        {t('Edit Privilege User')}
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        {t('Update information for')} {data.privCusName}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-5xl py-8 px-4 sm:px-6 lg:px-8">
                    {/* Form Container */}
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                            <h2 className="text-base font-semibold text-slate-800 flex items-center">
                                <User className="w-5 h-5 mr-2 text-vismass-blue" />
                                {t('Privilege User Information')}
                            </h2>
                            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                {t('Code')}: {privilegeUser.customer_code}
                            </span>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Section Selection */}
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700">
                                        {t('Section')} <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={data.section_code || ''}
                                        onChange={(e) =>
                                            setData(
                                                'section_code',
                                                e.target.value
                                                    ? parseInt(e.target.value)
                                                    : 0,
                                            )
                                        }
                                        className="block w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                        required
                                    >
                                        <option value="">{t('Select Section')}</option>
                                        {sections.map((section) => (
                                            <option key={section.value} value={section.value}>
                                                {section.label}
                                            </option>
                                        ))}
                                    </select>
                                    {validationErrors.section_code && (
                                        <p className="text-xs text-red-600">
                                            {validationErrors.section_code}
                                        </p>
                                    )}
                                </div>

                                {/* Customer Name */}
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700">
                                        {t('Customer Name')} <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={data.privCusName}
                                        onChange={(e) => setData('privCusName', e.target.value)}
                                        className="block w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                        required
                                    />
                                    {validationErrors.privCusName && (
                                        <p className="text-xs text-red-600">
                                            {validationErrors.privCusName}
                                        </p>
                                    )}
                                </div>

                                {/* NIC Number */}
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700">
                                        {t('NIC Number')}
                                    </label>
                                    <input
                                        type="text"
                                        value={data.NIC}
                                        onChange={(e) => setData('NIC', e.target.value)}
                                        className="block w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                    />
                                    {validationErrors.NIC && (
                                        <p className="text-xs text-red-600">
                                            {validationErrors.NIC}
                                        </p>
                                    )}
                                </div>

                                {/* Gender */}
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700">
                                        {t('Gender')}
                                    </label>
                                    <select
                                        value={data.gender}
                                        onChange={(e) =>
                                            setData(
                                                'gender',
                                                e.target.value as 'male' | 'female' | '',
                                            )
                                        }
                                        className="block w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                    >
                                        <option value="">{t('Select Gender')}</option>
                                        <option value="male">{t('Male')}</option>
                                        <option value="female">{t('Female')}</option>
                                    </select>
                                </div>

                                {/* Phone Number */}
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700">
                                        {t('Phone Number')}
                                    </label>
                                    <input
                                        type="tel"
                                        value={data.phone}
                                        onChange={(e) => setData('phone', e.target.value)}
                                        className="block w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                        pattern="[0-9]{10}"
                                        maxLength={10}
                                    />
                                    {validationErrors.phone && (
                                        <p className="text-xs text-red-600">
                                            {validationErrors.phone}
                                        </p>
                                    )}
                                </div>

                                {/* Card Number */}
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700">
                                        {t('Card Number')}
                                    </label>
                                    <input
                                        type="text"
                                        value={data.card_no}
                                        onChange={(e) => setData('card_no', e.target.value)}
                                        className="block w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                        pattern="[0-9]*"
                                        inputMode="numeric"
                                    />
                                    {validationErrors.card_no && (
                                        <p className="text-xs text-red-600">
                                            {validationErrors.card_no}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-slate-100">
                                <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center">
                                    <MapPin className="w-4 h-4 mr-2 text-vismass-blue" />
                                    {t('Address Information')}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className="md:col-span-2 space-y-1.5">
                                        <label className="text-sm font-medium text-slate-700">
                                            {t('Address')} <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            rows={2}
                                            value={data.address}
                                            onChange={(e) => setData('address', e.target.value)}
                                            className="block w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-slate-700">
                                            {t('Town')}
                                        </label>
                                        <input
                                            type="text"
                                            value={data.town}
                                            onChange={(e) => setData('town', e.target.value)}
                                            className="block w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-slate-700">
                                            {t('City')} <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.city}
                                            onChange={(e) => setData('city', e.target.value)}
                                            className="block w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-slate-700">
                                            {t('Country')} <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.country}
                                            onChange={(e) => setData('country', e.target.value)}
                                            className="block w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-slate-700">
                                            {t('Registration Date')} <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={data.regdate}
                                            onChange={(e) => setData('regdate', e.target.value)}
                                            className="block w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded border border-slate-200">
                                    <input
                                        type="checkbox"
                                        checked={data.finAct}
                                        onChange={(e) => setData('finAct', e.target.checked)}
                                        className="h-4 w-4 rounded border-slate-300 text-vismass-blue focus:ring-vismass-blue"
                                        id="finAct"
                                    />
                                    <div>
                                        <label className="text-sm font-medium text-slate-700 cursor-pointer" htmlFor="finAct">
                                            {t('Financially Active')}
                                        </label>
                                        <p className="text-[10px] text-slate-500">{t('Enable financial transactions')}</p>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded border border-slate-200">
                                    <input
                                        type="checkbox"
                                        checked={data.is_active}
                                        onChange={(e) => setData('is_active', e.target.checked)}
                                        className="h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
                                        id="is_active"
                                    />
                                    <div>
                                        <label className="text-sm font-medium text-slate-700 cursor-pointer" htmlFor="is_active">
                                            {t('Active Status')}
                                        </label>
                                        <p className="text-[10px] text-slate-500">{t('User can access the system')}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex justify-end space-x-3">
                                <Link
                                    href="/admin/privilege-users"
                                    className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                                >
                                    <RotateCcw className="mr-1.5 h-4 w-4" />
                                    {t('Cancel')}
                                </Link>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="inline-flex items-center rounded-lg bg-vismass-blue px-6 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 disabled:opacity-50 transition-all"
                                >
                                    {processing ? (
                                        <>
                                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white"></div>
                                            {t('Updating...')}
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-1.5 h-4 w-4" />
                                            {t('Update Privilege User')}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </main>

                <footer className="mt-auto border-t border-slate-200 bg-white py-4">
                    <div className="mx-auto max-w-7xl px-4 text-center">
                        <p className="text-xs text-slate-500">© UNITEC POS System • {t('Privilege User Management')}</p>
                    </div>
                </footer>
            </div>
        </AppLayout>
    );
}
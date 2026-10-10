import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    Building,
    CheckCircle,
    MapPin,
    PencilIcon,
    Phone,
    User,
} from 'lucide-react';

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
        title: t('Privilege User Details'),
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
    company?: {
        name: string;
        company_code: string;
    };
    section?: {
        name: string;
        section_code: string;
    };
}

interface Props {
    privilegeUser: PrivilegeUser;
}

export default function PrivilegeUserShow({ privilegeUser }: Props) {
    const getFullName = () => {
        return privilegeUser.privCusName;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-GB', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Privilege User Details')} />

            <div className="min-h-screen bg-slate-50 flex flex-col">
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
                                    <User className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">
                                        {privilegeUser.privCusName}
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        {t('Customer Code')}: {privilegeUser.customer_code}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <Link
                                    href={`/admin/privilege-users/${privilegeUser.id}/edit`}
                                    className="inline-flex items-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                                >
                                    <PencilIcon className="mr-1.5 h-4 w-4" />
                                    {t('Edit User')}
                                </Link>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-7xl py-8 px-4 sm:px-6 lg:px-8 flex-grow">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Summary Card */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                                <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                                    <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">{t('Summary')}</h2>
                                </div>
                                <div className="p-6">
                                    <div className="flex items-center justify-between py-2 border-b border-slate-50">
                                        <span className="text-sm text-slate-500">{t('Status')}</span>
                                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${privilegeUser.is_active ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                            {privilegeUser.is_active ? t('Active') : t('Inactive')}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between py-2 border-b border-slate-50">
                                        <span className="text-sm text-slate-500">{t('Financial Status')}</span>
                                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${privilegeUser.finAct ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                            {privilegeUser.finAct ? t('Active') : t('Inactive')}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between py-2 border-b border-slate-50">
                                        <span className="text-sm text-slate-500">{t('Registration Date')}</span>
                                        <span className="text-sm font-medium text-slate-800">{formatDate(privilegeUser.regdate)}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-2">
                                        <span className="text-sm text-slate-500">{t('Entered By')}</span>
                                        <span className="text-sm font-medium text-slate-800">{privilegeUser.ent_user || '-'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Organization Card */}
                            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                                <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                                    <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">{t('Organization')}</h2>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div>
                                        <p className="text-xs text-slate-500 flex items-center mb-1">
                                            <Building className="w-3 h-3 mr-1" />
                                            {t('Company')}
                                        </p>
                                        <p className="text-sm font-semibold text-slate-800">
                                            {privilegeUser.company ? `${privilegeUser.company.company_code} - ${privilegeUser.company.name}` : '-'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 flex items-center mb-1">
                                            <MapPin className="w-3 h-3 mr-1" />
                                            {t('Section')}
                                        </p>
                                        <p className="text-sm font-semibold text-slate-800">
                                            {privilegeUser.section ? `${privilegeUser.section.section_code} - ${privilegeUser.section.name}` : '-'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Details Cards */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Personal & Contact Information */}
                            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                                <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                                    <h2 className="text-sm font-semibold text-slate-800 flex items-center uppercase tracking-wider">
                                        <User className="w-4 h-4 mr-2 text-vismass-blue" />
                                        {t('Personal & Contact Information')}
                                    </h2>
                                </div>
                                <div className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <p className="text-xs text-slate-500 mb-1">{t('Full Name')}</p>
                                            <p className="text-sm font-medium text-slate-800">{privilegeUser.privCusName}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 mb-1">{t('NIC Number')}</p>
                                            <p className="text-sm font-medium text-slate-800">{privilegeUser.NIC || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 mb-1">{t('Gender')}</p>
                                            <p className="text-sm font-medium text-slate-800">{privilegeUser.gender ? (privilegeUser.gender === 'male' ? t('Male') : t('Female')) : '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 mb-1">{t('Phone Number')}</p>
                                            {privilegeUser.phone ? (
                                                <a href={`tel:${privilegeUser.phone}`} className="text-sm font-semibold text-vismass-blue hover:underline flex items-center">
                                                    <Phone className="w-3 h-3 mr-1" />
                                                    {privilegeUser.phone}
                                                </a>
                                            ) : (
                                                <p className="text-sm font-medium text-slate-800">-</p>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 mb-1">{t('Card Number')}</p>
                                            <p className="text-sm font-medium text-slate-800">{privilegeUser.card_no || '-'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Address Information */}
                            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                                <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                                    <h2 className="text-sm font-semibold text-slate-800 flex items-center uppercase tracking-wider">
                                        <MapPin className="w-4 h-4 mr-2 text-vismass-blue" />
                                        {t('Address Details')}
                                    </h2>
                                </div>
                                <div className="p-6">
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-xs text-slate-500 mb-1">{t('Street Address')}</p>
                                            <p className="text-sm font-medium text-slate-800">{privilegeUser.address}</p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">{t('Town')}</p>
                                                <p className="text-sm font-medium text-slate-800">{privilegeUser.town || '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">{t('City')}</p>
                                                <p className="text-sm font-medium text-slate-800">{privilegeUser.city}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">{t('Country')}</p>
                                                <p className="text-sm font-medium text-slate-800">{privilegeUser.country}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Additional Information */}
                            {(privilegeUser.notes || privilegeUser.created_at || privilegeUser.updated_at) && (
                                <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                                    <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                                        <h2 className="text-sm font-semibold text-slate-800 flex items-center uppercase tracking-wider">
                                            <CheckCircle className="w-4 h-4 mr-2 text-vismass-blue" />
                                            {t('System Info & Notes')}
                                        </h2>
                                    </div>
                                    <div className="p-6 space-y-6">
                                        {privilegeUser.notes && (
                                            <div>
                                                <p className="text-xs text-slate-500 mb-2">{t('Internal Notes')}</p>
                                                <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700 border border-slate-100 italic">
                                                    {privilegeUser.notes}
                                                </div>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-500 border-t border-slate-50 pt-4">
                                            <p>{t('Created')}: {formatDate(privilegeUser.created_at)}</p>
                                            <p>{t('Last Modified')}: {formatDate(privilegeUser.updated_at)}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
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
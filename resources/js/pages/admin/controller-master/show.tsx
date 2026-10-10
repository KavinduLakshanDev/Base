import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { index, edit } from '@/routes/admin/controller-master';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    Building,
    Calendar,
    Code,
    Database,
    Edit2,
    Eye,
    Tag,
} from 'lucide-react';

interface ControlMaster {
    id: number;
    concode: string;
    conkey: string;
    conname: string;
    is_active: boolean;
    company_code?: string;
    section_code?: string;
    created_at: string;
    updated_at: string;
}

interface Props {
    control: ControlMaster;
}

export default function ShowControllerMaster({ control }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('Dashboard'),
            href: '/dashboard',
        },
        {
            title: t('Admin'),
            href: '#',
        },
        {
            title: t('Controller Master'),
            href: index().url,
        },
        {
            title: t('View Controller'),
            href: '#',
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${control.conname} - ${t('Controller Master')}`} />

            {/* Radiant Background */}
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 relative overflow-hidden">
                {/* Background Effects */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-transparent to-blue-600/20"></div>
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-300/30 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl"></div>

                <div className="relative z-10 p-6 max-w-4xl mx-auto">
                    {/* Navigation */}
                    <div className="mb-6">
                        <Link
                            href={index().url}
                            className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Back to Controller Master</span>
                        </Link>
                    </div>

                    {/* Enhanced Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mb-4 shadow-lg shadow-blue-500/25">
                            <Eye className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-2">
                            {t('View Controller')}
                        </h1>
                        <p className="text-blue-600/80 text-lg">
                            {t('Details for')} <span className="font-semibold text-blue-700">{control.conname}</span>
                        </p>
                    </div>

                    {/* Content Container with Radiant Effects */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-blue-500/10 border border-blue-200/50 p-8 space-y-8">
                        {/* Basic Information Section */}
                        <div className="space-y-6">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Code className="w-5 h-5 text-blue-600" />
                                </div>
                                <h2 className="text-xl font-semibold text-gray-800">{t('Basic Information')}</h2>
                            </div>

                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 flex items-center">
                                        <Tag className="w-4 h-4 mr-2 text-blue-500" />
                                        {t('Control Code')}
                                    </label>
                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                        <p className="text-gray-900 font-medium">{control.concode}</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 flex items-center">
                                        <Database className="w-4 h-4 mr-2 text-blue-500" />
                                        {t('Control Key')}
                                    </label>
                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                        <p className="text-gray-900 font-medium">{control.conkey}</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 flex items-center">
                                        <Code className="w-4 h-4 mr-2 text-blue-500" />
                                        {t('Control Name')}
                                    </label>
                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                        <p className="text-gray-900 font-medium">{control.conname}</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 flex items-center">
                                        <Eye className="w-4 h-4 mr-2 text-blue-500" />
                                        {t('Status')}
                                    </label>
                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            control.is_active
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-red-100 text-red-800'
                                        }`}>
                                            {control.is_active ? t('Active') : t('Inactive')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Controller Information Section */}
                        <div className="space-y-6">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Calendar className="w-5 h-5 text-blue-600" />
                                </div>
                                <h2 className="text-xl font-semibold text-gray-800">{t('Controller Information')}</h2>
                            </div>

                            <div className="bg-blue-50/50 rounded-lg p-6 border border-blue-200/50">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                                    <div>
                                        <span className="font-medium text-blue-700">{t('Control Code')}:</span>
                                        <span className="ml-2 font-mono text-blue-800">{control.concode}</span>
                                    </div>
                                    <div>
                                        <span className="font-medium text-blue-700">{t('Control Key')}:</span>
                                        <span className="ml-2 font-mono text-blue-800">{control.conkey}</span>
                                    </div>
                                    <div>
                                        <span className="font-medium text-blue-700">{t('Status')}:</span>
                                        <span className="ml-2 text-blue-800">{control.is_active ? t('Active') : t('Inactive')}</span>
                                    </div>
                                    <div>
                                        <span className="font-medium text-blue-700">{t('Created')}:</span>
                                        <span className="ml-2 text-blue-800">{new Date(control.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Button */}
                        <div className="flex justify-end pt-6 border-t border-blue-200/50">
                            <Link
                                href={edit({ controller_master: control.id }).url}
                                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200 font-medium inline-flex items-center space-x-2"
                            >
                                <Edit2 className="w-5 h-5" />
                                <span>{t('Edit Controller')}</span>
                            </Link>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-8 text-blue-600/60">
                        <p className="text-sm">{t('View and manage your controller master details • Keep your system organized')}</p>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
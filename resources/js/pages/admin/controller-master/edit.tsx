import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { index, show } from '@/routes/admin/controller-master';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Code, Save, X } from 'lucide-react';
import { FormEventHandler } from 'react';

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

export default function EditControllerMaster({ control }: Props) {
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
            title: t('Edit Controller'),
            href: '#',
        },
    ];

    const { data, setData, put, processing, errors } = useForm({
        conkey: control.conkey,
        conname: control.conname,
        is_active: control.is_active,
    });

    const handleSubmit: FormEventHandler<HTMLFormElement> = (e) => {
        e.preventDefault();
        put(show({ controller_master: control.id }).url);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Edit')} ${control.conname} - ${t('Controller Master')}`} />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Link
                            href={index().url}
                            className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        </Link>
                        <div className="flex items-center space-x-3">
                            <div className="rounded-lg bg-indigo-100 p-2 dark:bg-indigo-900">
                                <Code className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {t('Edit Controller')}
                                </h1>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {t('Update controller:')} {control.conname}
                                </p>
                            </div>
                        </div>
                    </div>

                    <Link
                        href="/admin/controller-master"
                        className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                    >
                        <X className="mr-2 h-4 w-4" />
                        {t('Cancel')}
                    </Link>
                </div>

                {/* Edit Form */}
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            {/* Control Key */}
                            <div>
                                <label htmlFor="conkey" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('Control Key')} <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="conkey"
                                    type="text"
                                    value={data.conkey}
                                    onChange={(e) => setData('conkey', e.target.value)}
                                    className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white ${
                                        errors.conkey ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                                    }`}
                                />
                                {errors.conkey && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.conkey}</p>
                                )}
                            </div>

                            {/* Control Name */}
                            <div>
                                <label htmlFor="conname" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('Control Name')} <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="conname"
                                    type="text"
                                    value={data.conname}
                                    onChange={(e) => setData('conname', e.target.value)}
                                    className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white ${
                                        errors.conname ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                                    }`}
                                />
                                {errors.conname && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.conname}</p>
                                )}
                            </div>

                            {/* Status */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {t('Status')}
                                </label>
                                <div className="mt-1">
                                    <label className="inline-flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={data.is_active}
                                            onChange={(e) => setData('is_active', e.target.checked)}
                                            className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                                        />
                                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                            {t('Active')}
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={processing}
                                className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                            >
                                <Save className="mr-2 h-4 w-4" />
                                {processing ? t('Updating...') : t('Update Controller')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
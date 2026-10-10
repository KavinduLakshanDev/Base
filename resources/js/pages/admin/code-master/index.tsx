import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import {
    Code,
    Database,
    Edit2,
    Eye,
    Filter,
    Plus,
    Power,
    PowerOff,
    Search,
    Tag,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';

import { t } from '@/lib/i18n';
import { create, show, edit, toggle, destroy } from '@/routes/admin/code-master';

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
        title: t('Code Master'),
        href: '#',
    },
];

interface ControlMaster {
    id: number;
    concode: string;
    conkey: string;
    conname: string;
    is_active: boolean;
}

interface CodeMaster {
    id: number;
    conkey: string;
    concode: string;
    catkey: string;
    cname: string;
    company_code: string | null;
    section_code: string | null;
    is_active: boolean;
    created_at: string;
    controlMaster?: ControlMaster;
}

interface Props {
    codes: {
        data: CodeMaster[];
        links: any[];
        meta: any;
    };
    controls: ControlMaster[];
    filters: {
        search?: string;
        control_key?: string;
    };
}

export default function CodeMasterIndex({ codes, controls, filters }: Props) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [selectedControl, setSelectedControl] = useState(
        filters.control_key || '',
    );
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [codeToDelete, setCodeToDelete] = useState<CodeMaster | null>(null);

    const { delete: deleteCode, processing: deleteProcessing } = useForm({});

    const handleSearch = () => {
        router.get(
            '/admin/code-master',
            {
                search: searchTerm,
                control_key: selectedControl,
            },
            {
                preserveState: true,
                replace: true,
            },
        );
    };

    const clearFilters = () => {
        setSearchTerm('');
        setSelectedControl('');
        router.get(
            '/admin/code-master',
            {},
            {
                preserveState: true,
                replace: true,
            },
        );
    };

    const handleDelete = (code: CodeMaster) => {
        setCodeToDelete(code);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (codeToDelete) {
            deleteCode(`/admin/code-master/${codeToDelete.id}`, {
                onSuccess: () => {
                    setIsDeleteModalOpen(false);
                    setCodeToDelete(null);
                },
            });
        }
    };

    const handleToggleStatus = (code: CodeMaster) => {
        router.post(toggle(code.id).url);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Code Master - Admin')} />

            {/* Radiant Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.1),transparent_50%)]"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(147,197,253,0.1),transparent_50%)]"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(219,234,254,0.05),transparent_70%)]"></div>

            <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-blue-100 relative overflow-hidden">
                {/* Header Section with Radiant Glow */}
                <div className="relative bg-linear-to-r from-blue-600 via-blue-500 to-blue-600 shadow-2xl shadow-blue-500/25 border-b border-blue-400/20 backdrop-blur-sm">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 via-transparent to-blue-600/10"></div>
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="flex items-center justify-between py-6">
                            <div className="flex items-center space-x-4">
                                {/* Enhanced Back Button with Glow */}
                                <button
                                    onClick={() => window.history.back()}
                                    className="mr-2 rounded-xl bg-white/20 backdrop-blur-md p-3 hover:bg-white/30 transition-all duration-300 border border-white/40 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
                                    title="Go Back"
                                >
                                    <svg className="h-5 w-5 text-white drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                </button>
                                <div className="rounded-2xl bg-linear-to-br from-white/20 to-blue-500/30 p-4 shadow-2xl shadow-blue-500/30 backdrop-blur-md border border-white/30">
                                    <Code className="h-8 w-8 text-white drop-shadow-lg" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold text-white drop-shadow-lg">
                                        {t('Code Master')}
                                    </h1>
                                    <p className="text-sm text-blue-100 drop-shadow-md">
                                        {t('Manage codes and categories within controllers')}
                                    </p>
                                </div>
                            </div>
                            <div className="rounded-2xl bg-white/15 backdrop-blur-md border border-white/30 shadow-lg shadow-blue-500/20">
                                <Link
                                    href={create().url}
                                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white hover:text-blue-100 transition-all duration-300 drop-shadow-sm"
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    {t('Create Code Master')}
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="mx-auto max-w-7xl py-8 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">

                {/* Search and Filters */}
                <div className="rounded-xl border border-sidebar-border/70 bg-white p-4 dark:bg-gray-800">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="min-w-64 flex-1">
                            <div className="relative">
                                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                                <input
                                    type="text"
                                    placeholder={t(
                                        'Search codes, names, or keys...',
                                    )}
                                    value={searchTerm}
                                    onChange={(e) =>
                                        setSearchTerm(e.target.value)
                                    }
                                    onKeyDown={(e) =>
                                        e.key === 'Enter' && handleSearch()
                                    }
                                    className="w-full rounded-md border border-gray-300 py-2 pr-4 pl-10 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="min-w-48">
                            <select
                                value={selectedControl}
                                onChange={(e) =>
                                    setSelectedControl(e.target.value)
                                }
                                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            >
                                <option value="">{t('All Controllers')}</option>
                                {controls.map((control) => (
                                    <option key={control.id} value={control.conkey}>
                                        {control.conname} ({control.conkey})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex space-x-2">
                            <button
                                onClick={handleSearch}
                                className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
                            >
                                <Filter className="mr-2 h-4 w-4" />
                                {t('Filter')}
                            </button>

                            <button
                                onClick={clearFilters}
                                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                {t('Clear')}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Codes Table */}
                <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-white dark:bg-gray-800">
                    <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {t('Codes')}
                            </h3>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                {codes.meta?.total || codes.data.length}{' '}
                                {t('codes total')}
                            </span>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">
                                        {t('Code')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">
                                        {t('Name')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">
                                        {t('Company')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">
                                        {t('Section')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">
                                        {t('Controller')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">
                                        {t('Status')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">
                                        {t('Actions')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                                {codes.data.length > 0 ? (
                                    codes.data.map((code) => (
                                        <tr
                                            key={code.id}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-700"
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="shrink-0">
                                                        <div
                                                            className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                                                                code.is_active
                                                                    ? 'bg-indigo-100 dark:bg-indigo-900'
                                                                    : 'bg-gray-100 dark:bg-gray-700'
                                                            }`}
                                                        >
                                                            <Tag
                                                                className={`h-4 w-4 ${
                                                                    code.is_active
                                                                        ? 'text-indigo-600 dark:text-indigo-400'
                                                                        : 'text-gray-500'
                                                                }`}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                            {code.catkey}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-900 dark:text-white">
                                                    {code.cname}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900 dark:text-white">
                                                    {code.company_code || '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900 dark:text-white">
                                                    {code.section_code || '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <Database className="mr-2 h-4 w-4 text-gray-400" />
                                                    <div>
                                                        <div className="text-sm text-gray-900 dark:text-white">
                                                            {code.controlMaster
                                                                ?.conname ||
                                                                'Unknown Controller'}
                                                        </div>
                                                        <div className="text-xs text-blue-600 dark:text-blue-400">
                                                            {code.controlMaster
                                                                ?.conkey ||
                                                                code.conkey}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span
                                                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                        code.is_active
                                                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                                    }`}
                                                >
                                                    {code.is_active
                                                        ? t('Active')
                                                        : t('Inactive')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() =>
                                                            handleToggleStatus(
                                                                code,
                                                            )
                                                        }
                                                        className={`${
                                                            code.is_active
                                                                ? 'text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300'
                                                                : 'text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300'
                                                        }`}
                                                        title={
                                                            code.is_active
                                                                ? t(
                                                                      'Deactivate',
                                                                  )
                                                                : t('Activate')
                                                        }
                                                    >
                                                        {code.is_active ? (
                                                            <PowerOff className="h-4 w-4" />
                                                        ) : (
                                                            <Power className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                    <Link
                                                        href={show(code.id).url}
                                                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Link>
                                                    <Link
                                                        href={edit(code.id).url}
                                                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </Link>
                                                    <button
                                                        onClick={() =>
                                                            handleDelete(code)
                                                        }
                                                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="px-6 py-12 text-center"
                                        >
                                            <div className="text-gray-500 dark:text-gray-400">
                                                <Code className="mx-auto mb-4 h-12 w-12 opacity-50" />
                                                <p className="text-sm">
                                                    {t('No codes found')}
                                                </p>
                                                <p className="mt-1 text-xs">
                                                    {t(
                                                        'Add your first code to get started',
                                                    )}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {codes.data.length > 0 && codes.links && (
                        <div className="border-t border-gray-200 px-6 py-4 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {t('Showing')} {codes.meta?.from || 1}{' '}
                                    {t('to')}{' '}
                                    {codes.meta?.to || codes.data.length}{' '}
                                    {t('of')}{' '}
                                    {codes.meta?.total || codes.data.length}{' '}
                                    {t('results')}
                                </div>
                                <div className="flex space-x-2">
                                    {codes.links?.map(
                                        (link: any, index: number) => (
                                            <button
                                                key={index}
                                                onClick={() =>
                                                    link.url &&
                                                    router.visit(link.url)
                                                }
                                                disabled={!link.url}
                                                className={`rounded px-3 py-1 text-sm ${
                                                    link.active
                                                        ? 'bg-indigo-600 text-white'
                                                        : link.url
                                                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                                                          : 'cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                                                }`}
                                                dangerouslySetInnerHTML={{
                                                    __html: link.label,
                                                }}
                                            />
                                        ),
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            </div> </div>

            {/* Delete Confirmation Modal */}
            <AlertDialog.Root
                open={isDeleteModalOpen}
                onOpenChange={setIsDeleteModalOpen}
            >
                <AlertDialog.Portal>
                    <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
                    <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 transform rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
                        <AlertDialog.Title className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                            {t('Delete Code')}
                        </AlertDialog.Title>
                        <AlertDialog.Description className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                            {t('Are you sure you want to delete')} "
                            {codeToDelete?.cname}" ({codeToDelete?.catkey})?{' '}
                            {t('This action cannot be undone.')}
                        </AlertDialog.Description>

                        <div className="flex justify-end space-x-3">
                            <AlertDialog.Cancel asChild>
                                <button className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                    {t('Cancel')}
                                </button>
                            </AlertDialog.Cancel>
                            <AlertDialog.Action asChild>
                                <button
                                    onClick={confirmDelete}
                                    disabled={deleteProcessing}
                                    className="rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                                >
                                    {deleteProcessing
                                        ? t('Deleting...')
                                        : t('Delete')}
                                </button>
                            </AlertDialog.Action>
                        </div>
                    </AlertDialog.Content>
                </AlertDialog.Portal>
            </AlertDialog.Root>
        </AppLayout>
    );
}
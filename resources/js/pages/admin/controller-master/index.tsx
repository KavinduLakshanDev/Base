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
import { create, index, destroy, show, edit, toggle } from '@/routes/admin/controller-master';

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
        href: '#',
    },
];

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
    controls: {
        data: ControlMaster[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from: number;
        to: number;
        links: Array<{
            url: string | null;
            label: string;
            active: boolean;
        }>;
    };
    filters: {
        search?: string;
    };
}

export default function Index({ controls, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [showFilters, setShowFilters] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [controlToDelete, setControlToDelete] = useState<ControlMaster | null>(null);

    const { delete: deleteForm, processing } = useForm({});

    const handleSearch = () => {
        router.get(index().url, {
            search: search || undefined,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const handleDelete = (control: ControlMaster) => {
        setControlToDelete(control);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (controlToDelete) {
            deleteForm(destroy(controlToDelete.id).url, {
                onSuccess: () => {
                    setDeleteDialogOpen(false);
                    setControlToDelete(null);
                },
            });
        }
    };

    const toggleStatus = (control: ControlMaster) => {
        router.post(toggle(control.id).url, {}, {
            preserveScroll: true,
        });
    };

    const displayControls = controls?.data || [];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Controller Master')} />

            {/* Radiant Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.05),transparent_50%)]"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(147,197,253,0.04),transparent_50%)]"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(219,234,254,0.02),transparent_70%)]"></div>

            <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-blue-100 relative overflow-hidden">
                {/* Header Section */}
                <div className="relative bg-linear-to-r from-blue-600 via-blue-500 to-blue-600 shadow-2xl shadow-blue-500/20 border-b border-blue-400/20 backdrop-blur-sm">
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
                                    <Database className="h-8 w-8 text-white drop-shadow-lg" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold text-white drop-shadow-lg">
                                        {t('Controller Master')}
                                    </h1>
                                    <p className="text-sm text-blue-100 drop-shadow-md">
                                        {t('Manage controller masters for your system')}
                                    </p>
                                </div>
                            </div>
                            <div className="rounded-2xl bg-white/15 backdrop-blur-md border border-white/30 shadow-lg shadow-blue-500/20">
                                <Link
                                    href={create().url}
                                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white hover:text-blue-100 transition-all duration-300 drop-shadow-sm"
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    {t('Add Controller')}
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
                                    placeholder={t('Search controllers...')}
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    className="w-full rounded-md border border-gray-300 py-2 pr-4 pl-10 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
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
                                onClick={() => { setSearch(''); router.get(index().url, {}, { preserveState: true, replace: true }); }}
                                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                {t('Clear')}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-900">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('Code')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('Key')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('Name')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('Status')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {t('Actions')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                                {displayControls.map((control) => (
                                    <tr key={control.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                            {control.concode}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                            {control.conkey}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                            {control.conname}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium ${
                                                control.is_active
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                            }`}>
                                                {control.is_active ? (
                                                    <>
                                                        <Power className="h-3 w-3" />
                                                        {t('Active')}
                                                    </>
                                                ) : (
                                                    <>
                                                        <PowerOff className="h-3 w-3" />
                                                        {t('Inactive')}
                                                    </>
                                                )}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    href={show(control.id).url}
                                                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Link>
                                                <Link
                                                    href={edit(control.id).url}
                                                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </Link>
                                                <button
                                                    onClick={() => toggleStatus(control)}
                                                    className={`${
                                                        control.is_active
                                                            ? 'text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300'
                                                            : 'text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300'
                                                    }`}
                                                >
                                                    {control.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(control)}
                                                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                    {/* Pagination */}
                    {controls.last_page > 1 && (
                        <div className="border-t border-gray-200 px-6 py-4 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {t('Showing')} {controls.from} {t('to')} {controls.to} {t('of')} {controls.total} {t('results')}
                                </div>
                                <div className="flex space-x-2">
                                    {controls.links.map((link, index) => (
                                        <button
                                            key={index}
                                            onClick={() => link.url && router.visit(link.url)}
                                            disabled={!link.url}
                                            className={`rounded px-3 py-1 text-sm ${link.active ? 'bg-indigo-600 text-white' : link.url ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300' : 'cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'}`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
        </AppLayout>
    );
}
import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Plus, Search, Edit, Trash2, Eye, Shield, X, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { usePermission } from '@/hooks/usePermission';

// Declare route function (available globally via Ziggy)
declare function route(name: string, params?: any): string;

interface Permission {
    id: number;
    name: string;
    slug: string;
    description?: string;
    created_at: string;
    updated_at: string;
}

interface Props {
    permissions: {
        data: Permission[];
        current_page: number;
        per_page: number;
        total: number;
        last_page: number;
        links: any[];
    };
    filters?: {
        search?: string;
    };
    success?: string;
    error?: string;
}

export default function Index({ permissions, filters, success, error }: Props) {
    const [searchTerm, setSearchTerm] = useState(filters?.search || '');
    const [isDeleting, setIsDeleting] = useState<number | null>(null);
    const { hasPermission } = usePermission();

    React.useEffect(() => {
        if (success) toast.success(success);
        if (error) toast.error(error);
    }, [success, error]);

    const breadcrumbs = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Permissions', href: '#' },
    ];

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(route('permissions.index'), { search: searchTerm }, {
            preserveState: true,
            replace: true,
        });
    };

    const clearFilters = () => {
        setSearchTerm('');
        router.get(route('permissions.index'), {}, {
            preserveState: true,
            replace: true,
        });
    };

    const handleDelete = (permission: Permission) => {
        setIsDeleting(permission.id);
        router.delete(route('permissions.destroy', permission.id), {
            data: { force: true },
            onSuccess: () => {
                setIsDeleting(null);
                toast.success('Permission deleted successfully');
            },
            onError: () => {
                setIsDeleting(null);
                toast.error('Failed to delete permission');
            }
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Permissions Management" />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4">
                            <div className="flex items-center space-x-3">
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <Shield className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">
                                        Permissions Management
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        Manage system permissions and access controls
                                    </p>
                                </div>
                            </div>
                            {hasPermission('permissions.create') && (
                                <Link
                                    href={route('permissions.create')}
                                    className="inline-flex items-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                                >
                                    <Plus className="mr-1.5 h-4 w-4" />
                                    Add Permission
                                </Link>
                            )}
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">

                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue p-2 shadow-sm">
                                        <Shield className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">Total Permissions</p>
                                        <p className="text-lg font-bold text-gray-900">{permissions.total}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-grey p-2 shadow-sm">
                                        <Eye className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">Current Page</p>
                                        <p className="text-lg font-bold text-gray-900">{permissions.current_page} / {permissions.last_page}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue/60 p-2 shadow-sm">
                                        <Filter className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">Showing</p>
                                        <p className="text-lg font-bold text-gray-900">{permissions.data.length} records</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Content Card */}
                        <div className="rounded-lg border border-slate-200 bg-white shadow overflow-hidden">
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 py-3">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                                    <div>
                                        <h3 className="text-base font-semibold text-white">
                                            Permissions List
                                        </h3>
                                        <p className="text-white/80 text-xs mt-0.5">
                                            View and manage all system permissions
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4">
                                {/* Search / Filter Bar */}
                                <div className="bg-slate-50 p-3 rounded-lg mb-4 border border-slate-200">
                                    <form onSubmit={handleSearch} className="space-y-3 md:space-y-0 md:flex md:space-x-3">
                                        <div className="flex-1">
                                            <div className="relative">
                                                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Search by name, slug, or description..."
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex space-x-2">
                                            <button
                                                type="submit"
                                                className="inline-flex items-center bg-gradient-to-r from-sky-600 to-blue-600 text-white px-4 py-2 text-sm rounded-lg hover:from-sky-700 hover:to-blue-700 transition-all duration-200 font-medium"
                                            >
                                                <Search className="mr-1.5 h-3.5 w-3.5" />
                                                Search
                                            </button>
                                            <button
                                                type="button"
                                                onClick={clearFilters}
                                                className="inline-flex items-center bg-gray-200 text-gray-700 px-4 py-2 text-sm rounded-lg hover:bg-gray-300 transition-all duration-200 font-medium"
                                            >
                                                <X className="mr-1.5 h-3.5 w-3.5" />
                                                Clear
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                {/* Permissions Table */}
                                {permissions.data.length > 0 ? (
                                    <div className="overflow-hidden rounded-lg border border-gray-200">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
                                                <tr>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        Name
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        Slug
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        Description
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        Created
                                                    </th>
                                                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        Actions
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {permissions.data.map((permission) => (
                                                    <tr key={permission.id} className="hover:bg-sky-50/50 transition-colors duration-150">
                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            <div className="flex items-center">
                                                                <Shield className="mr-1.5 h-3.5 w-3.5 text-vismass-blue" />
                                                                <span className="text-xs font-medium text-gray-900">{permission.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 font-mono">
                                                                {permission.slug}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <span className="text-xs text-gray-600">
                                                                {permission.description || (
                                                                    <span className="italic text-gray-400">No description</span>
                                                                )}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-500">
                                                            {new Date(permission.created_at).toLocaleDateString('en-GB')}
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap text-xs font-medium text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <Link
                                                                    href={route('permissions.show', permission.id)}
                                                                    className="inline-flex items-center text-sky-600 hover:text-sky-800 transition-colors"
                                                                >
                                                                    <Eye className="mr-1 h-3.5 w-3.5" />
                                                                    View
                                                                </Link>
                                                                {hasPermission('permissions.edit') && (
                                                                    <Link
                                                                        href={route('permissions.edit', permission.id)}
                                                                        className="inline-flex items-center text-amber-600 hover:text-amber-800 transition-colors"
                                                                    >
                                                                        <Edit className="mr-1 h-3.5 w-3.5" />
                                                                        Edit
                                                                    </Link>
                                                                )}
                                                                {/* {hasPermission('permissions.delete') && (
                                                                    <button
                                                                        disabled={isDeleting === permission.id}
                                                                        onClick={() => {
                                                                            if (window.confirm(`Are you sure you want to delete "${permission.name}"? This action cannot be undone.`)) {
                                                                                handleDelete(permission);
                                                                            }
                                                                        }}
                                                                        className="inline-flex items-center text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
                                                                    >
                                                                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                                                                        {isDeleting === permission.id ? 'Deleting...' : 'Delete'}
                                                                    </button>
                                                                )} */}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <div className="mx-auto h-10 w-10 text-gray-400 mb-3">
                                            <Shield className="h-10 w-10" />
                                        </div>
                                        <h3 className="text-xs font-medium text-gray-900 mb-1.5">No permissions found</h3>
                                        <p className="text-xs text-gray-500 mb-3">
                                            Get started by creating a new permission.
                                        </p>
                                        {hasPermission('permissions.create') && (
                                            <Link
                                                href={route('permissions.create')}
                                                className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded-lg text-white bg-vismass-blue hover:bg-vismass-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-vismass-blue"
                                            >
                                                <Plus className="mr-1.5 h-3.5 w-3.5" />
                                                Create Permission
                                            </Link>
                                        )}
                                    </div>
                                )}

                                {/* Pagination */}
                                {permissions.last_page > 1 && (
                                    <div className="mt-4 flex items-center justify-between">
                                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-center">
                                            <nav className="relative z-0 inline-flex rounded-xl shadow-sm -space-x-px" aria-label="Pagination">
                                                {permissions.links.map((link, index) => (
                                                    <button
                                                        key={index}
                                                        onClick={() => { if (link.url) router.get(link.url); }}
                                                        disabled={!link.url}
                                                        className={`relative inline-flex items-center px-4 py-2 text-sm font-medium border rounded-xl mx-1 ${link.active
                                                                ? 'z-10 bg-sky-50 border-sky-500 text-sky-600'
                                                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                                            } disabled:opacity-50`}
                                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                                    />
                                                ))}
                                            </nav>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="mt-6 border-t border-sky-200 bg-gradient-to-r from-white to-sky-50">
                    <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
                        <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2">
                            <p className="text-xs text-gray-500">© VISMASS Permissions Management • Access Control</p>
                        </div>
                    </div>
                </footer>
            </div>
        </AppLayout>
    );
}
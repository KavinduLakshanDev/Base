import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {
    Plus,
    Search,
    Edit,
    Trash2,
    Eye,
    Shield,
    Building,
    Users,
    RefreshCw,
    CheckCircle,
    TrendingUp,
    ArrowLeft,
    X,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePermission } from '@/hooks/usePermission';

// Declare route function (available globally via Ziggy)
declare function route(name: string, params?: any): string;

interface Role {
    id: number;
    name: string;
    slug: string;
    description?: string;
    level: 'super_admin' | 'company_admin' | 'branch_admin' | 'technician' | 'sales_rep' | 'cashier' | 'user' | 'section_user';
    level_label?: string; // provided by backend accessor
    company?: {
        id: number;
        name: string;
    };
    section?: {
        id: number;
        name: string;
    };
    is_system_role: boolean;
    permissions: Array<{
        id: number;
        name: string;
    }>;
    created_at: string;
}

interface Props {
    roles: {
        data: Role[];
        current_page: number;
        per_page: number;
        total: number;
        last_page: number;
        links: any[];
    };
    filters: {
        search?: string;
    };
    success?: string;
    error?: string;
}

export default function Index({ roles, filters, success, error }: Props) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [isDeleting, setIsDeleting] = useState<number | null>(null);
    const { hasPermission } = usePermission();

    const { auth } = usePage().props as any;
    const currentUserType = auth?.user?.user_type;

    React.useEffect(() => {
        if (success) {
            toast.success(success);
        }
        if (error) {
            toast.error(error);
        }
    }, [success, error]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const applyFilters = (overrides = {}) => {
        router.get(route('roles.index'), {
            search: searchTerm || undefined,
            ...overrides
        }, {
            preserveState: true,
            replace: true,
        });
    };


    const handleDelete = (role: Role) => {
        if (window.confirm(`Are you sure you want to delete "${role.name}"? This action cannot be undone and may affect users who have this role assigned.`)) {
            setIsDeleting(role.id);
            router.delete(route('roles.destroy', role.id), {
                data: { force: true },
                onSuccess: () => {
                    setIsDeleting(null);
                    toast.success('Role deleted successfully');
                },
                onError: () => {
                    setIsDeleting(null);
                    toast.error('Failed to delete role');
                }
            });
        }
    };

    const handleRefresh = () => {
        router.reload();
    };

    const clearFilters = () => {
        setSearchTerm('');
        router.get(route('roles.index'));
    };

    const formatLevel = (level: string, label?: string) => {
        if (label) return label;
        return level.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const getLevelIcon = (level: string) => {
        switch (level) {
            case 'super_admin':
                return <Shield className="h-4 w-4" />;
            case 'company_admin':
                return <Building className="h-4 w-4" />;
            default:
                return <Users className="h-4 w-4" />;
        }
    };

    const breadcrumbs = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Roles', href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Roles Management" />

            <div className="min-h-screen bg-slate-50">
                {/* Header Section */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4">
                            <div className="flex items-center space-x-3">
                                <Link
                                    href="/dashboard"
                                    className="rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </Link>
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <Shield className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">
                                        Roles Management
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        Manage user roles and their permissions
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={handleRefresh}
                                    className="inline-flex items-center rounded-lg bg-white/20 px-3 py-2 text-sm font-medium text-white transition-all hover:bg-white/30"
                                >
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Refresh
                                </button>
                                {hasPermission('roles.create') && (
                                    <Link
                                        href={route('roles.create')}
                                        className="inline-flex items-center rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-white/30 bg-white/20 border border-white/30"
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        New Role
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                    {/* Stats Cards */}
                    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
                        <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200">
                            <div className="flex items-center">
                                <div className="rounded-lg bg-blue-100 p-2">
                                    <Users className="h-5 w-5 text-blue-600" />
                                </div>
                                <div className="ml-3">
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Roles</p>
                                    <p className="text-xl font-bold text-slate-900">{roles.total}</p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200">
                            <div className="flex items-center">
                                <div className="rounded-lg bg-purple-100 p-2">
                                    <Shield className="h-5 w-5 text-purple-600" />
                                </div>
                                <div className="ml-3">
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">System Roles</p>
                                    <p className="text-xl font-bold text-slate-900">{roles.data.filter(r => r.is_system_role).length}</p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200">
                            <div className="flex items-center">
                                <div className="rounded-lg bg-emerald-100 p-2">
                                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                                </div>
                                <div className="ml-3">
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Custom Roles</p>
                                    <p className="text-xl font-bold text-slate-900 text-emerald-600">{roles.data.filter(r => !r.is_system_role).length}</p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200">
                            <div className="flex items-center">
                                <div className="rounded-lg bg-amber-100 p-2">
                                    <CheckCircle className="h-5 w-5 text-amber-600" />
                                </div>
                                <div className="ml-3">
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Assigned Roles</p>
                                    <p className="text-xl font-bold text-slate-900">{roles.data.filter(r => r.permissions && r.permissions.length > 0).length}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Table Card */}
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                        {/* Table Header w/ Search */}
                        <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-6 py-4">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                                <div>
                                    <h3 className="text-lg font-bold text-white">System Roles</h3>
                                    <p className="text-xs text-white/80">Manage application access levels and permissions</p>
                                </div>

                                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-2">
                                    <div className="relative w-full sm:w-64">
                                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="Search roles..."
                                            className="w-full rounded-xl border-0 bg-white/10 px-9 py-2 text-sm text-white placeholder-white/60 ring-1 ring-inset ring-white/20 focus:ring-2 focus:ring-white"
                                        />
                                    </div>
                                    {searchTerm && (
                                        <button
                                            type="button"
                                            onClick={clearFilters}
                                            className="rounded-xl bg-white/20 p-2 text-white hover:bg-white/30"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-vismass-blue hover:bg-slate-50 transition-colors"
                                    >
                                        Search
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gradient-to-r from-sky-50 to-blue-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 font-bold text-slate-800">Role Name</th>
                                        <th className="px-6 py-4 font-bold text-slate-800">Level</th>
                                        <th className="px-6 py-4 font-bold text-slate-800">Scope</th>
                                        <th className="px-6 py-4 font-bold text-slate-800">Permissions</th>
                                        <th className="px-6 py-4 font-bold text-slate-800">Type</th>
                                        <th className="px-6 py-4 font-bold text-slate-800 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {roles.data.length > 0 ? (
                                        roles.data.map((role) => (
                                            <tr key={role.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="p-2 bg-slate-100 rounded-lg">
                                                            {getLevelIcon(role.level)}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-900">{role.name}</div>
                                                            <div className="text-xs text-slate-500 font-mono tracking-tighter truncate max-w-[120px]">
                                                                {role.slug}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border ${role.level === 'super_admin' ? 'bg-red-50 text-red-700 border-red-200' :
                                                            role.level === 'company_admin' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                                'bg-slate-50 text-slate-700 border-slate-200'
                                                        }`}>
                                                        {formatLevel(role.level, role.level_label)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {role.company ? (
                                                        <div className="text-xs">
                                                            <div className="font-semibold text-slate-800 uppercase tracking-tight">{role.company.name}</div>
                                                            {role.section && (
                                                                <div className="text-slate-500 mt-0.5">{role.section.name}</div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 font-medium italic">Global System</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-wrap gap-1">
                                                        {role.permissions && role.permissions.length > 0 ? (
                                                            <>
                                                                {role.permissions.slice(0, 2).map(p => (
                                                                    <span key={p.id} className="inline-flex rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200">
                                                                        {p.name}
                                                                    </span>
                                                                ))}
                                                                {role.permissions.length > 2 && (
                                                                    <span className="inline-flex rounded-lg bg-vismass-blue/10 px-2 py-0.5 text-[10px] font-bold text-vismass-blue border border-vismass-blue/20">
                                                                        +{role.permissions.length - 2} more
                                                                    </span>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <span className="text-xs text-slate-400 italic">None</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border ${role.is_system_role ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-green-50 text-green-700 border-green-200'
                                                        }`}>
                                                        {role.is_system_role ? 'System' : 'Custom'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end space-x-3">
                                                        {hasPermission('roles.view') && (
                                                            <Link
                                                                href={route('roles.show', role.id)}
                                                                className="text-slate-400 hover:text-vismass-blue transition-colors flex items-center space-x-1 font-semibold text-xs"
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                                <span>View</span>
                                                            </Link>
                                                        )}
                                                        {hasPermission('roles.edit') && (
                                                            <Link
                                                                href={route('roles.edit', role.id)}
                                                                className="text-slate-400 hover:text-blue-600 transition-colors flex items-center space-x-1 font-semibold text-xs"
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                                <span>Edit</span>
                                                            </Link>
                                                        )}
                                                        {(hasPermission('roles.delete') && (!role.is_system_role || (role.is_system_role && currentUserType === 'super_admin' && role.slug !== 'super_admin'))) && (
                                                            <button
                                                                onClick={() => handleDelete(role)}
                                                                disabled={isDeleting === role.id}
                                                                className="text-slate-400 hover:text-red-600 transition-colors flex items-center space-x-1 font-semibold text-xs disabled:opacity-50"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                                <span>{isDeleting === role.id ? '...' : 'Delete'}</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center">
                                                <Shield className="mx-auto h-12 w-12 text-slate-200" />
                                                <p className="mt-2 text-sm font-medium text-slate-500">No roles found matching your criteria</p>
                                                <button onClick={clearFilters} className="mt-4 text-sm font-bold text-vismass-blue hover:underline">Clear Filters</button>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Footer */}
                        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 text-sm">
                                <div className="text-slate-500">
                                    Showing <span className="font-bold text-slate-900">{((roles.current_page - 1) * roles.per_page) + 1}</span> to{' '}
                                    <span className="font-bold text-slate-900">{Math.min(roles.current_page * roles.per_page, roles.total)}</span> of{' '}
                                    <span className="font-bold text-slate-900">{roles.total}</span> records
                                </div>
                                <div className="flex items-center space-x-1">
                                    {roles.links.map((link, i) => (
                                        <Link
                                            key={i}
                                            href={link.url || '#'}
                                            className={`rounded-lg px-3 py-1.5 transition-all duration-200 ${link.active
                                                    ? 'bg-gradient-to-r from-vismass-blue to-vismass-grey font-bold text-white shadow-md'
                                                    : link.url
                                                        ? 'text-slate-600 hover:bg-slate-200'
                                                        : 'text-slate-300 cursor-not-allowed'
                                                }`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Footer Message */}
                <div className="text-center pb-8 pt-4">
                    <p className="text-xs text-slate-400 font-medium">Manage your system access control securely • Professional POS Solutions</p>
                </div>
            </div>
        </AppLayout>
    );
}
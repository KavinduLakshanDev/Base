import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';

// Declare route function (available globally via Ziggy)
declare function route(name: string, params?: any): string;
import { ArrowLeft, Edit, Users, Shield, Info, Code } from 'lucide-react';

interface Role {
    id: number;
    name: string;
    slug: string;
    description?: string;
    level: string;
    company?: {
        id: number;
        name: string;
    };
    section?: {
        id: number;
        name: string;
    };
    is_system_role: boolean;
}

interface Permission {
    id: number;
    name: string;
    slug: string;
    description?: string;
    created_at: string;
    updated_at: string;
    roles: Role[];
}

interface Props {
    permission: Permission;
}

export default function Show({ permission }: Props) {
    const getLevelBadgeColor = (level: string) => {
        switch (level) {
            case 'super_admin':
                return 'bg-red-100 text-red-800';
            case 'company_admin':
                return 'bg-blue-100 text-blue-800';
            case 'branch_admin':
                return 'bg-purple-100 text-purple-800';
            case 'user':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const formatLevel = (level: string) => {
        return level.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    return (
        <AppLayout>
            <Head title={`Permission: ${permission.name}`} />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-3">
                            <div className="flex items-center space-x-2">
                                <Link
                                    href={route('permissions.index')}
                                    className="rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                >
                                    <ArrowLeft className="h-4 w-4 text-white" />
                                </Link>
                                <div className="rounded-lg bg-white/20 p-2">
                                    <Shield className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-lg font-bold text-white">
                                        Permission Details
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        View permission information and assigned roles
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Link
                                    href={route('permissions.edit', permission.id)}
                                    className="inline-flex items-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                                >
                                    <Edit className="mr-1.5 h-4 w-4" />
                                    Edit Permission
                                </Link>
                            </div>
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
                                        <p className="text-xs font-medium text-gray-600">Permission ID</p>
                                        <p className="text-lg font-bold text-gray-900">
                                            #{permission.id}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-grey p-2 shadow-sm">
                                        <Users className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">Assigned Roles</p>
                                        <p className="text-lg font-bold text-gray-900">
                                            {permission.roles.length}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue/60 p-2 shadow-sm">
                                        <Code className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">Slug</p>
                                        <p className="text-sm font-bold text-gray-900 font-mono">
                                            {permission.slug}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Permission Details Card */}
                        <div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden mb-4">
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 py-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <div className="rounded-lg bg-white/20 p-1.5">
                                            <Shield className="h-4 w-4 text-white" />
                                        </div>
                                        <h3 className="text-base font-semibold text-white">
                                            {permission.name}
                                        </h3>
                                    </div>
                                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-white/20 text-white">
                                        {permission.slug}
                                    </span>
                                </div>
                            </div>

                            <div className="p-4">
                                <p className="text-sm text-gray-600 mb-4">
                                    {permission.description || 'No description provided'}
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">
                                            Created
                                        </label>
                                        <p className="text-sm text-gray-900">{new Date(permission.created_at).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">
                                            Last Updated
                                        </label>
                                        <p className="text-sm text-gray-900">{new Date(permission.updated_at).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Assigned Roles Card */}
                        <div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden mb-4">
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 py-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <div className="rounded-lg bg-white/20 p-1.5">
                                            <Users className="h-4 w-4 text-white" />
                                        </div>
                                        <h3 className="text-base font-semibold text-white">
                                            Assigned Roles
                                        </h3>
                                    </div>
                                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-white/20 text-white">
                                        {permission.roles.length} role{permission.roles.length !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            </div>

                            <div className="p-4">
                                {permission.roles.length > 0 ? (
                                    <div className="overflow-hidden rounded-lg border border-gray-200">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
                                                <tr>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        Role Name
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        Level
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        Scope
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        Type
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        Description
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {permission.roles.map((role) => (
                                                    <tr key={role.id} className="hover:bg-sky-50/50 transition-colors duration-150">
                                                        <td className="px-4 py-2.5">
                                                            <Link
                                                                href={route('roles.show', role.id)}
                                                                className="text-sm font-medium text-sky-600 hover:text-sky-800 transition-colors"
                                                            >
                                                                {role.name}
                                                            </Link>
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getLevelBadgeColor(role.level)}`}>
                                                                {formatLevel(role.level)}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            {role.company ? (
                                                                <div className="text-xs">
                                                                    <div className="text-gray-900">{role.company.name}</div>
                                                                    {role.section && (
                                                                        <div className="text-gray-500">
                                                                            {role.section.name}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700">
                                                                    System Wide
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            {role.is_system_role ? (
                                                                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">
                                                                    System
                                                                </span>
                                                            ) : (
                                                                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700">
                                                                    Custom
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <div className="text-xs text-gray-600">
                                                                {role.description || (
                                                                    <span className="italic text-gray-400">
                                                                        No description
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                        <p className="text-gray-600 mb-4">
                                            This permission is not assigned to any roles yet
                                        </p>
                                        <Link
                                            href={route('roles.create')}
                                            className="inline-flex items-center rounded-lg bg-vismass-blue px-4 py-2 text-sm font-medium text-white shadow hover:bg-vismass-blue/90 transition-all duration-200"
                                        >
                                            Create Role with this Permission
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Usage Information Card */}
                        <div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 py-3">
                                <div className="flex items-center space-x-2">
                                    <div className="rounded-lg bg-white/20 p-1.5">
                                        <Code className="h-4 w-4 text-white" />
                                    </div>
                                    <h3 className="text-base font-semibold text-white">
                                        Usage Information
                                    </h3>
                                </div>
                            </div>

                            <div className="p-4 space-y-4">
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-800 mb-2">Code Usage</h4>
                                    <p className="text-xs text-gray-600 mb-2">
                                        To check this permission in your code, use:
                                    </p>
                                    <code className="block px-3 py-2 bg-slate-50 rounded-lg text-xs font-mono text-gray-900 border border-slate-200">
                                        {`$user->hasPermission('${permission.slug}')`}
                                    </code>
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-800 mb-2">Middleware Usage</h4>
                                    <p className="text-xs text-gray-600 mb-2">
                                        To protect routes with this permission:
                                    </p>
                                    <code className="block px-3 py-2 bg-slate-50 rounded-lg text-xs font-mono text-gray-900 border border-slate-200">
                                        {`Route::middleware('permission:${permission.slug}')`}
                                    </code>
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-800 mb-2">Impact</h4>
                                    <p className="text-xs text-gray-600">
                                        This permission affects {permission.roles.length} role{permission.roles.length !== 1 ? 's' : ''}
                                        {' '}and all users assigned to those roles.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </AppLayout>
    );
}
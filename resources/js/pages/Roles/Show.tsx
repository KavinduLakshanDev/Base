import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';

// Declare route function (available globally via Ziggy)
declare function route(name: string, params?: any): string;

import { Badge } from '@/components/ui/badge';

import { Edit, Shield, Building, Users, Key, User as UserIcon,  Database } from 'lucide-react';

interface Permission {
    id: number;
    name: string;
    slug: string;
    description?: string;
}

interface User {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    is_active: boolean;
}

interface Role {
    id: number;
    name: string;
    slug: string;
    description?: string;
    level: 'super_admin' | 'company_admin' | 'branch_admin' | 'user';
    company?: {
        id: number;
        name: string;
    };
    section?: {
        id: number;
        name: string;
    };
    is_system_role: boolean;
    created_at: string;
    updated_at: string;
    permissions: Permission[];
    users: User[];
}

interface Props {
    role: Role;
}

export default function Show({ role }: Props) {
    const getLevelBadgeVariant = (level: string) => {
        switch (level) {
            case 'super_admin':
                return 'destructive';
            case 'company_admin':
                return 'default';
            case 'branch_admin':
                return 'secondary';
            case 'user':
                return 'outline';
            default:
                return 'outline';
        }
    };

    const formatLevel = (level: string) => {
        return level.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const getLevelIcon = (level: string) => {
        switch (level) {
            case 'super_admin':
                return <Shield className="h-5 w-5" />;
            case 'company_admin':
                return <Building className="h-5 w-5" />;
            case 'branch_admin':
                return <Users className="h-5 w-5" />;
            case 'user':
                return <UserIcon className="h-5 w-5" />;
            default:
                return <UserIcon className="h-5 w-5" />;
        }
    };

    return (
        <AppLayout>
            <Head title={`Role: ${role.name}`} />

            {/* Enhanced Layout Structure */}
            <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50">
                {/* Header Section */}
                <div className="bg-gradient-to-r from-sky-900 via-sky-800 to-blue-900 shadow-lg">
                    <div className="mx-auto max-w-7xl px-6 py-6">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            <div className="flex items-center gap-4">
                                {/* Back Button */}
                                <button
                                    onClick={() => window.history.back()}
                                    className="mr-2 rounded-lg bg-white/20 backdrop-blur-sm p-2 hover:bg-white/30 transition-all duration-200 border border-white/30"
                                    title="Go Back"
                                >
                                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                </button>
                                <div className="rounded-xl bg-gradient-to-br from-sky-600 to-blue-700 p-3 shadow-lg">
                                    <Shield className="h-7 w-7 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-white">
                                        Role Details
                                    </h1>
                                    <p className="text-sm text-sky-200">
                                        View role information, permissions, and assigned users
                                    </p>
                                </div>
                            </div>
                            <div className="rounded-xl bg-white/10 px-4 py-2 backdrop-blur-sm">
                                <span className="text-sm text-white font-medium">
                                    {new Date().toLocaleDateString('en-GB', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="mx-auto max-w-7xl py-8 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        {/* Stats Cards */}
                        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
                            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-sky-50 p-6 shadow-md transition-all duration-300 hover:shadow-xl border border-sky-100">
                                <div className="flex items-center">
                                    <div className="rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 p-3 shadow">
                                        <Key className="h-6 w-6 text-white" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">Total Permissions</p>
                                        <p className="text-2xl font-bold text-gray-900">{role.permissions.length}</p>
                                    </div>
                                </div>
                                <div className="absolute -right-4 -bottom-4 h-16 w-16 rounded-full bg-sky-200/20"></div>
                            </div>

                            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-sky-50 p-6 shadow-md transition-all duration-300 hover:shadow-xl border border-sky-100">
                                <div className="flex items-center">
                                    <div className="rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 p-3 shadow">
                                        <Users className="h-6 w-6 text-white" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">Assigned Users</p>
                                        <p className="text-2xl font-bold text-gray-900">{role.users.length}</p>
                                    </div>
                                </div>
                                <div className="absolute -right-4 -bottom-4 h-16 w-16 rounded-full bg-sky-200/20"></div>
                            </div>


                            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-sky-50 p-6 shadow-md transition-all duration-300 hover:shadow-xl border border-sky-100">
                                <div className="flex items-center">
                                    <div className="rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 p-3 shadow">
                                        <Database className="h-6 w-6 text-white" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">System Role</p>
                                        <p className="text-2xl font-bold text-gray-900">{role.is_system_role ? 'Yes' : 'No'}</p>
                                    </div>
                                </div>
                                <div className="absolute -right-4 -bottom-4 h-16 w-16 rounded-full bg-sky-200/20"></div>
                            </div>
                        </div>

                        {/* Main Content Card */}
                        <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-white to-sky-50 shadow-lg overflow-hidden">
                            <div className="bg-gradient-to-r from-sky-900 via-sky-800 to-blue-900 px-6 py-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">
                                            Role Information System
                                        </h3>
                                        <p className="text-sky-200 text-sm mt-1">
                                            Comprehensive role details and management
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Link
                                            href={route('roles.edit', role.id)}
                                            className="inline-flex items-center rounded-xl bg-white/20 backdrop-blur-sm px-4 py-2 text-sm font-medium text-white transition-all hover:bg-white/30 hover:shadow-lg border border-white/30"
                                        >
                                            <Edit className="mr-2 h-4 w-4" />
                                            Edit Role
                                        </Link>
                                    </div>
                                </div>
                            </div>

                            {/* Content Area */}
                            <div className="p-6">
                                {/* Role Details */}
                                <div className="mb-8 rounded-xl border border-sky-200 bg-gradient-to-r from-sky-50 to-blue-50 p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            {getLevelIcon(role.level)}
                                            <div>
                                                <h2 className="text-2xl font-bold text-gray-900">{role.name}</h2>
                                                <p className="text-gray-600 mt-1">
                                                    {role.description || 'No description provided'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Badge variant={getLevelBadgeVariant(role.level)} className="text-sm px-3 py-1">
                                                {formatLevel(role.level)}
                                            </Badge>
                                            {role.is_system_role && (
                                                <Badge variant="destructive" className="text-sm px-3 py-1">System Role</Badge>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="bg-white rounded-lg p-4 border border-sky-100">
                                            <h4 className="font-medium text-sm text-sky-900 mb-2">Role ID</h4>
                                            <p className="text-lg font-semibold text-gray-900">{role.id}</p>
                                        </div>
                                        <div className="bg-white rounded-lg p-4 border border-sky-100">
                                            <h4 className="font-medium text-sm text-sky-900 mb-2">Slug</h4>
                                            <p className="text-lg font-semibold font-mono text-gray-900">{role.slug}</p>
                                        </div>
                                        <div className="bg-white rounded-lg p-4 border border-sky-100">
                                            <h4 className="font-medium text-sm text-sky-900 mb-2">Scope</h4>
                                            {role.company ? (
                                                <div>
                                                    <p className="text-lg font-semibold text-gray-900">{role.company.name}</p>
                                                    {role.section && (
                                                        <p className="text-sm text-gray-600">{role.section.name}</p>
                                                    )}
                                                </div>
                                            ) : (
                                                <Badge variant="outline" className="text-sm">System Wide</Badge>
                                            )}
                                        </div>
                                        <div className="bg-white rounded-lg p-4 border border-sky-100">
                                            <h4 className="font-medium text-sm text-sky-900 mb-2">Created</h4>
                                            <p className="text-lg font-semibold text-gray-900">{new Date(role.created_at).toLocaleDateString('en-GB')}</p>
                                        </div>
                                        <div className="bg-white rounded-lg p-4 border border-sky-100">
                                            <h4 className="font-medium text-sm text-sky-900 mb-2">Last Updated</h4>
                                            <p className="text-lg font-semibold text-gray-900">{new Date(role.updated_at).toLocaleDateString('en-GB')}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Permissions Section */}
                                <div className="mb-8 rounded-xl border border-gray-300 bg-white shadow-sm overflow-hidden">
                                    <div className="bg-gradient-to-r from-sky-600 to-blue-600 px-6 py-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Key className="h-6 w-6 text-white" />
                                                <div>
                                                    <h3 className="text-lg font-semibold text-white">Assigned Permissions</h3>
                                                    <p className="text-sky-200 text-sm">All permissions granted to this role</p>
                                                </div>
                                            </div>
                                            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                                                {role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="p-6">
                                        {role.permissions.length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {role.permissions.map((permission) => (
                                                    <div key={permission.id} className="p-4 border border-sky-100 rounded-lg bg-gradient-to-r from-sky-50 to-blue-50 hover:from-sky-100 hover:to-blue-100 transition-all duration-200">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <h4 className="font-semibold text-gray-900">{permission.name}</h4>
                                                            <Badge variant="outline" className="text-xs">
                                                                {permission.slug}
                                                            </Badge>
                                                        </div>
                                                        {permission.description && (
                                                            <p className="text-sm text-gray-600">
                                                                {permission.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-12">
                                                <Key className="mx-auto mb-4 h-16 w-16 text-gray-400 opacity-30" />
                                                <h3 className="text-lg font-semibold text-gray-500 mb-2">
                                                    No permissions assigned
                                                </h3>
                                                <p className="text-sm text-gray-400 mb-6">
                                                    This role has no permissions assigned
                                                </p>
                                                <Link
                                                    href={route('roles.edit', role.id)}
                                                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-200 hover:from-sky-700 hover:to-blue-700 transition-all duration-200"
                                                >
                                                    <Edit className="h-5 w-5" />
                                                    Add Permissions
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Assigned Users Section */}
                                <div className="rounded-xl border border-gray-300 bg-white shadow-sm overflow-hidden">
                                    <div className="bg-gradient-to-r from-sky-600 to-blue-600 px-6 py-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Users className="h-6 w-6 text-white" />
                                                <div>
                                                    <h3 className="text-lg font-semibold text-white">Assigned Users</h3>
                                                    <p className="text-sky-200 text-sm">Users who have this role assigned</p>
                                                </div>
                                            </div>
                                            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                                                {role.users.length} user{role.users.length !== 1 ? 's' : ''}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="p-6">
                                        {role.users.length > 0 ? (
                                            <div className="max-h-[400px] overflow-y-auto">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-gradient-to-r from-sky-600 to-blue-600 text-white sticky top-0">
                                                        <tr>
                                                            <th className="px-4 py-3 text-left font-bold">Username</th>
                                                            <th className="px-4 py-3 text-left font-bold">Full Name</th>
                                                            <th className="px-4 py-3 text-left font-bold">Email</th>
                                                            <th className="px-4 py-3 text-left font-bold">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200">
                                                        {role.users.map((user) => (
                                                            <tr
                                                                key={user.id}
                                                                className="transition-colors hover:bg-gradient-to-r from-sky-50 to-blue-50 group"
                                                            >
                                                                <td className="px-4 py-3 font-medium text-gray-900">
                                                                    {user.username}
                                                                </td>
                                                                <td className="px-4 py-3 text-gray-900">
                                                                    {user.first_name} {user.last_name}
                                                                </td>
                                                                <td className="px-4 py-3 text-gray-600">
                                                                    {user.email}
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${
                                                                        user.is_active
                                                                            ? 'bg-gradient-to-r from-green-100 to-emerald-200 text-green-800 border border-green-200'
                                                                            : 'bg-gradient-to-r from-red-100 to-pink-200 text-red-800 border border-red-200'
                                                                    }`}>
                                                                        {user.is_active ? 'Active' : 'Inactive'}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="text-center py-12">
                                                <Users className="mx-auto mb-4 h-16 w-16 text-gray-400 opacity-30" />
                                                <h3 className="text-lg font-semibold text-gray-500 mb-2">
                                                    No users assigned
                                                </h3>
                                                <p className="text-sm text-gray-400 mb-6">
                                                    No users are assigned to this role
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    Users can be assigned this role when creating or editing user accounts
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Usage Information */}
                                <div className="mt-8 rounded-xl border border-sky-200 bg-gradient-to-r from-sky-50 to-blue-50 p-6">
                                    <h3 className="text-lg font-semibold text-sky-900 mb-4">Usage Information</h3>
                                    <div className="space-y-4">
                                        <div className="bg-white rounded-lg p-4 border border-sky-100">
                                            <h4 className="font-medium text-sky-900 mb-2">Code Usage</h4>
                                            <p className="text-sm text-gray-600 mb-2">
                                                To check if a user has this role:
                                            </p>
                                            <code className="block px-3 py-2 bg-gray-100 rounded text-sm font-mono text-gray-800">
                                                {`$user->hasRole('${role.slug}')`}
                                            </code>
                                        </div>
                                        <div className="bg-white rounded-lg p-4 border border-sky-100">
                                            <h4 className="font-medium text-sky-900 mb-2">Middleware Usage</h4>
                                            <p className="text-sm text-gray-600 mb-2">
                                                To protect routes with this role:
                                            </p>
                                            <code className="block px-3 py-2 bg-gray-100 rounded text-sm font-mono text-gray-800">
                                                {`Route::middleware('role:${role.slug}')`}
                                            </code>
                                        </div>
                                        <div className="bg-white rounded-lg p-4 border border-sky-100">
                                            <h4 className="font-medium text-sky-900 mb-2">Impact Summary</h4>
                                            <p className="text-sm text-gray-600">
                                                This role has {role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''} 
                                                and is assigned to {role.users.length} user{role.users.length !== 1 ? 's' : ''}.
                                            </p>
                                        </div>
                                        {role.is_system_role && (
                                            <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-lg p-4 border border-red-200">
                                                <h4 className="font-medium text-red-900 mb-2">System Role</h4>
                                                <p className="text-sm text-red-700">
                                                    This is a system role that cannot be deleted. It's essential for proper system operation.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <footer className="mt-12 border-t border-sky-200 bg-gradient-to-r from-white to-sky-50">
                    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
                            <p className="text-xs text-gray-600">© UNITEC POS System • Role Details</p>
                            <p className="text-xs text-gray-500">v1.0.0 • Professional POS Solution</p>
                        </div>
                    </div>
                </footer>
            </div>
        </AppLayout>
    );
}
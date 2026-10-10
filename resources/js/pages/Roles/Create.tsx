import React, { useState, useEffect } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import {
    ArrowLeft,
    Save,
    Search,
    Users,
    Shield,
    Key,
    Building2,
    FileText,
    Info,
    CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

// Declare route function (available globally via Ziggy)
declare function route(name: string, params?: any): string;

interface Permission {
    id: number;
    name: string;
    slug: string;
    description?: string;
}

interface Company {
    id: number;
    name: string;
}

interface Section {
    id: number;
    name: string;
}

interface FormData {
    name: string;
    slug: string;
    description: string;
    company_id: string;
    section_id: string;
    is_system_role: boolean;
    permissions: number[];
}

interface Props {
    permissions: Permission[];
    companies: Company[];
    sections: Section[];
    stats?: {
        totalRoles: number;
        systemRoles: number;
        customRoles: number;
        totalPermissions: number;
    };
}

export default function Create({ permissions, companies, sections, stats }: Props) {
    const [permissionSearch, setPermissionSearch] = useState('');
    const [selectedAll, setSelectedAll] = useState(false);

    const defaultStats = {
        totalRoles: stats?.totalRoles || 0,
        systemRoles: stats?.systemRoles || 0,
        customRoles: stats?.customRoles || 0,
        totalPermissions: permissions.length,
    };

    const { data, setData, post, processing, errors, reset } = useForm<FormData>({
        name: '',
        slug: '',
        description: '',
        company_id: '',
        section_id: '',
        is_system_role: false,
        permissions: [],
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('roles.store'), {
            onSuccess: () => {
                reset();
                toast.success('Role created successfully');
            },
            onError: (errs) => {
                const errorMessages = Object.values(errs).flat();
                errorMessages.forEach(message => {
                    toast.error(message as string);
                });
            }
        });
    };

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '_')
            .trim();
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value;
        setData('name', name);
        if (!data.slug || data.slug === generateSlug(data.name)) {
            setData('slug', generateSlug(name));
        }
    };

    const filteredPermissions = permissions.filter(permission =>
        permission.name.toLowerCase().includes(permissionSearch.toLowerCase()) ||
        permission.slug.toLowerCase().includes(permissionSearch.toLowerCase()) ||
        (permission.description && permission.description.toLowerCase().includes(permissionSearch.toLowerCase()))
    );

    const handlePermissionToggle = (permissionId: number) => {
        const newPermissions = data.permissions.includes(permissionId)
            ? data.permissions.filter(id => id !== permissionId)
            : [...data.permissions, permissionId];

        setData('permissions', newPermissions);
    };

    const handleSelectAll = () => {
        if (selectedAll) {
            setData('permissions', []);
        } else {
            setData('permissions', filteredPermissions.map(p => p.id));
        }
    };

    useEffect(() => {
        const allFilteredSelected = filteredPermissions.length > 0 &&
            filteredPermissions.every(p => data.permissions.includes(p.id));
        setSelectedAll(allFilteredSelected);
    }, [data.permissions, filteredPermissions]);

    const breadcrumbs = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Roles', href: route('roles.index') },
        { title: 'Create', href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Role" />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4">
                            <div className="flex items-center space-x-3">
                                <Link
                                    href={route('roles.index')}
                                    className="rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </Link>
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <Users className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">
                                        Create New Role
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        Define role details and assign appropriate permissions
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue p-2 shadow-sm">
                                        <Users className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">Total Roles</p>
                                        <p className="text-lg font-bold text-gray-900">{defaultStats.totalRoles}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-red-500 p-2 shadow-sm">
                                        <Shield className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">System Roles</p>
                                        <p className="text-lg font-bold text-gray-900">{defaultStats.systemRoles}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-green-500 p-2 shadow-sm">
                                        <Building2 className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">Custom Roles</p>
                                        <p className="text-lg font-bold text-gray-900">{defaultStats.customRoles}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-purple-500 p-2 shadow-sm">
                                        <Key className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">Total Perms</p>
                                        <p className="text-lg font-bold text-gray-900">{defaultStats.totalPermissions}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Form Container */}
                        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-6 py-4">
                                <h3 className="text-lg font-semibold text-white">Role Configuration</h3>
                                <p className="text-white/80 text-xs">Define basic details and select system permissions</p>
                            </div>

                            <form onSubmit={handleSubmit} className="p-8 space-y-8">
                                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">

                                    {/* Left Column - Role Details */}
                                    <div className="space-y-6">
                                        <div className="flex items-center space-x-3 mb-6">
                                            <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                                <Shield className="w-5 h-5 text-vismass-blue" />
                                            </div>
                                            <h2 className="text-xl font-semibold text-slate-800">Basic Information</h2>
                                        </div>

                                        {/* Name */}
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700 flex items-center">
                                                <Users className="w-4 h-4 mr-2 text-vismass-blue" />
                                                Role Name *
                                            </label>
                                            <input
                                                id="name"
                                                type="text"
                                                value={data.name}
                                                onChange={handleNameChange}
                                                disabled={processing}
                                                className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                placeholder="e.g., Store Manager"
                                                required
                                            />
                                            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
                                        </div>

                                        {/* Slug */}
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700 flex items-center">
                                                <FileText className="w-4 h-4 mr-2 text-vismass-blue" />
                                                Role Slug
                                            </label>
                                            <input
                                                id="slug"
                                                type="text"
                                                value={data.slug}
                                                onChange={(e) => setData('slug', e.target.value)}
                                                disabled={processing}
                                                className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                placeholder="e.g., store_manager"
                                            />
                                            {errors.slug && <p className="text-xs text-red-600 mt-1">{errors.slug}</p>}
                                        </div>

                                        {/* Description */}
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700 flex items-center">
                                                <FileText className="w-4 h-4 mr-2 text-vismass-blue" />
                                                Description
                                            </label>
                                            <textarea
                                                id="description"
                                                value={data.description}
                                                onChange={(e) => setData('description', e.target.value)}
                                                rows={3}
                                                disabled={processing}
                                                className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                placeholder="Describe the role responsibilities..."
                                            />
                                            {errors.description && <p className="text-xs text-red-600 mt-1">{errors.description}</p>}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                            {/* Company */}
                                            {companies.length > 0 && (
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-slate-700">Company (Optional)</label>
                                                    <select
                                                        value={data.company_id}
                                                        onChange={(e) => {
                                                            setData('company_id', e.target.value);
                                                            setData('section_id', '');
                                                        }}
                                                        disabled={processing}
                                                        className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                    >
                                                        <option value="">No Company (System Wide)</option>
                                                        {companies.map((c) => (
                                                            <option key={c.id} value={c.id.toString()}>{c.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                        </div>

                                        {/* System Role Checkbox */}
                                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center space-x-3">
                                            <input
                                                type="checkbox"
                                                id="is_system_role"
                                                checked={data.is_system_role}
                                                onChange={(e) => setData('is_system_role', e.target.checked)}
                                                className="w-5 h-5 rounded border-slate-300 text-vismass-blue focus:ring-vismass-blue"
                                            />
                                            <label htmlFor="is_system_role" className="text-sm font-medium text-slate-700 cursor-pointer">
                                                Mark as System Role (Protects from accidental deletion)
                                            </label>
                                        </div>
                                    </div>

                                    {/* Right Column - Permissions selection */}
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center space-x-3">
                                                <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                                    <Key className="w-5 h-5 text-vismass-blue" />
                                                </div>
                                                <h2 className="text-xl font-semibold text-slate-800">Permissions</h2>
                                            </div>
                                            <div className="px-3 py-1 bg-vismass-blue text-white text-xs font-bold rounded-full shadow-sm">
                                                {data.permissions.length} selected
                                            </div>
                                        </div>

                                        {/* Permission search & Select all */}
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Search permissions..."
                                                    value={permissionSearch}
                                                    onChange={(e) => setPermissionSearch(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                />
                                            </div>

                                            <div className="flex items-center space-x-3 border-t border-slate-200 pt-3">
                                                <input
                                                    type="checkbox"
                                                    id="select_all"
                                                    checked={selectedAll}
                                                    onChange={handleSelectAll}
                                                    className="w-4 h-4 rounded border-slate-300 text-vismass-blue focus:ring-vismass-blue"
                                                />
                                                <label htmlFor="select_all" className="text-sm font-semibold text-slate-700 cursor-pointer">
                                                    Select All ({filteredPermissions.length})
                                                </label>
                                            </div>
                                        </div>

                                        {/* Scrollable Permissions List */}
                                        <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[400px] overflow-y-auto bg-white">
                                            {filteredPermissions.length > 0 ? (
                                                filteredPermissions.map((permission) => (
                                                    <div
                                                        key={permission.id}
                                                        onClick={() => handlePermissionToggle(permission.id)}
                                                        className={`flex items-start space-x-3 p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors ${data.permissions.includes(permission.id) ? 'bg-blue-50/50' : ''
                                                            }`}
                                                    >
                                                        <div className="mt-0.5">
                                                            <input
                                                                type="checkbox"
                                                                checked={data.permissions.includes(permission.id)}
                                                                onChange={() => { }} // Controlled by outer div click
                                                                className="w-4 h-4 rounded border-slate-300 text-vismass-blue focus:ring-vismass-blue"
                                                            />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-bold text-slate-800">{permission.name}</p>
                                                            <div className="flex items-center mt-1 space-x-2">
                                                                <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                                                                    {permission.slug}
                                                                </span>
                                                            </div>
                                                            {permission.description && (
                                                                <p className="text-xs text-slate-500 mt-1 lines-clamp-2">
                                                                    {permission.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                        {data.permissions.includes(permission.id) && (
                                                            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                                                        )}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-12 text-center">
                                                    <Search className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                                    <p className="text-slate-400 text-sm">No permissions found matching "{permissionSearch}"</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Notes area */}
                                        <div className="bg-amber-50 rounded-xl border border-amber-200 p-5">
                                            <h4 className="text-sm font-semibold text-amber-800 mb-2 flex items-center">
                                                <Info className="w-4 h-4 mr-2" />
                                                Permission Matching
                                            </h4>
                                            <p className="text-xs text-amber-700 leading-relaxed">
                                                Ensure that permissions assigned to this role cover all necessary system functions.
                                                Users with this role will inherit all granted permissions immediately.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Form Actions */}
                                <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200">
                                    <Link
                                        href={route('roles.index')}
                                        className="inline-flex items-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-6 py-3 font-semibold transition-all duration-200"
                                    >
                                        Cancel
                                    </Link>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="inline-flex items-center rounded-xl bg-gradient-to-r from-vismass-blue to-vismass-grey hover:from-blue-700 hover:to-slate-700 text-white px-8 py-3 font-semibold transition-all duration-200 shadow-lg disabled:opacity-75"
                                    >
                                        {processing ? (
                                            <div className="flex items-center space-x-2">
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                <span>Creating Role...</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center space-x-2">
                                                <Save className="w-5 h-5" />
                                                <span>Create Role</span>
                                            </div>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Footer */}
                        <div className="text-center mt-8 text-slate-600">
                            <p className="text-sm">Manage system roles and access levels • Secure distribution control</p>
                        </div>
                    </div>
                </main>
            </div>
        </AppLayout>
    );
}
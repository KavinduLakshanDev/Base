import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { ArrowLeft, Save, Shield, FileText, Info, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

// Declare route function (available globally via Ziggy)
declare function route(name: string, params?: any): string;

interface FormData {
    name: string;
    slug: string;
    description: string;
}

export default function Create() {
    const { data, setData, post, processing, errors, reset } = useForm<FormData>({
        name: '',
        slug: '',
        description: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('permissions.store'), {
            onSuccess: () => {
                reset();
                toast.success('Permission created successfully');
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

        // Auto-generate slug
        if (!data.slug || data.slug === generateSlug(data.name)) {
            setData('slug', generateSlug(name));
        }
    };

    const breadcrumbs = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Permissions', href: route('permissions.index') },
        { title: 'Create', href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Permission" />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4">
                            <div className="flex items-center space-x-3">
                                <Link
                                    href={route('permissions.index')}
                                    className="rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </Link>
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <Shield className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">
                                        Create Permission
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        Add a new permission to the system
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-8 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">

                        {/* Form Container */}
                        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">

                            {/* Create Form */}
                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

                                    {/* Left Column - Permission Details */}
                                    <div className="space-y-6">
                                        {/* Section Header */}
                                        <div className="flex items-center space-x-3 mb-6">
                                            <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                                <Shield className="w-5 h-5 text-vismass-blue" />
                                            </div>
                                            <h2 className="text-xl font-semibold text-slate-800">Permission Details</h2>
                                        </div>

                                        {/* Permission Name */}
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700 flex items-center">
                                                <Shield className="w-4 h-4 mr-2 text-vismass-blue" />
                                                Permission Name *
                                            </label>
                                            <input
                                                id="name"
                                                type="text"
                                                value={data.name}
                                                onChange={handleNameChange}
                                                disabled={processing}
                                                className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                placeholder="e.g., View Users"
                                                required
                                            />
                                            {errors.name && (
                                                <div className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                                                    {errors.name}
                                                </div>
                                            )}
                                            <p className="text-xs text-slate-500">A human-readable name for the permission</p>
                                        </div>

                                        {/* Slug */}
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700 flex items-center">
                                                <FileText className="w-4 h-4 mr-2 text-vismass-blue" />
                                                Permission Slug
                                            </label>
                                            <input
                                                id="slug"
                                                type="text"
                                                value={data.slug}
                                                onChange={(e) => setData('slug', e.target.value)}
                                                disabled={processing}
                                                className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                placeholder="e.g., view_users"
                                            />
                                            {errors.slug && (
                                                <div className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                                                    {errors.slug}
                                                </div>
                                            )}
                                            <p className="text-xs text-slate-500">A unique identifier for the permission (auto-generated from name)</p>
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
                                                rows={4}
                                                disabled={processing}
                                                className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
                                                placeholder="e.g., Allows user to view the list of all users in the system"
                                            />
                                            {errors.description && (
                                                <div className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                                                    {errors.description}
                                                </div>
                                            )}
                                            <p className="text-xs text-slate-500">Optional description explaining what this permission allows</p>
                                        </div>
                                    </div>

                                    {/* Right Column - Info & Notes */}
                                    <div className="space-y-6">
                                        <div className="flex items-center space-x-3 mb-6">
                                            <div className="p-2 bg-amber-100 rounded-lg">
                                                <AlertTriangle className="w-5 h-5 text-amber-600" />
                                            </div>
                                            <h2 className="text-xl font-semibold text-slate-800">Important Notes</h2>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="bg-amber-50 rounded-xl border border-amber-200 p-5">
                                                <h4 className="text-sm font-semibold text-amber-800 mb-2 flex items-center">
                                                    <Info className="w-4 h-4 mr-2" />
                                                    Permission Slugs
                                                </h4>
                                                <p className="text-sm text-amber-700 leading-relaxed">
                                                    Permission slugs should be unique and follow a consistent naming convention.
                                                    They are used in code to check permissions.
                                                </p>
                                            </div>

                                            <div className="bg-blue-50 rounded-xl border border-blue-200 p-5">
                                                <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center">
                                                    <Shield className="w-4 h-4 mr-2" />
                                                    Role Assignment
                                                </h4>
                                                <p className="text-sm text-blue-700 leading-relaxed">
                                                    After creating this permission, you can assign it to roles in the role management section.
                                                </p>
                                            </div>

                                            <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
                                                <h4 className="text-sm font-semibold text-slate-800 mb-2">
                                                    Best Practices
                                                </h4>
                                                <ul className="text-sm text-slate-600 space-y-2 list-disc pl-4 mt-2">
                                                    <li>Use descriptive names (e.g., "Manage Users" instead of "user_stuff")</li>
                                                    <li>Include a clear description for other administrators</li>
                                                    <li>Avoid changing slugs once they are in use by code</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Form Actions */}
                                <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200">
                                    <Link
                                        href={route('permissions.index')}
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
                                                <span>Creating...</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center space-x-2">
                                                <Save className="w-5 h-5" />
                                                <span>Create Permission</span>
                                            </div>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Footer */}
                        <div className="text-center mt-8 text-slate-600">
                            <p className="text-sm">Manage your system permissions • Professional access control solutions</p>
                        </div>
                    </div>
                </main>
            </div>
        </AppLayout>
    );
}
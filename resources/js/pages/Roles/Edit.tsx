import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';

// Declare route function (available globally via Ziggy)
declare function route(name: string, params?: any): string;
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';
import { ArrowLeft, Save, Search, Users, Shield, Key, Building2 } from 'lucide-react';
import { toast } from 'sonner';

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

interface Role {
    id: number;
    name: string;
    slug: string;
    description?: string;
    level: 'super_admin' | 'company_admin' | 'branch_admin' | 'user';
    level_label?: string; // added to match backend accessor
    company_id?: number;
    section_id?: number;
    is_system_role: boolean;
    created_at: string;
    updated_at: string;
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
    role: Role;
    permissions: Permission[];
    companies: Company[];
    sections: Section[];
    selectedPermissions: number[];
}

export default function Edit({ role, permissions, companies, sections, selectedPermissions }: Props) {
    const [permissionSearch, setPermissionSearch] = useState('');
    const [selectedAll, setSelectedAll] = useState(false);

    const { data, setData, put, processing, errors } = useForm<FormData>({
        name: role.name,
        slug: role.slug,
        description: role.description || '',
        company_id: role.company_id?.toString() || '',
        section_id: role.section_id?.toString() || '',
        is_system_role: role.is_system_role,
        permissions: selectedPermissions,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('roles.update', role.id), {
            onSuccess: () => {
                toast.success('Role updated successfully');
            },
            onError: (errors) => {
                const errorMessages = Object.values(errors).flat();
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
        
        // Auto-generate slug if it matches the current generated slug pattern
        if (data.slug === generateSlug(data.name)) {
            setData('slug', generateSlug(name));
        }
    };

    const handlePermissionToggle = (permissionId: number) => {
        const newPermissions = data.permissions.includes(permissionId)
            ? data.permissions.filter(id => id !== permissionId)
            : [...data.permissions, permissionId];
        
        setData('permissions', newPermissions);
        
        // Update select all state
        setSelectedAll(newPermissions.length === filteredPermissions.length);
    };

    const handleSelectAll = () => {
        const filteredIds = filteredPermissions.map(p => p.id);
        const allFilteredSelected = filteredIds.every(id => data.permissions.includes(id));

        if (allFilteredSelected) {
            // Deselect only the currently-visible (filtered) permissions; keep the rest
            setData('permissions', data.permissions.filter(id => !filteredIds.includes(id)));
        } else {
            // Add all filtered permissions to the current selection (avoid duplicates)
            const merged = Array.from(new Set([...data.permissions, ...filteredIds]));
            setData('permissions', merged);
        }
    };

    const filteredPermissions = permissions.filter(permission =>
        permission.name.toLowerCase().includes(permissionSearch.toLowerCase()) ||
        permission.slug.toLowerCase().includes(permissionSearch.toLowerCase()) ||
        (permission.description && permission.description.toLowerCase().includes(permissionSearch.toLowerCase()))
    );

    React.useEffect(() => {
        const filteredIds = filteredPermissions.map(p => p.id);
        const allSelected =
            filteredIds.length > 0 &&
            filteredIds.every(id => data.permissions.includes(id));
        setSelectedAll(allSelected);
    }, [data.permissions, filteredPermissions]);

    return (
        <AppLayout>
            <Head title={`Edit Role: ${role.name}`} />

            <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-sky-900 via-sky-800 to-blue-900 shadow-lg">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-6">
                            <div className="flex items-center space-x-4">
                                <div className="rounded-xl bg-gradient-to-br from-sky-600 to-blue-700 p-3 shadow-lg">
                                    <Shield className="h-7 w-7 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-white">
                                        Edit Role: {role.name}
                                    </h1>
                                    <p className="text-sm text-sky-200">
                                        Modify role details and permissions
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
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-8 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        {/* Breadcrumb Navigation */}
                        <nav className="mb-6">
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                                <Link href={route('dashboard')} className="hover:text-sky-600 transition-colors">
                                    Dashboard
                                </Link>
                                <span>/</span>
                                <Link href={route('roles.index')} className="hover:text-sky-600 transition-colors">
                                    Roles
                                </Link>
                                <span>/</span>
                                <span className="text-gray-900 font-medium">Edit</span>
                            </div>
                        </nav>

                        {/* Stats Cards */}
                        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
                            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-sky-50 p-6 shadow-md transition-all duration-300 hover:shadow-xl border border-sky-100">
                                <div className="flex items-center">
                                    <div className="rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 p-3 shadow">
                                        <Users className="h-6 w-6 text-white" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">Total Roles</p>
                                        <p className="text-2xl font-bold text-gray-900">1</p>
                                    </div>
                                </div>
                                <div className="absolute -right-4 -bottom-4 h-16 w-16 rounded-full bg-sky-200/20"></div>
                            </div>

                            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-sky-50 p-6 shadow-md transition-all duration-300 hover:shadow-xl border border-sky-100">
                                <div className="flex items-center">
                                    <div className="rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 p-3 shadow">
                                        <Shield className="h-6 w-6 text-white" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">Active Roles</p>
                                        <p className="text-2xl font-bold text-gray-900">Active</p>
                                    </div>
                                </div>
                                <div className="absolute -right-4 -bottom-4 h-16 w-16 rounded-full bg-sky-200/20"></div>
                            </div>

                            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-sky-50 p-6 shadow-md transition-all duration-300 hover:shadow-xl border border-sky-100">
                                <div className="flex items-center">
                                    <div className="rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 p-3 shadow">
                                        <Key className="h-6 w-6 text-white" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">Permissions</p>
                                        <p className="text-2xl font-bold text-gray-900">{data.permissions.length}</p>
                                    </div>
                                </div>
                                <div className="absolute -right-4 -bottom-4 h-16 w-16 rounded-full bg-sky-200/20"></div>
                            </div>

                        </div>

                        {/* Current Role Info */}
                        <Card className="mb-6">
                            <CardHeader>
                                <CardTitle>Current Role Information</CardTitle>
                                <CardDescription>
                                    Created on {new Date(role.created_at).toLocaleDateString('en-GB')},
                                    last updated {new Date(role.updated_at).toLocaleDateString('en-GB')}
                                </CardDescription>
                            </CardHeader>
                        </Card>

                        <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Role Details */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Role Details</CardTitle>
                                <CardDescription>
                                    Basic information about the role
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Name */}
                                <div className="space-y-2">
                                    <Label htmlFor="name">
                                        Role Name <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="name"
                                        type="text"
                                        value={data.name}
                                        onChange={handleNameChange}
                                        placeholder="e.g., Store Manager"
                                        disabled={processing}
                                        className={errors.name ? 'border-destructive' : ''}
                                    />
                                    {errors.name && (
                                        <p className="text-sm text-destructive">{errors.name}</p>
                                    )}
                                </div>

                                {/* Slug */}
                                <div className="space-y-2">
                                    <Label htmlFor="slug">Role Slug</Label>
                                    <Input
                                        id="slug"
                                        type="text"
                                        value={data.slug}
                                        onChange={(e) => setData('slug', e.target.value)}
                                        placeholder="e.g., store_manager"
                                        disabled={processing || role.is_system_role}
                                        className={errors.slug ? 'border-destructive' : ''}
                                    />
                                    {errors.slug && (
                                        <p className="text-sm text-destructive">{errors.slug}</p>
                                    )}
                                    {role.is_system_role && (
                                        <p className="text-sm text-muted-foreground">
                                            Slug cannot be changed for system roles
                                        </p>
                                    )}
                                </div>

                                {/* Description */}
                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                        placeholder="Describe the role responsibilities..."
                                        rows={3}
                                        disabled={processing}
                                        className={errors.description ? 'border-destructive' : ''}
                                    />
                                    {errors.description && (
                                        <p className="text-sm text-destructive">{errors.description}</p>
                                    )}
                                </div>

        
                                {/* Company */}
                                {companies.length > 0 && (
                                    <div className="space-y-2">
                                        <Label htmlFor="company_id">Company</Label>
                                        <Select
                                            value={data.company_id}
                                            onValueChange={(value) => {
                                                setData('company_id', value === 'none' ? '' : value);
                                                setData('section_id', ''); // Reset section when company changes
                                            }}
                                            disabled={processing}
                                        >
                                            <SelectTrigger className={errors.company_id ? 'border-destructive' : ''}>
                                                <SelectValue placeholder="Select company (optional)" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">No Company (System Wide)</SelectItem>
                                                {companies.map((company) => (
                                                    <SelectItem key={company.id} value={company.id.toString()}>
                                                        {company.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.company_id && (
                                            <p className="text-sm text-destructive">{errors.company_id}</p>
                                        )}
                                    </div>
                                )}

                                {/* Section */}
                                {sections.length > 0 && data.company_id && (
                                    <div className="space-y-2">
                                        <Label htmlFor="section_id">Section</Label>
                                        <Select
                                            value={data.section_id}
                                            onValueChange={(value) => setData('section_id', value === 'none' ? '' : value)}
                                            disabled={processing}
                                        >
                                            <SelectTrigger className={errors.section_id ? 'border-destructive' : ''}>
                                                <SelectValue placeholder="Select section (optional)" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">No Section (Company Wide)</SelectItem>
                                                {sections.map((section) => (
                                                    <SelectItem key={section.id} value={section.id.toString()}>
                                                        {section.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.section_id && (
                                            <p className="text-sm text-destructive">{errors.section_id}</p>
                                        )}
                                    </div>
                                )}

                                {/* System Role */}
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="is_system_role"
                                        checked={data.is_system_role}
                                        onCheckedChange={(checked) => setData('is_system_role', !!checked)}
                                        disabled={processing}
                                    />
                                    <Label 
                                        htmlFor="is_system_role"
                                        className="text-sm font-normal"
                                    >
                                        System role (cannot be deleted by regular users)
                                    </Label>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Permissions */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Permissions</CardTitle>
                                        <CardDescription>
                                            Select permissions for this role
                                        </CardDescription>
                                    </div>
                                    <Badge variant="secondary">
                                        {data.permissions.length} selected
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Search */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search permissions..."
                                        value={permissionSearch}
                                        onChange={(e) => setPermissionSearch(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>

                                {/* Select All */}
                                <div className="flex items-center space-x-2 py-2 border-b">
                                    <Checkbox
                                        id="select_all"
                                        checked={selectedAll}
                                        onCheckedChange={handleSelectAll}
                                        disabled={processing || filteredPermissions.length === 0}
                                    />
                                    <Label htmlFor="select_all" className="font-medium">
                                        Select All ({filteredPermissions.length} permissions)
                                    </Label>
                                </div>

                                {/* Permissions List */}
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {filteredPermissions.length > 0 ? (
                                        filteredPermissions.map((permission) => (
                                            <div key={permission.id} className="flex items-start space-x-3 p-3 rounded-lg border">
                                                <Checkbox
                                                    id={`permission_${permission.id}`}
                                                    checked={data.permissions.includes(permission.id)}
                                                    onCheckedChange={() => handlePermissionToggle(permission.id)}
                                                    disabled={processing}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <Label 
                                                        htmlFor={`permission_${permission.id}`}
                                                        className="font-medium cursor-pointer"
                                                    >
                                                        {permission.name}
                                                    </Label>
                                                    <div className="mt-1">
                                                        <Badge variant="outline" className="text-xs">
                                                            {permission.slug}
                                                        </Badge>
                                                    </div>
                                                    {permission.description && (
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                            {permission.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8 text-muted-foreground">
                                            {permissionSearch ? 'No permissions match your search' : 'No permissions available'}
                                        </div>
                                    )}
                                </div>

                                {errors.permissions && (
                                    <p className="text-sm text-destructive">{errors.permissions}</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Actions */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex gap-3">
                                <Button 
                                    type="submit" 
                                    disabled={processing}
                                    className="min-w-[120px]"
                                >
                                    {processing ? (
                                        <>
                                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                                            Updating...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            Update Role
                                        </>
                                    )}
                                </Button>
                                <Link href={route('roles.show', role.id)}>
                                    <Button variant="outline" disabled={processing}>
                                        View Role
                                    </Button>
                                </Link>
                                <Link href={route('roles.index')}>
                                    <Button variant="outline" disabled={processing}>
                                        Cancel
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </form>

                        {/* Warning for System Roles */}
                        {role.is_system_role && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>⚠️ System Role Warning</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        This is a system role. Some properties cannot be modified to maintain system integrity.
                                        Only permissions can be updated for system roles.
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </main>
            </div>
        </AppLayout>
    );
}
import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent, useEffect, FormEventHandler } from 'react';
import { Code, Database, FileText, Save, Type, Plus, ArrowLeft } from 'lucide-react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ControlMaster {
    id: number;
    concode: string;
    conkey: string;
    conname: string;
    is_active: boolean;
}

interface Props {
    controls: ControlMaster[];
}

export default function CreateCodeMaster({ controls }: Props) {
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
            href: '/admin/code-master',
        },
        {
            title: t('Create'),
            href: '#',
        },
    ];

    const { data, setData, post, processing, errors, reset, clearErrors } =
        useForm({
            conkey: '',
            cname: '',
        });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post('/admin/code-master', {
            onSuccess: () => {
                reset();
            },
        });
    };

    // Clear errors when data changes
    useEffect(() => {
        if (data.conkey && errors.conkey) {
            clearErrors('conkey');
        }
        if (data.cname && errors.cname) {
            clearErrors('cname');
        }
    }, [data.conkey, data.cname]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Create Code Master')} />

            {/* Radiant Background */}
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 relative overflow-hidden">
                {/* Background Effects */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-transparent to-blue-600/20"></div>
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-300/30 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl"></div>

                <div className="relative z-10 p-6 max-w-4xl mx-auto">
                    {/* Navigation */}
                    <div className="mb-6">
                        <Link
                            href="/admin/code-master"
                            className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Back to Code Master</span>
                        </Link>
                    </div>

                    {/* Enhanced Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mb-4 shadow-lg shadow-blue-500/25">
                            <Plus className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-2">
                            Create Code Master
                        </h1>
                        <p className="text-blue-600/80 text-lg">
                            Add a new code master entry to your system
                        </p>
                    </div>

                    {/* Form Container with Radiant Effects */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-blue-500/10 border border-blue-200/50 p-8">
                        <form onSubmit={submit} className="space-y-8">
                            {/* Basic Information Section */}
                            <div className="space-y-6">
                                <div className="flex items-center space-x-3 mb-6">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <Code className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <h2 className="text-xl font-semibold text-gray-800">Basic Information</h2>
                                </div>

                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                    {/* Control Master Selection */}
                                    <div>
                                        <Label htmlFor="conkey" className="text-sm font-medium text-gray-700 flex items-center">
                                            <Database className="w-4 h-4 mr-2 text-blue-500" />
                                            Control Master *
                                        </Label>
                                        <Select
                                            value={data.conkey}
                                            onValueChange={(value) => setData('conkey', value)}
                                        >
                                            <SelectTrigger className="border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white/50 backdrop-blur-sm">
                                                <SelectValue placeholder="Select a Control Master" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {controls.map((control) => (
                                                    <SelectItem key={control.id} value={control.conkey}>
                                                        {control.conname} ({control.conkey})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <InputError message={errors.conkey} />
                                        <p className="mt-2 text-sm text-gray-500">
                                            Select the control category for this code (e.g., CAT for Categories, UNT for Units)
                                        </p>
                                    </div>

                                    {/* Code Name */}
                                    <div>
                                        <Label htmlFor="cname" className="text-sm font-medium text-gray-700 flex items-center">
                                            <Type className="w-4 h-4 mr-2 text-blue-500" />
                                            Code Name *
                                        </Label>
                                        <Input
                                            type="text"
                                            id="cname"
                                            value={data.cname}
                                            onChange={(e) => setData('cname', e.target.value)}
                                            className="border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white/50 backdrop-blur-sm"
                                            placeholder="Enter the code name (e.g., Rice & Grains)"
                                            maxLength={100}
                                            required
                                        />
                                        <InputError message={errors.cname} />
                                        <p className="mt-2 text-sm text-gray-500">
                                            Descriptive name for this code (maximum 100 characters)
                                        </p>
                                    </div>
                                </div>

                                {/* Auto-generated Info */}
                                {data.conkey && (
                                    <div className="mt-6 rounded-lg bg-blue-50/50 p-4 border border-blue-200/50">
                                        <h4 className="mb-2 text-sm font-medium text-blue-900">Auto-generated Information</h4>
                                        <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                                            <div>
                                                <span className="font-medium text-blue-700">Code Pattern:</span>
                                                <span className="ml-2 font-mono text-blue-800">
                                                    {data.conkey}001, {data.conkey}002, etc.
                                                </span>
                                            </div>
                                            <div>
                                                <span className="font-medium text-blue-700">Status:</span>
                                                <span className="ml-2 text-green-600">Active by default</span>
                                            </div>
                                        </div>
                                        <p className="mt-2 text-xs text-blue-600">
                                            The system will automatically generate unique code and category keys based on your selection.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Submit Button */}
                            <div className="flex justify-end pt-6 border-t border-blue-200/50">
                                <Button
                                    type="submit"
                                    disabled={processing || !data.conkey || !data.cname}
                                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-8 py-3 rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200 font-medium"
                                >
                                    {processing ? (
                                        <div className="flex items-center space-x-2">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span>Creating...</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center space-x-2">
                                            <Save className="w-5 h-5" />
                                            <span>Create Code Master</span>
                                        </div>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-8 text-blue-600/60">
                        <p className="text-sm">Add new codes to your system • Organize your data efficiently</p>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
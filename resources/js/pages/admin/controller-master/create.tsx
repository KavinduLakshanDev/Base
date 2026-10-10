import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { index } from '@/routes/admin/controller-master';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent, useEffect } from 'react';
import { Code, Database, Save, Plus, ArrowLeft } from 'lucide-react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function CreateControllerMaster() {
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
            href: index().url,
        },
        {
            title: t('Create'),
            href: '#',
        },
    ];

    const { data, setData, post, processing, errors, reset, clearErrors } =
        useForm({
            conkey: '',
            conname: '',
        });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(index().url, {
            onSuccess: () => reset(),
        });
    };

    const handleCancel = () => {
        reset();
        clearErrors();
        window.history.back();
    };

    useEffect(() => {
        if (data.conkey && errors.conkey) clearErrors('conkey');
        if (data.conname && errors.conname) clearErrors('conname');
    }, [data.conkey, data.conname]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Create Controller Master')} />

            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 via-transparent to-blue-600/10"></div>
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-300/20 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"></div>

                <div className="relative z-10 p-6 max-w-4xl mx-auto">
                    <div className="mb-6">
                        <Link
                            href={index().url}
                            className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Back to Controller Master</span>
                        </Link>
                    </div>

                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mb-4 shadow-lg shadow-blue-500/20">
                            <Plus className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-2">
                            Create Controller Master
                        </h1>
                        <p className="text-blue-600/80 text-lg">Add a new controller to your system</p>
                    </div>

                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-blue-500/10 border border-blue-200/50 p-8">
                        <form onSubmit={submit} className="space-y-8">
                            <div className="space-y-6">
                                <div className="flex items-center space-x-3 mb-6">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <Code className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <h2 className="text-xl font-semibold text-gray-800">Controller Details</h2>
                                </div>

                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                    <div>
                                        <Label htmlFor="conkey" className="text-sm font-medium text-gray-700 flex items-center">
                                            <Database className="w-4 h-4 mr-2 text-blue-500" />
                                            Control Key *
                                        </Label>
                                        <Input
                                            id="conkey"
                                            type="text"
                                            value={data.conkey}
                                            onChange={(e) => setData('conkey', e.target.value)}
                                            className="border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white/50 backdrop-blur-sm"
                                            placeholder="Enter control key (e.g., UNIT, CATEGORY)"
                                            maxLength={50}
                                            required
                                        />
                                        <InputError message={errors.conkey} />
                                        <p className="mt-2 text-sm text-gray-500">A unique uppercase key for this controller.</p>
                                    </div>

                                    <div>
                                        <Label htmlFor="conname" className="text-sm font-medium text-gray-700 flex items-center">
                                            <Code className="w-4 h-4 mr-2 text-blue-500" />
                                            Control Name *
                                        </Label>
                                        <Input
                                            id="conname"
                                            type="text"
                                            value={data.conname}
                                            onChange={(e) => setData('conname', e.target.value)}
                                            className="border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white/50 backdrop-blur-sm"
                                            placeholder="Enter control name (e.g., Units, Categories)"
                                            maxLength={100}
                                            required
                                        />
                                        <InputError message={errors.conname} />
                                        <p className="mt-2 text-sm text-gray-500">A descriptive name displayed in the system.</p>
                                    </div>
                                </div>

                                {data.conkey && (
                                    <div className="mt-6 rounded-lg bg-blue-50/50 p-4 border border-blue-200/50">
                                        <h4 className="mb-2 text-sm font-medium text-blue-900">Auto-generated Information</h4>
                                        <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                                            <div>
                                                <span className="font-medium text-blue-700">Key Pattern:</span>
                                                <span className="ml-2 font-mono text-blue-800">{data.conkey}_001, {data.conkey}_002</span>
                                            </div>
                                            <div>
                                                <span className="font-medium text-blue-700">Status:</span>
                                                <span className="ml-2 text-blue-600">Active by default</span>
                                            </div>
                                        </div>
                                        <p className="mt-2 text-xs text-blue-600">System will generate identifiers based on this key.</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end pt-6 border-t border-blue-200/50">
                                <Button
                                    type="button"
                                    onClick={handleCancel}
                                    className="mr-3 bg-white text-blue-700 border border-blue-200 hover:bg-blue-50"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={processing || !data.conkey || !data.conname}
                                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-8 py-3 rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 font-medium"
                                >
                                    {processing ? (
                                        <div className="flex items-center space-x-2">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span>Creating...</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center space-x-2">
                                            <Save className="w-5 h-5" />
                                            <span>Create Controller</span>
                                        </div>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>

                    <div className="text-center mt-8 text-blue-600/60">
                        <p className="text-sm">Add new controllers to your system • Organize your data efficiently</p>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
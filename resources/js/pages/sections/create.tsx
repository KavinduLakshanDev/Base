import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { Head, useForm, Link } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { Building2, Plus, ArrowLeft } from 'lucide-react';

export default function CreateSection() {
    const { data, setData, post, processing, errors } = useForm({
        section_code: '',
        name: '',
        section_type: 'other',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post('/sections');
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'Sections', href: '/sections' },
            { title: 'Create Section', href: '/sections/create' }
        ]}>
            <Head title="Create Section" />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow-lg">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-6">
                            <div className="flex items-center space-x-4">
                                <Link
                                    href="/sections"
                                    className="rounded-xl bg-white/20 p-3 hover:bg-white/30 transition-all duration-200"
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </Link>
                                <div className="rounded-xl bg-white/20 p-3 shadow-lg">
                                    <Plus className="h-7 w-7 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-white">
                                        Create New Section
                                    </h1>
                                    <p className="text-sm text-white/80">
                                        Add a new section to your distribution network
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-8 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-vismass-blue to-vismass-grey bg-clip-text text-transparent mb-2">
                            Create New Section
                        </h1>
                        <p className="text-slate-600 text-lg">
                            Add a new warehouse, store, or office location to your distribution network
                        </p>
                    </div>

                    {/* Form Container */}
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
                        <form onSubmit={submit} className="space-y-8">
                            {/* Basic Information Section */}
                            <div className="space-y-6">
                                <div className="flex items-center space-x-3 mb-6">
                                    <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                        <Building2 className="w-5 h-5 text-vismass-blue" />
                                    </div>
                                    <h2 className="text-xl font-semibold text-slate-800">Basic Information</h2>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="section_code" className="text-sm font-medium text-slate-700 flex items-center">
                                            <Building2 className="w-4 h-4 mr-2 text-vismass-blue" />
                                            Section Code *
                                        </Label>
                                        <Input
                                            id="section_code"
                                            value={data.section_code}
                                            onChange={(e) => setData('section_code', e.target.value)}
                                            required
                                            className="border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20"
                                            placeholder="e.g., WH001, ST001"
                                        />
                                        <InputError message={errors.section_code} />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="name" className="text-sm font-medium text-slate-700 flex items-center">
                                            <Building2 className="w-4 h-4 mr-2 text-vismass-blue" />
                                            Section Name *
                                        </Label>
                                        <Input
                                            id="name"
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            required
                                            className="border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20"
                                            placeholder="e.g., Main Warehouse, Downtown Store"
                                        />
                                        <InputError message={errors.name} />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="section_type" className="text-sm font-medium text-slate-700 flex items-center">
                                            <Building2 className="w-4 h-4 mr-2 text-vismass-blue" />
                                            Section Type
                                        </Label>
                                        <Select
                                            value={data.section_type}
                                            onValueChange={(value) => setData('section_type', value)}
                                        >
                                            <SelectTrigger className="border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20">
                                                <SelectValue placeholder="Select section type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="warehouse">🏭 Warehouse</SelectItem>
                                                <SelectItem value="store">🏪 Store</SelectItem>
                                                <SelectItem value="office">🏢 Office</SelectItem>
                                                <SelectItem value="other">📍 Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <InputError message={errors.section_type} />
                                    </div>
                                </div>
                            </div>



                            {/* Submit Button */}
                            <div className="flex justify-end pt-6 border-t border-slate-200">
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="bg-vismass-blue hover:bg-vismass-blue/90 text-white px-8 py-3 rounded-xl shadow-lg transition-all duration-200 font-medium"
                                >
                                    {processing ? (
                                        <div className="flex items-center space-x-2">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span>Creating Section...</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center space-x-2">
                                            <Plus className="w-5 h-5" />
                                            <span>Create Section</span>
                                        </div>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-8 text-slate-600">
                        <p className="text-sm">Build your distribution network • Manage your locations efficiently</p>
                    </div>
                </main>
            </div>
        </AppLayout>
    );
}

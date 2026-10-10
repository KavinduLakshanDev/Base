import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { Route, Plus, MapPin, Truck, FileText, ArrowLeft } from 'lucide-react';

export default function CreateRoute({ salesReps = [] }: { salesReps?: any[] }) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        areas: [] as string[],
        description: '',
        user_ids: [] as string[],
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post('/deliveries/routes');
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'Delivery Routes', href: '/deliveries/routes' },
            { title: 'Create Route', href: '/deliveries/routes/create' }
        ]}>
            <Head title="Create Delivery Route" />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4">
                            <div className="flex items-center space-x-3">
                                <button
                                    onClick={() => window.history.back()}
                                    className="rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </button>
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <Plus className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">
                                        Create New Delivery Route
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        Define a new delivery route to optimize your distribution network
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-8 sm:px-6 lg:px-8">
                    {/* Form Container */}
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
                        <form onSubmit={submit} className="space-y-8">
                            {/* Route Information Section */}
                            <div className="space-y-6">
                                <div className="flex items-center space-x-3 mb-6">
                                    <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                        <Route className="w-5 h-5 text-vismass-blue" />
                                    </div>
                                    <h2 className="text-xl font-semibold text-slate-800">Route Information</h2>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 flex items-center">
                                            <Route className="w-4 h-4 mr-2 text-vismass-blue" />
                                            Route Name *
                                        </label>
                                        <input
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            required
                                            className="block w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none"
                                            placeholder="e.g., Colombo North Route, Western Province Route"
                                        />
                                        <InputError message={errors.name} />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 flex items-center">
                                            <MapPin className="w-4 h-4 mr-2 text-vismass-blue" />
                                            Service Areas *
                                        </label>
                                        <textarea
                                            value={data.areas.join(', ')}
                                            onChange={(e) => setData('areas', e.target.value.split(',').map(s => s.trim()))}
                                            required
                                            className="block w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none resize-none min-h-[100px]"
                                            placeholder="e.g., Colombo 1, Pettah, Fort, Slave Island"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Enter areas separated by commas</p>
                                        <InputError message={errors.areas} />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 flex items-center">
                                            <FileText className="w-4 h-4 mr-2 text-vismass-blue" />
                                            Description
                                        </label>
                                        <textarea
                                            value={data.description}
                                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setData('description', e.target.value)}
                                            className="block w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none resize-none min-h-[100px]"
                                            placeholder="Optional description of the route coverage, delivery schedule, or special notes..."
                                        />
                                        <InputError message={errors.description} />
                                    </div>

                                    {/* Assign Sales Reps */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 flex items-center">
                                            <Truck className="w-4 h-4 mr-2 text-vismass-blue" />
                                            Assign Sales Reps
                                        </label>
                                        <select
                                            multiple
                                            value={data.user_ids}
                                            onChange={(e) => setData('user_ids', Array.from(e.target.selectedOptions).map(o => o.value))}
                                            className="block w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-vismass-blue focus:ring-vismass-blue/20 focus:outline-none h-32"
                                        >
                                            {salesReps.length === 0 && <option value="" disabled>No sales reps available</option>}
                                            {salesReps.map((rep) => (
                                                <option key={rep.id} value={String(rep.id)}>{rep.first_name} {rep.last_name}</option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-gray-500 mt-1">Select one or more sales representatives to assign to this route.</p>
                                        <InputError message={errors.user_ids} />
                                    </div>
                                </div>
                            </div>

                            {/* Submit Section */}
                            <div className="pt-6 border-t border-slate-200">
                                <div className="flex flex-col sm:flex-row gap-4 justify-end">
                                    <button
                                        type="button"
                                        onClick={() => window.history.back()}
                                        className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="rounded-lg bg-vismass-blue hover:bg-vismass-blue/90 text-white px-6 py-3 text-sm font-medium disabled:opacity-50 focus:outline-none transition-colors"
                                    >
                                        {processing ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                Creating Route...
                                            </>
                                        ) : (
                                            <>
                                                <Truck className="w-4 h-4 mr-2" />
                                                Create Delivery Route
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Additional Info Card */}
                    <div className="mt-8 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 backdrop-blur-sm rounded-xl border border-blue-200/50 p-6 shadow-lg shadow-blue-500/10">
                        <div className="flex items-start space-x-4">
                            <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                                <Truck className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">Route Planning Tips</h3>
                                <ul className="text-sm text-gray-600 space-y-1">
                                    <li>• Define clear geographical boundaries for efficient delivery coverage</li>
                                    <li>• Consider traffic patterns and delivery time windows</li>
                                    <li>• Group areas with similar delivery volumes for optimal routing</li>
                                    <li>• Include backup routes for peak hours or road closures</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </AppLayout>
    );
}
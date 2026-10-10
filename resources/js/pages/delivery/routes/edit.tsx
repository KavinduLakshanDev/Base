import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { Head, useForm, Link } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { Truck, Edit, MapPin, Save, ArrowLeft, FileText } from 'lucide-react';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';

interface DeliveryRoute {
    id: number;
    name: string;
    areas: string[] | null;
    description: string | null;
    is_active: boolean;
    company_code: string;
}

interface Props {
    route: DeliveryRoute;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: t('Dashboard'), href: '/dashboard' },
    { title: t('Delivery Routes'), href: '/deliveries/routes' },
    { title: t('Edit Delivery Route'), href: '#' },
];

export default function EditRoute({ route, salesReps = [], assignedUserIds = [] }: Props & { salesReps?: any[]; assignedUserIds?: number[] }) {
    const { data, setData, put, processing, errors } = useForm({
        name: route.name,
        areas: route.areas || [],
        description: route.description || '',
        user_ids: assignedUserIds.map(String),
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(`/deliveries/routes/${route.id}`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Edit Delivery Route')} />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4">
                            <div className="flex items-center space-x-3">
                                <Link
                                    href={`/deliveries/routes/${route.id}`}
                                    className="rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </Link>
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <Edit className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">
                                        {t('Edit Delivery Route')}
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        {route.name}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>


                <div className="relative z-10 p-6 max-w-7xl mx-auto">


                    {/* Compact intro (moved hero) */}
                    {/* <div className="mb-6">
                        <div className="flex items-center gap-4">
                            <div className="inline-flex items-center justify-center w-12 h-12 bg-vismass-blue/10 rounded-full">
                                <Edit className="w-6 h-6 text-vismass-blue" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-slate-800">{t('Edit Delivery Route')}</h2>
                                <p className="text-sm text-slate-500">{t('Update information for')} <span className="font-semibold text-slate-700">{route.name}</span></p>
                            </div>
                        </div>
                    </div> */}

                    {/* Form Container with Radiant Effects */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-blue-500/10 border border-blue-200/50 p-8">
                        <form onSubmit={submit} className="space-y-8">
                            {/* Route Information Section */}
                            <div className="space-y-6">
                                <div className="flex items-center space-x-3 mb-6">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <Truck className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <h2 className="text-xl font-semibold text-gray-800">Route Information</h2>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label htmlFor="name" className="text-sm font-medium text-slate-700 flex items-center">
                                            <Truck className="w-4 h-4 mr-2 text-vismass-blue" />
                                            {t('Route Name')} *
                                        </label>
                                        <Input
                                            id="name"
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            required
                                            className="border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white/50 backdrop-blur-sm"
                                            placeholder="e.g., Colombo North Route, Western Province Route"
                                        />
                                        <InputError message={errors.name} />
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="areas" className="text-sm font-medium text-slate-700 flex items-center">
                                            <MapPin className="w-4 h-4 mr-2 text-vismass-blue" />
                                            {t('Service Areas')} *
                                        </label>
                                        <Textarea
                                            id="areas"
                                            value={data.areas.join(', ')}
                                            onChange={(e) => setData('areas', e.target.value.split(',').map(s => s.trim()))}
                                            required
                                            className="border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white/50 backdrop-blur-sm min-h-[100px]"
                                            placeholder="e.g., Colombo 1, Pettah, Fort, Slave Island"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Enter areas separated by commas</p>
                                        <InputError message={errors.areas} />
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="description" className="text-sm font-medium text-slate-700 flex items-center">
                                            <FileText className="w-4 h-4 mr-2 text-vismass-blue" />
                                            {t('Description')}
                                        </label>
                                        <Textarea
                                            id="description"
                                            value={data.description}
                                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setData('description', e.target.value)}
                                            className="border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 bg-white/50 backdrop-blur-sm min-h-[100px]"
                                            placeholder="Optional description of the route coverage, delivery schedule, or special notes..."
                                        />
                                        <InputError message={errors.description} />
                                    </div>

                                    {/* Assign Sales Reps */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 flex items-center">
                                            <Truck className="w-4 h-4 mr-2 text-vismass-blue" />
                                            {t('Assign Sales Reps')}
                                        </label>
                                        <select
                                            multiple
                                            value={data.user_ids}
                                            onChange={(e) => setData('user_ids', Array.from(e.target.selectedOptions).map(o => o.value))}
                                            className="block w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-vismass-blue focus:outline-none h-32"
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
                            <div className="pt-6 border-t border-blue-200/50">
                                <div className="flex flex-col sm:flex-row gap-4 justify-end">
                                    <Link
                                        href={`/deliveries/routes/${route.id}`}
                                        className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 px-6 py-3 rounded-xl font-medium transition-colors inline-flex items-center justify-center"
                                    >
                                        Cancel
                                    </Link>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="inline-flex items-center rounded-xl bg-vismass-blue hover:bg-vismass-blue/90 text-white px-8 py-3 font-semibold transition-all duration-200 shadow-lg"
                                    >
                                        {processing ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                <span>{t('Updating Route...')}</span>
                                            </>
                                        ) : (
                                            <>
                                                <Save className="mr-2 h-4 w-4" />
                                                <span>{t('Update Route')}</span>
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
                </div>
            </div>
        </AppLayout>
    );
}
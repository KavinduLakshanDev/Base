import AppLayout from '@/layouts/app-layout';
import InputError from '@/components/input-error';
import { Head, useForm } from '@inertiajs/react';
import { Car, ArrowLeft } from 'lucide-react';
import { FormEventHandler } from 'react';

export default function VehicleEdit({ vehicle, salesReps }: { vehicle: any; salesReps: any[] }) {
    const { data, setData, put, processing, errors } = useForm({
        name: vehicle.name ?? '',
        registration_no: vehicle.registration_no ?? '',
        assigned_user_id: vehicle.assigned_user_id ? String(vehicle.assigned_user_id) : '',
        is_active: vehicle.is_active ? '1' : '0',
        notes: vehicle.notes ?? '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(`/deliveries/vehicles/${vehicle.id}`);
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'Vehicles', href: '/deliveries/vehicles' },
            { title: 'Edit Vehicle', href: `/deliveries/vehicles/${vehicle.id}/edit` },
        ]}>
            <Head title="Edit Vehicle" />

            <div className="min-h-screen bg-slate-50">
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center space-x-3 py-4">
                            <button onClick={() => window.history.back()} className="rounded-lg bg-white/20 p-2 hover:bg-white/30 transition">
                                <ArrowLeft className="h-5 w-5 text-white" />
                            </button>
                            <div className="rounded-lg bg-white/20 p-2 shadow">
                                <Car className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">Edit Vehicle</h1>
                                <p className="text-xs text-white/80">{vehicle.name}</p>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-2xl py-8 px-4 sm:px-6 lg:px-8">
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
                        <form onSubmit={submit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Vehicle Name *</label>
                                <input
                                    type="text"
                                    value={data.name}
                                    onChange={e => setData('name', e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-vismass-blue focus:outline-none focus:ring-1 focus:ring-vismass-blue"
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Registration Number</label>
                                <input
                                    type="text"
                                    value={data.registration_no}
                                    onChange={e => setData('registration_no', e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-vismass-blue focus:outline-none focus:ring-1 focus:ring-vismass-blue"
                                />
                                <InputError message={errors.registration_no} />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Assigned Sales Rep</label>
                                <select
                                    value={data.assigned_user_id}
                                    onChange={e => setData('assigned_user_id', e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-vismass-blue focus:outline-none focus:ring-1 focus:ring-vismass-blue"
                                >
                                    <option value="">— Unassigned —</option>
                                    {salesReps.map(rep => (
                                        <option
                                            key={rep.id}
                                            value={rep.id}
                                            disabled={Boolean(rep.assigned_vehicle_id) && rep.assigned_vehicle_id !== vehicle.assigned_user_id}
                                        >
                                            {rep.first_name} {rep.last_name}{rep.assigned_vehicle_name && rep.assigned_vehicle_id !== vehicle.assigned_user_id ? ` — assigned to ${rep.assigned_vehicle_name}` : ''}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">If a sales rep is already assigned to another vehicle, they are disabled here (you may keep the current assignment).</p>
                                <InputError message={errors.assigned_user_id} />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Status</label>
                                <select
                                    value={data.is_active}
                                    onChange={e => setData('is_active', e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-vismass-blue focus:outline-none focus:ring-1 focus:ring-vismass-blue"
                                >
                                    <option value="1">Active</option>
                                    <option value="0">Inactive</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Notes</label>
                                <textarea
                                    value={data.notes}
                                    onChange={e => setData('notes', e.target.value)}
                                    rows={3}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-vismass-blue focus:outline-none focus:ring-1 focus:ring-vismass-blue"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="flex-1 rounded-lg bg-vismass-blue px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-vismass-blue/90 disabled:opacity-60 transition"
                                >
                                    {processing ? 'Saving...' : 'Update Vehicle'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => window.history.back()}
                                    className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </main>
            </div>
        </AppLayout>
    );
}

import AppLayout from '@/layouts/app-layout';
import InputError from '@/components/input-error';
import { Head, useForm } from '@inertiajs/react';
import { Car, ArrowLeft } from 'lucide-react';
import { FormEventHandler } from 'react';

export default function VehicleCreate({ salesReps }: { salesReps: any[] }) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        registration_no: '',
        assigned_user_id: salesReps.length > 0 ? String(salesReps[0].id) : '',
        notes: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post('/deliveries/vehicles');
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'Vehicles', href: '/deliveries/vehicles' },
            { title: 'Add Vehicle', href: '/deliveries/vehicles/create' },
        ]}>
            <Head title="Add Vehicle" />

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
                                <h1 className="text-xl font-bold text-white">Add Vehicle</h1>
                                <p className="text-xs text-white/80">Register a new delivery vehicle</p>
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
                                    placeholder="e.g. Delivery Van 1"
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
                                    placeholder="e.g. ABC-1234"
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
                                            disabled={Boolean(rep.assigned_vehicle_id)}
                                        >
                                            {rep.first_name} {rep.last_name}{rep.assigned_vehicle_name ? ` — assigned to ${rep.assigned_vehicle_name}` : ''}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">Already-assigned sales reps are disabled here — unassign in the vehicle they belong to first.</p>
                                <InputError message={errors.assigned_user_id} />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Notes</label>
                                <textarea
                                    value={data.notes}
                                    onChange={e => setData('notes', e.target.value)}
                                    rows={3}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-vismass-blue focus:outline-none focus:ring-1 focus:ring-vismass-blue"
                                    placeholder="Optional notes..."
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="flex-1 rounded-lg bg-vismass-blue px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-vismass-blue/90 disabled:opacity-60 transition"
                                >
                                    {processing ? 'Saving...' : 'Save Vehicle'}
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

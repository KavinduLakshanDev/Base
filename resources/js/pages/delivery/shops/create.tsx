import AppLayout from '@/layouts/app-layout';
import InputError from '@/components/input-error';
import { Head, useForm } from '@inertiajs/react';
import { Store, ArrowLeft } from 'lucide-react';
import { FormEventHandler } from 'react';

export default function ShopCreate({ routes = [] }: { routes?: any[] }) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        first_name: '',
        last_name: '',
        br_number: '',
        tin_number: '',
        address_line_1: '',
        address_line_2: '',
        locality: '',
        city: '',
        contact_phone: '',
        phone_2: '',
        email: '',
        current_balance: '0',
        credit_limit: '0',
        delivery_route_id: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post('/deliveries/shops');
    };

    return (
        <AppLayout breadcrumbs={[
            { title: 'Shops', href: '/deliveries/shops' },
            { title: 'Add Shop', href: '/deliveries/shops/create' },
        ]}>
            <Head title="Add Shop" />

            <div className="min-h-screen bg-slate-50">
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center space-x-3 py-4">
                            <button onClick={() => window.history.back()} className="rounded-lg bg-white/20 p-2 hover:bg-white/30 transition">
                                <ArrowLeft className="h-5 w-5 text-white" />
                            </button>
                            <div className="rounded-lg bg-white/20 p-2 shadow">
                                <Store className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">Shop Registration</h1>
                                <p className="text-xs text-white/80">Register a new shop location</p>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-4xl py-8 px-4 sm:px-6 lg:px-8">
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 sm:p-8">
                        <form onSubmit={submit} className="space-y-8">
                            
                            {/* Primary Details */}
                            <div>
                                <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2 mb-4">Primary Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Shop Name *</label>
                                        <input
                                            type="text"
                                            value={data.name}
                                            onChange={e => setData('name', e.target.value)}
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-vismass-blue focus:outline-none focus:ring-1 focus:ring-vismass-blue"
                                            placeholder="e.g. Main Street Shop"
                                            required
                                        />
                                        <InputError message={errors.name} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Delivery Route *</label>
                                        <select
                                            value={data.delivery_route_id}
                                            onChange={e => setData('delivery_route_id', e.target.value)}
                                            required
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-vismass-blue focus:outline-none focus:ring-1 focus:ring-vismass-blue"
                                        >
                                            <option value="">Select a route</option>
                                            {routes.map((r: any) => (
                                                <option key={r.id} value={r.id}>{r.name}</option>
                                            ))}
                                        </select>
                                        <InputError message={errors.delivery_route_id} />
                                    </div>
                                </div>
                            </div>

                            {/* Contact Person */}
                            <div>
                                <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2 mb-4">Contact Person</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">First Name</label>
                                        <input
                                            type="text"
                                            value={data.first_name}
                                            onChange={e => setData('first_name', e.target.value)}
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-vismass-blue focus:outline-none focus:ring-1 focus:ring-vismass-blue"
                                            placeholder="John"
                                        />
                                        <InputError message={errors.first_name} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Last Name</label>
                                        <input
                                            type="text"
                                            value={data.last_name}
                                            onChange={e => setData('last_name', e.target.value)}
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-vismass-blue focus:outline-none focus:ring-1 focus:ring-vismass-blue"
                                            placeholder="Doe"
                                        />
                                        <InputError message={errors.last_name} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Contact Phone 1</label>
                                        <input
                                            type="tel"
                                            value={data.contact_phone}
                                            onChange={e => {
                                                const val = e.target.value;
                                                if (/^\d{0,10}$/.test(val)) setData('contact_phone', val);
                                            }}
                                            maxLength={10}
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-vismass-blue focus:outline-none focus:ring-1 focus:ring-vismass-blue"
                                            placeholder="0770235698"
                                        />
                                        <InputError message={errors.contact_phone} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Contact Phone 2</label>
                                        <input
                                            type="tel"
                                            value={data.phone_2}
                                            onChange={e => {
                                                const val = e.target.value;
                                                if (/^\d{0,10}$/.test(val)) setData('phone_2', val);
                                            }}
                                            maxLength={10}
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-vismass-blue focus:outline-none focus:ring-1 focus:ring-vismass-blue"
                                            placeholder="0770235699"
                                        />
                                        <InputError message={errors.phone_2} />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-sm font-medium text-slate-700">Email Address</label>
                                        <input
                                            type="email"
                                            value={data.email}
                                            onChange={e => setData('email', e.target.value)}
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-vismass-blue focus:outline-none focus:ring-1 focus:ring-vismass-blue"
                                            placeholder="shop@example.com"
                                        />
                                        <InputError message={errors.email} />
                                    </div>
                                </div>
                            </div>

                            {/* Address */}
                            <div>
                                <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2 mb-4">Address Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Address Line 1</label>
                                        <input
                                            type="text"
                                            value={data.address_line_1}
                                            onChange={e => setData('address_line_1', e.target.value)}
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-vismass-blue focus:outline-none focus:ring-1 focus:ring-vismass-blue"
                                            placeholder="123 Main St"
                                        />
                                        <InputError message={errors.address_line_1} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Address Line 2</label>
                                        <input
                                            type="text"
                                            value={data.address_line_2}
                                            onChange={e => setData('address_line_2', e.target.value)}
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-vismass-blue focus:outline-none focus:ring-1 focus:ring-vismass-blue"
                                            placeholder="Apt 4B"
                                        />
                                        <InputError message={errors.address_line_2} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Locality / Village</label>
                                        <input
                                            type="text"
                                            value={data.locality}
                                            onChange={e => setData('locality', e.target.value)}
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-vismass-blue focus:outline-none focus:ring-1 focus:ring-vismass-blue"
                                            placeholder="Downtown"
                                        />
                                        <InputError message={errors.locality} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Postal Town / City</label>
                                        <input
                                            type="text"
                                            value={data.city}
                                            onChange={e => setData('city', e.target.value)}
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-vismass-blue focus:outline-none focus:ring-1 focus:ring-vismass-blue"
                                            placeholder="Colombo"
                                        />
                                        <InputError message={errors.city} />
                                    </div>
                                </div>
                            </div>

                            {/* Business & Financial */}
                            <div>
                                <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2 mb-4">Business & Financial Info</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">BR Number</label>
                                        <input
                                            type="text"
                                            value={data.br_number}
                                            onChange={e => setData('br_number', e.target.value)}
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-vismass-blue focus:outline-none focus:ring-1 focus:ring-vismass-blue"
                                            placeholder="BR-XXXXXX"
                                        />
                                        <InputError message={errors.br_number} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">TIN Number</label>
                                        <input
                                            type="text"
                                            value={data.tin_number}
                                            onChange={e => setData('tin_number', e.target.value)}
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-vismass-blue focus:outline-none focus:ring-1 focus:ring-vismass-blue"
                                            placeholder="TIN-XXXXXX"
                                        />
                                        <InputError message={errors.tin_number} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Current Balance (Rs.)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={data.current_balance}
                                            onChange={e => setData('current_balance', e.target.value)}
                                            readOnly
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-vismass-blue focus:outline-none focus:ring-1 focus:ring-vismass-blue bg-slate-100 cursor-not-allowed text-slate-500"
                                            placeholder="0.00"
                                        />
                                        <InputError message={errors.current_balance} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Credit Limit (Rs.)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={data.credit_limit}
                                            onChange={e => setData('credit_limit', e.target.value)}
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-vismass-blue focus:outline-none focus:ring-1 focus:ring-vismass-blue"
                                            placeholder="0.00"
                                        />
                                        <InputError message={errors.credit_limit} />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-200">
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="flex-1 md:flex-none md:w-48 rounded-lg bg-vismass-blue px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-vismass-blue/90 disabled:opacity-60 transition"
                                >
                                    {processing ? 'Saving...' : 'Save Shop'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => window.history.back()}
                                    className="flex-1 md:flex-none md:w-32 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
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

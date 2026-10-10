import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { Store, ArrowLeft, Pencil } from 'lucide-react';

export default function ShopShow({ shop }: { shop: any }) {
    return (
        <AppLayout breadcrumbs={[
            { title: 'Shops', href: '/deliveries/shops' },
            { title: 'View Shop', href: `/deliveries/shops/${shop.id}` },
        ]}>
            <Head title="View Shop" />

            <div className="min-h-screen bg-slate-50">
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4">
                            <div className="flex items-center space-x-3">
                                <button onClick={() => window.history.back()} className="rounded-lg bg-white/20 p-2 hover:bg-white/30 transition">
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </button>
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <Store className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">View Shop</h1>
                                    <p className="text-xs text-white/80">{shop.name}</p>
                                </div>
                            </div>
                            <div>
                                <Link
                                    href={`/deliveries/shops/${shop.id}/edit`}
                                    className="inline-flex items-center rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/30 transition"
                                >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit Shop
                                </Link>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-4xl py-8 px-4 sm:px-6 lg:px-8">
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                        
                        <div className="p-6 sm:p-8 space-y-8">
                            
                            {/* Primary Details */}
                            <div>
                                <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-4">
                                    <h3 className="text-lg font-semibold text-slate-800">Primary Details</h3>
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${shop.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {shop.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                    <div>
                                        <dt className="text-sm font-medium text-slate-500">Shop Name</dt>
                                        <dd className="mt-1 text-sm text-slate-900">{shop.name || '-'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-slate-500">Delivery Route</dt>
                                        <dd className="mt-1 text-sm text-slate-900">{shop.delivery_route?.name || '-'}</dd>
                                    </div>
                                </dl>
                            </div>

                            {/* Contact Person */}
                            <div>
                                <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2 mb-4">Contact Person</h3>
                                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                    <div>
                                        <dt className="text-sm font-medium text-slate-500">First Name</dt>
                                        <dd className="mt-1 text-sm text-slate-900">{shop.first_name || '-'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-slate-500">Last Name</dt>
                                        <dd className="mt-1 text-sm text-slate-900">{shop.last_name || '-'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-slate-500">Contact Phone 1</dt>
                                        <dd className="mt-1 text-sm text-slate-900">{shop.contact_phone || '-'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-slate-500">Contact Phone 2</dt>
                                        <dd className="mt-1 text-sm text-slate-900">{shop.phone_2 || '-'}</dd>
                                    </div>
                                    <div className="md:col-span-2">
                                        <dt className="text-sm font-medium text-slate-500">Email Address</dt>
                                        <dd className="mt-1 text-sm text-slate-900">{shop.email || '-'}</dd>
                                    </div>
                                </dl>
                            </div>

                            {/* Address Information */}
                            <div>
                                <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2 mb-4">Address Information</h3>
                                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                    <div>
                                        <dt className="text-sm font-medium text-slate-500">Address Line 1</dt>
                                        <dd className="mt-1 text-sm text-slate-900">{shop.address_line_1 || '-'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-slate-500">Address Line 2</dt>
                                        <dd className="mt-1 text-sm text-slate-900">{shop.address_line_2 || '-'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-slate-500">Locality / Village</dt>
                                        <dd className="mt-1 text-sm text-slate-900">{shop.locality || '-'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-slate-500">Postal Town / City</dt>
                                        <dd className="mt-1 text-sm text-slate-900">{shop.city || '-'}</dd>
                                    </div>
                                    <div className="md:col-span-2">
                                        <dt className="text-sm font-medium text-slate-500">Full Address (Legacy)</dt>
                                        <dd className="mt-1 text-sm text-slate-900">{shop.address || '-'}</dd>
                                    </div>
                                </dl>
                            </div>

                            {/* Business & Financial Info */}
                            <div>
                                <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-2 mb-4">Business & Financial Info</h3>
                                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                    <div>
                                        <dt className="text-sm font-medium text-slate-500">BR Number</dt>
                                        <dd className="mt-1 text-sm text-slate-900">{shop.br_number || '-'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-slate-500">TIN Number</dt>
                                        <dd className="mt-1 text-sm text-slate-900">{shop.tin_number || '-'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-slate-500">Current Balance (Rs.)</dt>
                                        <dd className={`mt-1 text-sm font-medium ${Number(shop.current_balance) > 0 ? 'text-red-600' : (Number(shop.current_balance) < 0 ? 'text-green-600' : 'text-slate-900')}`}>
                                            {Number(shop.current_balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm font-medium text-slate-500">Credit Limit (Rs.)</dt>
                                        <dd className="mt-1 text-sm text-slate-900">{Number(shop.credit_limit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</dd>
                                    </div>
                                </dl>
                            </div>

                        </div>
                    </div>
                </main>
            </div>
        </AppLayout>
    );
}

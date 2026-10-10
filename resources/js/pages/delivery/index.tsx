import AppLayout from '@/layouts/app-layout';
import { Head, router, Link } from '@inertiajs/react';
import { Truck, Plus, Eye, Edit, Trash, ArrowLeft, Search, Filter, CheckCircle2, Clock } from 'lucide-react';
import { useMemo, useState } from 'react';

export default function DeliveryIndex({ deliveries, routes, salesReps }: { deliveries: any[], routes: any[], salesReps: any[] }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');

    const deliveredCount = deliveries.filter(d => d.status === 'delivered').length;
    const deliveringCount = deliveries.filter(d => d.status === 'delivering').length;
    const assignedCount = deliveries.filter(d => d.status === 'assigned').length;
    const filteredDeliveries = useMemo(() => {
        return deliveries.filter((delivery) => {
            const matchesStatus = statusFilter === 'all' ? true : delivery.status === statusFilter;
            const matchesPaymentStatus = paymentStatusFilter === 'all' ? true : delivery.payment_status === paymentStatusFilter;
            const query = searchTerm.toLowerCase();
            const matchesSearch = !query
                || (delivery.delivery_number || '').toLowerCase().includes(query)
                || (delivery.customer_name || '').toLowerCase().includes(query)
                || (delivery.customer_phone || '').toLowerCase().includes(query)
                || (delivery.shop?.name || '').toLowerCase().includes(query)
                || (delivery.delivery_route?.name || '').toLowerCase().includes(query)
                || (delivery.deliveryRoute?.name || '').toLowerCase().includes(query);
            return matchesStatus && matchesPaymentStatus && matchesSearch;
        });
    }, [deliveries, searchTerm, statusFilter, paymentStatusFilter]);

    const updateStatus = (deliveryId: number, status: string) => {
        router.patch(`/deliveries/${deliveryId}/status`, { status });
    };

    const deleteDelivery = (deliveryId: number, deliveryNumber: string) => {
        if (confirm(`Are you sure you want to delete delivery ${deliveryNumber}? This will restore stock.`)) {
            router.delete(`/deliveries/${deliveryId}`);
        }
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Deliveries', href: '/deliveries' }]}>
            <Head title="Delivery Management - POS System" />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4 gap-3">
                            <div className="flex items-center space-x-3 min-w-0">
                                <button
                                    onClick={() => window.history.back()}
                                    className="shrink-0 rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                    title="Go Back"
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </button>
                                <div className="shrink-0 rounded-lg bg-white/20 p-2 shadow">
                                    <Truck className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-lg sm:text-xl font-bold text-white truncate">
                                        Delivery Management
                                    </h1>
                                    <p className="text-xs text-white/80 hidden sm:block">
                                        Manage and track all delivery operations
                                    </p>
                                </div>
                            </div>
                            <Link
                                href="/deliveries/create"
                                className="shrink-0 inline-flex items-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                            >
                                <Plus className="h-4 w-4 sm:mr-1.5" />
                                <span className="hidden sm:inline">Assign Delivery</span>
                            </Link>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    {/* Quick Stats */}
                    <div className="px-4 sm:px-0 mb-4">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue p-2 shadow-sm">
                                        <Truck className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">Total Deliveries</p>
                                        <p className="text-lg sm:text-xl font-bold text-gray-900">{deliveries.length}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-yellow-500 p-2 shadow-sm">
                                        <Clock className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">Assigned</p>
                                        <p className="text-lg sm:text-xl font-bold text-gray-900">{assignedCount}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-blue-500 p-2 shadow-sm">
                                        <Truck className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">In Transit</p>
                                        <p className="text-lg sm:text-xl font-bold text-gray-900">{deliveringCount}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-green-500 p-2 shadow-sm">
                                        <CheckCircle2 className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">Delivered</p>
                                        <p className="text-lg sm:text-xl font-bold text-gray-900">{deliveredCount}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Deliveries List */}
                    <div className="px-4 sm:px-0">
                    <div className="rounded-lg border border-slate-200 bg-white shadow overflow-hidden">
                        <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 py-3">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                                <div>
                                    <h3 className="text-base font-semibold text-white">Delivery List</h3>
                                    <p className="text-white/80 text-xs mt-0.5">View and manage all deliveries</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4">
                            {/* Filters */}
                            <div className="bg-slate-50 p-3 rounded-lg mb-4 border border-slate-200">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="relative">
                                            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Search by delivery, customer, route..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                        <div className="w-full sm:w-44">
                                            <select
                                                value={statusFilter}
                                                onChange={(e) => setStatusFilter(e.target.value)}
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-vismass-blue focus:ring-2 focus:ring-vismass-blue/20"
                                            >
                                                <option value="all">All Statuses</option>
                                                <option value="assigned">Assigned</option>
                                                <option value="delivering">Delivering</option>
                                                <option value="delivered">Delivered</option>
                                                <option value="cancelled">Cancelled</option>
                                            </select>
                                        </div>
                                        <div className="w-full sm:w-44">
                                            <select
                                                value={paymentStatusFilter}
                                                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-vismass-blue focus:ring-2 focus:ring-vismass-blue/20"
                                            >
                                                <option value="all">All Payments</option>
                                                <option value="paid">Paid</option>
                                                <option value="partial">Partial</option>
                                                <option value="unpaid">Unpaid</option>
                                            </select>
                                        </div>
                                        <button
                                            onClick={() => { setSearchTerm(''); setStatusFilter('all'); setPaymentStatusFilter('all'); }}
                                            className="inline-flex items-center bg-gray-200 text-gray-700 px-3 py-2 text-sm rounded-lg hover:bg-gray-300 transition-all duration-200 font-medium whitespace-nowrap"
                                        >
                                            <Filter className="mr-1 h-3.5 w-3.5" />
                                            Clear
                                        </button>
                                        <Link
                                            href="/deliveries/returns/create"
                                            className="inline-flex items-center rounded-lg bg-vismass-blue text-white px-3 py-2 text-sm font-medium hover:bg-vismass-blue/90 transition-all duration-200"
                                        >
                                            <Truck className="mr-1 h-3.5 w-3.5" />
                                            Record Return
                                        </Link>
                                    </div>
                                </div>
                            </div>

                            {/* Table */}
                            {filteredDeliveries.length > 0 ? (
                            <div className="overflow-x-auto rounded-lg border border-gray-200">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
                                    <tr>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                            Delivery #
                                        </th>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                            Date
                                        </th>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                            Customer
                                        </th>
                                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                            Items
                                        </th>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                            Total
                                        </th>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                            Payment
                                        </th>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredDeliveries.map((delivery) => {
                                        const totalAmount = parseFloat(delivery.total_amount ?? 0);

                                        return (
                                        <tr key={delivery.id} className="hover:bg-sky-50/50 transition-colors duration-150">
                                            <td className="px-4 py-2.5 whitespace-nowrap">
                                                <div className="text-xs font-medium text-gray-900">
                                                    {delivery.delivery_number}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5 whitespace-nowrap">
                                                <div className="text-xs text-gray-900">
                                                    {delivery.delivery_date || '—'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <div className="text-xs font-medium text-gray-900">
                                                    {delivery.shop?.name || delivery.customer_name || 'Walk-in'}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {delivery.delivery_route?.name ?? delivery.deliveryRoute?.name ?? 'No route'}
                                                    {' • '}
                                                    {delivery.assigned_user
                                                        ? `${delivery.assigned_user.first_name} ${delivery.assigned_user.last_name}`
                                                        : delivery.assignedUser
                                                            ? `${delivery.assignedUser.first_name} ${delivery.assignedUser.last_name}`
                                                            : 'Unassigned'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5 whitespace-nowrap text-xs text-right">
                                                {delivery.items?.length ?? 0}
                                            </td>
                                            <td className="px-4 py-2.5 whitespace-nowrap text-xs font-medium text-gray-900">
                                                Rs. {totalAmount.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-2.5 whitespace-nowrap">
                                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                                    delivery.payment_status === 'paid'
                                                        ? 'bg-green-100 text-green-800 border border-green-200'
                                                        : delivery.payment_status === 'partial'
                                                            ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                                            : 'bg-red-100 text-red-800 border border-red-200'
                                                }`}>
                                                    {delivery.payment_status.charAt(0).toUpperCase() + delivery.payment_status.slice(1)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5 whitespace-nowrap">
                                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${delivery.status === 'delivered'
                                                    ? 'bg-green-100 text-green-800'
                                                    : delivery.status === 'delivering'
                                                        ? 'bg-blue-100 text-blue-800'
                                                        : delivery.status === 'assigned'
                                                            ? 'bg-yellow-100 text-yellow-800'
                                                            : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {delivery.status.charAt(0).toUpperCase() + delivery.status.slice(1)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5 whitespace-nowrap text-xs font-medium">
                                                <div className="flex items-center space-x-2">
                                                    <Link
                                                        href={`/deliveries/${delivery.id}`}
                                                        className="inline-flex items-center text-sky-600 hover:text-sky-800"
                                                        title="View"
                                                    >
                                                        <Eye className="mr-1 h-3.5 w-3.5" />
                                                        View
                                                    </Link>
                                                    <Link
                                                        href={delivery.notes === 'Direct sale from vehicle' ? `/deliveries/delivery-sales/${delivery.id}/edit` : `/deliveries/${delivery.id}/edit`}
                                                        className="inline-flex items-center text-blue-600 hover:text-blue-800"
                                                        title="Edit"
                                                    >
                                                        <Edit className="mr-1 h-3.5 w-3.5" />
                                                        Edit
                                                    </Link>
                                                    {/* <button
                                                        onClick={() => deleteDelivery(delivery.id, delivery.delivery_number)}
                                                        className="inline-flex items-center text-red-500 hover:text-red-700"
                                                        title="Delete"
                                                    >
                                                        <Trash className="mr-1 h-3.5 w-3.5" />
                                                        Delete
                                                    </button> */}
                                                </div>
                                            </td>
                                        </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            </div>
                            ) : (
                                <div className="text-center py-8">
                                    <div className="mx-auto h-10 w-10 text-gray-400 mb-3">
                                        <Truck className="h-10 w-10" />
                                    </div>
                                    <h3 className="text-xs font-medium text-gray-900 mb-1.5">No deliveries found</h3>
                                    <p className="text-xs text-gray-500 mb-3">
                                        {searchTerm || statusFilter !== 'all'
                                            ? 'Try adjusting your search criteria'
                                            : 'Get started by assigning a new delivery.'}
                                    </p>
                                    {!searchTerm && statusFilter === 'all' && (
                                        <Link
                                            href="/deliveries/create"
                                            className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded-lg text-white bg-sky-600 hover:bg-sky-700"
                                        >
                                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                                            Assign New Delivery
                                        </Link>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="mt-6 border-t border-sky-200 bg-gradient-to-r from-white to-sky-50">
                    <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
                        <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2">
                            <p className="text-xs text-gray-500">© VISMASS Delivery Management • v1.0.0</p>
                        </div>
                    </div>
                </footer>
            </div>
        </AppLayout>
    );
}

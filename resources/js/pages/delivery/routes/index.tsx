import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { Truck, Plus, MapPin, CheckCircle, XCircle, Route, Eye, Edit, Search, Filter, ArrowLeft } from 'lucide-react';
import { useMemo, useState } from 'react';

export default function DeliveryRoutesIndex({ routes }: { routes: any[] }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const activeRoutes = routes.filter(route => route.is_active).length;
    const inactiveRoutes = routes.filter(route => !route.is_active).length;
    const totalAreas = routes.reduce((sum, route) => sum + (route.areas?.length || 0), 0);
    const filteredRoutes = useMemo(() => {
        return routes.filter((route) => {
            const matchesStatus = statusFilter === 'all'
                ? true
                : statusFilter === 'active'
                    ? route.is_active
                    : !route.is_active;
            const q = searchTerm.toLowerCase();
            const matchesSearch = !q
                || (route.name || '').toLowerCase().includes(q)
                || (route.description || '').toLowerCase().includes(q)
                || (route.areas || []).some((a: string) => a.toLowerCase().includes(q));
            return matchesStatus && matchesSearch;
        });
    }, [routes, searchTerm, statusFilter]);

    return (
        <AppLayout breadcrumbs={[{ title: 'Delivery Routes', href: '/deliveries/routes' }]}>
            <Head title="Delivery Routes - POS System" />

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
                                        Delivery Routes
                                    </h1>
                                    <p className="text-xs text-white/80 hidden sm:block">
                                        Manage and track all delivery routes
                                    </p>
                                </div>
                            </div>
                            <Link
                                href="/deliveries/routes/create"
                                className="shrink-0 inline-flex items-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                            >
                                <Plus className="h-4 w-4 sm:mr-1.5" />
                                <span className="hidden sm:inline">Create New Route</span>
                            </Link>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue p-2 shadow-sm">
                                        <Route className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">Total Routes</p>
                                        <p className="text-lg sm:text-xl font-bold text-gray-900">
                                            {routes.length}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-green-500 p-2 shadow-sm">
                                        <CheckCircle className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">Active Routes</p>
                                        <p className="text-lg sm:text-xl font-bold text-gray-900">
                                            {activeRoutes}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-red-500 p-2 shadow-sm">
                                        <XCircle className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">Inactive Routes</p>
                                        <p className="text-lg sm:text-xl font-bold text-gray-900">
                                            {inactiveRoutes}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-purple-500 p-2 shadow-sm">
                                        <MapPin className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">Total Areas</p>
                                        <p className="text-lg sm:text-xl font-bold text-gray-900">
                                            {totalAreas}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Content Card */}
                        <div className="rounded-lg border border-slate-200 bg-white shadow overflow-hidden">
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 py-3">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                                    <div>
                                        <h3 className="text-base font-semibold text-white">
                                            Delivery Routes List
                                        </h3>
                                        <p className="text-white/80 text-xs mt-0.5">
                                            View and manage all delivery routes
                                        </p>
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
                                                    placeholder="Search routes..."
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
                                                    <option value="active">Active</option>
                                                    <option value="inactive">Inactive</option>
                                                </select>
                                            </div>
                                            <button
                                                onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
                                                className="inline-flex items-center bg-gray-200 text-gray-700 px-3 py-2 text-sm rounded-lg hover:bg-gray-300 transition-all duration-200 font-medium whitespace-nowrap"
                                            >
                                                <Filter className="mr-1 h-3.5 w-3.5" />
                                                Clear
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Routes Table */}
                                {filteredRoutes.length > 0 ? (
                                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
                                                <tr>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        Route Name
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        Description
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        Areas Covered
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        Sales Reps
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
                                                {filteredRoutes.map((route) => (
                                                    <tr key={route.id} className="hover:bg-sky-50/50 transition-colors duration-150">
                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            <div className="flex items-center">
                                                                <div className={`rounded-lg p-2 shadow-sm ${route.is_active ? 'bg-green-100' : 'bg-gray-100'}`}>
                                                                    <Truck className={`h-3.5 w-3.5 ${route.is_active ? 'text-green-600' : 'text-gray-500'}`} />
                                                                </div>
                                                                <div className="ml-3">
                                                                    <div className="text-xs font-medium text-gray-900">
                                                                        {route.name}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <div className="text-xs text-gray-900">
                                                                {route.description}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            {route.areas && route.areas.length > 0 ? (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {route.areas.slice(0, 3).map((area: string, index: number) => (
                                                                        <span key={index} className="bg-blue-50 text-blue-700 border border-blue-100 text-xs px-2 py-0.5 rounded-full">
                                                                            {area}
                                                                        </span>
                                                                    ))}
                                                                    {route.areas.length > 3 && (
                                                                        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                                                                            +{route.areas.length - 3} more
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-gray-500">-</span>
                                                            )}
                                                        </td>

                                                        <td className="px-4 py-2.5">
                                                            {route.users && route.users.length > 0 ? (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {route.users.slice(0, 3).map((u: any) => (
                                                                        <span key={u.id} className="bg-slate-50 border border-slate-100 text-xs px-2 py-0.5 rounded-full">
                                                                            {u.first_name} {u.last_name}
                                                                        </span>
                                                                    ))}
                                                                    {route.users.length > 3 && (
                                                                        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                                                                            +{route.users.length - 3} more
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-gray-500">-</span>
                                                            )}
                                                        </td>

                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${route.is_active
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : 'bg-red-100 text-red-800'
                                                                }`}>
                                                                {route.is_active ? 'Active' : 'Inactive'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap text-xs font-medium">
                                                            <div className="flex space-x-2">
                                                                <Link
                                                                    href={`/deliveries/routes/${route.id}`}
                                                                    className="inline-flex items-center text-sky-600 hover:text-sky-800"
                                                                >
                                                                    <Eye className="mr-1 h-3.5 w-3.5" />
                                                                    View
                                                                </Link>
                                                                <Link
                                                                    href={`/deliveries/routes/${route.id}/edit`}
                                                                    className="inline-flex items-center text-orange-600 hover:text-orange-800"
                                                                >
                                                                    <Edit className="mr-1 h-3.5 w-3.5" />
                                                                    Edit
                                                                </Link>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <div className="mx-auto h-10 w-10 text-gray-400 mb-3">
                                            <Route className="h-10 w-10" />
                                        </div>
                                        <h3 className="text-xs font-medium text-gray-900 mb-1.5">No delivery routes found</h3>
                                        <p className="text-xs text-gray-500 mb-3">
                                            {searchTerm || statusFilter !== 'all'
                                                ? 'Try adjusting your search criteria'
                                                : 'Get started by creating a new delivery route.'}
                                        </p>
                                        <Link
                                            href="/deliveries/routes/create"
                                            className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded-lg text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                                        >
                                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                                            Create Delivery Route
                                        </Link>
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
                            <p className="text-xs text-gray-500">© UNITEC Delivery Management • v1.0.0</p>
                        </div>
                    </div>
                </footer>
            </div>
        </AppLayout>
    );
}

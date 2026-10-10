import AppSidebarLayout from '@/layouts/app/app-sidebar-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Store, Plus, Edit, Phone, MapPin, Route, ToggleLeft, ToggleRight, ArrowLeft, Search, Filter, CheckCircle, XCircle } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export default function ShopsIndex({ shops, filters = {}, routes = [] }: { shops: any[], filters?: any, routes?: any[] }) {
    const [search, setSearch] = useState(filters?.search || '');
    const [routeId, setRouteId] = useState(filters?.route_id || '');
    const [status, setStatus] = useState(filters?.status || '');
    const isInitialRender = useRef(true);

    useEffect(() => {
        if (isInitialRender.current) {
            isInitialRender.current = false;
            return;
        }

        const timeout = setTimeout(() => {
            const query = {
                ...(search && { search }),
                ...(routeId && { route_id: routeId }),
                ...(status && { status }),
            };
            router.get('/deliveries/shops', query, { preserveState: true, preserveScroll: true, replace: true });
        }, 300);

        return () => clearTimeout(timeout);
    }, [search, routeId, status]);

    const handleToggleStatus = (id: number, isActive: boolean) => {
        const action = isActive ? 'deactivate' : 'activate';
        if (!confirm(`Are you sure you want to ${action} this shop?`)) return;
        router.patch(`/deliveries/shops/${id}/status`, {}, {
            onSuccess: () => window.location.reload()
        });
    };

    const totalShops = shops.length;
    const activeShops = shops.filter(s => s.is_active).length;
    const inactiveShops = shops.filter(s => !s.is_active).length;

    return (
        <AppSidebarLayout breadcrumbs={[
            { title: 'Deliveries', href: '/deliveries' },
            { title: 'Shops', href: '/deliveries/shops' },
        ]}>
            <Head title="Shops" />

            <div className="min-h-screen bg-slate-50">
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
                                    <Store className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-lg sm:text-xl font-bold text-white truncate">Shops</h1>
                                    <p className="text-xs text-white/80 hidden sm:block">Manage delivery shop locations</p>
                                </div>
                            </div>
                            <Link
                                href="/deliveries/shops/create"
                                className="shrink-0 inline-flex items-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                            >
                                <Plus className="h-4 w-4 sm:mr-1.5" />
                                <span className="hidden sm:inline">Add Shop</span>
                            </Link>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-7xl py-6 px-4 sm:px-6 lg:px-8">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
                        <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                            <div className="flex items-center">
                                <div className="rounded-lg bg-vismass-blue p-2 shadow-sm">
                                    <Store className="h-4 w-4 text-white" />
                                </div>
                                <div className="ml-3">
                                    <p className="text-xs font-medium text-gray-600">Total Shops</p>
                                    <p className="text-lg font-bold text-gray-900">{totalShops}</p>
                                </div>
                            </div>
                        </div>
                        <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                            <div className="flex items-center">
                                <div className="rounded-lg bg-green-500 p-2 shadow-sm">
                                    <CheckCircle className="h-4 w-4 text-white" />
                                </div>
                                <div className="ml-3">
                                    <p className="text-xs font-medium text-gray-600">Active Shops</p>
                                    <p className="text-lg font-bold text-gray-900">{activeShops}</p>
                                </div>
                            </div>
                        </div>
                        <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                            <div className="flex items-center">
                                <div className="rounded-lg bg-slate-400 p-2 shadow-sm">
                                    <XCircle className="h-4 w-4 text-white" />
                                </div>
                                <div className="ml-3">
                                    <p className="text-xs font-medium text-gray-600">Inactive Shops</p>
                                    <p className="text-lg font-bold text-gray-900">{inactiveShops}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filters Section */}
                    <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            <div>
                                <Input
                                    placeholder="Search by name, phone or address..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <div>
                                <Select value={routeId || 'all'} onValueChange={(v) => setRouteId(v === 'all' ? '' : v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Routes" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Routes</SelectItem>
                                        {routes.map((route: any) => (
                                            <SelectItem key={route.id} value={route.id.toString()}>
                                                {route.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Select value={status || 'all'} onValueChange={(v) => setStatus(v === 'all' ? '' : v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex justify-end lg:justify-start">
                                <Button 
                                    variant="outline" 
                                    onClick={() => {
                                        setSearch('');
                                        setRouteId('');
                                        setStatus('');
                                    }}
                                    className="w-full lg:w-auto"
                                >
                                    Clear Filters
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white shadow overflow-hidden">
                        <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 py-3">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                                <div>
                                    <h2 className="text-lg font-semibold text-white">All Shops</h2>
                                    <p className="text-xs text-white/80">Total: {totalShops} shop{totalShops !== 1 ? 's' : ''}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4">
                            {shops.length === 0 ? (
                                <div className="text-center py-12">
                                    <Store className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                                    <h3 className="text-lg font-semibold text-slate-700">No shops found</h3>
                                    <p className="text-sm text-slate-500 mb-4">No shops match your current filters</p>
                                    <Link href="/deliveries/shops/create">
                                        <button className="inline-flex items-center justify-center rounded-lg bg-vismass-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
                                            <Plus className="mr-2 h-4 w-4" />
                                            Add your first shop
                                        </button>
                                    </Link>
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-b-lg">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
                                            <tr>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">Shop Name</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">Address</th>
                                                {/* <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">Route</th> */}
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">Contact</th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">Status</th>
                                                <th className="px-4 py-2.5 text-center text-xs font-semibold text-sky-900 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {shops.map((shop) => (
                                                <tr key={shop.id} className="hover:bg-sky-50/50 transition-colors duration-150">
                                                    <td className="px-4 py-2.5 text-sm font-medium text-gray-900">
                                                        <div className="flex items-center gap-2">
                                                            <Store className="h-4 w-4 text-vismass-blue" />
                                                            {shop.name}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-sm text-gray-500">
                                                        {[shop.address_line_1, shop.address_line_2, shop.locality, shop.city].filter(Boolean).join(', ') || shop.address || '-'}
                                                    </td>
                                                    {/* <td className="px-4 py-2.5 text-sm text-gray-500">
                                                        {shop.deliveryRoute ? (
                                                            <span className="inline-flex items-center gap-1"><Route className="h-3 w-3 text-vismass-blue" /> {shop.deliveryRoute.name}</span>
                                                        ) : '-'}
                                                    </td> */}
                                                    <td className="px-4 py-2.5 text-sm text-gray-500">{shop.contact_phone || '-'}</td>
                                                    <td className="px-4 py-2.5 text-sm">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${shop.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                                            {shop.is_active ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-center whitespace-nowrap">
                                                        <div className="flex items-center justify-center gap-4">
                                                            <Link
                                                                href={`/deliveries/shops/${shop.id}`}
                                                                className="inline-flex items-center text-slate-600 hover:text-slate-800 font-medium text-xs"
                                                            >
                                                                <Store className="mr-1 h-3.5 w-3.5" />
                                                                View
                                                            </Link>
                                                            <Link
                                                                href={`/deliveries/shops/${shop.id}/edit`}
                                                                className="inline-flex items-center text-sky-600 hover:text-sky-800 font-medium text-xs"
                                                            >
                                                                <Edit className="mr-1 h-3.5 w-3.5" />
                                                                Edit
                                                            </Link>
                                                            <button
                                                                onClick={() => handleToggleStatus(shop.id, shop.is_active)}
                                                                className={`inline-flex items-center font-medium text-xs ${shop.is_active ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}
                                                            >
                                                                {shop.is_active ? <ToggleLeft className="mr-1 h-3.5 w-3.5" /> : <ToggleRight className="mr-1 h-3.5 w-3.5" />}
                                                                {shop.is_active ? 'Deactivate' : 'Activate'}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </AppSidebarLayout>
    );
}

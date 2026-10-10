import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Truck, Search, Plus, Eye, Calendar, MapPin, Filter } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import Pagination from '@/components/pagination';

export default function ShopReturnIndex({ shopReturns, filters }: any) {
    const [itemsPerPage, setItemsPerPage] = useState(filters?.per_page || '20');

    const { data, setData } = useForm({
        search: filters.search || '',
        date_from: filters.date_from || '',
        date_to: filters.date_to || '',
    });

    const initialRender = useRef(true);

    useEffect(() => {
        if (initialRender.current) {
            initialRender.current = false;
            return;
        }

        const timeoutId = setTimeout(() => {
            router.get(
                '/deliveries/returns',
                {
                    search: data.search,
                    date_from: data.date_from,
                    date_to: data.date_to,
                    per_page: itemsPerPage,
                    page: 1,
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                }
            );
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [data.search, data.date_from, data.date_to, itemsPerPage]);

    const handleClearFilters = () => {
        setData({ search: '', date_from: '', date_to: '' });
        setItemsPerPage('20');
        
        router.get('/deliveries/returns', { per_page: '20' }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Deliveries', href: '/deliveries' }, { title: 'Shop Returns', href: '/deliveries/returns' }]}>
            <Head title="Shop Returns" />

            <div className="min-h-screen bg-slate-50">
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center space-x-4">
                                <div className="rounded-xl bg-white/20 p-3 shadow-inner shadow-white/10 backdrop-blur-sm border border-white/10">
                                    <Truck className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-white tracking-tight">Shop Returns</h1>
                                    <p className="text-sm text-white/70">Manage and track items returned from shops</p>
                                </div>
                            </div>
                            <Link
                                href="/deliveries/returns/create"
                                className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-vismass-blue shadow-lg shadow-black/5 hover:bg-slate-50 transition-all active:scale-95 gap-2"
                            >
                                <Plus className="h-4 w-4" /> Record New Return
                            </Link>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-7xl py-8 px-4 sm:px-6 lg:px-8">
                    {/* Filters Section */}
                    <div className="bg-slate-50 p-3 rounded-lg mb-4 border border-slate-200 shadow-sm">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-1">
                                <div className="flex-1 relative min-w-[200px]">
                                    <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        type="text"
                                        value={data.search}
                                        onChange={(e: any) => setData('search', e.target.value)}
                                        placeholder="Search by shop name..."
                                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue transition bg-white"
                                    />
                                </div>
                                <div className="w-36 shrink-0 relative">
                                    <Calendar className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="date"
                                        value={data.date_from}
                                        onChange={(e) => setData('date_from', e.target.value)}
                                        className="w-full pl-9 pr-2 py-2 text-sm border border-gray-300 rounded-lg focus:border-vismass-blue focus:ring-2 focus:ring-vismass-blue/20 transition bg-white"
                                        title="Start Date"
                                    />
                                </div>
                                <div className="w-36 shrink-0 relative">
                                    <Calendar className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="date"
                                        value={data.date_to}
                                        onChange={(e) => setData('date_to', e.target.value)}
                                        className="w-full pl-9 pr-2 py-2 text-sm border border-gray-300 rounded-lg focus:border-vismass-blue focus:ring-2 focus:ring-vismass-blue/20 transition bg-white"
                                        title="End Date"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
                                <div className="w-28">
                                    <select
                                        value={itemsPerPage}
                                        onChange={(e) => setItemsPerPage(e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-vismass-blue focus:ring-2 focus:ring-vismass-blue/20 bg-white"
                                    >
                                        <option value="15">15 / Page</option>
                                        <option value="20">20 / Page</option>
                                        <option value="50">50 / Page</option>
                                        <option value="100">100 / Page</option>
                                    </select>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleClearFilters}
                                    className="inline-flex items-center bg-gray-200 text-gray-700 px-3 py-2 text-sm rounded-lg hover:bg-gray-300 transition-all duration-200 font-medium whitespace-nowrap"
                                >
                                    <Filter className="mr-1 h-3.5 w-3.5" />
                                    Clear
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Table Section */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date / Ref</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Shop</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Vehicle</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Delivery No</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Recorded By</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {shopReturns.data.length > 0 ? (
                                        shopReturns.data.map((sr: any) => (
                                            <tr key={sr.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                                            {format(new Date(sr.return_date), 'MMM dd, yyyy')}
                                                        </span>
                                                        <span className="text-xs text-slate-400 mt-0.5">#SR-{sr.id.toString().padStart(6, '0')}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-8 w-8 rounded-lg bg-vismass-blue/5 border border-vismass-blue/10 flex items-center justify-center">
                                                            <MapPin className="h-4 w-4 text-vismass-blue" />
                                                        </div>
                                                        <span className="text-sm font-medium text-slate-700">{sr.shop?.name || 'N/A'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-medium text-slate-600 border border-slate-200">
                                                        {sr.vehicle?.registration_no || sr.vehicle?.name || 'Direct to Stock'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-sm font-medium text-slate-700">
                                                        {sr.delivery?.delivery_number || '—'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                                                            {sr.user?.name?.charAt(0) || 'U'}
                                                        </div>
                                                        <span className="text-sm text-slate-600">{sr.user?.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Link
                                                        href={`/deliveries/returns/${sr.id}`}
                                                        className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-vismass-blue hover:border-vismass-blue/30 transition-all shadow-sm active:scale-95"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center">
                                                    <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                                                        <Truck className="h-6 w-6 text-slate-300" />
                                                    </div>
                                                    <p className="text-slate-500 font-medium text-sm">No return records found</p>
                                                    <p className="text-slate-400 text-xs mt-1">Try adjusting your filters or search terms</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {shopReturns.links && shopReturns.links.length > 3 && (
                            <div className="p-4 border-t border-slate-200">
                                <Pagination links={shopReturns.links as any} meta={shopReturns as any} />
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </AppLayout>
    );
}

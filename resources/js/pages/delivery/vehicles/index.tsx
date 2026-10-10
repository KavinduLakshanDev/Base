// import React, { useState, useEffect, useRef } from 'react';
// import AppLayout from '@/layouts/app-layout';
// import { Head, Link, router, useForm } from '@inertiajs/react';
// import { Car, Plus, Edit, User, Package, ToggleLeft, ToggleRight, ArrowLeft, Search, Filter } from 'lucide-react';
// import Pagination from '@/components/pagination';
// import { Input } from '@/components/ui/input';

// export default function VehiclesIndex({ vehicles, filters }: { vehicles: any, filters: any }) {
//     const handleToggleStatus = (id: number, isActive: boolean) => {
//         const action = isActive ? 'deactivate' : 'activate';
//         if (!confirm(`Are you sure you want to ${action} this vehicle?`)) return;
//         router.patch(`/deliveries/vehicles/${id}/status`, {}, {
//             onSuccess: () => window.location.reload()
//         });
//     };
//     const [itemsPerPage, setItemsPerPage] = useState(filters?.per_page || '20');
    
//     const { data, setData } = useForm({
//         search: filters?.search || '',
//     });

//     const initialRender = useRef(true);

//     useEffect(() => {
//         if (initialRender.current) {
//             initialRender.current = false;
//             return;
//         }

//         const timeoutId = setTimeout(() => {
//             router.get(
//                 '/deliveries/vehicles',
//                 {
//                     search: data.search,
//                     per_page: itemsPerPage,
//                     page: 1,
//                 },
//                 {
//                     preserveState: true,
//                     preserveScroll: true,
//                     replace: true,
//                 }
//             );
//         }, 500);

//         return () => clearTimeout(timeoutId);
//     }, [data.search, itemsPerPage]);

//     const handleClearFilters = () => {
//         setData('search', '');
//         setItemsPerPage('20');
        
//         router.get('/deliveries/vehicles', { per_page: '20' }, {
//             preserveState: true,
//             preserveScroll: true,
//             replace: true,
//         });
//     };

//     return (
//         <AppLayout breadcrumbs={[
//             { title: 'Deliveries', href: '/deliveries' },
//             { title: 'Vehicles', href: '/deliveries/vehicles' },
//         ]}>
//             <Head title="Vehicles" />

//             <div className="min-h-screen bg-slate-50">
//                 {/* Header */}
//                 <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
//                     <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
//                         <div className="flex items-center justify-between py-4 gap-3">
//                             <div className="flex items-center space-x-3 min-w-0">
//                                 <button
//                                     onClick={() => window.history.back()}
//                                     className="shrink-0 rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
//                                     title="Go Back"
//                                 >
//                                     <ArrowLeft className="h-5 w-5 text-white" />
//                                 </button>
//                                 <div className="shrink-0 rounded-lg bg-white/20 p-2 shadow">
//                                     <Car className="h-5 w-5 text-white" />
//                                 </div>
//                                 <div className="min-w-0">
//                                     <h1 className="text-lg sm:text-xl font-bold text-white truncate">Vehicles</h1>
//                                     <p className="text-xs text-white/80 hidden sm:block">Manage delivery vehicles</p>
//                                 </div>
//                             </div>
//                             <Link
//                                 href="/deliveries/vehicles/create"
//                                 className="shrink-0 inline-flex items-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
//                             >
//                                 <Plus className="h-4 w-4 sm:mr-1.5" />
//                                 <span className="hidden sm:inline">Add Vehicle</span>
//                             </Link>
//                         </div>
//                     </div>
//                 </header>

//                 <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
//                     <div className="px-4 sm:px-0">
                        
//                         {/* Search Card */}
//                         <div className="bg-slate-50 p-3 rounded-lg mb-4 border border-slate-200 shadow-sm">
//                             <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
//                                 <div className="flex-1 relative">
//                                     <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
//                                     <Input
//                                         type="text"
//                                         value={data.search}
//                                         onChange={(e: any) => setData('search', e.target.value)}
//                                         placeholder="Search vehicles by name, reg no, or user..."
//                                         className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue transition bg-white"
//                                     />
//                                 </div>
//                                 <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
//                                     <div className="w-28">
//                                         <select
//                                             value={itemsPerPage}
//                                             onChange={(e) => setItemsPerPage(e.target.value)}
//                                             className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-vismass-blue focus:ring-2 focus:ring-vismass-blue/20"
//                                         >
//                                             <option value="15">15 / Page</option>
//                                             <option value="20">20 / Page</option>
//                                             <option value="50">50 / Page</option>
//                                             <option value="100">100 / Page</option>
//                                         </select>
//                                     </div>
//                                     <button
//                                         type="button"
//                                         onClick={handleClearFilters}
//                                         className="inline-flex items-center bg-gray-200 text-gray-700 px-3 py-2 text-sm rounded-lg hover:bg-gray-300 transition-all duration-200 font-medium whitespace-nowrap"
//                                     >
//                                         <Filter className="mr-1 h-3.5 w-3.5" />
//                                         Clear
//                                     </button>
//                                 </div>
//                             </div>
//                         </div>

//                     {vehicles.data.length === 0 ? (
//                         <div className="text-center py-8 rounded-lg border border-slate-200 bg-white shadow">
//                             <div className="mx-auto h-10 w-10 text-gray-400 mb-3">
//                                 <Car className="h-10 w-10" />
//                             </div>
//                             <h3 className="text-xs font-medium text-gray-900 mb-1.5">No vehicles found</h3>
//                             <p className="text-xs text-gray-500 mb-3">Get started by adding a new vehicle.</p>
//                             <Link
//                                 href="/deliveries/vehicles/create"
//                                 className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded-lg text-white bg-sky-600 hover:bg-sky-700"
//                             >
//                                 <Plus className="mr-1.5 h-3.5 w-3.5" />
//                                 Add Vehicle
//                             </Link>
//                         </div>
//                     ) : (
//                         <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow">
//                             <table className="min-w-full divide-y divide-gray-200">
//                                 <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
//                                     <tr>
//                                         <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">Name</th>
//                                         <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">Registration</th>
//                                         <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">Assigned To</th>
//                                         <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">Status</th>
//                                         <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">Actions</th>
//                                     </tr>
//                                 </thead>
//                                 <tbody className="bg-white divide-y divide-gray-200">
//                                     {vehicles.data.map((v: any) => (
//                                         <tr key={v.id} className="hover:bg-sky-50/50 transition-colors duration-150">
//                                             <td className="px-4 py-2.5 whitespace-nowrap">
//                                                 <div className="text-xs font-medium text-gray-900">{v.name}</div>
//                                             </td>
//                                             <td className="px-4 py-2.5 whitespace-nowrap">
//                                                 <div className="text-xs text-gray-900">{v.registration_no || '—'}</div>
//                                             </td>
//                                             <td className="px-4 py-2.5 whitespace-nowrap">
//                                                 {v.assigned_user
//                                                     ? <span className="inline-flex items-center gap-1 text-xs text-gray-900"><User className="h-3.5 w-3.5" />{v.assigned_user.first_name} {v.assigned_user.last_name}</span>
//                                                     : <span className="text-xs text-gray-400">Unassigned</span>
//                                                 }
//                                             </td>
//                                             <td className="px-4 py-2.5 whitespace-nowrap">
//                                                 {v.is_active
//                                                     ? <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">Active</span>
//                                                     : <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">Inactive</span>
//                                                 }
//                                             </td>
//                                             <td className="px-4 py-2.5 whitespace-nowrap text-xs font-medium">
//                                                 <div className="flex items-center space-x-2">
//                                                     <Link
//                                                         href={`/deliveries/vehicles/${v.id}/stock`}
//                                                         className="inline-flex items-center text-green-600 hover:text-green-800"
//                                                     >
//                                                         <Package className="mr-1 h-3.5 w-3.5" /> Stock
//                                                     </Link>
//                                                     <Link
//                                                         href={`/deliveries/vehicles/${v.id}/edit`}
//                                                         className="inline-flex items-center text-blue-600 hover:text-blue-800"
//                                                     >
//                                                         <Edit className="mr-1 h-3.5 w-3.5" /> Edit
//                                                     </Link>
//                                                     <button
//                                                         onClick={() => handleToggleStatus(v.id, v.is_active)}
//                                                         className={`inline-flex items-center ${v.is_active ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}
//                                                     >
//                                                         {v.is_active ? <ToggleRight className="mr-1 h-3.5 w-3.5" /> : <ToggleLeft className="mr-1 h-3.5 w-3.5" />}
//                                                         {v.is_active ? 'Deactivate' : 'Activate'}
//                                                     </button>
//                                                 </div>
//                                             </td>
//                                         </tr>
//                                     ))}
//                                 </tbody>
//                             </table>
//                             {vehicles.links && vehicles.links.length > 3 && (
//                                 <div className="p-4 border-t border-slate-200">
//                                     <Pagination links={vehicles.links as any} meta={vehicles as any} />
//                                 </div>
//                             )}
//                         </div>
//                     )}
//                     </div>
//                 </main>
//             </div>
//         </AppLayout>
//     );
// }

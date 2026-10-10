// import AppLayout from '@/layouts/app-layout';
// import {
//     AlertDialog,
//     AlertDialogAction,
//     AlertDialogCancel,
//     AlertDialogContent,
//     AlertDialogDescription,
//     AlertDialogFooter,
//     AlertDialogHeader,
//     AlertDialogTitle,
// } from '@/components/ui/alert-dialog';
// import { type BreadcrumbItem, type PaginatedResponse } from '@/types';
// import { Head, Link, router } from '@inertiajs/react';
// import {
//     CheckCircle,
//     Filter,
//     Plus,
//     Search,
//     Receipt,
//     XCircle,
//     RefreshCw,
//     CheckCircle2,
//     Pencil,
//     Power,
//     PowerOff,
//     Trash2,
// } from 'lucide-react';
// import { useState, useEffect, useRef } from 'react';

// import { t } from '@/lib/i18n';

// const breadcrumbs: BreadcrumbItem[] = [
//     {
//         title: t('Dashboard'),
//         href: '/dashboard',
//     },
//     {
//         title: t('Admin'),
//         href: '#',
//     },
//     {
//         title: t('Delivery petty cash category Management'),
//         href: '#',
//     },
// ];

// interface Category {
//     id: number;
//     name: string;
//     description?: string;
//     status: string;
//     company_code?: string;
//     section_code?: string;
//     created_at: string;
// }

// interface Filters {
//     search?: string;
//     status?: string;
// }

// interface Props {
//     categories: PaginatedResponse<Category>;
//     filters: Filters;
// }

// export default function DeliveryPettyCashCategoryIndex({ categories, filters }: Props) {
//     const [searchTerm, setSearchTerm] = useState(filters.search || '');
//     const [selectedStatus, setSelectedStatus] = useState(filters.status || '');
//     const [toggleModal, setToggleModal] = useState<{ show: boolean; category: Category | null }>({
//         show: false,
//         category: null,
//     });
//     const [deleteModal, setDeleteModal] = useState<{ show: boolean; category: Category | null }>({
//         show: false,
//         category: null,
//     });
//     const [toggleProcessing, setToggleProcessing] = useState(false);
//     const [deleteProcessing, setDeleteProcessing] = useState(false);
//     const initialRender = useRef(true);

//     const handleToggleStatus = (category: Category) => {
//         setToggleModal({ show: true, category });
//     };

//     const confirmToggle = () => {
//         if (toggleModal.category) {
//             setToggleProcessing(true);
//             router.patch(`/admin/delivery-petty-cash-categories/${toggleModal.category.id}/toggle-status`, {}, {
//                 onSuccess: () => {
//                     setToggleModal({ show: false, category: null });
//                 },
//                 onError: () => {
//                     setToggleModal({ show: false, category: null });
//                 },
//                 onFinish: () => {
//                     setToggleProcessing(false);
//                 },
//             });
//         }
//     };

//     const handleDelete = (category: Category) => {
//         setDeleteModal({ show: true, category });
//     };

//     const confirmDelete = () => {
//         if (deleteModal.category) {
//             setDeleteProcessing(true);
//             router.delete(`/admin/delivery-petty-cash-categories/${deleteModal.category.id}`, {
//                 onSuccess: () => {
//                     setDeleteModal({ show: false, category: null });
//                 },
//                 onError: () => {
//                     setDeleteModal({ show: false, category: null });
//                 },
//                 onFinish: () => {
//                     setDeleteProcessing(false);
//                 },
//             });
//         }
//     };

//     useEffect(() => {
//         if (initialRender.current) {
//             initialRender.current = false;
//             return;
//         }

//         const delayDebounceFn = setTimeout(() => {
//             router.get(
//                 '/admin/delivery-petty-cash-categories',
//                 {
//                     search: searchTerm,
//                     status: selectedStatus,
//                     page: 1,
//                 },
//                 {
//                     preserveState: true,
//                     replace: true,
//                     preserveScroll: true,
//                 },
//             );
//         }, 300);

//         return () => clearTimeout(delayDebounceFn);
//     }, [searchTerm, selectedStatus]);

//     const clearFilters = () => {
//         setSearchTerm('');
//         setSelectedStatus('');
//     };

//     // Calculate stats
//     const totalCategories = categories.data.length;
//     const activeCategories = categories.data.filter((category) => category.status === 'active').length;
//     const inactiveCategories = categories.data.filter((category) => category.status === 'inactive').length;

//     const getStatusBadge = (status: string) => {
//         switch (status) {
//             case 'active':
//                 return (
//                     <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
//                         <CheckCircle className="w-3 h-3 mr-1" />
//                         {t('Active')}
//                     </span>
//                 );
//             case 'inactive':
//                 return (
//                     <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
//                         <XCircle className="w-3 h-3 mr-1" />
//                         {t('Inactive')}
//                     </span>
//                 );
//             default:
//                 return null;
//         }
//     };

//     return (
//         <AppLayout breadcrumbs={breadcrumbs}>
//             <Head title={t('Delivery petty cash category Management')} />

//             <div className="min-h-screen bg-slate-50">
//                 {/* Header */}
//                 <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
//                     <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
//                         <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4">
//                             <div className="flex items-center space-x-3">
//                                 <button
//                                     onClick={() => window.history.back()}
//                                     className="rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
//                                     title="Go Back"
//                                 >
//                                     <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
//                                     </svg>
//                                 </button>
//                                 <div className="rounded-lg bg-white/20 p-2 shadow">
//                                     <Receipt className="h-5 w-5 text-white" />
//                                 </div>
//                                 <div>
//                                     <h1 className="text-xl font-bold text-white">
//                                         {t('Delivery petty cash category Management')}
//                                     </h1>
//                                     <p className="text-xs text-white/80">
//                                         {t("Manage your organization's Delivery petty cash categories")}
//                                     </p>
//                                 </div>
//                             </div>
//                             <Link
//                                 href="/admin/delivery-petty-cash-categories/create"
//                                 className="inline-flex w-full items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200 sm:w-auto"
//                             >
//                                 <Plus className="mr-1.5 h-4 w-4" />
//                                 {t('Add Category')}
//                             </Link>
//                         </div>
//                     </div>
//                 </header>

//                 {/* Main Content */}
//                 <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
//                     <div className="px-4 sm:px-0">
//                         {/* Stats Cards */}
//                         <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4">
//                             <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
//                                 <div className="flex items-center">
//                                     <div className="rounded-lg bg-vismass-blue p-2 shadow-sm">
//                                         <Receipt className="h-4 w-4 text-white" />
//                                     </div>
//                                     <div className="ml-3">
//                                         <p className="text-xs font-medium text-gray-600">{t('Total Categories')}</p>
//                                         <p className="text-lg sm:text-xl font-bold text-gray-900">
//                                             {totalCategories}
//                                         </p>
//                                     </div>
//                                 </div>
//                             </div>

//                             <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
//                                 <div className="flex items-center">
//                                     <div className="rounded-lg bg-green-500 p-2 shadow-sm">
//                                         <CheckCircle2 className="h-4 w-4 text-white" />
//                                     </div>
//                                     <div className="ml-3">
//                                         <p className="text-xs font-medium text-gray-600">{t('Active')}</p>
//                                         <p className="text-lg sm:text-xl font-bold text-gray-900">
//                                             {activeCategories}
//                                         </p>
//                                     </div>
//                                 </div>
//                             </div>

//                             <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
//                                 <div className="flex items-center">
//                                     <div className="rounded-lg bg-yellow-500 p-2 shadow-sm">
//                                         <RefreshCw className="h-4 w-4 text-white" />
//                                     </div>
//                                     <div className="ml-3">
//                                         <p className="text-xs font-medium text-gray-600">{t('Inactive')}</p>
//                                         <p className="text-lg sm:text-xl font-bold text-gray-900">
//                                             {inactiveCategories}
//                                         </p>
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>

//                         {/* Main Content Card */}
//                         <div className="rounded-lg border border-slate-200 bg-white shadow overflow-hidden">
//                             <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 py-3">
//                                 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
//                                     <div>
//                                         <h3 className="text-base font-semibold text-white">
//                                             {t('Delivery petty cash categories List')}
//                                         </h3>
//                                         <p className="text-white/80 text-xs mt-0.5">
//                                             {t('View and manage all Delivery petty cash categories')}
//                                         </p>
//                                     </div>
//                                 </div>
//                             </div>

//                             <div className="p-4">
//                                 {/* Filters */}
//                                 <div className="bg-slate-50 p-3 rounded-lg mb-4 border border-slate-200">
//                                     <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
//                                         <div className="flex-1 min-w-0">
//                                             <div className="relative">
//                                                 <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
//                                                 <input
//                                                     type="text"
//                                                     placeholder={t('Search categories...')}
//                                                     value={searchTerm}
//                                                     onChange={(e) => setSearchTerm(e.target.value)}
//                                                     className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
//                                                 />
//                                             </div>
//                                         </div>

//                                         <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
//                                             <div className="w-full sm:w-44">
//                                                 <select
//                                                     value={selectedStatus}
//                                                     onChange={(e) => setSelectedStatus(e.target.value)}
//                                                     className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-vismass-blue focus:ring-2 focus:ring-vismass-blue/20"
//                                                 >
//                                                     <option value="">{t('All Statuses')}</option>
//                                                     <option value="active">{t('Active')}</option>
//                                                     <option value="inactive">{t('Inactive')}</option>
//                                                 </select>
//                                             </div>
//                                             <button
//                                                 onClick={clearFilters}
//                                                 className="inline-flex items-center bg-gray-200 text-gray-700 px-3 py-2 text-sm rounded-lg hover:bg-gray-300 transition-all duration-200 font-medium whitespace-nowrap"
//                                             >
//                                                 <Filter className="mr-1 h-3.5 w-3.5" />
//                                                 {t('Clear')}
//                                             </button>
//                                         </div>
//                                     </div>
//                                 </div>

//                                 {/* Categories Table */}
//                                 <div className="space-y-4">
//                                     <div className="md:hidden space-y-4">
//                                         {categories.data.length === 0 ? (
//                                             <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
//                                                 <Receipt className="mx-auto h-12 w-12 text-slate-400" />
//                                                 <h3 className="mt-2 text-sm font-medium text-slate-900">{t('No Delivery petty cash categories')}</h3>
//                                                 <p className="mt-1 text-sm text-slate-500">
//                                                     {t('Get started by creating a new category.')}
//                                                 </p>
//                                                 <div className="mt-6">
//                                                     <Link
//                                                         href="/admin/delivery-petty-cash-categories/create"
//                                                         className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-vismass-blue hover:bg-vismass-blue/90"
//                                                     >
//                                                         <Plus className="mr-2 h-5 w-5" />
//                                                         {t('Add Category')}
//                                                     </Link>
//                                                 </div>
//                                             </div>
//                                         ) : (
//                                             categories.data.map((category) => (
//                                                 <div key={category.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
//                                                     <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
//                                                         <div className="min-w-0">
//                                                             <div className="text-sm font-semibold text-slate-900 truncate">{category.name}</div>
//                                                             <div className="text-xs text-slate-500 truncate">{category.description || '-'}</div>
//                                                         </div>
//                                                         <div className="text-left sm:text-right">
//                                                             {getStatusBadge(category.status)}
//                                                         </div>
//                                                     </div>
//                                                     <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
//                                                         <Link
//                                                             href={`/admin/delivery-petty-cash-categories/${category.id}/edit`}
//                                                             className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
//                                                         >
//                                                             <Pencil className="h-4 w-4" />
//                                                             {t('Edit')}
//                                                         </Link>
//                                                         <button
//                                                             onClick={() => handleToggleStatus(category)}
//                                                             className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
//                                                                 category.status === 'active'
//                                                                     ? 'text-red-600 bg-red-50 hover:bg-red-100'
//                                                                     : 'text-green-600 bg-green-50 hover:bg-green-100'
//                                                             } sm:w-auto`}
//                                                         >
//                                                             {category.status === 'active' ? (
//                                                                 <PowerOff className="h-4 w-4" />
//                                                             ) : (
//                                                                 <Power className="h-4 w-4" />
//                                                             )}
//                                                             {category.status === 'active' ? t('Deactivate') : t('Activate')}
//                                                         </button>
//                                                         <button
//                                                             onClick={() => handleDelete(category)}
//                                                             className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 sm:w-auto"
//                                                         >
//                                                             <Trash2 className="h-4 w-4" />
//                                                             {t('Delete')}
//                                                         </button>
//                                                     </div>
//                                                 </div>
//                                             ))
//                                         )}
//                                     </div>

//                                     <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200">
//                                         <table className="min-w-full divide-y divide-slate-200">
//                                             <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
//                                                 <tr>
//                                                     <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
//                                                         {t('Category')}
//                                                     </th>
//                                                     <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
//                                                         {t('Description')}
//                                                     </th>
//                                                     <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
//                                                         {t('Status')}
//                                                     </th>
//                                                     <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
//                                                         {t('Created')}
//                                                     </th>
//                                                     <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
//                                                         {t('Actions')}
//                                                     </th>
//                                                 </tr>
//                                             </thead>
//                                             <tbody className="bg-white divide-y divide-slate-200">
//                                                 {categories.data.length === 0 ? (
//                                                     <tr>
//                                                         <td colSpan={5} className="px-4 py-12 text-center">
//                                                             <Receipt className="mx-auto h-12 w-12 text-slate-400" />
//                                                             <h3 className="mt-2 text-sm font-medium text-slate-900">{t('No Delivery petty cash categories')}</h3>
//                                                             <p className="mt-1 text-sm text-slate-500">
//                                                                 {t('Get started by creating a new category.')}
//                                                             </p>
//                                                             <div className="mt-6">
//                                                                 <Link
//                                                                     href="/admin/delivery-petty-cash-categories/create"
//                                                                     className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-vismass-blue hover:bg-vismass-blue/90"
//                                                                 >
//                                                                     <Plus className="mr-2 h-5 w-5" />
//                                                                     {t('Add Category')}
//                                                                 </Link>
//                                                             </div>
//                                                         </td>
//                                                     </tr>
//                                                 ) : (
//                                                     categories.data.map((category) => (
//                                                         <tr key={category.id} className="hover:bg-slate-50">
//                                                             <td className="px-4 py-2.5 whitespace-nowrap">
//                                                                 <div className="flex items-center">
//                                                                     <div className="flex-shrink-0 h-10 w-10">
//                                                                         <div className="h-10 w-10 rounded-lg bg-vismass-blue/10 flex items-center justify-center">
//                                                                             <Receipt className="h-5 w-5 text-vismass-blue" />
//                                                                         </div>
//                                                                     </div>
//                                                                     <div className="ml-4">
//                                                                         <div className="text-xs font-medium text-slate-900">
//                                                                             {category.name}
//                                                                         </div>
//                                                                     </div>
//                                                                 </div>
//                                                             </td>
//                                                             <td className="px-4 py-2.5 whitespace-nowrap">
//                                                                 <div className="text-xs text-slate-500">{category.description || '-'}</div>
//                                                             </td>
//                                                             <td className="px-4 py-2.5 whitespace-nowrap">
//                                                                 {getStatusBadge(category.status)}
//                                                             </td>
//                                                             <td className="px-4 py-2.5 whitespace-nowrap text-xs text-slate-500">
//                                                                 {new Date(category.created_at).toLocaleDateString()}
//                                                             </td>
//                                                             <td className="px-4 py-2.5 whitespace-nowrap text-xs font-medium">
//                                                                 <div className="flex items-center space-x-2">
//                                                                     <Link
//                                                                         href={`/admin/delivery-petty-cash-categories/${category.id}/edit`}
//                                                                         className="inline-flex items-center p-1.5 rounded-md transition-colors text-slate-600 hover:text-slate-900 hover:bg-slate-100"
//                                                                         title={t('Edit')}
//                                                                     >
//                                                                         <Pencil className="h-4 w-4" />
//                                                                     </Link>
//                                                                     <button
//                                                                         onClick={() => handleToggleStatus(category)}
//                                                                         className={`inline-flex items-center p-1.5 rounded-md transition-colors ${
//                                                                             category.status === 'active'
//                                                                                 ? 'text-red-600 hover:text-red-800 hover:bg-red-50'
//                                                                                 : 'text-green-600 hover:text-green-800 hover:bg-green-50'
//                                                                         }`}
//                                                                         title={category.status === 'active' ? t('Deactivate') : t('Activate')}
//                                                                     >
//                                                                         {category.status === 'active' ? (
//                                                                             <PowerOff className="h-4 w-4" />
//                                                                         ) : (
//                                                                             <Power className="h-4 w-4" />
//                                                                         )}
//                                                                     </button>
//                                                                     {/* <button
//                                                                         onClick={() => handleDelete(category)}
//                                                                         className="inline-flex items-center p-1.5 rounded-md transition-colors text-red-600 hover:text-red-800 hover:bg-red-50"
//                                                                         title={t('Delete')}
//                                                                     >
//                                                                         <Trash2 className="h-4 w-4" />
//                                                                     </button> */}
//                                                                 </div>
//                                                             </td>
//                                                         </tr>
//                                                     ))
//                                                 )}
//                                             </tbody>
//                                         </table>
//                                     </div>

//                                     {/* Pagination */}
//                                     {categories.meta && categories.meta.last_page > 1 && (
//                                         <div className="bg-white px-4 py-3 border-t border-slate-200 sm:px-6">
//                                             <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
//                                                 <div className="text-sm text-slate-700">
//                                                     {t('Showing')} {categories.meta.from} {t('to')} {categories.meta.to} {t('of')} {categories.meta.total} {t('results')}
//                                                 </div>
//                                                 <div className="flex flex-wrap gap-1">
//                                                     {categories.links.map((link, index) => (
//                                                         <Link
//                                                             key={index}
//                                                             href={link.url || '#'}
//                                                             className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl ${
//                                                                 link.active
//                                                                     ? 'bg-vismass-blue text-white'
//                                                                     : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50'
//                                                             }`}
//                                                             dangerouslySetInnerHTML={{ __html: link.label }}
//                                                         />
//                                                     ))}
//                                                 </div>
//                                             </div>
//                                         </div>
//                                     )}
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 </main>

//                 {/* Footer */}
//                 <footer className="mt-6 border-t border-sky-200 bg-gradient-to-r from-white to-sky-50">
//                     <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
//                         <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2">
//                             <p className="text-xs text-gray-500">© VISMASS {t('Delivery petty cash category Management')} • v1.0.0</p>
//                         </div>
//                     </div>
//                 </footer>
//             </div>

//             {/* Toggle Status Confirmation Dialog */}
//             <AlertDialog open={toggleModal.show} onOpenChange={(open) => {
//                 if (!open) setToggleModal({ show: false, category: null });
//             }}>
//                 <AlertDialogContent>
//                     <AlertDialogHeader>
//                         <AlertDialogTitle>{t('Change Category Status')}</AlertDialogTitle>
//                         <AlertDialogDescription>
//                             {toggleModal.category && (
//                                 <>
//                                     {t('Are you sure you want to')}{' '}
//                                     <span className="font-semibold text-gray-900">
//                                         {toggleModal.category.status === 'active' ? t('deactivate') : t('activate')}
//                                     </span>{' '}
//                                     {t('category')} "{toggleModal.category.name}"?
//                                 </>
//                             )}
//                         </AlertDialogDescription>
//                     </AlertDialogHeader>
//                     <AlertDialogFooter>
//                         <AlertDialogCancel asChild>
//                             <button className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
//                                 {t('Cancel')}
//                             </button>
//                         </AlertDialogCancel>
//                         <AlertDialogAction asChild>
//                             <button
//                                 className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
//                                 disabled={toggleProcessing}
//                                 onClick={confirmToggle}
//                             >
//                                 {toggleProcessing ? t('Processing...') : t('Confirm')}
//                             </button>
//                         </AlertDialogAction>
//                     </AlertDialogFooter>
//                 </AlertDialogContent>
//             </AlertDialog>

//             {/* Delete Confirmation Dialog */}
//             <AlertDialog open={deleteModal.show} onOpenChange={(open) => {
//                 if (!open) setDeleteModal({ show: false, category: null });
//             }}>
//                 <AlertDialogContent>
//                     <AlertDialogHeader>
//                         <AlertDialogTitle>{t('Delete Category')}</AlertDialogTitle>
//                         <AlertDialogDescription>
//                             {deleteModal.category && (
//                                 <>
//                                     {t('Are you sure you want to delete category')} "{deleteModal.category.name}"?{' '}
//                                     {t('This action cannot be undone.')}
//                                 </>
//                             )}
//                         </AlertDialogDescription>
//                     </AlertDialogHeader>
//                     <AlertDialogFooter>
//                         <AlertDialogCancel asChild>
//                             <button className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
//                                 {t('Cancel')}
//                             </button>
//                         </AlertDialogCancel>
//                         <AlertDialogAction asChild>
//                             <button
//                                 className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
//                                 disabled={deleteProcessing}
//                                 onClick={confirmDelete}
//                             >
//                                 {deleteProcessing ? t('Processing...') : t('Delete')}
//                             </button>
//                         </AlertDialogAction>
//                     </AlertDialogFooter>
//                 </AlertDialogContent>
//             </AlertDialog>
//         </AppLayout>
//     );
// }
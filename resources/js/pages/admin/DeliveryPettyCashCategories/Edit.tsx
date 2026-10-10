// import AppLayout from '@/layouts/app-layout';
// import { t } from '@/lib/i18n';
// import { type BreadcrumbItem } from '@/types';
// import { Head, router, useForm } from '@inertiajs/react';
// import { Button } from '@/components/ui/button';
// import { ArrowLeft, Edit as EditIcon, Receipt, Save } from 'lucide-react';

// const breadcrumbs: BreadcrumbItem[] = [
//     {
//         title: t('Dashboard'),
//         href: '/dashboard',
//     },
//     {
//         title: t('Delivery petty cash categories'),
//         href: '/admin/delivery-petty-cash-categories',
//     },
//     {
//         title: t('Edit Category'),
//         href: '#',
//     },
// ];

// interface Category {
//     id: number;
//     name: string;
//     description?: string | null;
//     status: string;
// }

// interface CategoryFormData {
//     name: string;
//     description: string;
//     status: string;
//     [key: string]: string;
// }

// interface Props {
//     category: Category;
// }

// export default function Edit({ category }: Props) {
//     const { data, setData, processing, errors } = useForm<CategoryFormData>({
//         name: category.name,
//         description: category.description || '',
//         status: category.status,
//     });

//     const handleSubmit = (e: React.FormEvent) => {
//         e.preventDefault();

//         router.put(`/admin/delivery-petty-cash-categories/${category.id}`, data, {
//             onSuccess: () => {
//                 // Success handled by flash message
//             },
//         });
//     };

//     return (
//         <AppLayout breadcrumbs={breadcrumbs}>
//             <Head title={t('Edit Category')} />

//             <div className="min-h-screen bg-slate-50">
//                 {/* Header */}
//                 <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
//                     <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
//                         <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between py-4">
//                             <div className="flex items-center space-x-3">
//                                 <button
//                                     onClick={() => router.visit('/admin/delivery-petty-cash-categories')}
//                                     className="rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
//                                     title={t('Back')}
//                                 >
//                                     <ArrowLeft className="h-5 w-5 text-white" />
//                                 </button>
//                                 <div className="rounded-lg bg-white/20 p-2 shadow">
//                                     <EditIcon className="h-5 w-5 text-white" />
//                                 </div>
//                                 <div>
//                                     <h1 className="text-xl font-bold text-white">
//                                         {t('Edit Delivery petty cash category')}
//                                     </h1>
//                                     <p className="text-xs text-white/80">
//                                         {t('Update Delivery petty cash category information')}
//                                     </p>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 </header>

//                 {/* Main Content */}
//                 <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
//                     <div className="px-4 sm:px-0">
//                         {/* Form Container */}
//                         <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
//                             {/* Edit Form */}
//                             <form onSubmit={handleSubmit} className="space-y-8">
//                                 <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
//                                     {/* Left Column */}
//                                     <div className="space-y-6">
//                                         <div className="space-y-6">
//                                             <div className="flex items-center space-x-3 mb-6">
//                                                 <div className="p-2 bg-vismass-blue/10 rounded-lg">
//                                                     <Receipt className="w-5 h-5 text-vismass-blue" />
//                                                 </div>
//                                                 <h2 className="text-xl font-semibold text-slate-800">{t('Category Information')}</h2>
//                                             </div>

//                                             <div className="space-y-2">
//                                                 <label className="text-sm font-medium text-slate-700 flex items-center">
//                                                     <Receipt className="w-4 h-4 mr-2 text-vismass-blue" />
//                                                     {t('Name')} *
//                                                 </label>
//                                                 <input
//                                                     type="text"
//                                                     value={data.name}
//                                                     onChange={(e) => setData('name', e.target.value)}
//                                                     className="block w-full border border-slate-200 rounded-xl focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
//                                                     placeholder="e.g., Transport, Utilities"
//                                                     required
//                                                 />
//                                                 {errors.name && (
//                                                     <div className="mt-2 text-sm text-red-600">
//                                                         {errors.name}
//                                                     </div>
//                                                 )}
//                                             </div>

//                                             <div className="space-y-2">
//                                                 <label className="text-sm font-medium text-slate-700">
//                                                     {t('Description')}
//                                                 </label>
//                                                 <textarea
//                                                     value={data.description}
//                                                     onChange={(e) => setData('description', e.target.value)}
//                                                     rows={4}
//                                                     className="block w-full rounded-xl border border-slate-200 focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
//                                                     placeholder={t('Short note about this Delivery petty cash category')}
//                                                 />
//                                                 {errors.description && (
//                                                     <div className="mt-2 text-sm text-red-600">
//                                                         {errors.description}
//                                                     </div>
//                                                 )}
//                                             </div>

//                                             <div className="space-y-2">
//                                                 <label className="text-sm font-medium text-slate-700">
//                                                     {t('Status')} *
//                                                 </label>
//                                                 <select
//                                                     value={data.status}
//                                                     onChange={(e) => setData('status', e.target.value)}
//                                                     className="block w-full border border-slate-200 rounded-xl focus:border-vismass-blue focus:ring-vismass-blue/20 px-4 py-3"
//                                                     required
//                                                 >
//                                                     <option value="active">{t('Active')}</option>
//                                                     <option value="inactive">{t('Inactive')}</option>
//                                                 </select>
//                                                 {errors.status && (
//                                                     <div className="mt-2 text-sm text-red-600">
//                                                         {errors.status}
//                                                     </div>
//                                                 )}
//                                             </div>
//                                         </div>
//                                     </div>
//                                 </div>

//                                 {/* Submit Buttons */}
//                                 <div className="flex flex-col gap-3 sm:flex-row sm:justify-end pt-6 border-t border-slate-200">
//                                     <Button
//                                         type="button"
//                                         variant="outline"
//                                         onClick={() => router.visit('/admin/delivery-petty-cash-categories')}
//                                         className="w-full sm:w-auto px-8 py-3 rounded-xl border-slate-200 hover:bg-slate-50 transition-all duration-200 font-medium"
//                                     >
//                                         <ArrowLeft className="w-5 h-5 mr-2" />
//                                         {t('Cancel')}
//                                     </Button>
//                                     <Button
//                                         type="submit"
//                                         disabled={processing}
//                                         className="w-full sm:w-auto bg-vismass-blue hover:bg-vismass-blue/90 text-white px-8 py-3 rounded-xl shadow-sm transition-all duration-200 font-medium"
//                                     >
//                                         {processing ? (
//                                             <div className="flex items-center space-x-2">
//                                                 <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
//                                                 <span>{t('Updating...')}</span>
//                                             </div>
//                                         ) : (
//                                             <div className="flex items-center space-x-2">
//                                                 <Save className="w-5 h-5" />
//                                                 <span>{t('Update Category')}</span>
//                                             </div>
//                                         )}
//                                     </Button>
//                                 </div>
//                             </form>
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
//         </AppLayout>
//     );
// }
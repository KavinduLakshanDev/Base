import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { router, useForm, Head } from '@inertiajs/react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import * as Dialog from '@radix-ui/react-dialog';
import { CheckCircle, Edit, Edit2, Filter, Package, Plus, Power, Search, TrendingUp, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { t } from '@/lib/i18n';
import Pagination from '@/components/pagination';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: t('Dashboard'),
        href: '/dashboard',
    },
    {
        title: t('POS System'),
        href: '#',
    },
    {
        title: t('Brands'),
        href: '#',
    },
];

interface CategoryOption {
    id: number;
    catkey: string;
    cname: string;
    description?: string;
}

interface Brand {
    id: number;
    code: string;
    name: string;
    description?: string;
    category_id?: number;
    category?: CategoryOption;
    is_active: boolean;
    company_code: string;
    section_code: string;
    created_at: string;
}

interface PaginatedBrands {
    data: Brand[];
    links: any[]; // using any[] for simplicity with Inertia links, or specific type if available
    meta?: {
        current_page: number;
        last_page: number;
        from: number;
        to: number;
        total: number;
        per_page: number;
    };
}

interface Props {
    brands: PaginatedBrands | Brand[]; // Accept both for backward compatibility during transition
    categories?: CategoryOption[];
    filters?: {
        search?: string;
        status?: string;
        per_page?: number;
    };
    activeCount?: number;
    inactiveCount?: number;
}

export default function BrandsIndex({ brands, categories = [], filters = {}, activeCount = 0, inactiveCount = 0 }: Props) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [itemsPerPage, setItemsPerPage] = useState(filters.per_page || 10);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);

    // Helper to safely access brands data whether it's paginated or not
    const safeBrands = {
        data: Array.isArray(brands) ? brands : brands?.data || [],
        links: Array.isArray(brands) ? [] : brands?.links || [],
        meta: Array.isArray(brands)
            ? {
                total: brands.length,
                from: 1,
                to: brands.length,
                current_page: 1,
                last_page: 1,
                per_page: brands.length,
            }
            : brands?.meta || { total: 0, from: 0, to: 0, current_page: 1, last_page: 1, per_page: 10 },
    };

    const isFirstRender = useRef(true);

    // Debounced search effect
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const timer = setTimeout(() => {
            router.get(
                '/pos/brands',
                {
                    search: searchTerm,
                    status: statusFilter,
                    per_page: itemsPerPage,
                },
                {
                    preserveState: true,
                    replace: true,
                    preserveScroll: true,
                },
            );
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm, statusFilter, itemsPerPage]);

    const {
        data: addData,
        setData: setAddData,
        post: postAdd,
        processing: addProcessing,
        errors: addErrors,
        reset: resetAdd,
    } = useForm({
        name: '',
        description: '',
        category_id: '',
    });

    const {
        data: editData,
        setData: setEditData,
        put: putEdit,
        processing: editProcessing,
        errors: editErrors,
        reset: resetEdit,
    } = useForm({
        name: '',
        description: '',
        category_id: '',
        is_active: true,
    });

    const { post: toggleBrand, processing: toggleProcessing } = useForm({});



    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();

        // Check for duplicate names within the current page (limitation of server-side pagination without extra API call)
        const existingBrand = safeBrands.data.find(
            brand => brand.name.toLowerCase().trim() === addData.name.toLowerCase().trim() &&
                (brand.category_id?.toString() === addData.category_id || (!brand.category_id && !addData.category_id))
        );

        if (existingBrand) {
            const categoryName = addData.category_id
                ? categories.find(cat => cat.id.toString() === addData.category_id.toString())?.cname || 'selected category'
                : 'without a category';
            toast.error(t(`A brand with this name already exists in ${categoryName}. Please choose a different name.`));
            return;
        }

        postAdd('/pos/brands', {
            onSuccess: () => {
                setIsAddModalOpen(false);
                resetAdd();
            },
        });
    };

    const handleEdit = (brand: Brand) => {
        setSelectedBrand(brand);
        setEditData({
            name: brand.name,
            description: brand.description || '',
            category_id: brand.category_id?.toString() || '',
            is_active: brand.is_active,
        });
        setIsEditModalOpen(true);
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedBrand) {
            // Check for duplicate names within the current page
            const existingBrand = safeBrands.data.find(
                brand => brand.id !== selectedBrand.id &&
                    brand.name.toLowerCase().trim() === editData.name.toLowerCase().trim() &&
                    (brand.category_id?.toString() === editData.category_id || (!brand.category_id && !editData.category_id))
            );

            if (existingBrand) {
                const categoryName = editData.category_id
                    ? categories.find(cat => cat.id.toString() === editData.category_id.toString())?.cname || 'selected category'
                    : 'without a category';
                toast.error(t(`A brand with this name already exists in ${categoryName}. Please choose a different name.`));
                return;
            }

            putEdit(`/pos/brands/${selectedBrand.id}`, {
                onSuccess: () => {
                    setIsEditModalOpen(false);
                    setSelectedBrand(null);
                    resetEdit();
                },
            });
        }
    };

    const handleToggle = (brand: Brand) => {
        setSelectedBrand(brand);
        setIsDeleteModalOpen(true);
    };

    const confirmToggle = () => {
        if (selectedBrand) {
            toggleBrand(`/pos/brands/${selectedBrand.id}/toggle`, {
                onSuccess: () => {
                    setIsDeleteModalOpen(false);
                    setSelectedBrand(null);
                },
            });
        }
    };

    // For paginated data, we can't easily calculate accurate active/inactive counts client-side for the whole dataset
    // We'll rely on what's available or consider passing these stats from backend if needed.
    // Assuming for now simple display or using meta.total
    // const activeBrands = safeBrands.data.filter(b => b.is_active).length; // This is only for current page
    // const inactiveBrands = (safeBrands.meta?.total || 0) - activeBrands; // Verify logic or remove stats if inaccurate

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Brands')} - POS System`} />

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
                                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                </button>
                                <div className="shrink-0 rounded-lg bg-white/20 p-2 shadow">
                                    <Package className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-lg sm:text-xl font-bold text-white truncate">{t('Brands Management')}</h1>
                                    <p className="text-xs text-white/80 hidden sm:block">{t('Manage product brands')}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsAddModalOpen(true)} className="shrink-0 inline-flex items-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200">
                                <Plus className="h-4 w-4 sm:mr-1.5" />
                                <span className="hidden sm:inline">{t('Create New Brand')}</span>
                            </button>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue p-2 shadow-sm">
                                        <Package className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Total Brands')}</p>
                                        <p className="text-lg font-bold text-gray-900">{activeCount + inactiveCount}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-orange-500 p-2 shadow-sm">
                                        <CheckCircle className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Active Brands')}</p>
                                        <p className="text-lg font-bold text-gray-900">{activeCount}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-grey p-2 shadow-sm">
                                        <TrendingUp className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Inactive Brands')}</p>
                                        <p className="text-lg font-bold text-gray-900">{inactiveCount}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue/60 p-2 shadow-sm">
                                        <Users className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Companies')}</p>
                                        <p className="text-lg font-bold text-gray-900">{[...new Set(safeBrands.data.map(b => b.company_code))].length}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Content Card */}
                        <div className="rounded-lg border border-slate-200 bg-white shadow overflow-hidden">
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 py-3">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                                    <div>
                                        <h3 className="text-base font-semibold text-white">{t('Brands Management')}</h3>
                                        <p className="text-white/80 text-xs mt-0.5">{t('Browse and manage all brands')}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4">
                                <div className="bg-slate-50 p-3 rounded-lg mb-4 border border-slate-200">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                                        {/* Search */}
                                        <div className="flex-1 min-w-0">
                                            <div className="relative">
                                                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <input type="text" placeholder={t('Search brands...')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition" />
                                            </div>
                                        </div>

                                        {/* Status filter + per-page + clear — wrap on mobile */}
                                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                            <div className="flex-1 min-w-[120px]">
                                                <div className="relative">
                                                    <Filter className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                    <select
                                                        value={statusFilter}
                                                        onChange={(e) => setStatusFilter(e.target.value)}
                                                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                    >
                                                        <option value="">{t('All Status')}</option>
                                                        <option value="active">{t('Active')}</option>
                                                        <option value="inactive">{t('Inactive')}</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="w-28">
                                                <select
                                                    value={itemsPerPage}
                                                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                >
                                                    <option value={10}>10 / {t('page')}</option>
                                                    <option value={25}>25 / {t('page')}</option>
                                                    <option value={50}>50 / {t('page')}</option>
                                                    <option value={100}>100 / {t('page')}</option>
                                                </select>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSearchTerm('');
                                                    setStatusFilter('');
                                                    setItemsPerPage(10);
                                                    router.get('/pos/brands', {}, { preserveState: true });
                                                }}
                                                className="inline-flex items-center bg-gray-200 text-gray-700 px-3 py-2 text-sm rounded-lg hover:bg-gray-300 transition-all duration-200 font-medium whitespace-nowrap"
                                            >
                                                <Filter className="mr-1 h-3.5 w-3.5" />
                                                {t('Clear')}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Table */}
                                    {safeBrands.data.length > 0 ? (
                                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
                                                    <tr>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Code')}</th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Name')}</th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Category')}</th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Status')}</th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Created')}</th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Actions')}</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {safeBrands.data.map((brand) => (
                                                        <tr key={brand.id} className="hover:bg-sky-50/50 transition-colors duration-150">
                                                            <td className="px-4 py-2.5 whitespace-nowrap text-xs font-medium text-gray-900">{brand.code}</td>
                                                            <td className="px-4 py-2.5">
                                                                <div className="text-xs font-medium text-gray-900">{brand.name}</div>
                                                                {brand.description && <div className="text-xs text-gray-500 mt-0.5">{brand.description}</div>}
                                                            </td>
                                                            <td className="px-4 py-2.5 whitespace-nowrap">
                                                                <div className="text-xs text-gray-900">{brand.category?.cname ?? '-'}</div>
                                                            </td>
                                                            <td className="px-4 py-2.5 whitespace-nowrap">
                                                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${brand.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                                    {brand.is_active ? t('Active') : t('Inactive')}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-500">{new Date(brand.created_at).toLocaleDateString('en-GB')}</td>
                                                            <td className="px-4 py-2.5 whitespace-nowrap text-xs font-medium">
                                                                <button
                                                                    onClick={() => handleEdit(brand)}
                                                                    className="inline-flex items-center text-sky-600 hover:text-sky-800"
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                    {t('Edit')}
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {/* Pagination Controls */}
                                            {(safeBrands.links || []).length > 0 && (
                                                <Pagination links={safeBrands.links} meta={safeBrands.meta} />
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <div className="mx-auto h-10 w-10 text-gray-400 mb-3">
                                                <Package className="h-10 w-10" />
                                            </div>
                                            <h3 className="text-xs font-medium text-gray-900 mb-1.5">{t('No brands found')}</h3>
                                            <p className="text-xs text-gray-500 mb-3">
                                                {searchTerm ? t('Try adjusting your search terms') : t('Add your first brand to get started')}
                                            </p>
                                            <button
                                                onClick={() => setIsAddModalOpen(true)}
                                                className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded-lg text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                                            >
                                                <Plus className="mr-1.5 h-3.5 w-3.5" />
                                                {t('Add Brand')}
                                            </button>
                                        </div>
                                    )}

                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="mt-6 border-t border-sky-200 bg-gradient-to-r from-white to-sky-50">
                    <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
                        <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2">
                            <p className="text-xs text-gray-500">© VISMASS {t('Brands Management')} • v1.0.0</p>
                        </div>
                    </div>
                </footer>
            </div>

            {/* Modals and dialogs remain unchanged */}
            {/* Add Brand Modal */}
            <Dialog.Root open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
                    <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-full max-w-md mx-4 -translate-x-1/2 -translate-y-1/2 transform rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-blue-100">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="rounded-xl bg-linear-to-br from-blue-100 to-blue-100 p-2">
                                <Plus className="h-5 w-5 text-blue-600" />
                            </div>
                            <Dialog.Title className="text-xl font-bold text-gray-900">{t('Add New Brand')}</Dialog.Title>
                        </div>

                        <Dialog.Description className="mb-6 text-sm text-gray-600">Create a new product brand to organize your inventory</Dialog.Description>

                        <form onSubmit={handleAdd} className="space-y-4">
                            <div>
                                <label htmlFor="add-name" className="mb-2 block text-sm font-semibold text-gray-700">{t('Brand Name')} <span className="text-red-500">*</span></label>
                                <input id="add-name" type="text" value={addData.name} onChange={(e) => setAddData('name', e.target.value)} className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-gray-900 placeholder-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all duration-200" placeholder="e.g., EPSON" required />
                                {addErrors.name && (<p className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">{addErrors.name}</p>)}
                            </div>

                            <div>
                                <label htmlFor="add-category" className="mb-2 block text-sm font-semibold text-gray-700">{t('Category')}</label>
                                <select id="add-category" value={addData.category_id} onChange={(e) => setAddData('category_id', e.target.value)} className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-gray-900 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all duration-200">
                                    <option value="">{t('Select Category (Optional)')}</option>
                                    {categories.map((category) => (<option key={category.id} value={category.id}>{category.cname}</option>))}
                                </select>
                                {addErrors.category_id && (<p className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">{addErrors.category_id}</p>)}
                            </div>

                            <div>
                                <label htmlFor="add-description" className="mb-2 block text-sm font-semibold text-gray-700">{t('Description')}</label>
                                <textarea id="add-description" rows={3} value={addData.description} onChange={(e) => setAddData('description', e.target.value)} className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-gray-900 placeholder-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all duration-200" placeholder={t('Optional description for this brand')} />
                                {addErrors.description && (<p className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">{addErrors.description}</p>)}
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Dialog.Close asChild>
                                    <button type="button" className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">{t('Cancel')}</button>
                                </Dialog.Close>
                                <button type="submit" disabled={addProcessing} className="flex-1 rounded-xl border border-transparent bg-linear-to-r from-blue-600 to-blue-600 px-4 py-3 text-sm font-semibold text-white hover:from-blue-700 hover:to-blue-700 disabled:opacity-50 transition-all duration-200 shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300">{addProcessing ? t('Creating...') : t('Create Brand')}</button>
                            </div>
                        </form>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            {/* Edit Brand Modal (unchanged) */}
            <Dialog.Root open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
                    <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-full max-w-md mx-4 -translate-x-1/2 -translate-y-1/2 transform rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-blue-100">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="rounded-xl bg-linear-to-br from-blue-100 to-blue-100 p-2"><Edit2 className="h-5 w-5 text-blue-600" /></div>
                            <Dialog.Title className="text-xl font-bold text-gray-900">{t('Edit Brand')}</Dialog.Title>
                        </div>

                        <Dialog.Description className="mb-6 text-sm text-gray-600">Update the brand information and settings</Dialog.Description>

                        <form onSubmit={handleEditSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="edit-name" className="mb-2 block text-sm font-semibold text-gray-700">{t('Brand Name')} <span className="text-red-500">*</span></label>
                                <input id="edit-name" type="text" value={editData.name} onChange={(e) => setEditData('name', e.target.value)} className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-gray-900 placeholder-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all duration-200" required />
                                {editErrors.name && (<p className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">{editErrors.name}</p>)}
                            </div>

                            <div>
                                <label htmlFor="edit-category" className="mb-2 block text-sm font-semibold text-gray-700">{t('Category')}</label>
                                <select id="edit-category" value={editData.category_id} onChange={(e) => setEditData('category_id', e.target.value)} className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-gray-900 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all duration-200">
                                    <option value="">{t('Select Category (Optional)')}</option>
                                    {categories.map((category) => (<option key={category.id} value={category.id}>{category.cname}</option>))}
                                </select>
                                {editErrors.category_id && (<p className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">{editErrors.category_id}</p>)}
                            </div>

                            <div>
                                <label htmlFor="edit-description" className="mb-2 block text-sm font-semibold text-gray-700">{t('Description')}</label>
                                <textarea id="edit-description" rows={3} value={editData.description} onChange={(e) => setEditData('description', e.target.value)} className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-gray-900 placeholder-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all duration-200" />
                                {editErrors.description && (<p className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">{editErrors.description}</p>)}
                            </div>

                            <div className="flex items-center gap-3 bg-blue-50 rounded-xl p-4 border border-blue-200">
                                <input type="checkbox" id="edit-active" checked={editData.is_active} onChange={(e) => setEditData('is_active', e.target.checked)} className="h-4 w-4 rounded border-blue-300 text-blue-500 focus:ring-blue-200" />
                                <label htmlFor="edit-active" className="text-sm font-semibold text-blue-800">{t('Active Brand')}</label>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Dialog.Close asChild>
                                    <button type="button" className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">{t('Cancel')}</button>
                                </Dialog.Close>
                                <button type="submit" disabled={editProcessing} className="flex-1 rounded-xl border border-transparent bg-linear-to-r from-blue-600 to-blue-600 px-4 py-3 text-sm font-semibold text-white hover:from-blue-700 hover:to-blue-700 disabled:opacity-50 transition-all duration-200 shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300">{editProcessing ? t('Updating...') : t('Update Brand')}</button>
                            </div>
                        </form>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            {/* Toggle Status Modal (unchanged) */}
            <AlertDialog.Root open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <AlertDialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
                    <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 w-full max-w-md mx-4 -translate-x-1/2 -translate-y-1/2 transform rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-blue-100">
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`rounded-xl p-2 ${selectedBrand?.is_active ? 'bg-red-100' : 'bg-green-100'}`}>
                                <Power className={`h-5 w-5 ${selectedBrand?.is_active ? 'text-red-600' : 'text-green-600'}`} />
                            </div>
                            <AlertDialog.Title className="text-xl font-bold text-gray-900">{selectedBrand?.is_active ? t('Deactivate Brand') : t('Activate Brand')}</AlertDialog.Title>
                        </div>

                        <AlertDialog.Description className="mb-6 text-sm text-gray-600 bg-blue-50 rounded-xl p-4 border border-blue-200">
                            {t('Are you sure you want to')}{' '}
                            <span className={`font-semibold ${selectedBrand?.is_active ? 'text-red-600' : 'text-green-600'}`}>
                                {selectedBrand?.is_active ? t('deactivate') : t('activate')}
                            </span>{' '} the brand "<span className="font-semibold text-gray-900">{selectedBrand?.name}</span>"?
                            <br /><br />
                            {selectedBrand?.is_active ? t('This will hide it from active use but keep it in the system for historical records.') : t('This will make the brand available for use again.')}
                        </AlertDialog.Description>

                        <div className="flex gap-3">
                            <AlertDialog.Cancel asChild>
                                <button className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">{t('Cancel')}</button>
                            </AlertDialog.Cancel>
                            <AlertDialog.Action asChild>
                                <button onClick={confirmToggle} disabled={toggleProcessing} className={`flex-1 rounded-xl border border-transparent px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 transition-all duration-200 shadow-lg ${selectedBrand?.is_active ? 'bg-linear-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 shadow-red-200 hover:shadow-red-300' : 'bg-linear-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-green-200 hover:shadow-green-300'}`}>{toggleProcessing ? (selectedBrand?.is_active ? t('Deactivating...') : t('Activating...')) : (selectedBrand?.is_active ? t('Deactivate') : t('Activate'))}</button>
                            </AlertDialog.Action>
                        </div>
                    </AlertDialog.Content>
                </AlertDialog.Portal>
            </AlertDialog.Root>
        </AppLayout >
    );
}
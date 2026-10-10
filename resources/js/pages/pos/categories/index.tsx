import { router, Head, useForm, usePage } from '@inertiajs/react';
import { useRef, useEffect, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import * as Dialog from '@radix-ui/react-dialog';
import { Edit2, Package, Plus, Power, Search, Tag, Eye, CheckCircle, TrendingUp, Users, Filter, Edit } from 'lucide-react';

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
        title: t('Categories'),
        href: '#',
    },
];

interface Category {
    id: number;
    concode: string;
    catkey: string;
    cname: string;
    description?: string;
    is_active: boolean;
    company_code: string;
    section_code: string;
    created_at: string;
    brands: Brand[];
    brands_count: number;
    products_count: number;
}

interface Brand {
    id: number;
    brand_name: string;
    brand_code: string;
    is_active: boolean;
    products_count: number;
    products: Product[];
}

interface Product {
    id: number;
    item_name: string;
    item_code: string;
    is_active: boolean;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedCategories {
    data: Category[];
    links: PaginationLink[];
    current_page: number;
    from: number | null;
    last_page: number;
    path: string;
    per_page: number;
    to: number | null;
    total: number;
}

interface Props {
    categories: PaginatedCategories;
    filters?: {
        search?: string;
        status?: string;
        per_page?: string;
    };
    activeCount?: number;
    inactiveCount?: number;
    totalBrands?: number;
    totalProducts?: number;
}

export default function CategoriesIndex({ categories, filters = {}, activeCount = 0, inactiveCount = 0, totalBrands = 0, totalProducts = 0 }: Props) {
    const { props } = usePage<any>();
    const isSuperAdmin = props?.auth?.user?.user_type === 'super_admin';

    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [itemsPerPage, setItemsPerPage] = useState(filters.per_page || '10');

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

    const initialRender = useRef(true);

    // Debounced server-side filtering
    useEffect(() => {
        if (initialRender.current) {
            initialRender.current = false;
            return;
        }

        const delayDebounceFn = setTimeout(() => {
            router.get(
                '/pos/categories',
                {
                    search: searchTerm,
                    status: statusFilter,
                    per_page: itemsPerPage,
                    page: 1, // Reset to page 1 on filter change
                },
                {
                    preserveState: true,
                    replace: true,
                    preserveScroll: true,
                },
            );
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, statusFilter, itemsPerPage]);

    const safeCategories = {
        data: categories.data || [],
        links: categories.links || [],
        meta: {
            from: categories.from || 0,
            to: categories.to || 0,
            total: categories.total || 0,
            current_page: categories.current_page || 1,
            last_page: categories.last_page || 1,
        }
    };



    const {
        data: addData,
        setData: setAddData,
        post: postAdd,
        processing: addProcessing,
        errors: addErrors,
        reset: resetAdd,
    } = useForm({
        cname: '',
        description: '',
    });

    const {
        data: editData,
        setData: setEditData,
        put: putEdit,
        processing: editProcessing,
        errors: editErrors,
        reset: resetEdit,
    } = useForm({
        cname: '',
        description: '',
        is_active: true,
    });

    const { post: toggleCategory, processing: toggleProcessing } = useForm({});

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();

        // Check for duplicate names on current page
        const existingCategory = safeCategories.data.find(
            category => category.cname.toLowerCase().trim() === addData.cname.toLowerCase().trim()
        );

        if (existingCategory) {
            toast.error(t('A category with this name already exists. Please choose a different name.'));
            return;
        }

        postAdd('/pos/categories', {
            onSuccess: () => {
                setIsAddModalOpen(false);
                resetAdd();
            },
        });
    };

    const handleEdit = (category: Category) => {
        setSelectedCategory(category);
        setEditData({
            cname: category.cname,
            description: category.description || '',
            is_active: category.is_active,
        });
        setIsEditModalOpen(true);
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedCategory) {
            // Check for duplicate names on current page
            const existingCategory = safeCategories.data.find(
                category => category.id !== selectedCategory.id &&
                    category.cname.toLowerCase().trim() === editData.cname.toLowerCase().trim()
            );

            if (existingCategory) {
                toast.error(t('A category with this name already exists. Please choose a different name.'));
                return;
            }

            putEdit(`/pos/categories/${selectedCategory.id}`, {
                onSuccess: () => {
                    setIsEditModalOpen(false);
                    setSelectedCategory(null);
                    resetEdit();
                },
            });
        }
    };

    const handleToggle = (category: Category) => {
        setSelectedCategory(category);
        setIsDeleteModalOpen(true);
    };

    const confirmToggle = () => {
        if (selectedCategory) {
            toggleCategory(`/pos/categories/${selectedCategory.id}/toggle`, {
                onSuccess: () => {
                    setIsDeleteModalOpen(false);
                    setSelectedCategory(null);
                },
            });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Categories')} - POS System`} />

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
                                    <h1 className="text-lg sm:text-xl font-bold text-white truncate">
                                        {t('Categories Management')}
                                    </h1>
                                    <p className="text-xs text-white/80 hidden sm:block">
                                        {t('Manage product categories')}
                                    </p>
                                </div>
                            </div>
                            <Dialog.Root open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                                <Dialog.Trigger asChild>
                                    <button className="shrink-0 inline-flex items-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200">
                                        <Plus className="h-4 w-4 sm:mr-1.5" />
                                        <span className="hidden sm:inline">{t('Add Category')}</span>
                                    </button>
                                </Dialog.Trigger>
                            </Dialog.Root>
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
                                        <Package className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Total Categories')}</p>
                                        <p className="text-lg font-bold text-gray-900">{activeCount + inactiveCount}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-orange-500 p-2 shadow-sm">
                                        <Tag className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Total Brands')}</p>
                                        <p className="text-lg font-bold text-gray-900">{totalBrands}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-grey p-2 shadow-sm">
                                        <CheckCircle className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Active Categories')}</p>
                                        <p className="text-lg font-bold text-gray-900">{activeCount}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue/60 p-2 shadow-sm">
                                        <TrendingUp className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Total Products')}</p>
                                        <p className="text-lg font-bold text-gray-900">{totalProducts}</p>
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
                                            {t('Categories List')}
                                        </h3>
                                        <p className="text-white/80 text-xs mt-0.5">
                                            {t('View and manage all categories')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4">
                                {/* Filters */}
                                <div className="bg-slate-50 p-3 rounded-lg mb-4 border border-slate-200">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                                        {/* Search */}
                                        <div className="flex-1 min-w-0">
                                            <div className="relative">
                                                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder={t('Search by category name or code...')}
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                />
                                            </div>
                                        </div>

                                        {/* Status filter + per-page + clear — wrap on mobile */}
                                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                            <div className="flex-1 min-w-[130px]">
                                                <div className="relative">
                                                    <Filter className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                    <select
                                                        value={statusFilter}
                                                        onChange={(e) => setStatusFilter(e.target.value)}
                                                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                    >
                                                        <option value="">{t('All Status')}</option>
                                                        <option value="active">{t('Active Categories')}</option>
                                                        <option value="inactive">{t('Inactive Categories')}</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="w-28">
                                                <select
                                                    value={itemsPerPage}
                                                    onChange={(e) => setItemsPerPage(e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-vismass-blue focus:ring-2 focus:ring-vismass-blue/20"
                                                >
                                                    <option value="10">10 / {t('Page')}</option>
                                                    <option value="25">25 / {t('Page')}</option>
                                                    <option value="50">50 / {t('Page')}</option>
                                                    <option value="100">100 / {t('Page')}</option>
                                                </select>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSearchTerm('');
                                                    setStatusFilter('');
                                                    setItemsPerPage('10');
                                                }}
                                                className="inline-flex items-center bg-gray-200 text-gray-700 px-3 py-2 text-sm rounded-lg hover:bg-gray-300 transition-all duration-200 font-medium whitespace-nowrap"
                                            >
                                                <Filter className="mr-1 h-3.5 w-3.5" />
                                                {t('Clear')}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Categories Table */}
                                {safeCategories.data.length > 0 ? (
                                    <>
                                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
                                                    <tr>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Code')}</th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Name')}</th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Status')}</th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Actions')}</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {safeCategories.data.map((category) => (
                                                        <tr key={category.id} className="hover:bg-sky-50/50 transition-colors duration-150">
                                                            <td className="px-4 py-2.5 whitespace-nowrap">
                                                                <div className="text-xs font-medium text-gray-900">
                                                                    {category.concode}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-2.5">
                                                                <div className="flex items-center">
                                                                    <Tag className="mr-1.5 h-3.5 w-3.5 text-gray-400" />
                                                                    <div>
                                                                        <div className="text-xs font-medium text-gray-900">
                                                                            {category.cname}
                                                                        </div>
                                                                        {category.description && (
                                                                            <div className="text-xs text-gray-500 mt-0.5">
                                                                                {category.description}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-2.5 whitespace-nowrap">
                                                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${category.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                                    {category.is_active ? t('Active') : t('Inactive')}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-2.5 whitespace-nowrap text-xs font-medium space-x-2">
                                                            <button
                                                                onClick={() => handleEdit(category)}
                                                                className="inline-flex items-center text-sky-600 hover:text-sky-800"
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                                {t('Edit')}
                                                            </button>
                                                            {isSuperAdmin && (
                                                                <button
                                                                    onClick={() => handleToggle(category)}
                                                                    className="inline-flex items-center text-gray-600 hover:text-gray-800"
                                                                >
                                                                    <Power className="h-4 w-4" />
                                                                    {category.is_active ? t('Deactivate') : t('Activate')}
                                                                </button>
                                                            )}
                                                        </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Pagination */}
                                        {(safeCategories.links || []).length > 0 && (
                                            <Pagination links={safeCategories.links} meta={safeCategories.meta} />
                                        )}
                                    </>
                                ) : (
                                    <div className="text-center py-8">
                                        <div className="mx-auto h-10 w-10 text-gray-400 mb-3">
                                            <Package className="h-10 w-10" />
                                        </div>
                                        <h3 className="text-xs font-medium text-gray-900 mb-1.5">{t('No categories found')}</h3>
                                        <p className="text-xs text-gray-500 mb-3">
                                            {searchTerm ? t('Try adjusting your search criteria') : t('Get started by creating a new category.')}
                                        </p>
                                        {!searchTerm && (
                                            <Dialog.Root open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                                                <Dialog.Trigger asChild>
                                                    <button className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded-lg text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500">
                                                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                                                        {t('Create Category')}
                                                    </button>
                                                </Dialog.Trigger>
                                            </Dialog.Root>
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
                            <p className="text-xs text-gray-500">© VISMASS {t('Category Management')} • v1.0.0</p>
                        </div>
                    </div>
                </footer>
            </div>

            {/* Add Category Modal */}
            <Dialog.Root open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
                    <Dialog.Content className="fixed top-1/2 -translate-y-1/2 z-50 w-full max-w-md inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-200 overflow-y-auto max-h-[90vh]">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="rounded-lg bg-vismass-blue p-2">
                                <Plus className="h-5 w-5 text-white" />
                            </div>
                            <Dialog.Title className="text-lg sm:text-xl font-bold text-gray-900">
                                {t('Add New Category')}
                            </Dialog.Title>
                        </div>

                        <Dialog.Description className="mb-5 text-sm text-gray-600">
                            Create a new product category to organize your inventory
                        </Dialog.Description>

                        <form onSubmit={handleAdd} className="space-y-4">
                            <div>
                                <label
                                    htmlFor="add-name"
                                    className="mb-2 block text-sm font-semibold text-gray-700"
                                >
                                    {t('Category Name')} <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="add-name"
                                    type="text"
                                    value={addData.cname}
                                    onChange={(e) => setAddData('cname', e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-vismass-blue focus:ring-2 focus:ring-vismass-blue/20 transition-colors"
                                    placeholder="e.g., EPSON"
                                    required
                                />
                                {addErrors.cname && (
                                    <p className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                                        {addErrors.cname}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="add-description"
                                    className="mb-2 block text-sm font-semibold text-gray-700"
                                >
                                    {t('Description')}
                                </label>
                                <textarea
                                    id="add-description"
                                    rows={3}
                                    value={addData.description}
                                    onChange={(e) => setAddData('description', e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-vismass-blue focus:ring-2 focus:ring-vismass-blue/20 transition-colors"
                                    placeholder={t('Optional description for this category')}
                                />
                                {addErrors.description && (
                                    <p className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                                        {addErrors.description}
                                    </p>
                                )}
                            </div>

                            <div className="flex gap-3 pt-2 pb-safe">
                                <Dialog.Close asChild>
                                    <button
                                        type="button"
                                        className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        {t('Cancel')}
                                    </button>
                                </Dialog.Close>
                                <button
                                    type="submit"
                                    disabled={addProcessing}
                                    className="flex-1 rounded-xl border border-transparent bg-vismass-blue px-4 py-3 text-sm font-semibold text-white hover:bg-vismass-blue/90 disabled:opacity-50 transition-colors"
                                >
                                    {addProcessing ? t('Creating...') : t('Create Category')}
                                </button>
                            </div>
                        </form>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            {/* Edit Category Modal */}
            <Dialog.Root open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
                    <Dialog.Content className="fixed top-1/2 -translate-y-1/2 z-50 w-full max-w-md inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-200 overflow-y-auto max-h-[90vh]">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="rounded-lg bg-vismass-blue p-2">
                                <Edit2 className="h-5 w-5 text-white" />
                            </div>
                            <Dialog.Title className="text-lg sm:text-xl font-bold text-gray-900">
                                {t('Edit Category')}
                            </Dialog.Title>
                        </div>

                        <Dialog.Description className="mb-5 text-sm text-gray-600">
                            Update the category information and settings
                        </Dialog.Description>

                        <form onSubmit={handleEditSubmit} className="space-y-4">
                            <div>
                                <label
                                    htmlFor="edit-name"
                                    className="mb-2 block text-sm font-semibold text-gray-700"
                                >
                                    {t('Category Name')} <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="edit-name"
                                    type="text"
                                    value={editData.cname}
                                    onChange={(e) => setEditData('cname', e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-vismass-blue focus:ring-2 focus:ring-vismass-blue/20 transition-colors"
                                    required
                                />
                                {editErrors.cname && (
                                    <p className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                                        {editErrors.cname}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="edit-description"
                                    className="mb-2 block text-sm font-semibold text-gray-700"
                                >
                                    {t('Description')}
                                </label>
                                <textarea
                                    id="edit-description"
                                    rows={3}
                                    value={editData.description}
                                    onChange={(e) => setEditData('description', e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-vismass-blue focus:ring-2 focus:ring-vismass-blue/20 transition-colors"
                                />
                                {editErrors.description && (
                                    <p className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                                        {editErrors.description}
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-4 border border-slate-200">
                                <input
                                    type="checkbox"
                                    id="edit-active"
                                    checked={editData.is_active}
                                    onChange={(e) => setEditData('is_active', e.target.checked)}
                                    className="h-4 w-4 rounded border-slate-300 text-vismass-blue focus:ring-vismass-blue/20"
                                />
                                <label htmlFor="edit-active" className="text-sm font-semibold text-gray-700">
                                    {t('Active Category')}
                                </label>
                            </div>

                            <div className="flex gap-3 pt-2 pb-safe">
                                <Dialog.Close asChild>
                                    <button
                                        type="button"
                                        className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        {t('Cancel')}
                                    </button>
                                </Dialog.Close>
                                <button
                                    type="submit"
                                    disabled={editProcessing}
                                    className="flex-1 rounded-xl border border-transparent bg-vismass-blue px-4 py-3 text-sm font-semibold text-white hover:bg-vismass-blue/90 disabled:opacity-50 transition-colors"
                                >
                                    {editProcessing ? t('Updating...') : t('Update Category')}
                                </button>
                            </div>
                        </form>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            {/* Toggle Status Modal */}
            <AlertDialog.Root open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <AlertDialog.Portal>
                    <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
                    <AlertDialog.Content className="fixed top-1/2 -translate-y-1/2 z-50 w-full max-w-md
                        inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2
                        rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-200 overflow-y-auto max-h-[90vh]">
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`rounded-xl p-2 ${selectedCategory?.is_active ? 'bg-red-100' : 'bg-green-100'
                                }`}>
                                <Power className={`h-5 w-5 ${selectedCategory?.is_active ? 'text-red-600' : 'text-green-600'
                                    }`} />
                            </div>
                            <AlertDialog.Title className="text-xl font-bold text-gray-900">
                                {selectedCategory?.is_active ? t('Deactivate Category') : t('Activate Category')}
                            </AlertDialog.Title>
                        </div>

                        <AlertDialog.Description className="mb-6 text-sm text-gray-600 bg-slate-50 rounded-lg p-4 border border-slate-200">
                            {t('Are you sure you want to')}{' '}
                            <span className={`font-semibold ${selectedCategory?.is_active ? 'text-red-600' : 'text-green-600'
                                }`}>
                                {selectedCategory?.is_active ? t('deactivate') : t('activate')}
                            </span>{' '}
                            the category "<span className="font-semibold text-gray-900">{selectedCategory?.cname}</span>"?
                            <br /><br />
                            {selectedCategory?.is_active
                                ? t('This will hide it from active use but keep it in the system for historical records.')
                                : t('This will make the category available for use again.')}
                        </AlertDialog.Description>

                        <div className="flex gap-3">
                            <AlertDialog.Cancel asChild>
                                <button className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                                    {t('Cancel')}
                                </button>
                            </AlertDialog.Cancel>
                            <AlertDialog.Action asChild>
                                <button
                                    onClick={confirmToggle}
                                    disabled={toggleProcessing}
                                    className={`flex-1 rounded-xl border border-transparent px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 transition-all duration-200 shadow-lg ${selectedCategory?.is_active
                                        ? 'bg-linear-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 shadow-red-200 hover:shadow-red-300'
                                        : 'bg-linear-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-green-200 hover:shadow-green-300'
                                        }`}
                                >
                                    {toggleProcessing
                                        ? selectedCategory?.is_active
                                            ? t('Deactivating...')
                                            : t('Activating...')
                                        : selectedCategory?.is_active
                                            ? t('Deactivate')
                                            : t('Activate')}
                                </button>
                            </AlertDialog.Action>
                        </div>
                    </AlertDialog.Content>
                </AlertDialog.Portal>
            </AlertDialog.Root>
        </AppLayout>
    );
}

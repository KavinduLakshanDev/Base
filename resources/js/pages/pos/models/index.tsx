import { router, Head, useForm } from '@inertiajs/react';
import { useRef, useEffect, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import * as Dialog from '@radix-ui/react-dialog';
import { Edit2, Package, Plus, Power, Search, Tag, CheckCircle, TrendingUp, Users, Filter, Edit } from 'lucide-react';

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
        title: t('Models'),
        href: '#',
    },
];

interface Brand {
    id: number;
    code: string;
    name: string;
}

interface ProductModel {
    id: number;
    code: string;
    name: string;
    description?: string;
    brand_id?: number;
    brand?: Brand;
    is_active: boolean;
    company_code: string;
    section_code: string;
    created_at: string;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedModels {
    data: ProductModel[];
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
    models: PaginatedModels;
    brands?: Brand[];
    filters?: {
        search?: string;
        status?: string;
        per_page?: string;
    };
    activeCount?: number;
    inactiveCount?: number;
}

export default function ModelsIndex({ models, brands = [], filters = {}, activeCount = 0, inactiveCount = 0 }: Props) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [itemsPerPage, setItemsPerPage] = useState(filters.per_page || '10');

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedModel, setSelectedModel] = useState<ProductModel | null>(null);

    const initialRender = useRef(true);

    // Debounced server-side filtering
    useEffect(() => {
        if (initialRender.current) {
            initialRender.current = false;
            return;
        }

        const delayDebounceFn = setTimeout(() => {
            router.get(
                '/pos/models',
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

    const safeModels = {
        data: models.data || [],
        links: models.links || [],
        meta: {
            from: models.from || 0,
            to: models.to || 0,
            total: models.total || 0,
            current_page: models.current_page || 1,
            last_page: models.last_page || 1,
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
        name: '',
        description: '',
        brand_id: '',
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
        brand_id: '',
        is_active: true,
    });

    const { post: toggleModel, processing: toggleProcessing } = useForm({});

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();

        // Check for duplicate names within the same brand (case-insensitive) on current page
        const existingModel = safeModels.data.find(
            model => model.name.toLowerCase().trim() === addData.name.toLowerCase().trim() &&
                (model.brand_id?.toString() === addData.brand_id || (!model.brand_id && !addData.brand_id))
        );

        if (existingModel) {
            const brandName = addData.brand_id
                ? brands.find(b => b.id.toString() === addData.brand_id.toString())?.name || 'selected brand'
                : 'without a brand';
            toast.error(t(`A model with this name already exists in ${brandName}. Please choose a different name.`));
            return;
        }

        postAdd('/pos/models', {
            onSuccess: () => {
                setIsAddModalOpen(false);
                resetAdd();
            },
            onError: () => {
                toast.error(t('Failed to create model'));
            },
        });
    };

    const handleEdit = (model: ProductModel) => {
        setSelectedModel(model);
        setEditData({
            name: model.name,
            description: model.description || '',
            brand_id: model.brand_id?.toString() || '',
            is_active: model.is_active,
        });
        setIsEditModalOpen(true);
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedModel) {
            // Check for duplicate names within the same brand (case-insensitive), excluding the current model
            const existingModel = safeModels.data.find(
                model => model.id !== selectedModel.id &&
                    model.name.toLowerCase().trim() === editData.name.toLowerCase().trim() &&
                    (model.brand_id?.toString() === editData.brand_id || (!model.brand_id && !editData.brand_id))
            );

            if (existingModel) {
                const brandName = editData.brand_id
                    ? brands.find(b => b.id.toString() === editData.brand_id.toString())?.name || 'selected brand'
                    : 'without a brand';
                toast.error(t(`A model with this name already exists in ${brandName}. Please choose a different name.`));
                return;
            }

            putEdit(`/pos/models/${selectedModel.id}`, {
                onSuccess: () => {
                    setIsEditModalOpen(false);
                    setSelectedModel(null);
                    resetEdit();
                },
                onError: () => {
                    toast.error(t('Failed to update model'));
                },
            });
        }
    };

    const handleToggle = (model: ProductModel) => {
        setSelectedModel(model);
        setIsDeleteModalOpen(true);
    };

    const confirmToggle = () => {
        if (selectedModel) {
            toggleModel(`/pos/models/${selectedModel.id}/toggle`, {
                onSuccess: () => {
                    setIsDeleteModalOpen(false);
                    setSelectedModel(null);
                },
                onError: () => {
                    toast.error(t('Failed to update model status'));
                },
            });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Models')} - POS System`} />

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
                                    <Tag className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-lg sm:text-xl font-bold text-white truncate">{t('Product Models')}</h1>
                                    <p className="text-xs text-white/80 hidden sm:block">{t('Manage product models and variants')}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsAddModalOpen(true)}
                                className="shrink-0 inline-flex items-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                            >
                                <Plus className="h-4 w-4 sm:mr-1.5" />
                                <span className="hidden sm:inline">{t('Add Model')}</span>
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
                                        <p className="text-xs font-medium text-gray-600">{t('Total Models')}</p>
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
                                        <p className="text-xs font-medium text-gray-600">{t('Active Models')}</p>
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
                                        <p className="text-xs font-medium text-gray-600">{t('Inactive Models')}</p>
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
                                        <p className="text-xs font-medium text-gray-600">{t('Brands')}</p>
                                        <p className="text-lg font-bold text-gray-900">{brands.length}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Content Card */}
                        <div className="rounded-lg border border-slate-200 bg-white shadow overflow-hidden">
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-4 py-3">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                                    <div>
                                        <h3 className="text-base font-semibold text-white">{t('Models Management')}</h3>
                                        <p className="text-white/80 text-xs mt-0.5">{t('Browse and manage all product models')}</p>
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
                                                <input
                                                    type="text"
                                                    placeholder={t('Search models...')}
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                />
                                            </div>
                                        </div>

                                        {/* Status + per-page + clear — wrap on mobile */}
                                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                            <div className="flex-1 min-w-[120px]">
                                                <select
                                                    value={statusFilter}
                                                    onChange={(e) => setStatusFilter(e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                >
                                                    <option value="">{t('All Status')}</option>
                                                    <option value="active">{t('Active')}</option>
                                                    <option value="inactive">{t('Inactive')}</option>
                                                </select>
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

                                {/* Table */}
                                {safeModels.data.length > 0 ? (
                                    <>
                                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
                                                    <tr>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Code')}</th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Model Name')}</th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Brand')}</th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Status')}</th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Created')}</th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('Actions')}</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {safeModels.data.map((model) => (
                                                        <tr key={model.id} className="hover:bg-sky-50/50 transition-colors duration-150">
                                                            <td className="px-4 py-2.5 whitespace-nowrap text-xs font-medium text-gray-900">{model.code}</td>
                                                            <td className="px-4 py-2.5">
                                                                <div className="text-xs font-medium text-gray-900">{model.name}</div>
                                                                {model.description && <div className="text-xs text-gray-500 mt-0.5">{model.description}</div>}
                                                            </td>
                                                            <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-900">{model.brand?.name ?? '-'}</td>
                                                            <td className="px-4 py-2.5 whitespace-nowrap"><span className={`px-2 py-0.5 text-xs font-medium rounded-full ${model.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{model.is_active ? t('Active') : t('Inactive')}</span></td>
                                                            <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-500">{new Date(model.created_at).toLocaleDateString('en-GB')}</td>
                                                            <td className="px-4 py-2.5 whitespace-nowrap text-xs font-medium">
                                                                <button
                                                                    onClick={() => handleEdit(model)}
                                                                    className="text-sky-600 hover:text-sky-800 inline-flex items-center transition-colors"
                                                                    title={t('Edit Model')}
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                    {t('Edit')}
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Pagination */}
                                        {(safeModels.links || []).length > 0 && (
                                            <Pagination links={safeModels.links} meta={safeModels.meta} />
                                        )}
                                    </>
                                ) : (
                                    <div className="text-center py-8">
                                        <div className="mx-auto h-10 w-10 text-gray-400 mb-3">
                                            <Package className="h-10 w-10" />
                                        </div>
                                        <h3 className="text-xs font-medium text-gray-900 mb-1.5">{t('No models found')}</h3>
                                        <p className="text-xs text-gray-500 mb-3">
                                            {searchTerm ? t('Try adjusting your search terms') : t('Add your first model to get started')}
                                        </p>
                                        <button
                                            onClick={() => setIsAddModalOpen(true)}
                                            className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded-lg text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                                        >
                                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                                            {t('Add Model')}
                                        </button>
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
                            <p className="text-xs text-gray-500">© VISMASS {t('Models Management')} • v1.0.0</p>
                        </div>
                    </div>
                </footer>
            </div>

            {/* Add Model Modal */}
            <Dialog.Root open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
                    <Dialog.Content className="fixed top-1/2 -translate-y-1/2 z-50 w-full max-w-md inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-blue-100 overflow-y-auto max-h-[90vh]">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="rounded-xl bg-linear-to-br from-blue-100 to-blue-100 p-2">
                                <Plus className="h-5 w-5 text-blue-600" />
                            </div>
                            <Dialog.Title className="text-xl font-bold text-gray-900">{t('Add New Model')}</Dialog.Title>
                        </div>

                        <Dialog.Description className="mb-6 text-sm text-gray-600">Create a new product model to organize your inventory</Dialog.Description>

                        <form onSubmit={handleAdd} className="space-y-4">
                            <div>
                                <label htmlFor="add-name" className="mb-2 block text-sm font-semibold text-gray-700">{t('Model Name')} <span className="text-red-500">*</span></label>
                                <input id="add-name" type="text" value={addData.name} onChange={(e) => setAddData('name', e.target.value)} className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-gray-900 placeholder-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all duration-200" placeholder="e.g., L3210" required />
                                {addErrors.name && (<p className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">{addErrors.name}</p>)}
                            </div>

                            <div>
                                <label htmlFor="add-brand" className="mb-2 block text-sm font-semibold text-gray-700">{t('Brand')}</label>
                                <select id="add-brand" value={addData.brand_id} onChange={(e) => setAddData('brand_id', e.target.value)} className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-gray-900 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all duration-200">
                                    <option value="">{t('Select Brand (Optional)')}</option>
                                    {brands.map((brand) => (<option key={brand.id} value={brand.id}>{brand.name}</option>))}
                                </select>
                                {addErrors.brand_id && (<p className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">{addErrors.brand_id}</p>)}
                            </div>

                            <div>
                                <label htmlFor="add-description" className="mb-2 block text-sm font-semibold text-gray-700">{t('Description')}</label>
                                <textarea id="add-description" rows={3} value={addData.description} onChange={(e) => setAddData('description', e.target.value)} className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-gray-900 placeholder-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all duration-200" placeholder={t('Optional description for this model')} />
                                {addErrors.description && (<p className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">{addErrors.description}</p>)}
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Dialog.Close asChild>
                                    <button type="button" className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">{t('Cancel')}</button>
                                </Dialog.Close>
                                <button type="submit" disabled={addProcessing} className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 text-sm font-semibold text-white hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50">
                                    {addProcessing ? t('Creating...') : t('Create Model')}
                                </button>
                            </div>
                        </form>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            {/* Edit Model Modal */}
            <Dialog.Root open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
                    <Dialog.Content className="fixed top-1/2 -translate-y-1/2 z-50 w-full max-w-md inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-blue-100 overflow-y-auto max-h-[90vh]">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="rounded-xl bg-linear-to-br from-blue-100 to-blue-100 p-2">
                                <Edit2 className="h-5 w-5 text-blue-600" />
                            </div>
                            <Dialog.Title className="text-xl font-bold text-gray-900">{t('Edit Model')}</Dialog.Title>
                        </div>

                        <Dialog.Description className="mb-6 text-sm text-gray-600">Update model information</Dialog.Description>

                        <form onSubmit={handleEditSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="edit-name" className="mb-2 block text-sm font-semibold text-gray-700">{t('Model Name')} <span className="text-red-500">*</span></label>
                                <input id="edit-name" type="text" value={editData.name} onChange={(e) => setEditData('name', e.target.value)} className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-gray-900 placeholder-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all duration-200" placeholder="e.g., L3210" required />
                                {editErrors.name && (<p className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">{editErrors.name}</p>)}
                            </div>

                            <div>
                                <label htmlFor="edit-brand" className="mb-2 block text-sm font-semibold text-gray-700">{t('Brand')}</label>
                                <select id="edit-brand" value={editData.brand_id} onChange={(e) => setEditData('brand_id', e.target.value)} className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-gray-900 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all duration-200">
                                    <option value="">{t('Select Brand (Optional)')}</option>
                                    {brands.map((brand) => (<option key={brand.id} value={brand.id}>{brand.name}</option>))}
                                </select>
                                {editErrors.brand_id && (<p className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">{editErrors.brand_id}</p>)}
                            </div>

                            <div>
                                <label htmlFor="edit-description" className="mb-2 block text-sm font-semibold text-gray-700">{t('Description')}</label>
                                <textarea id="edit-description" rows={3} value={editData.description} onChange={(e) => setEditData('description', e.target.value)} className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-gray-900 placeholder-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all duration-200" placeholder={t('Optional description for this model')} />
                                {editErrors.description && (<p className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">{editErrors.description}</p>)}
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Dialog.Close asChild>
                                    <button type="button" className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">{t('Cancel')}</button>
                                </Dialog.Close>
                                <button type="submit" disabled={editProcessing} className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 text-sm font-semibold text-white hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50">
                                    {editProcessing ? t('Updating...') : t('Update Model')}
                                </button>
                            </div>
                        </form>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            {/* Toggle Status Confirmation Dialog */}
            <AlertDialog.Root open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <AlertDialog.Portal>
                    <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
                    <AlertDialog.Content className="fixed top-1/2 -translate-y-1/2 z-50 w-full max-w-md inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-orange-100 overflow-y-auto max-h-[90vh]">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="rounded-xl bg-orange-100 p-2">
                                <Power className="h-5 w-5 text-orange-600" />
                            </div>
                            <AlertDialog.Title className="text-xl font-bold text-gray-900">
                                {selectedModel?.is_active ? t('Deactivate Model') : t('Activate Model')}
                            </AlertDialog.Title>
                        </div>

                        <AlertDialog.Description className="mb-6 text-sm text-gray-600">
                            {selectedModel?.is_active
                                ? t('Are you sure you want to deactivate this model? It will no longer appear in active lists.')
                                : t('Are you sure you want to activate this model? It will appear in active lists again.')}
                        </AlertDialog.Description>

                        <div className="flex gap-3">
                            <AlertDialog.Cancel asChild>
                                <button className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">{t('Cancel')}</button>
                            </AlertDialog.Cancel>
                            <AlertDialog.Action asChild>
                                <button onClick={confirmToggle} disabled={toggleProcessing} className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-50 ${selectedModel?.is_active ? 'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800' : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'}`}>
                                    {toggleProcessing ? t('Updating...') : (selectedModel?.is_active ? t('Deactivate') : t('Activate'))}
                                </button>
                            </AlertDialog.Action>
                        </div>
                    </AlertDialog.Content>
                </AlertDialog.Portal>
            </AlertDialog.Root>
        </AppLayout>
    );
}

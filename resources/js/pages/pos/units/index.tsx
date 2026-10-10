import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm, router } from '@inertiajs/react';
import * as Dialog from '@radix-ui/react-dialog';
import { Ruler, Package, Tag, Settings, Plus, Search, Filter, Edit } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { t } from '@/lib/i18n';
import Pagination, { PaginationLink, PaginationMeta } from '@/components/pagination';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: t('Dashboard'),
        href: '/dashboard',
    },
    {
        title: t('POS System'),
        href: '/pos',
    },
    {
        title: t('Units'),
        href: '#',
    },
];

interface Unit {
    id: number;
    concode: string;
    catkey: string;
    cname: string;
    description?: string;
    is_active: boolean;
    company_code: string;
    branch_code: string;
    created_at: string;
}

interface Props {
    units: {
        data: Unit[];
        links: PaginationLink[];
        meta: PaginationMeta;
        from?: number;
        to?: number;
        total?: number;
        current_page?: number;
        last_page?: number;
    };
    filters?: {
        search?: string;
        status?: string;
        per_page?: string;
    };
}

export default function UnitsIndex({ units, filters = {} }: Props) {
    const safeUnits = {
        data: units.data || [],
        links: units.links || [],
        meta: units.meta || {
            from: units.from || 0,
            to: units.to || 0,
            total: units.total || 0,
            current_page: units.current_page || 1,
            last_page: units.last_page || 1,
        }
    };

    const activeUnits = safeUnits.data.filter(unit => unit.is_active).length;
    const inactiveUnits = safeUnits.data.filter(unit => !unit.is_active).length;

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'active');
    const [itemsPerPage, setItemsPerPage] = useState(filters.per_page || '10');

    // Debounced filtering
    const initialRender = useRef(true);

    useEffect(() => {
        if (initialRender.current) {
            initialRender.current = false;
            return;
        }

        const timer = setTimeout(() => {
            router.get(
                '/pos/units',
                {
                    search: search,
                    status: statusFilter,
                    per_page: itemsPerPage,
                    page: 1,
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                }
            );
        }, 300);

        return () => clearTimeout(timer);
    }, [search, statusFilter, itemsPerPage]);

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

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

    const {
        data: editData,
        setData: setEditData,
        put: putEdit,
        processing: editProcessing,
        errors: editErrors,
        reset: resetEdit,
        clearErrors: clearEditErrors,
    } = useForm({
        cname: '',
        description: '',
    });

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();

        // Check for duplicate names (case-insensitive)
        const existingItem = safeUnits.data.find(
            item => item.cname.toLowerCase().trim() === addData.cname.toLowerCase().trim()
        );

        if (existingItem) {
            toast.error(t('A unit with this name already exists. Please choose a different name.'));
            return;
        }

        postAdd('/pos/units', {
            onSuccess: () => {
                setIsAddModalOpen(false);
                resetAdd();
            },
        });
    };

    const handleEdit = (unit: Unit) => {
        setEditingUnit(unit);
        setEditData({
            cname: unit.cname,
            description: unit.description || '',
        });
        clearEditErrors();
        setIsEditModalOpen(true);
    };

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();

        if (!editingUnit) return;

        putEdit(`/pos/units/${editingUnit.id}`, {
            onSuccess: () => {
                setIsEditModalOpen(false);
                resetEdit();
                setEditingUnit(null);
            },
        });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        // Implement search functionality if needed
    };

    const clearFilters = () => {
        setSearch('');
        setStatusFilter('active');
        setItemsPerPage('10');
    };



    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-GB');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Units')} - POS System`} />

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
                                    <Ruler className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-lg sm:text-xl font-bold text-white truncate">
                                        {t('Units')}
                                    </h1>
                                    <p className="text-xs text-white/80 hidden sm:block">
                                        {t('Manage measurement units')}
                                    </p>
                                </div>
                            </div>
                            <Dialog.Root open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                                <Dialog.Trigger asChild>
                                    <button className="shrink-0 inline-flex items-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200">
                                        <Plus className="h-4 w-4 sm:mr-1.5" />
                                        <span className="hidden sm:inline">{t('Create New Unit')}</span>
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
                                        <Ruler className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Total Units')}</p>
                                        <p className="text-lg font-bold text-gray-900">
                                            {safeUnits.meta.total}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-orange-500 p-2 shadow-sm">
                                        <Tag className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Active')}</p>
                                        <p className="text-lg font-bold text-gray-900">
                                            {activeUnits}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-grey p-2 shadow-sm">
                                        <Settings className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Inactive')}</p>
                                        <p className="text-lg font-bold text-gray-900">
                                            {inactiveUnits}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue/60 p-2 shadow-sm">
                                        <Package className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Categories')}</p>
                                        <p className="text-lg font-bold text-gray-900">
                                            {Array.from(new Set(safeUnits.data.map(u => u.catkey))).length}
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
                                            {t('Units List')}
                                        </h3>
                                        <p className="text-white/80 text-xs mt-0.5">
                                            {t('View and manage all units')}
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
                                                    placeholder={t('Search by unit name or description...')}
                                                    value={search}
                                                    onChange={(e) => setSearch(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                />
                                            </div>
                                        </div>

                                        {/* Status + per-page + clear — wrap on mobile */}
                                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                            <div className="flex-1 min-w-[130px]">
                                                <div className="relative">
                                                    <Filter className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                    <select
                                                        value={statusFilter}
                                                        onChange={(e) => setStatusFilter(e.target.value)}
                                                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                    >
                                                        <option value="active">{t('Active Units')}</option>
                                                        <option value="">{t('All Status')}</option>
                                                        <option value="inactive">{t('Inactive')}</option>
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
                                                onClick={clearFilters}
                                                className="inline-flex items-center bg-gray-200 text-gray-700 px-3 py-2 text-sm rounded-lg hover:bg-gray-300 transition-all duration-200 font-medium whitespace-nowrap"
                                            >
                                                <Filter className="mr-1 h-3.5 w-3.5" />
                                                {t('Clear')}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Units Table */}
                                {safeUnits.data.length > 0 ? (
                                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
                                                <tr>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Unit Name')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Code')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Status')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Created')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('Actions')}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {safeUnits.data.map((unit) => (
                                                    <tr key={unit.id} className="hover:bg-sky-50/50 transition-colors duration-150">
                                                        <td className="px-4 py-2.5">
                                                            <div className="text-xs font-medium text-gray-900">
                                                                {unit.cname}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <div className="text-xs text-gray-900">
                                                                {unit.concode}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${unit.is_active
                                                                ? 'bg-green-100 text-green-800'
                                                                : 'bg-red-100 text-red-800'
                                                                }`}>
                                                                {unit.is_active ? t('Active') : t('Inactive')}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-900">
                                                            {formatDate(unit.created_at)}
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap text-xs font-medium">
                                                            <button
                                                                onClick={() => handleEdit(unit)}
                                                                className="inline-flex items-center text-sky-600 hover:text-sky-800"
                                                            >
                                                                <Edit className="mr-1 h-3.5 w-3.5" />
                                                                {t('Edit')}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>

                                        </table>
                                        {/* Pagination Controls */}
                                        {(safeUnits.links || []).length > 0 && (
                                            <Pagination links={safeUnits.links} meta={safeUnits.meta} />
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <div className="mx-auto h-10 w-10 text-gray-400 mb-3">
                                            <Ruler className="h-10 w-10" />
                                        </div>
                                        <h3 className="text-xs font-medium text-gray-900 mb-1.5">{t('No units found')}</h3>
                                        <p className="text-xs text-gray-500 mb-3">
                                            {t('Get started by creating a new unit.')}
                                        </p>
                                        <button
                                            onClick={() => setIsAddModalOpen(true)}
                                            className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded-lg text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                                        >
                                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                                            {t('Create Unit')}
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
                            <p className="text-xs text-gray-500">© VISMASS {t('Units Management')} • v1.0.0</p>
                        </div>
                    </div>
                </footer>
            </div >

            {/* Add Unit Modal */}
                     <Dialog.Root open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
                    <Dialog.Content className="fixed top-1/2 -translate-y-1/2 z-50 w-full max-w-md inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-200 overflow-y-auto max-h-[90vh]">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="rounded-lg bg-vismass-blue p-2">
                                <Plus className="h-5 w-5 text-white" />
                            </div>
                            <Dialog.Title className="text-lg sm:text-xl font-bold text-gray-900">
                                {t('Add New Unit')}
                            </Dialog.Title>
                        </div>
                        <Dialog.Description className="mb-5 text-sm text-gray-600">
                            {t('Enter the details for the new unit.')}
                        </Dialog.Description>
                        <form onSubmit={handleAdd} className="space-y-4">
                            <div>
                                <label htmlFor="cname" className="mb-2 block text-sm font-semibold text-gray-700">
                                    {t('Unit Name')} <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="cname"
                                    type="text"
                                    value={addData.cname}
                                    onChange={(e) => setAddData('cname', e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-vismass-blue focus:ring-2 focus:ring-vismass-blue/20 transition-colors"
                                    placeholder="e.g., Pieces"
                                    required
                                />
                                {addErrors.cname && (
                                    <p className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">{addErrors.cname}</p>
                                )}
                            </div>
                            <div>
                                <label htmlFor="description" className="mb-2 block text-sm font-semibold text-gray-700">
                                    {t('Description')}
                                </label>
                                <textarea
                                    id="description"
                                    value={addData.description}
                                    onChange={(e) => setAddData('description', e.target.value)}
                                    rows={3}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-vismass-blue focus:ring-2 focus:ring-vismass-blue/20 transition-colors"
                                    placeholder={t('Optional description')}
                                />
                                {addErrors.description && (
                                    <p className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">{addErrors.description}</p>
                                )}
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Dialog.Close asChild>
                                    <button
                                        type="button"
                                        className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                                        onClick={() => { setIsAddModalOpen(false); resetAdd(); }}
                                    >
                                        {t('Cancel')}
                                    </button>
                                </Dialog.Close>
                                <button
                                    type="submit"
                                    disabled={addProcessing}
                                    className="flex-1 rounded-xl border border-transparent bg-vismass-blue px-4 py-3 text-sm font-semibold text-white hover:bg-vismass-blue/90 disabled:opacity-50 transition-colors"
                                >
                                    {addProcessing ? t('Adding...') : t('Add Unit')}
                                </button>
                            </div>
                        </form>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            {/* Edit Unit Modal */}
                       <Dialog.Root open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
                    <Dialog.Content className="fixed top-1/2 -translate-y-1/2 z-50 w-full max-w-md inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-200 overflow-y-auto max-h-[90vh]">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="rounded-lg bg-vismass-blue p-2">
                                <Edit className="h-5 w-5 text-white" />
                            </div>
                            <Dialog.Title className="text-lg sm:text-xl font-bold text-gray-900">
                                {t('Edit Unit')}
                            </Dialog.Title>
                        </div>
                        <Dialog.Description className="mb-5 text-sm text-gray-600">
                            {t('Update the details for the unit.')}
                        </Dialog.Description>
                        <form onSubmit={handleUpdate} className="space-y-4">
                            <div>
                                <label htmlFor="edit-cname" className="mb-2 block text-sm font-semibold text-gray-700">
                                    {t('Unit Name')} <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="edit-cname"
                                    type="text"
                                    value={editData.cname}
                                    onChange={(e) => setEditData('cname', e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-vismass-blue focus:ring-2 focus:ring-vismass-blue/20 transition-colors"
                                    required
                                />
                                {editErrors.cname && (
                                    <p className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">{editErrors.cname}</p>
                                )}
                            </div>
                            <div>
                                <label htmlFor="edit-description" className="mb-2 block text-sm font-semibold text-gray-700">
                                    {t('Description')}
                                </label>
                                <textarea
                                    id="edit-description"
                                    value={editData.description}
                                    onChange={(e) => setEditData('description', e.target.value)}
                                    rows={3}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-vismass-blue focus:ring-2 focus:ring-vismass-blue/20 transition-colors"
                                />
                                {editErrors.description && (
                                    <p className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">{editErrors.description}</p>
                                )}
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Dialog.Close asChild>
                                    <button
                                        type="button"
                                        className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                                        onClick={() => { setIsEditModalOpen(false); resetEdit(); setEditingUnit(null); }}
                                    >
                                        {t('Cancel')}
                                    </button>
                                </Dialog.Close>
                                <button
                                    type="submit"
                                    disabled={editProcessing}
                                    className="flex-1 rounded-xl border border-transparent bg-vismass-blue px-4 py-3 text-sm font-semibold text-white hover:bg-vismass-blue/90 disabled:opacity-50 transition-colors"
                                >
                                    {editProcessing ? t('Updating...') : t('Update Unit')}
                                </button>
                            </div>
                        </form>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </AppLayout>
    );
}
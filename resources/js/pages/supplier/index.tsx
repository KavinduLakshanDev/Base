// import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { Head, Link, router } from '@inertiajs/react';
import { Building, Plus, MapPin, Phone, Mail, CheckCircle, XCircle, Eye, Edit, Truck, Users, Search, Filter, Power, PowerOff, Trash2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import ConfirmationModal from '@/components/ui/confirmation-modal';

interface Supplier {
    AdrKy: number;
    FstNm: string;
    Address: string | null;
    Country: string | null;
    CtPerson: string | null;
    TP1: string | null;
    Email: string | null;
    Website: string | null;
    VATNo: string | null;
    fVATRegistered: boolean;
    Status: string | null;
    created_at: string;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedSuppliers {
    data: Supplier[];
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
    suppliers: PaginatedSuppliers;
    filters: {
        search?: string;
        status?: string;
        per_page?: string;
    };
    flash?: {
        success?: string;
        error?: string;
    };
    stats: {
        active_suppliers: number;
        vat_registered: number;
    };
    canDelete?: boolean;
}

export default function SupplierIndex({ suppliers, filters = {}, flash, stats, canDelete }: Props) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [itemsPerPage, setItemsPerPage] = useState(filters.per_page || '10');
    const initialRender = useRef(true);

    // toggle dialog state
    const [showToggleDialog, setShowToggleDialog] = useState(false);
    const [supplierToToggle, setSupplierToToggle] = useState<Supplier | null>(null);
    const [toggleProcessing, setToggleProcessing] = useState(false);

    const [deleteModal, setDeleteModal] = useState<{ show: boolean; supplier: Supplier | null }>({
        show: false,
        supplier: null,
    });

    useEffect(() => {
        if (initialRender.current) {
            initialRender.current = false;
            return;
        }

        const delayDebounceFn = setTimeout(() => {
            router.get(
                '/suppliers',
                {
                    search: searchTerm,
                    status: statusFilter,
                    per_page: itemsPerPage,
                    page: 1,
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

    const clearFilters = () => {
        setSearchTerm('');
        setStatusFilter('');
        setItemsPerPage('10');
    };

    // reset supplierToToggle when dialog closes
    useEffect(() => {
        if (!showToggleDialog) {
            setSupplierToToggle(null);
        }
    }, [showToggleDialog]);

    const handleToggleStatus = (supplier: Supplier) => {
        setSupplierToToggle(supplier);
        setShowToggleDialog(true);
    };

    const confirmToggle = () => {
        if (!supplierToToggle) {
            setShowToggleDialog(false);
            return;
        }
        setToggleProcessing(true);
        router.patch(`/suppliers/${supplierToToggle.AdrKy}/toggle-status`, {}, {
            preserveScroll: true,
            onFinish: () => {
                setToggleProcessing(false);
                setShowToggleDialog(false);
                setSupplierToToggle(null);
            },
        });
    };

    const handleDelete = (supplier: Supplier) => {
        setDeleteModal({ show: true, supplier });
    };

    const confirmDelete = () => {
        if (!deleteModal.supplier) return;

        router.delete(`/suppliers/${deleteModal.supplier.AdrKy}`, {
            onSuccess: () => {
                setDeleteModal({ show: false, supplier: null });
            },
            onFinish: () => {
                // Any cleanup if needed
            }
        });
    };


    const safeSuppliers = {
        data: suppliers.data || [],
        links: suppliers.links || [],
        meta: {
            from: suppliers.from || 0,
            to: suppliers.to || 0,
            total: suppliers.total || 0,
            current_page: suppliers.current_page || 1,
            last_page: suppliers.last_page || 1,
        }
    };

    const totalSuppliers = safeSuppliers.meta.total;
    // Use backend-calculated stats for all suppliers
    const activeSuppliers = stats?.active_suppliers ?? 0;
    const vatRegisteredCount = stats?.vat_registered ?? 0;

    return (
        <AppLayout breadcrumbs={[
            { title: 'Suppliers', href: '/suppliers' }
        ]}>
            <Head title="Suppliers - Distribution System" />

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
                                    <Truck className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-lg sm:text-xl font-bold text-white truncate">
                                        Supplier Management
                                    </h1>
                                    <p className="text-xs text-white/80 hidden sm:block">
                                        Manage all your suppliers and vendors
                                    </p>
                                </div>
                            </div>
                            <Link
                                href="/suppliers/create"
                                className="shrink-0 inline-flex items-center rounded-lg bg-white px-3 sm:px-4 py-2 text-sm font-medium text-vismass-blue shadow hover:bg-slate-100 transition-all duration-200"
                            >
                                <Plus className="h-4 w-4 sm:mr-1.5" />
                                <span className="hidden sm:inline">Create Supplier</span>
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
                                        <Truck className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">Total Suppliers</p>
                                        <p className="text-lg font-bold text-gray-900">
                                            {totalSuppliers}
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
                                        <p className="text-xs font-medium text-gray-600">Active Suppliers</p>
                                        <p className="text-lg font-bold text-gray-900">
                                            {activeSuppliers}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-purple-500 p-2 shadow-sm">
                                        <Building className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">VAT Registered</p>
                                        <p className="text-lg font-bold text-gray-900">
                                            {vatRegisteredCount}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue/60 p-2 shadow-sm">
                                        <Search className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">Filtered Results</p>
                                        <p className="text-lg font-bold text-gray-900">
                                            {safeSuppliers.meta.total}
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
                                            Supplier Management
                                        </h3>
                                        <p className="text-white/80 text-xs mt-0.5">
                                            Browse and manage all registered suppliers
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4">
                                {/* Success/Error Messages */}
                                {flash?.success && (
                                    <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 shadow-sm">
                                        <div className="flex">
                                            <div className="shrink-0">
                                                <CheckCircle className="h-4 w-4 text-green-600" />
                                            </div>
                                            <div className="ml-2">
                                                <p className="text-xs font-semibold text-green-800">{flash.success}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {flash?.error && (
                                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 shadow-sm">
                                        <div className="flex">
                                            <div className="shrink-0">
                                                <XCircle className="h-4 w-4 text-red-600" />
                                            </div>
                                            <div className="ml-2">
                                                <p className="text-xs font-semibold text-red-800">{flash.error}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Filters */}
                                <div className="bg-slate-50 p-3 rounded-lg mb-4 border border-slate-200">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                                        {/* Search */}
                                        <div className="flex-1 min-w-0">
                                            <div className="relative">
                                                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Search suppliers by name, email, phone, or city..."
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                />
                                            </div>
                                        </div>

                                        {/* Per-page + Status + Clear */}
                                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                            <div className="w-28">
                                                <select
                                                    value={itemsPerPage}
                                                    onChange={(e) => setItemsPerPage(e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                >
                                                    <option value="10">10 / {t('Page')}</option>
                                                    <option value="25">25 / {t('Page')}</option>
                                                    <option value="50">50 / {t('Page')}</option>
                                                    <option value="100">100 / {t('Page')}</option>
                                                </select>
                                            </div>

                                            <div className="flex-1 min-w-[130px]">
                                                <div className="relative">
                                                    <Filter className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                    <select
                                                        value={statusFilter}
                                                        onChange={(e) => setStatusFilter(e.target.value)}
                                                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                    >
                                                        <option value="">All Suppliers</option>
                                                        <option value="1">Active</option>
                                                        <option value="0">Inactive</option>
                                                    </select>
                                                </div>
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

                                {/* Suppliers Table */}
                                {safeSuppliers.data && safeSuppliers.data.length > 0 ? (
                                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
                                                <tr>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        Name
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        Contact
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        Location
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        VAT
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
                                                {safeSuppliers.data.map((supplier) => (
                                                    <tr key={supplier.AdrKy} className="hover:bg-sky-50/50 transition-colors duration-150">
                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            <div className="text-xs font-medium text-gray-900">
                                                                {supplier.FstNm}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <div className="flex items-center">
                                                                <div>
                                                                    <div className="text-xs font-medium text-gray-900 flex items-center mt-0.5">
                                                                        <Users className='mr-1 h-2.5 w-2.5' />
                                                                        {supplier.CtPerson || '-'}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500 flex items-center mt-0.5">
                                                                        <Phone className="mr-1 h-2.5 w-2.5" />
                                                                        {supplier.TP1 || '-'}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500 flex items-center mt-0.5">
                                                                        <Mail className="mr-1 h-2.5 w-2.5" />
                                                                        {supplier.Email || '-'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <div className="text-xs text-gray-900 flex items-center">
                                                                <MapPin className="mr-1 h-3 w-3 text-gray-400" />
                                                                {supplier.Country || ''}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            {supplier.fVATRegistered ? (
                                                                <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800 border border-purple-200">
                                                                    <CheckCircle className="h-2.5 w-2.5 mr-1" />
                                                                    Yes
                                                                </span>
                                                            ) : (
                                                                <span className="text-xs text-gray-500">No</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${supplier.Status === '1'
                                                                ? 'bg-green-100 text-green-800'
                                                                : 'bg-red-100 text-red-800'
                                                                }`}>
                                                                {supplier.Status === '1' ? 'Active' : 'Inactive'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap text-xs font-medium">
                                                            <Link
                                                                href={`/suppliers/${supplier.AdrKy}`}
                                                                className="inline-flex items-center p-1.5 rounded-md text-sky-600 hover:text-sky-800 hover:bg-sky-50 transition-colors"
                                                                title={t('View')}
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </Link>
                                                            <Link
                                                                href={`/suppliers/${supplier.AdrKy}/edit`}
                                                                className="inline-flex items-center p-1.5 rounded-md text-orange-600 hover:text-orange-800 hover:bg-orange-50 transition-colors"
                                                                title={t('Edit')}
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Link>
                                                            <button
                                                                onClick={() => handleToggleStatus(supplier)}
                                                                className={`inline-flex items-center p-1.5 rounded-md ${supplier.Status === '1'
                                                                    ? 'text-red-600 hover:text-red-800 hover:bg-red-50'
                                                                    : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                                                                    }`}
                                                                title={supplier.Status === '1' ? t('Deactivate') : t('Activate')}
                                                            >
                                                                {supplier.Status === '1' ? (
                                                                    <PowerOff className="h-4 w-4" />
                                                                ) : (
                                                                    <Power className="h-4 w-4" />
                                                                )}
                                                            </button>
                                                            {canDelete && (
                                                                <button
                                                                    onClick={() => handleDelete(supplier)}
                                                                    className="inline-flex items-center p-1.5 rounded-md text-red-600 hover:text-red-800 hover:bg-red-50 transition-colors ml-1"
                                                                    title={t('Delete')}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <div className="mx-auto h-10 w-10 text-gray-400 mb-3">
                                            <Truck className="h-10 w-10" />
                                        </div>
                                        <h3 className="text-xs font-medium text-gray-900 mb-1.5">No suppliers found</h3>
                                        <p className="text-xs text-gray-500 mb-3">
                                            {searchTerm ? 'Try adjusting your search criteria' : 'Get started by creating a new supplier.'}
                                        </p>
                                        {!searchTerm && (
                                            <Link
                                                href="/suppliers/create"
                                                className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded-lg text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                                            >
                                                <Plus className="mr-1.5 h-3.5 w-3.5" />
                                                Create Supplier
                                            </Link>
                                        )}
                                    </div>
                                )}
                                {/* Pagination */}
                                {(safeSuppliers.data || []).length > 0 && (
                                    <div className="border-t border-gray-200 px-6 py-4 dark:border-gray-700">
                                        <div className="flex items-center justify-between">
                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                Showing {safeSuppliers.meta?.from || 0} to{' '}
                                                {safeSuppliers.meta?.to || 0} of{' '}
                                                {safeSuppliers.meta?.total || 0} results
                                            </div>
                                            <div className="flex space-x-2">
                                                {(safeSuppliers.links || []).map(
                                                    (link: any, index: number) => (
                                                        <button
                                                            key={index}
                                                            onClick={() =>
                                                                link.url &&
                                                                router.visit(link.url, {
                                                                    preserveScroll: true,
                                                                    preserveState: true,
                                                                })
                                                            }
                                                            disabled={!link.url}
                                                            className={`rounded px-3 py-1 text-sm ${link.active
                                                                ? 'bg-blue-600 text-white'
                                                                : link.url
                                                                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                                                                    : 'cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                                                                }`}
                                                            dangerouslySetInnerHTML={{
                                                                __html: link.label,
                                                            }}
                                                        />
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Toggle Confirmation Dialog */}
                                <AlertDialog open={showToggleDialog} onOpenChange={setShowToggleDialog}>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>{t('Change Supplier Status')}</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                {supplierToToggle && (
                                                    <>
                                                        {t('Are you sure you want to')}{' '}
                                                        <span className="font-semibold text-gray-900">
                                                            {supplierToToggle.Status === '1' ? t('deactivate') : t('activate')}
                                                        </span>{' '}
                                                        {t('supplier')} "{supplierToToggle.FstNm}"?
                                                    </>
                                                )}
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel asChild>
                                                <button className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                                    {t('Cancel')}
                                                </button>
                                            </AlertDialogCancel>
                                            <AlertDialogAction asChild>
                                                <button
                                                    className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                                                    disabled={toggleProcessing}
                                                    onClick={confirmToggle}
                                                >
                                                    {toggleProcessing ? t('Processing...') : t('Confirm')}
                                                </button>
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>

                                {/* Delete Confirmation Modal */}
                                <ConfirmationModal
                                    isOpen={deleteModal.show}
                                    onClose={() => setDeleteModal({ show: false, supplier: null })}
                                    onConfirm={confirmDelete}
                                    title={t('Delete Supplier')}
                                    message={
                                        deleteModal.supplier
                                            ? `${t('Are you sure you want to delete supplier')} "${deleteModal.supplier.FstNm}"? ${t('This action cannot be undone and will fail if the supplier has transaction history.')}`
                                            : ''
                                    }
                                    type="danger"
                                    confirmText={t('Delete')}
                                    cancelText={t('Cancel')}
                                />
                            </div>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="mt-6 border-t border-sky-200 bg-gradient-to-r from-white to-sky-50">
                    <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
                        <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2">
                            <p className="text-xs text-gray-500">© VISMASS Supplier Management • v1.0.0</p>
                        </div>
                    </div>
                </footer>
            </div>
        </AppLayout>
    );
}

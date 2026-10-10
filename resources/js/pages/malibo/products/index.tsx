import AppLayout from '@/layouts/app-layout';
import { t, setLanguage, getLanguage } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    Barcode,
    Eye,
    Filter,
    Package,
    Search,
    Tag,
    RefreshCw,
    CheckCircle2
} from 'lucide-react';
import { useEffect, useState, useReducer, useRef } from 'react';
import { toast } from 'sonner';
import Pagination, { PaginationLink, PaginationMeta } from '@/components/pagination';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: t('Dashboard'),
        href: '/dashboard',
    },
    {
        title: 'Malibo Products',
        href: '#',
    },
];

interface Product {
    ItmKy: number;
    ItemCode: string;
    BarCode?: string;
    ItmNm: string;
    EnglishName?: string;
    CosPri: number;
    SlsPri: number;
    ReOrdlLvl: number;
    branch_reorder_level?: number | null;
    Status: string;
    VATItem: boolean;
    fInAct: boolean;
    catkey?: string;
    brand_id?: number;
    brand?: string;
    SupKey?: number;
    UnitKy?: number;
    available_business_units?: string[];
}

interface Filters {
    search?: string;
    status?: string;
    barcode?: string;
    per_page?: string;
    is_service?: string;
}

interface Props {
    items: {
        data: Product[];
        links: PaginationLink[];
        meta: PaginationMeta;
        from?: number;
        to?: number;
        total?: number;
        current_page?: number;
        last_page?: number;
    };
    totalProducts?: number;
    stats?: {
        total: number;
        active: number;
        inactive: number;
        with_barcode: number;
        vat_items: number;
        services?: number;
    };
    filters?: Filters;
    flash?: {
        success?: string;
        error?: string;
    };
}

export default function ProductIndex({ items, stats, filters = {}, flash }: Props) {
    const { auth } = usePage().props as any;
    const [showFilters, setShowFilters] = useState(false); // Kept if needed for mobile/other
    const [itemsPerPage, setItemsPerPage] = useState(filters.per_page || '10');
    const [currentLang, setCurrentLang] = useState(getLanguage());
    const [, forceUpdate] = useReducer(x => x + 1, 0);
    const { data, setData, get, processing } = useForm(filters);

    const handleAddProduct = (e: React.MouseEvent) => {
        const company = auth?.user?.company;
        if (company?.package_details?.max_products) {
            const maxProducts = company.package_details.max_products;
            const currentProducts = company.current_products_count || 0;

            if (currentProducts >= maxProducts) {
                e.preventDefault();
                toast.error(
                    t('You have reached the maximum number of products allowed for your package ', {
                        limit: maxProducts,
                    }),
                    {
                        duration: Infinity,
                        description: t('Please upgrade your package to add more products.'),

                    }
                );
            }
        }
    };

    // Sample data for demonstration
    const sampleProducts: Product[] = [

    ];

    // Debounced filtering
    const initialRender = useRef(true);

    useEffect(() => {
        if (initialRender.current) {
            initialRender.current = false;
            return;
        }

        const timeoutId = setTimeout(() => {
            router.get(
                '/malibo/products',
                {
                    search: data.search,
                    status: data.status,
                    barcode: data.barcode,
                    is_service: data.is_service,
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
    }, [data.search, data.status, data.barcode, data.is_service, itemsPerPage]);

    // Safe wrapper for products data to prevent runtime errors
    const safeProducts = {
        data: items.data || [],
        links: items.links || [],
        meta: items.meta || {
            from: items.from || 0,
            to: items.to || 0,
            total: items.total || 0,
            current_page: items.current_page || 1,
            last_page: items.last_page || 1,
        }
    };

    // Use sample data if no real data is available (can be removed if not needed)
    const displayProducts = safeProducts.data.length > 0 ? safeProducts.data : sampleProducts;
    const displayMeta = safeProducts.data.length > 0 ? safeProducts.meta : {
        from: 0,
        to: 0,
        total: 0
    };

    const handleClearFilters = () => {
        setData({ search: '', status: '', barcode: '', is_service: '' });
        setItemsPerPage('10');
        //router.get('/pos/products'); // Let the effect handle it
    };

    // Malibo products are read-only - no toggle or delete actions

    const formatPrice = (price: number) => {
        return `Rs ${price.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const handleLanguageChange = (lang: string) => {
        setLanguage(lang);
        setCurrentLang(lang);
        forceUpdate(); // Force re-render to update translations
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="min-h-screen bg-slate-50">
                {/* Radiant Background Effects - These should not block clicks */}
                <Head title={t('product.titles.productManagement')} />

                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4">
                            <div className="flex items-center space-x-3">
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <Package className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">
                                        Malibo Products
                                    </h1>
                                    <p className="text-xs text-white/80">
                                        Shared products from Vismass
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-4 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        {/* Flash Messages */}
                        {flash?.success && (
                            <div className="mb-4 rounded-lg bg-green-100 p-4 text-green-800 dark:bg-green-900 dark:text-green-200">
                                {flash.success}
                            </div>
                        )}
                        {flash?.error && (
                            <div className="mb-4 rounded-lg bg-red-100 p-4 text-red-800 dark:bg-red-900 dark:text-red-200">
                                {flash.error}
                            </div>
                        )}

                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-4">
                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue p-2 shadow-sm">
                                        <Package className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('product.list.totalProducts')}</p>
                                        <p className="text-lg font-bold text-gray-900">{stats?.total ?? displayMeta.total}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-orange-500 p-2 shadow-sm">
                                        <CheckCircle2 className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('product.list.activeProducts')}</p>
                                        <p className="text-lg font-bold text-gray-900">
                                            {stats?.active ?? 0}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-grey p-2 shadow-sm">
                                        <Barcode className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('product.list.withBarcode')}</p>
                                        <p className="text-lg font-bold text-gray-900">
                                            {stats?.with_barcode ?? 0}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-emerald-500 p-2 shadow-sm">
                                        <Tag className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Service Items')}</p>
                                        <p className="text-lg font-bold text-gray-900">
                                            {stats?.services ?? 0}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-vismass-blue/60 p-2 shadow-sm">
                                        <Tag className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('product.list.vatItems')}</p>
                                        <p className="text-lg font-bold text-gray-900">
                                            {stats?.vat_items ?? 0}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="group relative overflow-hidden rounded-lg bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md border border-slate-200">
                                <div className="flex items-center">
                                    <div className="rounded-lg bg-red-500 p-2 shadow-sm">
                                        <RefreshCw className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-xs font-medium text-gray-600">{t('Inactive Products')}</p>
                                        <p className="text-lg font-bold text-gray-900">
                                            {stats?.inactive ?? 0}
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
                                            {t('product.titles.productManagement')}
                                        </h3>
                                        <p className="text-white/80 text-xs mt-0.5">
                                            {t('View and manage all products')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4">
                                {/* Filters */}
                                <div className="bg-slate-50 p-3 rounded-lg mb-4 border border-slate-200">
                                    <form onSubmit={(e) => e.preventDefault()} className="space-y-3 md:space-y-0 md:flex md:space-x-3">
                                        <div className="flex-1">
                                            <div className="relative">
                                                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder={t('product.list.searchPlaceholder')}
                                                    value={data.search || ''}
                                                    onChange={(e) => setData('search', e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                />
                                            </div>
                                        </div>

                                        <div className="md:w-48">
                                            <div className="relative">
                                                <Filter className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <select
                                                    value={data.status || ''}
                                                    onChange={(e) => setData('status', e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                >
                                                    <option value="">{t('product.list.allStatus')}</option>
                                                    <option value="active">{t('product.status.active')}</option>
                                                    <option value="inactive">{t('product.status.inactive')}</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="md:w-48">
                                            <div className="relative">
                                                <Tag className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <select
                                                    value={data.is_service || ''}
                                                    onChange={(e) => setData('is_service', e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-vismass-blue focus:border-vismass-blue transition"
                                                >
                                                    <option value="">{t('All Items')}</option>
                                                    <option value="yes">{t('Service Items Only')}</option>
                                                    <option value="no">{t('Products Only')}</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="w-full sm:w-auto">
                                            <select
                                                value={itemsPerPage}
                                                onChange={(e) => setItemsPerPage(e.target.value)}
                                                className="w-full sm:w-32 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-vismass-blue focus:ring-2 focus:ring-vismass-blue/20"
                                            >
                                                <option value="10">10 / {t('Page')}</option>
                                                <option value="25">25 / {t('Page')}</option>
                                                <option value="50">50 / {t('Page')}</option>
                                                <option value="100">100 / {t('Page')}</option>
                                            </select>
                                        </div>

                                        <div className="flex space-x-2">
                                            <button
                                                type="button"
                                                onClick={handleClearFilters}
                                                className="inline-flex items-center bg-gray-200 text-gray-700 px-4 py-2 text-sm rounded-lg hover:bg-gray-300 transition-all duration-200 font-medium"
                                            >
                                                <Filter className="mr-1.5 h-3.5 w-3.5" />
                                                {t('Clear')}
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                {/* Product List */}
                                {displayProducts.length > 0 ? (
                                    <div className="overflow-hidden rounded-lg border border-gray-200">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gradient-to-r from-sky-50 to-blue-50">
                                                <tr>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('product.list.product')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('product.list.codeBarcode')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('product.list.pricing')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('product.list.stock')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('product.fields.status')}
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-sky-900 uppercase tracking-wider">
                                                        {t('product.list.actions')}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {displayProducts.map((product) => (
                                                    <tr
                                                        key={product.ItmKy}
                                                        className="hover:bg-sky-50/50 transition-colors duration-150"
                                                    >
                                                        <td className="px-4 py-2.5">
                                                            <div className="flex items-center">
                                                                <div className="h-8 w-8 shrink-0">
                                                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-100 to-blue-100">
                                                                        <Package className="h-3.5 w-3.5 text-sky-600" />
                                                                    </div>
                                                                </div>
                                                                <div className="ml-2.5">
                                                                    <div className="text-xs font-medium text-gray-900">
                                                                        {product.ItmNm}
                                                                    </div>
                                                                    {product.EnglishName && (
                                                                        <div className="text-[10px] text-gray-500">
                                                                            {product.EnglishName}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <div className="text-xs text-gray-900">
                                                                <div className="flex items-center">
                                                                    <Tag className="mr-1 h-3 w-3 text-gray-400" />
                                                                    {product.ItemCode}
                                                                </div>
                                                                {product.BarCode && (
                                                                    <div className="mt-0.5 flex items-center text-xs text-gray-500">
                                                                        <Barcode className="mr-1 h-2.5 w-2.5" />
                                                                        {product.BarCode}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right">
                                                            <div className="text-xs font-medium text-gray-900">
                                                                {formatPrice(product.SlsPri)}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right">
                                                            <div className="text-xs text-gray-900">
                                                                {product.branch_reorder_level !== null &&
                                                                    product.branch_reorder_level !== undefined ? (
                                                                    <span
                                                                        className={`font-medium ${(product.branch_reorder_level || 0) > 10 ? 'text-green-600' : 'text-amber-600'}`}
                                                                    >
                                                                        {product.branch_reorder_level}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[10px] text-gray-400">Not Set</span>
                                                                )}
                                                                <div className="text-[10px] text-gray-500">
                                                                    {t('product.fields.reorderLevel')}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            <span
                                                                className={`px-2 py-0.5 text-xs font-medium rounded-full ${!product.fInAct
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : 'bg-red-100 text-red-800'
                                                                    }`}
                                                            >
                                                                {!product.fInAct ? t('Active') : t('Inactive')}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap text-xs font-medium">
                                                            <Link
                                                                href={`/malibo/products/${product.ItmKy}`}
                                                                className="inline-flex items-center text-sky-600 hover:text-sky-800"
                                                            >
                                                                <Eye className="mr-1 h-3.5 w-3.5" />
                                                                {t('View')}
                                                            </Link>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <div className="mx-auto h-10 w-10 text-gray-400 mb-3">
                                            <Package className="h-10 w-10" />
                                        </div>
                                        <h3 className="text-xs font-medium text-gray-900 mb-1.5">{t('product.list.noProductsFound')}</h3>
                                        <p className="text-xs text-gray-500">
                                            {t('No products shared with Malibo yet')}
                                        </p>
                                    </div>
                                )}

                                {/* Pagination */}
                                {(safeProducts.links || []).length > 0 && (
                                    <Pagination links={safeProducts.links} meta={safeProducts.meta} />
                                )}
                            </div>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="mt-6 border-t border-sky-200 bg-gradient-to-r from-white to-sky-50">
                    <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
                        <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2">
                            <p className="text-xs text-gray-500">© VISMASS {t('product.titles.productManagement')} • v1.0.0</p>
                        </div>
                    </div>
                </footer>
            </div>

        </AppLayout>
    );
}
import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, usePage, router } from '@inertiajs/react';
import {
    Edit,
    Package,
    CheckCircle,
    DollarSign,
    ArrowLeft,
    Trash2,
    CreditCard,
} from 'lucide-react';
import ConfirmationModal from '@/components/ui/confirmation-modal';
import { useEffect, useState } from 'react';

interface SupplierOption {
    AdrKy: number;
    AccKy: any;
    full_name: any;
    FstNm: any;
    id: number;
    name: string;
}

interface CategoryOption {
    id: string;
    name: string;
}

interface UnitOption {
    id: number;
    name: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: t('Dashboard'),
        href: '/dashboard',
    },
    {
        title: t('Product Management'),
        href: '/pos/products',
    },
    {
        title: t('Product Details'),
        href: '#',
    },
];

interface ItemPriceDet {
    ItemPriceKey: number;
    batch_no: string;
    CosPri?: number;
    SlsPri?: number;
    NCostPrice?: number;
    WholePrice?: number;
    VehicleSalePrice?: number;
    ChangedDate: string;
    RtQty1?: number;
    RtDis1?: number;
    RtQty2?: number;
    RtDis2?: number;
    CredQty1?: number;
    CredDis1?: number;
    CredQty2?: number;
    CredDis2?: number;
}

interface PurchaseDet {
    PerchaseDetKy: number;
    batch_no: string;
    CostPrice?: number;
    SalePrice?: number;
    NormalCost?: number;
    WholePrice?: number;
    VehicleSalePrice?: number;
    created_at: string;
    purchase?: {
        GRNDate: string;
        company_code: string;
        PurchaseNo: number;
    };
}

interface Product {
    ItmKy: number;
    ItemCode: string;
    BarCode?: string;
    ItmNm: string;
    EnglishName?: string;
    CosPri?: number;
    SlsPri?: number;
    ReOrdlLvl?: number;
    Status?: string;
    VATItem?: boolean;
    fInAct?: boolean;
    catkey?: string;
    SupKey?: number;
    UnitKy?: number;
    NCostPrice?: number;
    VehicleSalePrice?: number;
    WholePrice?: number;
    free_issue_scheme_buy_qty?: number;
    free_issue_scheme_get_qty?: number;
    RtQty1?: number;
    RtDis1?: number;
    RtQty2?: number;
    RtDis2?: number;
    CredQty1?: number;
    CredDis1?: number;
    CredQty2?: number;
    CredDis2?: number;
    batch_no?: string;
    brand_id?: number;
    // brand may be a simple string (legacy) or an object when eager-loaded
    brand?: string | { name?: string };
    model?: string;
    serial_number?: string;
    warranty?: string;
    transfer_unit_id?: number;
    receiving_unit_id?: number;
    transfer_conversion_factor?: number;
    share_with_other_unit?: boolean;
    available_business_units?: string[];
    all_price_details?: ItemPriceDet[];
    purchase_details?: PurchaseDet[];
}

interface Props {
    item: Product;
    suppliers?: SupplierOption[];
    categories?: CategoryOption[];
    units?: UnitOption[];
    canDelete: boolean;
    canManage: boolean;
}

export default function ProductShow({ item, suppliers = [], categories = [], units = [], canDelete, canManage }: Props) {
    const [branchReorderLevel, setBranchReorderLevel] = useState<number | null>(
        null,
    );
    const [hasReorderLevel, setHasReorderLevel] = useState(false);
    const [loading, setLoading] = useState(true);
    const [barcodeQuantity, setBarcodeQuantity] = useState(1);
    const [deleteModal, setDeleteModal] = useState<{
        show: boolean;
        product: Product | null;
    }>({
        show: false,
        product: null,
    });

    // Fetch branch-specific reorder level
    useEffect(() => {
        const fetchReorderLevel = async () => {
            try {
                const response = await fetch(
                    `/pos/api/reorder-level/${item.ItemCode}`,
                    {
                        headers: {
                            Accept: 'application/json',
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                        credentials: 'include',
                    },
                );

                if (response.ok) {
                    const data = await response.json();
                    setBranchReorderLevel(data.reorder_level ?? null);
                    setHasReorderLevel(data.has_reorder_level || false);
                }
            } catch (error) {
                console.error('Error fetching reorder level:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchReorderLevel();
    }, [item.ItemCode]);

    const formatPrice = (price?: number | string) => {
        const numPrice = typeof price === 'string' ? parseFloat(price) : price;
        if (!numPrice && numPrice !== 0) return 'N/A';
        return `Rs ${numPrice.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatPriceWithoutSymbol = (price?: number | string) => {
        const numPrice = typeof price === 'string' ? parseFloat(price) : price;
        if (!numPrice && numPrice !== 0) return '0.00';
        return numPrice.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const formatDiscount = (value?: number | string) => {
        if (value == null) return '-';
        return Number(value).toFixed(2);
    };

    const latestPrice = item.all_price_details && item.all_price_details.length > 0 
        ? item.all_price_details[0] 
        : null;

    const latestPurchase = item.purchase_details && item.purchase_details.length > 0
        ? item.purchase_details[0]
        : null;

    const displayCosPri = item.CosPri && item.CosPri > 0 
        ? item.CosPri 
        : (latestPrice?.CosPri || latestPurchase?.CostPrice || 0);

    const displaySlsPri = item.SlsPri && item.SlsPri > 0 
        ? item.SlsPri 
        : (latestPrice?.SlsPri || latestPurchase?.SalePrice || 0);

    const displayNCostPrice = item.NCostPrice && item.NCostPrice > 0 
        ? item.NCostPrice 
        : (latestPrice?.NCostPrice || latestPurchase?.NormalCost || 0);

    const displayWholePrice = item.WholePrice && item.WholePrice > 0 
        ? item.WholePrice 
        : (latestPrice?.WholePrice || latestPurchase?.WholePrice || 0);

    const displayVehicleSalePrice = item.VehicleSalePrice && item.VehicleSalePrice > 0 
        ? item.VehicleSalePrice 
        : (latestPrice?.VehicleSalePrice || latestPurchase?.VehicleSalePrice || 0);

    const formatDate = (date?: string) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-GB');
    };

    const formatCurrency = (amount: string | number): string => {
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        return `Rs ${numAmount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // determine name of other unit for crossâ€‘company sharing
    const userCompanyCode = (usePage().props as any).auth?.user?.company_code || '';
    const isMalibo = userCompanyCode.toUpperCase().startsWith('MAL');
    const otherUnitName = isMalibo ? 'Vismass' : 'Malibo';

    const handleDelete = () => {
        setDeleteModal({ show: true, product: item });
    };

    const confirmDelete = () => {
        if (deleteModal.product) {
            router.delete(`/pos/products/${deleteModal.product.ItmKy}`, {
                onSuccess: () => {
                    setDeleteModal({ show: false, product: null });
                },
                onError: () => {
                    setDeleteModal({ show: false, product: null });
                },
            });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Product Details')} - ${item.ItmNm}`} />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-start space-x-3 sm:items-center">
                                <Link
                                    href="/pos/products"
                                    className="rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </Link>
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <Package className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-lg font-bold text-white sm:text-xl">{t('Product Details')}</h1>
                                    <p className="truncate text-xs text-white/80 sm:text-sm">{item.ItmNm} ({item.ItemCode})</p>
                                </div>
                            </div>
                            {canDelete && (
                                <button
                                    onClick={handleDelete}
                                    className="inline-flex w-full items-center justify-center rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white shadow transition-all duration-200 hover:bg-red-600 sm:w-auto"
                                >
                                    <Trash2 className="mr-1.5 h-4 w-4" />
                                    {t('Delete Product')}
                                </button>
                            )}
                            <Link
                                href={`/pos/products/${item.ItmKy}/edit`}
                                className="inline-flex w-full items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-vismass-blue shadow transition-all duration-200 hover:bg-slate-100 sm:w-auto"
                            >
                                <Edit className="mr-1.5 h-4 w-4" />
                                {t('Edit Product')}
                            </Link>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl py-8 sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                            {/* Left Column: col-span-2 */}
                            <div className="lg:col-span-2 space-y-6">

                                {/* Basic Information Card */}
                                <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
                                    <div className="flex items-center space-x-3 mb-6">
                                        <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                            <Package className="w-5 h-5 text-vismass-blue" />
                                        </div>
                                        <h2 className="text-xl font-semibold text-slate-800">{t('Basic Information')}</h2>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <div className="flex items-center space-x-3">
                                                <Package className="w-4 h-4 text-vismass-blue" />
                                                <div>
                                                    <p className="text-sm text-slate-500">{t('Product Name')}</p>
                                                    <p className="font-medium text-slate-800">{item.ItmNm}</p>
                                                </div>
                                            </div>
                                            {item.EnglishName && (
                                                <div className="flex items-center space-x-3">
                                                    <Package className="w-4 h-4 text-vismass-blue" />
                                                    <div>
                                                        <p className="text-sm text-slate-500">{t('English Name')}</p>
                                                        <p className="font-medium text-slate-800">{item.EnglishName}</p>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="flex items-center space-x-3">
                                                <CheckCircle className="w-4 h-4 text-vismass-blue" />
                                                <div>
                                                    <p className="text-sm text-slate-500">{t('Item Code')}</p>
                                                    <p className="font-medium text-slate-800">{item.ItemCode}</p>
                                                </div>
                                            </div>
                                            {item.BarCode && (
                                                <div className="flex items-center space-x-3">
                                                    <CheckCircle className="w-4 h-4 text-vismass-blue" />
                                                    <div>
                                                        <p className="text-sm text-slate-500">{t('Barcode')}</p>
                                                        <p className="font-medium text-slate-800">{item.BarCode}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {item.catkey && (
                                                <div className="flex items-center space-x-3">
                                                    <CheckCircle className="w-4 h-4 text-vismass-blue" />
                                                    <div>
                                                        <p className="text-sm text-slate-500">{t('product.fields.category')}</p>
                                                        <p className="font-medium text-slate-800">{categories.find(c => c.id === item.catkey)?.name || item.catkey}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {item.UnitKy && (
                                                <div className="flex items-center space-x-3">
                                                    <CheckCircle className="w-4 h-4 text-vismass-blue" />
                                                    <div>
                                                        <p className="text-sm text-slate-500">{t('product.fields.unit')}</p>
                                                        <p className="font-medium text-slate-800">{units.find(u => u.id === item.UnitKy)?.name || item.UnitKy}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex items-center space-x-3">
                                                <CheckCircle className="w-4 h-4 text-vismass-blue" />
                                                <div>
                                                    <p className="text-sm text-slate-500">{t('Status')}</p>
                                                    <p className={`font-medium ${!item.fInAct ? 'text-green-600' : 'text-red-600'}`}>
                                                        {!item.fInAct ? t('Active') : t('Inactive')}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-3">
                                                <CheckCircle className="w-4 h-4 text-vismass-blue" />
                                                <div>
                                                    <p className="text-sm text-slate-500">{t('VAT Item')}</p>
                                                    <p className={`font-medium ${item.VATItem ? 'text-blue-600' : 'text-gray-600'}`}>
                                                        {item.VATItem ? t('Yes') : t('No')}
                                                    </p>
                                                </div>
                                            </div>
                                            {item.SupKey && (
                                                <div className="flex items-center space-x-3">
                                                    <CheckCircle className="w-4 h-4 text-vismass-blue" />
                                                    <div>
                                                        <p className="text-sm text-slate-500">{t('Supplier')}</p>
                                                        <p className="font-medium text-slate-800">{suppliers.find(s => s.AdrKy === item.SupKey)?.full_name || 'Unknown'}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {item.batch_no && (
                                                <div className="flex items-center space-x-3">
                                                    <CheckCircle className="w-4 h-4 text-vismass-blue" />
                                                    <div>
                                                        <p className="text-sm text-slate-500">{t('Batch Number')}</p>
                                                        <p className="font-medium text-slate-800">{item.batch_no}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {(typeof item.brand === 'object' ? item.brand?.name : item.brand) && (
                                                <div className="flex items-center space-x-3">
                                                    <CheckCircle className="w-4 h-4 text-vismass-blue" />
                                                    <div>
                                                        <p className="text-sm text-slate-500">{t('Brand')}</p>
                                                        <p className="font-medium text-slate-800">{typeof item.brand === 'object' ? item.brand?.name : item.brand}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {item.model && (
                                                <div className="flex items-center space-x-3">
                                                    <CheckCircle className="w-4 h-4 text-vismass-blue" />
                                                    <div>
                                                        <p className="text-sm text-slate-500">{t('Model')}</p>
                                                        <p className="font-medium text-slate-800">{item.model}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {item.serial_number && (
                                                <div className="flex items-center space-x-3">
                                                    <CheckCircle className="w-4 h-4 text-vismass-blue" />
                                                    <div>
                                                        <p className="text-sm text-slate-500">{t('Serial Number')}</p>
                                                        <p className="font-medium text-slate-800">{item.serial_number}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {item.warranty && (
                                                <div className="flex items-center space-x-3">
                                                    <CheckCircle className="w-4 h-4 text-vismass-blue" />
                                                    <div>
                                                        <p className="text-sm text-slate-500">{t('Warranty')}</p>
                                                        <p className="font-medium text-slate-800">{item.warranty}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Pricing Information Card */}
                                <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
                                    <div className="flex items-center space-x-3 mb-6">
                                        <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                            <DollarSign className="w-5 h-5 text-vismass-blue" />
                                        </div>
                                        <h2 className="text-xl font-semibold text-slate-800">{t('Pricing Information')}</h2>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <div className="flex items-center space-x-3">
                                                <DollarSign className="w-4 h-4 text-vismass-blue" />
                                                <div>
                                                    <p className="text-sm text-slate-500">{t('Cost Price')}</p>
                                                    <p className="font-medium text-orange-600">
                                                        {formatPrice(displayCosPri)}
                                                        {item.CosPri === 0 && (latestPrice || latestPurchase) && (
                                                            <span className="ml-2 text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">Latest Batch</span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-3">
                                                <DollarSign className="w-4 h-4 text-vismass-blue" />
                                                <div>
                                                    <p className="text-sm text-slate-500">{t('Sale Price')}</p>
                                                    <p className="font-medium text-green-600">
                                                        {formatPrice(displaySlsPri)}
                                                        {item.SlsPri === 0 && (latestPrice || latestPurchase) && (
                                                            <span className="ml-2 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Latest Batch</span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                            {(displayNCostPrice > 0) && (
                                                <div className="flex items-center space-x-3">
                                                    <DollarSign className="w-4 h-4 text-vismass-blue" />
                                                    <div>
                                                        <p className="text-sm text-slate-500">{t('Net Cost Price')}</p>
                                                        <p className="font-medium text-slate-800">{formatPrice(displayNCostPrice)}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {(displayVehicleSalePrice > 0) && (
                                                <div className="flex items-center space-x-3">
                                                    <DollarSign className="w-4 h-4 text-vismass-blue" />
                                                    <div>
                                                        <p className="text-sm text-slate-500">{t('Vehicle Sale Price')}</p>
                                                        <p className="font-medium text-slate-800">{formatPrice(displayVehicleSalePrice)}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {/* {(displayWholePrice > 0) && (
                                                <div className="flex items-center space-x-3">
                                                    <DollarSign className="w-4 h-4 text-vismass-blue" />
                                                    <div>
                                                        <p className="text-sm text-slate-500">{t('Wholesale Price')}</p>
                                                        <p className="font-medium text-slate-800">{formatPrice(displayWholePrice)}</p>
                                                    </div>
                                                </div>
                                            )} */}
                                            <div className="flex items-center space-x-3">
                                                <CheckCircle className="w-4 h-4 text-vismass-blue" />
                                                <div>
                                                    <p className="text-sm text-slate-500">{t('Reorder Level')}</p>
                                                    <p className="font-medium text-slate-800">
                                                        {loading ? 'Loading...' : (hasReorderLevel ? branchReorderLevel : 'Not Set')}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            {(item.free_issue_scheme_buy_qty || item.free_issue_scheme_get_qty) && (
                                                <div className="flex items-center space-x-3">
                                                    <CheckCircle className="w-4 h-4 text-indigo-600" />
                                                    <div>
                                                        <p className="text-sm text-slate-500">{t('Free Issue Scheme')}</p>
                                                        <p className="font-medium text-indigo-700">
                                                            {t('Buy')} {item.free_issue_scheme_buy_qty || '?'} {t('Get')} {item.free_issue_scheme_get_qty || '?'} {t('Free')}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                    
                                            {(item.RtQty1 != null || item.RtDis1 != null || item.RtQty2 != null || item.RtDis2 != null) && (
                                                <div className="rounded-lg border border-slate-200 bg-white p-4">
                                                    <div className="flex items-center space-x-3 mb-3">
                                                        <div className="p-1.5 bg-blue-100 rounded-lg">
                                                            <Package className="w-4 h-4 text-blue-600" />
                                                        </div>
                                                        <h3 className="text-sm font-semibold text-slate-800">{t('Cash/Bank Transfer Discount')}</h3>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="text-center p-2 bg-slate-50 rounded">
                                                            <p className="text-xs text-slate-500">Min Qty 1</p>
                                                            <p className="font-medium text-slate-800">{formatDiscount(item.RtQty1)}</p>
                                                        </div>
                                                        <div className="text-center p-2 bg-slate-50 rounded">
                                                            <p className="text-xs text-slate-500">Min Dis 1</p>
                                                            <p className="font-medium text-slate-800">{formatDiscount(item.RtDis1)}</p>
                                                        </div>
                                                        <div className="text-center p-2 bg-slate-50 rounded">
                                                            <p className="text-xs text-slate-500">Min Qty 2</p>
                                                            <p className="font-medium text-slate-800">{formatDiscount(item.RtQty2)}</p>
                                                        </div>
                                                        <div className="text-center p-2 bg-slate-50 rounded">
                                                            <p className="text-xs text-slate-500">Min Dis 2</p>
                                                            <p className="font-medium text-slate-800">{formatDiscount(item.RtDis2)}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            {(item.CredQty1 != null || item.CredDis1 != null || item.CredQty2 != null || item.CredDis2 != null) && (
                                                <div className="rounded-lg border border-slate-200 bg-white p-4">
                                                    <div className="flex items-center space-x-3 mb-3">
                                                        <div className="p-1.5 bg-blue-100 rounded-lg">
                                                            <CreditCard className="w-4 h-4 text-blue-600" />
                                                        </div>
                                                        <h3 className="text-sm font-semibold text-slate-800">{t('Credit/Card Discounts')}</h3>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="text-center p-2 bg-slate-50 rounded">
                                                            <p className="text-xs text-slate-500">Min Qty 1</p>
                                                            <p className="font-medium text-slate-800">{formatDiscount(item.CredQty1)}</p>
                                                        </div>
                                                        <div className="text-center p-2 bg-slate-50 rounded">
                                                            <p className="text-xs text-slate-500">Min Dis 1</p>
                                                            <p className="font-medium text-slate-800">{formatDiscount(item.CredDis1)}</p>
                                                        </div>
                                                        <div className="text-center p-2 bg-slate-50 rounded">
                                                            <p className="text-xs text-slate-500">Min Qty 2</p>
                                                            <p className="font-medium text-slate-800">{formatDiscount(item.CredQty2)}</p>
                                                        </div>
                                                        <div className="text-center p-2 bg-slate-50 rounded">
                                                            <p className="text-xs text-slate-500">Min Dis 2</p>
                                                            <p className="font-medium text-slate-800">{formatDiscount(item.CredDis2)}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            {(item.share_with_other_unit || (item.available_business_units && item.available_business_units.length > 0)) && (
                                                <div className="flex items-center space-x-3">
                                                    <CheckCircle className="w-4 h-4 text-vismass-blue" />
                                                    <div>
                                                        <p className="text-sm text-slate-500">{t('Shared Business Units')}</p>
                                                        <p className="font-medium text-slate-800">
                                                            {item.available_business_units?.length ? item.available_business_units.join(', ') : (item.share_with_other_unit ? otherUnitName : t('No'))}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                            {(item.transfer_unit_id || item.receiving_unit_id) && (
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-700 mb-2">{t('Cross-Company Conversion')}</p>
                                                    <div className="space-y-2">
                                                        {item.transfer_unit_id && (
                                                            <div className="flex items-center space-x-3">
                                                                <CheckCircle className="w-4 h-4 text-vismass-blue" />
                                                                <div>
                                                                    <p className="text-sm text-slate-500">{t('Sending Unit')}</p>
                                                                    <p className="font-medium text-slate-800">{units.find(u => u.id === item.transfer_unit_id)?.name || item.transfer_unit_id}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {item.receiving_unit_id && (
                                                            <div className="flex items-center space-x-3">
                                                                <CheckCircle className="w-4 h-4 text-vismass-blue" />
                                                                <div>
                                                                    <p className="text-sm text-slate-500">{t('Receiving Unit')}</p>
                                                                    <p className="font-medium text-slate-800">{units.find(u => u.id === item.receiving_unit_id)?.name || item.receiving_unit_id}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {item.transfer_conversion_factor && (
                                                            <div className="flex items-center space-x-3">
                                                                <CheckCircle className="w-4 h-4 text-vismass-blue" />
                                                                <div>
                                                                    <p className="text-sm text-slate-500">{t('Conversion Factor')}</p>
                                                                    <p className="font-medium text-slate-800">{item.transfer_conversion_factor}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Batch Information (from Purchase History) */}
                                {item.purchase_details && item.purchase_details.length > 0 && (
                                    <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 overflow-hidden">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center space-x-3">
                                                <div className="p-2 bg-indigo-100 rounded-lg">
                                                    <CheckCircle className="w-5 h-5 text-indigo-600" />
                                                </div>
                                                <h2 className="text-xl font-semibold text-slate-800">{t('Batch Information')}</h2>
                                            </div>
                                            <span className="text-xs font-medium bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full border border-indigo-100">
                                                {item.purchase_details?.length} {t('Entries Found')}
                                            </span>
                                        </div>
                                        <div className="overflow-x-auto -mx-6">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-50 border-y border-slate-200">
                                                        <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">{t('Batch No')}</th>
                                                        <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider text-right">{t('Cost Price (Rs)')}</th>
                                                        <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider text-right">{t('Sale Price (Rs)')}</th>
                                                        <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">{t('GRN No')}</th>
                                                        <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">{t('Date')}</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {item.purchase_details?.map((detail, idx) => (
                                                        <tr key={detail.PerchaseDetKy} className="hover:bg-slate-50 transition-colors">
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center space-x-2">
                                                                    <span className="font-medium text-slate-800">{detail.batch_no || 'N/A'}</span>
                                                                    {idx === 0 && (
                                                                        <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded border border-green-200 uppercase tracking-tighter">Latest</span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-right font-medium text-orange-600">{formatPriceWithoutSymbol(detail.CostPrice)}</td>
                                                            <td className="px-6 py-4 text-right font-medium text-green-600">{formatPriceWithoutSymbol(detail.SalePrice)}</td>
                                                            <td className="px-6 py-4 text-slate-600 text-sm">
                                                                {detail.purchase ? `${detail.purchase.company_code}-${detail.purchase.PurchaseNo.toString().padStart(6, '0')}` : 'N/A'}
                                                            </td>
                                                            <td className="px-6 py-4 text-slate-500 text-sm">{formatDate(detail.purchase?.GRNDate || detail.created_at)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right Sidebar */}
                            <div className="space-y-6">
                                {/* Product Stats Card */}
                                <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
                                    <div className="flex items-center space-x-3 mb-6">
                                        <div className="p-2 bg-vismass-blue/10 rounded-lg">
                                            <Package className="w-5 h-5 text-vismass-blue" />
                                        </div>
                                        <h2 className="text-xl font-semibold text-slate-800">{t('Product Stats')}</h2>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center space-x-3">
                                            <CheckCircle className="w-4 h-4 text-vismass-blue" />
                                            <div>
                                                <p className="text-sm text-slate-500">{t('Status')}</p>
                                                <p className={`font-medium ${!item.fInAct ? 'text-green-600' : 'text-red-600'}`}>
                                                    {!item.fInAct ? t('Active') : t('Inactive')}
                                                </p>
                                            </div>
                                        </div>
                                            <div className="flex items-center space-x-3">
                                                <DollarSign className="w-4 h-4 text-green-600" />
                                                <div>
                                                    <p className="text-sm text-slate-500">{t('Sale Price')}</p>
                                                    <p className="font-medium text-green-600">{formatPrice(displaySlsPri)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-3">
                                                <DollarSign className="w-4 h-4 text-orange-600" />
                                                <div>
                                                    <p className="text-sm text-slate-500">{t('Cost Price')}</p>
                                                    <p className="font-medium text-orange-600">{formatPrice(displayCosPri)}</p>
                                                </div>
                                            </div>
                                        <div className="flex items-center space-x-3">
                                            <CheckCircle className="w-4 h-4 text-purple-600" />
                                            <div>
                                                <p className="text-sm text-slate-500">{t('VAT Item')}</p>
                                                <p className={`font-medium ${item.VATItem ? 'text-blue-600' : 'text-gray-600'}`}>
                                                    {item.VATItem ? t('Yes') : t('No')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </main>

                {/* Footer */}
                <div className="text-center mt-12 text-slate-600">
                    <p className="text-sm">{t('Product details â€¢ Part of your distribution network')}</p>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={deleteModal.show}
                onClose={() => setDeleteModal({ show: false, product: null })}
                onConfirm={confirmDelete}
                title={t('product.list.deleteProduct')}
                message={
                    deleteModal.product
                        ? `${t('product.list.areYouSureDelete')} "${deleteModal.product.ItmNm}"? ${t('product.list.cannotBeUndone')}`
                        : ''
                }
                type="danger"
                confirmText={t('product.list.delete')}
                cancelText={t('product.list.cancel')}
            />
        </AppLayout>
    );
}

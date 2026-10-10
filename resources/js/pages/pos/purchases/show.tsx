import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    Download,
    Edit,
    FileText,
    Building,
    Package,
    DollarSign,
    AlertCircle,
    Trash2
} from 'lucide-react';
import { useState } from 'react';
import ConfirmationModal from '@/components/ui/confirmation-modal';

interface PurchaseItem {
    id: number;
    product_id: number;
    product_code: string;
    product_name: string;
    qty: number;
    cost_price: number;
    brand: string;
    model: string;
    serial_number: string;
    warranty: string;
    item_discount: number;
    amount: number;
    free_qty: number;
    discount_rate: number;
    cus_discount_rate?: number;
    cus_discount_type?: 'fixed' | 'percentage';
    retail_price?: number;
    wholesale_price?: number;
    cc_price?: number;
    discount_type?: 'fixed' | 'percentage';
    item_type?: 'product' | 'printer';
}

interface SupplierReturn {
    id: number;
    date: string;
    quantity: number;
    return_value: number;
    reason: string;
    status: string;
    serial_number?: string;
    item_key?: number;
    purchase_det_key?: number;
}

interface Purchase {
    id: number;
    purchase_no: string;
    date: string;
    supplier_code: string;
    supplier_name: string;
    supplier_invoice_no?: string;
    company_code: string;
    branch_code?: string;
    branch_name?: string;
    purchase_type: string;
    description?: string;
    batch_no?: string;
    total_amount: number;
    total_discount: number;
    total_payable: number;
    status: string;
    is_used: boolean;
    is_inactive: boolean;
    created_at: string;
    updated_at: string;
    items: PurchaseItem[];
    returns: SupplierReturn[];
    can_edit: boolean;
    can_delete: boolean;
}

interface Props {
    purchase: Purchase;
}

export default function ShowPurchase({ purchase }: Props) {
    const { props } = usePage<any>();
    const isSuperAdmin = props?.auth?.user?.user_type === 'super_admin';

    const [deleteModal, setDeleteModal] = useState(false);

    // Check if this is a printer GRN (only if ALL items are printers)
    const hasPrinterItems = purchase.items.some(item => item.item_type === 'printer' || !!item.serial_number);
    const isPrinterGrn = purchase.items.length > 0 && 
        purchase.items.every(item => item.item_type === 'printer' || !!item.serial_number);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('Dashboard'), href: '/dashboard' },
        // { title: t('POS System'), href: '/pos' },
        { title: t('Purchases (GRN)'), href: '/pos/purchases' },
        { title: purchase.purchase_no, href: '#' },
    ];

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-GB', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
    };

    const formatCurrency = (amount: number) => {
        return `Rs ${(amount || 0).toLocaleString('en-GB', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    };

    const getStatusColor = (status: string) => {
        const map: Record<string, { bg: string; text: string; label: string }> = {
            A: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Active' },
            P: { bg: 'bg-green-100', text: 'text-green-800', label: 'Posted' },
            I: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Inactive' },
        };
        return map[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Unknown' };
    };

    const confirmDelete = () => {
        router.delete(`/pos/purchases/${purchase.id}`, {
            onSuccess: () => {
                router.visit('/pos/purchases');
            },
        });
    };

    const statusColor = getStatusColor(purchase.status);

    // Group returns by item to show in table
    const itemReturns = purchase.returns.reduce((acc, ret) => {
        const key = ret.purchase_det_key || ret.item_key;
        if (key) {
            acc[key] = (acc[key] || 0) + ret.quantity;
        }
        return acc;
    }, {} as Record<number, number>);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Purchase ${purchase.purchase_no}`} />

            <div className="min-h-screen bg-slate-50 pb-12">
                {/* Header */}
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-start space-x-3 sm:items-center">
                                <Link
                                    href="/pos/purchases"
                                    className="rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </Link>
                                <div className="rounded-lg bg-white/20 p-2 shadow">
                                    <FileText className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="truncate text-lg font-bold text-white sm:text-xl">{purchase.purchase_no}</h1>
                                    <p className="text-xs text-white/80 sm:text-sm">{t('Purchase Details & Items')}</p>
                                </div>
                            </div>

                            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:space-x-2">
                                <button
                                    onClick={() => window.open(`/pos/purchases/${purchase.id}/print-barcodes`, '_blank')}
                                    className="inline-flex w-full items-center justify-center rounded-lg bg-white/20 px-3 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-white/30 sm:w-auto"
                                >
                                    <Package className="mr-1.5 h-4 w-4" />
                                    {t('Print Barcodes')}
                                </button>
                                <button
                                    onClick={() => window.open(`/pos/purchases/${purchase.id}/download-pdf`, '_blank')}
                                    className="inline-flex w-full items-center justify-center rounded-lg bg-white/20 px-3 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-white/30 sm:w-auto"
                                >
                                    <Download className="mr-1.5 h-4 w-4" />
                                    {t('Download PDF')}
                                </button>
                                {purchase.can_edit && (
                                    <Link
                                        href={`/pos/purchases/${purchase.id}/edit`}
                                        className="inline-flex w-full items-center justify-center rounded-lg bg-white px-3 py-2 text-sm font-medium text-vismass-blue transition-all duration-200 hover:bg-slate-100 sm:w-auto"
                                    >
                                        <Edit className="mr-1.5 h-4 w-4" />
                                        {t('Edit')}
                                    </Link>
                                )}
                                {purchase.can_delete && isSuperAdmin && (
                                    <button
                                        onClick={() => setDeleteModal(true)}
                                        className="inline-flex w-full items-center justify-center rounded-lg bg-red-500 px-3 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-red-600 sm:w-auto"
                                    >
                                        <Trash2 className="mr-1.5 h-4 w-4" />
                                        {t('Delete')}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
                    <div className="space-y-4 sm:space-y-6">
                        {/* Summary Badges if returns exist */}
                        {purchase.returns.length > 0 && (
                            <div className="flex items-center space-x-2 bg-orange-50 border border-orange-200 p-3 rounded-lg animate-pulse">
                                <AlertCircle className="w-5 h-5 text-orange-600" />
                                <span className="text-sm font-medium text-orange-800">
                                    {t('Notice: Items from this purchase have been returned.')}
                                </span>
                            </div>
                        )}

                        {/* Purchase Information */}
                        <div className="rounded-lg border border-slate-200 bg-white shadow">
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-6 py-3">
                                <h2 className="text-lg font-semibold text-white">{t('Purchase Information')}</h2>
                            </div>

                            <div className="p-4 sm:p-6">
                                <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
                                    <div>
                                        <p className="text-sm font-medium text-gray-600 flex items-center">
                                            <FileText className="w-4 h-4 mr-2 text-vismass-blue" />
                                            {t('Purchase No')}
                                        </p>
                                        <p className="text-lg font-semibold text-gray-900 mt-1">{purchase.purchase_no}</p>
                                    </div>

                                    <div>
                                        <p className="text-sm font-medium text-gray-600 flex items-center">
                                            <Package className="w-4 h-4 mr-2 text-vismass-blue" />
                                            {t('Batch No')}
                                        </p>
                                        <p className="text-lg font-semibold text-gray-900 mt-1">{purchase.batch_no || 'N/A'}</p>
                                    </div>

                                    <div>
                                        <p className="text-sm font-medium text-gray-600">{t('Supplier')}</p>
                                        <p className="text-base font-semibold text-gray-900 mt-1">
                                            {purchase.supplier_name}
                                            {purchase.supplier_code && (
                                                <span className="text-sm text-gray-600 ml-2">({purchase.supplier_code})</span>
                                            )}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-sm font-medium text-gray-600 flex items-center">
                                            <Building className="w-4 h-4 mr-2 text-vismass-blue" />
                                            {t('Company')}
                                        </p>
                                        <p className="text-base font-semibold text-gray-900 mt-1">{purchase.company_code}</p>
                                    </div>

                                    <div>
                                        <p className="text-sm font-medium text-gray-600 flex items-center">
                                            <Building className="w-4 h-4 mr-2 text-vismass-blue" />
                                            {t('Branch / Section')}
                                        </p>
                                        <p className="text-base font-semibold text-gray-900 mt-1">
                                            {purchase.branch_name}
                                            {purchase.branch_code && (
                                                <span className="text-sm text-gray-600 ml-2">({purchase.branch_code})</span>
                                            )}
                                        </p>
                                    </div>

                                    {purchase.supplier_invoice_no && (
                                        <div>
                                            <p className="text-sm font-medium text-gray-600">{t('Supplier Invoice No')}</p>
                                            <p className="text-base font-semibold text-gray-900 mt-1">{purchase.supplier_invoice_no}</p>
                                        </div>
                                    )}

                                    <div>
                                        <p className="text-sm font-medium text-gray-600">{t('Purchase Date')}</p>
                                        <p className="text-base font-semibold text-gray-900 mt-1">{formatDate(purchase.date)}</p>
                                    </div>
                                </div>

                                {purchase.description && (
                                    <div className="mt-4 pt-4 border-t">
                                        <p className="text-sm font-medium text-gray-600">{t('Description')}</p>
                                        <p className="text-gray-700 mt-1">{purchase.description}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Purchase Items */}
                        <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-6 py-3">
                                <h2 className="text-lg font-semibold text-white flex items-center">
                                    <Package className="w-5 h-5 mr-2" />
                                    {t('Purchase Items')}
                                </h2>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-[1100px] w-full">
                                    <thead className="bg-slate-100 border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-16">#</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t('Product Details')}</th>
                                            {hasPrinterItems && (
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-32">{t('Serial Number')}</th>
                                            )}
                                            {!isPrinterGrn && (
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-20">{t('Qty')}</th>
                                            )}
                                            {/* {!isPrinterGrn && (
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-20">{t('Free')}</th>
                                            )} */}
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider w-32">{t('Cost Price')}</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider w-32">{t('Sales Price')}</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider w-20">{t('Discount')}</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider w-20">{t('Customer Discount')}</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider w-25">{t('Amount')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {purchase.items.map((item, index) => {
                                            const isPrinter = item.item_type === 'printer' || !!item.serial_number;
                                            const returnedQty = itemReturns[item.id] || 0;

                                            return (
                                                <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${returnedQty > 0 ? 'bg-orange-50/30' : ''}`}>
                                                    <td className="px-4 py-3 text-sm text-gray-600 align-top">{index + 1}</td>
                                                    <td className="px-4 py-3 align-top">
                                                        <div className="flex flex-col space-y-1">
                                                            <div className="flex items-center">
                                                                <span className="text-sm font-bold text-gray-900">
                                                                    {isPrinter && item.brand && item.model ? `${item.brand} ${item.model}` : item.product_name}
                                                                </span>
                                                                {returnedQty > 0 && (
                                                                    <span className="ml-2 px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded uppercase">
                                                                        {t('Returned')} {returnedQty}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {item.product_code && (
                                                                <div className="text-[10px] text-gray-500">
                                                                    Code: {item.product_code}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    {hasPrinterItems && (
                                                        <td className="px-4 py-3 text-sm align-top">
                                                            {item.serial_number ? (
                                                                <span className="font-mono text-gray-800 bg-slate-50 px-2 py-1 rounded">
                                                                    {item.serial_number}
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-400">-</span>
                                                            )}
                                                        </td>
                                                    )}
                                                    {!isPrinterGrn && (
                                                        <td className="px-4 py-3 text-sm text-center text-gray-900 font-medium align-top">
                                                            {item.qty}
                                                        </td>
                                                    )}
                                                    {/* {!isPrinterGrn && (
                                                        <td className="px-4 py-3 text-sm text-center text-green-600 font-medium align-top">
                                                            {item.free_qty > 0 ? item.free_qty : '-'}
                                                        </td>
                                                    )} */}
                                                    <td className="px-4 py-3 text-sm text-right text-gray-900 align-top">
                                                        {formatCurrency(item.cost_price).replace('Rs ', '')}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-right text-blue-700 align-top">
                                                        {item.retail_price ? formatCurrency(item.retail_price).replace('Rs ', '') : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-right text-red-600 font-medium align-top">
                                                        {item.discount_rate > 0 ? (
                                                            <div className="flex flex-col items-end">
                                                                <span>{item.discount_rate.toFixed(2)}</span>
                                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                                                    {item.discount_type === 'percentage' ? '%' : 'Rs'}
                                                                </span>
                                                            </div>
                                                        ) : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-right text-purple-600 font-medium align-top">
                                                        {(item.cus_discount_rate ?? 0) > 0 ? (
                                                            <div className="flex flex-col items-end">
                                                                <span>{(item.cus_discount_rate ?? 0).toFixed(2)}</span>
                                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                                                    {item.cus_discount_type === 'percentage' ? '%' : 'Rs'}
                                                                </span>
                                                            </div>
                                                        ) : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-right text-gray-900 font-bold align-top">
                                                        {formatCurrency(item.amount).replace('Rs ', '')}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Supplier Returns Section (If any) */}
                        {purchase.returns.length > 0 && (
                            <div className="bg-white rounded-lg shadow border border-orange-200 overflow-hidden">
                                <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-3">
                                    <h2 className="text-lg font-semibold text-white flex items-center">
                                        <ArrowLeft className="w-5 h-5 mr-2 rotate-180" />
                                        {t('Return History')}
                                    </h2>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-orange-50 border-b border-orange-100">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-orange-700 uppercase">{t('Date')}</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-orange-700 uppercase">{t('Item/Serial')}</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-orange-700 uppercase">{t('Qty')}</th>
                                                <th className="px-4 py-3 text-right text-xs font-semibold text-orange-700 uppercase">{t('Value')}</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-orange-700 uppercase">{t('Reason')}</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-orange-700 uppercase">{t('Status')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-orange-100">
                                            {purchase.returns.map((ret) => (
                                                <tr key={ret.id} className="text-sm">
                                                    <td className="px-4 py-3 text-gray-600 font-medium">{formatDate(ret.date)}</td>
                                                    <td className="px-4 py-3 text-gray-900 font-mono">
                                                        {ret.serial_number || '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-gray-900">{ret.quantity}</td>
                                                    <td className="px-4 py-3 text-right text-orange-700 font-bold">{formatCurrency(ret.return_value)}</td>
                                                    <td className="px-4 py-3 text-gray-600 italic">{ret.reason}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                                                            ret.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                            {ret.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Financial Summary */}
                        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
                            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow sm:p-6">
                                <p className="text-sm font-medium text-gray-600 flex items-center">
                                    <DollarSign className="w-4 h-4 mr-2 text-vismass-blue" />
                                    {t('Gross Amount')}
                                </p>
                                <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(purchase.total_amount)}</p>
                            </div>

                            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow sm:p-6">
                                <p className="text-sm font-medium text-gray-600 flex items-center">
                                    <AlertCircle className="w-4 h-4 mr-2 text-orange-500" />
                                    {t('Total Discount')}
                                </p>
                                <p className="text-2xl font-bold text-orange-600 mt-2">-{formatCurrency(purchase.total_discount)}</p>
                            </div>

                            <div className="rounded-lg bg-gradient-to-br from-vismass-blue to-vismass-grey p-4 text-white shadow sm:p-6">
                                <p className="text-sm font-medium text-white/80 flex items-center">
                                    <DollarSign className="w-4 h-4 mr-2" />
                                    {t('Grand Total')}
                                </p>
                                <p className="mt-2 text-2xl font-bold sm:text-3xl">{formatCurrency(purchase.total_payable)}</p>
                            </div>
                        </div>

                        {/* Return Summary (If any) */}
                        {purchase.returns.length > 0 && (
                            <div className="rounded-lg bg-orange-600 p-4 text-white shadow sm:p-6 ml-auto max-w-sm">
                                <div className="flex justify-between items-center">
                                    <p className="text-sm font-medium text-white/80">{t('Total Returns Value')}</p>
                                    <p className="text-xl font-bold">{formatCurrency(purchase.returns.reduce((sum, r) => sum + r.return_value, 0))}</p>
                                </div>
                                <div className="mt-2 pt-2 border-t border-white/20 flex justify-between items-center">
                                    <p className="text-xs font-bold uppercase text-white/90">{t('Net Payable After Returns')}</p>
                                    <p className="text-lg font-black">{formatCurrency(purchase.total_payable - purchase.returns.reduce((sum, r) => sum + r.return_value, 0))}</p>
                                </div>
                            </div>
                        )}

                        {/* Additional Info */}
                        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow sm:p-6">
                            <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">{t('Items Count')}</p>
                                    <p className="text-base font-semibold text-gray-900 mt-1">{purchase.items.length}</p>
                                </div>

                                <div className="md:col-span-2 pt-4 border-t">
                                    <p className="text-xs text-gray-500">
                                        {t('Created on')} {formatDate(purchase.created_at)} • {t('Last updated')} {formatDate(purchase.updated_at)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            <ConfirmationModal
                isOpen={deleteModal}
                onClose={() => setDeleteModal(false)}
                onConfirm={confirmDelete}
                title={t('Delete Purchase')}
                message={`${t('Are you sure you want to delete purchase')} "${purchase.purchase_no}"? ${t('This action cannot be undone')}.`}
                type="danger"
                confirmText={t('Delete')}
                cancelText={t('Cancel')}
            />
        </AppLayout>
    );
}
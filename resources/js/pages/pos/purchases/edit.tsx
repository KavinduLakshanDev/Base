import AppLayout from '@/layouts/app-layout';
import { t } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    FileText,
    Building,
    Package,
    DollarSign,
    Save,
    X,
    Calendar,
} from 'lucide-react';
import { useState } from 'react';

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
    retail_price?: number;
    wholesale_price?: number;
    VehicleSalePrice?: number;
    discount_type?: 'fixed' | 'percentage';
    item_type?: 'product' | 'printer';
}

interface Purchase {
    id: number;
    purchase_no: string;
    date: string;
    supplier_code: string;
    supplier_name: string;
    supplier_invoice_no?: string;
    company_code: string;
    purchase_type: string;
    description?: string;
    total_amount: number;
    total_discount: number;
    total_payable: number;
    status: string;
    is_used: boolean;
    is_inactive: boolean;
    created_at: string;
    updated_at: string;
    items: PurchaseItem[];
}

interface Props {
    purchase: Purchase;
}

export default function EditPurchase({ purchase }: Props) {
    const { data, setData, patch, processing, errors } = useForm({
        supplier_invoice_no: purchase.supplier_invoice_no || '',
        description: purchase.description || '',
        items: purchase.items.map(item => ({
            id: item.id,
            product_code: item.product_code || '',
            product_name: item.product_name || '',
            serial_number: item.serial_number || '',
            qty: item.qty || 0,
            cost_price: item.cost_price || 0,
            item_discount: item.item_discount || 0,
            free_qty: item.free_qty || 0,
            discount_rate: item.discount_rate || 0,
            discount_type: item.discount_type || 'fixed',
            item_type: item.item_type || (item.serial_number ? 'printer' : 'product'),
            cus_discount_rate: item.cus_discount_rate || 0,
            retail_price: item.retail_price || 0,
            wholesale_price: item.wholesale_price || 0,
            VehicleSalePrice: item.VehicleSalePrice || 0,
        })),
    });

    const [editingRow, setEditingRow] = useState<number | null>(null);

    const hasMainStockItems = data.items.some(item => item.item_type !== 'printer' && !item.serial_number);
    const hasPrinterItems = data.items.some(item => item.item_type === 'printer' || !!item.serial_number);
    const isPrinterGrn = data.items.length > 0 && 
        data.items.every(item => item.item_type === 'printer' || !!item.serial_number);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('Dashboard'), href: '/dashboard' },
        // { title: t('POS System'), href: '/pos' },
        { title: t('Purchases (GRN)'), href: '/pos/purchases' },
        { title: purchase.purchase_no, href: `/pos/purchases/${purchase.id}` },
        { title: t('Edit'), href: '#' },
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

    const calculateItemAmount = (index: number) => {
        const item = data.items[index];
        const amount = (item.qty * item.cost_price) - item.item_discount;
        return amount > 0 ? amount : 0;
    };

    const calculateTotals = () => {
        const total_amount = data.items.reduce((sum, item) => {
            return sum + (item.qty * item.cost_price);
        }, 0);

        const total_discount = data.items.reduce((sum, item) => sum + (item.item_discount || 0), 0);
        const total_payable = total_amount - total_discount;

        return { total_amount, total_discount, total_payable };
    };

    const totals = calculateTotals();

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...data.items];
        let val: any;

        if (['product_code', 'product_name', 'serial_number', 'discount_type'].includes(field)) {
            val = value;
        } else {
            val = parseFloat(value) || 0;
        }

        newItems[index] = { ...newItems[index], [field]: val };

        const item = newItems[index];
        let itemDiscount = 0;
        if (item.discount_type === 'percentage') {
            itemDiscount = (item.qty * item.cost_price * item.discount_rate) / 100;
        } else {
            itemDiscount = item.discount_rate;
        }
        newItems[index].item_discount = itemDiscount;

        setData('items', newItems);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        patch(`/pos/purchases/${purchase.id}`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit Purchase ${purchase.purchase_no}`} />

            <div className="min-h-screen bg-slate-50">
                <header className="bg-gradient-to-r from-vismass-blue to-vismass-grey shadow">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4">
                            <div className="flex items-center space-x-3">
                                <Link
                                    href={`/pos/purchases/${purchase.id}`}
                                    className="rounded-lg bg-white/20 p-2 hover:bg-white/30 transition-all duration-200"
                                >
                                    <ArrowLeft className="h-5 w-5 text-white" />
                                </Link>
                                <div>
                                    <h1 className="text-xl font-bold text-white">{t('Edit Purchase')} - {purchase.purchase_no}</h1>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={handleSubmit}
                                    disabled={processing}
                                    className="inline-flex items-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-vismass-blue hover:bg-slate-100 transition-all duration-200 disabled:opacity-50"
                                >
                                    <Save className="mr-1.5 h-4 w-4" />
                                    {processing ? t('Saving...') : t('Save Changes')}
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
                    <form onSubmit={handleSubmit} className="px-4 sm:px-0 space-y-6">
                        <div className="bg-white rounded-lg shadow border border-slate-200">
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-6 py-3">
                                <h2 className="text-lg font-semibold text-white">{t('Purchase Information')}</h2>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <p className="text-sm font-medium text-gray-600 flex items-center">
                                            <FileText className="w-4 h-4 mr-2 text-vismass-blue" />
                                            {t('Purchase No')}
                                        </p>
                                        <p className="text-lg font-semibold text-gray-900 mt-1 bg-slate-50 px-3 py-2 rounded">
                                            {purchase.purchase_no}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-600 flex items-center">
                                            <Calendar className="w-4 h-4 mr-2 text-vismass-blue" />
                                            {t('Date')}
                                        </p>
                                        <p className="text-lg font-semibold text-gray-900 mt-1 bg-slate-50 px-3 py-2 rounded">
                                            {formatDate(purchase.date)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-600">{t('Status')}</p>
                                        <p className="text-lg font-semibold text-gray-900 mt-1 bg-slate-50 px-3 py-2 rounded">
                                            {purchase.status === 'A' ? t('Active') : purchase.status === 'P' ? t('Posted') : t('Inactive')}
                                        </p>
                                    </div>
                                    <div className="md:col-span-3 border-t pt-4">
                                        <p className="text-sm font-medium text-gray-600">{t('Supplier')}</p>
                                        <p className="text-base font-semibold text-gray-900 mt-1 bg-slate-50 px-3 py-2 rounded">
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
                                        <p className="text-base font-semibold text-gray-900 mt-1 bg-slate-50 px-3 py-2 rounded">
                                            {purchase.company_code}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-600">{t('Purchase Type')}</p>
                                        <p className="text-base font-semibold text-gray-900 mt-1 bg-slate-50 px-3 py-2 rounded">
                                            {purchase.purchase_type}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-6 pt-6 border-t space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">{t('Supplier Invoice No')}</label>
                                        <input
                                            type="text"
                                            value={data.supplier_invoice_no}
                                            onChange={(e) => setData('supplier_invoice_no', e.target.value)}
                                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
                            <div className="bg-gradient-to-r from-vismass-blue to-vismass-grey px-6 py-3">
                                <h2 className="text-lg font-semibold text-white flex items-center">
                                    <Package className="w-5 h-5 mr-2" />
                                    {t('Purchase Items')} - {t('Edit Pricing')}
                                </h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-100 border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">#</th>
                                            {hasMainStockItems && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t('Code')}</th>}
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t('Product Name')}</th>
                                            {hasPrinterItems && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">{t('Serial No')}</th>}
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">{t('Qty')}</th>
                                            {!isPrinterGrn && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">{t('Free')}</th>}
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">{t('Cost')}</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">{t('Retail')}</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">{t('Wholesale')}</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">{t('Vehicle')}</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider w-32">{t('Discount')}</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">{t('Amount')}</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">{t('Action')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {data.items.map((item, index) => (
                                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
                                                {hasMainStockItems && (
                                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                        {editingRow === index && item.item_type !== 'printer' ? (
                                                            <input type="text" value={item.product_code} onChange={(e) => handleItemChange(index, 'product_code', e.target.value)} className="w-24 px-2 py-1 border border-gray-300 rounded" />
                                                        ) : (item.product_code || '-')}
                                                    </td>
                                                )}
                                                <td className="px-4 py-3 text-sm text-gray-700">
                                                    {editingRow === index ? (
                                                        <input type="text" value={item.product_name} onChange={(e) => handleItemChange(index, 'product_name', e.target.value)} className="w-48 px-2 py-1 border border-gray-300 rounded" />
                                                    ) : (item.product_name)}
                                                </td>
                                                {hasPrinterItems && (
                                                    <td className="px-4 py-3 text-sm text-gray-700">
                                                        {editingRow === index && item.serial_number ? (
                                                            <input type="text" value={item.serial_number} onChange={(e) => handleItemChange(index, 'serial_number', e.target.value)} className="w-32 px-2 py-1 border border-gray-300 rounded font-mono" />
                                                        ) : (<span className="font-mono">{item.serial_number || '-'}</span>)}
                                                    </td>
                                                )}
                                                <td className="px-4 py-3 text-sm text-right">
                                                    {editingRow === index && !item.serial_number ? (
                                                        <input type="number" value={item.qty} onChange={(e) => handleItemChange(index, 'qty', e.target.value)} className="w-20 px-2 py-1 border border-gray-300 rounded text-right" />
                                                    ) : (item.qty)}
                                                </td>
                                                {!isPrinterGrn && (
                                                    <td className="px-4 py-3 text-sm text-right">
                                                        {editingRow === index ? (
                                                            <input type="number" value={item.free_qty} onChange={(e) => handleItemChange(index, 'free_qty', e.target.value)} className="w-16 px-2 py-1 border border-gray-300 rounded text-right" />
                                                        ) : (item.free_qty)}
                                                    </td>
                                                )}
                                                <td className="px-4 py-3 text-sm text-right">
                                                    {editingRow === index ? (
                                                        <input type="number" step="0.01" value={item.cost_price} onChange={(e) => handleItemChange(index, 'cost_price', e.target.value)} className="w-24 px-2 py-1 border border-gray-300 rounded text-right" />
                                                    ) : (item.cost_price.toFixed(2))}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-right">
                                                    {editingRow === index ? (
                                                        <input type="number" step="0.01" value={item.retail_price} onChange={(e) => handleItemChange(index, 'retail_price', e.target.value)} className="w-24 px-2 py-1 border border-blue-300 rounded text-right" />
                                                    ) : (<span className="text-blue-700">{item.retail_price?.toFixed(2) || '-'}</span>)}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-right">
                                                    {editingRow === index ? (
                                                        <input type="number" step="0.01" value={item.wholesale_price} onChange={(e) => handleItemChange(index, 'wholesale_price', e.target.value)} className="w-24 px-2 py-1 border border-indigo-300 rounded text-right" />
                                                    ) : (<span className="text-indigo-700">{item.wholesale_price?.toFixed(2) || '-'}</span>)}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-right">
                                                    {editingRow === index ? (
                                                        <input type="number" step="0.01" value={item.VehicleSalePrice} onChange={(e) => handleItemChange(index, 'VehicleSalePrice', e.target.value)} className="w-24 px-2 py-1 border border-emerald-300 rounded text-right" />
                                                    ) : (<span className="text-emerald-700">{item.VehicleSalePrice?.toFixed(2) || '-'}</span>)}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-right">
                                                    {editingRow === index ? (
                                                        <div className="flex flex-col space-y-1">
                                                            <select value={item.discount_type} onChange={(e) => handleItemChange(index, 'discount_type', e.target.value)} className="text-[10px] p-1 border border-gray-300 rounded">
                                                                <option value="fixed">Fixed</option>
                                                                <option value="percentage">%</option>
                                                            </select>
                                                            <input type="number" step="0.01" value={item.discount_rate} onChange={(e) => handleItemChange(index, 'discount_rate', e.target.value)} className="w-24 px-2 py-1 border border-gray-300 rounded text-right" />
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-red-600">{item.discount_rate > 0 ? item.discount_rate.toFixed(2) : '-'}</span>
                                                            {item.discount_rate > 0 && <span className="text-[10px] text-gray-400 font-bold uppercase">{item.discount_type === 'percentage' ? '%' : 'Rs'}</span>}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                                                    {calculateItemAmount(index).toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-center">
                                                    <button type="button" onClick={() => setEditingRow(editingRow === index ? null : index)} className={`${editingRow === index ? 'text-green-600 hover:text-green-800' : 'text-blue-600 hover:text-blue-800'} font-medium`}>
                                                        {editingRow === index ? t('Done') : t('Edit')}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white rounded-lg shadow border border-slate-200 p-6">
                                <p className="text-sm font-medium text-gray-600 flex items-center"><DollarSign className="w-4 h-4 mr-2 text-vismass-blue" />{t('Gross Amount')}</p>
                                <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(totals.total_amount)}</p>
                            </div>
                            <div className="bg-white rounded-lg shadow border border-slate-200 p-6">
                                <p className="text-sm font-medium text-gray-600 flex items-center"><DollarSign className="w-4 h-4 mr-2 text-orange-500" />{t('Total Discount')}</p>
                                <p className="text-2xl font-bold text-orange-600 mt-2">-{formatCurrency(totals.total_discount)}</p>
                            </div>
                            <div className="bg-gradient-to-br from-vismass-blue to-vismass-grey rounded-lg shadow p-6 text-white">
                                <p className="text-sm font-medium text-white/80 flex items-center"><DollarSign className="w-4 h-4 mr-2" />{t('Grand Total')}</p>
                                <p className="text-3xl font-bold mt-2">{formatCurrency(totals.total_payable)}</p>
                            </div>
                        </div>
                    </form>
                </main>
            </div>
        </AppLayout>
    );
}

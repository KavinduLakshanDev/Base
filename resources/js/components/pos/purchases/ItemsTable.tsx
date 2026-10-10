import { Plus, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';

interface Product {
    id: number;
    code: string;
    name: string;
    english_name?: string;
    barcode?: string;
    category_id?: string;
    category_name?: string;
    cost_price: number;
    normal_cost: number;
    retail_price: number;
    wholesale_price: number;
    VehicleSalePrice: number;
    current_stock: number;
    free_stock: number;
    brand?: string;
    model?: string;
    serial_number?: string;
}

interface PurchaseItem {
    product_id: number;
    product_code: string;
    product_name: string;
    qty: number;
    cost_price: number;
    normal_cost: number;
    new_cost_price: number;
    discount_rate: number;
    free_qty: number;
    retail_price: number;
    wholesale_price: number;
    VehicleSalePrice: number;
    item_discount: number;
    amount: number;
    brand: string;
    model: string;
    serial_number: string;
    warranty: string;
    barcode?: string;
    category?: string;
    cus_discount_rate?: number;
    RtQty1?: number;
    RtDis1?: number;
    RtDisType1?: 'fixed' | 'percentage';
}

interface ItemsTableProps {
    stockLocationType: 'main_stock' | 'printing_section';
    items: PurchaseItem[];
    currentProducts: Product[];
    searchTerms: { [key: number]: string };
    openRowIndex: number | null;
    onAddItem: () => void;
    onEditItem: (item: PurchaseItem, index: number) => void;
    onRemoveItem: (index: number) => void;
    onProductChange: (index: number, productId: number) => void;
    onSearchTermChange: (index: number, term: string) => void;
    onRowOpenChange: (index: number | null) => void;
    errors: any;
    productType?: 'printer' | 'stationary';
}

export default function ItemsTable({
    stockLocationType,
    items,
    currentProducts,
    searchTerms,
    openRowIndex,
    onAddItem,
    onEditItem,
    onRemoveItem,
    onProductChange,
    onSearchTermChange,
    onRowOpenChange,
    errors,
    productType = 'stationary',
}: ItemsTableProps) {
    return (
        <div className="mb-8">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-100 shadow-sm mb-6">
                <h4 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    Purchase Items
                </h4>

                {/* Add Item Button */}
                <Button
                    type="button"
                    variant="default"
                    size="lg"
                    onClick={onAddItem}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl transform hover:scale-105 transition-all duration-200 px-8 py-4 text-lg font-semibold rounded-xl min-w-[200px]"
                >
                    <Plus className="mr-3 h-6 w-6" />
                    {t('Add Item')}
                    <span className="ml-2 text-xs opacity-75">(F2 / Ctrl+A)</span>
                </Button>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-gray-300 bg-white shadow-lg">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gradient-to-r from-sky-600 to-blue-600 text-white sticky top-0">
                            <tr>
                                <th className="px-3 py-2.5 text-left text-xs font-bold tracking-wider text-white uppercase">#</th>
                                {productType === 'printer' ? (
                                    <>
                                        {/* Printer columns — matches PrinterItemModal fields */}
                                        <th className="px-3 py-2.5 text-left text-xs font-bold tracking-wider text-white uppercase whitespace-nowrap">{t('Item Name')}</th>
                                        <th className="px-3 py-2.5 text-left text-xs font-bold tracking-wider text-white uppercase">{t('Brand')}</th>
                                        <th className="px-3 py-2.5 text-left text-xs font-bold tracking-wider text-white uppercase">{t('Model')}</th>
                                        <th className="px-3 py-2.5 text-left text-xs font-bold tracking-wider text-white uppercase whitespace-nowrap">{t('Serial No')}</th>
                                        <th className="px-3 py-2.5 text-left text-xs font-bold tracking-wider text-white uppercase">{t('Warranty')}</th>
                                        {/* <th className="px-3 py-2.5 text-right text-xs font-bold tracking-wider text-amber-200 uppercase whitespace-nowrap">{t('Last GRN')}</th> */}
                                        <th className="px-3 py-2.5 text-right text-xs font-bold tracking-wider text-white uppercase whitespace-nowrap">{t('Cost Price')}</th>
                                        <th className="px-3 py-2.5 text-right text-xs font-bold tracking-wider text-white uppercase whitespace-nowrap">{t('Retail Price')}</th>
                                        <th className="px-3 py-2.5 text-right text-xs font-bold tracking-wider text-white uppercase whitespace-nowrap">{t('Sup Dis')}</th>
                                        <th className="px-3 py-2.5 text-right text-xs font-bold tracking-wider text-white uppercase whitespace-nowrap">{t('Cus Dis')}</th>
                                    </>
                                ) : (
                                    <>
                                        {/* Stationary columns — matches StationaryItemModal fields */}
                                        <th className="px-3 py-2.5 text-left text-xs font-bold tracking-wider text-white uppercase whitespace-nowrap">{t('Item Name')}</th>
                                        {/* <th className="px-3 py-2.5 text-right text-xs font-bold tracking-wider text-amber-200 uppercase whitespace-nowrap">{t('Last GRN')}</th> */}
                                        <th className="px-3 py-2.5 text-right text-xs font-bold tracking-wider text-white uppercase whitespace-nowrap">{t('Cost Price')}</th>
                                        <th className="px-3 py-2.5 text-right text-xs font-bold tracking-wider text-white uppercase">{t('N.Cost')}</th>
                                        <th className="px-3 py-2.5 text-right text-xs font-bold tracking-wider text-white uppercase">{t('Qty')}</th>
                                        <th className="px-3 py-2.5 text-right text-xs font-bold tracking-wider text-white uppercase whitespace-nowrap">{t('Sup Dis')}</th>
                                        <th className="px-3 py-2.5 text-right text-xs font-bold tracking-wider text-white uppercase whitespace-nowrap">{t('Retail Price')}</th>
                                        {/* <th className="px-3 py-2.5 text-right text-xs font-bold tracking-wider text-white uppercase">{t('Wholesale')}</th> */}
                                        <th className="px-3 py-2.5 text-right text-xs font-bold tracking-wider text-white uppercase whitespace-nowrap">{t('Vehicle Price')}</th>
                                        <th className="px-3 py-2.5 text-right text-xs font-bold tracking-wider text-white uppercase whitespace-nowrap">{t('Min Qty')}</th>
                                        <th className="px-3 py-2.5 text-right text-xs font-bold tracking-wider text-white uppercase whitespace-nowrap">{t('Cus Dis')}</th>
                                    </>
                                )}
                                <th className="px-3 py-2.5 text-right text-xs font-bold tracking-wider text-white uppercase whitespace-nowrap">{t('Total (Rs)')}</th>
                                <th className="px-3 py-2.5 text-center text-xs font-bold tracking-wider text-white uppercase">{t('Actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {items.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={productType === 'printer' ? 12 : 14}
                                        className="px-4 py-8 text-center text-gray-500"
                                    >
                                        <div className="flex flex-col items-center justify-center space-y-2">
                                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                                                <Plus className="w-6 h-6 text-gray-400" />
                                            </div>
                                            <p className="text-sm font-medium">No items added yet</p>
                                            <p className="text-xs text-gray-400">Click "Add Item" to start adding purchase items</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                items.map((item, index) => (
                                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                                        {/* Row number */}
                                        <td className="px-3 py-3 text-sm text-gray-400 font-medium">{index + 1}</td>

                                        {productType === 'printer' ? (
                                            <>
                                                {/* Printer row — matches PrinterItemModal */}
                                                <td className="px-3 py-3 text-sm cursor-pointer hover:text-blue-700" onClick={() => onEditItem(item, index)}>
                                                    <div className="font-semibold text-gray-900">{item.product_name}</div>
                                                    <div className="text-xs text-green-600">{item.barcode || item.product_code}</div>
                                                </td>
                                                <td className="px-3 py-3 text-sm">
                                                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">{item.brand || '-'}</span>
                                                </td>
                                                <td className="px-3 py-3 text-sm text-gray-800">{item.model || '-'}</td>
                                                <td className="px-3 py-3 text-sm">
                                                    <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{item.serial_number || '-'}</span>
                                                </td>
                                                <td className="px-3 py-3 text-sm text-gray-800">{item.warranty || '-'}</td>
                                                {/* Last GRN batch cost */}
                                                {/* <td className="px-3 py-3 text-sm text-right">
                                                    <span className="text-amber-600 font-medium">
                                                        {item.normal_cost > 0 ? item.normal_cost.toFixed(2) : '-'}
                                                    </span>
                                                </td> */}
                                                <td className="px-3 py-3 text-sm text-right">{(item.cost_price || 0).toFixed(2)}</td>
                                                <td className="px-3 py-3 text-sm text-right">{(item.retail_price || 0).toFixed(2)}</td>
                                                <td className="px-3 py-3 text-sm text-right">{(item.discount_rate || 0).toFixed(2)}</td>
                                                <td className="px-3 py-3 text-sm text-right">{(item.cus_discount_rate || 0).toFixed(2)}</td>
                                            </>
                                        ) : (
                                            <>
                                                {/* Stationary row — matches StationaryItemModal */}
                                                <td className="px-3 py-3 text-sm cursor-pointer hover:text-blue-700 min-w-[180px]" onClick={() => onEditItem(item, index)}>
                                                    <div className="font-semibold text-gray-900">{item.product_name}</div>
                                                    <div className="text-xs text-gray-500">{item.product_code}</div>
                                                </td>
                                                {/* Last GRN batch cost */}
                                                {/* <td className="px-3 py-3 text-sm text-right">
                                                    <span className="text-amber-600 font-medium">
                                                        {item.normal_cost > 0 ? item.normal_cost.toFixed(2) : '-'}
                                                    </span>
                                                </td> */}
                                                <td className="px-3 py-3 text-sm text-right">{(item.cost_price || 0).toFixed(2)}</td>
                                                <td className="px-3 py-3 text-sm text-right">{(item.new_cost_price || 0).toFixed(2)}</td>
                                                <td className="px-3 py-3 text-sm text-right font-semibold">{item.qty}</td>
                                                <td className="px-3 py-3 text-sm text-right">{(item.item_discount || 0).toFixed(2)}</td>
                                                <td className="px-3 py-3 text-sm text-right">{(item.retail_price || 0).toFixed(2)}</td>
                                                {/* <td className="px-3 py-3 text-sm text-right">{item.wholesale_price.toFixed(2)}</td> */}
                                                <td className="px-3 py-3 text-sm text-right">{(item.VehicleSalePrice || 0).toFixed(2)}</td>
                                                <td className="px-3 py-3 text-sm text-right">{item.RtQty1 || 0}</td>
                                                <td className="px-3 py-3 text-sm text-right">{(item.RtDis1 || 0).toFixed(2)}</td>
                                            </>
                                        )}

                                        {/* Total Amount */}
                                        <td className="px-3 py-3 text-right whitespace-nowrap">
                                            <div className="text-sm font-bold text-green-600">{(item.amount || 0).toFixed(2)}</div>
                                            {item.item_discount > 0 && (
                                                <div className="text-xs text-red-500">-{(item.item_discount || 0).toFixed(2)}</div>
                                            )}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-3 py-3 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => onEditItem(item, index)}
                                                    className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-100 hover:text-blue-700"
                                                    title="Edit"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => onRemoveItem(index)}
                                                    className="h-7 w-7 p-0 text-red-600 hover:bg-red-100 hover:text-red-700"
                                                    title="Remove"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {errors.items && (
                <p className="mb-4 text-sm text-red-600">
                    {errors.items}
                </p>
            )}
        </div>
    );
}
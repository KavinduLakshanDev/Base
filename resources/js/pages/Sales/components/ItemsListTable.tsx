import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShoppingCart, Trash2, Check, X } from 'lucide-react';
import { SaleItem } from '../Create';

interface ItemsListTableProps {
    data: any;
    editingQuantity: { index: number; quantity: number } | null;
    editingDiscount: { index: number; discount: number } | null;
    setEditingQuantity: React.Dispatch<React.SetStateAction<{ index: number; quantity: number } | null>>;
    setEditingDiscount: React.Dispatch<React.SetStateAction<{ index: number; discount: number } | null>>;
    startEditingQuantity: (index: number) => void;
    updateQuantity: (index: number, newQuantity: number) => void;
    cancelEditingQuantity: () => void;
    startEditingDiscount: (index: number) => void;
    updateDiscount: (index: number, newDiscount: number) => void;
    cancelEditingDiscount: () => void;
    removeItem: (index: number) => void;
    selectedItem: any;
}

const ItemsListTable: React.FC<ItemsListTableProps> = ({
    data,
    editingQuantity,
    editingDiscount,
    setEditingQuantity,
    setEditingDiscount,
    startEditingQuantity,
    updateQuantity,
    cancelEditingQuantity,
    startEditingDiscount,
    updateDiscount,
    cancelEditingDiscount,
    removeItem,
    selectedItem
}) => {
    return (
        <div className="space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <ShoppingCart className="w-5 h-5 text-blue-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-800">Items List</h2>
                </div>

                {/* Display stock and cost price info for the selected item */}
                <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 sm:p-4">
                    <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 md:grid-cols-2">
                        <div className="flex items-center space-x-2">
                            <span className="text-blue-600 font-medium">Stock:</span>
                            <span className="font-semibold">
                                {selectedItem ? Number(selectedItem.stock).toFixed(2) : '0.00'}
                                {selectedItem?.unit ? <span className="ml-1 text-xs text-gray-400">{selectedItem.unit}</span> : null}
                            </span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="text-green-600 font-medium">Available:</span>
                            <span className="font-semibold text-green-600">
                                {selectedItem ? (() => {
                                    const usedQty = data.items
                                        .filter((item: any) => item.item_code === selectedItem.item_code && item.batch_no === selectedItem.batch_no)
                                        .reduce((sum: number, item: any) => sum + Number(item.quantity) + Number(item.free_quantity || 0), 0);
                                    return Math.max(0, selectedItem.stock - usedQty).toFixed(2);
                                })() : '0.00'}
                            </span>
                        </div>
                        {/* <div className="col-span-2 flex items-center space-x-4">
                            <span className="text-blue-600 font-medium">Cost Price:</span>
                            <span className="font-semibold">{selectedItem ? Number(selectedItem.cost_price).toFixed(2) : '0.00'}</span>
                        </div> */}
                    </div>
                </div>
            </div>

            <div className="max-h-64 overflow-auto rounded-lg border border-blue-200 bg-white/50 backdrop-blur-sm">
                <table className="w-full min-w-[980px] text-left text-sm">
                    <thead className="bg-blue-50 sticky top-0">
                        <tr>
                            <th className="px-4 py-2 text-blue-700 font-semibold">Item Code</th>
                            <th className="px-4 py-2 text-blue-700 font-semibold">Item Name</th>
                            <th className="px-4 py-2 text-blue-700 font-semibold text-right">Our Price</th>
                            <th className="px-4 py-2 text-blue-700 font-semibold text-right">Sales Price</th>
                            <th className="px-4 py-2 text-blue-700 font-semibold text-center">Quantity</th>
                            <th className="px-4 py-2 text-blue-700 font-semibold text-center">Discount</th>
                            {/* <th className="px-4 py-2 text-blue-700 font-semibold text-center">Free</th> */}
                            <th className="px-4 py-2 text-blue-700 font-semibold text-right">Total</th>
                            <th className="px-4 py-2 text-blue-700 font-semibold text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-100">
                        {data.items.map((item: SaleItem, idx: number) => {
                            const vatRate = Number(data.vat_rate) || 0;
                            const multiplier = 1 + (vatRate / 100);

                            // Sales Price (SlsPri) - Always show retail price, doesn't change with price type
                            const displaySalesPrice = item.retail_price;

                            // Our Price - Shows the actual price being used based on price type
                            // For VAT-inclusive items, don't add VAT again (price already includes it)
                            // For VAT-exclusive items, add VAT if VAT invoice is enabled
                            const shouldAddVat = data.is_vat_invoice && !item.vat_inclusive;
                            const ourPrice = item.our_price || item.unit_price || 0;
                            const displayOurPrice = shouldAddVat ? ourPrice * multiplier : ourPrice;
                            // VAT is applied on net amount (gross − discount) per Sri Lankan VAT standard
                            const grossPrice = (item.unit_price || item.our_price || 0) * (item.quantity || 0);
                            const discount = item.discount_amount || 0;
                            const netPrice = grossPrice - discount;
                            const displayTotal = shouldAddVat
                                ? netPrice * multiplier   // (price × qty − discount) × (1 + rate)
                                : item.total;

                            return (
                                <tr key={idx} className="hover:bg-blue-50/50">
                                    <td className="px-4 py-2">{item.item_code}</td>
                                    <td className="px-4 py-2">
                                        <div className="flex flex-col">
                                            <span className="font-medium">{item.item_name}</span>
                                            {item.batch_no && (
                                                <span className="text-xs text-blue-600">Batch: {item.batch_no}</span>
                                            )}
                                            {item.serial_number && (
                                                <span className="text-xs text-gray-500">SN: {item.serial_number}</span>
                                            )}
                                            {item.brand && item.model && (
                                                <span className="text-xs text-gray-500">{item.brand} {item.model}</span>
                                            )}
                                            {item.warranty && (
                                                <span className="text-xs text-green-600">Warranty: {item.warranty}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-2 text-right">{Number(displaySalesPrice).toFixed(2)}</td>
                                    <td className="px-4 py-2 text-right">{Number(displayOurPrice).toFixed(2)}</td>
                                    <td className="px-4 py-2 text-center">
                                        {editingQuantity?.index === idx ? (
                                            <div className="flex items-center justify-center space-x-1">
                                                <Input
                                                    type="number"
                                                    value={editingQuantity.quantity}
                                                    onChange={(e) => setEditingQuantity({ ...editingQuantity, quantity: Number(e.target.value) })}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            updateQuantity(idx, editingQuantity.quantity);
                                                        } else if (e.key === 'Escape') {
                                                            cancelEditingQuantity();
                                                        }
                                                    }}
                                                    className="w-16 h-7 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    autoFocus
                                                />
                                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => updateQuantity(idx, editingQuantity.quantity)}>
                                                    <Check className="w-3 h-3 text-green-600" />
                                                </Button>
                                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={cancelEditingQuantity}>
                                                    <X className="w-3 h-3 text-red-600" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                className="hover:bg-blue-100 px-2 py-1 rounded text-center min-w-[40px]"
                                                onClick={() => startEditingQuantity(idx)}
                                            >
                                                {Number(item.quantity).toFixed(0)}
                                            </button>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        {editingDiscount?.index === idx ? (
                                            <div className="flex items-center justify-center space-x-1">
                                                <Input
                                                    type="number"
                                                    value={editingDiscount.discount}
                                                    onChange={(e) => setEditingDiscount({ ...editingDiscount, discount: Number(e.target.value) })}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            updateDiscount(idx, editingDiscount.discount);
                                                        } else if (e.key === 'Escape') {
                                                            cancelEditingDiscount();
                                                        }
                                                    }}
                                                    className="w-16 h-7 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    autoFocus
                                                />
                                                <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => updateDiscount(idx, editingDiscount.discount)}>
                                                    <Check className="w-3 h-3 text-green-600" />
                                                </Button>
                                                <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={cancelEditingDiscount}>
                                                    <X className="w-3 h-3 text-red-600" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                className="hover:bg-blue-100 px-2 py-1 rounded text-center min-w-[40px]"
                                                onClick={() => startEditingDiscount(idx)}
                                            >
                                                {Number(item.discount_amount || 0).toFixed(2)}
                                            </button>
                                        )}
                                    </td>
                                    {/* <td className="px-4 py-2 text-center">
                                        {editingQuantity?.index === idx ? (
                                            (() => {
                                                
                                                const qty = editingQuantity.quantity;
                                                let free = 0;
                                                if (item.free_issue_scheme_buy_qty && item.free_issue_scheme_get_qty && item.free_issue_scheme_buy_qty > 0) {
                                                    free = Math.floor(qty / item.free_issue_scheme_buy_qty) * item.free_issue_scheme_get_qty;
                                                }
                                                return free;
                                            
                                                return 0;
                                            })()
                                        ) : (
                                            item.free_quantity
                                        )}
                                    </td> */}
                                    <td className="px-4 py-2 text-right font-semibold">{Number(displayTotal).toFixed(2)}</td>
                                    <td className="px-4 py-2 text-center">
                                        <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="h-8 w-8">
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </td>
                                </tr>
                            );
                        })}
                        {data.items.length === 0 && (
                            <tr>
                                <td colSpan={9} className="px-4 py-8 text-center text-gray-500 italic">
                                    No items added yet
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ItemsListTable;

import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { SaleItem } from '../Create';

interface PrintersListTableProps {
    data: any;
    removePrinter: (index: number) => void;
    toggleWarranty: (index: number, withWarranty: boolean) => void;
    updateWarranty: (index: number, value: string) => void;
}

const PrintersListTable: React.FC<PrintersListTableProps> = ({
    data,
    removePrinter,
    toggleWarranty,
    updateWarranty
}) => {
    // Filter items to show only printers (items with serial_number, brand, and model)
    const printers = data.items.filter((item: SaleItem) =>
        item.serial_number
    );

    const formatPrice = (price: number) => {
        return `Rs ${price.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // derive price depending on the global price_type / payment_mode state
    const deriveBasePrice = (printer: SaleItem) => {
        // mirror getCurrentPrice logic from Edit/Create
        if (data.price_type === 'retail') {
            return printer.retail_price;
        }
        if (data.price_type === 'wholesale') {
            return printer.wholesale_price || printer.retail_price;
        }
        if (data.price_type === 'card' || (data.payment_mode === 'card' && data.price_type === 'card')) {
            return printer.retail_price;
        }
        if (printer.vat_inclusive) {
            return printer.retail_price;
        }
        return printer.retail_price;
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-800">Printers List</h2>
                </div>
            </div>

            <div className="max-h-64 overflow-auto rounded-lg border border-green-200 bg-white/50 backdrop-blur-sm">
                <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="bg-green-50 sticky top-0">
                        <tr>
                            <th className="px-4 py-2 text-green-700 font-semibold">Serial Number</th>
                            <th className="px-4 py-2 text-green-700 font-semibold">Printer Name / Model</th>
                            <th className="px-4 py-2 text-green-700 font-semibold">Warranty</th>
                            <th className="px-4 py-2 text-green-700 font-semibold text-center">Keep Warranty</th>
                            <th className="px-4 py-2 text-green-700 font-semibold text-right">Price</th>
                            <th className="px-4 py-2 text-green-700 font-semibold text-right">Discount</th>
                            <th className="px-4 py-2 text-green-700 font-semibold text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-green-100">
                        {printers.map((printer: SaleItem, idx: number) => {
                            // Find the actual index in the original items array
                            const originalIndex = data.items.findIndex((item: SaleItem) =>
                                item.serial_number === printer.serial_number &&
                                item.brand === printer.brand &&
                                item.model === printer.model
                            );

                            // Price calculation respects the current price_type rather than
                            // relying on whatever value is stored in unit_price.  Using
                            // deriveBasePrice ensures the UI always reflects the selection.
                            const basePrice = deriveBasePrice(printer);
                            // Printers always include VAT in their price - don't add VAT again
                            const displayPrice = basePrice;

                            // Calculate discount display
                            let discountDisplay = null;
                            let discountValue = Number(printer.discount_amount) || 0;
                            
                            // If discount_amount exists, use it
                            if (discountValue > 0) {
                                discountDisplay = <span>{formatPrice(discountValue)}</span>;
                            } 
                            // Otherwise, use cus_discount_rate as fixed amount if available
                            else if (printer.cus_discount_rate && Number(printer.cus_discount_rate) > 0) {
                                discountValue = Number(printer.cus_discount_rate);
                                discountDisplay = (
                                    <span>
                                        {formatPrice(discountValue)}
                                    </span>
                                );
                            } 
                            // No discount
                            else {
                                discountDisplay = <span className="text-gray-400">No Discount</span>;
                            }

                            return (
                                <tr key={idx} className="hover:bg-green-50/50">
                                    <td className="px-4 py-2 font-medium">{printer.serial_number}</td>
                                    <td className="px-4 py-2">
                                        <div className="flex flex-col">
                                            <span className="font-medium">{printer.item_name}</span>
                                            <span className="text-sm text-gray-600">{printer.brand} {printer.model}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2">
                                        <input
                                            type="text"
                                            value={printer.warranty || printer.saved_warranty || printer.original_warranty || ''}
                                            onChange={e => {
                                                const value = e.target.value;
                                                updateWarranty(originalIndex, value);
                                            }}
                                            onBlur={e => {
                                                const value = e.target.value.trim();
                                                toggleWarranty(originalIndex, value !== '');
                                            }}
                                            className="w-24 rounded border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                                            placeholder="Enter warranty (e.g. 1 month)"
                                        />
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        <input
                                            type="checkbox"
                                            checked={Boolean(printer.warranty)}
                                            onChange={e => toggleWarranty(originalIndex, e.target.checked)}
                                            className="h-4 w-4 text-green-600 border-gray-300 rounded"
                                        />
                                    </td>
                                    <td className="px-4 py-2 text-right font-semibold">{formatPrice(Number(displayPrice))}</td>
                                    <td className="px-4 py-2 text-right font-semibold">
                                        {discountDisplay}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        <Button variant="ghost" size="icon" onClick={() => removePrinter(originalIndex)} className="h-8 w-8">
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </td>
                                </tr>
                            );
                        })}
                        {printers.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-gray-500 italic">
                                    No printers added yet
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PrintersListTable;

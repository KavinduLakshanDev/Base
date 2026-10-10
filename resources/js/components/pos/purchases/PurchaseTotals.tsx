import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { t } from '@/lib/i18n';

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
}

interface PurchaseTotalsProps {
    items: PurchaseItem[];
    totalAmount: number;
    totalDiscount: number;
    totalPayable: number;
    additionalDiscount: number;
    onAdditionalDiscountChange: (discount: number) => void;
    processing: boolean;
    submitted: boolean;
}

export default function PurchaseTotals({
    items,
    totalAmount,
    totalDiscount,
    totalPayable,
    additionalDiscount,
    onAdditionalDiscountChange,
    processing,
    submitted,
}: PurchaseTotalsProps) {
    return (
        <>
            {/* Totals Section */}
            <div className="mt-8 flex justify-end">
                <div className="w-full max-w-md space-y-4 rounded-xl border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-blue-50 p-6 shadow-xl">
                    <div className="text-center mb-4">
                        <h4 className="text-lg font-bold text-gray-800">{t('Order Summary')}</h4>
                        <div className="w-16 h-1 bg-blue-500 rounded-full mx-auto mt-2"></div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700">
                            {t('Total Amount')}:
                        </span>
                        <span className="text-lg font-semibold text-gray-900">
                            Rs {totalAmount.toFixed(2)}
                        </span>
                    </div>

                    <div className="space-y-3">
                        {/* Additional Discount */}
                        <div className="space-y-2">
                            <Label
                                htmlFor="additional_discount"
                                className="text-sm font-medium text-orange-700"
                            >
                                {t('Additional Discount')}:
                            </Label>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-600">
                                    Rs
                                </span>
                                <Input
                                    id="additional_discount"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={additionalDiscount}
                                    onChange={(e) => {
                                        const discount = parseFloat(e.target.value) || 0;
                                        onAdditionalDiscountChange(discount);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'ArrowUp') {
                                            e.preventDefault();
                                            onAdditionalDiscountChange(Math.floor(additionalDiscount) + 1);
                                        } else if (e.key === 'ArrowDown') {
                                            e.preventDefault();
                                            onAdditionalDiscountChange(Math.max(0, Math.floor(additionalDiscount) - 1));
                                        }
                                    }}
                                    onFocus={(e) => {
                                        e.target.select();
                                    }}
                                    className="flex-1 border-orange-200 focus:border-orange-400 text-right"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        {/* Total Discount */}
                        <div className="flex items-center justify-between border-t border-gray-200 pt-2 text-sm">
                            <span className="font-bold text-gray-800">
                                {t('Total Discount')}:
                            </span>
                            <span className="font-bold text-red-600">
                                Rs {totalDiscount.toFixed(2)}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between border-t-2 border-gray-300 pt-3">
                        <span className="text-lg font-bold text-gray-800">
                            {t('Total Payable')}:
                        </span>
                        <span className="text-2xl font-bold text-green-600">
                            Rs {totalPayable.toFixed(2)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Save Button Section */}
            <div className="mt-8 flex justify-end">
                <Button
                    type="submit"
                    disabled={processing || submitted || items.length === 0}
                    size="lg"
                    className="bg-gradient-to-r from-green-600 to-emerald-600 px-8 py-4 text-lg font-bold text-white shadow-xl hover:from-green-700 hover:to-emerald-700 hover:shadow-2xl transform hover:scale-105 transition-all duration-200 rounded-xl"
                >
                    <Save className="mr-3 h-6 w-6" />
                    {submitted ? t('Saving...') : t('Save GRN Entry')}
                </Button>
            </div>
        </>
    );
}

import React from 'react';
import { AlertCircle } from 'lucide-react';

interface VatBreakdownSummaryProps {
    isVatInvoice: boolean;
    vatBreakdown: {
        vatable_subtotal: number;
        vat_to_add: number;
        vat_inclusive_subtotal: number;
        vat_extracted: number;
        vat_rate: number;
    };
    subtotal: number;
    discount: number;
    taxAmount: number;
    total: number;
}

const VatBreakdownSummary: React.FC<VatBreakdownSummaryProps> = ({
    isVatInvoice,
    vatBreakdown,
    subtotal,
    discount,
    taxAmount,
    total
}) => {
    if (!isVatInvoice) {
        return null; // Don't show VAT breakdown if not a VAT invoice
    }

    const {
        vatable_subtotal,
        vat_to_add,
        vat_inclusive_subtotal,
        vat_extracted,
        vat_rate
    } = vatBreakdown;

    return (
        <div className="mt-4 pt-4 border-t border-blue-200 space-y-2">
            <h4 className="font-semibold text-sm text-blue-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                VAT Breakdown ({vat_rate}%)
            </h4>

            {/* Items WITHOUT VAT (VAT will be added) */}
            {vatable_subtotal > 0 && (
                <div className="bg-blue-50 p-3 rounded-lg space-y-1">
                    <p className="text-xs text-slate-600">
                        <span className="font-medium">Items (Excl. VAT):</span>
                    </p>
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-600">Price without VAT:</span>
                        <span className="font-semibold text-slate-900">Rs. {vatable_subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-600">VAT ({vat_rate}%):</span>
                        <span className="font-semibold text-green-600">+ Rs. {vat_to_add.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs border-t border-blue-200 pt-1">
                        <span className="text-slate-600">Total (Incl. VAT):</span>
                        <span className="font-bold text-blue-900">Rs. {(vatable_subtotal + vat_to_add).toFixed(2)}</span>
                    </div>
                </div>
            )}

            {/* Items WITH VAT (VAT already in price) */}
            {vat_inclusive_subtotal > 0 && (
                <div className="bg-amber-50 p-3 rounded-lg space-y-1">
                    <p className="text-xs text-slate-600">
                        <span className="font-medium">Items (Incl. VAT - MRP):</span>
                    </p>
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-600">Total (MRP):</span>
                        <span className="font-semibold text-slate-900">Rs. {vat_inclusive_subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-600">Less: VAT portion:</span>
                        <span className="font-semibold text-slate-900">- Rs. {vat_extracted.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-600">Price without VAT:</span>
                        <span className="font-semibold text-slate-900">Rs. {(vat_inclusive_subtotal - vat_extracted).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs border-t border-amber-200 pt-1">
                        <span className="text-slate-600">VAT ({vat_rate}%):</span>
                        <span className="font-bold text-amber-600">Rs. {vat_extracted.toFixed(2)}</span>
                    </div>
                </div>
            )}

            {/* Total VAT Summary */}
            {(vat_to_add > 0 || vat_extracted > 0) && (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-3 rounded-lg space-y-1 border border-purple-200">
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-600 font-medium">Total VAT Amount:</span>
                        <span className="font-bold text-purple-700">Rs. {taxAmount.toFixed(2)}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VatBreakdownSummary;

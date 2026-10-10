import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { t } from '@/lib/i18n';

interface Supplier {
    id: number;
    code: string;
    name: string;
    contact?: string;
    email?: string;
    address?: string;
    acc_ky?: number;
    section_code?: string;
}

interface SupplierSelectorProps {
    suppliers: Supplier[];
    selectedSupplier: Supplier | null;
    supplierCode: string;
    supplierInvoiceNo: string;
    description: string;
    onSupplierChange: (supplierCode: string) => void;
    onInvoiceNoChange: (value: string) => void;
    onDescriptionChange: (value: string) => void;
    errors: any;
}

export default function SupplierSelector({
    suppliers,
    selectedSupplier,
    supplierCode,
    supplierInvoiceNo,
    description,
    onSupplierChange,
    onInvoiceNoChange,
    onDescriptionChange,
    errors,
}: SupplierSelectorProps) {
    const [filter, setFilter] = React.useState('');

    // filter suppliers by code or name
    const filtered = suppliers.filter(s => {
        const term = filter.toLowerCase();
        return (
            s.code.toLowerCase().includes(term) ||
            s.name.toLowerCase().includes(term)
        );
    });

    return (
        <>
            {/* Supplier Code */}
            <div className="space-y-2">
                <Label htmlFor="supplier_code" className="flex items-center gap-2 text-gray-700 font-medium">
                    {t('Supplier Code')}{' '}
                    <span className="text-red-500">*</span>
                </Label>
                <Select
                    value={supplierCode}
                    onValueChange={onSupplierChange}
                >
                    <SelectTrigger id="supplier_code" className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white">
                        <SelectValue placeholder={t('Select code')}>
                            {supplierCode && (
                                <span>{supplierCode}</span>
                            )}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        {/* search box inside dropdown */}
                        <div className="p-2">
                            <Input
                                value={filter}
                                onChange={e => setFilter(e.target.value)}
                                placeholder={t('Search suppliers...')}
                                className="w-full"
                            />
                        </div>
                        {filtered.map((supplier) => (
                            <SelectItem
                                key={supplier.code}
                                value={supplier.code}
                            >
                                {supplier.code} - {supplier.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {errors.supplier_code && (
                    <p className="text-sm text-red-600 font-medium">
                        {errors.supplier_code}
                    </p>
                )}
            </div>

            {/* Supplier Name */}
            <div className="space-y-2">
                <Label className="flex items-center gap-2 text-gray-700 font-medium">{t('Supplier Name')}</Label>
                <Input
                    value={selectedSupplier?.name || ''}
                    disabled
                    className="w-full bg-gray-50 border-gray-300 rounded-lg shadow-sm font-medium"
                    placeholder={t('Select supplier code first')}
                />
            </div>

            {/* Supplier Invoice No */}
            <div className="space-y-2">
                <Label htmlFor="supplier_invoice_no" className="flex items-center gap-2 text-gray-700 font-medium">
                    {t('Supplier Invoice No')}{' '}
                    <span className="text-red-500">*</span>
                </Label>
                <Input
                    id="supplier_invoice_no"
                    value={supplierInvoiceNo}
                    onChange={(e) => onInvoiceNoChange(e.target.value)}
                    placeholder={t('Enter invoice number')}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required
                />
                {errors.supplier_invoice_no && (
                    <p className="text-sm text-red-600 font-medium">
                        {errors.supplier_invoice_no}
                    </p>
                )}
            </div>

            {/* Description Row */}
            <div className="space-y-2">
                <Label htmlFor="description" className="flex items-center gap-2 text-gray-700 font-medium">
                    {t('Description / Notes')}
                </Label>
                <Input
                    id="description"
                    value={description}
                    onChange={(e) => onDescriptionChange(e.target.value)}
                    placeholder={t('Add description or notes for this GRN')}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
            </div>
        </>
    );
}
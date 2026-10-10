import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as Dialog from '@radix-ui/react-dialog';
import { t } from '@/lib/i18n';
import { useState, useEffect } from 'react';
import { PackagePlus, X, Loader2 } from 'lucide-react';
import axios from 'axios';

interface Category {
    id: string;
    code: string;
    name: string;
}

interface Brand {
    id: number;
    name: string;
    category_id?: number;
    category_code?: string;
    models: string[];
}

interface Unit {
    id: number;
    name: string;
}

interface ProductQuickCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onProductCreated: (product: any) => void;
    categories: Category[];
    existingBrands: Brand[];
    units?: Unit[];
    prefilledCategory?: string;
    prefilledBrand?: string;
    prefilledSupplier?: string;
    prefilledSupplierAccKy?: number | null;
    prefilledSupplierName?: string;
    stockLocationType: 'main_stock' | 'printing_section';
}

export default function ProductQuickCreateModal({
    isOpen,
    onClose,
    onProductCreated,
    categories,
    existingBrands,
    units = [],
    prefilledCategory = '',
    // prefilledBrand = '',
    // prefilledSupplier = '',
    prefilledSupplierAccKy = null,
    prefilledSupplierName = '',
    stockLocationType,
}: ProductQuickCreateModalProps) {
    const [formData, setFormData] = useState({
        item_code: '',
        item_name: '',
        category_id: prefilledCategory,
        brand_id: '',
        barcode: '',
        cost_price: '',
        retail_price: '',
        wholesale_price: '',
        unit_id: '',
        serial_number: '',
        model: '',
        warranty: '',
        vat_item: false,
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [availableUnits, setAvailableUnits] = useState<Unit[]>(units);

    // Auto-generate item code when category changes
    useEffect(() => {
        if (formData.category_id && !formData.item_code) {
            const prefix = stockLocationType === 'main_stock' ? 'MS' : 'PS';
            const timestamp = Date.now().toString().slice(-6);
            setFormData(prev => ({
                ...prev,
                item_code: `${prefix}-${formData.category_id}-${timestamp}`
            }));
        }
    }, [formData.category_id, stockLocationType]);

    // Fetch units if not provided
    useEffect(() => {
        if (availableUnits.length === 0) {
            fetchUnits();
        }
    }, []);

    const fetchUnits = async () => {
        try {
            const response = await axios.get('/pos/api/units');
            setAvailableUnits(response.data);
        } catch (error) {
            console.error('Error fetching units:', error);
        }
    };

    // Filter brands based on selected category
    const filteredBrands = formData.category_id
        ? existingBrands.filter(brand => brand.category_code === formData.category_id)
        : existingBrands;

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!formData.item_code || !formData.item_name) {
            setError(t('Please fill in Item Code and Item Name'));
            return;
        }

        if (!formData.category_id) {
            setError(t('Please select a category'));
            return;
        }

        if (!formData.cost_price || !formData.retail_price) {
            setError(t('Please fill in Cost Price and Retail Price'));
            return;
        }

        if (stockLocationType === 'printing_section' && !formData.serial_number) {
            setError(t('Serial Number is required for Printing Section items'));
            return;
        }

        setLoading(true);

        try {
            const payload = {
                ItemCode: formData.item_code,
                ItmNm: formData.item_name,
                catkey: formData.category_id,
                brand_id: formData.brand_id || null,
                BarCode: formData.barcode || `BC-${Date.now()}`,
                CosPri: parseFloat(formData.cost_price) || 0,
                SlsPri: parseFloat(formData.retail_price) || 0,
                WholePrice: parseFloat(formData.wholesale_price) || 0,
                UnitKy: formData.unit_id || null,
                serial_number: formData.serial_number || '',
                model: formData.model || '',
                warranty: formData.warranty || '',
                VATItem: formData.vat_item,
                fInAct: false, // Active by default
                stock_location_type: stockLocationType,
                SupKey: prefilledSupplierAccKy || null,
            };

            console.log('Creating product with payload:', payload);

            const response = await axios.post('/pos/products/quick-create', payload);

            if (response.data.success) {
                // Return the created product
                onProductCreated(response.data.product);
                handleClose();
            } else {
                setError(response.data.message || t('Failed to create product'));
            }
        } catch (err: any) {
            console.error('Error creating product:', err);
            
            // Handle validation errors (422)
            if (err.response?.status === 422 && err.response?.data?.errors) {
                const errors = err.response.data.errors;
                const errorMessages = Object.values(errors).flat().join(', ');
                setError(errorMessages);
            } else {
                setError(err.response?.data?.message || t('An error occurred while creating the product'));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({
            item_code: '',
            item_name: '',
            category_id: prefilledCategory,
            brand_id: '',
            barcode: '',
            cost_price: '',
            retail_price: '',
            wholesale_price: '',
            unit_id: '',
            serial_number: '',
            model: '',
            warranty: '',
            vat_item: false,
        });
        setError('');
        onClose();
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={handleClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl z-50 w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
                    <div className="sticky top-0 bg-gradient-to-r from-vismass-blue to-vismass-grey px-6 py-4 border-b flex items-center justify-between z-10">
                        <div className="flex items-center space-x-3">
                            <div className="rounded-lg bg-white/20 p-2">
                                <PackagePlus className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <Dialog.Title className="text-lg font-bold text-white">
                                    {t('Quick Create Product')}
                                </Dialog.Title>
                                <Dialog.Description className="text-xs text-white/80 mt-0.5">
                                    {t('Add a new product to inventory')}
                                </Dialog.Description>
                            </div>
                        </div>
                        <Dialog.Close asChild>
                            <button className="rounded-lg p-2 hover:bg-white/20 transition-colors">
                                <X className="h-5 w-5 text-white" />
                            </button>
                        </Dialog.Close>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                                {error}
                            </div>
                        )}

                        {/* Basic Information */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">
                                {t('Basic Information')}
                            </h3>

                            {/* Supplier badge - shown when a supplier is pre-selected */}
                            {prefilledSupplierName && (
                                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                                    <span className="text-xs font-medium text-green-700">Supplier:</span>
                                    <span className="text-sm font-semibold text-green-800">{prefilledSupplierName}</span>
                                    <span className="ml-auto text-xs text-green-600 italic">This product will be linked to this supplier</span>
                                </div>
                            )}
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="item_code" className="text-xs font-medium">
                                        {t('Item Code')} <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="item_code"
                                        value={formData.item_code}
                                        onChange={(e) => handleChange('item_code', e.target.value)}
                                        placeholder={t('Auto-generated')}
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="item_name" className="text-xs font-medium">
                                        {t('Item Name')} <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="item_name"
                                        value={formData.item_name}
                                        onChange={(e) => handleChange('item_name', e.target.value)}
                                        placeholder={t('Enter item name')}
                                        className="mt-1"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="category" className="text-xs font-medium">
                                        {t('Category')} <span className="text-red-500">*</span>
                                    </Label>
                                    <Select value={formData.category_id} onValueChange={(value) => handleChange('category_id', value)}>
                                        <SelectTrigger className="mt-1">
                                            <SelectValue placeholder={t('Select category')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map((category) => (
                                                <SelectItem key={category.id} value={category.id}>
                                                    {category.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label htmlFor="brand" className="text-xs font-medium">
                                        {t('Brand')}
                                    </Label>
                                    <Select value={formData.brand_id} onValueChange={(value) => handleChange('brand_id', value)}>
                                        <SelectTrigger className="mt-1">
                                            <SelectValue placeholder={t('Select brand')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {filteredBrands.map((brand) => (
                                                <SelectItem key={brand.id} value={brand.id.toString()}>
                                                    {brand.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="barcode" className="text-xs font-medium">
                                        {t('Barcode')}
                                    </Label>
                                    <Input
                                        id="barcode"
                                        value={formData.barcode}
                                        onChange={(e) => handleChange('barcode', e.target.value)}
                                        placeholder={t('Auto-generated if empty')}
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="unit" className="text-xs font-medium">
                                        {t('Unit')}
                                    </Label>
                                    <Select value={formData.unit_id} onValueChange={(value) => handleChange('unit_id', value)}>
                                        <SelectTrigger className="mt-1">
                                            <SelectValue placeholder={t('Select unit')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableUnits.map((unit) => (
                                                <SelectItem key={unit.id} value={unit.id.toString()}>
                                                    {unit.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* Pricing */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">
                                {t('Pricing')}
                            </h3>
                            
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <Label htmlFor="cost_price" className="text-xs font-medium">
                                        {t('Cost Price')} <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="cost_price"
                                        type="number"
                                        step="0.01"
                                        value={formData.cost_price}
                                        onChange={(e) => handleChange('cost_price', e.target.value)}
                                        placeholder="0.00"
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="retail_price" className="text-xs font-medium">
                                        {t('Retail Price')} <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="retail_price"
                                        type="number"
                                        step="0.01"
                                        value={formData.retail_price}
                                        onChange={(e) => handleChange('retail_price', e.target.value)}
                                        placeholder="0.00"
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="wholesale_price" className="text-xs font-medium">
                                        {t('Wholesale Price')}
                                    </Label>
                                    <Input
                                        id="wholesale_price"
                                        type="number"
                                        step="0.01"
                                        value={formData.wholesale_price}
                                        onChange={(e) => handleChange('wholesale_price', e.target.value)}
                                        placeholder="0.00"
                                        className="mt-1"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Additional Details - Serial Number, Model, Warranty for Printing Section */}
                        {stockLocationType === 'printing_section' && (
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">
                                    {t('Additional Details')}
                                </h3>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="serial_number" className="text-xs font-medium">
                                            {t('Serial Number')} <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="serial_number"
                                            value={formData.serial_number}
                                            onChange={(e) => handleChange('serial_number', e.target.value)}
                                            placeholder={t('Enter serial number')}
                                            className="mt-1"
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="model" className="text-xs font-medium">
                                            {t('Model')}
                                        </Label>
                                        <Input
                                            id="model"
                                            value={formData.model}
                                            onChange={(e) => handleChange('model', e.target.value)}
                                            placeholder={t('Enter model')}
                                            className="mt-1"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="warranty" className="text-xs font-medium">
                                        {t('Warranty')}
                                    </Label>
                                    <Input
                                        id="warranty"
                                        value={formData.warranty}
                                        onChange={(e) => handleChange('warranty', e.target.value)}
                                        placeholder={t('e.g., 1 Year, 6 Months')}
                                        className="mt-1"
                                    />
                                </div>
                            </div>
                        )}

                        {/* VAT Option */}
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="vat_item"
                                checked={formData.vat_item}
                                onChange={(e) => handleChange('vat_item', e.target.checked)}
                                className="rounded border-gray-300"
                            />
                            <Label htmlFor="vat_item" className="text-sm cursor-pointer">
                                {t('VAT Item')}
                            </Label>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end space-x-3 pt-4 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleClose}
                                disabled={loading}
                            >
                                {t('Cancel')}
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="bg-vismass-blue hover:bg-vismass-blue/90"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {t('Creating...')}
                                    </>
                                ) : (
                                    <>
                                        <PackagePlus className="mr-2 h-4 w-4" />
                                        {t('Create Product')}
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

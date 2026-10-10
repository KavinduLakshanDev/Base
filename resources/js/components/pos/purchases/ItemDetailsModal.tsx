import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as Dialog from '@radix-ui/react-dialog';
import { t } from '@/lib/i18n';
import { useState, useRef, useEffect } from 'react';
import { Search, CheckCircle, XCircle, PackagePlus } from 'lucide-react';

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
    remark?: string;
    cus_discount_rate?: number;
    multipleSerialNumbers?: string;
}

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

interface Category {
    id: string;
    name: string;
}

interface Brand {
    id: number;
    name: string;
    category_id?: number;
    category_code?: string;
    models: string[];
}

interface ItemDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    stockLocationType: 'main_stock' | 'printing_section';
    modalItem: PurchaseItem | null;
    editingItemIndex: number | null;
    items: PurchaseItem[];
    categories: Category[];
    existingBrands: Brand[];
    mainStockCategory: string;
    mainStockBrand: string;
    mainStockItemName: string;
    onMainStockCategoryChange: (value: string) => void;
    onMainStockBrandChange: (value: string) => void;
    onMainStockItemNameChange: (value: string) => void;
    onModalItemChange: (item: PurchaseItem) => void;
    onConfirm: () => void;
    onCancel: () => void;
    itemSearchQuery: string;
    onItemSearchChange: (query: string) => void;
    selectedCategory: string;
    onCategoryChange: (category: string) => void;
    filteredProducts: Product[];
    onSelectProduct: (product: Product) => void;
    currentProducts: Product[];
    onCreateProductClick?: () => void;
    // new props for keep-open behavior
    keepModalOpen: boolean;
    onKeepModalChange: (value: boolean) => void;
}

export default function ItemDetailsModal({
    isOpen,
    onClose,
    stockLocationType,
    modalItem,
    editingItemIndex,
    items,
    categories,
    existingBrands,
    mainStockCategory,
    mainStockBrand,
    mainStockItemName,
    onMainStockCategoryChange,
    onMainStockBrandChange,
    onMainStockItemNameChange,
    onModalItemChange,
    onConfirm,
    onCancel,
    itemSearchQuery,
    onItemSearchChange,
    selectedCategory,
    onCategoryChange,
    filteredProducts,
    onSelectProduct,
    currentProducts,
    onCreateProductClick,
    keepModalOpen,
    onKeepModalChange,
}: ItemDetailsModalProps) {
    const [barcodeSearching, setBarcodeSearching] = useState(false);
    const barcodeTimeoutRef = useRef<number | null>(null);
    const [barcodeMessage, setBarcodeMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
    const [activeField, setActiveField] = useState<string | null>(null);
    const [activeValue, setActiveValue] = useState<string>('');
    const serialRef = useRef<HTMLInputElement>(null);
    const [multipleSerialNumbers, setMultipleSerialNumbers] = useState<string>('');

    // Reset model when brand changes
    useEffect(() => {
        if (modalItem && mainStockBrand) {
            const modelsForBrand = getModelsForSelectedBrand();
            if (modalItem.model && !modelsForBrand.includes(modalItem.model)) {
                onModalItemChange({ ...modalItem, model: '' });
            }
        }
    }, [mainStockBrand]);

    if (!modalItem) return null;

    // Get models for the selected brand
    const getModelsForSelectedBrand = () => {
        if (!mainStockBrand) return [];
        const selectedBrand = existingBrands.find(brand => brand.name === mainStockBrand);
        return selectedBrand?.models || [];
    };

    const availableModels = getModelsForSelectedBrand();

    // Function to search product by barcode
    const searchByBarcode = async (barcode: string) => {
        if (!barcode || barcode.trim() === '') {
            setBarcodeMessage(null);
            return;
        }

        setBarcodeSearching(true);
        setBarcodeMessage({ type: 'info', text: 'Searching for product...' });

        try {
            // Get company_id from the page context (you'll need to pass this as prop)
            const urlParams = new URLSearchParams(window.location.search);
            const companyElement = document.querySelector('[data-company-id]');
            const companyId = companyElement?.getAttribute('data-company-id') || '1';

            const response = await fetch(`/pos/api/purchases/search-barcode?barcode=${encodeURIComponent(barcode)}&company_id=${companyId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });

            if (response.ok) {
                const data = await response.json();

                if (data.found) {
                    // Product exists - populate form with existing data
                    const product = data.product;

                    console.log('🔍 Barcode Search Results:', {
                        category_id: product.category_id,
                        brand: product.brand,
                        model: product.model,
                        name: product.name
                    });

                    // Prepare values
                    const categoryIdStr = product.category_id ? String(product.category_id) : '';
                    const brandStr = product.brand || '';
                    const modelStr = product.model || '';
                    const nameStr = product.name || '';

                    console.log('📝 Prepared values:', {
                        categoryIdStr,
                        brandStr,
                        modelStr,
                        nameStr,
                        currentMainStockCategory: mainStockCategory,
                        currentMainStockBrand: mainStockBrand
                    });

                    // Verify category exists in the list
                    const categoryExists = categoryIdStr && categories.some(cat => String(cat.id) === categoryIdStr);
                    console.log('✅ Category exists:', categoryExists, 'Available categories:', categories.map(c => c.id));

                    // Update modal item first with all data
                    onModalItemChange({
                        ...modalItem,
                        product_id: product.id,
                        product_code: product.code,
                        product_name: product.name,
                        barcode: product.barcode,
                        cost_price: product.cost_price,
                        normal_cost: product.normal_cost,
                        retail_price: product.retail_price,
                        wholesale_price: product.wholesale_price,
                        VehicleSalePrice: product.VehicleSalePrice,
                        brand: brandStr,
                        model: modelStr,
                        warranty: product.warranty || '',
                        category: categoryIdStr,
                    });

                    // Then update form fields with a small delay to ensure state is ready
                    setTimeout(() => {
                        if (categoryExists) {
                            console.log('🎯 Setting category:', categoryIdStr);
                            onMainStockCategoryChange(categoryIdStr);
                        }
                        if (brandStr) {
                            console.log('🎯 Setting brand:', brandStr);
                            onMainStockBrandChange(brandStr);
                        }
                        if (nameStr) {
                            console.log('🎯 Setting item name:', nameStr);
                            onMainStockItemNameChange(nameStr);
                        }
                    }, 100);

                    setBarcodeMessage({ type: 'success', text: data.message });
                } else {
                    // Product not found - allow creating new
                    setBarcodeMessage({ type: 'info', text: data.message });
                }
            } else {
                setBarcodeMessage({ type: 'error', text: 'Failed to search barcode. Please try again.' });
            }
        } catch (error) {
            console.error('Barcode search error:', error);
            setBarcodeMessage({ type: 'error', text: 'Error searching barcode. Please check your connection.' });
        } finally {
            setBarcodeSearching(false);
        }
    };

    // Handle barcode change with debounced search
    const handleBarcodeChange = (barcode: string) => {
        onModalItemChange({ ...modalItem, barcode });
        setBarcodeMessage(null);

        // Clear existing timeout
        if (barcodeTimeoutRef.current) {
            clearTimeout(barcodeTimeoutRef.current);
        }

        // Set new timeout for auto-search
        if (barcode && barcode.trim() !== '') {
            barcodeTimeoutRef.current = setTimeout(() => {
                searchByBarcode(barcode);
            }, 800) as unknown as number; // 800ms delay to allow for typing/scanning
        }
    };

    // Handle barcode blur - trigger search
    const handleBarcodeBlur = () => {
        if (modalItem.barcode) {
            searchByBarcode(modalItem.barcode);
        }
    };

    // Focus serial field when modal remains open
    useEffect(() => {
        if (keepModalOpen && stockLocationType === 'printing_section' && modalItem) {
            serialRef.current?.focus();
        }
    }, [modalItem, keepModalOpen, stockLocationType]);

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
                <Dialog.Content className="fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-full max-w-4xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-white shadow-xl">
                    <div className="p-6">
                        <Dialog.Title className="mb-4 text-xl font-bold text-gray-900">
                            {stockLocationType === 'main_stock' ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-amber-500 rounded-full"></div>
                                    <span>
                                        Main Stock Item
                                        {items.length > 0 && mainStockCategory && mainStockBrand && mainStockItemName
                                            ? ` - Adding #${items.length + 1}`
                                            : modalItem?.product_name ? ` - ${modalItem.product_name}` : ''
                                        }
                                    </span>
                                    {items.length > 0 && mainStockCategory && mainStockBrand && mainStockItemName && (
                                        <span className="ml-2 px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
                                            Repeat Entry
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                                    <span>
                                        Printing Item
                                        {items.length > 0 && mainStockCategory && mainStockBrand && mainStockItemName
                                            ? ` - Adding #${items.length + 1}`
                                            : modalItem?.product_name ? ` - ${modalItem.product_name}` : ''
                                        }
                                    </span>
                                    {items.length > 0 && mainStockCategory && mainStockBrand && mainStockItemName && (
                                        <span className="ml-2 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                            Repeat Entry
                                        </span>
                                    )}
                                </div>
                            )}
                        </Dialog.Title>

                        <Dialog.Description className="mb-6 text-sm text-gray-600">
                            {stockLocationType === 'main_stock'
                                ? items.length > 0 && mainStockCategory && mainStockBrand && mainStockItemName
                                    ? t('Adding another item with same details. Only change the serial number if needed.')
                                    : t('Select a product and enter quantity and pricing details.')
                                : items.length > 0 && mainStockCategory && mainStockBrand && mainStockItemName
                                    ? t('Adding another item with same details. Only change the serial number if needed.')
                                    : t('Enter item details for Printing Section inventory.')}
                        </Dialog.Description>

                        <div className="space-y-6">
                            {/* Product Search & Select Section */}
                            {modalItem.product_id === 0 && (
                                <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
                                            <Label className="text-base font-semibold mb-3 block">Search & Select Product</Label>
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="flex-1">
                                                    <Input
                                                        type="text"
                                                        placeholder={t('Search by product code, name, or barcode...')}
                                                        value={itemSearchQuery}
                                                        onChange={(e) => onItemSearchChange(e.target.value)}
                                                        className="w-full text-base p-3"
                                                        autoFocus
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                                                        {t('Category')}:
                                                    </Label>
                                                    <Select
                                                        value={selectedCategory}
                                                        onValueChange={onCategoryChange}
                                                    >
                                                        <SelectTrigger className="w-40">
                                                            <SelectValue placeholder={t('All')} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {stockLocationType === 'printing_section' ? (
                                                                // For Printer GRN, only show Printers category (CAT001)
                                                                <>
                                                                    {categories.filter(cat => cat.id === 'CAT001').map((category) => (
                                                                        <SelectItem key={category.id} value={category.id}>
                                                                            {category.name}
                                                                        </SelectItem>
                                                                    ))}
                                                                </>
                                                            ) : (
                                                                // For Main Stock, show all categories
                                                                <>
                                                                    <SelectItem value="ALL_CATEGORIES">All Categories</SelectItem>
                                                                    {categories.map((category) => (
                                                                        <SelectItem key={category.id} value={category.id}>
                                                                            {category.name}
                                                                        </SelectItem>
                                                                    ))}
                                                                </>
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            {/* Product List */}
                                            <div className="max-h-60 overflow-y-auto">
                                                {filteredProducts.filter((product) => 
                                                    stockLocationType === 'printing_section' 
                                                        ? product.category_id === 'CAT001'
                                                        : true
                                                ).length === 0 ? (
                                                    <div className="text-center py-4">
                                                        <div className="text-gray-500 text-sm mb-3">
                                                            {itemSearchQuery.trim() === '' 
                                                                ? (stockLocationType === 'printing_section' ? 'Start typing to search for printers...' : 'Start typing to search for products...')
                                                                : (stockLocationType === 'printing_section' ? 'No printers found' : 'No products found')}
                                                        </div>
                                                        {itemSearchQuery.trim() !== '' && onCreateProductClick && stockLocationType !== 'printing_section' && (
                                                            <Button
                                                                type="button"
                                                                onClick={onCreateProductClick}
                                                                className="bg-green-600 hover:bg-green-700"
                                                            >
                                                                <PackagePlus className="mr-2 h-4 w-4" />
                                                                Create New Product
                                                            </Button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {filteredProducts
                                                            .filter((product) => 
                                                                stockLocationType === 'printing_section' 
                                                                    ? product.category_id === 'CAT001'
                                                                    : true
                                                            )
                                                            .map((product) => (
                                                            <div
                                                                key={product.id}
                                                                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                                                                onClick={() => onSelectProduct(product)}
                                                            >
                                                                <div className="flex-1">
                                                                    <div className="font-medium text-gray-900 text-sm">
                                                                        {product.name}
                                                                    </div>
                                                                    <div className="text-xs text-gray-600">
                                                                        Code: {product.code} {product.barcode && `| Barcode: ${product.barcode}`}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500">
                                                                        Stock: {product.current_stock} | Cost: Rs. {Math.round(product.cost_price)}
                                                                    </div>
                                                                </div>
                                                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                                                                    Select
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                            {/* Item Info - Only show if product selected */}
                            {modalItem.product_id > 0 && (
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">
                                            Item Code
                                        </Label>
                                        <p className="text-lg font-semibold text-gray-900">
                                            {modalItem.product_code}
                                        </p>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">
                                            Item Name
                                        </Label>
                                        <p className="text-lg font-semibold text-gray-900">
                                            {modalItem.product_name}
                                        </p>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">
                                            Current Stock
                                        </Label>
                                        <p className="text-lg font-semibold text-blue-600">
                                            {(() => {
                                                const product = currentProducts.find(
                                                    (p) => p.id === modalItem.product_id,
                                                );
                                                return product ? Math.round(product.current_stock) : '0';
                                            })()}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Editable Fields - Only show if product selected */}
                            {modalItem.product_id > 0 && (
                                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                                    {stockLocationType !== 'printing_section' && (
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">
                                            Quantity
                                        </Label>
                                        <Input
                                            type="number"
                                            step="any"
                                            value={activeField === 'qty' ? activeValue : modalItem.qty}
                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                            onFocus={(e) => {
                                                setActiveField('qty');
                                                setActiveValue(modalItem.qty.toString());
                                                e.target.select();
                                            }}
                                            onBlur={() => setActiveField(null)}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setActiveValue(val);
                                                const newQty = parseFloat(val) || 0;
                                                const totalQty = newQty + modalItem.free_qty;

                                                // Calculate calculations with newQty
                                                const itemDiscount = (modalItem.cost_price * newQty * modalItem.discount_rate) / 100;
                                                const discountedCost = modalItem.cost_price - (modalItem.cost_price * modalItem.discount_rate / 100);
                                                const newCostPrice = totalQty > 0 ? (discountedCost * newQty) / totalQty : discountedCost;

                                                onModalItemChange({
                                                    ...modalItem,
                                                    qty: newQty,
                                                    item_discount: itemDiscount,
                                                    amount: modalItem.cost_price * newQty - itemDiscount,
                                                    new_cost_price: newCostPrice,
                                                });
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'F3') {
                                                    e.preventDefault();
                                                    onConfirm();
                                                }
                                            }}
                                            className="mt-1"
                                        />
                                    </div>
                                    )}

                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">
                                            Cost Price
                                        </Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={activeField === 'cost_price' ? activeValue : (modalItem.cost_price || 0).toFixed(2)}
                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                            onFocus={(e) => {
                                                setActiveField('cost_price');
                                                setActiveValue(modalItem.cost_price.toString());
                                                e.target.select();
                                            }}
                                            onBlur={() => setActiveField(null)}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setActiveValue(val);
                                                const newCostPrice = parseFloat(val) || 0;
                                                const totalQty = modalItem.qty + modalItem.free_qty;

                                                const itemDiscount = (newCostPrice * modalItem.qty * modalItem.discount_rate) / 100;
                                                const discountedCost = newCostPrice - (newCostPrice * modalItem.discount_rate / 100);
                                                const calculatedNewCostPrice = totalQty > 0 ? (discountedCost * modalItem.qty) / totalQty : discountedCost;

                                                onModalItemChange({
                                                    ...modalItem,
                                                    cost_price: newCostPrice,
                                                    item_discount: itemDiscount,
                                                    amount: newCostPrice * modalItem.qty - itemDiscount,
                                                    new_cost_price: calculatedNewCostPrice,
                                                });
                                            }}
                                            className="mt-1 text-right"
                                        />
                                    </div>

                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">
                                            New Cost Price
                                        </Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={activeField === 'new_cost_price' ? activeValue : (modalItem.new_cost_price || 0).toFixed(2)}
                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                            onFocus={(e) => {
                                                setActiveField('new_cost_price');
                                                setActiveValue(modalItem.new_cost_price.toString());
                                                e.target.select();
                                            }}
                                            onBlur={() => setActiveField(null)}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setActiveValue(val);
                                                onModalItemChange({
                                                    ...modalItem,
                                                    new_cost_price: parseFloat(val) || 0,
                                                });
                                            }}
                                            className="mt-1 text-right"
                                        />
                                    </div>

                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">
                                            Discount Amount (Rs)
                                        </Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={activeField === 'discount_rate' ? activeValue : (modalItem.discount_rate !== 0 ? modalItem.discount_rate : '')}
                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                            onFocus={(e) => {
                                                setActiveField('discount_rate');
                                                setActiveValue(modalItem.discount_rate.toString());
                                                e.target.select();
                                            }}
                                            onBlur={() => setActiveField(null)}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setActiveValue(val);
                                                const discountAmount = parseFloat(val) || 0;

                                                const itemDiscount = discountAmount;
                                                const totalQty = modalItem.qty + modalItem.free_qty;
                                                const newCostPrice = totalQty > 0 ? ((modalItem.cost_price * modalItem.qty - itemDiscount) / totalQty) : modalItem.cost_price;

                                                onModalItemChange({
                                                    ...modalItem,
                                                    discount_rate: discountAmount,
                                                    item_discount: itemDiscount,
                                                    amount: Math.max(0, modalItem.cost_price * modalItem.qty - itemDiscount),
                                                    new_cost_price: newCostPrice,
                                                });
                                            }}
                                            className="mt-1"
                                        />
                                    </div>

                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">
                                            Cus Discount Amount (Rs)
                                        </Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={activeField === 'cus_discount_rate' ? activeValue : (modalItem.cus_discount_rate ?? '')}
                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                            onFocus={(e) => {
                                                setActiveField('cus_discount_rate');
                                                setActiveValue(modalItem.cus_discount_rate?.toString() || '');
                                                e.target.select();
                                            }}
                                            onBlur={() => setActiveField(null)}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setActiveValue(val);
                                                const cusDiscountAmount = parseFloat(val) || 0;

                                                onModalItemChange({
                                                    ...modalItem,
                                                    cus_discount_rate: cusDiscountAmount
                                                });
                                            }}
                                            className="mt-1"
                                            placeholder="0.00"
                                        />
                                    </div>

                                    {stockLocationType !== 'printing_section' && (
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">
                                            Free Quantity
                                        </Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={activeField === 'free_qty' ? activeValue : modalItem.free_qty}
                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                            onFocus={(e) => {
                                                setActiveField('free_qty');
                                                setActiveValue(modalItem.free_qty.toString());
                                                e.target.select();
                                            }}
                                            onBlur={() => setActiveField(null)}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setActiveValue(val);
                                                const newFreeQty = parseFloat(val) || 0;
                                                const totalQty = modalItem.qty + newFreeQty;

                                                const discountedCost = modalItem.cost_price - (modalItem.cost_price * modalItem.discount_rate / 100);
                                                const newCostPrice = totalQty > 0 ? (discountedCost * modalItem.qty) / totalQty : discountedCost;

                                                onModalItemChange({
                                                    ...modalItem,
                                                    free_qty: newFreeQty,
                                                    new_cost_price: newCostPrice,
                                                });
                                            }}
                                            className="mt-1"
                                        />
                                    </div>
                                    )}

                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">
                                            Retail Price
                                        </Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={activeField === 'retail_price' ? activeValue : (modalItem.retail_price || 0).toFixed(2)}
                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                            onFocus={(e) => {
                                                setActiveField('retail_price');
                                                setActiveValue(modalItem.retail_price.toString());
                                                e.target.select();
                                            }}
                                            onBlur={() => setActiveField(null)}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setActiveValue(val);
                                                onModalItemChange({
                                                    ...modalItem,
                                                    retail_price: parseFloat(val) || 0,
                                                });
                                            }}
                                            className="mt-1 text-right"
                                        />
                                    </div>

                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">
                                            Wholesale Price
                                        </Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={activeField === 'wholesale_price' ? activeValue : (modalItem.wholesale_price || 0).toFixed(2)}
                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                            onFocus={(e) => {
                                                setActiveField('wholesale_price');
                                                setActiveValue(modalItem.wholesale_price.toString());
                                                e.target.select();
                                            }}
                                            onBlur={() => setActiveField(null)}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setActiveValue(val);
                                                onModalItemChange({
                                                    ...modalItem,
                                                    wholesale_price: parseFloat(val) || 0,
                                                });
                                            }}
                                            className="mt-1 text-right"
                                        />
                                    </div>

                                    {stockLocationType !== 'printing_section' && (
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">
                                            Vehicle Sale Price
                                        </Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={activeField === 'VehicleSalePrice' ? activeValue : (modalItem.VehicleSalePrice || 0).toFixed(2)}
                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                            onFocus={(e) => {
                                                setActiveField('VehicleSalePrice');
                                                setActiveValue(modalItem.VehicleSalePrice.toString());
                                                e.target.select();
                                            }}
                                            onBlur={() => setActiveField(null)}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setActiveValue(val);
                                                onModalItemChange({
                                                    ...modalItem,
                                                    VehicleSalePrice: parseFloat(val) || 0,
                                                });
                                            }}
                                            className="mt-1 text-right"
                                        />
                                    </div>
                                    )}

                                    {/* <div>
                                        <Label className="text-sm font-medium text-gray-700">
                                            CC Price
                                        </Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={activeField === 'cc_price' ? activeValue : (modalItem.cc_price || 0).toFixed(2)}
                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                            onFocus={(e) => {
                                                setActiveField('cc_price');
                                                setActiveValue(modalItem.cc_price.toString());
                                                e.target.select();
                                            }}
                                            onBlur={() => setActiveField(null)}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setActiveValue(val);
                                                onModalItemChange({
                                                    ...modalItem,
                                                    cc_price: parseFloat(val) || 0,
                                                });
                                            }}
                                            className="mt-1 text-right"
                                        />
                                    </div> */}
                                </div>
                            )}

                            {/* Brand, Model, Serial Number for Printing Section - Only show if product selected AND AD-HOC (product_id = 0) */}
                            {/* {stockLocationType === 'printing_section' && modalItem.product_id === 0 && (
                                <div className="mt-6 p-5 bg-gradient-to-r from-yellow-50 via-amber-50 to-orange-50 border-2 border-amber-400 rounded-xl shadow-md">
                                    <h4 className="text-base font-bold text-amber-900 mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                        </svg>
                                        Ad-Hoc Item Details
                                    </h4>
                                </div>
                            )} */}

                            {/* REGISTERED PRODUCT - Multiple Serial Numbers Input */}
                            {stockLocationType === 'printing_section' && modalItem.product_id > 0 && (
                                <div className="mt-6 p-5 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 border-2 border-green-400 rounded-xl shadow-md">
                                    <h4 className="text-base font-bold text-emerald-900 mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5 animate-bounce" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                                            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 1 1 0 000 2H3a1 1 0 00-1 1v10a1 1 0 001 1h14a1 1 0 001-1V6a1 1 0 00-1-1h-3a1 1 0 000-2h2a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V5z" clipRule="evenodd" />
                                        </svg>
                                        📋 Add Multiple Serial Numbers
                                        <span className="ml-auto text-xs bg-green-200 text-green-800 px-3 py-1 rounded-full font-semibold">
                                            Registered Product
                                        </span>
                                    </h4>

                                    {/* Product Summary */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 mb-4 border-b-2 border-green-200">
                                        <div>
                                            <Label className="text-xs font-medium text-gray-600 uppercase">Product Code</Label>
                                            <p className="text-lg font-bold text-emerald-700">{modalItem.product_code}</p>
                                        </div>
                                        <div>
                                            <Label className="text-xs font-medium text-gray-600 uppercase">Product Name</Label>
                                            <p className="text-lg font-bold text-emerald-700">{modalItem.product_name}</p>
                                        </div>
                                        <div>
                                            <Label className="text-xs font-medium text-gray-600 uppercase">Unit Cost Price</Label>
                                            <p className="text-lg font-bold text-emerald-700">Rs. {modalItem.cost_price.toFixed(2)}</p>
                                        </div>
                                    </div>

                                    {/* Multiple Serial Numbers Input */}
                                    <div className="space-y-3">
                                        <Label className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M5 3a2 2 0 012-2h6a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V3z" />
                                            </svg>
                                            Enter Serial Numbers (One Per Line or Comma-Separated)
                                        </Label>
                                        <textarea
                                            placeholder="Examples:&#10;ABC123&#10;ABC124&#10;ABC125&#10;&#10;Or: ABC123, ABC124, ABC125"
                                            className="w-full h-30 p-3 border-2 border-green-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 resize-none font-mono text-sm bg-white"
                                            value={multipleSerialNumbers}
                                            onChange={(e) => setMultipleSerialNumbers(e.target.value)}
                                        />
                                    </div>

                                    {/* Show parsed serial numbers with duplicate validation */}
                                    {multipleSerialNumbers.trim() !== '' && (() => {
                                        const allSerials = multipleSerialNumbers
                                            .split(/[\n,]+/)
                                            .map(s => s.trim())
                                            .filter(s => s !== '');
                                        
                                        const uniqueSerials = Array.from(new Set(allSerials));
                                        const duplicates = allSerials.filter((item, index) => allSerials.indexOf(item) !== index);
                                        const duplicateSet = new Set(duplicates);
                                        const hasDuplicates = duplicateSet.size > 0;
                                        
                                        return (
                                            <div className={`mt-4 bg-white border-2 rounded-lg p-4 ${hasDuplicates ? 'border-red-400 bg-red-50' : 'border-green-200'}`}>
                                                <p className={`font-bold text-sm mb-3 flex items-center gap-2 ${hasDuplicates ? 'text-red-800' : 'text-emerald-800'}`}>
                                                    <CheckCircle className={`w-4 h-4 ${hasDuplicates ? 'text-red-600' : 'text-emerald-600'}`} />
                                                    Serial Numbers to Add:
                                                </p>
                                                
                                                {/* Unique Serial Numbers */}
                                                <div className="mb-4">
                                                    <p className="text-xs font-medium text-gray-600 mb-2">✅ Valid (Unique):</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {uniqueSerials.map((serial, idx) => (
                                                            <span key={idx} className="px-3 py-2 bg-emerald-100 text-emerald-800 rounded-full text-sm font-semibold border border-emerald-300">
                                                                {serial}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                
                                                {/* Duplicate Warning */}
                                                {hasDuplicates && (
                                                    <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                                                        <p className="text-xs font-bold text-red-800 mb-2">⚠️ Duplicate Serial Numbers Detected:</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {Array.from(duplicateSet).map((serial, idx) => (
                                                                <span key={idx} className="px-3 py-2 bg-red-200 text-red-800 rounded-full text-sm font-semibold border border-red-400">
                                                                    {serial}
                                                                </span>
                                                            ))}
                                                        </div>
                                                        <p className="text-xs text-red-700 mt-2">Serial numbers must be unique. Please remove duplicates before saving.</p>
                                                    </div>
                                                )}
                                                
                                                {/* Status Summary */}
                                                <div className={`text-sm font-semibold ${hasDuplicates ? 'text-red-700' : 'text-emerald-700'}`}>
                                                    {hasDuplicates ? (
                                                        <>
                                                            ❌ {uniqueSerials.length} unique serial number(s) • {duplicateSet.size} duplicate(s) found
                                                        </>
                                                    ) : (
                                                        <>
                                                            ✅ {uniqueSerials.length} serial number(s) ready to add
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    <p className="text-xs text-gray-600 mt-3 italic">
                                        💡 Each serial number will create a separate GRN line item with the same product details
                                    </p>
                                </div>
                            )}

                            {/* Auto-populated Product Details - Show brand, model, warranty from barcode search */}
                            {(modalItem.brand || modalItem.model || modalItem.warranty) && (
                                <div className="mt-6 p-5 bg-gradient-to-r from-green-50 via-blue-50 to-emerald-50 border-2 border-green-300 rounded-xl shadow-md">
                                    <h4 className="text-base font-bold text-green-900 mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        Auto-populated from Barcode
                                    </h4>
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                                        {modalItem.brand && (
                                            <div>
                                                <Label className="text-sm font-medium text-gray-700">
                                                    Brand
                                                </Label>
                                                <div className="mt-1 px-3 py-2 bg-white text-gray-800 rounded border border-green-200">
                                                    <span className="font-semibold text-green-700">{modalItem.brand}</span>
                                                </div>
                                            </div>
                                        )}
                                        {modalItem.model && (
                                            <div>
                                                <Label className="text-sm font-medium text-gray-700">
                                                    Model
                                                </Label>
                                                <div className="mt-1 px-3 py-2 bg-white text-gray-800 rounded border border-green-200">
                                                    <span className="font-semibold text-green-700">{modalItem.model}</span>
                                                </div>
                                            </div>
                                        )}
                                        {modalItem.warranty && (
                                            <div>
                                                <Label className="text-sm font-medium text-gray-700">
                                                    Warranty
                                                </Label>
                                                <div className="mt-1 px-3 py-2 bg-white text-gray-800 rounded border border-green-200">
                                                    <span className="font-semibold text-green-700">{modalItem.warranty}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Calculations - Show for Printing Section */}
                            {stockLocationType === 'printing_section' && (
                                <div className="grid grid-cols-2 gap-4 rounded-lg bg-blue-50 p-4">
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">
                                            Item Discount
                                        </Label>
                                        <p className="text-lg font-semibold text-red-600">
                                            Rs {modalItem.item_discount.toFixed(2)}
                                        </p>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium text-gray-700">
                                            Total Amount
                                        </Label>
                                        <p className="text-lg font-semibold text-green-600">
                                            Rs {modalItem.amount.toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* keep-open checkbox */}
                            {/* <div className="flex items-center gap-2 mb-4">
                                <Checkbox
                                    checked={keepModalOpen}
                                    onCheckedChange={(val) => onKeepModalChange(!!val)}
                                />
                                <span className="text-sm">{t('Keep form open after add')}</span>
                            </div> */}

                            {/* Action Buttons */}
                            <div className="flex justify-end gap-3 border-t pt-4">
                                <Button variant="outline" onClick={onCancel}>
                                    Cancel
                                </Button>
                                <Button 
                                    onClick={() => {
                                        // For registered products in printing section, validate serial numbers
                                        if (stockLocationType === 'printing_section' && modalItem?.product_id > 0) {
                                            const trimmedSerials = multipleSerialNumbers.trim();
                                            if (trimmedSerials === '') {
                                                alert('Please enter at least one serial number');
                                                return;
                                            }
                                            onModalItemChange({ ...modalItem, multipleSerialNumbers: trimmedSerials });
                                        }
                                        onConfirm();
                                    }}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    {editingItemIndex !== null ? 'Update Item' : 'Add Item'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}